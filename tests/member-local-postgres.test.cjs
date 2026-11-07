// Standalone fresh LOCAL cluster. Never reads .env, prior runtime files, or a DSN.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const {freshDatabase}=require('../member-local/database.cjs');
const {createMemberHandler,COOKIE}=require('../member-local/identity.cjs');
const {serve}=require('../member-local/server.cjs');
const origin='https://127.0.0.1:3069';
const args=process.argv.slice(2);
test('member identity on a fresh SCRAM-authenticated loopback PostgreSQL',async t=>{
  assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl','Explicit local tool paths required');
  const db=await freshDatabase(args[1]);assert.equal(db.missingApprovalGuardTested,true);
  let server;
  const make=options=>createMemberHandler({settings:db.settings,connect:db.connect,env:{},clientAddress:e=>e.localClientAddress||'synthetic-loopback',...options});
  const h=make();
  async function fresh(){const accounts=await db.seed();return Object.fromEntries(accounts.map(a=>[a.kind,a]));}
  async function admin(work){const c=await db.admin();try{return await work(c);}catch(error){if(error.severity&&/^[0-9A-Z]{5}$/.test(error.code||''))throw Error('LOCAL_SQL_FAILURE_'+error.code+(error.constraint?':'+error.constraint:''));throw error;}finally{await c.end();}}
  async function call(op,{method='POST',body={},session,headers={},query={},rawBody}={}){
    const response=await h({httpMethod:method,headers:{...(method==='POST'?{origin,'content-type':'application/json'}:{}),...(session?{cookie:session.cookie,'x-csrf-token':session.csrfToken}:{}),...headers},...(method==='GET'?{queryStringParameters:{op,...query}}:{body:rawBody??JSON.stringify({op,...body})})});
    return {status:response.statusCode,body:JSON.parse(response.body),headers:response.headers};
  }
  async function login(account,session){const r=await call('login',{body:{account:account.account,password:account.password},session});assert.equal(r.status,200,'Synthetic login must succeed');return {cookie:r.headers['Set-Cookie'].split(';')[0],csrfToken:r.body.csrfToken,member:r.body.member,headers:r.headers};}
  try{
    await t.test('legacy account/profile FK and opaque mapping; 208 fully synthetic legacy records preserve status',async()=>{
      const a=await fresh();await admin(async c=>{
        await c.query('BEGIN');try{
          await c.query("INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,source,is_active) SELECT 'LEGACY-SYNTHETIC-'||n,'合成历史档案'||n,'同昵称合成档案','synthetic-legacy-208',n%11<>0 FROM generate_series(1,208) n");
          await c.query("INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,force_reset_password,is_locked) SELECT p.employee_no,'legacy-synthetic-'||n,a.password_hash,n%2=0,n%7=0 FROM generate_series(1,208) n JOIN b2_lab.guild_member_profiles p ON p.employee_no='LEGACY-SYNTHETIC-'||n CROSS JOIN b2_lab.guild_member_accounts a WHERE a.login_account=$1",[a.normal.account]);
          await c.query("INSERT INTO b2_lab.member_account_security_v2(account_id) SELECT a.id FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) WHERE p.source='synthetic-legacy-208'");
          const row=(await c.query("SELECT count(*)::int AS n,count(DISTINCT s.member_id)::int AS ids,count(*) FILTER(WHERE a.is_locked)::int AS locked,count(*) FILTER(WHERE NOT p.is_active)::int AS disabled,count(*) FILTER(WHERE a.force_reset_password)::int AS must_reset FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) JOIN b2_lab.member_account_security_v2 s ON s.account_id=a.id WHERE p.source='synthetic-legacy-208'")).rows[0];
          assert.deepEqual(row,{n:208,ids:208,locked:29,disabled:18,must_reset:104});
          await assert.rejects(c.query("INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash) VALUES('NONEXISTENT','orphan-synthetic','no-real-hash')"),e=>e.code==='23503');
        }finally{await c.query('ROLLBACK');}
      });
    });
    await t.test('valid login, opaque server identity, self-only profile and token digests',async()=>{
      const a=await fresh(),s=await login(a.normal),me=await call('me',{method:'GET',session:s}),profile=await call('profile',{method:'GET',session:s});
      assert.equal(me.status,200);assert.equal(profile.status,200);assert(s.member.id===a.normal.memberId,'Stable identity comes from mapping');assert.equal(profile.body.profile.joinedOn,'2018-02-10');
      assert(profile.body.profile.nickname===s.member.displayName,'Profile belongs to authenticated member');
      for(const value of [me.body,profile.body])assert(!/employee_no|employeeNo|login_account|password_hash|account_id|auth_version|last_login|token_hash/.test(JSON.stringify(value)),'Private fields excluded');
      assert.match(s.headers['Set-Cookie'],/^__Host-jinxi_member_local=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800$/);
      await admin(async c=>{const row=(await c.query('SELECT octet_length(token_hash)::int AS token_bytes,octet_length(csrf_hash)::int AS csrf_bytes,token_hash,csrf_hash FROM b2_lab.member_sessions_v2')).rows[0];assert.equal(row.token_bytes,32);assert.equal(row.csrf_bytes,32);assert(row.token_hash.equals(crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest()),'Stored token is digest only');assert(!row.csrf_hash.equals(Buffer.from(s.csrfToken)),'Stored CSRF is a digest');});
    });
    await t.test('unknown, wrong, locked, inactive, unsupported hashes and missing mappings have uniform denial',async()=>{
      const a=await fresh();const responses=[];
      for(const credentials of [{account:'unknown-synthetic',password:a.normal.password},{account:a.normal.account,password:'wrong-synthetic-password'},...['locked','disabled','unsupported'].map(kind=>({account:a[kind].account,password:a[kind].password}))])responses.push(await call('login',{body:credentials}));
      await admin(c=>c.query('DELETE FROM b2_lab.member_account_security_v2 WHERE account_id=$1',[a.normal.accountId]));responses.push(await call('login',{body:{account:a.normal.account,password:a.normal.password}}));
      for(const response of responses){assert.equal(response.status,401);assert.deepEqual(response.body,{error:'账号或密码无效。',code:'INVALID_CREDENTIALS'});assert.equal(response.headers['Set-Cookie'],undefined);}
      assert.equal(await admin(async c=>Number((await c.query('SELECT count(*) AS n FROM b2_lab.member_sessions_v2')).rows[0].n)),0);
    });
    await t.test('same nicknames stay separate; self-reported identity is always rejected',async()=>{
      const a=await fresh(),one=await login(a.normal),two=await login(a.same);assert(one.member.displayName===two.member.displayName,'Fixture uses identical nicknames');assert(one.member.id!==two.member.id,'Identities must remain separate');
      assert.equal((await call('profile',{method:'GET',session:one,query:{memberId:two.member.id}})).status,403);
      assert.equal((await call('profile',{method:'GET',session:one,query:{account:a.same.account}})).status,403);
      assert.equal((await call('change-password',{session:one,body:{memberId:two.member.id,currentPassword:a.normal.password,newPassword:'Synthetic-replacement-123!'}})).status,403);
      assert.equal((await call('logout',{session:one,headers:{'x-csrf-token':two.csrfToken}})).status,403);
    });
    await t.test('old 200000 PBKDF2 format, mandatory first change and all-device revocation',async()=>{
      const a=await fresh(),one=await login(a.first),two=await login(a.first);assert.equal((await call('me',{method:'GET',session:one})).body.needsPasswordChange,true);
      assert.equal((await call('profile',{method:'GET',session:one})).status,403);
      assert.equal((await call('change-password',{session:one,body:{currentPassword:'wrong-synthetic',newPassword:'Synthetic-New-Legacy-123!'}})).status,403);
      const changed=await call('change-password',{session:one,body:{currentPassword:a.first.password,newPassword:'Synthetic-New-Legacy-123!'}});assert.equal(changed.status,200);
      for(const session of [one,two])assert.equal((await call('me',{method:'GET',session})).status,401);
      assert.equal((await call('login',{body:{account:a.first.account,password:a.first.password}})).status,401);
      const next=await login({...a.first,password:'Synthetic-New-Legacy-123!'});assert.equal((await call('profile',{method:'GET',session:next})).status,200);
      await admin(async c=>{const row=(await c.query('SELECT force_reset_password,password_hash,hash_algorithm FROM b2_lab.guild_member_accounts WHERE id=$1',[a.first.accountId])).rows[0];assert.equal(row.force_reset_password,false);assert(row.password_hash.startsWith('pbkdf2_sha256$600000$'),'Upgrade only on explicit authorized password change');});
    });
    await t.test('normal password change invalidates every device, leaves other members intact',async()=>{
      const a=await fresh(),one=await login(a.normal),two=await login(a.normal),other=await login(a.same);
      const changed=await call('change-password',{session:one,body:{currentPassword:a.normal.password,newPassword:'Synthetic-New-Normal-123!'}});assert.equal(changed.status,200);assert.match(changed.headers['Set-Cookie'],/Max-Age=0/);
      for(const session of [one,two])assert.equal((await call('profile',{method:'GET',session})).status,401);
      assert.equal((await call('me',{method:'GET',session:other})).status,200);
      await login({...a.normal,password:'Synthetic-New-Normal-123!'});
    });
    await t.test('logout, forged cookies, duplicate cookies and rotated-session replay',async()=>{
      const a=await fresh(),one=await login(a.normal),next=await login(a.normal,one);
      assert(one.cookie!==next.cookie,'Login must rotate token');assert.equal((await call('me',{method:'GET',session:one})).status,401);
      for(const cookie of [COOKIE+'='+crypto.randomBytes(32).toString('base64url'),next.cookie+'; '+next.cookie,COOKIE+'=not-a-token'])assert.equal((await call('me',{method:'GET',headers:{cookie}})).status,401);
      assert.equal((await call('logout',{session:next,headers:{'x-csrf-token':one.csrfToken}})).status,403);
      assert.equal((await call('logout',{session:next})).status,200);assert.equal((await call('logout',{session:next})).status,401);assert.equal((await call('me',{method:'GET',session:next})).status,401);
    });
    await t.test('absolute and idle expiry reject with cookie clearing',async()=>{
      const a=await fresh(),one=await login(a.normal);
      await admin(c=>c.query("UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '8 days',expires_at=now()-interval '1 second',idle_expires_at=now()-interval '2 seconds'"));
      const expired=await call('me',{method:'GET',session:one});assert.equal(expired.status,401);assert.match(expired.headers['Set-Cookie'],/Max-Age=0/);
      const two=await login(a.normal);await admin(c=>c.query("UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '1 hour',idle_expires_at=now()-interval '1 second' WHERE token_hash=$1",[crypto.createHash('sha256').update(two.cookie.split('=')[1]).digest()]));assert.equal((await call('profile',{method:'GET',session:two})).status,401);
    });
    await t.test('locking, deactivation and security disable permanently revoke prior sessions',async()=>{
      const a=await fresh();
      for(const [enable,restore]of [["UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE login_account='synthetic-normal'","UPDATE b2_lab.guild_member_accounts SET is_locked=false WHERE login_account='synthetic-normal'"],["UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no='SYNTHETIC-normal'","UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no='SYNTHETIC-normal'"],["UPDATE b2_lab.member_account_security_v2 SET disabled_at=now()","UPDATE b2_lab.member_account_security_v2 SET disabled_at=NULL"]]){
        const s=await login(a.normal);await admin(c=>c.query(enable));assert.equal((await call('me',{method:'GET',session:s})).status,401);await admin(c=>c.query(restore));assert.equal((await call('me',{method:'GET',session:s})).status,401);
      }
    });
    await t.test('multi-tab shares one session; concurrent devices stay capped without identity mixing',async()=>{
      const a=await fresh(),one=await login(a.normal);const reads=await Promise.all([call('me',{method:'GET',session:one}),call('profile',{method:'GET',session:one})]);assert(reads.every(r=>r.status===200),'Both tabs restore same server identity');
      assert.equal(await admin(async c=>Number((await c.query('SELECT count(*) AS n FROM b2_lab.member_sessions_v2')).rows[0].n)),1);
      const devices=await Promise.all(Array.from({length:7},()=>login(a.normal)));assert(devices.every(s=>s.member.id===a.normal.memberId),'Concurrent devices resolve one stable member');
      assert.equal(await admin(async c=>Number((await c.query('SELECT count(*) AS n FROM b2_lab.member_sessions_v2 WHERE revoked_at IS NULL')).rows[0].n)),5);
      assert.equal((await call('me',{method:'GET',session:one})).status,401);
    });
    await t.test('SQL injection and bounded input cannot select or change another account',async()=>{
      const a=await fresh();assert.equal((await call('login',{body:{account:"synthetic-normal' OR 1=1 --",password:a.normal.password}})).status,401);
      const one=await login(a.normal);for(const body of [{currentPassword:"' OR 1=1 --",newPassword:'Synthetic-Injected-123!'}, {currentPassword:a.normal.password,newPassword:'short'}, {currentPassword:[],newPassword:'Synthetic-Injected-123!'}])assert([400,403].includes((await call('change-password',{session:one,body})).status));
      for(const [body,status]of [[{account:[],password:'synthetic'},400],[{account:'x'.repeat(65),password:'synthetic'},400],[{account:'synthetic-normal',password:'x'.repeat(129)},400]])assert.equal((await call('login',{body})).status,status);
      assert.equal((await call('login',{rawBody:'{"op":'})).status,400);assert.equal((await call('login',{rawBody:'x'.repeat(5000)})).status,413);
      assert.equal((await call('profile',{method:'GET',session:one})).status,200);
    });
    await t.test('Origin/CSRF reject cross-site writes, unsupported businesses never activate',async()=>{
      const a=await fresh(),s=await login(a.normal);
      for(const headers of [{origin:'https://attacker.invalid'},{origin:''},{'sec-fetch-site':'cross-site'},{'x-csrf-token':''},{'x-csrf-token':'wrong-synthetic'}])assert.equal((await call('logout',{session:s,headers})).status,403);
      assert.equal((await call('logout',{session:s,headers:{'content-type':'text/plain'}})).status,415);
      for(const op of ['points','claim-checkin','redeem','post-message','upload-avatar','heartbeat'])assert.equal((await call(op,{session:s})).status,400);
      assert.equal(await admin(async c=>(await c.query('SELECT balance FROM business_disabled.points')).rows[0].balance),'314');
    });
    await t.test('persistent login/password throttles do not reset on rejected attempts',async()=>{
      const a=await fresh();for(let i=0;i<10;i++)assert.equal((await call('login',{body:{account:'unknown-rate-synthetic',password:'wrong-synthetic'}})).status,401);assert.equal((await call('login',{body:{account:'unknown-rate-synthetic',password:'wrong-synthetic'}})).status,429);
      const s=await login(a.normal);for(let i=0;i<5;i++)assert.equal((await call('change-password',{session:s,body:{currentPassword:'wrong-synthetic',newPassword:'Synthetic-Rate-Test-123!'}})).status,403);assert.equal((await call('change-password',{session:s,body:{currentPassword:a.normal.password,newPassword:'Synthetic-Rate-Test-123!'}})).status,429);
      await admin(async c=>{const rows=(await c.query('SELECT bucket_hash FROM b2_lab.member_session_limits_v2')).rows;assert(rows.every(row=>/^[a-f0-9]{64}$/.test(row.bucket_hash)),'No raw IP/account identifiers in rate buckets');});
    });
    await t.test('actual restricted role cannot alter locks, profiles, mapping, business tables, DDL or TEMP',async()=>{
      await fresh();const c=await db.connect();try{for(const sql of ["UPDATE b2_lab.guild_member_accounts SET is_locked=false","UPDATE b2_lab.guild_member_profiles SET nickname='forged'","UPDATE b2_lab.member_account_security_v2 SET auth_version=999",'SELECT * FROM business_disabled.points','DELETE FROM b2_lab.member_sessions_v2','CREATE SCHEMA forbidden','CREATE TEMP TABLE forbidden(id int)','SET ROLE jinxi_member_owner','SELECT * FROM jinxi_guard.environment_registration',"SELECT b2_lab.revoke_account_state()"]){await assert.rejects(c.query(sql),e=>e.code==='42501','Actual database permission must reject');}}finally{await c.end();}
      await admin(async c=>{await assert.rejects(c.query('UPDATE b2_lab.member_account_security_v2 SET member_id=gen_random_uuid()'),e=>e.code==='P0001');});
    });
    await t.test('actual excessive ACL or wrong identity stops before profile/session business work',async()=>{
      const a=await fresh(),s=await login(a.normal);
      await admin(c=>c.query('GRANT UPDATE(is_locked) ON b2_lab.guild_member_accounts TO jinxi_member_session'));
      assert.equal((await call('me',{method:'GET',session:s})).status,503);
      await admin(c=>c.query('REVOKE UPDATE(is_locked) ON b2_lab.guild_member_accounts FROM jinxi_member_session'));
      const bad=make({settings:{...db.settings,fingerprint:'f'.repeat(64)},connect:()=>db.connect()});const r=await bad({httpMethod:'GET',headers:{cookie:s.cookie},queryStringParameters:{op:'profile'}});assert.equal(r.statusCode,503);assert(!r.body.includes(db.settings.password),'Never echo connection secret');assert.equal((await call('me',{method:'GET',session:s})).status,200);
    });
    await t.test('login and password failures roll back partial security writes and suppress internals',async()=>{
      const a=await fresh();const broken=prefix=>make({connect:async()=>{const c=await db.connect(),query=c.query.bind(c);c.query=(sql,...values)=>{if(typeof sql==='string'&&sql.startsWith(prefix))throw Error('PRIVATE_MEMBER_INTERNAL_MARKER');return query(sql,...values);};return c;}});
      const event={httpMethod:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'login',account:a.normal.account,password:a.normal.password})};const failure=await broken('INSERT INTO b2_lab.member_sessions_v2')(event);assert.equal(failure.statusCode,503);assert(!failure.body.includes('PRIVATE_MEMBER'));
      assert.equal(await admin(async c=>Number((await c.query('SELECT count(*) AS n FROM b2_lab.member_sessions_v2')).rows[0].n)),0);
      const s=await login(a.normal);const changed=await broken('UPDATE b2_lab.guild_member_accounts SET password_hash')({...event,headers:{...event.headers,cookie:s.cookie,'x-csrf-token':s.csrfToken},body:JSON.stringify({op:'change-password',currentPassword:a.normal.password,newPassword:'Synthetic-Rollback-123!'})});assert.equal(changed.statusCode,503);assert.equal((await call('me',{method:'GET',session:s})).status,200);await login(a.normal);
    });
    await t.test('real HTTPS cookie, host binding and safe static page; no cloud route',async()=>{
      const a=await fresh();server=await serve(db,args[3]);
      async function http(route,options={}){return new Promise((resolve,reject)=>{const body=options.body?JSON.stringify(options.body):null;const req=https.request(origin+route,{method:body?'POST':'GET',ca:server.cert,servername:'localhost',headers:{...(body?{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...options.headers}},res=>{let data='';res.on('data',chunk=>{data+=chunk;});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data}));});req.on('error',reject);req.setTimeout(6000,()=>req.destroy(Error('LOCAL_HTTP_TIMEOUT')));req.end(body);});}
      const page=await http('/');assert.equal(page.status,200);assert(page.body.includes('仅本机合成验证'));assert.match(page.headers['content-security-policy'],/script-src 'self'/);
      const logged=await http('/api/member',{body:{op:'login',account:a.normal.account,password:a.normal.password}});assert.equal(logged.status,200);assert.match(logged.headers['set-cookie'][0],/HttpOnly; Secure; SameSite=Lax/);const cookie=logged.headers['set-cookie'][0].split(';')[0];
      assert.equal((await http('/api/member?op=profile',{headers:{Cookie:cookie}})).status,200);
      assert.equal((await http('/api/member?op=profile',{headers:{Cookie:cookie,Host:'production-like.invalid'}})).status,403);
      assert.equal((await http('/api/member?op=me&op=profile')).status,400);
      assert.equal((await http('/.netlify/functions/auth-login')).status,404);
      assert.equal((await http('/api/member',{body:{op:'logout'},headers:{Origin:'https://attacker.invalid',Cookie:cookie}})).status,403);
      // Save only synthetic counts/metadata. No tokens, passwords, hashes or raw account rows.
      const proof=await admin(async c=>{const identity=(await c.query('SELECT * FROM jinxi_guard.environment_identity()')).rows[0],role=(await c.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname='jinxi_member_session'")).rows[0];return {identity,role};});
      fs.mkdirSync(path.resolve(__dirname,'../artifacts/phase3-member'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/phase3-member/local-database-proof.json'),JSON.stringify({classification:'synthetic-local',host:'127.0.0.1',port:55436,database:'jinxi_member_local',scramAuthentication:true,missingApprovalRejectedBeforeDdl:db.missingApprovalGuardTested,...proof},null,2)+'\n');
    });
  }finally{await server?.close();await db.stop();}
});
