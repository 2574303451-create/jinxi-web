// Local synthetic API. No exports are registered as Netlify Functions.
const crypto=require('node:crypto');
const {localSettings,tokenFrom}=require('../member-local/identity.cjs');
const {verify}=require('./proof.cjs');
const {CommunityError,fail,uuid,canonical}=require('./policy.cjs');
const {role,project,mutate}=require('./store.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest();
const header=(e,key)=>Object.entries(e.headers||{}).find(([k])=>k.toLowerCase()===key)?.[1]||'';
const fields={'message.create':['content','category','color','imageUrl'],'guide.create':['title','content','category','difficulty','tags','imageUrl','mediaFiles'],'item.edit':['id','version','content','category','color','imageUrl','title','difficulty','tags','mediaFiles'],'item.submit':['id','version'],'item.archive':['id','version'],'item.review':['id','version','decision'],'item.pin':['id','version','pinned'],'item.delete':['id','version']};
fields['reply.create']=['id','content'];fields['reply.delete']=['id','replyId'];fields['reaction.set']=['id','type','active'];
function output(status,body){return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)};}
function createCommunityHandler({settings,identity,connect,env=process.env}){
 return async event=>{
  let c,tx=false;
  try{
   localSettings(settings,env);
   const method=event.httpMethod,query=event.queryStringParameters||{};
   if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED');
   if(header(event,'sec-fetch-site')==='cross-site'||header(event,'origin')&&header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REJECTED');
   let body={};
   if(method==='POST'){
    if(header(event,'origin')!==settings.origin)fail(403,'ORIGIN_REQUIRED');
    if(!/^application\/json(?:;|$)/i.test(header(event,'content-type')))fail(415,'JSON_REQUIRED');
    if(event.isBase64Encoded||typeof event.body!=='string'||Buffer.byteLength(event.body)>40000)fail(413,'BODY_REJECTED');
    try{body=JSON.parse(event.body);}catch{fail(400,'INVALID_JSON');}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(query).length)fail(400,'INVALID_BODY');
    if(!Object.hasOwn(fields,body.op))fail(400,'OPERATION_NOT_ENABLED');
    if(Object.keys(body).some(k=>!['op','requestId',...fields[body.op]].includes(k)))fail(403,'CLIENT_AUTHORITY_REJECTED');
    if(!uuid(body.requestId))fail(400,'REQUEST_ID_REQUIRED');
   }else if(Object.keys(query).some(k=>!['kind','scope','id'].includes(k))||!['message','guide'].includes(query.kind)||!['public','mine','review'].includes(query.scope||'public'))fail(400,'INVALID_QUERY');
   let member=null;
   const authenticated=method==='POST'||query.scope==='mine'||query.scope==='review';
   if(authenticated){
    const r=await identity({httpMethod:'GET',headers:event.headers,queryStringParameters:{op:'me'}});
    if(r.statusCode!==200)return r;
    member=JSON.parse(r.body);
    if(member.needsPasswordChange)fail(403,'PASSWORD_RESET_REQUIRED');
    if(method==='POST'&&header(event,'x-csrf-token')!==member.csrfToken)fail(403,'CSRF_REJECTED');
   }
   c=await connect();
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;await verify(c,settings);await c.query('COMMIT');tx=false;
   await c.query('BEGIN');tx=true;await c.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='2000ms'");
   if(member){
    const token=tokenFrom(event);if(!token)fail(401,'SESSION_INVALID');
    const lookup=(await c.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(token)])).rows[0];if(!lookup)fail(401,'SESSION_INVALID');
    const a=(await c.query('SELECT a.id,a.is_locked,a.force_reset_password,p.is_active,p.nickname,s.member_id,s.auth_version,s.disabled_at FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) JOIN b2_lab.member_account_security_v2 s ON s.account_id=a.id WHERE a.id=$1 FOR UPDATE OF a',[lookup.account_id])).rows[0];
    const s=(await c.query('SELECT account_id,csrf_hash,csrf_key_id,auth_version,revoked_at,expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE',[hash(token)])).rows[0];
    if(!a||!s||a.member_id!==member.member.id||a.is_locked||!a.is_active||a.disabled_at||s.revoked_at||!s.live||s.auth_version!==a.auth_version||s.csrf_key_id!=='local-v1')fail(401,'SESSION_INVALID');
    if(a.force_reset_password)fail(403,'PASSWORD_RESET_REQUIRED');
    if(method==='POST'&&!crypto.timingSafeEqual(hash(header(event,'x-csrf-token')),s.csrf_hash))fail(403,'CSRF_REJECTED');
    member.member.displayName=a.nickname;
    await c.query("SELECT set_config('community.actor',$1,true)",[a.member_id]);
   }
   let response;
   if(method==='GET'){
    const scope=query.scope||'public';
    if(scope==='review'&&!['reviewer','admin'].includes(await role(c)))fail(403,'REVIEWER_REQUIRED');
    const rows=(await c.query('SELECT * FROM community_lab.items WHERE kind=$1 AND '+(scope==='public'?"status='published'":scope==='mine'?'owner_id=$2':"status='submitted'")+' ORDER BY is_pinned DESC,created_at DESC LIMIT 100',scope==='mine'?[query.kind,member.member.id]:[query.kind])).rows;
    response={items:await Promise.all(rows.map(row=>project(c,row)))};
   }else{
    const requestHash=hash(JSON.stringify(canonical(body)));
    await c.query('INSERT INTO community_lab.requests(member_id,request_id,request_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[member.member.id,body.requestId,requestHash]);
    const prior=(await c.query('SELECT request_hash,response FROM community_lab.requests WHERE member_id=$1 AND request_id=$2 FOR UPDATE',[member.member.id,body.requestId])).rows[0];
    if(!prior.request_hash.equals(requestHash))fail(409,'REQUEST_ID_CONFLICT');
    if(prior.response)response=prior.response;
    else{
     response=await mutate(c,body,member);
     await c.query('UPDATE community_lab.requests SET response=$3 WHERE member_id=$1 AND request_id=$2',[member.member.id,body.requestId,response]);
    }
   }
   // The account/session rows remain locked, but wall-clock expiry can still
   // occur while content SQL waits or runs. A late response must not commit a
   // write, private read or replay receipt after that authorization has expired.
   if(member){
    const final=(await c.query('SELECT expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() AS live FROM b2_lab.member_sessions_v2 WHERE token_hash=$1',[hash(tokenFrom(event))])).rows[0];
    if(!final?.live)fail(401,'SESSION_INVALID');
   }
   await c.query('COMMIT');tx=false;return output(200,response);
  }catch(error){
   if(tx)await c.query('ROLLBACK').catch(()=>{});
   const known=error instanceof CommunityError,status=known?error.status:503;
   return output(status,{error:status===503?'本机合成业务暂不可用。':'请求未获允许或内容无效。',code:known?error.code:'COMMUNITY_UNAVAILABLE'});
  }finally{await c?.end().catch(()=>{});}
 };
}
module.exports={createCommunityHandler};
