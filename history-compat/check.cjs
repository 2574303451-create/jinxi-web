// Offline, read-only classification. Input is synthetic only; no DB/DSN loader exists.
const crypto=require('node:crypto');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const integer=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v)&&BigInt(v)<=9223372036854775807n;
const day=v=>typeof v==='string'&&/^(?!0000)\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&day(v.slice(0,10))&&Number.isFinite(Date.parse(v));
const sourceId=v=>{const value=Number.isSafeInteger(v)?String(v):v;return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(value)?value:null;};
const isLossyId=id=>Number.isInteger(id)&&!Number.isSafeInteger(id);
function exactAccountId(id){
 const value=Number.isSafeInteger(id)?String(id):id;
 return integer(value)&&value!=='0'?value:null;
}
const ref=(v,i)=>sourceId(v)||'row-'+i;
function groups(rows,key){const map=new Map();for(const row of rows){const k=key(row);if(!map.has(k))map.set(k,[]);map.get(k).push(row);}return map;}
const nonBlankText=value=>typeof value==='string'&&value.trim().length>0;
function isLegacyOrderDebit(row){
 return row.direction===2&&row.scene==='redeem'&&row.event_type==='item_exchange';
}
const isCompensation=row=>['refund','reverse','reversal'].includes(row.event_type);
function hasValidMovement(row){
 return integer(row.id)&&[1,2].includes(row.direction)&&integer(row.point_delta)&&row.point_delta!=='0'&&
  integer(row.balance_before)&&integer(row.balance_after)&&
  BigInt(row.balance_before)+(row.direction===1?1n:-1n)*BigInt(row.point_delta)===BigInt(row.balance_after);
}
const checkinIntMax=2147483647;
function checkinId(id){
 const value=Number.isSafeInteger(id)?String(id):id;
 return integer(value)&&value!=='0'&&BigInt(value)<=BigInt(checkinIntMax)?value:null;
}
const validCheckinReward=value=>Number.isInteger(value)&&value>=0&&value<=checkinIntMax;
function validCheckin(row){
 return day(row.checkin_date)&&instant(row.checkin_time)&&
  Number.isInteger(row.continuous_days)&&row.continuous_days>=1&&row.continuous_days<=checkinIntMax&&
  row.is_continuous===(row.continuous_days>1)&&
  validCheckinReward(row.reward_points);
}
function checkCheckinAwards({checkins,ledger},{owner,add,businessIds,ledgerIds,datePolicy}){
 // Use the verified member only to detect ambiguity across legacy aliases.
 // perform_checkin_v2 writes the same original user ID and date to both rows.
 const key=(userId,date)=>{
  const member=owner(userId);
  return JSON.stringify(member?['member',member.memberId,date]:['legacy',userId,date]);
 };
 const facts=groups(checkins.filter(row=>nonBlankText(row.user_id)&&day(row.checkin_date)),row=>key(row.user_id,row.checkin_date));
 const awards=ledger.filter(row=>row.event_type==='checkin');
 const rewards=groups(awards.filter(row=>nonBlankText(row.user_id)&&day(row.ext_json?.checkin_date)),
  row=>key(row.user_id,row.ext_json.checkin_date));
 const factIds=groups(checkins,row=>checkinId(row.id));
 for(const row of checkins){
  const id=checkinId(row.id);
  if(id===null)add('checkin',row.id,'INVALID_CHECKIN_ID');
  else if(factIds.get(id).length>1)add('checkin',row.id,'DUPLICATE_CHECKIN_ID');
  if(!owner(row.user_id))add('checkin',row.id,'UNPROVEN_CHECKIN_SUBJECT','unmapped');
  if(datePolicy!=='synthetic-clock-v1')add('checkin',row.id,'HISTORICAL_DATE_POLICY_UNPROVEN');
  if(!validCheckin(row))add('checkin',row.id,'INVALID_DATE_STREAK_OR_REWARD');
 }
 for(const row of awards){
  if(!day(row.ext_json?.checkin_date))add('ledger',row.id,'CHECKIN_REWARD_DATE_UNPROVEN');
 }
 for(const token of new Set([...facts.keys(),...rewards.keys()])){
  const signIns=facts.get(token)||[],credits=rewards.get(token)||[];
  if(signIns.length>1)for(const row of signIns)add('checkin',row.id,'DUPLICATE_CHECKIN_FACT');
  if(credits.length>1)for(const row of credits)add('ledger',row.id,'DUPLICATE_CHECKIN_REWARD');
  if(!signIns.length){
   for(const row of credits)add('ledger',row.id,'CHECKIN_REWARD_WITHOUT_FACT');
   continue;
  }
  if(!credits.length){
   for(const row of signIns)if(validCheckinReward(row.reward_points)&&row.reward_points>0)add('checkin',row.id,'CHECKIN_REWARD_WITHOUT_LEDGER');
   continue;
  }
  if(signIns.length!==1||credits.length!==1){
   for(const row of signIns)add('checkin',row.id,'CHECKIN_REWARD_LINK_AMBIGUOUS');
   for(const row of credits)add('ledger',row.id,'CHECKIN_REWARD_LINK_AMBIGUOUS');
   continue;
  }
  const [fact]=signIns,[award]=credits,factId=checkinId(fact.id);
  const linked=factId!==null&&factIds.get(factId).length===1&&validCheckin(fact)&&owner(fact.user_id)&&
   award.user_id===fact.user_id&&award.scene==='daily_behavior'&&award.direction===1&&hasValidMovement(award)&&
   ledgerIds.get(award.id).length===1&&nonBlankText(award.biz_id)&&businessIds.get(award.biz_id).length===1&&
   award.point_delta===String(fact.reward_points)&&award.ext_json.continuous_days===fact.continuous_days;
  if(!linked){
   add('checkin',fact.id,'CHECKIN_REWARD_LINK_CONFLICT');
   add('ledger',award.id,'CHECKIN_REWARD_LINK_CONFLICT');
  }
 }
}
function checkOrders(orders,ledger,businessIds,owner,add){
 const byNumber=groups(orders,r=>r.order_no);
 const byExplicitOrder=groups(ledger.filter(r=>nonBlankText(r.ext_json?.order_no)),r=>r.ext_json.order_no);
 const compensationByOrigin=groups(ledger.filter(r=>isCompensation(r)&&nonBlankText(r.ext_json?.origin_biz_id)),r=>r.ext_json.origin_biz_id);
 for(const row of ledger){
  if(isLegacyOrderDebit(row)&&nonBlankText(row.biz_id)&&!byNumber.has(row.biz_id))add('ledger',row.id,'UNMATCHED_REDEMPTION_DEBIT');
 }
 for(const row of orders){
  if(!owner(row.user_id))add('order',row.id,'UNPROVEN_ORDER_SUBJECT','unmapped');
  if(!integer(row.id)||!integer(row.point_cost)||row.point_cost==='0'||!nonBlankText(row.order_no)||
   !nonBlankText(row.item_code)||!['pending','success','failed','cancelled'].includes(row.status))add('order',row.id,'INVALID_ORDER_FIELDS');
  if(byNumber.get(row.order_no).length!==1)add('order',row.id,'DUPLICATE_REDEMPTION');
  if(!nonBlankText(row.order_no)){add('order',row.id,'ORDER_LEDGER_STATUS_UNPROVEN');continue;}

  // point_create_redeem_order uses order_no as point_spend's biz_id; order_no is absent from its ledger JSON.
  const businessRows=businessIds.get(row.order_no)||[],explicitRows=byExplicitOrder.get(row.order_no)||[];
  const charges=[...new Set([...businessRows,...explicitRows].filter(r=>r.direction===2))];
  const orderCompensations=[...new Set([...(compensationByOrigin.get(row.order_no)||[]),...explicitRows.filter(isCompensation)])];
  const refunds=orderCompensations.filter(r=>r.event_type==='refund');
  const needsReversalReview=orderCompensations.length!==refunds.length;
  if(charges.length>1)add('order',row.id,'DUPLICATE_ORDER_CHARGE');
  if(refunds.length>1)add('order',row.id,'DUPLICATE_REFUND');
  if(needsReversalReview)add('order',row.id,'ORDER_REVERSAL_POLICY_UNPROVEN');
  const charge=charges.length===1&&businessRows.length===1?charges[0]:null;
  const debitProven=charge&&isLegacyOrderDebit(charge)&&hasValidMovement(charge)&&charge.biz_id===row.order_no&&
   charge.rule_code==='redeem.item_exchange.consume'&&
   charge.user_id===row.user_id&&charge.point_delta===row.point_cost&&
   charge.ext_json?.item_code===row.item_code&&
   (charge.ext_json?.order_no===undefined||charge.ext_json.order_no===row.order_no);
  const refundInvalid=refunds.some(refund=>!debitProven||refund.direction!==1||!hasValidMovement(refund)||
   !nonBlankText(refund.biz_id)||businessIds.get(refund.biz_id).length!==1||
   BigInt(refund.id)<=BigInt(charge.id)||
   refund.user_id!==row.user_id||refund.point_delta!==row.point_cost||
   refund.ext_json?.origin_biz_id!==row.order_no||
   (refund.ext_json?.order_no!==undefined&&refund.ext_json.order_no!==row.order_no));
  if(refundInvalid)add('order',row.id,'UNLINKED_OR_INVALID_REFUND');
  const refundsExpected=['cancelled','failed'].includes(row.status)?1:0;
  if(!debitProven||refundInvalid||needsReversalReview||refunds.length!==refundsExpected)add('order',row.id,'ORDER_LEDGER_STATUS_UNPROVEN');
 }
}
function checkPointAccounts(data,{bindings,usersByAccount,lossyUserBindings,owner,add,businessIds,ledgerIds}){
 const accountsByUser=groups(data.pointAccounts,r=>r.user_id);
 const ledgerByUser=groups(data.ledger,r=>r.user_id);
 const financialIdentities=groups([...data.pointAccounts,...data.ledger],r=>owner(r.user_id)?.memberId||null);
 const ambiguousOpeningAccounts=new Set();
 for(const [accountId,aliases]of usersByAccount){
  if(aliases.some(alias=>alias.userId!==aliases[0].userId))ambiguousOpeningAccounts.add(accountId);
 }
 for(const [member,rows]of financialIdentities){
  if(member&&new Set(rows.map(r=>r.user_id)).size>1){
   add('pointAccount',member,'MULTIPLE_LEGACY_FINANCIAL_IDENTITIES');
  }
 }
 for(const userId of ledgerByUser.keys()){
  if(!accountsByUser.has(userId))add('pointAccount',userId,'LEDGER_ACCOUNT_MISSING');
 }
 for(const [userId,accounts]of accountsByUser){
  if(accounts.length!==1)add('pointAccount',userId,'DUPLICATE_POINT_ACCOUNT');
  const rows=ledgerByUser.get(userId)||[];
  const validRows=rows.filter(hasValidMovement).sort((a,b)=>a.id===b.id?0:BigInt(a.id)<BigInt(b.id)?-1:1);
  const rowsProven=validRows.length===rows.length&&rows.every(row=>ledgerIds.get(row.id).length===1&&
   nonBlankText(row.biz_id)&&businessIds.get(row.biz_id).length===1);
  if(!rowsProven)add('pointAccount',userId,'ACCOUNT_LEDGER_ROWS_UNPROVEN');
  if(accounts.some(a=>!integer(a.total_earned)||!integer(a.total_spent)))add('pointAccount',userId,'INVALID_ACCOUNT_COUNTERS');
  const subject=owner(userId);
  if(!subject){add('pointAccount',userId,'UNPROVEN_BALANCE_SUBJECT','unmapped');continue;}
  if(accounts.length!==1)continue;
  if(ambiguousOpeningAccounts.has(subject.legacyAccountId)||lossyUserBindings.has(Number(subject.legacyAccountId))){
   add('pointAccount',userId,'OPENING_ACCOUNT_ALIAS_UNPROVEN');continue;
  }
  const [account]=accounts;
  const anchor=bindings.get(subject.legacyAccountId)?.[0];
  if(!integer(account.balance)||!integer(anchor?.openingBalance)){
   add('pointAccount',userId,'BALANCE_OR_OPENING_ANCHOR_UNPROVEN');continue;
  }
  const openingBalance=BigInt(anchor.openingBalance);
  let balance=openingBalance,earned=0n,spent=0n;
  let chainMatches=validRows.length===rows.length;
  for(const row of validRows){
   const delta=BigInt(row.point_delta);
   chainMatches&&=balance===BigInt(row.balance_before);
   if(row.direction===1){earned+=delta;balance+=delta;}
   else{spent+=delta;balance-=delta;}
   chainMatches&&=balance>=0n&&balance===BigInt(row.balance_after);
  }
  if(!chainMatches||balance!==BigInt(account.balance))add('pointAccount',userId,'BALANCE_LEDGER_INCONSISTENT');
  if(!integer(anchor.openingTotalEarned)||!integer(anchor.openingTotalSpent)){
   add('pointAccount',userId,'OPENING_ACCOUNT_COUNTERS_UNPROVEN');continue;
  }
  const openingEarned=BigInt(anchor.openingTotalEarned),openingSpent=BigInt(anchor.openingTotalSpent);
  if(openingEarned-openingSpent!==openingBalance){
   add('pointAccount',userId,'OPENING_ACCOUNT_COUNTERS_INCONSISTENT');continue;
  }
  // The legacy earn/spend SQL increments gross counters. It does not establish the counter policy for a compensation.
  if(rows.some(isCompensation)){add('pointAccount',userId,'ACCOUNT_COMPENSATION_COUNTERS_UNPROVEN');continue;}
  if(rowsProven&&integer(account.total_earned)&&integer(account.total_spent)&&
   (openingEarned+earned!==BigInt(account.total_earned)||openingSpent+spent!==BigInt(account.total_spent))){
   add('pointAccount',userId,'ACCOUNT_COUNTERS_LEDGER_INCONSISTENT');
  }
 }
}
function checkHistory(data,anchors){
 if(data?.kind!=='jinxi-synthetic-history-v1'||anchors?.kind!=='jinxi-synthetic-bindings-v1'||anchors.proofSource!=='synthetic-authoritative-fixture')throw Error('SYNTHETIC_HISTORY_AND_SEPARATE_BINDINGS_REQUIRED');
 const stack=[data,anchors];let nodes=0;while(stack.length){const value=stack.pop();if(value&&typeof value==='object'){if(++nodes>200000)throw Error('HISTORY_SHAPE_REJECTED');for(const[key,child]of Object.entries(value)){if(/password|csrf|token|credential|private.?key|connection.?string|^dsn$/i.test(key))throw Error('HISTORY_SENSITIVE_FIELD_REJECTED');if(child&&typeof child==='object')stack.push(child);}}}
 const names=['profiles','accounts','messages','strategies','checkins','pointAccounts','ledger','orders','rules','announcements','sponsorships'];
 if(names.some(k=>!Array.isArray(data[k])||data[k].length>10000||data[k].some(r=>!r||typeof r!=='object'||Array.isArray(r)))||!Array.isArray(anchors.members)||!Array.isArray(anchors.users)||!Array.isArray(anchors.records)||[...Object.keys(data),...Object.keys(anchors)].some(k=>/password|token|dsn|credential/i.test(k)))throw Error('HISTORY_SHAPE_REJECTED');
 const findings=[],mappings=[],subjects=new Map(),candidates=[];
 const add=(entity,id,code,status='ambiguous')=>findings.push({entity,ref:ref(id,findings.length),code,status});
 const profiles=groups(data.profiles,r=>r.employee_no),accounts=groups(data.accounts,r=>r.employee_no);
 const ids=groups(data.accounts,r=>exactAccountId(r.id)),bindings=groups(anchors.members,r=>exactAccountId(r.accountId));
 const uuids=groups(anchors.members,r=>typeof r.memberId==='string'?r.memberId.toLowerCase():null);
 // Rounded numbers flag contradictions only. They never establish an identity.
 const lossyAccountIds=new Set(data.accounts.map(r=>r.id).filter(isLossyId));
 const lossyMemberBindings=new Set(anchors.members.map(r=>r.accountId).filter(isLossyId));
 const lossyUserBindings=new Set(anchors.users.map(r=>r.accountId).filter(isLossyId));
 for(const [entity,rows] of [['memberBinding',anchors.members],['userBinding',anchors.users],['recordBinding',anchors.records]]){
  for(const [i,binding] of rows.entries()){
   if(!exactAccountId(binding.accountId))add(entity,String(i),'UNSUPPORTED_ACCOUNT_REFERENCE','unmapped');
  }
 }
 for(const [i,a]of data.accounts.entries()){
  const id=exactAccountId(a.id),p=profiles.get(a.employee_no)||[],b=id?(bindings.get(id)||[]):[],reasons=[];
  if(!id||typeof a.employee_no!=='string'||!a.employee_no.length||a.employee_no.length>64)reasons.push('INVALID_LEGACY_IDENTIFIER');
  if(p.length!==1||(accounts.get(a.employee_no)||[]).length!==1||(id&&ids.get(id).length!==1))reasons.push('DUPLICATE_OR_MISSING_EMPLOYEE_MAPPING');
  if(id&&lossyAccountIds.has(Number(id)))reasons.push('LOSSY_ACCOUNT_ID_AMBIGUITY');
  if(id&&lossyMemberBindings.has(Number(id)))reasons.push('LOSSY_MEMBER_BINDING_AMBIGUITY');
  if(b.length!==1)reasons.push(b.length?'DUPLICATE_TRUST_BINDING':'MISSING_TRUST_BINDING');
  if(b.length===1&&(b[0].employeeNo!==a.employee_no||!uuid(b[0].memberId)||(uuids.get(b[0].memberId.toLowerCase())||[]).length!==1))reasons.push('TRUST_BINDING_CONFLICT');
  const status=reasons.length?reasons.every(r=>r==='MISSING_TRUST_BINDING')?'unmapped':'ambiguous':'trusted';
  const row={legacyAccountId:id||ref(a.id,i),employeeNo:ref(a.employee_no,i),memberId:status==='trusted'?b[0].memberId.toLowerCase():null,status,reasons};
  mappings.push(row);if(id)subjects.set(id,row);for(const reason of reasons)add('account',a.id,reason,status);
 }
 for(const [i,p]of data.profiles.entries())if(!(accounts.get(p.employee_no)||[]).length)add('profile',p.employee_no||String(i),'PROFILE_WITHOUT_LOGIN_ACCOUNT','unmapped');
 const lossyBindings=new Set(anchors.records.filter(r=>isLossyId(r.id)).map(r=>r.kind+':'+r.id));
 for(const [i,r]of anchors.records.entries())if(sourceId(r.id)===null)add('recordBinding',String(i),'UNSUPPORTED_BINDING_SOURCE_ID','unmapped');
 const userBindings=groups(anchors.users,r=>r.userId),usersByAccount=groups(anchors.users,r=>exactAccountId(r.accountId)),records=groups(anchors.records.filter(r=>sourceId(r.id)!==null),r=>r.kind+':'+sourceId(r.id));
 function owner(userId){if(!nonBlankText(userId))return null;const rows=userBindings.get(userId)||[];if(rows.length!==1)return null;const s=subjects.get(exactAccountId(rows[0].accountId));return s?.status==='trusted'?s:null;}
 const contentKinds=['messages','strategies'];
 const contentIds=Object.fromEntries(contentKinds.map(kind=>[kind,groups(data[kind],r=>sourceId(r.id))]));
 const lossySources=new Set(contentKinds.flatMap(kind=>data[kind].filter(r=>isLossyId(r.id)).map(r=>kind+':'+r.id)));
 for(const kind of contentKinds)for(const [i,row]of data[kind].entries()){
  if(sourceId(row.id)===null){add(kind,String(i),'UNSUPPORTED_SOURCE_ID','unmapped');continue;}
  if(contentIds[kind].get(sourceId(row.id)).length!==1){add(kind,row.id,'DUPLICATE_SOURCE_ID');continue;}
  if(typeof row.id==='string'&&/^-?\d+$/.test(row.id)){
   const roundedKey=kind+':'+Number(row.id);
   if(lossySources.has(roundedKey)){add(kind,row.id,'LOSSY_SOURCE_ID_AMBIGUITY');continue;}
   if(lossyBindings.has(roundedKey)){add(kind,row.id,'LOSSY_AUTHOR_BINDING_AMBIGUITY');continue;}
  }
  const b=records.get(kind+':'+row.id)||[],s=b.length===1?subjects.get(exactAccountId(b[0].accountId)):null;
  if(s?.status!=='trusted')add(kind,row.id||String(i),b.length>1?'AUTHOR_BINDING_CONFLICT':'NO_TRUSTED_AUTHOR','unmapped');
  else candidates.push({kind,sourceId:ref(row.id,i),memberId:s.memberId});
  if(kind==='strategies'&&(!['PVE','PVP','新手向','老玩家回归','装备','战力系统'].includes(row.category)||!Number.isInteger(row.difficulty)||row.difficulty<1||row.difficulty>5))add(kind,row.id,'INCOMPATIBLE_STRATEGY_FIELDS');
 }
 const ledgerIds=groups(data.ledger,r=>r.id),biz=groups(data.ledger,r=>r.biz_id);
 checkCheckinAwards(data,{owner,add,businessIds:biz,ledgerIds,datePolicy:anchors.datePolicy});
 const ruleVersions=groups(data.rules,r=>r.rule_code+':'+r.version),compensations=groups(data.ledger.filter(isCompensation),r=>r.ext_json?.origin_biz_id);
 for(const row of data.rules){if(!Number.isInteger(row.version)||row.version<1||!['draft','active','inactive'].includes(row.status)||!Number.isInteger(row.point_delta)||row.point_delta<1||!instant(row.start_at)||row.end_at!==null&&(!instant(row.end_at)||Date.parse(row.end_at)<=Date.parse(row.start_at)))add('rule',row.id,'RULE_EFFECTIVE_TIME_OR_FIELDS_UNPROVEN');if(row.daily_cap===0||row.total_cap===0)add('rule',row.id,'ZERO_CAP_SEMANTIC_REVIEW_REQUIRED');if((ruleVersions.get(row.rule_code+':'+row.version)||[]).length>1)add('rule',row.id,'DUPLICATE_RULE_VERSION');}
 for(const row of data.ledger){
  if(!owner(row.user_id))add('ledger',row.id,'UNPROVEN_LEDGER_SUBJECT','unmapped');
  if(!integer(row.id)||![1,2].includes(row.direction)||!integer(row.point_delta)||row.point_delta==='0'||!integer(row.balance_before)||!integer(row.balance_after))add('ledger',row.id,'INVALID_LEDGER_FIELDS');
  else if(!hasValidMovement(row))add('ledger',row.id,'LEDGER_DIRECTION_OR_BALANCE_MISMATCH');
  if(integer(row.id)&&ledgerIds.get(row.id).length!==1)add('ledger',row.id,'DUPLICATE_LEDGER_ID');
  if(!nonBlankText(row.biz_id)||biz.get(row.biz_id).length>1)add('ledger',row.id,'DUPLICATE_OR_MISSING_BUSINESS_ID');
  const generatedDebitCode=isLegacyOrderDebit(row)&&row.rule_code==='redeem.item_exchange.consume';
  if(!generatedDebitCode&&(row.event_type==='checkin'||row.rule_code)&&
   !(nonBlankText(row.rule_code)&&Number.isInteger(row.ext_json?.rule_version)&&(ruleVersions.get(row.rule_code+':'+row.ext_json.rule_version)||[]).length===1)){
   add('ledger',row.id,'HISTORICAL_RULE_VERSION_UNPROVEN');
  }
  if(isCompensation(row)){const origin=biz.get(row.ext_json?.origin_biz_id)||[];if(origin.length!==1||origin[0].user_id!==row.user_id||origin[0].direction===row.direction||origin[0].point_delta!==row.point_delta)add('ledger',row.id,'UNLINKED_COMPENSATION_OR_REVERSAL');if((compensations.get(row.ext_json?.origin_biz_id)||[]).length>1)add('ledger',row.id,'DUPLICATE_COMPENSATION');}
 }
 checkPointAccounts(data,{bindings,usersByAccount,lossyUserBindings,owner,add,businessIds:biz,ledgerIds});
 checkOrders(data.orders,data.ledger,biz,owner,add);
 for(const row of data.announcements){add('announcement',row.id,'LEGACY_AUTHOR_AND_PUBLICATION_POLICY_UNPROVEN','unmapped');if(!instant(row.created_at)||!instant(row.updated_at)||typeof row.content_html!=='string')add('announcement',row.id,'INVALID_ANNOUNCEMENT_FIELDS');}
 for(const row of data.sponsorships){if(!instant(row.sponsor_time))add('sponsorship',row.id,'INVALID_SPONSOR_TIME');add('sponsorship',row.id,'SOURCE_AUDIT_REQUIRED','unmapped');}
 const safeCandidates=candidates.filter(c=>!findings.some(f=>f.entity===c.kind&&f.ref===c.sourceId));
 return {kind:'jinxi-history-report-v1',syntheticOnly:true,inputSha256:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),sourceCounts:Object.fromEntries(names.map(k=>[k,data[k].length])),mappings,findings,candidates:safeCandidates,summary:{trusted:mappings.filter(m=>m.status==='trusted').length,ambiguous:mappings.filter(m=>m.status==='ambiguous').length,unmapped:mappings.filter(m=>m.status==='unmapped').length,findings:findings.length},noProductionMigration:true};
}
module.exports={checkHistory,integer,day,instant};
