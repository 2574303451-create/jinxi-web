const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshOperations}=require('../operations-local/database.cjs'),{serveIntegration}=require('../integration-local/server.cjs');
const {httpClient}=require('./integration-local-support.cjs');
const {createSession}=require('../integration-local/session.cjs');
const {COOKIE}=require('../member-local/identity.cjs');
test('one strict-HTTPS gateway, five reviewed modules and one real synthetic PostgreSQL',async t=>{
 const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');
 const db=await freshOperations(args[1]);let server;
 try{
  await db.setClock('2024-03-01T04:00:00.000Z');server=await serveIntegration(db,args[3]);
  const {request,login,mutate,admin}=httpClient({db,server});const old=await db.financialSnapshot();let a,b,staff,reviewer,item,eventId,orderId,teamId;
  const resetRate=()=>admin('TRUNCATE b2_lab.member_session_limits_v2'); // Only between independent scenarios; never to turn a rejection into success.
  const businessBodies=()=>({community:{op:'message.create',content:'被拒绝写入',category:'闲聊',color:'#2360f5'},attendance:{op:'checkin'},points:{op:'visibility',listed:true},operations:{op:'team.create',name:'拒绝写入',icon:'⭐',color:'#2360f5',slogan:'',description:'',requirements:'',maxMembers:2}});
  async function counts(){return (await admin("SELECT (SELECT count(*) FROM community_lab.items) AS community,(SELECT count(*) FROM attendance_lab.records) AS attendance,(SELECT count(*) FROM points_lab.ledger) AS ledger,(SELECT count(*) FROM points_lab.orders) AS orders,(SELECT count(*) FROM operations_lab.documents) AS documents,(SELECT count(*) FROM operations_lab.teams) AS teams")).rows[0];}
  async function allDenied(session,status){const before=await counts();for(const [module,body]of Object.entries(businessBodies()))assert.equal((await mutate(module,session,body)).status,status,module);assert.deepEqual(await counts(),before);}

  await t.test('strict TLS, one UUID session, CSRF, Origin and immutable legacy write freeze',async()=>{
   a=await login();b=await login('same');staff=await login('admin');reviewer=await login('reviewer');assert.notEqual(a.memberId,b.memberId);assert.equal(db.accounts.normal.nickname,db.accounts.same.nickname);
   for(const [module,body]of Object.entries(businessBodies())){
    assert.equal((await mutate(module,null,body)).status,401,module+' guest');
    assert.equal((await request('/api/'+module,{session:a,body:{...body,requestId:crypto.randomUUID()},headers:{Origin:'https://attacker.invalid'}})).status,403);
    assert.equal((await request('/api/'+module,{session:{...a,csrf:'forged'},body:{...body,requestId:crypto.randomUUID()}})).status,403);
   }
   for(const path of ['auth-login','auth-change-password','messages','message-actions','strategies','strategy-actions','checkin','points','announcements','sponsorship'])assert.equal((await request('/.netlify/functions/'+path,{session:a,body:{action:'write'}})).status,410);
   const me=await request('/api/member?op=me',{session:a});assert.equal(me.headers['cache-control'],'no-store');assert.equal(me.headers['access-control-allow-origin'],undefined);assert.equal(me.headers['set-cookie'],undefined);assert(!me.raw.includes('password_hash'));
   assert.equal((await request('/api/points?userId='+b.memberId,{session:a})).status,403);
  });
  await t.test('message ownership, independent review, reply and duplicate reactions are database facts',async()=>{
   const created=await mutate('community',a,{op:'message.create',content:'HTTPS 统一可信留言',category:'闲聊',color:'#2360f5'});assert.equal(created.status,200);item=created.body.item;assert.equal(item.status,'submitted');
   assert(!(await request('/.netlify/functions/messages')).body.some(x=>x.id===item.id));
   const prior=await counts();assert.equal((await mutate('community',b,{op:'item.edit',id:item.id,version:item.version,content:'B企图覆盖A',category:'闲聊',color:'#2360f5'})).status,404);assert.deepEqual(await counts(),prior); // RLS hides A's unpublished item from B.
   assert.equal((await mutate('community',a,{op:'item.review',id:item.id,version:item.version,decision:'approve'})).status,403);
   const approved=await mutate('community',reviewer,{op:'item.review',id:item.id,version:item.version,decision:'approve'});assert.equal(approved.status,200);item=approved.body.item;
   assert.equal((await mutate('community',b,{op:'reply.create',id:item.id,content:'B的可信回复'})).status,200);
   for(let i=0;i<2;i++)assert.equal((await mutate('community',b,{op:'reaction.set',id:item.id,type:'👍',active:true})).status,200);
   const dbState=(await admin('SELECT (SELECT owner_id FROM community_lab.items WHERE id=$1) AS owner,(SELECT author_id FROM community_lab.replies WHERE item_id=$1) AS reply,(SELECT count(*)::int FROM community_lab.reactions WHERE item_id=$1 AND active) AS reactions',[item.id])).rows[0];
   assert.equal(dbState.owner,a.memberId);assert.equal(dbState.reply,b.memberId);assert.equal(dbState.reactions,1);
   const legacy=(await admin('SELECT id FROM community_lab.items WHERE legacy AND kind=\'message\'')).rows[0];assert.equal((await mutate('community',a,{op:'item.delete',id:legacy.id,version:1})).status,403);
  });
  await t.test('guide draft -> submission -> independent review -> existing public DTO; no nickname claim',async()=>{
   const r=await mutate('community',a,{op:'guide.create',title:'统一合成攻略',content:'仅可信草稿',category:'PVE',difficulty:1,tags:['合成'],mediaFiles:[]});assert.equal(r.status,200);let g=r.body.item;
   assert(!(await request('/.netlify/functions/strategies?summary=1')).body.strategies.some(x=>x.id===g.id));
   assert(!(await request('/api/community?kind=guide&scope=mine',{session:b})).body.items.some(x=>x.id===g.id));
   const submitted=await mutate('community',a,{op:'item.submit',id:g.id,version:g.version});assert.equal(submitted.status,200);g=submitted.body.item;
   assert.equal((await mutate('community',reviewer,{op:'item.review',id:g.id,version:g.version,decision:'approve'})).status,200);
   const dto=(await request('/.netlify/functions/strategies?id='+g.id)).body.strategy;assert.equal(dto.id,g.id);assert.equal(dto.title,'统一合成攻略');assert.equal(dto.status,'published');
   assert.equal((await admin('SELECT owner_id FROM community_lab.items WHERE id=$1',[g.id])).rows[0].owner_id,a.memberId);
  });
  await t.test('concurrent check-ins create exactly one fact and one untouched unsettled event',async()=>{
   await resetRate();const requests=await Promise.all(Array.from({length:4},()=>mutate('attendance',a,{op:'checkin'})));for(const r of requests)assert.equal(r.status,200);
   const row=(await admin('SELECT count(*)::int AS n,min(e.event_id::text) AS event FROM attendance_lab.records r JOIN attendance_lab.reward_events e ON e.record_id=r.id WHERE r.member_id=$1',[a.memberId])).rows[0];assert.equal(row.n,1);eventId=row.event;
   const bstate=await request('/api/attendance',{session:b});assert.equal(bstate.body.stats.totalDays,0);
   assert.equal((await request('/api/attendance?memberId='+a.memberId,{session:b})).status,403);
   assert.equal((await mutate('attendance',a,{op:'checkin',continuousDays:99,rewardPoints:999})).status,403);
  });
  await t.test('concurrent event settlement is unique and conserves event, account, ledger and receipt',async()=>{
   const all=await Promise.all(Array.from({length:4},()=>mutate('points',a,{op:'settle',eventId})));all.forEach(r=>assert.equal(r.status,200));
   const value=(await admin("SELECT (SELECT count(*)::int FROM points_lab.settlements WHERE event_id=$1) AS settlements,(SELECT count(*)::int FROM points_lab.ledger WHERE event_id=$1) AS ledger,(SELECT balance::text FROM points_lab.accounts WHERE member_id=$2) AS balance,(SELECT settlement_state FROM attendance_lab.reward_events WHERE event_id=$1) AS original_state,(SELECT to_jsonb(e)->>'amount' FROM attendance_lab.reward_events e WHERE event_id=$1) AS original_amount",[eventId,a.memberId])).rows[0];
   assert.deepEqual(value,{settlements:1,ledger:1,balance:'1',original_state:'unsettled',original_amount:null});
   assert.equal((await mutate('points',b,{op:'settle',eventId})).status,403);
   await db.setClock('2024-03-02T04:00:00.000Z');assert.equal((await mutate('attendance',a,{op:'checkin'})).status,200);
   const event2=(await request('/api/points',{session:a})).body.events.find(x=>x.status==='unsettled');assert.equal((await mutate('points',a,{op:'settle',eventId:event2.eventId})).status,200);
   assert.equal((await request('/api/attendance',{session:a})).body.stats.currentStreak,2);
  });
  await t.test('concurrent redemption cannot overspend; cancellation refunds the original charge exactly once',async()=>{
   await resetRate();const product=(await request('/api/points',{session:a})).body.catalogue[0];assert.equal(product.unitCost,'2');
   const requests=await Promise.all(Array.from({length:3},()=>mutate('points',a,{op:'redeem',itemId:product.id,quantity:1})));assert.equal(requests.filter(r=>r.status===200).length,1);assert.equal(requests.filter(r=>r.status===409).length,2);orderId=requests.find(r=>r.status===200).body.orderId;
   assert.equal((await mutate('points',b,{op:'order.cancel',orderId})).status,403);
   const returns=await Promise.all(Array.from({length:3},()=>mutate('points',a,{op:'order.cancel',orderId})));returns.forEach(r=>assert.equal(r.status,200));
   const state=(await request('/api/points',{session:a})).body;assert.equal(state.account.balance,'2');assert.equal(state.account.refunds,'2');assert.equal(state.account.totalSpent,'0');assert.equal(state.orders[0].status,'cancelled');assert.equal(state.ledger.filter(l=>l.kind==='refund'&&l.orderId===orderId).length,1);
   await admin('SELECT points_lab.assert_account($1)',[a.memberId]);assert.equal((await admin('SELECT available FROM points_lab.catalogue WHERE id=$1',[product.id])).rows[0].available,3);
  });
  await t.test('ranking uses chosen metric, stable public IDs and excludes locked identities',async()=>{
   assert.equal((await mutate('points',a,{op:'visibility',listed:true})).status,200);const board=await request('/api/points?view=board&metric=earned',{session:a});assert.equal(board.status,200);assert.equal(board.body.entries.length,1);assert.equal(board.body.entries[0].score,'2');assert(!board.raw.includes(a.memberId));assert(!board.raw.includes(db.accounts.normal.account));
   const before=(await request('/api/points',{session:b})).body;assert.equal(before.account.balance,'0');assert.equal(before.orders.length,0);
  });
  await t.test('announcement permissions, independent publishing, HTML filtering and withdrawal',async()=>{
   await resetRate();assert.equal((await mutate('operations',a,{op:'announcement.create',title:'伪造管理员',contentHtml:'正文',expiresAt:null,isAdmin:true})).status,403);
   let r=await mutate('operations',staff,{op:'announcement.create',title:'统一合成公告',contentHtml:'<p>安全<strong>正文</strong><img src="/fixtures/operations-cover.svg" onerror="window.xss=1"><script>window.xss=1</script><img src="https://attacker.invalid/pixel"></p>',expiresAt:null});assert.equal(r.status,200);let ann=r.body.item;assert.equal(ann.status,'draft');assert(!/script|onerror|attacker/.test(ann.contentHtml));
   assert.equal((await request('/.netlify/functions/announcements')).body.length,0);
   r=await mutate('operations',staff,{op:'announcement.submit',id:ann.id,version:ann.version});assert.equal(r.status,200);ann=r.body.item;
   assert.equal((await mutate('operations',staff,{op:'announcement.publish',id:ann.id,version:ann.version})).status,403);
   r=await mutate('operations',reviewer,{op:'announcement.publish',id:ann.id,version:ann.version});assert.equal(r.status,200);ann=r.body.item;
   const pub=await request('/.netlify/functions/announcements');assert.equal(pub.body[0].id,ann.id);assert(!pub.raw.includes(staff.memberId));
   assert.equal((await request('/api/operations?kind=announcement&view=private',{session:a})).status,403);
   assert.equal((await mutate('operations',staff,{op:'announcement.withdraw',id:ann.id,version:ann.version})).status,200);assert.equal((await request('/.netlify/functions/announcements')).body.length,0);
  });
  await t.test('sponsorship is admin-maintained independent records; no payment or nickname ownership',async()=>{
   for(let i=0;i<2;i++)assert.equal((await mutate('operations',staff,{op:'sponsor.create',sponsor:'相同合成感谢',sponsorTime:'2024-03-01T04:00:00.000Z'})).status,200);
   assert.equal((await mutate('operations',reviewer,{op:'sponsor.create',sponsor:'越权',sponsorTime:'2024-03-01T04:00:00.000Z'})).status,403);
   const pub=await request('/.netlify/functions/sponsorship');assert.equal(pub.body.entries.length,2);assert.notEqual(pub.body.entries[0].id,pub.body.entries[1].id);assert(!pub.raw.includes(staff.memberId));
   assert.equal((await request('/api/payments',{session:staff,body:{op:'pay'}})).status,405);
  });
  await t.test('team creation, duplicate joining, capacity, owner management and own leave are coherent',async()=>{
   let r=await mutate('operations',a,{op:'team.create',name:'统一HTTPS队伍',icon:'⭐',color:'#2360f5',slogan:'合成',description:'',requirements:'',maxMembers:2});assert.equal(r.status,200);teamId=r.body.item.id;
   const join={op:'team.join',id:teamId,message:'合成加入',requestId:crypto.randomUUID()};assert.equal((await mutate('operations',b,join)).status,200);assert.equal((await mutate('operations',b,join)).body.replayed,true);
   assert.equal((await mutate('operations',staff,{op:'team.join',id:teamId,message:''})).status,409);
   assert.equal((await mutate('operations',b,{op:'team.edit',id:teamId,version:1,name:'越权'})).status,403);
   const team=(await request('/api/operations?kind=team')).body.items[0];assert.equal(team.memberCount,2);assert.equal((await admin('SELECT count(*)::int AS n FROM operations_lab.team_members WHERE team_id=$1 AND left_at IS NULL',[teamId])).rows[0].n,2);
   assert.equal((await mutate('operations',b,{op:'team.leave',id:teamId})).status,200);assert.equal((await request('/api/operations?kind=team')).body.items[0].memberCount,1);
   assert.equal((await mutate('operations',a,{op:'team.leave',id:teamId})).status,409);
  });
  await t.test('rollback of mid-settlement SQL failure preserves account, event, ledger and receipts',async()=>{
   await resetRate();assert.equal((await mutate('attendance',b,{op:'checkin'})).status,200);const event=(await request('/api/points',{session:b})).body.events[0];
   await admin("CREATE FUNCTION public.integration_reject_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rollback probe'; END $$; CREATE TRIGGER integration_reject BEFORE INSERT ON points_lab.ledger FOR EACH ROW EXECUTE FUNCTION public.integration_reject_ledger()");
   try{assert.equal((await mutate('points',b,{op:'settle',eventId:event.eventId})).status,503);}finally{await admin('DROP TRIGGER integration_reject ON points_lab.ledger; DROP FUNCTION public.integration_reject_ledger()');}
   assert.equal((await admin('SELECT count(*)::int AS n FROM points_lab.ledger WHERE member_id=$1',[b.memberId])).rows[0].n,0);assert.equal((await admin('SELECT count(*)::int AS n FROM points_lab.settlements WHERE event_id=$1',[event.eventId])).rows[0].n,0);
   assert.equal((await mutate('points',b,{op:'settle',eventId:event.eventId})).status,200);await admin('SELECT points_lab.assert_account($1)',[b.memberId]);
  });
  await t.test('session expires during community business SQL: final commit must reject and roll back',async()=>{
   await resetRate();const s=await login('same');const hash=crypto.createHash('sha256').update(s.cookie.split(';')[0].split('=')[1]).digest();
   await admin('UPDATE b2_lab.member_sessions_v2 SET expires_at=now()+interval \'900 milliseconds\',idle_expires_at=now()+interval \'900 milliseconds\' WHERE token_hash=$1',[hash]);
   await admin("CREATE FUNCTION public.integration_slow_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1.2); RETURN NEW; END $$; CREATE TRIGGER integration_slow BEFORE INSERT ON community_lab.items FOR EACH ROW EXECUTE FUNCTION public.integration_slow_message()");
   const before=await counts();let r;try{r=await mutate('community',s,{op:'message.create',content:'过期不得落库',category:'闲聊',color:'#2360f5'});}finally{await admin('DROP TRIGGER integration_slow ON community_lab.items; DROP FUNCTION public.integration_slow_message()');}
   assert.equal(r.status,401);assert.deepEqual(await counts(),before);assert.equal(r.headers['set-cookie'],undefined);
  });
  await t.test('lost committed redemption -> expired retry -> same-member login -> original receipt, not another debit',async()=>{
   await resetRate();const jar=new Map(),attempts=[];let drop=true,firstOrder;
   const memberClient=createSession({epoch:()=>jar.get('__Host-jinxi_points_epoch')||'',randomId:()=>crypto.randomUUID(),fetcher:async(url,options)=>{
    const body=options.body?JSON.parse(options.body):undefined;
    const r=await request(url,{body,method:options.method,headers:{Cookie:Array.from(jar,([k,v])=>k+'='+v).join('; '),'X-CSRF-Token':options.headers['X-CSRF-Token']||''}});
    for(const line of r.headers['set-cookie']||[]){const pair=line.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}
    if(body?.op==='redeem'){attempts.push(body.requestId);if(drop&&r.status===200){drop=false;firstOrder=r.body.orderId;throw Error('synthetic response lost after real PostgreSQL commit');}}
    return {ok:r.status>=200&&r.status<300,status:r.status,json:async()=>r.body};
   }});
   await memberClient.authenticate('login',{account:db.accounts.reviewer.account,password:db.accounts.reviewer.password});
   for(const day of ['2024-03-03','2024-03-04']){await db.setClock(day+'T04:00:00.000Z');await memberClient.mutate('attendance',{op:'checkin'});const state=await memberClient.request('points');for(const event of state.events.filter(e=>e.status==='unsettled'))await memberClient.mutate('points',{op:'settle',eventId:event.eventId});}
   const catalogue=await mutate('points',staff,{op:'catalogue.create',name:'到期重试用虚构物品',unitCost:1,stock:4,perMemberLimit:3,minEarned:0,startsAt:'1900-01-01T00:00:00.000Z',endsAt:'2199-12-31T00:00:00.000Z',status:'enabled'});assert.equal(catalogue.status,200);const body={op:'redeem',itemId:catalogue.body.itemId,quantity:1};
   await assert.rejects(memberClient.mutate('points',body),e=>e.code==='NETWORK_RESULT_UNKNOWN');
   const tokenHash=crypto.createHash('sha256').update(jar.get(COOKIE)).digest();await admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=created_at+interval '1 millisecond' WHERE token_hash=$1",[tokenHash]);
   await assert.rejects(memberClient.mutate('points',body),e=>e.status===401);
   await memberClient.authenticate('login',{account:db.accounts.reviewer.account,password:db.accounts.reviewer.password});const retry=await memberClient.mutate('points',body);
   assert.equal(retry.orderId,firstOrder);assert.equal(attempts.length,3);assert(attempts.every(id=>id===attempts[0]));
   const proof=(await admin("SELECT (SELECT count(*)::int FROM points_lab.orders WHERE member_id=$1) AS orders,(SELECT count(*)::int FROM points_lab.ledger WHERE member_id=$1 AND kind='redeem') AS debits,(SELECT balance::text FROM points_lab.accounts WHERE member_id=$1) AS balance",[db.accounts.reviewer.memberId])).rows[0];assert.deepEqual(proof,{orders:1,debits:1,balance:'1'});await admin('SELECT points_lab.assert_account($1)',[db.accounts.reviewer.memberId]);
  });
  await t.test('lock waiting sees revocation; all modules reject logout, password, lock, disable, expiry and reset states',async()=>{
   await resetRate();
   for(const kind of ['locked','disabled']){const acct=db.accounts[kind];assert.equal((await request('/api/member',{body:{op:'login',account:acct.account,password:acct.password}})).status,401);}
   const first=await login('first');await allDenied(first,403);
   const s=await login('same');assert.equal((await request('/api/member',{session:s,body:{op:'logout'}})).status,200);await allDenied(s,401);
   const pwd=await login('same');assert.equal((await request('/api/member',{session:pwd,body:{op:'change-password',currentPassword:db.accounts.same.password,newPassword:crypto.randomBytes(20).toString('hex')+'A9!'}})).status,200);await allDenied(pwd,401);
   const lock=await db.admin();let held;
   try{
    const hash=crypto.createHash('sha256').update(a.cookie.split(';')[0].split('=')[1]).digest();await admin('UPDATE b2_lab.member_sessions_v2 SET expires_at=now()+interval \'900 milliseconds\',idle_expires_at=now()+interval \'900 milliseconds\' WHERE token_hash=$1',[hash]);
    await lock.query('BEGIN');await lock.query('SELECT id FROM points_lab.mutex WHERE id=1 FOR UPDATE');held=mutate('points',a,{op:'visibility',listed:true});
    let waiting=false;for(let i=0;i<50&&!waiting;i++){waiting=(await admin("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='jinxi-points-local-only' AND wait_event_type='Lock') AS yes")).rows[0].yes;if(!waiting)await new Promise(resolve=>{setTimeout(resolve,10);});}assert(waiting,'actual business lock was not reached');
    await admin('SELECT pg_sleep(1.0)');await lock.query('COMMIT');
   }finally{await lock.query('ROLLBACK');await lock.end();}
   assert.equal((await held).status,401);await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.normal.accountId]);await allDenied(a,401);
   assert.deepEqual(await db.financialSnapshot(),old);
  });
 }finally{await server?.close();await db.stop();}
});
