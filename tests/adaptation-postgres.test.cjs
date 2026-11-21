const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshOperations}=require('../operations-local/database.cjs'),{serveIntegration}=require('../integration-local/server.cjs'),{createSession}=require('../integration-local/session.cjs'),{httpClient}=require('./integration-local-support.cjs');
const {syntheticHistory,syntheticLegacyRedemption,syntheticLegacyCheckin}=require('../history-compat/fixture.cjs'),{checkHistory}=require('../history-compat/check.cjs'),{rehearse}=require('../history-compat/rehearse.cjs');
function journal(){const rows=new Map();return{rows,async claim(r,{renewConfirmed=false}={}){const key=r.actor+':'+r.module+':'+r.digest;if(rows.has(key)&&!(renewConfirmed&&rows.get(key).state==='confirmed'))return{...rows.get(key),fresh:false};const row={...r,key,state:'pending',createdAt:Date.now(),expiresAt:Date.now()+86400000};rows.set(key,row);return{...row,fresh:true};},async mark(k,id,s){const row=rows.get(k);assert.equal(row.id,id);if(row.state!=='confirmed')row.state=s;},async list(a){return [...rows.values()].filter(r=>r.actor===a);},async forget(k,id){assert.equal(rows.get(k).id,id);rows.delete(k);}};}
test('adaptation receipts and synthetic historical rehearsal on actual PostgreSQL + pinned HTTPS',async t=>{
 const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');const db=await freshOperations(args[1]);let server;
 try{await db.setClock('2024-03-01T04:00:00.000Z');server=await serveIntegration(db,args[3]);const api=httpClient({db,server}),{admin,request,login,mutate}=api,old=await db.financialSnapshot();let a,b,staff,orderId;
 const reset=()=>admin('TRUNCATE b2_lab.member_session_limits_v2');
 async function counts(){return(await admin("SELECT (SELECT count(*)::int FROM attendance_lab.records) facts,(SELECT count(*)::int FROM points_lab.settlements) settlements,(SELECT count(*)::int FROM points_lab.ledger) ledger,(SELECT count(*)::int FROM points_lab.orders) orders,(SELECT count(*)::int FROM community_lab.items) community,(SELECT count(*)::int FROM operations_lab.documents) operations")).rows[0];}
 function client(kind,saved=journal()){
  const jar=new Map();let dropOp=null;const ids=[];
  const factory=()=>createSession({journal:saved,epoch:()=>jar.get('__Host-jinxi_points_epoch')||'',randomId:()=>crypto.randomUUID(),fetcher:async(url,opts)=>{const body=opts.body&&JSON.parse(opts.body);const r=await request(url,{method:opts.method,body,headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),'X-CSRF-Token':opts.headers['X-CSRF-Token']||''}});for(const line of r.headers['set-cookie']||[]){const pair=line.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}if(body&&body.op===dropOp){ids.push(body.requestId);if(r.status===200){dropOp=null;throw Error('injected loss after actual commit');}}else if(body&&body.op!=='login')ids.push(body.requestId);return {ok:r.status>=200&&r.status<300,status:r.status,json:async()=>r.body};}});
  let c=factory();return {saved,ids,get session(){return c;},async login(){await c.authenticate('login',{account:db.accounts[kind].account,password:db.accounts[kind].password});},drop(op){dropOp=op;},async reload(){c=factory();await c.restore();return c;}};
 }
 await t.test('receipt lookup is private, returns no author/content, absence remains unresolved',async()=>{a=await login();b=await login('same');staff=await login('admin');const id=crypto.randomUUID(),r=await mutate('community',a,{op:'message.create',content:'不在恢复响应中出现的正文',category:'闲聊',color:'#2360f5',requestId:id});assert.equal(r.status,200);
  const own=await request('/api/community?receipt='+id,{session:a});assert.equal(own.status,200);assert.deepEqual(own.body,{memberId:a.memberId,receipt:{requestId:id,state:'committed'}});assert(!own.raw.includes('正文'));
  const cross=await request('/api/community?receipt='+id,{session:b});assert.equal(cross.body.receipt.state,'unresolved');assert(!cross.raw.includes(a.memberId));assert.equal((await request('/api/community?receipt='+id)).status,401);
  assert.equal((await request('/api/community?receipt='+crypto.randomUUID(),{session:a})).body.receipt.state,'unresolved');
 });
 await t.test('lost checkin survives new client and creates one fact and one receipt',async()=>{await reset();const x=client('normal');await x.login();x.drop('checkin');const before=await counts();await assert.rejects(x.session.mutate('attendance',{op:'checkin'}));await x.reload();assert.equal((await x.session.recover())[0].serverState,'committed');await x.session.mutate('attendance',{op:'checkin'});assert.equal(x.ids[0],x.ids[1]);assert.equal((await counts()).facts,before.facts+1);});
 await t.test('lost settlement remains one event settlement, ledger entry and balance update',async()=>{await reset();const x=client('normal');await x.login();const state=await x.session.request('points'),event=state.events.find(e=>e.status==='unsettled');x.drop('settle');const body={op:'settle',eventId:event.eventId},before=await counts();await assert.rejects(x.session.mutate('points',body));await x.reload();await x.session.mutate('points',body);assert.equal(x.ids[0],x.ids[1]);const after=await counts();assert.equal(after.settlements,before.settlements+1);assert.equal(after.ledger,before.ledger+1);await admin('SELECT points_lab.assert_account($1)',[db.accounts.normal.memberId]);});
 await t.test('lost debit and lost cancellation each recover one linked order/charge/refund after relogin',async()=>{await reset();const x=client('normal');await x.login();await db.setClock('2024-03-02T04:00:00.000Z');await x.session.mutate('attendance',{op:'checkin'});let state=await x.session.request('points');for(const e of state.events.filter(e=>e.status==='unsettled'))await x.session.mutate('points',{op:'settle',eventId:e.eventId});const body={op:'redeem',itemId:state.catalogue[0].id,quantity:1};x.drop('redeem');await assert.rejects(x.session.mutate('points',body));await x.reload();await x.login();orderId=(await x.session.mutate('points',body)).orderId;assert.equal((await admin('SELECT count(*)::int AS n FROM points_lab.orders WHERE member_id=$1',[db.accounts.normal.memberId])).rows[0].n,1);
  x.drop('order.cancel');await assert.rejects(x.session.mutate('points',{op:'order.cancel',orderId}));await x.reload();await x.session.mutate('points',{op:'order.cancel',orderId});const movements=(await admin("SELECT kind,count(*)::int n FROM points_lab.ledger WHERE order_id=$1 GROUP BY kind ORDER BY kind",[orderId])).rows;assert.deepEqual(movements,[{kind:'redeem',n:1},{kind:'refund',n:1}]);await admin('SELECT points_lab.assert_account($1)',[db.accounts.normal.memberId]);});
 await t.test('lost message, guide and staff document commits recover without new content or private replay payloads',async()=>{await reset();for(const [kind,module,body]of [['same','community',{op:'message.create',content:'持久恢复留言',category:'闲聊',color:'#2360f5'}],['same','community',{op:'guide.create',title:'持久恢复攻略',content:'私有正文',category:'PVE',difficulty:1,tags:[],mediaFiles:[]}],['admin','operations',{op:'announcement.create',title:'持久恢复公告',contentHtml:'<p>合成</p>',expiresAt:null}]]){const x=client(kind);await x.login();x.drop(body.op);const before=await counts();await assert.rejects(x.session.mutate(module,body));await x.reload();const recovered=await x.session.recover();assert.equal(recovered[0].serverState,'committed');assert(!JSON.stringify(recovered).includes('私有正文'));await x.session.mutate(module,body);const after=await counts();assert.equal(after[module==='community'?'community':'operations'],before[module==='community'?'community':'operations']+1);assert.equal(x.ids[0],x.ids[1]);}});
 await t.test('concurrent retry shares original server receipt; spoofed outcome never mutates a ledger',async()=>{await reset();a=await login();const id=crypto.randomUUID(),body={op:'visibility',listed:true,requestId:id},before=await counts();const rs=await Promise.all(Array.from({length:5},()=>request('/api/points',{session:a,body})));assert(rs.every(r=>r.status===200));assert.equal((await admin('SELECT count(*)::int AS n FROM points_lab.requests WHERE actor_id=$1 AND request_id=$2',[a.memberId,id])).rows[0].n,1);assert.equal((await request('/api/points',{session:a,body:{...body,success:true,amount:999}})).status,409);assert.deepEqual(await counts(),before);});
 await t.test('confirmed visibility true-false-true is a new setter intent, with no ledger side effect',async()=>{await reset();const x=client('normal');await x.login();const before=await counts();for(const listed of [true,false,true])await x.session.mutate('points',{op:'visibility',listed});assert.equal((await x.session.request('points')).account.listed,true);assert.notEqual(x.ids[0],x.ids[2]);assert.deepEqual(await counts(),before);});
 await t.test('older confirmed visibility cannot cause unknown same-value retry to insert another receipt',async()=>{await reset();const x=client('normal');await x.login();const before=await counts();await x.session.mutate('points',{op:'visibility',listed:true});x.drop('visibility');await assert.rejects(x.session.mutate('points',{op:'visibility',listed:false}));await x.reload();await x.session.mutate('points',{op:'visibility',listed:false});assert.equal(x.ids[1],x.ids[2]);assert.equal((await admin('SELECT count(*)::int n FROM points_lab.requests WHERE actor_id=$1 AND request_id=$2',[db.accounts.normal.memberId,x.ids[1]])).rows[0].n,1);assert.equal((await x.session.request('points')).account.listed,false);assert.deepEqual(await counts(),before);});
 await t.test('confirmed join-leave-join uses a new membership intent without duplicate active membership',async()=>{await reset();const x=client('normal'),leader=await login('reviewer');await x.login();const created=await mutate('operations',leader,{op:'team.create',name:'重复加入合成队伍',icon:'⭐',color:'#2360f5',slogan:'',description:'',requirements:'',maxMembers:2});assert.equal(created.status,200);const id=created.body.item.id,before=await counts();for(const op of ['team.join','team.leave','team.join'])await x.session.mutate('operations',{op,id,...(op==='team.join'?{message:''}:{})});const members=(await admin('SELECT count(*)::int n,count(*) FILTER(WHERE left_at IS NULL)::int active FROM operations_lab.team_members WHERE member_id=$1',[db.accounts.normal.memberId])).rows[0];assert.deepEqual(members,{n:2,active:1});assert.equal((await admin('SELECT member_count FROM operations_lab.teams WHERE id=$1',[id])).rows[0].member_count,2);assert.deepEqual(await counts(),before);});
 await t.test('receipt query rechecks expiry after a real lock wait; disabling, locking and logout revoke restoration',async()=>{await reset();a=await login();const id=crypto.randomUUID();await mutate('points',a,{op:'visibility',listed:false,requestId:id});let waiting;
  const tokenHash=crypto.createHash('sha256').update(a.cookie.split(';').find(s=>s.trim().startsWith('__Host-jinxi_member_local=')).trim().split('=')[1]).digest();await admin("UPDATE b2_lab.member_sessions_v2 SET expires_at=now()+interval '1300 milliseconds',idle_expires_at=now()+interval '1300 milliseconds' WHERE token_hash=$1",[tokenHash]);
  const lock=await db.admin();try{await lock.query('BEGIN');await lock.query('SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE');waiting=request('/api/points?receipt='+id,{session:a});let locked=false;for(let i=0;i<70&&!locked;i++){locked=(await admin("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='jinxi-points-local-only' AND wait_event_type='Lock') AS yes")).rows[0].yes;if(!locked)await new Promise(resolve=>{setTimeout(resolve,10);});}assert(locked);await lock.query('SELECT pg_sleep(1.35)');await lock.query('COMMIT');assert.equal((await waiting).status,401);}finally{await lock.query('ROLLBACK');await lock.end();await waiting?.catch(()=>{});}
  a=await login();await admin('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',[db.accounts.normal.employeeNo]);assert.equal((await request('/api/points?receipt='+id,{session:a})).status,401);await admin('UPDATE b2_lab.guild_member_profiles SET is_active=true WHERE employee_no=$1',[db.accounts.normal.employeeNo]);a=await login();await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.normal.accountId]);assert.equal((await request('/api/points?receipt='+id,{session:a})).status,401);await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=false WHERE id=$1',[db.accounts.normal.accountId]);a=await login();
  for(const module of ['community','attendance','points','operations'])assert.equal((await request('/api/'+module+'?receipt='+id,{session:{...a,cookie:''}})).status,401);
  assert.equal((await request('/api/member',{session:a,body:{op:'logout'}})).status,200);assert.equal((await request('/api/points?receipt='+id,{session:a})).status,401);
 });
 await t.test('lossy author collisions stay outside the PostgreSQL candidate table',async()=>{
  const {data,anchors}=syntheticHistory(2);
  data.strategies[0].id='9007199254740993';anchors.records[0].id=data.strategies[0].id;
  data.strategies.push({...data.strategies[0],id:'safe-strategy'});
  anchors.records.push({...anchors.records[0],id:'safe-strategy',accountId:anchors.members[1].accountId},
   {...anchors.records[0],id:JSON.parse('9007199254740993'),accountId:anchors.members[1].accountId});
  const report=checkHistory(data,anchors);
  assert.deepEqual(report.candidates,[{kind:'strategies',sourceId:'safe-strategy',memberId:anchors.members[1].memberId}]);
  const proof=await rehearse(db,data,anchors);
  assert.deepEqual(proof,{candidates:1,quarantined:3,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('lossy source collisions stay outside the PostgreSQL candidate table',async()=>{
  const {data,anchors}=syntheticHistory(1),id='9007199254740993';
  data.strategies[0].id=id;anchors.records[0].id=id;
  data.strategies.push({...data.strategies[0],id:JSON.parse(id)});
  const report=checkHistory(data,anchors);
  assert.deepEqual(report.candidates,[]);
  assert(report.findings.some(f=>f.code==='LOSSY_SOURCE_ID_AMBIGUITY'&&f.ref===id));
  const proof=await rehearse(db,data,anchors);
  assert.deepEqual(proof,{candidates:0,quarantined:3,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('a saved report cannot stage a candidate not derived from the original synthetic sources',async()=>{
  const {data,anchors}=syntheticHistory(1);
  const report=checkHistory(data,anchors);
  report.candidates.push({kind:'pointAccount',sourceId:'synthetic-added-after-check',memberId:anchors.members[0].memberId});
  let connects=0;
  await assert.rejects(rehearse({...db,admin:async()=>{connects++;return db.admin();}},report),/SYNTHETIC_HISTORY_AND_SEPARATE_BINDINGS_REQUIRED/);
  assert.equal(connects,0);
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('the rehearsal transaction rejects writes to persistent tables on PostgreSQL',async()=>{
  const {data,anchors}=syntheticHistory(1);
  const before=await counts();
  let reached=false,closed=false;
  const guarded={...db,admin:async()=>{
   const c=await db.admin();
   return {
    query:async(sql,...args)=>{
     if(/^INSERT INTO (?:pg_temp\.)?compat_candidates/.test(sql)){
      reached=true;
      return c.query('UPDATE community_lab.items SET payload=payload WHERE false');
     }
     return c.query(sql,...args);
    },
    end:async()=>{await c.end();closed=true;},
   };
  }};
  await assert.rejects(rehearse(guarded,data,anchors),{code:'25006'});
  assert.equal(reached,true);
  assert.equal(closed,true);
  assert.deepEqual(await counts(),before);
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('failed rollback acknowledgement cannot produce a successful rehearsal receipt',async()=>{
  const {data,anchors}=syntheticHistory(1);for(const loseCloseAck of [false,true]){let closed=false,withheld=false;
  const dbWithLostAck={...db,admin:async()=>{
   const c=await db.admin();
   return {query:async(sql,...args)=>{
    const response=await c.query(sql,...args);
    if(sql==='ROLLBACK'){withheld=true;throw Error('synthetic lost acknowledgement');}
    return response;
   },end:async()=>{await c.end();closed=true;if(loseCloseAck)throw Error('synthetic close failure');}};
  }};
  await assert.rejects(rehearse(dbWithLostAck,data,anchors),/REHEARSAL_ROLLBACK_UNCONFIRMED/);
  assert.equal(withheld,true);assert.equal(closed,true);assert.deepEqual(await db.financialSnapshot(),old);}
 });
 await t.test('a rollback acknowledgement with remaining staged rows cannot produce a receipt',async()=>{
  const {data,anchors}=syntheticHistory(1);
  let observed=false,closed=false;
  const inconsistent={...db,admin:async()=>{
   const c=await db.admin();
   return {
    query:async(sql,...args)=>{
     if(sql==='ROLLBACK'){
      await c.query('COMMIT');
      const {rows:[proof]}=await c.query('SELECT count(*)::int AS staged FROM pg_temp.compat_candidates');
      assert.equal(proof.staged,1);
      observed=true;
      return {command:'ROLLBACK'};
     }
     return c.query(sql,...args);
    },
    end:async()=>{await c.end();closed=true;},
   };
  }};
  await assert.rejects(rehearse(inconsistent,data,anchors),/REHEARSAL_STAGE_NOT_CLEARED/);
  assert.equal(observed,true);
  assert.equal(closed,true);
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('an empty rehearsal still requires a PostgreSQL ROLLBACK command tag',async()=>{
  const {data,anchors}=syntheticHistory(1);
  data.messages=[];
  data.strategies=[];
  anchors.records=[];
  const empty={candidates:0,quarantined:0,rolledBack:true,legacyAndBusinessDataUnchanged:true};
  assert.deepEqual(await rehearse(db,data,anchors),empty);
  let command,closed=false;
  const incorrect={...db,admin:async()=>{
   const c=await db.admin();
   return {
    query:async(sql,...args)=>{
     const result=await c.query(sql==='ROLLBACK'?'COMMIT':sql,...args);
     if(sql==='ROLLBACK')command=result.command;
     return result;
    },
    end:async()=>{await c.end();closed=true;},
   };
  }};
  await assert.rejects(rehearse(incorrect,data,anchors),/REHEARSAL_ROLLBACK_UNCONFIRMED/);
  assert.equal(command,'COMMIT');
  assert.equal(closed,true);
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('historical redemption mismatches are rehearsed as findings without staging orders or money',async()=>{
  const {data,anchors,order,charge}=syntheticLegacyRedemption();
  const report=checkHistory(data,anchors);
  assert.deepEqual(report.findings.map(f=>f.entity),['messages']);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:1,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  order.status='cancelled';
  const noRefund=checkHistory(data,anchors);
  assert(noRefund.findings.some(f=>f.entity==='order'&&f.code==='ORDER_LEDGER_STATUS_UNPROVEN'));
  assert.deepEqual(noRefund.candidates,report.candidates);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:2,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  order.status='success';
  data.ledger.push({id:'2',user_id:order.user_id,biz_id:'SYN-REVERSAL',event_type:'reversal',direction:1,
   point_delta:'2',balance_before:'0',balance_after:'2',ext_json:{origin_biz_id:charge.biz_id}});
  data.pointAccounts[0].balance='2';
  const reversal=checkHistory(data,anchors);
  assert(reversal.findings.some(f=>f.entity==='order'&&f.code==='ORDER_REVERSAL_POLICY_UNPROVEN'));
  assert.deepEqual(reversal.candidates,report.candidates);
  assert(reversal.findings.some(f=>f.entity==='pointAccount'&&f.code==='ACCOUNT_COMPENSATION_COUNTERS_UNPROVEN'));
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:4,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('historical checkin award conflicts remain findings and never stage facts or points',async()=>{
  const {data,anchors,award}=syntheticLegacyCheckin();
  const current=await counts();
  const matched=checkHistory(data,anchors);
  assert.deepEqual(matched.candidates.map(row=>row.kind),['strategies']);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:2,rolledBack:true,legacyAndBusinessDataUnchanged:true});

  award.ext_json.continuous_days+=1;
  const conflict=checkHistory(data,anchors);
  assert.deepEqual(conflict.findings.filter(f=>f.code==='CHECKIN_REWARD_LINK_CONFLICT').map(f=>f.entity).sort(),['checkin','ledger']);
  assert.deepEqual(conflict.candidates,matched.candidates);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:4,rolledBack:true,legacyAndBusinessDataUnchanged:true});

  data.checkins=[];
  const orphan=checkHistory(data,anchors);
  assert(orphan.findings.some(f=>f.entity==='ledger'&&f.code==='CHECKIN_REWARD_WITHOUT_FACT'));
  assert.deepEqual(orphan.candidates,matched.candidates);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:3,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  assert.deepEqual(await counts(),current);
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('a balanced snapshot with mismatched cumulative totals produces only an audit finding',async()=>{
  const {data,anchors,order,charge}=syntheticLegacyRedemption();
  Object.assign(data.pointAccounts[0],{total_earned:'3',total_spent:'3'});
  const report=checkHistory(data,anchors);
  assert.deepEqual(report.findings.filter(f=>f.entity==='pointAccount').map(f=>f.code),['ACCOUNT_COUNTERS_LEDGER_INCONSISTENT']);
  assert.deepEqual(report.candidates.map(row=>row.kind),['strategies']);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:2,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  const alias='synthetic-partial-ledger-alias';
  anchors.users.push({userId:alias,accountId:anchors.members[0].accountId});
  data.pointAccounts[0].user_id=order.user_id=charge.user_id=alias;
  const partial=checkHistory(data,anchors);
  assert.deepEqual(partial.findings.filter(f=>f.entity==='pointAccount').map(f=>f.code),['OPENING_ACCOUNT_ALIAS_UNPROVEN']);
  assert.deepEqual(partial.candidates,report.candidates);
  assert.deepEqual(await rehearse(db,data,anchors),{candidates:1,quarantined:2,rolledBack:true,legacyAndBusinessDataUnchanged:true});
  assert.deepEqual(await db.financialSnapshot(),old);
 });
 await t.test('synthetic 208 mapping rehearsal stages quarantined records and rolls everything back',async()=>{const {data,anchors}=syntheticHistory(),r=checkHistory(data,anchors),proof=await rehearse(db,data,anchors);assert.equal(r.summary.trusted,208);assert.deepEqual(proof,{candidates:1,quarantined:1,rolledBack:true,legacyAndBusinessDataUnchanged:true});await assert.rejects(rehearse({...db,settings:{...db.settings,fingerprint:'0'.repeat(64)}},data,anchors),/REHEARSAL_RESOURCE_REJECTED/);assert.deepEqual(await db.financialSnapshot(),old);});
 }finally{await server?.close();await db.stop();}
});
