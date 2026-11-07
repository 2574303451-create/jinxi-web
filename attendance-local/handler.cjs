// Local-only adapter; never a Netlify Function or an alternate identity system.
const crypto=require('node:crypto');
const {localSettings,tokenFrom}=require('../member-local/identity.cjs');
const {verify}=require('./proof.cjs');
const {AttendanceError,fail,options,moment,state,checkin}=require('./store.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest();
const header=(e,key)=>Object.entries(e.headers||{}).find(([k])=>k.toLowerCase()===key)?.[1]||'';
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const output=(status,body)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)});
function createAttendanceHandler({settings,identity,connect,env=process.env}){
 return async event=>{
  let c,tx=false;
  try{
   localSettings(settings,env);const method=event.httpMethod,query=event.queryStringParameters||{};let body,readOptions;
   if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED');
   if(header(event,'sec-fetch-site')==='cross-site'||header(event,'origin')&&header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REJECTED');
   if(method==='POST'){
    if(header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REQUIRED');
    if(!/^application\/json(?:;|$)/i.test(header(event,'content-type')))fail(415,'JSON_REQUIRED');
    if(event.isBase64Encoded||typeof event.body!=='string'||Buffer.byteLength(event.body)>2048)fail(413,'BODY_REJECTED');
    try{body=JSON.parse(event.body);}catch{fail(400,'INVALID_JSON');}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(query).length)fail(400,'INVALID_BODY');
    if(Object.keys(body).some(k=>!['op','requestId'].includes(k)))fail(403,'CLIENT_AUTHORITY_REJECTED');
    if(body.op!=='checkin'||!uuid(body.requestId))fail(400,'INVALID_REQUEST');
   }else{if(Object.keys(query).some(k=>!['month','before','limit'].includes(k)))fail(403,'CLIENT_AUTHORITY_REJECTED');readOptions=options(query);}
   const auth=await identity({httpMethod:'GET',headers:event.headers,queryStringParameters:{op:'me'},localClientAddress:event.localClientAddress});if(auth.statusCode!==200)return auth;
   const member=JSON.parse(auth.body);if(member.needsPasswordChange)fail(403,'PASSWORD_RESET_REQUIRED');
   if(method==='POST'&&header(event,'x-csrf-token')!==member.csrfToken)fail(403,'CSRF_REJECTED');
   c=await connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;await verify(c,settings);await c.query('COMMIT');tx=false;
   await c.query('BEGIN');tx=true;await c.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='2000ms'; SET LOCAL DateStyle='ISO, YMD'");
   const token=tokenFrom(event);if(!token)fail(401,'SESSION_INVALID');
   const lookup=(await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(token)])).rows[0];if(!lookup)fail(401,'SESSION_INVALID');
   await c.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[lookup.account_id]);
   // A separate statement is essential: joined profile/security rows from a
   // statement that waited for the account lock may retain its earlier snapshot.
   const a=(await c.query('SELECT a.id,a.is_locked,a.force_reset_password,p.is_active,s.member_id,s.auth_version,s.disabled_at FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) JOIN b2_lab.member_account_security_v2 s ON s.account_id=a.id WHERE a.id=$1',[lookup.account_id])).rows[0];
   await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE',[hash(token)]);
   const s=(await c.query('SELECT account_id,csrf_hash,csrf_key_id,auth_version,revoked_at,expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(token)])).rows[0];
   if(!a||!s||a.member_id!==member.member.id||a.is_locked||!a.is_active||a.disabled_at||s.revoked_at||!s.live||s.auth_version!==a.auth_version||s.csrf_key_id!=='local-v1')fail(401,'SESSION_INVALID');
   if(a.force_reset_password)fail(403,'PASSWORD_RESET_REQUIRED');
   if(method==='POST'&&!crypto.timingSafeEqual(hash(header(event,'x-csrf-token')),s.csrf_hash))fail(403,'CSRF_REJECTED');
   await c.query("SELECT set_config('attendance.actor',$1,true)",[a.member_id]);
   const response=method==='POST'?await checkin(c,a.member_id,body.requestId):await state(c,a.member_id,await moment(c),readOptions);
   // Account/session rows remain locked. Time may still pass during business SQL.
   const final=(await c.query('SELECT expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(token)])).rows[0];
   if(!final?.live)fail(401,'SESSION_INVALID');
   await c.query('COMMIT');tx=false;return output(200,response);
  }catch(error){if(tx)await c.query('ROLLBACK').catch(()=>{});const known=error instanceof AttendanceError;return output(known?error.status:503,{error:'本机签到请求未完成或未获允许。',code:known?error.code:'ATTENDANCE_UNAVAILABLE'});}
  finally{await c?.end().catch(()=>{});}
 };
}
module.exports={createAttendanceHandler};
