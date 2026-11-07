// Local-only member checkpoint. Not a Netlify entry point or a production migration.
const crypto=require('node:crypto');
const {ATTESTATION_SQL,validateProof}=require('../netlify/functions/_shared/function-security');
const {hashPassword,verifyPassword,acceptablePassword}=require('../netlify/functions/_shared/password');
const {FORBIDDEN_KEYS}=require('../netlify/functions/_shared/test-resource');
const COOKIE='__Host-jinxi_member_local';
const hash=value=>crypto.createHash('sha256').update(value).digest();
const header=(e,name)=>Object.entries(e.headers||{}).find(([key])=>key.toLowerCase()===name)?.[1]||'';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
class MemberError extends Error{constructor(status,code){super('Local member request rejected');this.status=status;this.code=code;}}
const reject=(status,code)=>{throw new MemberError(status,code);};
const ATTESTATION=ATTESTATION_SQL.replace("'sessions','rate_limits','point_account','point_catalog','point_rule','point_ledger'","'member_account_security_v2','member_sessions_v2','member_session_limits_v2'");
const PERMISSIONS=`SELECT host(inet_server_addr()) AS host,inet_server_port() AS port,
 EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  WHERE n.nspname='b2_lab' AND c.relkind='r'
  AND has_column_privilege(current_user,c.oid,a.attnum,'UPDATE') AND NOT (
   c.relname='guild_member_accounts' AND a.attname IN('password_hash','hash_algorithm','force_reset_password','password_updated_at','last_login_at','updated_at')
   OR c.relname='member_sessions_v2' AND a.attname IN('last_seen_at','idle_expires_at','revoked_at')
   OR c.relname='member_session_limits_v2' AND a.attname IN('hits','resets_at'))) AS excess_column_update,
 EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='b2_lab' AND c.relkind='r' AND (
  has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
  OR c.relname NOT IN('member_sessions_v2','member_session_limits_v2') AND has_any_column_privilege(current_user,c.oid,'INSERT'))) AS excess_table_write`;
function localSettings(value,env={}){
  const keys=['kind','host','port','database','user','password','origin','environmentId','fingerprint','csrfKey','rateKey'];
  if(!value||Object.keys(value).some(key=>!keys.includes(key))||value.kind!=='jinxi-member-local-v1'||value.host!=='127.0.0.1'||value.port!==55436||value.database!=='jinxi_member_local'||value.user!=='jinxi_member_session'||value.origin!=='https://127.0.0.1:3069'||typeof value.password!=='string'||!value.password||!/^[a-f0-9-]{36}$/.test(value.environmentId||'')||!/^[a-f0-9]{64}$/.test(value.fingerprint||'')||![value.csrfKey,value.rateKey].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))reject(503,'LOCAL_RESOURCE_REJECTED');
  // Names only. Do not read inherited credentials to decide whether to reject them.
  if(Object.keys(env).some(key=>FORBIDDEN_KEYS.includes(key)||['SITE_ID','CONTEXT','NETLIFY'].includes(key)||/^JINXI_/.test(key)))reject(503,'HOSTED_OR_INHERITED_CONFIGURATION_REJECTED');
  return value;
}
function tokenFrom(event){
  const values=String(header(event,'cookie')).split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));
  return values.length===1&&/^[A-Za-z0-9_-]{43}$/.test(values[0].slice(COOKIE.length+1))?values[0].slice(COOKIE.length+1):null;
}
function cookie(token,clear=false){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:604800}`;}
function output(status,body,setCookie){return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(setCookie?{'Set-Cookie':setCookie}:{})},body:JSON.stringify(body)};}
function createMemberHandler({settings,connect,env=process.env,clientAddress=()=> 'loopback'}){
  return async event=>{
    let c,inTransaction=false,op;
    try{
      const local=localSettings(settings,env),method=event.httpMethod;
      if(!['GET','POST'].includes(method))reject(405,'METHOD_NOT_ALLOWED');
      if(header(event,'sec-fetch-site')==='cross-site'||header(event,'origin')&&header(event,'origin')!==local.origin)reject(403,'ORIGIN_REJECTED');
      const query=event.queryStringParameters||{};
      if(['memberId','userId','accountId','employeeNo','account'].some(key=>Object.hasOwn(query,key)))reject(403,'CLIENT_SUBJECT_REJECTED');
      if(Object.keys(query).some(key=>key!=='op')||method==='POST'&&Object.keys(query).length)reject(400,'INVALID_QUERY');
      let body={};
      if(method==='POST'){
        if(header(event,'origin')!==local.origin)reject(403,'ORIGIN_REQUIRED');
        if(!/^application\/json(?:;|$)/i.test(header(event,'content-type')))reject(415,'JSON_REQUIRED');
        if(event.isBase64Encoded||typeof event.body!=='string'||Buffer.byteLength(event.body)>4096)reject(413,'BODY_REJECTED');
        try{body=JSON.parse(event.body);}catch{reject(400,'INVALID_JSON');}
        if(!body||typeof body!=='object'||Array.isArray(body))reject(400,'INVALID_BODY');
      }
      op=method==='POST'?body.op:query.op||'me';
      const fields={login:['op','account','password'],'change-password':['op','currentPassword','newPassword'],logout:['op']};
      if(method==='GET'&&!['me','profile'].includes(op)||method==='POST'&&!Object.hasOwn(fields,op))reject(400,'OPERATION_NOT_ENABLED');
      if(['memberId','userId','accountId','employeeNo','pointDelta','pointCost','price','reward','isAdmin'].some(key=>Object.hasOwn(body,key)))reject(403,'CLIENT_SUBJECT_REJECTED');
      if(method==='POST'&&Object.keys(body).some(key=>!fields[op].includes(key)))reject(400,'UNKNOWN_FIELD');
      if(op==='login'&&(typeof body.account!=='string'||!body.account.length||body.account.length>64||/[\u0000-\u001f\u007f]/.test(body.account)||typeof body.password!=='string'||!body.password.length||body.password.length>128))reject(400,'INVALID_INPUT');
      if(op==='change-password'&&(typeof body.currentPassword!=='string'||body.currentPassword.length>128||!acceptablePassword(body.newPassword)||body.newPassword===body.currentPassword))reject(400,'PASSWORD_POLICY');
      const token=tokenFrom(event);
      if(op!=='login'&&!token)reject(401,'SESSION_INVALID');
      c=await connect(local);
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');inTransaction=true;
      await c.query("SET LOCAL statement_timeout='3000ms'");
      const proof=(await c.query(ATTESTATION,['b2_lab'])).rows;
      validateProof({mode:'member-local',policy:{context:'local',classification:'synthetic-local',environmentId:local.environmentId,fingerprint:local.fingerprint,role:local.user}},proof);
      const permissions=(await c.query(PERMISSIONS)).rows[0];
      if(proof[0].session_role!==local.user||proof[0].database_temp!==false||proof[0].database_name!==local.database||permissions.host!==local.host||permissions.port!==local.port||permissions.excess_column_update!==false||permissions.excess_table_write!==false)reject(503,'LOCAL_PERMISSION_REJECTED');
      await c.query('COMMIT');inTransaction=false;
      await c.query('BEGIN');inTransaction=true;
      await c.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='2000ms'");
      const bucket=value=>crypto.createHmac('sha256',local.rateKey).update(value).digest('hex');
      async function rate(name,limit,seconds){
        const row=(await c.query(`INSERT INTO b2_lab.member_session_limits_v2(bucket_hash,hits,resets_at) VALUES($1,1,now()+$2::int*interval '1 second') ON CONFLICT(bucket_hash) DO UPDATE SET hits=CASE WHEN b2_lab.member_session_limits_v2.resets_at<=now() THEN 1 ELSE b2_lab.member_session_limits_v2.hits+1 END,resets_at=CASE WHEN b2_lab.member_session_limits_v2.resets_at<=now() THEN now()+$2::int*interval '1 second' ELSE b2_lab.member_session_limits_v2.resets_at END RETURNING hits`,[bucket(name),seconds])).rows[0];
        return row.hits<=limit;
      }
      let allowed=await rate('request:'+String(clientAddress(event)),120,60);
      if(op==='login'){
        allowed=(await rate('login-ip:'+String(clientAddress(event)),30,900))&&allowed;
        allowed=(await rate('login-account:'+body.account.trim().toLowerCase(),10,900))&&allowed;
      }
      if(op==='change-password')allowed=(await rate('password-ip:'+String(clientAddress(event)),5,900))&&allowed;
      await c.query('COMMIT');inTransaction=false;
      if(!allowed)reject(429,'RATE_LIMITED');
      await c.query('BEGIN');inTransaction=true;
      await c.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='2000ms'");
      const csrf=value=>crypto.createHmac('sha256',local.csrfKey).update('member-local-v1:'+value).digest('base64url');
      const select=`SELECT a.id,a.password_hash,a.hash_algorithm,a.force_reset_password,a.is_locked,
        p.nickname,p.display_name,p.member_role,to_char(p.join_date,'YYYY-MM-DD') AS join_date,p.is_active,
        s.member_id,s.auth_version,s.disabled_at FROM b2_lab.guild_member_accounts a
        JOIN b2_lab.guild_member_profiles p ON p.employee_no=a.employee_no
        JOIN b2_lab.member_account_security_v2 s ON s.account_id=a.id`;
      const dto=a=>({member:{id:a.member_id,displayName:a.nickname},needsPasswordChange:a.force_reset_password,syntheticOnly:true});
      let response;
      if(op==='login'){
        const a=(await c.query(select+' WHERE a.login_account=$1 FOR UPDATE OF a',[body.account])).rows[0];
        const valid=await verifyPassword(body.password,a?.hash_algorithm==='pbkdf2_sha256'?a.password_hash:undefined);
        if(!valid||!a||a.is_locked||!a.is_active||a.disabled_at)reject(401,'INVALID_CREDENTIALS');
        const next=crypto.randomBytes(32).toString('base64url'),csrfToken=csrf(next);
        if(token)await c.query('UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL',[hash(token)]);
        await c.query(`UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE id IN
          (SELECT id FROM b2_lab.member_sessions_v2 WHERE account_id=$1 AND revoked_at IS NULL AND expires_at>now() AND idle_expires_at>now() ORDER BY created_at DESC,id DESC OFFSET 4)`,[a.id]);
        await c.query(`INSERT INTO b2_lab.member_sessions_v2(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at)
          VALUES($1,$2,$3,'local-v1',$4,now()+interval '7 days',now()+interval '30 minutes')`,[a.id,hash(next),hash(csrfToken),a.auth_version]);
        await c.query('UPDATE b2_lab.guild_member_accounts SET last_login_at=now() WHERE id=$1',[a.id]);
        response=output(200,{...dto(a),csrfToken},cookie(next));
      }else{
        const lookup=(await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(token)])).rows[0];
        if(!lookup)reject(401,'SESSION_INVALID');
        // Account lock first in every auth transaction, then session lock.
        const a=(await c.query(select+' WHERE a.id=$1 FOR UPDATE OF a',[lookup.account_id])).rows[0];
        const session=(await c.query('SELECT *,expires_at>now() AND idle_expires_at>now() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 AND account_id=$2 FOR UPDATE',[hash(token),lookup.account_id])).rows[0];
        if(!a||!session||a.is_locked||!a.is_active||a.disabled_at||session.revoked_at||!session.live||session.auth_version!==a.auth_version||session.csrf_key_id!=='local-v1')reject(401,'SESSION_INVALID');
        if(method==='POST'&&(!equal(header(event,'x-csrf-token'),csrf(token))||!crypto.timingSafeEqual(hash(header(event,'x-csrf-token')),session.csrf_hash)))reject(403,'CSRF_REJECTED');
        if(a.force_reset_password&&!['me','change-password','logout'].includes(op))reject(403,'PASSWORD_RESET_REQUIRED');
        if(op==='logout'){
          await c.query('UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE id=$1',[session.id]);
          response=output(200,{success:true,syntheticOnly:true},cookie('',true));
        }else if(op==='change-password'){
          if(!await verifyPassword(body.currentPassword,a.hash_algorithm==='pbkdf2_sha256'?a.password_hash:undefined))reject(403,'REAUTHENTICATION_FAILED');
          await c.query("UPDATE b2_lab.guild_member_accounts SET password_hash=$1,hash_algorithm='pbkdf2_sha256',force_reset_password=false,password_updated_at=now(),updated_at=now() WHERE id=$2",[await hashPassword(body.newPassword),a.id]);
          response=output(200,{success:true,reauthenticationRequired:true,syntheticOnly:true},cookie('',true));
        }else{
          await c.query("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=LEAST(expires_at,now()+interval '30 minutes'),last_seen_at=now() WHERE id=$1",[session.id]);
          response=output(200,{...dto(a),csrfToken:csrf(token),...(op==='profile'?{profile:{displayName:a.display_name,nickname:a.nickname,role:a.member_role,joinedOn:a.join_date||null}}:{})});
        }
      }
      await c.query('COMMIT');inTransaction=false;return response;
    }catch(error){
      if(inTransaction)await c.query('ROLLBACK').catch(()=>{});
      const known=error instanceof MemberError,status=known?error.status:503;
      const code=known?error.code:'MEMBER_SERVICE_UNAVAILABLE';
      const message=code==='INVALID_CREDENTIALS'?'账号或密码无效。':status===401?'登录状态已失效，请重新登录。':status===429?'请求频繁，请稍后重试。':status===503?'本机身份服务暂不可用，请稍后重试。':'请求未获授权或参数无效。';
      return output(status,{error:message,code},status===401&&op!=='login'?cookie('',true):undefined);
    }finally{await c?.end().catch(()=>{});}
  };
}
module.exports={localSettings,createMemberHandler,COOKIE,tokenFrom,ATTESTATION,PERMISSIONS};
