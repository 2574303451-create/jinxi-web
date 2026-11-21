const {test}=require('node:test'),assert=require('node:assert/strict');const {syntheticHistory,syntheticLegacyRedemption,syntheticLegacyCheckin}=require('../history-compat/fixture.cjs'),{checkHistory}=require('../history-compat/check.cjs');
test('208 synthetic profiles map only through independent account anchors; bigint is lossless and names never own content',()=>{const {data,anchors}=syntheticHistory(),before=JSON.stringify(data),r=checkHistory(data,anchors);assert.equal(r.summary.trusted,208);assert.notEqual(r.mappings[0].memberId,r.mappings[1].memberId);assert.equal(r.mappings[0].legacyAccountId,'9007199254740993');assert.equal(r.candidates.length,1);assert(r.findings.some(f=>f.entity==='messages'&&f.code==='NO_TRUSTED_AUTHOR'));assert.equal(JSON.stringify(data),before);assert(!JSON.stringify(r).includes('同名合成成员'));});
test('duplicate employee and UUID, missing binding, orphan profile classify without guessing',()=>{const {data,anchors}=syntheticHistory(5);data.profiles.push({...data.profiles[0]});anchors.members[1].memberId=anchors.members[2].memberId;anchors.members.pop();data.profiles.push({employee_no:'ORPHAN'});const r=checkHistory(data,anchors);assert.equal(r.mappings[0].status,'ambiguous');assert.equal(r.mappings[1].status,'ambiguous');assert.equal(r.mappings[4].status,'unmapped');assert(r.findings.some(f=>f.code==='PROFILE_WITHOUT_LOGIN_ACCOUNT'));});
test('illegal leap date, duplicate checkins and unsupported historical fields are quarantined',()=>{const {data,anchors}=syntheticHistory(1),uid=anchors.users[0].userId;data.checkins.push({id:'1',user_id:uid,checkin_date:'2023-02-29',checkin_time:'2023-02-29T04:00:00Z',continuous_days:0,is_continuous:true,reward_points:-1});for(const id of ['2','3'])data.checkins.push({id,user_id:uid,checkin_date:'2024-02-29',checkin_time:'2024-02-29T04:00:00Z',continuous_days:1,is_continuous:false,reward_points:1});data.strategies[0].difficulty=99;const codes=checkHistory(data,anchors).findings.map(f=>f.code);assert(codes.includes('INVALID_DATE_STREAK_OR_REWARD'));assert(codes.includes('DUPLICATE_CHECKIN_FACT'));assert(codes.includes('INCOMPATIBLE_STRATEGY_FIELDS'));});
test('legacy positive delta + direction 1/2 balances are checked; mismatch and duplicate rewards are retained',()=>{const {data,anchors}=syntheticHistory(1),uid=anchors.users[0].userId;data.ledger.push({id:'1',user_id:uid,biz_id:'reward-1',direction:1,point_delta:'2',balance_before:'0',balance_after:'2',event_type:'checkin',ext_json:{checkin_date:'2024-02-29'}},{id:'2',user_id:uid,biz_id:'reward-1',direction:1,point_delta:'2',balance_before:'2',balance_after:'4',event_type:'checkin',ext_json:{checkin_date:'2024-02-29'}});data.pointAccounts[0].balance='3';const codes=checkHistory(data,anchors).findings.map(f=>f.code);assert(codes.includes('DUPLICATE_OR_MISSING_BUSINESS_ID'));assert(codes.includes('DUPLICATE_CHECKIN_REWARD'));assert(codes.includes('BALANCE_LEDGER_INCONSISTENT'));});
test('duplicate redemption/refund and unrelated origin cannot produce a migration candidate',()=>{const {data,anchors}=syntheticHistory(1),uid=anchors.users[0].userId;const order={id:'1',order_no:'SYN-ORDER',user_id:uid,point_cost:'1',status:'cancelled'};data.orders.push(order,{...order,id:'2'});data.ledger.push(...[1,2].map(i=>({id:String(i),user_id:uid,biz_id:'refund-'+i,direction:1,point_delta:'1',balance_before:String(i-1),balance_after:String(i),event_type:'refund',ext_json:{order_no:'SYN-ORDER',origin_biz_id:'missing'}})));const codes=checkHistory(data,anchors).findings.map(f=>f.code);for(const c of ['DUPLICATE_REDEMPTION','DUPLICATE_REFUND','UNLINKED_OR_INVALID_REFUND','ORDER_LEDGER_STATUS_UNPROVEN'])assert(codes.includes(c));});
test('no synthetic markers or independent anchor source: refuse real-data-shaped input',()=>{const {data,anchors}=syntheticHistory(1);delete data.kind;assert.throws(()=>checkHistory(data,anchors));data.kind='jinxi-synthetic-history-v1';anchors.proofSource='nickname-match';assert.throws(()=>checkHistory(data,anchors));});
test('rule versions/effective dates and repeated reversal origins require manual reconciliation',()=>{const {data,anchors}=syntheticHistory(1),uid=anchors.users[0].userId;data.rules.push({id:'1',rule_code:'old',version:1,status:'active',point_delta:1,start_at:'2024-03-01T00:00:00Z',end_at:'2024-02-01T00:00:00Z'});data.ledger.push({id:'1',user_id:uid,biz_id:'original',direction:2,point_delta:'1',balance_before:'1',balance_after:'0'},...[2,3].map(i=>({id:String(i),user_id:uid,biz_id:'reverse-'+i,direction:1,point_delta:'1',balance_before:String(i-2),balance_after:String(i-1),rule_code:'unknown',event_type:'reversal',ext_json:{origin_biz_id:'original'}})));const codes=checkHistory(data,anchors).findings.map(f=>f.code);assert(codes.includes('RULE_EFFECTIVE_TIME_OR_FIELDS_UNPROVEN'));assert(codes.includes('HISTORICAL_RULE_VERSION_UNPROVEN'));assert(codes.includes('DUPLICATE_COMPENSATION'));});
test('safe SQL SERIAL numbers preserve exact source IDs; unsafe IDs must be quarantined',()=>{const {data,anchors}=syntheticHistory(1);data.strategies[0].id=1;let r=checkHistory(data,anchors);assert.equal(r.candidates[0].sourceId,'1');data.strategies[0].id=Number.MAX_SAFE_INTEGER+1;anchors.records[0].id=data.strategies[0].id;r=checkHistory(data,anchors);assert.equal(r.candidates.length,0);assert(r.findings.some(f=>f.code==='UNSUPPORTED_SOURCE_ID'));});
test('two old user IDs for one trusted UUID cannot hide same-day rewards or independently trusted balances',()=>{const {data,anchors}=syntheticHistory(1),first=anchors.users[0].userId,alias='synthetic-alias';anchors.users.push({userId:alias,accountId:anchors.members[0].accountId});data.pointAccounts[0].balance='2';data.pointAccounts.push({user_id:alias,balance:'2',total_earned:'2',total_spent:'0'});data.ledger.push(...[first,alias].map((user_id,i)=>({id:String(i+1),user_id,biz_id:'reward-'+i,direction:1,point_delta:'2',balance_before:'0',balance_after:'2',event_type:'checkin',ext_json:{checkin_date:'2024-02-29'}})));const r=checkHistory(data,anchors),codes=r.findings.map(f=>f.code);assert(codes.includes('DUPLICATE_CHECKIN_REWARD'));assert(codes.includes('MULTIPLE_LEGACY_FINANCIAL_IDENTITIES'));assert.equal(data.pointAccounts.length,2);});
test('UUID case variants cannot give two historical accounts the same PostgreSQL identity',()=>{const {data,anchors}=syntheticHistory(2),id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';anchors.members[0].memberId=id;anchors.members[1].memberId=id.toUpperCase();const r=checkHistory(data,anchors);assert.equal(r.summary.trusted,0);assert(r.findings.some(f=>f.code==='TRUST_BINDING_CONFLICT'));});
test('nested credential fields are rejected before producing a report',()=>{const {data,anchors}=syntheticHistory(1);data.accounts[0].password_hash='synthetic-field-that-must-not-be-imported';assert.throws(()=>checkHistory(data,anchors),/HISTORY_SENSITIVE_FIELD_REJECTED/);});
test('duplicate numeric/string forms of one source ID are quarantined before staging',()=>{const {data,anchors}=syntheticHistory(1);data.strategies.push({...data.strategies[0],id:1});const r=checkHistory(data,anchors);assert.equal(r.candidates.length,0);assert(r.findings.some(f=>f.code==='DUPLICATE_SOURCE_ID'));});
test('an unsafe numeric author anchor cannot claim a lossless text source ID',()=>{
 const {data,anchors}=syntheticHistory(1);
 data.strategies[0].id='9007199254740992';
 anchors.records[0].id=JSON.parse('9007199254740993');
 const report=checkHistory(data,anchors);
 assert.equal(report.candidates.length,0);
 assert(report.findings.some(f=>f.entity==='strategies'&&f.code==='LOSSY_AUTHOR_BINDING_AMBIGUITY'));
});
test('exact large text source IDs stay distinct across authors even when Number would round them together',()=>{
 const {data,anchors}=syntheticHistory(2), ids=['9007199254740992','9007199254740993'];
 data.strategies=ids.map(id=>({...data.strategies[0],id}));
 anchors.records=ids.map((id,i)=>({kind:'strategies',id,accountId:anchors.members[i].accountId})).reverse();
 const report=checkHistory(data,anchors);
 assert.deepEqual(report.candidates.map(r=>[r.sourceId,r.memberId]),ids.map((id,i)=>[id,anchors.members[i].memberId]));
});
test('an invalid author anchor is reported separately from independent exact evidence',()=>{
 const {data,anchors}=syntheticHistory(2);
 data.strategies[0].id='9007199254740992';anchors.records[0].id=data.strategies[0].id;
 anchors.records.push({...anchors.records[0],accountId:anchors.members[1].accountId,id:JSON.parse('9007199254740993')});
 const report=checkHistory(data,anchors);
 assert.deepEqual(report.candidates,[]);
 assert(report.findings.some(f=>f.entity==='recordBinding'&&f.ref==='1'&&f.code==='UNSUPPORTED_BINDING_SOURCE_ID'&&f.status==='unmapped'));
});
test('unsafe numeric source rows quarantine matching text IDs only within the same content type',()=>{
 const {data,anchors}=syntheticHistory(2);
 const textId='9007199254740993', roundedId=JSON.parse(textId), original=data.strategies[0];
 data.strategies=[{...original,id:textId},{...original,id:'9007199254740992'},{...original,id:roundedId}];
 data.messages=[{id:textId}];
 anchors.records=[
  {kind:'strategies',id:textId,accountId:anchors.members[0].accountId},
  {kind:'strategies',id:'9007199254740992',accountId:anchors.members[1].accountId},
  {kind:'messages',id:textId,accountId:anchors.members[1].accountId},
 ];
 const report=checkHistory(data,anchors);
 assert.deepEqual(report.candidates,[{kind:'messages',sourceId:textId,memberId:anchors.members[1].memberId}]);
 assert.deepEqual(report.findings.filter(f=>f.code==='LOSSY_SOURCE_ID_AMBIGUITY').map(f=>f.ref),[textId,'9007199254740992']);
 assert(report.findings.some(f=>f.entity==='strategies'&&f.code==='UNSUPPORTED_SOURCE_ID'));
});

test('the legacy SQL order number matches the debit business ID without metadata order_no',()=>{
 const {data,anchors,order}=syntheticLegacyRedemption();
 const report=checkHistory(data,anchors);
 assert.deepEqual(report.findings.filter(f=>['order','ledger','pointAccount'].includes(f.entity)),[]);
 assert(!report.candidates.some(c=>c.sourceId===order.id&&c.kind==='order'));
});
test('a cancelled legacy order can link an exact refund by original business ID',()=>{
 const {data,anchors,order,charge}=syntheticLegacyRedemption();
 order.status='cancelled';
 const refund={id:'2',user_id:order.user_id,biz_id:'SYN-REFUND',event_type:'refund',direction:1,
  point_delta:'2',balance_before:'0',balance_after:'2',ext_json:{origin_biz_id:charge.biz_id}};
 data.ledger.push(refund);
 assert.deepEqual(checkHistory(data,anchors).findings.filter(f=>f.entity==='order'),[]);
 order.status='pending';
 assert(checkHistory(data,anchors).findings.some(f=>f.entity==='order'&&f.code==='ORDER_LEDGER_STATUS_UNPROVEN'));
 order.status='cancelled';
 refund.ext_json.order_no='SYN-DIFFERENT';
 assert(checkHistory(data,anchors).findings.some(f=>f.entity==='order'&&f.code==='UNLINKED_OR_INVALID_REFUND'));
 refund.ext_json.order_no=order.order_no;
 refund.id=charge.id;
 assert(checkHistory(data,anchors).findings.some(f=>f.entity==='order'&&f.code==='UNLINKED_OR_INVALID_REFUND'));
});
test('an unrelated debit or conflicting order metadata cannot establish a legacy charge',()=>{
 const {data,anchors,order,charge}=syntheticLegacyRedemption();
 charge.ext_json.order_no=order.order_no;
 charge.event_type='unrelated';
 const codes=()=>checkHistory(data,anchors).findings.filter(f=>f.entity==='order').map(f=>f.code);
 assert(codes().includes('ORDER_LEDGER_STATUS_UNPROVEN'));
 charge.event_type='item_exchange';
 charge.ext_json.order_no='SYN-DIFFERENT';
 assert(codes().includes('ORDER_LEDGER_STATUS_UNPROVEN'));
 charge.ext_json.order_no=order.order_no;
 charge.ext_json.item_code='different-synthetic-reward';
 assert(codes().includes('ORDER_LEDGER_STATUS_UNPROVEN'));
 data.orders.length=0;
 assert(checkHistory(data,anchors).findings.some(f=>f.entity==='ledger'&&f.code==='UNMATCHED_REDEMPTION_DEBIT'));
});
test('legacy debits need the fixed consumption code and reversals need independent review',()=>{
 const {data,anchors,order,charge}=syntheticLegacyRedemption();
 const orderCodes=()=>checkHistory(data,anchors).findings.filter(f=>f.entity==='order').map(f=>f.code);
 charge.rule_code='';
 assert(orderCodes().includes('ORDER_LEDGER_STATUS_UNPROVEN'));
 charge.rule_code='redeem.item_exchange.consume';
 const returnEntry={id:'2',user_id:order.user_id,biz_id:'SYN-REVERSAL',direction:1,point_delta:'2',
  balance_before:'0',balance_after:'2',ext_json:{origin_biz_id:charge.biz_id}};
 for(const event_type of ['reverse','reversal']){
  data.ledger[1]={...returnEntry,event_type};
  for(const status of ['success','cancelled']){
   order.status=status;
   const codes=orderCodes();
   assert(codes.includes('ORDER_REVERSAL_POLICY_UNPROVEN'));
   assert(codes.includes('ORDER_LEDGER_STATUS_UNPROVEN'));
  }
 }
});

test('equal closing balances cannot hide inconsistent cumulative earnings or spending',()=>{
 const {data,anchors,charge}=syntheticLegacyRedemption();
 const credit={...charge,id:'9007199254740992',biz_id:'SYN-CREDIT',scene:'synthetic',event_type:'award',
  rule_code:'',direction:1,balance_before:'0',balance_after:'2',ext_json:{}};
 charge.id='9007199254740993';
 data.ledger.push(credit);
 anchors.members[0].openingBalance='0';
 anchors.members[0].openingTotalEarned='0';
 assert.deepEqual(checkHistory(data,anchors).findings.filter(f=>f.entity==='pointAccount'),[]);
 data.pointAccounts[0].total_earned='3';
 data.pointAccounts[0].total_spent='3';
 const report=checkHistory(data,anchors);
 assert(report.findings.some(f=>f.code==='ACCOUNT_COUNTERS_LEDGER_INCONSISTENT'));
 assert(!report.findings.some(f=>f.code==='BALANCE_LEDGER_INCONSISTENT'));
});
test('nonzero opening counters reconcile exactly as bigint; missing or contradictory evidence is explicit',()=>{
 const {data,anchors}=syntheticLegacyRedemption();
 const start=anchors.members[0], account=data.pointAccounts[0];
 Object.assign(start,{openingTotalEarned:'9007199254740995',openingTotalSpent:'9007199254740993'});
 Object.assign(account,{total_earned:'9007199254740995',total_spent:'9007199254740995'});
 const codes=()=>checkHistory(data,anchors).findings.filter(f=>f.entity==='pointAccount').map(f=>f.code);
 assert.deepEqual(codes(),[]);
 account.total_spent='9007199254740996';
 assert(codes().includes('ACCOUNT_COUNTERS_LEDGER_INCONSISTENT'));
 delete start.openingTotalSpent;
 assert(codes().includes('OPENING_ACCOUNT_COUNTERS_UNPROVEN'));
 start.openingTotalSpent='9007199254740994';
 assert(codes().includes('OPENING_ACCOUNT_COUNTERS_INCONSISTENT'));
});
test('duplicate source rows and orphan movements cannot establish complete ledger evidence',()=>{
 const {data,anchors,charge}=syntheticLegacyRedemption();
 data.pointAccounts.push({...data.pointAccounts[0]});
 data.ledger.push({...charge,id:charge.id,biz_id:'SYN-OTHER-MOVEMENT'});
 const codes=()=>checkHistory(data,anchors).findings.map(f=>f.code);
 for(const code of ['DUPLICATE_POINT_ACCOUNT','DUPLICATE_LEDGER_ID','ACCOUNT_LEDGER_ROWS_UNPROVEN'])assert(codes().includes(code));
 data.pointAccounts.length=0;
 assert(codes().includes('LEDGER_ACCOUNT_MISSING'));
});
test('a zero movement breaks ledger evidence even when it leaves balances untouched',()=>{
 const {data,anchors,charge}=syntheticLegacyRedemption();
 data.ledger.push({...charge,id:'2',biz_id:'SYN-ZERO',scene:'synthetic',event_type:'note',rule_code:'',
  point_delta:'0',balance_before:'0',balance_after:'0',ext_json:{}});
 const codes=checkHistory(data,anchors).findings.map(f=>f.code);
 for(const code of ['INVALID_LEDGER_FIELDS','ACCOUNT_LEDGER_ROWS_UNPROVEN','BALANCE_LEDGER_INCONSISTENT'])assert(codes.includes(code));
});
test('legacy compensation never confirms cumulative counters without separate policy evidence',()=>{
 const {data,anchors,order,charge}=syntheticLegacyRedemption();
 order.status='cancelled';
 data.ledger.push({id:'2',user_id:order.user_id,biz_id:'SYN-REFUND',event_type:'refund',direction:1,
  point_delta:'2',balance_before:'0',balance_after:'2',ext_json:{origin_biz_id:charge.biz_id}});
 Object.assign(data.pointAccounts[0],{balance:'2',total_earned:'4'});
 const report=checkHistory(data,anchors);
 assert(report.findings.some(f=>f.entity==='pointAccount'&&f.code==='ACCOUNT_COMPENSATION_COUNTERS_UNPROVEN'));
 assert(!report.findings.some(f=>f.code==='ACCOUNT_COUNTERS_LEDGER_INCONSISTENT'));
});
test('a single exported account cannot reuse opening evidence when another alias is known',()=>{
 const {data,anchors,order,charge}=syntheticLegacyRedemption();
 const alias='synthetic-absent-from-original-snapshot';
 anchors.users.push({userId:alias,accountId:anchors.members[0].accountId});
 data.pointAccounts[0].user_id=order.user_id=charge.user_id=alias;
 const report=checkHistory(data,anchors);
 assert.equal(report.summary.trusted,1);
 assert(report.findings.some(f=>f.entity==='pointAccount'&&f.ref===alias&&f.code==='OPENING_ACCOUNT_ALIAS_UNPROVEN'));
 assert(!report.candidates.some(c=>c.kind==='pointAccount'));
});

test('the legacy checkin SQL award links only by exact date, original user, amount and streak',()=>{
 const {data,anchors,award}=syntheticLegacyCheckin();
 const before=JSON.stringify({data,anchors});
 const matched=checkHistory(data,anchors);
 assert.deepEqual(matched.findings.filter(f=>f.entity!=='messages').map(f=>f.code),['HISTORICAL_RULE_VERSION_UNPROVEN']);
 assert.deepEqual(matched.candidates.map(row=>row.kind),['strategies']);
 assert.equal(JSON.stringify({data,anchors}),before);
 const snapshots=[
  {...award,scene:'unrelated'},
  {...award,direction:2,balance_before:'2',balance_after:'0'},
  {...award,point_delta:'3',balance_after:'3'},
  {...award,ext_json:{...award.ext_json,continuous_days:4}},
  {...award,ext_json:{checkin_date:award.ext_json.checkin_date}},
 ];
 for(const changed of snapshots){
  data.ledger[0]=changed;
  const report=checkHistory(data,anchors);
  assert.deepEqual(report.findings.filter(f=>f.code==='CHECKIN_REWARD_LINK_CONFLICT').map(f=>f.entity).sort(),['checkin','ledger']);
  assert.deepEqual(report.candidates,matched.candidates);
 }
 data.ledger[0]=award;
 anchors.users.push({userId:'synthetic-checkin-alias',accountId:anchors.members[0].accountId});
 award.user_id='synthetic-checkin-alias';
 assert(checkHistory(data,anchors).findings.some(f=>f.entity==='ledger'&&f.code==='CHECKIN_REWARD_LINK_CONFLICT'));
});

test('checkin reconciliation reports missing links, ambiguous days, and invalid award metadata',()=>{
 const {data,anchors,fact,award}=syntheticLegacyCheckin();
 const matches=(entity,code)=>checkHistory(data,anchors).findings.filter(f=>f.entity===entity&&f.code===code).map(f=>f.ref);
 data.ledger=[];
 assert.deepEqual(matches('checkin','CHECKIN_REWARD_WITHOUT_LEDGER'),[fact.id]);
 fact.reward_points=0;
 assert.deepEqual(matches('checkin','CHECKIN_REWARD_WITHOUT_LEDGER'),[]);
 fact.reward_points=2;
 data.ledger=[award];
 data.checkins=[];
 assert.deepEqual(matches('ledger','CHECKIN_REWARD_WITHOUT_FACT'),[award.id]);
 data.checkins=[fact];
 award.ext_json.checkin_date='2024-02-30';
 assert.deepEqual(matches('ledger','CHECKIN_REWARD_DATE_UNPROVEN'),[award.id]);
 award.ext_json.checkin_date=fact.checkin_date;
 anchors.users.push({userId:'synthetic-checkin-alias',accountId:anchors.members[0].accountId});
 data.checkins.push({...fact,id:'2',user_id:'synthetic-checkin-alias'});
 assert.deepEqual(matches('checkin','DUPLICATE_CHECKIN_FACT'),['1','2']);
 assert.deepEqual(matches('ledger','CHECKIN_REWARD_LINK_AMBIGUOUS'),[award.id]);
 data.checkins.pop();
 data.ledger.push({...award,id:'2',biz_id:'SYN-CHECKIN-OTHER',user_id:'synthetic-checkin-alias'});
 assert.deepEqual(matches('ledger','DUPLICATE_CHECKIN_REWARD'),['1','2']);
 assert.deepEqual(matches('checkin','CHECKIN_REWARD_LINK_AMBIGUOUS'),[fact.id]);
});

test('a reused business ID or a missing legacy user cannot prove a checkin reward',()=>{
 const {data,anchors,fact,award}=syntheticLegacyCheckin();
 data.ledger.push({...award,id:'2',event_type:'unrelated'});
 const conflicts=()=>checkHistory(data,anchors).findings.filter(f=>f.code==='CHECKIN_REWARD_LINK_CONFLICT').map(f=>f.entity).sort();
 assert.deepEqual(conflicts(),['checkin','ledger']);
 data.ledger.pop();
 delete anchors.users[0].userId;
 delete fact.user_id;
 delete award.user_id;
 data.checkins.push({...fact,id:'2',user_id:null});
 const unbound=checkHistory(data,anchors).findings;
 assert.equal(unbound.filter(f=>f.code==='UNPROVEN_CHECKIN_SUBJECT').length,2);
 assert(unbound.some(f=>f.code==='UNPROVEN_LEDGER_SUBJECT'));
 assert(!unbound.some(f=>f.code==='DUPLICATE_CHECKIN_FACT'));
});

test('legacy checkin facts enforce serial identifiers and PostgreSQL integer fields',()=>{
 const {data,anchors,fact}=syntheticLegacyCheckin();
 const codes=()=>checkHistory(data,anchors).findings.filter(f=>f.entity==='checkin').map(f=>f.code);
 for(const id of [1,'2147483647']){
  fact.id=id;
  assert.deepEqual(codes(),[]);
 }
 for(const id of ['synthetic-text-not-serial','2147483648',0,undefined]){
  fact.id=id;
  assert(codes().includes('INVALID_CHECKIN_ID'));
  assert(codes().includes('CHECKIN_REWARD_LINK_CONFLICT'));
 }
 data.ledger.length=0;
 fact.reward_points=0;
 assert(codes().includes('INVALID_CHECKIN_ID'));
 fact.id=1;
 fact.reward_points=2147483648;
 assert(codes().includes('INVALID_DATE_STREAK_OR_REWARD'));
 fact.reward_points=0;
 fact.continuous_days=2147483648;
 assert(codes().includes('INVALID_DATE_STREAK_OR_REWARD'));
 fact.continuous_days=3;
 data.checkins.push({...fact,id:'1',checkin_date:'2024-03-01',checkin_time:'2024-03-01T04:00:00Z'});
 assert.deepEqual(codes(),['DUPLICATE_CHECKIN_ID','DUPLICATE_CHECKIN_ID']);
});

test('a matching legacy reward still reports a missing rule code',()=>{
 const {data,anchors,award}=syntheticLegacyCheckin();
 delete award.rule_code;
 const report=checkHistory(data,anchors);
 assert(report.findings.some(f=>f.entity==='ledger'&&f.code==='HISTORICAL_RULE_VERSION_UNPROVEN'));
 assert(!report.findings.some(f=>f.code==='CHECKIN_REWARD_LINK_CONFLICT'));
});

test('a malformed historical fact can also be missing its reward ledger row',()=>{
 const {data,anchors,fact}=syntheticLegacyCheckin();
 data.ledger=[];
 fact.continuous_days=0;
 const report=checkHistory(data,anchors);
 assert.deepEqual(report.findings.filter(f=>f.entity==='checkin').map(f=>f.code),
  ['INVALID_DATE_STREAK_OR_REWARD','CHECKIN_REWARD_WITHOUT_LEDGER']);
});
