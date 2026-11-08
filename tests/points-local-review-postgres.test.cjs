const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{setup,signal}=require('./points-local-support.cjs');
test('points transaction failure and revocation review on actual synthetic PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');const p=await setup(args[1]),{db}=p,original=await db.financialSnapshot();t.beforeEach(p.reset);
 const body=eventId=>({op:'settle',eventId,requestId:crypto.randomUUID()});
 async function zero(){assert.deepEqual((await p.admin('SELECT (SELECT count(*)::int FROM points_lab.ledger) AS ledger,(SELECT count(*)::int FROM points_lab.accounts) AS accounts,(SELECT count(*)::int FROM points_lab.settlements) AS settlements,(SELECT count(*)::int FROM points_lab.requests) AS requests')).rows[0],{ledger:0,accounts:0,settlements:0,requests:0});}
 function faulty(prefix){return p.make({connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=(sql,...values)=>sql.startsWith(prefix)?query('SELECT 1/0'):query(sql,...values);return c;}});}
 try{
  await t.test('real SQL errors at ledger, settlement or request receipt leave no partial credit and permit exact retry',async()=>{
   for(const at of ['INSERT INTO points_lab.ledger','INSERT INTO points_lab.settlements','INSERT INTO points_lab.requests']){
    await p.reset();const s=await p.login(),eventId=await p.checkin(s),request=body(eventId),before=await p.snapshot(),r=await p.call(s,request,{},faulty(at));assert.equal(r.status,503);for(const secret of [s.cookie,s.csrf,db.settings.password,'division by zero','points_lab'])assert(!JSON.stringify(r.body).includes(secret));assert.deepEqual(await p.snapshot(),before);assert.equal((await p.call(s,request)).status,200);assert.equal((await p.call(s,request)).body.replayed,true);assert.equal((await p.call(s)).body.account.balance,'1');
   }
  });
  await t.test('real SQL errors after debit, inventory or status changes roll back the entire order or refund',async()=>{
   const s=await p.login();await p.fund(s);
   for(const at of ['INSERT INTO points_lab.inventory','UPDATE points_lab.catalogue','INSERT INTO points_lab.requests']){
    const request={op:'redeem',itemId:db.fixtures.itemId,quantity:1,requestId:crypto.randomUUID()},before=await p.snapshot();assert.equal((await p.call(s,request,{},faulty(at))).status,503);assert.deepEqual(await p.snapshot(),before);
   }
   const created=await p.op(s,{op:'redeem',itemId:db.fixtures.itemId,quantity:1});assert.equal(created.status,200);const request={op:'order.cancel',orderId:created.body.orderId,requestId:crypto.randomUUID()},before=await p.snapshot();assert.equal((await p.call(s,request,{},faulty('INSERT INTO points_lab.ledger'))).status,503);assert.deepEqual(await p.snapshot(),before);assert.equal((await p.call(s,request)).status,200);assert.equal((await p.call(s,request)).body.replayed,true);assert.equal((await p.call(s)).body.account.balance,'4');
  });
  await t.test('logout and actual password change after identity preflight invalidate the financial request',async()=>{
   for(const mode of ['logout','password']){
    const s=await p.login(),eventId=await p.checkin(s);const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);const next=crypto.randomBytes(20).toString('hex')+'A9!';const ended=await p.identity(p.event(s,mode==='logout'?{op:'logout'}:{op:'change-password',currentPassword:db.accounts.normal.password,newPassword:next}));assert.equal(ended.statusCode,200);if(mode==='password')db.accounts.normal.password=next;return r;}});
    assert.equal((await p.call(s,body(eventId),{},h)).status,401);await zero();
   }
  });
  await t.test('account-lock wait rechecks lock, activity, security version, revocation, expiry and first-reset state',async()=>{
   for(const mode of ['lock','profile','disabled','version','revoked','expiry','first-reset']){
    const s=await p.login(),eventId=await p.checkin(s),block=await db.admin(),barrier=signal();let pending;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);await block.query('BEGIN');await block.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[db.accounts.normal.accountId]);return r;},connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes('guild_member_accounts')&&sql.includes('FOR UPDATE'))barrier.enter();return query(sql,...values);};return c;}});
    try{
     pending=p.call(s,body(eventId),{},h);await barrier.wait();
     if(mode==='lock')await block.query('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.normal.accountId]);
     if(mode==='profile')await block.query('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',[db.accounts.normal.employeeNo]);
     if(mode==='disabled')await block.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=clock_timestamp() WHERE account_id=$1',[db.accounts.normal.accountId]);
     if(mode==='version')await block.query('UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id=$1',[db.accounts.normal.accountId]);
     if(mode==='revoked')await block.query('UPDATE b2_lab.member_sessions_v2 SET revoked_at=clock_timestamp() WHERE token_hash=$1',[p.tokenHash(s)]);
     if(mode==='first-reset')await block.query('UPDATE b2_lab.guild_member_accounts SET force_reset_password=true WHERE id=$1',[db.accounts.normal.accountId]);
     if(mode==='expiry'){await block.query("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '300 milliseconds' WHERE token_hash=$1",[p.tokenHash(s)]);await block.query('SELECT pg_sleep(0.5)');}
     await block.query('COMMIT');assert.equal((await pending).status,mode==='first-reset'?403:401,mode);await zero();
    }finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();await p.admin(async c=>{await c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=false,force_reset_password=false WHERE id=$1',[db.accounts.normal.accountId]);await c.query('UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no=$1',[db.accounts.normal.employeeNo]);await c.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=NULL WHERE account_id=$1',[db.accounts.normal.accountId]);});}
   }
  });
  await t.test('session-row and global business-lock waits reject actual deadlines and post-lock auth version changes',async()=>{
   for(const mode of ['session','mutex-expiry','mutex-version']){
    const s=await p.login(),eventId=await p.checkin(s),block=await db.admin(),barrier=signal();let pending;
    const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);if(mode!=='mutex-version')await p.admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '900 milliseconds' WHERE token_hash=$1",[p.tokenHash(s)]);await block.query('BEGIN');await block.query(mode==='session'?'SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE':'SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE',mode==='session'?[p.tokenHash(s)]:[]);return r;},connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes(mode==='session'?'member_sessions_v2':'points_lab.mutex')&&sql.includes('FOR UPDATE'))barrier.enter();return query(sql,...values);};return c;}});
    try{pending=p.call(s,body(eventId),{},h);await barrier.wait();if(mode==='mutex-version')await block.query('UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id=$1',[db.accounts.normal.accountId]);else await block.query('SELECT pg_sleep(1.1)');await block.query('COMMIT');assert.equal((await pending).status,401,mode);await zero();}
    finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();}
   }
  });
  await t.test('expiry during slow business SQL rolls back awards before commit',async()=>{
   const s=await p.login(),eventId=await p.checkin(s);const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);await p.admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '900 milliseconds' WHERE token_hash=$1",[p.tokenHash(s)]);return r;},connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=async(sql,...values)=>{if(sql.startsWith('INSERT INTO points_lab.settlements'))await query('SELECT pg_sleep(1.1)');return query(sql,...values);};return c;}});assert.equal((await p.call(s,body(eventId),{},h)).status,401);await zero();
  });
  await t.test('administrator revocation is enforced after business lock waits, before commit and on cached requests',async()=>{
   const a=await p.login('admin'),request={op:'rule.status',ruleId:db.fixtures.ruleId,status:'disabled',requestId:crypto.randomUUID()};assert.equal((await p.call(a,request)).status,200);
   await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.admin.memberId]);try{assert.equal((await p.call(a,request)).status,403);}finally{await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.admin.memberId]);}
   await p.op(a,{op:'rule.status',ruleId:db.fixtures.ruleId,status:'enabled'});
   const block=await db.admin(),barrier=signal();let pending;
   const waited=p.make({identity:async e=>{const r=await p.identity(e);await block.query('BEGIN');await block.query('SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE');return r;},connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes('points_lab.mutex')&&sql.includes('FOR UPDATE'))barrier.enter();return query(sql,...values);};return c;}});
   try{pending=p.call(a,{...request,requestId:crypto.randomUUID()},{},waited);await barrier.wait();await block.query('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.admin.memberId]);await block.query('COMMIT');assert.equal((await pending).status,403);assert.equal((await p.admin('SELECT status FROM points_lab.rules WHERE id=$1',[db.fixtures.ruleId])).rows[0].status,'enabled');}
   finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin') ON CONFLICT DO NOTHING",[db.accounts.admin.memberId]);}
   let removed=false;const delayed=p.make({connect:async()=>{const c=await db.connectPoints(),query=c.query.bind(c);c.query=async(sql,...values)=>{const r=await query(sql,...values);if(sql.startsWith('UPDATE points_lab.rules')&&!removed){removed=true;await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.admin.memberId]);}return r;};return c;}});
   try{assert.equal((await p.call(a,{...request,requestId:crypto.randomUUID()},{},delayed)).status,403);assert.equal((await p.admin('SELECT status FROM points_lab.rules WHERE id=$1',[db.fixtures.ruleId])).rows[0].status,'enabled');}finally{await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin') ON CONFLICT DO NOTHING",[db.accounts.admin.memberId]);}
  });
  await t.test('malformed amounts, product conditions, raw stock changes and grant/trigger drift fail safely',async()=>{
   const s=await p.login(),a=await p.login('admin'),eventId=await p.checkin(s);assert.equal((await p.op(s,{op:'settle',eventId})).status,200);
   const item={op:'catalogue.create',name:'纯合成纸鹤',unitCost:1,stock:1,perMemberLimit:1,minEarned:5,startsAt:'2024-01-01T00:00:00.000Z',endsAt:'2024-03-02T00:00:00.000Z',status:'enabled'};assert.equal((await p.op(s,item)).status,403);const created=await p.op(a,item);assert.equal(created.status,200);assert.equal((await p.op(s,{op:'redeem',itemId:created.body.itemId,quantity:1})).body.code,'ITEM_CONDITION');
   await db.setClock('2024-03-02T04:00:00.000Z');assert.equal((await p.op(s,{op:'redeem',itemId:created.body.itemId,quantity:1})).body.code,'ITEM_NOT_AVAILABLE');
   for(const amount of [-1,0,1.5,1e30,'999999999999999999999'])assert.equal((await p.op(a,{...item,unitCost:amount})).status,400);assert.equal((await p.op(a,{...item,name:'<img onerror=evil>'})).status,400);assert.equal((await p.op(s,{op:'redeem',itemId:db.fixtures.itemId,quantity:1,pointCost:-100})).status,403);
   for(const [bad,restore]of [['GRANT UPDATE(point_delta) ON points_lab.ledger TO jinxi_points_app','REVOKE UPDATE(point_delta) ON points_lab.ledger FROM jinxi_points_app'],['GRANT SELECT ON points_legacy.point_account TO jinxi_points_app','REVOKE SELECT ON points_legacy.point_account FROM jinxi_points_app'],['ALTER TABLE points_lab.accounts DISABLE TRIGGER account_consistent','ALTER TABLE points_lab.accounts ENABLE TRIGGER account_consistent']]){await p.admin(bad);try{const r=await p.call(s);assert.equal(r.status,503);assert(!JSON.stringify(r.body).includes('points_lab'));}finally{await p.admin(restore);}}
   assert.equal((await p.call(s)).body.account.balance,'1');
  });
  assert.deepEqual(await db.financialSnapshot(),original);
 }finally{await db.stop();}
});
