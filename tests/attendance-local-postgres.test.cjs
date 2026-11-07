const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshAttendance}=require('../attendance-local/database.cjs');
const {createAttendanceHandler}=require('../attendance-local/handler.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
test('trusted attendance facts on actual synthetic PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');
 const db=await freshAttendance(args[1]),origin=db.settings.origin;
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:{}});
 const handler=createAttendanceHandler({settings:db.settings,identity,connect:db.connectAttendance,env:{}});
 async function admin(work){const c=await db.admin();try{return await work(c);}finally{await c.end();}}
 async function reset(){await admin(c=>c.query('TRUNCATE attendance_lab.requests,attendance_lab.reward_events,attendance_lab.records,b2_lab.member_session_limits_v2'));await db.setClock(null);}
 t.beforeEach(reset);
 async function login(kind){const a=db.accounts[kind],r=await identity({httpMethod:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'login',account:a.account,password:a.password})});assert.equal(r.statusCode,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:JSON.parse(r.body).csrfToken};}
 async function call(s,body,query={}){const r=await handler({httpMethod:body?'POST':'GET',headers:{...(body?{origin,'content-type':'application/json'}:{}),...(s?{cookie:s.cookie,'x-csrf-token':s.csrf}:{})},body:body?JSON.stringify(body):'',queryStringParameters:query});return {status:r.statusCode,body:JSON.parse(r.body),headers:r.headers};}
 const event=(s,body)=>({httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify(body)});
 const sign=(s,requestId=crypto.randomUUID())=>call(s,{op:'checkin',requestId});
 const initialFinancial=await db.financialSnapshot();
 try{
  await t.test('a verified member records a database-dated fact and an unsettled event without crediting points',async()=>{
   await db.setClock('2024-02-28T15:59:59.999Z');const s=await login('normal'),before=await db.financialSnapshot();
   const r=await call(s,{op:'checkin',requestId:crypto.randomUUID()});assert.equal(r.status,200);assert.equal(r.body.outcome,'checked');assert.equal(r.body.checkedDate,'2024-02-28');assert.equal(r.body.today,'2024-02-28');assert.equal(r.body.hasCheckedToday,true);assert.equal(r.body.memberId,db.accounts.normal.memberId);assert.equal(r.body.rewardStatus,'unsettled');assert.equal(r.body.rewardPoints,null);
   const state=await call(s);assert.equal(state.status,200);assert.equal(state.body.stats.totalDays,1);assert.equal(state.body.history[0].businessDate,'2024-02-28');assert.equal(state.body.history[0].rewardStatus,'unsettled');assert.equal(state.body.businessTimeZone,'Asia/Shanghai');
   assert.deepEqual(await db.financialSnapshot(),before);
  });
  await t.test('streaks, leap day, month statistics and paginated history are recomputed from dated facts',async()=>{
   const s=await login('normal');
   for(const [instant,expected]of [['2024-02-28T04:00:00.000Z',1],['2024-02-29T04:00:00.000Z',2],['2024-03-01T04:00:00.000Z',3]]){
    await db.setClock(instant);const r=await call(s,{op:'checkin',requestId:crypto.randomUUID()});assert.equal(r.status,200);assert.equal(r.body.stats.currentStreak,expected);assert.equal(r.body.stats.longestStreak,expected);
   }
   await db.setClock('2024-03-02T04:00:00.000Z');let r=await call(s);assert.equal(r.body.hasCheckedToday,false);assert.equal(r.body.stats.currentStreak,3);
   await db.setClock('2024-03-03T04:00:00.000Z');r=await call(s);assert.equal(r.body.stats.currentStreak,0);
   r=await call(s,{op:'checkin',requestId:crypto.randomUUID()});assert.equal(r.body.stats.currentStreak,1);assert.equal(r.body.stats.longestStreak,3);assert.equal(r.body.stats.totalDays,4);assert.equal(r.body.stats.monthDays,2);
   r=await call(s,null,{month:'2024-02',before:'2024-03-01',limit:'1'});assert.equal(r.status,200);assert.equal(r.body.hasCheckedToday,true);assert.equal(r.body.stats.month,'2024-02');assert.equal(r.body.stats.monthDays,2);assert.deepEqual(r.body.stats.monthDates,['2024-02-28','2024-02-29']);assert.equal(r.body.history.length,1);assert.equal(r.body.history[0].businessDate,'2024-02-29');assert.equal(r.body.history[0].continuousDays,2);assert.equal(r.body.nextBefore,'2024-02-29');
   r=await call(s,null,{before:r.body.nextBefore,limit:'1'});assert.equal(r.body.history[0].businessDate,'2024-02-28');assert.equal(r.body.nextBefore,null);
  });
  await t.test('duplicate IDs, new IDs and concurrent requests produce one fact/event per day and never sign the next day by replay',async()=>{
   await db.setClock('2026-12-31T15:59:59.999Z');const s=await login('normal'),id=crypto.randomUUID(),one=await sign(s,id);assert.equal(one.status,200);
   const results=await Promise.all([sign(s,id),sign(s,id),...Array.from({length:6},()=>sign(s))]);assert(results.every(r=>r.status===200));assert(results.every(r=>r.body.recordId===one.body.recordId));assert(results.some(r=>r.body.outcome==='replayed'));assert(results.some(r=>r.body.outcome==='already_checked'));
   assert.deepEqual((await admin(c=>c.query('SELECT (SELECT count(*)::int FROM attendance_lab.records) AS facts,(SELECT count(*)::int FROM attendance_lab.reward_events) AS events'))).rows[0],{facts:1,events:1});
   await db.setClock('2026-12-31T16:00:00.000Z');let r=await sign(s,id);assert.equal(r.body.outcome,'replayed');assert.equal(r.body.checkedDate,'2026-12-31');assert.equal(r.body.today,'2027-01-01');assert.equal(r.body.hasCheckedToday,false);assert.equal(r.body.stats.totalDays,1);
   r=await sign(s);assert.equal(r.body.outcome,'checked');assert.equal(r.body.checkedDate,'2027-01-01');assert.equal(r.body.stats.currentStreak,2);assert.equal(r.body.stats.monthDays,1);
  });
  await t.test('the first simultaneous batch on an empty day produces exactly one successful fact and event',async()=>{
   await db.setClock('2024-02-29T04:00:00.000Z');const s=await login('normal'),shared=crypto.randomUUID();
   const ids=Array.from({length:8},(_,i)=>i%2?crypto.randomUUID():shared),results=await Promise.all(ids.map(id=>sign(s,id)));
   assert(results.every(r=>r.status===200));assert.equal(results.filter(r=>r.body.outcome==='checked').length,1);
   assert(results.every(r=>['checked','already_checked','replayed'].includes(r.body.outcome)));assert.equal(new Set(results.map(r=>r.body.recordId)).size,1);
   assert(results.every(r=>r.body.checkedDate==='2024-02-29'&&r.body.stats.totalDays===1&&r.body.stats.currentStreak===1));
   assert.deepEqual((await admin(c=>c.query('SELECT (SELECT count(*)::int FROM attendance_lab.records) AS facts,(SELECT count(*)::int FROM attendance_lab.reward_events) AS events,(SELECT count(*)::int FROM attendance_lab.requests) AS receipts'))).rows[0],{facts:1,events:1,receipts:new Set(ids).size});
  });
  await t.test('calendar boundaries use Shanghai dates independently of connection timezone',async()=>{
   const cases=[['month end','2026-04-30T15:59:59.999Z','2026-04-30T16:00:00.000Z','2026-04-30','2026-05-01'],['year end','2024-12-31T15:59:59.999Z','2024-12-31T16:00:00.000Z','2024-12-31','2025-01-01'],['century leap','2000-02-28T16:00:00.000Z','2000-02-29T16:00:00.000Z','2000-02-29','2000-03-01'],['century nonleap','2100-02-28T04:00:00.000Z','2100-03-01T04:00:00.000Z','2100-02-28','2100-03-01']];
   for(const [name,first,second,day1,day2]of cases){
    await reset();const s=await login('normal');await db.setClock(first);assert.equal((await sign(s)).body.checkedDate,day1,name);await db.setClock(second);
    const local=createAttendanceHandler({settings:db.settings,identity,env:{},connect:async()=>{const c=await db.connectAttendance();await c.query("SET TimeZone='Pacific/Honolulu'");return c;}});
    const response=await local(event(s,{op:'checkin',requestId:crypto.randomUUID()})),r=JSON.parse(response.body);assert.equal(response.statusCode,200,name);assert.equal(r.checkedDate,day2,name);assert.equal(r.stats.currentStreak,2,name);assert.equal(r.stats.totalDays,2,name);
   }
  });
  await t.test('concurrent requests straddling midnight are dated at the locked insert and create exactly two dated facts',async()=>{
   await db.setClock('2024-02-28T15:59:59.999Z');const s=await login('normal');let entered,release;const reached=new Promise(r=>{entered=r;}),held=new Promise(r=>{release=r;});
   const paused=createAttendanceHandler({settings:db.settings,identity,env:{},connect:async()=>{const c=await db.connectAttendance(),query=c.query.bind(c);c.query=async(sql,...values)=>{if(sql.startsWith('INSERT INTO attendance_lab.reward_events')){entered();await held;}return query(sql,...values);};return c;}});
   const first=paused(event(s,{op:'checkin',requestId:crypto.randomUUID()}));await reached;let second;
   try{await db.setClock('2024-02-28T16:00:00.000Z');second=sign(s);}finally{release();}
   const [a,b]=await Promise.all([first,second]);assert.equal(a.statusCode,200);assert.equal(JSON.parse(a.body).checkedDate,'2024-02-28');assert.equal(b.status,200);assert.equal(b.body.checkedDate,'2024-02-29');assert.equal(b.body.stats.totalDays,2);assert.equal(b.body.stats.currentStreak,2);
   assert.equal((await admin(c=>c.query('SELECT count(*)::int AS n FROM attendance_lab.reward_events'))).rows[0].n,2);
  });
  await t.test('same-nickname members, including reviewers, cannot read or attribute another member history',async()=>{
   await db.setClock('2024-03-01T04:00:00.000Z');const a=await login('normal'),b=await login('same'),staff=await login('admin'),id=crypto.randomUUID();
   const one=await sign(a,id);assert.equal(one.status,200);assert.equal((await call(b)).body.stats.totalDays,0);assert.equal((await call(staff)).body.stats.totalDays,0);
   const two=await sign(b,id);assert.equal(two.status,200);assert.notEqual(one.body.recordId,two.body.recordId);assert.notEqual(one.body.memberId,two.body.memberId);assert.equal((await call(a)).body.history.length,1);
   for(const key of ['memberId','userId','user_id','user_name','account','isAdmin','date','checkin_date','continuous_days','reward_points']){
    assert.equal((await call(a,null,{[key]:db.accounts.same.memberId})).status,403);assert.equal((await call(a,{op:'checkin',requestId:crypto.randomUUID(),[key]:db.accounts.same.memberId})).status,403);
   }
   const c=await db.connectAttendance();try{await c.query('BEGIN');await c.query("SELECT set_config('attendance.actor',$1,true)",[db.accounts.normal.memberId]);assert.equal((await c.query('SELECT * FROM attendance_lab.records WHERE member_id=$1',[db.accounts.same.memberId])).rows.length,0);await assert.rejects(c.query('INSERT INTO attendance_lab.records(member_id) VALUES($1)',[db.accounts.same.memberId]),e=>e.code==='42501');}finally{await c.query('ROLLBACK');await c.end();}
  });
  await t.test('guest, first-reset, logout, password change and expired sessions cannot write',async()=>{
   assert.equal((await sign(null)).status,401);const first=await login('first');assert.equal((await sign(first)).status,403);
   for(const mode of ['logout','password','idle','absolute']){
    const s=await login('same'),body={op:'checkin',requestId:crypto.randomUUID()};
    if(mode==='logout')assert.equal((await identity(event(s,{op:'logout'}))).statusCode,200);
    if(mode==='password'){const next=crypto.randomBytes(20).toString('hex')+'A9!';assert.equal((await identity(event(s,{op:'change-password',currentPassword:db.accounts.same.password,newPassword:next}))).statusCode,200);db.accounts.same.password=next;}
    if(mode==='idle'||mode==='absolute')await admin(c=>c.query(mode==='idle'?"UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '2 hours',idle_expires_at=now()-interval '1 second' WHERE token_hash=$1":"UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '8 days',idle_expires_at=now()-interval '2 seconds',expires_at=now()-interval '1 second' WHERE token_hash=$1",[crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest()]));
    assert.equal((await call(s,body)).status,401);assert.equal((await call(s)).status,401);
   }
   assert.equal((await admin(c=>c.query('SELECT count(*)::int AS n FROM attendance_lab.records'))).rows[0].n,0);
  });
  await t.test('state changes and expiry committed during the actual account-lock wait are checked again',async()=>{
   for(const mode of ['lock','profile','disabled','version','revoked','expiry','first-reset']){
    const s=await login('same'),block=await db.admin(),id=crypto.randomUUID();let enter;const entered=new Promise(r=>{enter=r;});let pending;
    const waited=createAttendanceHandler({settings:db.settings,env:{},identity:async e=>{const r=await identity(e);assert.equal(r.statusCode,200);await block.query('BEGIN');await block.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[db.accounts.same.accountId]);return r;},connect:async()=>{const c=await db.connectAttendance(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes('guild_member_accounts')&&sql.includes('FOR UPDATE'))enter();return query(sql,...values);};return c;}});
    try{
     pending=waited(event(s,{op:'checkin',requestId:id}));await entered;
     if(mode==='lock')await block.query('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.same.accountId]);
     if(mode==='first-reset')await block.query('UPDATE b2_lab.guild_member_accounts SET force_reset_password=true WHERE id=$1',[db.accounts.same.accountId]);
     if(mode==='profile')await block.query('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',[db.accounts.same.employeeNo]);
     if(mode==='disabled')await block.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=clock_timestamp() WHERE account_id=$1',[db.accounts.same.accountId]);
     if(mode==='version')await block.query('UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id=$1',[db.accounts.same.accountId]);
     if(mode==='revoked')await block.query('UPDATE b2_lab.member_sessions_v2 SET revoked_at=clock_timestamp() WHERE account_id=$1',[db.accounts.same.accountId]);
     if(mode==='expiry'){await block.query("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '400 milliseconds' WHERE token_hash=$1",[crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest()]);await block.query('SELECT pg_sleep(0.6)');}
     await block.query('COMMIT');assert.equal((await pending).statusCode,mode==='first-reset'?403:401,mode);assert.equal((await admin(c=>c.query('SELECT count(*)::int AS n FROM attendance_lab.requests WHERE request_id=$1',[id]))).rows[0].n,0);
     if(mode==='first-reset'){
      const next=crypto.randomBytes(20).toString('hex')+'A9!';assert.equal((await identity(event(s,{op:'change-password',currentPassword:db.accounts.same.password,newPassword:next}))).statusCode,200);db.accounts.same.password=next;
     }
    }finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();await admin(async c=>{await c.query('UPDATE b2_lab.guild_member_accounts SET is_locked=false,force_reset_password=false WHERE id=$1',[db.accounts.same.accountId]);await c.query('UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no=$1',[db.accounts.same.employeeNo]);await c.query('UPDATE b2_lab.member_account_security_v2 SET disabled_at=NULL WHERE account_id=$1',[db.accounts.same.accountId]);});}
    assert.equal((await sign(s)).status,401,'Restoring flags or completing the required password change must not resurrect the old session');
   }
  });
  await t.test('actual PostgreSQL failures after the fact or event roll back every write, and a retry succeeds once',async()=>{
   await db.setClock('2024-03-01T04:00:00.000Z');const s=await login('normal');
   for(const at of ['INSERT INTO attendance_lab.reward_events','INSERT INTO attendance_lab.requests']){
    await admin(c=>c.query('TRUNCATE attendance_lab.requests,attendance_lab.reward_events,attendance_lab.records'));const id=crypto.randomUUID();
    const faulty=createAttendanceHandler({settings:db.settings,identity,env:{},connect:async()=>{const c=await db.connectAttendance(),query=c.query.bind(c);c.query=(sql,...values)=>sql.startsWith(at)?query('SELECT 1/0'):query(sql,...values);return c;}});
    const r=await faulty(event(s,{op:'checkin',requestId:id}));assert.equal(r.statusCode,503);for(const secret of [s.csrf,s.cookie,db.settings.password,'attendance_lab','division by zero'])assert(!r.body.includes(secret));
    assert.deepEqual((await admin(c=>c.query('SELECT (SELECT count(*)::int FROM attendance_lab.records) AS facts,(SELECT count(*)::int FROM attendance_lab.reward_events) AS events,(SELECT count(*)::int FROM attendance_lab.requests) AS receipts'))).rows[0],{facts:0,events:0,receipts:0});
    assert.equal((await call(s)).body.stats.totalDays,0);assert.equal((await sign(s,id)).status,200);assert.equal((await sign(s,id)).body.stats.totalDays,1);
   }
  });
  await t.test('runtime ACLs forbid date, streak, reward, legacy and ledger tampering and fail closed on grant drift',async()=>{
   const c=await db.connectAttendance();try{
    for(const sql of ['CREATE TABLE public.forbidden(id int)','CREATE TEMP TABLE forbidden(id int)','SET ROLE jinxi_attendance_owner','SELECT password_hash FROM b2_lab.guild_member_accounts','SELECT * FROM attendance_legacy.checkin_records','UPDATE attendance_legacy.point_account SET balance=999','INSERT INTO attendance_legacy.point_ledger VALUES(999,\'forged\',\'forged\',999)',"UPDATE attendance_lab.clock SET synthetic_now='2024-01-01'",'UPDATE attendance_lab.records SET signed_at=clock_timestamp()',"UPDATE attendance_lab.reward_events SET settlement_state='settled'",'UPDATE attendance_lab.records SET continuous_days=999']){
     await c.query('BEGIN');try{await assert.rejects(c.query(sql),e=>['42501','42703'].includes(e.code));}finally{await c.query('ROLLBACK');}
    }
    await c.query('BEGIN');try{await c.query("SELECT set_config('attendance.actor',$1,true)",[db.accounts.normal.memberId]);await assert.rejects(c.query("INSERT INTO attendance_lab.records(member_id,signed_at) VALUES($1,'2020-01-01')",[db.accounts.normal.memberId]),e=>e.code==='42501');}finally{await c.query('ROLLBACK');}
   }finally{await c.end();}
   const s=await login('normal');await admin(c=>c.query('GRANT UPDATE(signed_at) ON attendance_lab.records TO jinxi_attendance_app'));
   try{assert.equal((await sign(s)).status,503);}finally{await admin(c=>c.query('REVOKE UPDATE(signed_at) ON attendance_lab.records FROM jinxi_attendance_app'));}
   await admin(c=>c.query('GRANT SELECT ON attendance_legacy.point_account TO jinxi_attendance_app'));
   try{assert.equal((await call(s)).status,503);}finally{await admin(c=>c.query('REVOKE SELECT ON attendance_legacy.point_account FROM jinxi_attendance_app'));}
  });
  await t.test('invalid periods, future fact anomalies and missing events never become fake success or zero',async()=>{
   const s=await login('normal');for(const query of [{month:'2024-13'},{month:'2024-2'},{before:'2024-02-30'},{before:'2023-02-29'},{limit:'0'},{limit:'101'},{limit:'1;DROP TABLE records'}])assert.equal((await call(s,null,query)).status,400);
   await db.setClock('2024-03-03T04:00:00.000Z');const one=await sign(s);assert.equal(one.status,200);
   await db.setClock('2024-03-02T04:00:00.000Z');assert.equal((await call(s)).status,503);assert.equal((await sign(s)).status,503);
   await db.setClock('2024-03-03T04:00:00.000Z');await admin(c=>c.query('DELETE FROM attendance_lab.requests'));await admin(c=>c.query('DELETE FROM attendance_lab.reward_events'));
   assert.equal((await call(s)).status,503);assert.equal((await sign(s)).status,503);assert.equal((await admin(c=>c.query('SELECT count(*)::int AS n FROM attendance_lab.records'))).rows[0].n,1);
  });
  await t.test('unowned legacy checkins are excluded and original identity/community handlers coexist unchanged',async()=>{
   const a=await login('normal');let r=await call(a);assert.equal(r.status,200);assert.equal(r.body.stats.totalDays,0);assert.equal(r.body.history.length,0);
   const profile=await identity({httpMethod:'GET',headers:{cookie:a.cookie},queryStringParameters:{op:'profile'}});assert.equal(profile.statusCode,200);
   const {createCommunityHandler}=require('../community-local/handler.cjs');const community=createCommunityHandler({settings:db.settings,identity,connect:db.connectBusiness,env:{}});
   const message=await community(event(a,{op:'message.create',requestId:crypto.randomUUID(),content:'与签到隔离的合成留言'}));assert.equal(message.statusCode,200);
   const feed=await community({httpMethod:'GET',headers:{cookie:a.cookie},queryStringParameters:{kind:'message',scope:'mine'}});assert.equal(feed.statusCode,200);assert.equal(JSON.parse(feed.body).items.length,1);
   r=await sign(a);assert.equal(r.status,200);assert.equal(r.body.stats.totalDays,1);assert.equal(JSON.parse((await community({httpMethod:'GET',headers:{cookie:a.cookie},queryStringParameters:{kind:'message',scope:'mine'}})).body).items.length,1);
  });
  assert.deepEqual(await db.financialSnapshot(),initialFinancial);
 }finally{await db.stop();}
});
