const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{setup,signal}=require('./operations-local-support.cjs');
test('remaining operations capability revocation and transaction review on PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');const p=await setup(args[1]),{db}=p;t.beforeEach(p.reset);
 try{
  await t.test('an administrator demoted to reviewer cannot replay a cached override edit of another author draft',async()=>{
   const a=await p.login('admin'),r=await p.login('reviewer'),created=await p.op(r,p.announcement()),id=created.body.item.id,body={...p.announcement('由管理员协助编辑'),op:'announcement.edit',id,version:1,requestId:crypto.randomUUID()};assert.equal((await p.call(a,body)).status,200);await p.demote();
   try{const result=await p.call(a,body);console.log(JSON.stringify({case:'cached-admin-capability',status:result.status,peerDraftExposed:JSON.stringify(result.body).includes('由管理员协助编辑')}));assert.equal(result.status,403);assert(!JSON.stringify(result.body).includes('由管理员协助编辑'));}finally{await p.restoreAdmin();}
  });
  await t.test('a demotion after fetching all management drafts refuses the private response',async()=>{
   const a=await p.login('admin'),r=await p.login('reviewer');assert.equal((await p.op(r,p.announcement('审核员的私有草稿'))).status,200);let demoted=false;
   const h=p.make({connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=async(sql,...values)=>{const result=await query(sql,...values);if(sql.startsWith('SELECT d.*,CASE')&&!demoted){demoted=true;await p.demote();}return result;};return c;}});
   try{const result=await p.call(a,null,{kind:'announcement',view:'private'},h);console.log(JSON.stringify({case:'delayed-admin-private-read',status:result.status,peerDraftExposed:JSON.stringify(result.body).includes('审核员的私有草稿')}));assert.equal(result.status,403);assert(!JSON.stringify(result.body).includes('审核员的私有草稿'));}finally{await p.restoreAdmin();}
  });
  await t.test('a demotion after an override edit rolls back both the content and its audit revision',async()=>{
   const a=await p.login('admin'),r=await p.login('reviewer'),created=await p.op(r,p.announcement()),id=created.body.item.id,before=await p.snapshot();let demoted=false;
   const h=p.make({connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=async(sql,...values)=>{const result=await query(sql,...values);if(sql.startsWith('UPDATE operations_lab.documents SET payload')&&!demoted){demoted=true;await p.demote();}return result;};return c;}});
   try{assert.equal((await p.call(a,{...p.announcement('权限已失效不应保存'),op:'announcement.edit',id,version:1,requestId:crypto.randomUUID()},{},h)).status,403);assert.deepEqual(await p.snapshot(),before);}finally{await p.restoreAdmin();}
  });
  await t.test('denied authenticated management attempts leave an actor-bound audit without a partial document',async()=>{
   const m=await p.login();assert.equal((await p.op(m,{op:'sponsor.create',sponsor:'未授权合成',sponsorTime:'2024-03-01T04:00:00.000Z'})).status,403);assert.equal((await p.admin('SELECT count(*)::int AS n FROM operations_lab.documents')).rows[0].n,0);assert.equal((await p.admin('SELECT count(*)::int AS n FROM operations_lab.audit WHERE actor_id=$1',[db.accounts.normal.memberId])).rows[0].n,1);
  });
  await t.test('SQL errors at revision, request receipt, membership projection and team event roll back every business row; exact retry succeeds once',async()=>{
   for(const at of ['INSERT INTO operations_lab.requests','operations_lab.revisions','operations_lab.team_slots','operations_lab.team_events']){
    await p.reset();const a=await p.login('admin'),isTeam=at.includes('team_'),body={...(isTeam?{op:'team.create',name:'合成回滚队',icon:'⭐',color:'#FFD93D',slogan:'',description:'',requirements:'',maxMembers:2}:p.announcement()),requestId:crypto.randomUUID()},before=await p.snapshot();let injected=false;
    const h=p.make({connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=async(sql,...v)=>{if(at.startsWith('INSERT')&&sql.startsWith(at)){injected=true;return query('SELECT 1/0');}return query(sql,...v);};return c;}});
    if(!at.startsWith('INSERT'))await p.admin(`CREATE FUNCTION operations_lab.test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic fault'; END $$;CREATE TRIGGER synthetic_fault BEFORE INSERT ON ${at} FOR EACH ROW EXECUTE FUNCTION operations_lab.test_fault()`);
    try{const r=await p.call(a,body,{},h);assert.equal(r.status,503,at);for(const secret of [a.cookie,a.csrf,db.settings.password,'synthetic fault','division by zero','operations_lab'])assert(!JSON.stringify(r.body).includes(secret));assert.deepEqual(await p.snapshot(),before);if(at.startsWith('INSERT'))assert(injected);}finally{if(!at.startsWith('INSERT'))await p.admin(`DROP TRIGGER synthetic_fault ON ${at};DROP FUNCTION operations_lab.test_fault()`);}
    const result=await p.call(a,body);assert.equal(result.status,200);assert.equal((await p.call(a,body)).body.replayed,true);assert.equal((await p.snapshot())[isTeam?'teams':'documents'].length,1);
   }
  });
  await t.test('logout and actual password change after identity preflight invalidate pending writes and private reads',async()=>{
   for(const mode of ['logout','password']){
    const a=await p.login('admin'),before=await p.snapshot();let ended=false;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);if(!ended){ended=true;const next=crypto.randomBytes(20).toString('hex')+'A9!';assert.equal((await p.identity(p.event(a,mode==='logout'?{op:'logout'}:{op:'change-password',currentPassword:db.accounts.admin.password,newPassword:next}))).statusCode,200);if(mode==='password')db.accounts.admin.password=next;}return r;}});
    assert.equal((await p.call(a,{...p.announcement(),requestId:crypto.randomUUID()},{},h)).status,401);assert.deepEqual(await p.snapshot(),before);assert.equal((await p.call(a,null,{view:'private',kind:'announcement'})).status,401);
   }
  });
  await t.test('account-row lock wait rechecks locked, inactive, disabled, version, revoked, expired and first-password-reset states',async()=>{
   for(const mode of ['lock','profile','disabled','version','revoked','expiry','first-reset']){
    const a=await p.login('admin'),before=await p.snapshot(),block=await db.admin(),barrier=signal();let pending;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);await block.query('BEGIN');await block.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[db.accounts.admin.accountId]);return r;},connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=(sql,...v)=>{if(sql.includes('guild_member_accounts')&&sql.includes('FOR UPDATE'))barrier.enter();return query(sql,...v);};return c;}});
    try{pending=p.call(a,{...p.announcement(),requestId:crypto.randomUUID()},{},h);await barrier.wait();
     if(mode==='lock')await block.query('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.admin.accountId]);
     if(mode==='profile')await block.query('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',[db.accounts.admin.employeeNo]);
     if(mode==='disabled')await block.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=clock_timestamp() WHERE account_id=$1',[db.accounts.admin.accountId]);
     if(mode==='version')await block.query('UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id=$1',[db.accounts.admin.accountId]);
     if(mode==='revoked')await block.query('UPDATE b2_lab.member_sessions_v2 SET revoked_at=clock_timestamp() WHERE token_hash=$1',[p.tokenHash(a)]);
     if(mode==='first-reset')await block.query('UPDATE b2_lab.guild_member_accounts SET force_reset_password=true WHERE id=$1',[db.accounts.admin.accountId]);
     if(mode==='expiry'){await block.query("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '250 milliseconds' WHERE token_hash=$1",[p.tokenHash(a)]);await block.query('SELECT pg_sleep(0.4)');}
     await block.query('COMMIT');assert.equal((await pending).status,mode==='first-reset'?403:401,mode);assert.deepEqual(await p.snapshot(),before);
    }finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();await p.admin(async c=>{await c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=false,force_reset_password=false WHERE id=$1',[db.accounts.admin.accountId]);await c.query('UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no=$1',[db.accounts.admin.employeeNo]);await c.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=NULL WHERE account_id=$1',[db.accounts.admin.accountId]);});}
   }
  });
  await t.test('session and operations-lock waits recheck actual expiry and role demotion before private access',async()=>{
   for(const mode of ['session','mutex-expiry','mutex-role']){
    const a=await p.login('admin'),before=await p.snapshot(),block=await db.admin(),barrier=signal();let pending;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);if(mode!=='mutex-role')await p.admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '700 milliseconds' WHERE token_hash=$1",[p.tokenHash(a)]);await block.query('BEGIN');await block.query(mode==='session'?'SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE':'SELECT id FROM operations_lab.mutex WHERE id=1 FOR UPDATE',mode==='session'?[p.tokenHash(a)]:[]);return r;},connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=(sql,...v)=>{if(sql.includes(mode==='session'?'member_sessions_v2':'operations_lab.mutex')&&sql.includes('FOR UPDATE'))barrier.enter();return query(sql,...v);};return c;}});
    try{pending=p.call(a,{op:'sponsor.create',sponsor:'等待锁的合成记录',sponsorTime:'2024-03-01T04:00:00.000Z',requestId:crypto.randomUUID()},{},h);await barrier.wait();if(mode==='mutex-role')await block.query("UPDATE community_lab.member_roles SET role='reviewer' WHERE member_id=$1",[db.accounts.admin.memberId]);else await block.query('SELECT pg_sleep(0.9)');await block.query('COMMIT');assert.equal((await pending).status,mode==='mutex-role'?403:401,mode);assert.deepEqual(await p.snapshot(),before);}finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();await p.restoreAdmin();}
   }
  });
  await t.test('expiry during deferred validation or a delayed private query refuses all data and rolls back the draft',async()=>{
   for(const mode of ['write','read']){
    const a=await p.login('admin'),before=await p.snapshot();let slept=false;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);await p.admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '700 milliseconds' WHERE token_hash=$1",[p.tokenHash(a)]);return r;},connect:async()=>{const c=await db.connectOperations(),query=c.query.bind(c);c.query=async(sql,...v)=>{if(!slept&&sql.startsWith(mode==='write'?'SET CONSTRAINTS ALL IMMEDIATE':'SELECT d.*,CASE')){slept=true;await query('SELECT pg_sleep(0.9)');}return query(sql,...v);};return c;}});
    const r=await p.call(a,mode==='write'?{...p.announcement(),requestId:crypto.randomUUID()}:null,{...(mode==='read'?{view:'private',kind:'announcement'}:{})},h);assert.equal(r.status,401);assert(slept);assert(!JSON.stringify(r.body).includes('仅合成未公开正文'));assert.deepEqual(await p.snapshot(),before);
   }
  });
  await t.test('missing mutex and forged client authority fail closed without partial writes',async()=>{
   const a=await p.login('admin'),m=await p.login();for(const key of ['memberId','ownerId','isAdmin','user_id','publishedAt','version']){const r=await p.op(m,{op:'team.create',name:'合成伪造',icon:'⭐',color:'#FFD93D',slogan:'',description:'',requirements:'',maxMembers:2,[key]:'forged'});assert.equal(r.status,403);assert.equal(r.body.code,'CLIENT_AUTHORITY_REJECTED');}assert.equal((await p.snapshot()).teams.length,0);
   await p.admin('DELETE FROM operations_lab.mutex');try{const before=await p.snapshot();assert.equal((await p.op(a,p.announcement())).status,503);assert.deepEqual(await p.snapshot(),before);}finally{await p.admin('INSERT INTO operations_lab.mutex VALUES(1)');}
  });
 }finally{await db.stop();}
});
