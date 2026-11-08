const crypto=require('node:crypto'),{localSettings,tokenFrom}=require('../member-local/identity.cjs'),{verify}=require('./proof.cjs');
const {PointsError,fail,uuid,readOptions}=require('./contract.cjs'),store=require('./store.cjs');
const hash=v=>crypto.createHash('sha256').update(v).digest(),header=(e,k)=>Object.entries(e.headers||{}).find(([n])=>n.toLowerCase()===k)?.[1]||'';
const output=(status,body)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)});
async function authorize(c,ctx,event,write){
 const a=(await c.query('SELECT a.is_locked,a.force_reset_password,p.is_active,s.member_id,s.auth_version,s.disabled_at FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) JOIN b2_lab.member_account_security_v2 s ON s.account_id=a.id WHERE a.id=$1',[ctx.account])).rows[0];
 const s=(await c.query("SELECT csrf_hash,csrf_key_id,auth_version,revoked_at,expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 AND account_id=$2",[ctx.tokenHash,ctx.account])).rows[0];
 if(!a||!s||a.member_id!==ctx.actor||a.is_locked||!a.is_active||a.disabled_at||s.revoked_at||!s.live||a.auth_version!==s.auth_version||s.csrf_key_id!=='local-v1')fail(401,'SESSION_INVALID');if(a.force_reset_password)fail(403,'PASSWORD_RESET_REQUIRED');
 if(write&&!crypto.timingSafeEqual(hash(header(event,'x-csrf-token')),s.csrf_hash))fail(403,'CSRF_REJECTED');
 ctx.admin=(await c.query('SELECT points_lab.staff() AS admin')).rows[0].admin;if(ctx.requiredAdmin&&!ctx.admin)fail(403,'ADMIN_REQUIRED');
}
function createPointsHandler({settings,identity,connect,env=process.env}){
 return async event=>{let c,tx=false;
  try{
   localSettings(settings,env);const write=event.httpMethod==='POST';let query=event.queryStringParameters||{},body;
   if(!['GET','POST'].includes(event.httpMethod))fail(405,'METHOD_NOT_ALLOWED');if(header(event,'sec-fetch-site')==='cross-site'||header(event,'origin')&&header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REJECTED');
   if(write){
    if(header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REQUIRED');if(!/^application\/json(?:;|$)/i.test(header(event,'content-type')))fail(415,'JSON_REQUIRED');if(event.isBase64Encoded||typeof event.body!=='string'||Buffer.byteLength(event.body)>4096)fail(413,'BODY_REJECTED');
    try{body=JSON.parse(event.body);}catch{fail(400,'INVALID_JSON');}if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(query).length)fail(400,'INVALID_BODY');body.requestId=uuid(body.requestId);if(typeof body.op!=='string')fail(400,'INVALID_OPERATION');
   }else query=readOptions(query);
   const auth=await identity({httpMethod:'GET',headers:event.headers,queryStringParameters:{op:'me'},localClientAddress:event.localClientAddress});if(auth.statusCode!==200)return auth;const member=JSON.parse(auth.body);if(member.needsPasswordChange)fail(403,'PASSWORD_RESET_REQUIRED');if(write&&header(event,'x-csrf-token')!==member.csrfToken)fail(403,'CSRF_REJECTED');
   c=await connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;await verify(c,settings);await c.query('COMMIT');tx=false;
   await c.query('BEGIN');tx=true;await c.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='2000ms'; SET LOCAL DateStyle='ISO, YMD'");const token=tokenFrom(event);if(!token)fail(401,'SESSION_INVALID');
   const tokenHash=hash(token),lookup=(await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[tokenHash])).rows[0];if(!lookup)fail(401,'SESSION_INVALID');
   await c.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[lookup.account_id]);await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE',[tokenHash]);
   const ctx={actor:member.member.id,account:lookup.account_id,tokenHash,admin:false,requiredAdmin:false};await c.query("SELECT set_config('points.actor',$1,true),set_config('attendance.actor',$1,true)",[ctx.actor]);await authorize(c,ctx,event,write);
   const mutex=await c.query('SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE');if(mutex.rowCount!==1)fail(503,'POINTS_INVARIANT_RESOURCE_MISSING');await authorize(c,ctx,event,write);
   let result,status=200;
   if(write){
    await c.query('SAVEPOINT business');
    try{
     const needsAdmin=['rule.create','rule.status','catalogue.create','catalogue.status','order.process','award.reverse'].includes(body.op);if(needsAdmin&&!ctx.admin)fail(403,'ADMIN_REQUIRED');ctx.requiredAdmin=needsAdmin;
     const canonical=Object.fromEntries(Object.keys(body).sort().filter(k=>k!=='requestId').map(k=>[k,typeof body[k]==='string'&&/Id$/.test(k)?body[k].toLowerCase():body[k]])),requestHash=hash(JSON.stringify(canonical));
     const prior=(await c.query('SELECT request_hash,response FROM points_lab.requests WHERE actor_id=$1 AND request_id=$2',[ctx.actor,body.requestId])).rows[0];
     if(prior){if(!crypto.timingSafeEqual(prior.request_hash,requestHash))fail(409,'REQUEST_CONFLICT');result={...prior.response,replayed:true};}
     else{result=await store.mutate(c,ctx,body);await c.query('INSERT INTO points_lab.requests(actor_id,request_id,request_hash,response) VALUES($1,$2,$3,$4)',[ctx.actor,body.requestId,requestHash,result]);}
     await c.query('RELEASE SAVEPOINT business');
    }catch(e){
     if(!(e instanceof PointsError)||![400,403,409].includes(e.status))throw e;await c.query('ROLLBACK TO SAVEPOINT business');status=e.status;result={error:'本机合成积分操作未获允许。',code:e.code};
     let eventId=null;try{if(body.eventId!==undefined)eventId=uuid(body.eventId);}catch{}await c.query('INSERT INTO points_lab.audit(actor_id,request_id,code,event_id) VALUES($1,$2,$3,$4)',[ctx.actor,body.requestId,e.code,eventId]);
    }
   }else result=await store.state(c,ctx,query);
   // Finish all deferred financial checks before the final live authorization.
   await c.query('SET CONSTRAINTS ALL IMMEDIATE');await authorize(c,ctx,event,write);await c.query('COMMIT');tx=false;return output(status,{...result,...(!write&&query.view==='board'?{}:{memberId:ctx.actor}),syntheticOnly:true});
  }catch(e){if(tx)await c.query('ROLLBACK').catch(()=>{});return output(e instanceof PointsError?e.status:503,{error:'本机合成积分服务不可用或请求未获允许。',code:e instanceof PointsError?e.code:'POINTS_UNAVAILABLE'});}
  finally{await c?.end().catch(()=>{});}
 };
}
module.exports={createPointsHandler};
