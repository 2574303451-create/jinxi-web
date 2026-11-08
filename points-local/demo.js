const el=id=>document.getElementById(id),pending=new Map();
let member=null,loading=false,sending=false,generation=0,boardCursor=null,ledgerCursor=null,ordersCursor=null;
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('jinxi-member-local-refresh'):null;
function notice(text,error=false){el('notice').textContent=text;el('notice').setAttribute('role',error?'alert':'status');}
function clearPrivate(){el('private').hidden=true;el('admin').hidden=true;for(const id of ['stats','ledger','orders','events','catalogue','board','rules','admin-orders','admin-awards'])el(id).replaceChildren();}
function setMember(value){if(member?.member.id!==value?.member.id){boardCursor=null;ledgerCursor=null;ordersCursor=null;el('metric').value='earned';el('rule-form').reset();el('item-form').reset();}member=value;}
function controls(){
 for(const n of document.querySelectorAll('#private button,#private input,#private select'))n.disabled=loading||sending;
 el('reload').disabled=loading||sending;el('retry').hidden=!member||!pending.has(member.member.id);el('retry').disabled=loading||sending||!member||member.needsPasswordChange;
 el('board-next').disabled=loading||sending||!boardCursor;el('ledger-next').disabled=loading||sending||!ledgerCursor;el('orders-next').disabled=loading||sending||!ordersCursor;
 el('session').textContent=loading?'正在核验身份…':member?member.member.displayName+(member.needsPasswordChange?' · 需要先改密':' · 已由服务器核验'):'游客 · 请先登录';
 if(member&&pending.has(member.member.id))for(const n of document.querySelectorAll('#private button,#private input,#private select'))n.disabled=true;
}
async function request(url,options={}){const r=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000),...options}),body=await r.json();if(!r.ok){const e=Error(body.code||'REQUEST_REJECTED');e.status=r.status;throw e;}return body;}
async function identity(){try{return await request('/api/member?op=me');}catch(e){if(e.status===401)return null;throw e;}}
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function button(label,body){const b=node('button',label);b.type='button';b.dataset.op=body.op;b.addEventListener('click',()=>void act(body));return b;}
function row(target,title,text){const a=node('article');a.append(node('strong',title),node('p',text));el(target).append(a);return a;}
const kindLabel={award:'签到奖励',redeem:'兑换扣减',refund:'原订单退款',reversal:'原奖励冲正'},orderLabel={pending:'待处理',fulfilled:'虚构完成',failed:'失败已退款',cancelled:'已取消并退款'};
function render(data,board){
 const stats=el('stats');for(const [name,value]of [['可用余额',data.account.balance],['累计毛获得',data.account.totalEarned],['净获得',data.account.netEarned],['净消费',data.account.totalSpent],['已退款',data.account.refunds],['已冲正',data.account.reversed]])stats.append(node('dt',name),node('dd',value+' 分'));el('listed').checked=data.account.listed;
 for(const e of data.events){const r=row('events',e.businessDate,e.status==='unsettled'?'未结算，金额由有效规则确定':e.status==='reversed'?'原奖励已冲正':'独立回执已结算 '+e.amount+' 分');r.dataset.eventId=e.eventId;if(e.status==='unsettled'){const b={op:'settle',eventId:e.eventId};if(data.rules.length===1)b.ruleId=data.rules[0].id;r.append(button('结算本次签到',b));}}
 if(!data.events.length)el('events').append(node('p','暂无签到事件，请先到本机签到页完成签到。'));
 for(const item of data.catalogue){const r=row('catalogue',item.name,'固定单价 '+item.unitCost+' 分 · 剩余 '+item.available+' · 每成员有效数量上限 '+item.perMemberLimit);r.dataset.itemId=item.id;const label=node('label','数量'),input=node('input');input.type='number';input.min='1';input.max='5';input.value='1';input.id='quantity-'+item.id;label.htmlFor=input.id;label.append(input);const b=node('button','创建虚构兑换订单');b.type='button';b.dataset.op='redeem';b.addEventListener('click',()=>void act({op:'redeem',itemId:item.id,quantity:Number(input.value)}));r.append(label,b);}
 if(!data.orders.length)el('orders').append(node('p','暂无本人兑换订单。'));for(const o of data.orders){const r=row('orders','订单 '+o.id.slice(0,8),orderLabel[o.status]+' · '+o.cost+' 分 · '+o.quantity+' 件');r.dataset.orderId=o.id;if(o.status==='pending')r.append(button('取消并原额退款',{op:'order.cancel',orderId:o.id}));}
 if(!data.ledger.length)el('ledger').append(node('p','暂无本人积分流水。'));for(const l of data.ledger){const r=row('ledger',kindLabel[l.kind],(l.direction===1?'+':'−')+l.pointDelta+' 分 · 本笔后余额 '+l.balanceAfter+' 分');r.dataset.ledgerId=l.id;}
 for(const e of board.entries)row('board',String(e.position)+' · '+e.label,e.score+' 分');if(!board.entries.length)el('board').append(node('p','此指标暂无符合展示条件的合成成员。'));boardCursor=board.nextCursor;ledgerCursor=data.nextLedgerBefore;ordersCursor=data.nextOrdersBefore;
 el('admin').hidden=!data.permissions.admin;
 if(data.permissions.admin){
  for(const r of data.rules){const a=row('rules',r.code+' · 版本 '+r.version,'状态 '+r.status+' · 连续奖励 '+[r.day1,r.day3,r.day7].join('/')+' · 每日/总限额 '+r.daily_cap+'/'+r.total_cap);a.dataset.ruleId=r.id;a.append(button(r.status==='enabled'?'停用此版本':'启用此版本',{op:'rule.status',ruleId:r.id,status:r.status==='enabled'?'disabled':'enabled'}));}
  for(const o of data.adminOrders){const a=row('admin-orders',o.ownerLabel+' · 订单 '+o.id.slice(0,8),o.cost+' 分 · 待处理');a.dataset.orderId=o.id;a.append(button('标记虚构完成',{op:'order.process',orderId:o.id,status:'fulfilled'}),button('标记失败并退款',{op:'order.process',orderId:o.id,status:'failed'}));}
  for(const a of data.adminAwards){const r=row('admin-awards',a.ownerLabel+' · 原签到奖励',a.amount+' 分');r.dataset.ledgerId=a.id;r.append(button('冲正原奖励',{op:'award.reverse',ledgerId:a.id}));}
 }
 el('private').hidden=false;
}
function readable(e){if(e.status===401)return '身份已失效，请重新登录。';if(e.message==='PASSWORD_RESET_REQUIRED')return '请先完成首次改密。';if(e.message==='ACCOUNT_CHANGED')return '账号已切换，原操作未发送；请核验后重新选择。';const known={INSUFFICIENT_BALANCE:'合成余额不足。',STOCK_LIMIT:'合成库存不足。',MEMBER_LIMIT:'已达每成员有效订单数量上限。',RULE_CONFLICT:'多个合成规则冲突，请管理员核对。',RULE_NOT_ACTIVE:'当前没有同时适用于该事实和结算时刻的有效规则。',DAILY_CAP:'已超出合成每日限额。',TOTAL_CAP:'已超出跨版本总限额。',RANK_CHANGED:'排行快照已改变，请返回最新。',ADMIN_REQUIRED:'此操作需要服务器认可的管理员权限。',ORDER_CLOSED:'订单已关闭，不能再次变更。',SETTLEMENT_CONFLICT:'原事件已有不同版本的结算回执。',RULE_VERSION_CONFLICT:'规则版本已改变，请重新核验。',ITEM_CONDITION:'尚未达到此虚构商品的条件。'};return known[e.message]||'本机积分请求未完成或未获允许，请重新核验。';}
async function load(options={}){
 const priorActor=member?.member.id,ticket=++generation;loading=true;clearPrivate();notice('正在核验本人账户与流水…');controls();
 try{
  const current=await identity();if(ticket!==generation)return;setMember(current);if(!member){notice('请先通过本机身份页登录。');return;}if(member.needsPasswordChange)throw Object.assign(Error('PASSWORD_RESET_REQUIRED'),{status:403});
  const actor=member.member.id,query=new URLSearchParams();if(priorActor===actor){if(options.beforeLedger)query.set('beforeLedger',options.beforeLedger);if(options.beforeOrders)query.set('beforeOrders',options.beforeOrders);}
  let data=await request('/api/points'+(query.size?'?'+query:''));if(ticket!==generation)return;if(data.memberId!==actor)throw Error('PRIVATE_RESPONSE_REJECTED');
  if(data.permissions.admin){data=await request('/api/points?view=admin');if(ticket!==generation)return;if(data.memberId!==actor)throw Error('PRIVATE_RESPONSE_REJECTED');}
  const boardQuery=new URLSearchParams({view:'board',metric:el('metric').value||'earned'});if(priorActor===actor&&options.boardCursor)boardQuery.set('cursor',options.boardCursor);const board=await request('/api/points?'+boardQuery);if(ticket!==generation)return;
  render(data,board);notice(options.completion?.actor===actor?options.completion.text:pending.has(actor)?'原请求结果待确认，请显式重试原请求；不会自动增加或扣减积分。':'本人账户与流水已由服务器复核；全部为合成数据。');
 }catch(e){if(ticket===generation){setMember(null);clearPrivate();notice(readable(e),true);}}
 finally{if(ticket===generation){loading=false;controls();}}
}
async function act(intent){
 if(loading||sending||!member||member.needsPasswordChange)return;const actor=member.member.id,body=pending.get(actor)||{...intent,requestId:crypto.randomUUID()},ticket=++generation;let completion=null,submitted=false;
 sending=true;loading=true;clearPrivate();controls();
 try{
  const current=await identity();if(ticket!==generation)return;setMember(current);if(!member)throw Object.assign(Error('SESSION_INVALID'),{status:401});if(member.needsPasswordChange)throw Object.assign(Error('PASSWORD_RESET_REQUIRED'),{status:403});if(member.member.id!==actor)throw Object.assign(Error('ACCOUNT_CHANGED'),{status:403});
  pending.set(actor,body);submitted=true;const result=await request('/api/points',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':member.csrfToken},body:JSON.stringify(body)});if(result.memberId!==actor)throw Error('PRIVATE_RESPONSE_REJECTED');pending.delete(actor);if(ticket!==generation)return;completion={actor,text:result.replayed?'原请求已确认；请以最新账户、订单与流水为准。':'合成操作已由服务器确认，请核对最新账户与流水。'};
 }catch(e){if(submitted&&e.status>=400&&e.status<500)pending.delete(actor);if(ticket===generation)completion={actor,text:submitted&&(!e.status||e.status>=500)?'原请求结果待确认，请重试原请求；不会自动重放。':readable(e)};}
 finally{sending=false;if(ticket===generation)loading=false;controls();await load({completion});}
}
el('reload').addEventListener('click',()=>void load());el('latest').addEventListener('click',()=>void load());el('retry').addEventListener('click',()=>{if(member&&pending.has(member.member.id))void act(pending.get(member.member.id));});
el('save-visibility').addEventListener('click',()=>void act({op:'visibility',listed:el('listed').checked}));el('metric').addEventListener('change',()=>void load());el('board-next').addEventListener('click',()=>void load({boardCursor}));el('ledger-next').addEventListener('click',()=>void load({beforeLedger:ledgerCursor}));el('orders-next').addEventListener('click',()=>void load({beforeOrders:ordersCursor}));
el('rule-form').addEventListener('submit',e=>{e.preventDefault();void act({op:'rule.create',code:el('r-code').value,version:Number(el('r-version').value),rewards:[Number(el('r-day1').value),Number(el('r-day3').value),Number(el('r-day7').value)],dailyCap:Number(el('r-daily').value),totalCap:Number(el('r-total').value),startsAt:el('r-from').value,endsAt:el('r-to').value,status:el('r-status').value});});
el('item-form').addEventListener('submit',e=>{e.preventDefault();void act({op:'catalogue.create',name:el('i-name').value,unitCost:Number(el('i-cost').value),stock:Number(el('i-stock').value),perMemberLimit:Number(el('i-limit').value),minEarned:Number(el('i-min').value),startsAt:el('r-from').value,endsAt:el('r-to').value,status:'enabled'});});
channel?.addEventListener('message',()=>void load());window.addEventListener('online',()=>void load());window.addEventListener('focus',()=>void load());controls();void load();
