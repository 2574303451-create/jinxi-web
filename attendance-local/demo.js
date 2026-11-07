const el=id=>document.getElementById(id),pending=new Map();
let member=null,loading=false,sending=false,generation=0,cursor=null,hasToday=false;
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('jinxi-member-local-refresh'):null;
function notice(text,error=false){el('notice').textContent=text;el('notice').setAttribute('role',error?'alert':'status');}
function clearPrivate(){el('private').hidden=true;el('stats').replaceChildren();el('history').replaceChildren();el('today').textContent='';el('state').textContent='正在核验或请先登录。';}
function controls(){
 el('session').textContent=loading?'正在核验身份…':member?member.member.displayName+(member.needsPasswordChange?' · 需要先改密':' · 已由服务器核验'):'游客 · 请先登录';
 el('checkin').disabled=loading||sending||!member||member.needsPasswordChange||hasToday&&!pending.has(member.member.id);
 el('checkin').textContent=loading?'正在核验…':member&&pending.has(member.member.id)?'重试原签到请求':hasToday?'今日已签到':'签到';
 el('older').disabled=loading||sending||!cursor;el('latest').disabled=loading||sending;el('month').disabled=loading||sending;
}
function setMember(value){if(member?.member.id!==value?.member.id){cursor=null;el('month').value='';hasToday=false;}member=value;}
async function request(url,options={}){
 const r=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000),...options}),body=await r.json();
 if(!r.ok){const error=Error(body.code||'REQUEST_REJECTED');error.status=r.status;throw error;}return body;
}
async function identity(){try{return await request('/api/member?op=me');}catch(e){if(e.status===401)return null;throw e;}}
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function render(data){
 hasToday=data.hasCheckedToday;el('today').textContent='业务日期：'+data.today+' · '+data.businessTimeZone;el('state').textContent=hasToday?'今日已签到':'今日未签到';
 const stats=el('stats');stats.replaceChildren();for(const [label,value]of [['累计签到',data.stats.totalDays+' 天'],['当前连续',data.stats.currentStreak+' 天'],['最长连续',data.stats.longestStreak+' 天'],[data.stats.month+' 签到',data.stats.monthDays+' 天'],['奖励状态','未结算']])stats.append(node('dt',label),node('dd',value));
 const history=el('history');history.replaceChildren();if(!data.history.length)history.append(node('p','当前历史页暂无记录。'));
 for(const record of data.history){const row=node('article');row.className='history-row';row.dataset.id=record.id;row.append(node('strong',record.businessDate),node('p','连续 '+record.continuousDays+' 天 · 奖励未结算'));history.append(row);}
 cursor=data.nextBefore;el('private').hidden=false;
}
function readableError(e){if(e.status===401)return '身份已失效，请重新登录。';if(e.message==='PASSWORD_RESET_REQUIRED')return '请先完成首次改密。';if(e.message==='ACCOUNT_CHANGED_REQUEST_NOT_REPLAYED')return '账号已切换，原签到请求未发送；请核验后再操作。';if(e.status===400)return '读取条件无效，请检查月份。';return '本机签到暂不可用，请重新核验；未确认的请求不会自动重放。';}
async function load(latest=true,completion=null){
 const ticket=++generation;if(latest)cursor=null;loading=true;clearPrivate();notice('正在核验本人签到状态…');controls();
 try{
  const current=await identity();if(ticket!==generation)return;setMember(current);
  if(!member){hasToday=false;notice('请先通过本机身份页登录。');return;}
  if(member.needsPasswordChange)throw Object.assign(Error('PASSWORD_RESET_REQUIRED'),{status:403});
  const actor=member.member.id,query=new URLSearchParams();if(el('month').value)query.set('month',el('month').value);if(cursor)query.set('before',cursor);
  const data=await request('/api/attendance'+(query.size?'?'+query:''));if(ticket!==generation)return;
  if(data.memberId!==actor)throw Error('PRIVATE_RESPONSE_REJECTED');render(data);
  notice(completion?.actor===actor?completion.text:pending.has(actor)?'原请求结果待确认，请重试原签到请求。':'本人记录已由服务器复核，奖励未结算。');
 }catch(e){if(ticket===generation){setMember(null);hasToday=false;cursor=null;clearPrivate();notice(readableError(e),true);}}
 finally{if(ticket===generation){loading=false;controls();}}
}
async function checkin(){
 if(loading||sending||!member||member.needsPasswordChange)return;
 const actor=member.member.id,ticket=++generation,id=pending.get(actor)||crypto.randomUUID();let completion=null,submitted=false;
 sending=true;loading=true;clearPrivate();controls();
 try{
  const current=await identity();if(ticket!==generation)return;setMember(current);
  if(!member)throw Object.assign(Error('SIGN_IN_REQUIRED'),{status:401});
  if(member.needsPasswordChange)throw Object.assign(Error('PASSWORD_RESET_REQUIRED'),{status:403});
  if(member.member.id!==actor)throw Object.assign(Error('ACCOUNT_CHANGED_REQUEST_NOT_REPLAYED'),{status:403});
  pending.set(actor,id);submitted=true;
  const result=await request('/api/attendance',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':member.csrfToken},body:JSON.stringify({op:'checkin',requestId:id})});
  pending.delete(actor);if(ticket!==generation||member?.member.id!==actor)return;
  completion={actor,text:(result.outcome==='checked'?'签到已记录：':result.outcome==='replayed'?'原请求已确认：':'当日已签到：')+result.checkedDate+'。'+(result.hasCheckedToday?'当前业务日已签到。':'当前业务日尚未签到，可另行发起今日签到。')+'奖励未结算。'};
 }catch(e){
  if(submitted&&e.status>=400&&e.status<500)pending.delete(actor);
  if(ticket===generation){clearPrivate();completion={actor,text:submitted&&(!e.status||e.status>=500)?'原请求结果待确认，请重试原签到请求。':readableError(e)};}
 }finally{sending=false;if(ticket===generation)loading=false;controls();await load(true,completion);}
}
el('checkin').addEventListener('click',()=>void checkin());el('reload').addEventListener('click',()=>void load());el('latest').addEventListener('click',()=>void load());el('older').addEventListener('click',()=>void load(false));el('month').addEventListener('change',()=>void load());
channel?.addEventListener('message',()=>void load());window.addEventListener('online',()=>void load());window.addEventListener('focus',()=>void load());
controls();void load();
