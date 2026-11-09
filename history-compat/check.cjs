// Offline, read-only classification. Input is synthetic only; no DB/DSN loader exists.
const crypto=require('node:crypto');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const integer=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v)&&BigInt(v)<=9223372036854775807n;
const day=v=>typeof v==='string'&&/^(?!0000)\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&day(v.slice(0,10))&&Number.isFinite(Date.parse(v));
const sourceId=v=>{const value=Number.isSafeInteger(v)?String(v):v;return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(value)?value:null;};
const ref=(v,i)=>sourceId(v)||'row-'+i;
function groups(rows,key){const map=new Map();for(const row of rows){const k=key(row);if(!map.has(k))map.set(k,[]);map.get(k).push(row);}return map;}
function checkHistory(data,anchors){
 if(data?.kind!=='jinxi-synthetic-history-v1'||anchors?.kind!=='jinxi-synthetic-bindings-v1'||anchors.proofSource!=='synthetic-authoritative-fixture')throw Error('SYNTHETIC_HISTORY_AND_SEPARATE_BINDINGS_REQUIRED');
 const stack=[data,anchors];let nodes=0;while(stack.length){const value=stack.pop();if(value&&typeof value==='object'){if(++nodes>200000)throw Error('HISTORY_SHAPE_REJECTED');for(const[key,child]of Object.entries(value)){if(/password|csrf|token|credential|private.?key|connection.?string|^dsn$/i.test(key))throw Error('HISTORY_SENSITIVE_FIELD_REJECTED');if(child&&typeof child==='object')stack.push(child);}}}
 const names=['profiles','accounts','messages','strategies','checkins','pointAccounts','ledger','orders','rules','announcements','sponsorships'];
 if(names.some(k=>!Array.isArray(data[k])||data[k].length>10000||data[k].some(r=>!r||typeof r!=='object'||Array.isArray(r)))||!Array.isArray(anchors.members)||!Array.isArray(anchors.users)||!Array.isArray(anchors.records)||[...Object.keys(data),...Object.keys(anchors)].some(k=>/password|token|dsn|credential/i.test(k)))throw Error('HISTORY_SHAPE_REJECTED');
 const findings=[],mappings=[],subjects=new Map(),candidates=[];
 const add=(entity,id,code,status='ambiguous')=>findings.push({entity,ref:ref(id,findings.length),code,status});
 const profiles=groups(data.profiles,r=>r.employee_no),accounts=groups(data.accounts,r=>r.employee_no),ids=groups(data.accounts,r=>r.id),bindings=groups(anchors.members,r=>r.accountId),uuids=groups(anchors.members,r=>typeof r.memberId==='string'?r.memberId.toLowerCase():null);
 for(const [i,a]of data.accounts.entries()){
  const p=profiles.get(a.employee_no)||[],b=bindings.get(a.id)||[],reasons=[];
  if(!integer(a.id)||a.id==='0'||typeof a.employee_no!=='string'||!a.employee_no.length||a.employee_no.length>64)reasons.push('INVALID_LEGACY_IDENTIFIER');
  if(p.length!==1||(accounts.get(a.employee_no)||[]).length!==1||(ids.get(a.id)||[]).length!==1)reasons.push('DUPLICATE_OR_MISSING_EMPLOYEE_MAPPING');
  if(b.length!==1)reasons.push(b.length?'DUPLICATE_TRUST_BINDING':'MISSING_TRUST_BINDING');
  if(b.length===1&&(b[0].employeeNo!==a.employee_no||!uuid(b[0].memberId)||(uuids.get(b[0].memberId.toLowerCase())||[]).length!==1))reasons.push('TRUST_BINDING_CONFLICT');
  const status=reasons.length?reasons.every(r=>r==='MISSING_TRUST_BINDING')?'unmapped':'ambiguous':'trusted';
  const row={legacyAccountId:ref(a.id,i),employeeNo:ref(a.employee_no,i),memberId:status==='trusted'?b[0].memberId.toLowerCase():null,status,reasons};mappings.push(row);subjects.set(a.id,row);for(const reason of reasons)add('account',a.id,reason,status);
 }
 for(const [i,p]of data.profiles.entries())if(!(accounts.get(p.employee_no)||[]).length)add('profile',p.employee_no||String(i),'PROFILE_WITHOUT_LOGIN_ACCOUNT','unmapped');
 const userBindings=groups(anchors.users,r=>r.userId),records=groups(anchors.records,r=>r.kind+':'+r.id);
 function owner(userId){const rows=userBindings.get(userId)||[];if(rows.length!==1)return null;const s=subjects.get(rows[0].accountId);return s?.status==='trusted'?s:null;}
 const contentIds=Object.fromEntries(['messages','strategies'].map(kind=>[kind,groups(data[kind],r=>sourceId(r.id))]));
 for(const kind of ['messages','strategies'])for(const [i,row]of data[kind].entries()){
  if(sourceId(row.id)===null){add(kind,String(i),'UNSUPPORTED_SOURCE_ID','unmapped');continue;}
  if(contentIds[kind].get(sourceId(row.id)).length!==1){add(kind,row.id,'DUPLICATE_SOURCE_ID');continue;}
  const b=records.get(kind+':'+row.id)||[],s=b.length===1?subjects.get(b[0].accountId):null;
  if(s?.status!=='trusted')add(kind,row.id||String(i),b.length>1?'AUTHOR_BINDING_CONFLICT':'NO_TRUSTED_AUTHOR','unmapped');
  else candidates.push({kind,sourceId:ref(row.id,i),memberId:s.memberId});
  if(kind==='strategies'&&(!['PVE','PVP','新手向','老玩家回归','装备','战力系统'].includes(row.category)||!Number.isInteger(row.difficulty)||row.difficulty<1||row.difficulty>5))add(kind,row.id,'INCOMPATIBLE_STRATEGY_FIELDS');
 }
 const days=new Map();
 for(const row of data.checkins){const s=owner(row.user_id);if(!s)add('checkin',row.id,'UNPROVEN_CHECKIN_SUBJECT','unmapped');if(anchors.datePolicy!=='synthetic-clock-v1')add('checkin',row.id,'HISTORICAL_DATE_POLICY_UNPROVEN');
  if(!day(row.checkin_date)||!instant(row.checkin_time)||!Number.isInteger(row.continuous_days)||row.continuous_days<1||typeof row.is_continuous!=='boolean'||row.is_continuous!==(row.continuous_days>1)||!Number.isInteger(row.reward_points)||row.reward_points<0)add('checkin',row.id,'INVALID_DATE_STREAK_OR_REWARD');
  if(s&&day(row.checkin_date)){const k=s.memberId+':'+row.checkin_date;if(days.has(k))add('checkin',row.id,'DUPLICATE_CHECKIN_FACT');days.set(k,row);}
 }
 const ledgerGroups=groups(data.ledger,r=>r.user_id),biz=groups(data.ledger,r=>r.biz_id),rewardKeys=new Set();
 const ruleVersions=groups(data.rules,r=>r.rule_code+':'+r.version),compensations=groups(data.ledger.filter(r=>['refund','reverse','reversal'].includes(r.event_type)),r=>r.ext_json?.origin_biz_id);
 for(const row of data.rules){if(!Number.isInteger(row.version)||row.version<1||!['draft','active','inactive'].includes(row.status)||!Number.isInteger(row.point_delta)||row.point_delta<1||!instant(row.start_at)||row.end_at!==null&&(!instant(row.end_at)||Date.parse(row.end_at)<=Date.parse(row.start_at)))add('rule',row.id,'RULE_EFFECTIVE_TIME_OR_FIELDS_UNPROVEN');if(row.daily_cap===0||row.total_cap===0)add('rule',row.id,'ZERO_CAP_SEMANTIC_REVIEW_REQUIRED');if((ruleVersions.get(row.rule_code+':'+row.version)||[]).length>1)add('rule',row.id,'DUPLICATE_RULE_VERSION');}
 for(const row of data.ledger){
  if(!owner(row.user_id))add('ledger',row.id,'UNPROVEN_LEDGER_SUBJECT','unmapped');
  if(!integer(row.id)||![1,2].includes(row.direction)||!integer(row.point_delta)||row.point_delta==='0'||!integer(row.balance_before)||!integer(row.balance_after))add('ledger',row.id,'INVALID_LEDGER_FIELDS');
  else if(BigInt(row.balance_before)+(row.direction===1?1n:-1n)*BigInt(row.point_delta)!==BigInt(row.balance_after))add('ledger',row.id,'LEDGER_DIRECTION_OR_BALANCE_MISMATCH');
  if(typeof row.biz_id!=='string'||!row.biz_id||(biz.get(row.biz_id)||[]).length>1)add('ledger',row.id,'DUPLICATE_OR_MISSING_BUSINESS_ID');
  if(row.event_type==='checkin'&&day(row.ext_json?.checkin_date)){const k=(owner(row.user_id)?.memberId||'unmapped:'+row.user_id)+':'+row.ext_json.checkin_date;if(rewardKeys.has(k))add('ledger',row.id,'DUPLICATE_CHECKIN_REWARD');rewardKeys.add(k);}
  if(row.rule_code&&!(Number.isInteger(row.ext_json?.rule_version)&&(ruleVersions.get(row.rule_code+':'+row.ext_json.rule_version)||[]).length===1))add('ledger',row.id,'HISTORICAL_RULE_VERSION_UNPROVEN');
  if(['refund','reverse','reversal'].includes(row.event_type)){const origin=biz.get(row.ext_json?.origin_biz_id)||[];if(origin.length!==1||origin[0].user_id!==row.user_id||origin[0].direction===row.direction||origin[0].point_delta!==row.point_delta)add('ledger',row.id,'UNLINKED_COMPENSATION_OR_REVERSAL');if((compensations.get(row.ext_json?.origin_biz_id)||[]).length>1)add('ledger',row.id,'DUPLICATE_COMPENSATION');}
 }
 const financialIdentities=groups([...data.pointAccounts,...data.ledger],r=>owner(r.user_id)?.memberId||null);
 for(const [member,rows]of financialIdentities)if(member&&new Set(rows.map(r=>r.user_id)).size>1)add('pointAccount',member,'MULTIPLE_LEGACY_FINANCIAL_IDENTITIES');
 for(const a of data.pointAccounts){const s=owner(a.user_id);if(!integer(a.total_earned)||!integer(a.total_spent))add('pointAccount',a.user_id,'INVALID_ACCOUNT_COUNTERS');if(!s){add('pointAccount',a.user_id,'UNPROVEN_BALANCE_SUBJECT','unmapped');continue;}
  const anchor=bindings.get(s.legacyAccountId)?.[0],rows=(ledgerGroups.get(a.user_id)||[]).slice();
  if(!integer(a.balance)||!integer(anchor?.openingBalance)){add('pointAccount',a.user_id,'BALANCE_OR_OPENING_ANCHOR_UNPROVEN');continue;}
  let balance=BigInt(anchor.openingBalance);let ok=true;rows.sort((a,b)=>integer(a.id)&&integer(b.id)?BigInt(a.id)<BigInt(b.id)?-1:1:0);
  for(const row of rows){if(![1,2].includes(row.direction)||!integer(row.point_delta)||!integer(row.balance_before)||!integer(row.balance_after)){ok=false;continue;}if(BigInt(row.balance_before)!==balance)ok=false;balance+=(row.direction===1?1n:-1n)*BigInt(row.point_delta);if(balance!==BigInt(row.balance_after)||balance<0n)ok=false;}
  if(!ok||balance!==BigInt(a.balance))add('pointAccount',a.user_id,'BALANCE_LEDGER_INCONSISTENT');
 }
 const orderNo=groups(data.orders,r=>r.order_no);
 for(const row of data.orders){if(!owner(row.user_id))add('order',row.id,'UNPROVEN_ORDER_SUBJECT','unmapped');if(!integer(row.id)||!integer(row.point_cost)||row.point_cost==='0'||!['pending','success','failed','cancelled'].includes(row.status))add('order',row.id,'INVALID_ORDER_FIELDS');if((orderNo.get(row.order_no)||[]).length!==1)add('order',row.id,'DUPLICATE_REDEMPTION');
  const movement=data.ledger.filter(l=>l.ext_json?.order_no===row.order_no),charges=movement.filter(l=>l.direction===2),refunds=movement.filter(l=>l.event_type==='refund');
  if(charges.length>1)add('order',row.id,'DUPLICATE_ORDER_CHARGE');if(refunds.length>1)add('order',row.id,'DUPLICATE_REFUND');
  if(refunds.some(l=>l.direction!==1||charges.length!==1||l.ext_json?.origin_biz_id!==charges[0].biz_id||l.point_delta!==charges[0].point_delta||l.user_id!==row.user_id))add('order',row.id,'UNLINKED_OR_INVALID_REFUND');
  if(charges.length!==1||charges[0]?.point_delta!==row.point_cost||charges[0]?.user_id!==row.user_id||row.status==='cancelled'&&refunds.length!==1||row.status==='success'&&refunds.length!==0)add('order',row.id,'ORDER_LEDGER_STATUS_UNPROVEN');
 }
 for(const row of data.announcements){add('announcement',row.id,'LEGACY_AUTHOR_AND_PUBLICATION_POLICY_UNPROVEN','unmapped');if(!instant(row.created_at)||!instant(row.updated_at)||typeof row.content_html!=='string')add('announcement',row.id,'INVALID_ANNOUNCEMENT_FIELDS');}
 for(const row of data.sponsorships){if(!instant(row.sponsor_time))add('sponsorship',row.id,'INVALID_SPONSOR_TIME');add('sponsorship',row.id,'SOURCE_AUDIT_REQUIRED','unmapped');}
 const safeCandidates=candidates.filter(c=>!findings.some(f=>f.entity===c.kind&&f.ref===c.sourceId));
 return {kind:'jinxi-history-report-v1',syntheticOnly:true,inputSha256:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),sourceCounts:Object.fromEntries(names.map(k=>[k,data[k].length])),mappings,findings,candidates:safeCandidates,summary:{trusted:mappings.filter(m=>m.status==='trusted').length,ambiguous:mappings.filter(m=>m.status==='ambiguous').length,unmapped:mappings.filter(m=>m.status==='unmapped').length,findings:findings.length},noProductionMigration:true};
}
module.exports={checkHistory,integer,day,instant};
