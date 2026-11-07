// Independent review regressions: a fresh synthetic loopback database only.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshCommunity}=require('../community-local/database.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
const {createCommunityHandler}=require('../community-local/handler.cjs');
test('independent community concurrency and revocation regressions on PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');
 const db=await freshCommunity(args[1]),origin=db.settings.origin;
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:{}});
 const handler=createCommunityHandler({settings:db.settings,identity,connect:db.connectBusiness,env:{}});
 const event=(s,body)=>({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify(body)});
 async function login(kind){const a=db.accounts[kind],r=await identity({httpMethod:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'login',account:a.account,password:a.password})});assert.equal(r.statusCode,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:JSON.parse(r.body).csrfToken};}
 try{
  await t.test('different UUID letter case cannot split the lock for one item',async()=>{
   const a=await login('normal'),b=await login('same'),id='00000000-0000-4000-8000-0000000000ab';
   const admin=await db.admin();try{await admin.query("INSERT INTO community_lab.items(id,kind,owner_id,author_label,payload,status) VALUES($1,'message',$2,'合成作者',$3,'published')",[id,db.accounts.normal.memberId,{content:'仅本机大小写并发样本',category:'闲聊'}]);}finally{await admin.end();}
   let enter,release,removeEntered;const entered=new Promise(r=>{enter=r;}),held=new Promise(r=>{release=r;}),atRemoval=new Promise(r=>{removeEntered=r;});
   const paused=createCommunityHandler({settings:db.settings,identity,env:{},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=async(sql,...values)=>{if(sql.startsWith('INSERT INTO community_lab.replies')){enter();await held;}return query(sql,...values);};return c;}});
   const deleting=createCommunityHandler({settings:db.settings,identity,env:{},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.startsWith('SELECT pg_advisory_xact_lock('))removeEntered();return query(sql,...values);};return c;}});
   const reply=paused(event(b,{op:'reply.create',requestId:crypto.randomUUID(),id:id.toUpperCase(),content:'大写UUID的合成回复'}));
   await entered;const removal=deleting(event(a,{op:'item.delete',requestId:crypto.randomUUID(),id,version:1}));let early;
   try{await atRemoval;early=await Promise.race([removal.then(()=>true),new Promise(r=>{setTimeout(()=>r(false),150);})]);}finally{release();}
   const [one,two]=await Promise.all([reply,removal]);assert.equal(early,false,'Canonical and upper-case UUIDs must share the same content lock');assert.equal(one.statusCode,200);assert.equal(two.statusCode,200);
  });
  await t.test('expiry while waiting for the account lock is evaluated at actual validation time',async()=>{
   const s=await login('same'),admin=await db.admin(),requestId=crypto.randomUUID();let enter;const entered=new Promise(r=>{enter=r;});let pending;
   const raced=createCommunityHandler({settings:db.settings,env:{},identity:async e=>{const verified=await identity(e);assert.equal(verified.statusCode,200);await admin.query('BEGIN');await admin.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[db.accounts.same.accountId]);return verified;},connect:async()=>{const c=await db.connectBusiness(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.startsWith('SELECT a.id,a.is_locked'))enter();return query(sql,...values);};return c;}});
   try{
    pending=raced(event(s,{op:'message.create',requestId,content:'等待锁期间过期不得写入'}));await entered;
    await admin.query("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '400 milliseconds' WHERE token_hash=$1",[crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest()]);
    await admin.query('SELECT pg_sleep(0.6)');await admin.query('COMMIT');
    assert.equal((await pending).statusCode,401);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM community_lab.requests WHERE request_id=$1',[requestId])).rows[0].n,0);
   }finally{await admin.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await admin.end();}
  });
  await t.test('changing the password after identity lookup invalidates the business request and receipt',async()=>{
   const s=await login('same'),requestId=crypto.randomUUID();
   const raced=createCommunityHandler({settings:db.settings,connect:db.connectBusiness,env:{},identity:async e=>{
    const verified=await identity(e);assert.equal(verified.statusCode,200);
    const changed=await identity(event(s,{op:'change-password',currentPassword:db.accounts.same.password,newPassword:crypto.randomBytes(18).toString('base64url')+'A9!'}));assert.equal(changed.statusCode,200);return verified;
   }});
   const r=await raced(event(s,{op:'message.create',requestId,content:'改密撤销后不能写入'}));assert.equal(r.statusCode,401);
   const admin=await db.admin();try{assert.equal((await admin.query('SELECT count(*)::int AS n FROM community_lab.requests WHERE request_id=$1',[requestId])).rows[0].n,0);}finally{await admin.end();}
  });
 }finally{await db.stop();}
});
