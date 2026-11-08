const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{setup}=require('./points-local-support.cjs');
test('points invariant resources and inherited handlers coexist on one actual synthetic cluster',async t=>{
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--pg-bin');const p=await setup(args[1]),{db}=p;t.beforeEach(p.reset);
 try{
  await t.test('a missing business mutex fails closed before creating any financial state',async()=>{
   const s=await p.login(),eventId=await p.checkin(s),before=await p.snapshot();await p.admin('DELETE FROM points_lab.mutex WHERE id=1');
   try{const r=await p.op(s,{op:'settle',eventId});assert.equal(r.status,503);assert.deepEqual(await p.snapshot(),before);}finally{await p.admin('INSERT INTO points_lab.mutex(id) VALUES(1)');}
  });
  await t.test('original identity, community and attendance contracts remain usable after the points extension',async()=>{
   const s=await p.login(),eventId=await p.checkin(s),c=await db.admin();let facts;
   try{facts=(await c.query('SELECT * FROM attendance_lab.records ORDER BY id')).rows;}finally{await c.end();}
   assert.equal((await p.op(s,{op:'settle',eventId})).status,200);
   const {createCommunityHandler}=require('../community-local/handler.cjs'),community=createCommunityHandler({settings:db.settings,identity:p.identity,connect:db.connectBusiness,env:{}});
   const posted=await community(p.event(s,{op:'message.create',requestId:crypto.randomUUID(),content:'积分共存验收的完全合成留言'}));assert.equal(posted.statusCode,200);
   const mine=await community(p.event(s,null,{kind:'message',scope:'mine'}));assert.equal(mine.statusCode,200);assert.equal(JSON.parse(mine.body).items.length,1);
   const profile=await p.identity(p.event(s,null,{op:'profile'}));assert.equal(profile.statusCode,200);const repeated=await p.attendance(p.event(s,{op:'checkin',requestId:crypto.randomUUID()}));assert.equal(repeated.statusCode,200);assert.equal(JSON.parse(repeated.body).outcome,'already_checked');assert.equal(JSON.parse(repeated.body).stats.totalDays,1);
   assert.deepEqual((await p.admin('SELECT * FROM attendance_lab.records ORDER BY id')).rows,facts);assert.equal((await p.admin('SELECT settlement_state FROM attendance_lab.reward_events WHERE event_id=$1',[eventId])).rows[0].settlement_state,'unsettled');assert.equal((await p.call(s)).body.account.balance,'1');
  });
  await t.test('deferred database validation cannot commit an award after the session expires',async()=>{
   const s=await p.login(),eventId=await p.checkin(s),before=await p.snapshot();
   await p.admin("CREATE FUNCTION points_lab.synthetic_slow_commit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN PERFORM pg_sleep(1.1); RETURN NULL; END $$; CREATE CONSTRAINT TRIGGER z_slow_commit AFTER INSERT ON points_lab.ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.synthetic_slow_commit()");
   const h=p.make({identity:async e=>{const r=await p.identity(e);assert.equal(r.statusCode,200);await p.admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=clock_timestamp()+interval '900 milliseconds' WHERE token_hash=$1",[p.tokenHash(s)]);return r;}});
   try{assert.equal((await p.call(s,{op:'settle',eventId,requestId:crypto.randomUUID()},{},h)).status,401);assert.deepEqual(await p.snapshot(),before);}finally{await p.admin('DROP TRIGGER z_slow_commit ON points_lab.ledger; DROP FUNCTION points_lab.synthetic_slow_commit()');}
  });
 }finally{await db.stop();}
});
