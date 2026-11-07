// Only a fresh loopback cluster. No DSN, .env, cloud API or real members.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {freshCommunity}=require('../community-local/database.cjs');
const {createCommunityHandler}=require('../community-local/handler.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
test('trusted local community operations on actual PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');
 const db=await freshCommunity(args[1]);
 const member=createMemberHandler({settings:db.settings,connect:db.connect,env:{}});
 const handler=createCommunityHandler({settings:db.settings,identity:member,connect:db.connectBusiness,env:{}});
 const origin=db.settings.origin;
 async function admin(work){const c=await db.admin();try{return await work(c);}finally{await c.end();}}
 t.beforeEach(async()=>{await admin(c=>c.query('TRUNCATE b2_lab.member_session_limits_v2,community_lab.rate_limits'));});
 async function call(body,session,method='POST',query={}){
  const r=await handler({httpMethod:method,headers:{...(method==='POST'?{origin,'content-type':'application/json'}:{}),...(session?{cookie:session.cookie,'x-csrf-token':session.csrf}:{} )},body:method==='POST'?JSON.stringify(body):'',queryStringParameters:query});
  return {status:r.statusCode,body:JSON.parse(r.body),headers:r.headers};
 }
 async function login(a){const r=await member({httpMethod:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'login',account:a.account,password:a.password})});assert.equal(r.statusCode,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:JSON.parse(r.body).csrfToken};}
 try{
  await t.test('a member creates a server-owned message; retries do not create another; pending content is private',async()=>{
   const s=await login(db.accounts.normal),requestId=crypto.randomUUID();
   const body={op:'message.create',requestId,content:'本机合成留言',category:'闲聊',color:'#2360f5'};
   const one=await call(body,s);assert.equal(one.status,200);assert.equal(one.body.item.name,db.accounts.normal.nickname);
   assert.equal(one.body.item.status,'submitted');assert.equal(one.body.item.ownership,'verified');
   const again=await call(body,s);assert.equal(again.status,200);assert.equal(again.body.item.id,one.body.item.id);
   const publicFeed=await call({},null,'GET',{kind:'message',scope:'public'});assert.equal(publicFeed.status,200);assert(!publicFeed.body.items.some(x=>x.id===one.body.item.id));
   const mine=await call({},s,'GET',{kind:'message',scope:'mine'});assert.equal(mine.body.items.filter(x=>x.id===one.body.item.id).length,1);
  });
  await t.test('message review, ownership, pin and deletion use trusted roles; historical content is never claimed',async()=>{
   const a=await login(db.accounts.normal),b=await login(db.accounts.same),reviewer=await login(db.accounts.reviewer),admin=await login(db.accounts.admin);
   const write=(op,s,data={})=>call({op,requestId:crypto.randomUUID(),...data},s);
   let r=await write('message.create',a,{content:'等待审核的留言'});assert.equal(r.status,200);let item=r.body.item;
   assert.equal((await write('item.edit',b,{id:item.id,version:1,content:'昵称相同不能修改'})).status,404);
   assert.equal((await write('item.review',a,{id:item.id,version:1,decision:'approve'})).status,403);
   r=await write('item.edit',a,{id:item.id,version:1,content:'作者修订',category:'提醒',color:'#2360f5'});assert.equal(r.status,200);item=r.body.item;
   r=await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'});assert.equal(r.status,200);item=r.body.item;
   assert.equal(item.status,'published');assert((await call({},null,'GET',{kind:'message',scope:'public'})).body.items.some(x=>x.id===item.id));
   assert.equal((await write('item.pin',a,{id:item.id,version:item.version,pinned:true})).status,403);
   assert.equal((await write('item.pin',reviewer,{id:item.id,version:item.version,pinned:true})).status,403);
   r=await write('item.pin',admin,{id:item.id,version:item.version,pinned:true});assert.equal(r.status,200);item=r.body.item;assert.equal(item.isPinned,true);
   assert.equal((await write('item.delete',b,{id:item.id,version:item.version})).status,403);
   r=await write('item.delete',a,{id:item.id,version:item.version});assert.equal(r.status,200);
   assert(!(await call({},null,'GET',{kind:'message',scope:'public'})).body.items.some(x=>x.id===item.id));
   const legacy=(await call({},null,'GET',{kind:'message',scope:'public'})).body.items.find(x=>x.ownership==='unverified-legacy');assert(legacy);
   assert.equal((await write('item.edit',a,{id:legacy.id,version:legacy.version,content:'不能认领'})).status,403);
   assert.equal((await write('item.delete',admin,{id:legacy.id,version:legacy.version})).status,403);
  });
  await t.test('guide drafts, submission, rejection, revision and publication preserve the legacy content contract',async()=>{
   const a=await login(db.accounts.normal),b=await login(db.accounts.same),reviewer=await login(db.accounts.reviewer);
   const write=(op,s,data={})=>call({op,requestId:crypto.randomUUID(),...data},s);
   const content={title:'合成PVE攻略',content:'## 本机合成正文',category:'PVE',difficulty:3,tags:['合成'],imageUrl:'/fixtures/community-cover.jpg',mediaFiles:[{id:'local-video',type:'video',url:'/fixtures/community-demo.mp4',thumbnail:'/fixtures/community-cover.jpg',title:'合成视频',duration:'00:01',playbackMode:'embed'}]};
   let r=await write('guide.create',a,content);assert.equal(r.status,200);let item=r.body.item;assert.equal(item.status,'draft');assert.equal(item.author,db.accounts.normal.nickname);
   assert.equal((await call({},b,'GET',{kind:'guide',scope:'mine'})).body.items.some(x=>x.id===item.id),false);
   assert.equal((await write('item.submit',b,{id:item.id,version:item.version})).status,404);
   assert.equal((await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'})).status,404);
   r=await write('item.submit',a,{id:item.id,version:item.version});assert.equal(r.status,200);item=r.body.item;
   r=await write('item.review',reviewer,{id:item.id,version:item.version,decision:'reject'});assert.equal(r.status,200);item=r.body.item;assert.equal(item.status,'rejected');
   r=await write('item.edit',a,{id:item.id,version:item.version,...content,title:'修订合成攻略'});assert.equal(r.status,200);item=r.body.item;assert.equal(item.status,'draft');
   r=await write('item.submit',a,{id:item.id,version:item.version});item=r.body.item;
   r=await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'});assert.equal(r.status,200);item=r.body.item;
   const published=(await call({},null,'GET',{kind:'guide',scope:'public'})).body.items.find(x=>x.id===item.id);assert(published);assert.equal(published.category,'PVE');assert.equal(published.difficulty,3);assert.deepEqual(published.mediaFiles,content.mediaFiles);assert.equal(published.imageUrl,content.imageUrl);
   r=await write('item.edit',a,{id:item.id,version:item.version,...content});assert.equal(r.status,200);assert.equal(r.body.item.status,'draft');
   assert(!(await call({},null,'GET',{kind:'guide',scope:'public'})).body.items.some(x=>x.id===item.id));
  });
  await t.test('published messages and guides allow owned replies and idempotent set-style interactions',async()=>{
   const a=await login(db.accounts.normal),b=await login(db.accounts.same),reviewer=await login(db.accounts.reviewer),admin=await login(db.accounts.admin);
   const write=(op,s,data={})=>call({op,requestId:crypto.randomUUID(),...data},s);
   for(const kind of ['message','guide']){
    let item=(await write(kind+'.create',a,kind==='message'?{content:'互动合成留言'}:{title:'互动合成攻略',content:'正文',category:'PVP',difficulty:2,tags:[],mediaFiles:[]})).body.item;
    assert.equal((await write('reply.create',b,{id:item.id,content:'不能评论待审核内容'})).status,404);
    if(kind==='guide')item=(await write('item.submit',a,{id:item.id,version:item.version})).body.item;
    item=(await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'})).body.item;
    let reply=await write('reply.create',b,{id:item.id,content:'同昵称另一成员的可信回复'});assert.equal(reply.status,200);const replyId=reply.body.replyId;
    assert.equal((await write('reply.delete',a,{id:item.id,replyId})).status,403);
    assert.equal((await write('reply.delete',b,{id:item.id,replyId})).status,200);
    reply=await write('reply.create',b,{id:item.id,content:'管理员可删除的合成回复'});assert.equal((await write('reply.delete',admin,{id:item.id,replyId:reply.body.replyId})).status,200);
    const reaction={op:'reaction.set',requestId:crypto.randomUUID(),id:item.id,type:'like',active:true};
    const duplicates=await Promise.all([call(reaction,b),call(reaction,b)]);assert(duplicates.every(r=>r.status===200));
    const projection=(await call({},null,'GET',{kind,scope:'public'})).body.items.find(x=>x.id===item.id);
    assert.equal(kind==='message'?projection.reactions.find(x=>x.type==='like').count:projection.likeCount,1);
    assert.equal((await write('reaction.set',b,{id:item.id,type:'like',active:true})).status,200);
    assert.equal((await write('reaction.set',b,{id:item.id,type:'like',active:false})).status,200);
    if(kind==='guide')assert.equal((await write('reaction.set',b,{id:item.id,type:'favorite',active:true})).status,200);
   }
  });
  await t.test('concurrent versions, duplicate requests and injected transaction failures do not partially write',async()=>{
   const a=await login(db.accounts.normal),write=(op,data={})=>call({op,requestId:crypto.randomUUID(),...data},a);
   const item=(await write('message.create',{content:'并发修改合成留言'})).body.item;
   const edits=await Promise.all(['版本甲','版本乙'].map(content=>write('item.edit',{id:item.id,version:item.version,content})));
   assert.deepEqual(edits.map(x=>x.status).sort(),[200,409]);
   const key=crypto.randomUUID(),body={op:'message.create',requestId:key,content:'整体回滚合成留言'};
   const faulty=createCommunityHandler({settings:db.settings,identity:member,env:{},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.startsWith('INSERT INTO community_lab.audit'))throw Error('PRIVATE_FAULT_MARKER');return query(sql,...values);};return c;}});
   const response=await faulty({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:a.cookie,'x-csrf-token':a.csrf},body:JSON.stringify(body)});
   assert.equal(response.statusCode,503);assert(!response.body.includes('PRIVATE_'));assert(!response.body.includes(db.settings.password));
   assert(!(await call({},a,'GET',{kind:'message',scope:'mine'})).body.items.some(x=>x.content===body.content));
   const retry=await call(body,a);assert.equal(retry.status,200);
   assert.equal((await call({...body,content:'相同请求号不同内容'},a)).status,409);
   assert.equal((await call({},a,'GET',{kind:'message',scope:'mine'})).body.items.filter(x=>x.content===body.content).length,1);
  });
  await t.test('interaction and unpublishing serialize without a partially visible reply',async()=>{
   const a=await login(db.accounts.normal),b=await login(db.accounts.same),reviewer=await login(db.accounts.reviewer);
   const write=(op,s,data={})=>call({op,requestId:crypto.randomUUID(),...data},s);
   let item=(await write('message.create',a,{content:'回复与撤下并发'})).body.item;
   item=(await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'})).body.item;
   let entered,release;const reached=new Promise(resolve=>{entered=resolve;}),held=new Promise(resolve=>{release=resolve;});
   const paused=createCommunityHandler({settings:db.settings,identity:member,env:{},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=async(sql,...values)=>{if(sql.startsWith('INSERT INTO community_lab.replies')){entered();await held;}return query(sql,...values);};return c;}});
   const reply=paused({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:b.cookie,'x-csrf-token':b.csrf},body:JSON.stringify({op:'reply.create',requestId:crypto.randomUUID(),id:item.id,content:'串行合成回复'})});
   await reached;
   let removalEntered;const deletionReached=new Promise(resolve=>{removalEntered=resolve;});
   const deleting=createCommunityHandler({settings:db.settings,identity:member,env:{},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql==='SELECT pg_advisory_xact_lock(hashtextextended($1,73))')removalEntered();return query(sql,...values);};return c;}});
   const removal=deleting({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:a.cookie,'x-csrf-token':a.csrf},body:JSON.stringify({op:'item.delete',requestId:crypto.randomUUID(),id:item.id,version:item.version})});
   let completedEarly;
   try{await deletionReached;completedEarly=await Promise.race([removal.then(()=>true),new Promise(resolve=>{setTimeout(()=>resolve(false),150);})]);}
   finally{release();}
   const [replyResult,removed]=await Promise.all([reply,removal]);
   assert.equal(completedEarly,false,'Unpublishing at its update lock must wait for the in-flight interaction');
   assert.equal(replyResult.statusCode,200);assert.equal(removed.statusCode,200);
   assert(!(await call({},null,'GET',{kind:'message',scope:'public'})).body.items.some(x=>x.id===item.id));
  });
  await t.test('invalid identity, forced reset, logout, expiry, locks and deactivation refuse every new write',async()=>{
   const body=()=>({op:'message.create',requestId:crypto.randomUUID(),content:'必须认证的合成留言'});
   assert.equal((await call(body())).status,401);
   const first=await login(db.accounts.first);assert.equal((await call(body(),first)).status,403);
   for(const [enable,disable]of [
    [c=>c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.same.accountId]),c=>c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=false WHERE id=$1',[db.accounts.same.accountId])],
    [c=>c.query('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',[db.accounts.same.employeeNo]),c=>c.query('UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no=$1',[db.accounts.same.employeeNo])],
    [c=>c.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=now() WHERE account_id=$1',[db.accounts.same.accountId]),c=>c.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=NULL WHERE account_id=$1',[db.accounts.same.accountId])]
   ]){const s=await login(db.accounts.same);await admin(enable);assert.equal((await call(body(),s)).status,401);await admin(disable);assert.equal((await call(body(),s)).status,401);}
   for(const kind of ['absolute','idle']){
    const s=await login(db.accounts.same),digest=crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest();
    await admin(c=>c.query(kind==='absolute'?"UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '8 days',expires_at=now()-interval '1 second',idle_expires_at=now()-interval '2 seconds' WHERE token_hash=$1":"UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '2 hours',idle_expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest]));
    assert.equal((await call(body(),s)).status,401);
   }
   const s=await login(db.accounts.same);const exited=await member({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify({op:'logout'})});assert.equal(exited.statusCode,200);assert.equal((await call(body(),s)).status,401);
  });
  await t.test('logout, a lock and expiry between identity lookup and business transaction still refuse the write',async()=>{
   for(const change of ['logout','lock','expiry']){
    const s=await login(db.accounts.same),requestId=crypto.randomUUID();
    const raced=createCommunityHandler({settings:db.settings,env:{},connect:db.connectBusiness,identity:async event=>{
     const verified=await member(event);assert.equal(verified.statusCode,200);
     if(change==='logout')assert.equal((await member({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify({op:'logout'})})).statusCode,200);
     else if(change==='lock')await admin(c=>c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.same.accountId]));
     else await admin(c=>c.query("UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '2 hours',idle_expires_at=now()-interval '1 second' WHERE token_hash=$1",[crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest()]));
     return verified;
    }});
    try{
     const refused=await raced({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify({op:'message.create',requestId,content:'身份核验后撤销的合成请求'})});
     assert.equal(refused.statusCode,401);
     assert.equal((await admin(c=>c.query('SELECT count(*)::int AS n FROM community_lab.requests WHERE request_id=$1',[requestId]))).rows[0].n,0);
    }finally{if(change==='lock')await admin(c=>c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=false WHERE id=$1',[db.accounts.same.accountId]));}
   }
  });
  await t.test('untrusted author flags, malformed text and media references never enter content storage',async()=>{
   const a=await login(db.accounts.normal),write=data=>call({op:'message.create',requestId:crypto.randomUUID(),content:'合成内容',...data},a);
   for(const data of [{author:'伪造作者'},{memberId:db.accounts.same.memberId},{isAdmin:true},{password:'old-admin-password'}])assert.equal((await write(data)).status,403);
   for(const content of ['', 'x'.repeat(1001),'<script>alert(1)</script>','<img src=x onerror=alert(1)>','bad\u0000value'])assert.equal((await write({content})).status,400);
   for(const url of ['javascript:alert(1)','data:image/svg+xml,x','//attacker.invalid/x','https://attacker.invalid/x.jpg','/fixtures/../private','/fixtures/community-cover.jpg?x=1']){
    assert.equal((await write({imageUrl:url})).status,400);
    const r=await call({op:'guide.create',requestId:crypto.randomUUID(),title:'合成攻略',content:'正文',category:'PVE',difficulty:1,tags:[],mediaFiles:[{id:'bad',type:'image',url,title:'不可信引用'}]},a);assert.equal(r.status,400);
   }
   const badCsrf=await handler({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:a.cookie,'x-csrf-token':'forged'},body:JSON.stringify({op:'message.create',requestId:crypto.randomUUID(),content:'不能写入'})});assert.equal(badCsrf.statusCode,403);
  });
  await t.test('the actual business role cannot grant authority, read password hashes or forge ownership/audit',async()=>{
   const c=await db.connectBusiness();
   try{
    for(const sql of ['CREATE TABLE public.forbidden(id int)','CREATE TEMP TABLE forbidden(id int)','SET ROLE jinxi_community_owner','SELECT password_hash FROM b2_lab.guild_member_accounts',"UPDATE b2_lab.guild_member_accounts SET is_locked=false","INSERT INTO community_lab.member_roles VALUES('00000000-0000-4000-8000-000000000099','admin')"]){await c.query('BEGIN');try{await assert.rejects(c.query(sql),e=>e.code==='42501');}finally{await c.query('ROLLBACK');}}
    await c.query('BEGIN');try{
     await c.query("SELECT set_config('community.actor',$1,true)",[db.accounts.normal.memberId]);
     await assert.rejects(c.query('INSERT INTO community_lab.audit(actor_id,operation,item_id) VALUES($1,$2,$3)',[db.accounts.same.memberId,'forged',crypto.randomUUID()]),e=>e.code==='42501');
    }finally{await c.query('ROLLBACK');}
   }finally{await c.end();}
   const s=await login(db.accounts.normal);await admin(c=>c.query('GRANT UPDATE(is_locked) ON b2_lab.guild_member_accounts TO jinxi_community_app'));
   try{const r=await call({op:'message.create',requestId:crypto.randomUUID(),content:'权限漂移应关闭'},s);assert.equal(r.status,503);assert(!JSON.stringify(r.body).includes('is_locked'));}
   finally{await admin(c=>c.query('REVOKE UPDATE(is_locked) ON b2_lab.guild_member_accounts FROM jinxi_community_app'));}
  });
  await t.test('database policies also forbid staff self-review and changing somebody else\'s body',async()=>{
   const reviewer=await login(db.accounts.reviewer),a=await login(db.accounts.normal);
   const create=async s=>(await call({op:'message.create',requestId:crypto.randomUUID(),content:'数据库审核约束合成内容'},s)).body.item;
   const own=await create(reviewer),other=await create(a);
   for(const [id,sql]of [[own.id,"UPDATE community_lab.items SET status='published',version=version+1 WHERE id=$1"],[other.id,"UPDATE community_lab.items SET payload='{}',version=version+1 WHERE id=$1"]]){
    const c=await db.connectBusiness();try{await c.query('BEGIN');await c.query("SELECT set_config('community.actor',$1,true)",[db.accounts.reviewer.memberId]);await assert.rejects(c.query(sql,[id]),e=>['42501','P0001'].includes(e.code));}finally{await c.query('ROLLBACK');await c.end();}
   }
  });
  await t.test('every role leaves legacy content and all its interaction rows read-only',async()=>{
   for(const contentKind of ['message','guide']){
    const legacy=(await call({},null,'GET',{kind:contentKind,scope:'public'})).body.items.find(x=>x.ownership==='unverified-legacy');
    for(const kind of ['normal','reviewer','admin']){
     const s=await login(db.accounts[kind]);
     for(const data of [{op:'reply.create',content:'不能回复历史样本'},{op:'reaction.set',type:'like',active:true},...(contentKind==='guide'?[{op:'reaction.set',type:'favorite',active:true}]:[])])assert.equal((await call({requestId:crypto.randomUUID(),id:legacy.id,...data},s)).status,403);
    }
    const unchanged=(await call({},null,'GET',{kind:contentKind,scope:'public'})).body.items.find(x=>x.id===legacy.id);assert.deepEqual(unchanged,legacy);
    for(const sql of ['INSERT INTO community_lab.replies(item_id,author_id,author_label,content) VALUES($1,$2,\'合成管理员\',\'不得写历史内容\')','INSERT INTO community_lab.reactions(item_id,member_id,type,active) VALUES($1,$2,\'like\',true)']){
     const c=await db.connectBusiness();try{await c.query('BEGIN');await c.query("SELECT set_config('community.actor',$1,true)",[db.accounts.admin.memberId]);await assert.rejects(c.query(sql,[legacy.id,db.accounts.admin.memberId]),e=>e.code==='42501');}finally{await c.query('ROLLBACK');await c.end();}
    }
   }
  });
 }finally{await db.stop();}
});
