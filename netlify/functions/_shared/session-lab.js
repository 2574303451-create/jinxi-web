// Synthetic local demonstration only. It cannot select a cloud/production database.
const crypto=require('node:crypto');
const {databaseConfig,validateProof,ATTESTATION_SQL}=require('./function-security');
const {hashPassword,verifyPassword,acceptablePassword}=require('./password');
const COOKIE='__Host-jinxi_session_lab',DAY_SECONDS=604800;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const header=(event,name)=>Object.entries(event.headers||{}).find(([k])=>k.toLowerCase()===name)?.[1]||'';
const same=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&crypto.timingSafeEqual(left,right);};
class HttpError extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
const fail=(status,code)=>{throw new HttpError(status,code)};
const safeNumber=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0)fail(503,'VALUE_OUT_OF_RANGE');return n;};
function cookie(token,clear=false){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:DAY_SECONDS}`;}
function cookieToken(event){const values=String(header(event,'cookie')).split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+'='));if(values.length!==1)return null;const token=values[0].slice(COOKIE.length+1);return /^[A-Za-z0-9_-]{43}$/.test(token)?token:null;}
function output(status,body,sessionCookie){return{statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(sessionCookie?{'Set-Cookie':sessionCookie}:{})},body:JSON.stringify(body)}}
function createSessionLabHandler({env,connect,clientAddress=()=> 'unavailable'}){
 return async event=>{
  let c,transaction=false;
  try{
   const config=databaseConfig(env,'session-lab'),origin=env.JINXI_SESSION_ORIGIN;
   if(!['https://localhost:3048','https://127.0.0.1:3048'].includes(origin)||!env.JINXI_SESSION_CSRF_SECRET||env.JINXI_SESSION_CSRF_SECRET.length<32||!env.JINXI_SESSION_RATE_SECRET||env.JINXI_SESSION_RATE_SECRET.length<32)fail(503,'LAB_NOT_CONFIGURED');
   if(header(event,'sec-fetch-site')==='cross-site')fail(403,'ORIGIN_REJECTED');
   const method=event.httpMethod;if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED');
   if(header(event,'origin')&&header(event,'origin')!==origin)fail(403,'ORIGIN_REJECTED');
   let body={},op;
   if(method==='POST'){
    if(header(event,'origin')!==origin)fail(403,'ORIGIN_REQUIRED');
    if(!/^application\/json(?:;|$)/i.test(header(event,'content-type')))fail(415,'JSON_REQUIRED');
    if(event.isBase64Encoded||Buffer.byteLength(event.body||'')>4096)fail(413,'BODY_TOO_LARGE');
    try{body=JSON.parse(event.body||'{}')}catch{fail(400,'INVALID_JSON')}
    if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'INVALID_BODY');op=body.op;
   }else{const query=event.queryStringParameters||{};if(Object.keys(query).some(x=>x!=='op'))fail(400,'INVALID_QUERY');op=query.op||'me';}
   const fields={login:['op','account','password'],'change-password':['op','currentPassword','newPassword'],logout:['op'],'claim-checkin':['op'],redeem:['op','itemCode','requestId']};
   if(method==='GET'&&!['me','points'].includes(op))fail(405,'READ_ONLY_OPERATION');
   if(method==='POST'&&!Object.hasOwn(fields,op))fail(400,'UNKNOWN_OPERATION');
   if(['memberId','userId','accountId','employeeNo','pointDelta','pointCost','price','reward'].some(k=>Object.hasOwn(body,k)))fail(403,'CLIENT_AUTHORITY_REJECTED');
   if(method==='POST'&&Object.keys(body).some(k=>!fields[op].includes(k)))fail(400,'UNKNOWN_FIELD');
   if(op==='login'&&(typeof body.account!=='string'||body.account.length>64||typeof body.password!=='string'||body.password.length>128))fail(400,'INVALID_CREDENTIAL_FORMAT');
   c=await connect(config);await c.query('BEGIN');transaction=true;await c.query("SET LOCAL statement_timeout='3000ms'");
   validateProof(config,(await c.query(ATTESTATION_SQL,['b2_lab'])).rows);
   const rateHash=value=>crypto.createHmac('sha256',env.JINXI_SESSION_RATE_SECRET).update(value).digest('hex');
   async function rate(bucket,limit,seconds){const r=(await c.query(`INSERT INTO b2_lab.rate_limits(bucket,hits,reset_at) VALUES($1,1,now()+$2::int*interval '1 second') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN b2_lab.rate_limits.reset_at<=now() THEN 1 ELSE b2_lab.rate_limits.hits+1 END,reset_at=CASE WHEN b2_lab.rate_limits.reset_at<=now() THEN now()+$2::int*interval '1 second' ELSE b2_lab.rate_limits.reset_at END RETURNING hits`,[bucket,seconds])).rows[0];return r.hits<=limit;}
   let allowed=await rate('request:'+rateHash(String(clientAddress(event))),120,60);
   if(op==='login'){
    allowed=(await rate('login-ip:'+rateHash(String(clientAddress(event))),5,900))&&allowed;
    // Derive the bucket uniformly; account existence never changes its shape.
    allowed=(await rate('login-account:'+rateHash(body.account.trim().toLowerCase()),5,900))&&allowed;
   }
   if(op==='change-password')allowed=(await rate('password-ip:'+rateHash(String(clientAddress(event))),5,900))&&allowed;
   if(!allowed){await c.query('COMMIT');transaction=false;return output(429,{error:'请求频繁，请稍后重试。',code:'RATE_LIMITED'});}
   await c.query('COMMIT');transaction=false;
   await c.query('BEGIN');transaction=true;await c.query("SET LOCAL statement_timeout='3000ms'");
   await c.query('SAVEPOINT business');
   let response;
   const csrf=token=>crypto.createHmac('sha256',env.JINXI_SESSION_CSRF_SECRET).update('csrf-v1:'+token).digest('base64url');
   try{
    if(op==='login'){
     const a=(await c.query(`SELECT a.*,p.member_id,p.nickname,p.is_active,p.source FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) WHERE a.login_account=$1 FOR UPDATE OF a,p`,[body.account])).rows[0];
     const valid=await verifyPassword(body.password,a?.password_hash);
     if(!valid||!a||a.is_locked||!a.is_active||a.source!=='synthetic-b2-lab'||!['b2-lab-a','b2-lab-b'].includes(body.account))fail(401,'INVALID_CREDENTIALS');
     const token=crypto.randomBytes(32).toString('base64url'),csrfToken=csrf(token);
     await c.query("UPDATE b2_lab.sessions SET revoked_at=now() WHERE id IN(SELECT id FROM b2_lab.sessions WHERE account_id=$1 AND revoked_at IS NULL AND expires_at>now() AND idle_expires_at>now() ORDER BY created_at DESC,id DESC OFFSET 4)",[a.id]);
     await c.query(`INSERT INTO b2_lab.sessions(account_id,token_hash,csrf_hash,auth_version,expires_at,idle_expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days',now()+interval '30 minutes')`,[a.id,sha(token),sha(csrfToken),a.auth_version]);
     await c.query('UPDATE b2_lab.guild_member_accounts SET last_login_at=now() WHERE id=$1',[a.id]);
     response=output(200,{member:{id:a.member_id,displayName:a.nickname},needsPasswordChange:a.force_reset_password,csrfToken,syntheticOnly:true},cookie(token));
    }else{
     const token=cookieToken(event);if(!token)fail(401,'SESSION_INVALID');
     const lookup=(await c.query('SELECT account_id FROM b2_lab.sessions WHERE token_hash=$1',[sha(token)])).rows[0];if(!lookup)fail(401,'SESSION_INVALID');
     const a=(await c.query('SELECT a.*,p.member_id,p.nickname,p.is_active,p.source FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) WHERE a.id=$1 FOR UPDATE OF a,p',[lookup.account_id])).rows[0];
     const s=(await c.query('SELECT *,expires_at>now() AND idle_expires_at>now() AS live FROM b2_lab.sessions WHERE token_hash=$1 AND account_id=$2 FOR UPDATE',[sha(token),lookup.account_id])).rows[0];
     if(!a||!s||a.is_locked||!a.is_active||a.source!=='synthetic-b2-lab'||s.revoked_at||!s.live||s.auth_version!==a.auth_version)fail(401,'SESSION_INVALID');
     if(method==='POST'&&(!same(header(event,'x-csrf-token'),csrf(token))||!same(sha(header(event,'x-csrf-token')),s.csrf_hash)))fail(403,'CSRF_REJECTED');
     if(a.force_reset_password&&!['me','change-password','logout'].includes(op))fail(403,'PASSWORD_RESET_REQUIRED');
     await c.query("UPDATE b2_lab.sessions SET idle_expires_at=LEAST(expires_at,now()+interval '30 minutes'),last_seen_at=now() WHERE id=$1",[s.id]);
     if(op==='me')response=output(200,{member:{id:a.member_id,displayName:a.nickname},needsPasswordChange:a.force_reset_password,csrfToken:csrf(token),syntheticOnly:true});
     else if(op==='logout'){await c.query('UPDATE b2_lab.sessions SET revoked_at=now() WHERE id=$1',[s.id]);response=output(200,{success:true},cookie('',true));}
     else if(op==='change-password'){
      if(!acceptablePassword(body.newPassword)||typeof body.currentPassword!=='string'||body.currentPassword.length>128||body.newPassword===body.currentPassword)fail(400,'PASSWORD_POLICY');
      if(!await verifyPassword(body.currentPassword,a.password_hash))fail(403,'REAUTHENTICATION_FAILED');
      await c.query("UPDATE b2_lab.guild_member_accounts SET password_hash=$1,hash_algorithm='pbkdf2_sha256',force_reset_password=false,auth_version=auth_version+1,password_updated_at=now() WHERE id=$2",[await hashPassword(body.newPassword),a.id]);
      await c.query('UPDATE b2_lab.sessions SET revoked_at=now() WHERE account_id=$1',[a.id]);response=output(200,{success:true,reauthenticationRequired:true},cookie('',true));
     }else{
      await c.query('INSERT INTO b2_lab.point_account(member_id) VALUES($1) ON CONFLICT DO NOTHING',[a.member_id]);
      const wallet=(await c.query('SELECT * FROM b2_lab.point_account WHERE member_id=$1 FOR UPDATE',[a.member_id])).rows[0];
      if(op==='points')response=output(200,{balance:safeNumber(wallet.balance),syntheticOnly:true});
      else{
       let key,amount,itemCode=null;
       if(op==='claim-checkin'){const day=(await c.query("SELECT to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD') AS day")).rows[0].day;key='lab.checkin:'+day;}
       else{if(typeof body.itemCode!=='string'||body.itemCode.length>64||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId||''))fail(400,'INVALID_REDEMPTION');itemCode=body.itemCode;key='redeem:'+body.requestId;}
       const old=(await c.query('SELECT * FROM b2_lab.point_ledger WHERE member_id=$1 AND biz_key=$2',[a.member_id,key])).rows[0];
       if(old){if(old.item_code!==itemCode)fail(409,'IDEMPOTENCY_CONFLICT');response=output(200,{success:true,alreadyProcessed:true,balance:safeNumber(wallet.balance),amount:safeNumber(old.amount)});}
       else{
        if(op==='claim-checkin'){const rule=(await c.query("SELECT reward FROM b2_lab.point_rule WHERE code='lab.checkin' AND active=true")).rows[0];if(!rule)fail(503,'RULE_UNAVAILABLE');amount=safeNumber(rule.reward);}
        else{const item=(await c.query('SELECT price FROM b2_lab.point_catalog WHERE code=$1 AND active=true',[itemCode])).rows[0];if(!item)fail(400,'UNKNOWN_ITEM');amount=safeNumber(item.price);}
        const balance=safeNumber(wallet.balance)+(op==='claim-checkin'?amount:-amount);if(balance<0)fail(409,'INSUFFICIENT_BALANCE');if(!Number.isSafeInteger(balance))fail(503,'VALUE_OUT_OF_RANGE');
        await c.query('INSERT INTO b2_lab.point_ledger(member_id,biz_key,kind,item_code,amount,balance_after) VALUES($1,$2,$3,$4,$5,$6)',[a.member_id,key,op==='claim-checkin'?'checkin':'redeem',itemCode,amount,balance]);
        await c.query('UPDATE b2_lab.point_account SET balance=$2,total_earned=total_earned+$3,total_spent=total_spent+$4 WHERE member_id=$1',[a.member_id,balance,op==='claim-checkin'?amount:0,op==='redeem'?amount:0]);response=output(200,{success:true,alreadyProcessed:false,balance,amount});
       }
      }
     }
    }
   }catch(error){if(!(error instanceof HttpError))throw error;await c.query('ROLLBACK TO SAVEPOINT business');const message=error.code==='INVALID_CREDENTIALS'?'账号或密码无效。':error.status===401?'登录状态已失效，请重新登录。':'请求未获授权或参数无效。';response=output(error.status,{error:message,code:error.code},error.status===401&&op!=='login'?cookie('',true):undefined);}
   await c.query('COMMIT');transaction=false;return response;
  }catch(error){if(transaction)await c.query('ROLLBACK').catch(()=>{});return output(error instanceof HttpError?error.status:503,{error:'隔离演示请求未完成。',code:error instanceof HttpError?error.code:'LAB_UNAVAILABLE'});}
  finally{await c?.end().catch(()=>{})}
 };
}
module.exports={createSessionLabHandler,COOKIE,cookieToken};
