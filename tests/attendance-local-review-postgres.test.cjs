// Independent review reproductions use the actual inherited identity handler and PostgreSQL locks.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshAttendance}=require('../attendance-local/database.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
const {createAttendanceHandler}=require('../attendance-local/handler.cjs');
test('attendance independent review lock-expiry regressions',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');const db=await freshAttendance(args[1]),origin=db.settings.origin;
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:{}}),financial=await db.financialSnapshot();
 async function admin(sql,values){const c=await db.admin();try{return await c.query(sql,values);}finally{await c.end();}}
 async function login(){const a=db.accounts.normal,r=await identity({httpMethod:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'login',account:a.account,password:a.password})});assert.equal(r.statusCode,200);return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:JSON.parse(r.body).csrfToken};}
 function event(s){return {httpMethod:'POST',headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.csrf},body:JSON.stringify({op:'checkin',requestId:crypto.randomUUID()})};}
 async function noWrites(){assert.deepEqual((await admin('SELECT (SELECT count(*)::int FROM attendance_lab.records) AS facts,(SELECT count(*)::int FROM attendance_lab.reward_events) AS events,(SELECT count(*)::int FROM attendance_lab.requests) AS receipts')).rows[0],{facts:0,events:0,receipts:0});}
 t.beforeEach(async()=>{await admin('TRUNCATE attendance_lab.requests,attendance_lab.reward_events,attendance_lab.records,b2_lab.member_session_limits_v2');await db.setClock(null);});
 try{
  await t.test('idle expiry during original identity preflight account-lock wait cannot renew an expired session into a successful checkin',async()=>{
   const s=await login(),tokenHash=crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest(),block=await db.admin();let enter,pending;const entered=new Promise(r=>{enter=r;});
   const preflight=createMemberHandler({settings:db.settings,env:{},connect:async()=>{const c=await db.connect(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes('WHERE a.id=$1 FOR UPDATE OF a'))enter();return query(sql,...values);};return c;}});
   const h=createAttendanceHandler({settings:db.settings,identity:preflight,connect:db.connectAttendance,env:{}});
   try{
    await admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE token_hash=$1",[tokenHash]);
    await block.query('BEGIN');await block.query('SELECT id FROM b2_lab.guild_member_accounts WHERE id=$1 FOR UPDATE',[db.accounts.normal.accountId]);
    pending=h(event(s));await entered;await block.query('SELECT pg_sleep(1.4)');await block.query('COMMIT');
    assert.equal((await pending).statusCode,401,'An idle deadline passed while original identity waited on the account');await noWrites();
    const normal=createAttendanceHandler({settings:db.settings,identity,connect:db.connectAttendance,env:{}});assert.equal((await normal(event(s))).statusCode,401,'Retry must not revive the expired session');
   }finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();}
  });
  await t.test('session-row-only lock wait rechecks real idle expiry after the lock is acquired',async()=>{
   const s=await login(),tokenHash=crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest(),block=await db.admin();let enter,pending;const entered=new Promise(r=>{enter=r;});
   const h=createAttendanceHandler({settings:db.settings,env:{},identity:async e=>{
    const r=await identity(e);assert.equal(r.statusCode,200);await admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE token_hash=$1",[tokenHash]);
    await block.query('BEGIN');await block.query('SELECT account_id FROM b2_lab.member_sessions_v2 WHERE token_hash=$1 FOR UPDATE',[tokenHash]);return r;
   },connect:async()=>{const c=await db.connectAttendance(),query=c.query.bind(c);c.query=(sql,...values)=>{if(sql.includes('member_sessions_v2')&&sql.includes('FOR UPDATE'))enter();return query(sql,...values);};return c;}});
   try{pending=h(event(s));await entered;await block.query('SELECT pg_sleep(1.4)');await block.query('COMMIT');assert.equal((await pending).statusCode,401,'Deadline passed during session-row-only lock wait');await noWrites();}
   finally{await block.query('ROLLBACK').catch(()=>{});await pending?.catch(()=>{});await block.end();}
  });
  await t.test('expiry during a delayed database business operation rolls back before commit',async()=>{
   const s=await login(),tokenHash=crypto.createHash('sha256').update(s.cookie.split('=')[1]).digest();
   const h=createAttendanceHandler({settings:db.settings,env:{},identity:async e=>{
    const r=await identity(e);assert.equal(r.statusCode,200);await admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE token_hash=$1",[tokenHash]);return r;
   },connect:async()=>{const c=await db.connectAttendance(),query=c.query.bind(c);c.query=async(sql,...values)=>{if(sql.startsWith('INSERT INTO attendance_lab.reward_events'))await query('SELECT pg_sleep(1.4)');return query(sql,...values);};return c;}});
   assert.equal((await h(event(s))).statusCode,401,'A completed write must still have a live session at final validation');await noWrites();
  });
  assert.deepEqual(await db.financialSnapshot(),financial);
 }finally{await db.stop();}
});
