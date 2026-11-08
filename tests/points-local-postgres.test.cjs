const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshPoints}=require('../points-local/database.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
const {createAttendanceHandler}=require('../attendance-local/handler.cjs');
const {createPointsHandler}=require('../points-local/handler.cjs');
test('trusted synthetic points on actual PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');const db=await freshPoints(args[1]),origin=db.settings.origin;
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:{}}),attendance=createAttendanceHandler({settings:db.settings,identity,connect:db.connectAttendance,env:{}}),points=createPointsHandler({settings:db.settings,identity,connect:db.connectPoints,env:{}});
 const event=(s,body,query={})=>({httpMethod:body?'POST':'GET',headers:{...(body?{origin,'content-type':'application/json'}:{}),...(s?{cookie:s.cookie,'x-csrf-token':s.csrf}:{})},body:body?JSON.stringify(body):'',queryStringParameters:query});
 async function login(kind='normal'){const a=db.accounts[kind],r=await identity(event(null,{op:'login',account:a.account,password:a.password}));assert.equal(r.statusCode,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:JSON.parse(r.body).csrfToken};}
 async function call(s,body,query={}){const r=await points(event(s,body,query));return {status:r.statusCode,body:JSON.parse(r.body),headers:r.headers};}
 const op=(s,body)=>call(s,{requestId:crypto.randomUUID(),...body});
 async function admin(sql,values){const c=await db.admin();try{return await c.query(sql,values);}finally{await c.end();}}
 async function checkin(s,instant){await db.setClock(instant);const r=await attendance(event(s,{op:'checkin',requestId:crypto.randomUUID()}));assert.equal(r.statusCode,200);return JSON.parse(r.body).history[0].rewardEventId;}
 const original=await db.financialSnapshot();
 t.beforeEach(async()=>{
  const c=await db.admin();try{
   await c.query('TRUNCATE points_lab.audit,points_lab.requests,points_lab.inventory,points_lab.settlements,points_lab.ledger,points_lab.orders,points_lab.ranking,points_lab.accounts,points_lab.rules,points_lab.catalogue,attendance_lab.requests,attendance_lab.reward_events,attendance_lab.records,b2_lab.member_session_limits_v2');
   await c.query("SELECT set_config('points.actor',$1,false)",[db.accounts.admin.memberId]);
   await c.query("INSERT INTO points_lab.rules(id,code,version,day1,day3,day7,daily_cap,total_cap,starts_at,ends_at,status) VALUES($1,'SYNTHETIC.checkin',1,1,2,3,100,1000,'1900-01-01T00:00:00Z','2199-12-31T00:00:00Z','enabled')",[db.fixtures.ruleId]);
   await c.query("INSERT INTO points_lab.catalogue(id,name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) VALUES($1,'虚构纸星（仅合成）',2,3,3,2,0,'1900-01-01T00:00:00Z','2199-12-31T00:00:00Z','enabled')",[db.fixtures.itemId]);
  }finally{await c.end();}await db.setClock(null);
 });
 try{
  await t.test('a verified UUID starts at zero and settles one existing attendance event without rewriting it',async()=>{
   const s=await login();let r=await call(s);assert.equal(r.status,200);assert.equal(r.body.account.balance,'0');assert.equal(r.body.ledger.length,0);
   const eventId=await checkin(s,'2024-02-29T04:00:00.000Z');r=await op(s,{op:'settle',eventId});assert.equal(r.status,200);assert.equal(r.body.amount,'1');
   r=await call(s);assert.equal(r.body.account.balance,'1');assert.equal(r.body.account.totalEarned,'1');assert.equal(r.body.ledger.length,1);assert.equal(r.body.ledger[0].direction,1);assert.equal(r.body.ledger[0].pointDelta,'1');
   assert.equal((await admin('SELECT settlement_state FROM attendance_lab.reward_events WHERE event_id=$1',[eventId])).rows[0].settlement_state,'unsettled');assert.deepEqual(await db.financialSnapshot(),original);
  });
  await t.test('only trusted admins create immutable rule versions; overlapping and disabled rules cannot award',async()=>{
   const s=await login(),a=await login('admin'),eventId=await checkin(s,'2024-03-01T04:00:00.000Z');
   const rule={op:'rule.create',code:'SYNTHETIC.alternate',version:1,rewards:[5,6,7],dailyCap:10,totalCap:100,startsAt:'2024-01-01T00:00:00.000Z',endsAt:'2025-01-01T00:00:00.000Z',status:'enabled'};
   assert.equal((await op(s,rule)).status,403);const created=await op(a,rule);assert.equal(created.status,200);assert(created.body.ruleId);
   let r=await op(s,{op:'settle',eventId});assert.equal(r.status,409);assert.equal(r.body.code,'RULE_CONFLICT');assert.equal((await call(s)).body.account.balance,'0');
   assert.equal((await op(s,{op:'rule.status',ruleId:created.body.ruleId,status:'disabled'})).status,403);
   assert.equal((await op(a,{op:'rule.status',ruleId:created.body.ruleId,status:'disabled'})).status,200);r=await op(s,{op:'settle',eventId});assert.equal(r.status,200);assert.equal(r.body.amount,'1');
   r=await op(s,{op:'settle',eventId,amount:999});assert.equal(r.status,403);assert.equal((await admin("SELECT count(*)::int AS n FROM points_lab.audit WHERE code IN('RULE_CONFLICT','CLIENT_AUTHORITY_REJECTED')")).rows[0].n,2);
   const c=await db.connectPoints();try{await c.query('BEGIN');await c.query("SELECT set_config('points.actor',$1,true)",[db.accounts.admin.memberId]);await assert.rejects(c.query('UPDATE points_lab.rules SET day1=999 WHERE id=$1',[db.fixtures.ruleId]),e=>e.code==='42501');}finally{await c.query('ROLLBACK');await c.end();}
  });
  await t.test('effective windows, daily caps and cross-version total caps preserve historical settlements',async()=>{
   const s=await login(),a=await login('admin');await op(a,{op:'rule.status',ruleId:db.fixtures.ruleId,status:'disabled'});
   const make=(version,rewards,dailyCap,totalCap)=>({op:'rule.create',code:'SYNTHETIC.checkin',version,rewards,dailyCap,totalCap,startsAt:'2024-03-02T00:00:00.000Z',endsAt:'2024-03-04T00:00:00.000Z',status:'enabled'});
   const v2=await op(a,make(2,[3,3,3],2,20));assert.equal(v2.status,200);const early=await checkin(s,'2024-03-01T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:early})).body.code,'RULE_NOT_ACTIVE');
   await db.setClock('2024-03-02T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:early})).body.code,'RULE_NOT_ACTIVE');const good=await checkin(s,'2024-03-02T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:good})).body.code,'DAILY_CAP');
   await op(a,{op:'rule.status',ruleId:v2.body.ruleId,status:'disabled'});const v3=await op(a,make(3,[2,2,2],10,3));assert.equal(v3.status,200);let r=await op(s,{op:'settle',eventId:good,ruleId:v3.body.ruleId});assert.equal(r.status,200);assert.equal(r.body.amount,'2');
   const next=await checkin(s,'2024-03-03T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:next})).body.code,'TOTAL_CAP');await op(a,{op:'rule.status',ruleId:v3.body.ruleId,status:'disabled'});const v4=await op(a,make(4,[9,9,9],10,3));assert.equal(v4.status,200);
   r=await op(s,{op:'settle',eventId:good,ruleId:v4.body.ruleId});assert.equal(r.status,409);assert.equal(r.body.code,'SETTLEMENT_CONFLICT');assert.equal((await op(s,{op:'settle',eventId:next})).body.code,'TOTAL_CAP');
   await db.setClock('2024-03-04T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:next})).body.code,'RULE_NOT_ACTIVE');r=await op(s,{op:'settle',eventId:good,ruleId:v3.body.ruleId});assert.equal(r.status,200);assert.equal(r.body.amount,'2');assert.equal((await call(s)).body.account.balance,'2');
   const row=(await admin('SELECT rule_version,amount FROM points_lab.settlements WHERE event_id=$1',[good])).rows[0];assert.deepEqual(row,{rule_version:3,amount:'2'});
  });
  await t.test('a first concurrent settlement batch, lost response retry and request conflicts never double-credit',async()=>{
   const s=await login(),eventId=await checkin(s,'2024-03-01T04:00:00.000Z'),shared=crypto.randomUUID();const ids=Array.from({length:8},(_,i)=>i%2?crypto.randomUUID():shared);
   const results=await Promise.all(ids.map(requestId=>call(s,{op:'settle',eventId,requestId})));assert(results.every(r=>r.status===200));assert.equal(new Set(results.map(r=>r.body.ledgerId)).size,1);assert.equal(results.filter(r=>r.body.outcome==='settled'&&!r.body.replayed).length,1);
   assert.equal((await call(s,{op:'settle',eventId,requestId:shared})).body.replayed,true);assert.equal((await call(s)).body.account.balance,'1');
   let r=await call(s,{op:'settle',eventId:crypto.randomUUID(),requestId:shared});assert.equal(r.status,409);assert.equal(r.body.code,'REQUEST_CONFLICT');assert.deepEqual((await admin('SELECT (SELECT count(*)::int FROM points_lab.ledger) AS ledger,(SELECT count(*)::int FROM points_lab.settlements) AS receipts')).rows[0],{ledger:1,receipts:1});
  });
  await t.test('same-nickname UUIDs cannot claim events or read each other private point history',async()=>{
   const a=await login(),b=await login('same'),eventId=await checkin(a,'2024-03-01T04:00:00.000Z');assert.equal((await op(b,{op:'settle',eventId})).status,403);assert.equal((await op(a,{op:'settle',eventId})).status,200);assert.equal((await call(b)).body.account.balance,'0');assert.equal((await call(b)).body.ledger.length,0);
   const other=await checkin(b,'2024-03-01T04:00:00.000Z');assert.notEqual(other,eventId);assert.equal((await op(b,{op:'settle',eventId:other})).status,200);
   for(const key of ['memberId','userId','user_id','account','isAdmin'])assert.equal((await call(a,null,{[key]:db.accounts.same.memberId})).status,403);
   const c=await db.connectPoints();try{await c.query('BEGIN');await c.query("SELECT set_config('points.actor',$1,true)",[db.accounts.same.memberId]);assert.equal((await c.query('SELECT * FROM points_lab.accounts WHERE member_id=$1',[db.accounts.normal.memberId])).rows.length,0);assert.equal((await c.query('SELECT * FROM points_lab.ledger WHERE member_id=$1',[db.accounts.normal.memberId])).rows.length,0);}finally{await c.query('ROLLBACK');await c.end();}
  });
  await t.test('redeem, exact retry and owner cancellation atomically debit and refund one fictional order',async()=>{
   const s=await login();for(const day of ['01','02','03']){const eventId=await checkin(s,'2024-03-'+day+'T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId})).status,200);}
   assert.equal((await call(s)).body.account.balance,'4');const requestId=crypto.randomUUID(),body={op:'redeem',itemId:db.fixtures.itemId,quantity:1,requestId};const r=await call(s,body);assert.equal(r.status,200);assert(r.body.orderId);assert.equal((await call(s)).body.account.balance,'2');
   const retry=await call(s,body);assert.equal(retry.status,200);assert.equal(retry.body.orderId,r.body.orderId);assert.equal(retry.body.replayed,true);
   let state=await call(s);assert.equal(state.body.orders[0].status,'pending');assert.equal(state.body.catalogue[0].available,2);
   const cancelled=await op(s,{op:'order.cancel',orderId:r.body.orderId});assert.equal(cancelled.status,200);assert.equal((await op(s,{op:'order.cancel',orderId:r.body.orderId})).status,200);state=await call(s);assert.equal(state.body.account.balance,'4');assert.equal(state.body.account.totalSpent,'0');assert.equal(state.body.account.grossSpent,'2');assert.equal(state.body.account.refunds,'2');assert.equal(state.body.catalogue[0].available,3);assert.equal(state.body.orders[0].status,'cancelled');assert.equal(state.body.ledger.filter(l=>l.kind==='refund').length,1);
  });
  await t.test('concurrent redemptions respect balance, stock and per-member limits across distinct UUIDs',async()=>{
   const a=await login(),b=await login('same');for(const s of [a,b])for(const day of ['01','02','03']){const eventId=await checkin(s,'2024-03-'+day+'T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId})).status,200);}
   const results=await Promise.all(Array.from({length:8},(_,i)=>op(i%2?a:b,{op:'redeem',itemId:db.fixtures.itemId,quantity:1})));assert.equal(results.filter(r=>r.status===200).length,3);assert(results.every(r=>[200,409].includes(r.status)));
   const states=await Promise.all([call(a),call(b)]);assert(states.every(r=>BigInt(r.body.account.balance)>=0n));assert.equal(states.reduce((n,r)=>n+BigInt(r.body.account.balance),0n),2n);assert.equal(states[0].body.catalogue[0].available,0);assert(states.every(r=>r.body.orders.length<=2));
   assert.deepEqual((await admin("SELECT (SELECT count(*)::int FROM points_lab.orders) AS orders,(SELECT count(*)::int FROM points_lab.ledger WHERE kind='redeem') AS charges")).rows[0],{orders:3,charges:3});
  });
  await t.test('only administrators process other orders or reverse original awards, with no repeated refund or reversal',async()=>{
   const s=await login(),b=await login('same'),a=await login('admin');let firstEvent;
   for(const day of ['01','02','03']){const eventId=await checkin(s,'2024-03-'+day+'T04:00:00.000Z');firstEvent||=eventId;assert.equal((await op(s,{op:'settle',eventId})).status,200);}
   const order=await op(s,{op:'redeem',itemId:db.fixtures.itemId,quantity:1}),orderId=order.body.orderId;assert.equal(order.status,200);
   assert.equal((await op(b,{op:'order.cancel',orderId})).status,403);assert.equal((await op(s,{op:'order.process',orderId,status:'fulfilled'})).status,403);
   assert.equal((await op(a,{op:'order.process',orderId,status:'failed'})).status,200);assert.equal((await op(a,{op:'order.process',orderId,status:'failed'})).status,200);assert.equal((await call(s)).body.account.balance,'4');assert.equal((await call(s)).body.ledger.filter(l=>l.kind==='refund').length,1);
   const second=await op(s,{op:'redeem',itemId:db.fixtures.itemId,quantity:1});assert.equal(second.status,200);assert.equal((await op(a,{op:'order.process',orderId:second.body.orderId,status:'fulfilled'})).status,200);assert.equal((await op(s,{op:'order.cancel',orderId:second.body.orderId})).status,409);assert.equal((await op(a,{op:'order.process',orderId:second.body.orderId,status:'failed'})).status,409);
   const award=(await call(s)).body.ledger.find(l=>l.eventId===firstEvent&&l.kind==='award');assert.equal((await op(s,{op:'award.reverse',ledgerId:award.id})).status,403);const reversed=await op(a,{op:'award.reverse',ledgerId:award.id});assert.equal(reversed.status,200);const retry=await op(a,{op:'award.reverse',ledgerId:award.id});assert.equal(retry.status,200);assert.equal(retry.body.ledgerId,reversed.body.ledgerId);
   const state=await call(s);assert.equal(state.body.account.balance,'1');assert.equal(state.body.account.reversed,'1');assert.equal(state.body.account.netEarned,'3');assert.equal(state.body.ledger.filter(l=>l.kind==='reversal').length,1);assert.equal((await op(s,{op:'settle',eventId:firstEvent})).body.outcome,'already_settled');assert.equal((await call(s)).body.account.balance,'1');
  });
  await t.test('ledger and stock invariants reject direct credential-role tampering without fabricating credits',async()=>{
   const s=await login(),one=await checkin(s,'2024-03-01T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId:one})).status,200);const next=await checkin(s,'2024-03-02T04:00:00.000Z'),c=await db.connectPoints();
   try{
    for(const sql of ['SELECT password_hash FROM b2_lab.guild_member_accounts','SELECT * FROM points_legacy.point_account','UPDATE points_lab.ledger SET point_delta=999',"UPDATE attendance_lab.reward_events SET settlement_state='settled'",'UPDATE community_lab.member_roles SET role=\'admin\'','CREATE TEMP TABLE forbidden(id int)','CREATE TABLE public.forbidden(id int)','SET ROLE jinxi_points_owner']){
     await c.query('BEGIN');try{await assert.rejects(c.query(sql),e=>e.code==='42501');}finally{await c.query('ROLLBACK');}
    }
    await c.query('BEGIN');await c.query("SELECT set_config('points.actor',$1,true),set_config('attendance.actor',$1,true)",[db.accounts.normal.memberId]);await c.query('UPDATE points_lab.accounts SET balance=2,earned=2 WHERE member_id=$1',[db.accounts.normal.memberId]);await assert.rejects(c.query('COMMIT'),e=>e.code==='23514');await c.query('ROLLBACK');
    await c.query('BEGIN');await c.query("SELECT set_config('points.actor',$1,true),set_config('attendance.actor',$1,true)",[db.accounts.normal.memberId]);
    const forged=(await c.query("INSERT INTO points_lab.ledger(member_id,entry_no,kind,biz_id,direction,point_delta,before_balance,after_balance,event_id,rule_id) VALUES($1,2,'award',$2,1,999,1,1000,$3,$4) RETURNING id",[db.accounts.normal.memberId,'award:'+next,next,db.fixtures.ruleId])).rows[0];
    await c.query('UPDATE points_lab.accounts SET balance=1000,earned=1000,entries=2 WHERE member_id=$1',[db.accounts.normal.memberId]);await c.query("INSERT INTO points_lab.settlements(event_id,member_id,rule_id,rule_code,rule_version,amount,business_date,streak,ledger_id) VALUES($1,$2,$3,'SYNTHETIC.checkin',1,999,'2024-03-02',2,$4)",[next,db.accounts.normal.memberId,db.fixtures.ruleId,forged.id]);await assert.rejects(c.query('COMMIT'),e=>e.code==='23514');await c.query('ROLLBACK');
   }finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
   assert.equal((await call(s)).body.account.balance,'1');assert.equal((await op(s,{op:'settle',eventId:next})).body.amount,'1');assert.equal((await call(s)).body.account.balance,'2');assert.deepEqual(await db.financialSnapshot(),original);
  });
  await t.test('rankings use explicit net-earned or balance metrics, opt-in aliases and stable snapshot pagination',async()=>{
   const a=await login(),b=await login('same');for(const s of [a,b]){const eventId=await checkin(s,'2024-03-01T04:00:00.000Z');assert.equal((await op(s,{op:'settle',eventId})).status,200);}
   let r=await call(a,null,{view:'board',metric:'earned',limit:'1'});assert.equal(r.status,200);assert.equal(r.body.entries.length,0);
   assert.equal((await op(a,{op:'visibility',listed:true})).status,200);assert.equal((await op(b,{op:'visibility',listed:true})).status,200);r=await call(a,null,{view:'board',metric:'earned',limit:'1'});assert.equal(r.status,200);assert.equal(r.body.entries.length,1);assert.equal(r.body.entries[0].score,'1');assert(r.body.nextCursor);const first=r.body.entries[0].publicId;
   const second=await call(a,null,{view:'board',metric:'earned',limit:'1',cursor:r.body.nextCursor});assert.equal(second.status,200);assert.equal(second.body.entries.length,1);assert.notEqual(second.body.entries[0].publicId,first);assert.equal(second.body.entries[0].position,2);assert(first<second.body.entries[0].publicId);
   for(const secret of [db.accounts.normal.memberId,db.accounts.same.memberId,db.accounts.normal.employeeNo,db.accounts.normal.account,db.accounts.normal.nickname])assert(!JSON.stringify(r.body).includes(secret));
   assert.equal((await op(b,{op:'visibility',listed:false})).status,200);const stale=await call(a,null,{view:'board',metric:'earned',limit:'1',cursor:r.body.nextCursor});assert.equal(stale.status,409);assert.equal(stale.body.code,'RANK_CHANGED');
   await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.normal.accountId]);try{r=await call(b,null,{view:'board',metric:'balance'});assert.equal(r.status,200);assert.equal(r.body.entries.length,0);}finally{await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=false WHERE id=$1',[db.accounts.normal.accountId]);}
  });
  assert.deepEqual(await db.financialSnapshot(),original);
 }finally{await db.stop();}
});
