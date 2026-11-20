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
  for (const winner of ['cancelled','processing']) {
   await t.test(`member cancellation and staff claim contend: ${winner} commits first`, async () => {
    const member = await p.login(), staff = await p.login('admin');
    await p.fund(member);
    const order = await p.op(member,{op:'redeem',itemId:db.fixtures.itemId,quantity:1});
    assert.equal(order.status,200);
    assert.equal(order.body.status,'pending');
    const { orderId, ledgerId: chargeId } = order.body;
    assert.equal((await p.call(member)).body.account.balance,'2');

    const cancelled = {session:member, body:{op:'order.cancel',orderId,requestId:crypto.randomUUID()}};
    const claim = {session:staff, body:{op:'order.process',orderId,status:'processing',requestId:crypto.randomUUID()}};
    const refunded = winner === 'cancelled';
    const [first, second] = refunded ? [cancelled,claim] : [claim,cancelled];
    const conflictCode = refunded ? 'ORDER_CLOSED' : 'ORDER_IN_PROCESS';
    const firstHasLock = signal(), secondAttemptedLock = signal();
    const observeMutex = observe => p.make({connect:async () => {
     const c = await db.connectPoints();
     const query = c.query.bind(c);
     c.query = (sql,...values) => {
      const queryResult = query(sql,...values);
      return sql === 'SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE' ? observe(queryResult) : queryResult;
     };
     return c;
    }});
    const hold = observeMutex(async acquired => {
     const rows = await acquired;
     firstHasLock.enter();
     await secondAttemptedLock.wait();
     return rows;
    });
    const observeSecond = observeMutex(waiting => {
     secondAttemptedLock.enter();
     return waiting;
    });
    const committed = p.call(first.session,first.body,{},hold);
    try {
     await firstHasLock.wait();
     const [success, conflict] = await Promise.all([committed,p.call(second.session,second.body,{},observeSecond)]);
     assert.equal(success.status,200);
     assert.equal(success.body.status,winner);
     assert.equal(conflict.status,409);
     assert.equal(conflict.body.code,conflictCode);
    } finally {
     await committed;
    }

    const beforeRetry = await p.snapshot();
    const replay = await p.call(first.session,first.body);
    assert.equal(replay.status,200);
    assert.equal(replay.body.status,winner);
    assert.equal(replay.body.replayed,true);
    assert.deepEqual(await p.snapshot(),beforeRetry);

    const {rows:[persisted]} = await p.admin('SELECT status,charge_id,claimed_by,claimed_at FROM points_lab.orders WHERE id=$1',[orderId]);
    assert.equal(persisted.status,winner);
    assert.equal(persisted.charge_id,chargeId);
    assert.equal(persisted.claimed_by,refunded ? null : db.accounts.admin.memberId);
    assert.equal(persisted.claimed_at instanceof Date,!refunded);
    const debit = { kind:'redeem', point_delta:'2', origin_id:null };
    const refund = { kind:'refund', point_delta:'2', origin_id:chargeId };
    assert.deepEqual((await p.admin('SELECT kind,point_delta,origin_id FROM points_lab.ledger WHERE order_id=$1 ORDER BY entry_no',[orderId])).rows,
     refunded ? [debit,refund] : [debit]);
    assert.deepEqual((await p.admin('SELECT kind,quantity FROM points_lab.inventory WHERE order_id=$1 ORDER BY kind DESC',[orderId])).rows,
     refunded ? [{kind:'reserve',quantity:1},{kind:'release',quantity:1}] : [{kind:'reserve',quantity:1}]);
    const state = await p.call(member);
    assert.equal(state.body.account.balance,refunded ? '4' : '2');
    assert.equal(state.body.catalogue[0].available,refunded ? 3 : 2);
    assert.deepEqual((await p.admin('SELECT actor_id,code FROM points_lab.audit WHERE request_id=$1',[second.body.requestId])).rows,
     [{actor_id:refunded ? db.accounts.admin.memberId : db.accounts.normal.memberId,code:conflictCode}]);
   });
  }
  await t.test('only the recorded claimant can close an order; a role loss keeps it fenced', async () => {
   const member = await p.login(), staff = await p.login('admin'), other = await p.login('same');
   await p.fund(member);
   const placed = await p.op(member,{op:'redeem',itemId:db.fixtures.itemId,quantity:1});
   assert.equal(placed.status,200);
   const {orderId} = placed.body;
   const change = status => ({op:'order.process',orderId,status});
   assert.equal((await p.op(staff,change('fulfilled'))).body.code,'ORDER_CLAIM_REQUIRED');
   assert.equal((await p.op(member,change('processing'))).status,403);
   assert.equal((await p.op(staff,change('processing'))).body.status,'processing');
   assert.equal((await p.op(member,{op:'redeem',itemId:db.fixtures.itemId,quantity:2})).body.code,'MEMBER_LIMIT');
   const claimed = await p.snapshot();

   await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.same.memberId]);
   try {
    const {body:{adminOrders:[mine]}} = await p.call(staff,null,{view:'admin'});
    assert.equal(mine.id,orderId);
    assert.equal(mine.status,'processing');
    assert(!Object.hasOwn(mine,'claimedBy'));
    assert.deepEqual((await p.call(other,null,{view:'admin'})).body.adminOrders,[]);
    for (const status of ['processing','failed','fulfilled']) {
     assert.equal((await p.op(other,change(status))).body.code,'ORDER_CLAIMED_BY_ANOTHER');
    }
    const c = await db.connectPoints();
    try {
     await c.query('BEGIN');
     await c.query("SELECT set_config('points.actor',$1,true)",[db.accounts.same.memberId]);
     await assert.rejects(c.query("UPDATE points_lab.orders SET status='fulfilled' WHERE id=$1",[orderId]), e=>e.code==='42501');
    } finally { await c.query('ROLLBACK'); await c.end(); }
   } finally {
    await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.same.memberId]);
   }
   await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.admin.memberId]);
   try { assert.equal((await p.op(staff,change('failed'))).status,403); }
   finally { await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.admin.memberId]); }
   assert.equal((await p.op(member,{op:'order.cancel',orderId})).body.code,'ORDER_IN_PROCESS');
   assert.deepEqual(await p.snapshot(),claimed);
   assert.equal((await p.op(staff,change('fulfilled'))).body.status,'fulfilled');
  });
  await t.test('exact administrator lookup finds closed orders and preserves claim permissions', async () => {
   const member=await p.login(), staff=await p.login('admin'), other=await p.login('same');
   await p.fund(member);
   const placed=await p.op(member,{op:'redeem',itemId:db.fixtures.itemId,quantity:1});
   assert.equal(placed.status,200);
   const {orderId}=placed.body;
   const find=(session,id=orderId)=>p.call(session,null,{view:'admin',orderId:id});
   const action=status=>p.op(staff,{op:'order.process',orderId,status});
   const before=await p.snapshot();
   assert.equal((await find(null)).status,401);
   assert.equal((await find(member)).status,403);
   assert.equal((await find(other)).status,403);
   assert.deepEqual((await find(staff,crypto.randomUUID())).body.adminOrders,[]);
   const pending=await find(staff,orderId.toUpperCase());
   assert.equal(pending.status,200);
   assert.equal(pending.headers['Cache-Control'],'no-store');
   const [row]=pending.body.adminOrders;
   assert.deepEqual(Object.keys(row).sort(),['canClose','cost','id','itemName','ownerLabel','quantity','status']);
   assert.equal(row.id,orderId);
   assert.equal(row.status,'pending');
   assert.equal(row.canClose,false);
   assert(!JSON.stringify(row).includes(db.accounts.normal.memberId));
   assert.deepEqual(await p.snapshot(),before);

   const revokedDuringRead=p.make({connect:async()=>{
    const c=await db.connectPoints(), query=c.query.bind(c);
    c.query=async(sql,...values)=>{
     const response=await query(sql,...values);
     if(sql.includes('WITH queue AS')){
      await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.admin.memberId]);
     }
     return response;
    };
    return c;
   }});
   try{
    const result=await p.call(staff,null,{view:'admin',orderId},revokedDuringRead);
    assert.equal(result.status,403);
    assert(!Object.hasOwn(result.body,'adminOrders'));
   }finally{
    await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.admin.memberId]);
   }

   assert.equal((await action('processing')).body.status,'processing');
   await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.same.memberId]);
   try{
    assert.equal((await find(staff)).body.adminOrders[0].canClose,true);
    const claimed=(await find(other)).body.adminOrders[0];
    assert.equal(claimed.status,'processing');
    assert.equal(claimed.canClose,false);
    assert(!JSON.stringify(claimed).includes(db.accounts.admin.memberId));
    assert.equal((await p.op(other,{op:'order.process',orderId,status:'failed'})).body.code,'ORDER_CLAIMED_BY_ANOTHER');
   }finally{
    await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.same.memberId]);
   }
   assert.equal((await find(other)).status,403);
   assert.equal((await action('failed')).body.status,'failed');
   const closed=await p.snapshot();
   assert.deepEqual((await p.call(staff,null,{view:'admin'})).body.adminOrders,[]);
   assert.deepEqual((await find(staff)).body.adminOrders,[{...row,status:'failed'}]);
   assert.deepEqual(closed.ledger.filter(l=>l.order_id===orderId).map(l=>l.kind),['redeem','refund']);
   assert.deepEqual(await p.snapshot(),closed);
  });
  await t.test('administrator queue pages follow submission order and retain claim isolation',async()=>{
   const member=await p.login(),staff=await p.login('admin'),other=await p.login('same');
   const created=await p.op(staff,{op:'catalogue.create',name:'合成分页兑换',unitCost:1,stock:10,perMemberLimit:10,minEarned:0,
    startsAt:'1900-01-01T00:00:00.000Z',endsAt:'2199-12-31T00:00:00.000Z',status:'enabled'});
   assert.equal(created.status,200);
   await p.fund(member);
   await p.fund(other);
   for(const session of [member,member,member,member,other,other]){
    assert.equal((await p.op(session,{op:'redeem',itemId:created.body.itemId,quantity:1})).status,200);
   }
   const {rows}=await p.admin('SELECT id FROM points_lab.orders ORDER BY created_at,id');
   assert.equal(rows.length,6);
   const ids=rows.map(row=>row.id);
   const get=(session,queue,after,handler)=>p.call(session,null,{view:'admin',queue,limit:'1',...(after?{after}:{})},handler);
   const claim=(session,id)=>p.op(session,{op:'order.process',orderId:id,status:'processing'});
   assert.equal((await get(null,'pending')).status,401);
   assert.equal((await get(member,'pending')).status,403);
   assert.equal((await get(staff,'invalid')).status,400);
   assert.equal((await get(staff,'all',ids[0])).status,400);
   assert.equal((await get(staff,'pending',crypto.randomUUID())).body.code,'QUEUE_CHANGED');
   const before=await p.snapshot();
   const first=await get(staff,'all');
   assert.equal(first.status,200);
   assert.equal(first.headers['Cache-Control'],'no-store');
   assert.deepEqual(first.body.adminOrders.map(row=>row.id),[ids[0]]);
   assert.equal(first.body.nextPendingAfter,ids[0]);
   const walked=[ids[0]];
   let after=first.body.nextPendingAfter;
   for(let page=1;page<ids.length;page++){
    const next=await get(staff,'pending',after);
    assert.equal(next.status,200);
    assert.equal(next.body.adminOrders.length,1);
    walked.push(next.body.adminOrders[0].id);
    after=next.body.nextPendingAfter;
   }
   assert.deepEqual(walked,ids);
   assert.equal(after,null);
   assert.deepEqual(await p.snapshot(),before);

   assert.equal((await claim(staff,ids[0])).status,200);
   assert.equal((await claim(staff,ids[2])).status,200);
   const second=await get(staff,'pending',first.body.nextPendingAfter);
   assert.deepEqual(second.body.adminOrders.map(row=>row.id),[ids[1]]);
   await p.admin("INSERT INTO community_lab.member_roles VALUES($1,'admin')",[db.accounts.same.memberId]);
   try{
    assert.equal((await claim(other,ids[1])).status,200);
    const own=await get(staff,'processing');
    assert.deepEqual(own.body.adminOrders.map(row=>[row.id,row.canClose]),[[ids[0],true]]);
    assert.equal(own.body.nextProcessingAfter,ids[0]);
    const ownNext=await get(staff,'processing',own.body.nextProcessingAfter);
    assert.deepEqual(ownNext.body.adminOrders.map(row=>[row.id,row.canClose]),[[ids[2],true]]);
    assert.equal(ownNext.body.nextProcessingAfter,null);
    assert.deepEqual((await get(other,'processing')).body.adminOrders.map(row=>row.id),[ids[1]]);
    const checkpoint=await p.snapshot();
    const revokeDuringRead=p.make({connect:async()=>{
     const c=await db.connectPoints(),query=c.query.bind(c);
     c.query=async(sql,...values)=>{
      const result=await query(sql,...values);
      if(sql.includes('WITH queue AS'))await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.same.memberId]);
      return result;
     };
     return c;
    }});
    const denied=await get(other,'processing',ids[0],revokeDuringRead);
    assert.equal(denied.status,403);
    assert(!Object.hasOwn(denied.body,'adminOrders'));
    assert.deepEqual(await p.snapshot(),checkpoint);
   }finally{
    await p.admin('DELETE FROM community_lab.member_roles WHERE member_id=$1',[db.accounts.same.memberId]);
   }
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
