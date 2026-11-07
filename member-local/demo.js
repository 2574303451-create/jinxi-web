// Credentials/session/CSRF stay in memory or HttpOnly cookies, never localStorage.
const element=id=>document.getElementById(id);
let state=null,generation=0,busy=false;
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('jinxi-member-local-refresh'):null;
function message(text,error=false){const node=element('status');node.textContent=text;node.setAttribute('role',error?'alert':'status');}
function display(value){state=value;element('login').hidden=!!state;element('member').hidden=!state;element('profile-data').replaceChildren();if(state){element('identity').textContent=state.member.displayName;element('reset-note').textContent=state.needsPasswordChange?'首次登录需要先改密；当前只允许核验、改密与退出。':'身份已由本机服务器验证。';element('profile').disabled=state.needsPasswordChange;}}
function accept(value){if(value?.syntheticOnly!==true||typeof value.member?.id!=='string'||typeof value.member.displayName!=='string'||typeof value.csrfToken!=='string'||typeof value.needsPasswordChange!=='boolean')throw Error('会话响应暂不可用。');return value;}
async function request(op,body){
  const response=await fetch('/api/member'+(body?'':'?op='+op),{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',headers:body?{'Content-Type':'application/json',...(state?{'X-CSRF-Token':state.csrfToken}:{})}:undefined,body:body?JSON.stringify({op,...body}):undefined});
  const result=await response.json();
  if(response.status===401)display(null);
  if(!response.ok)throw Error(response.status===401?'账号或会话无效，请重新核验。':response.status===429?'请求频繁，请稍后重试。':response.status===503?'身份服务暂不可用，草稿保留。':result.code==='PASSWORD_RESET_REQUIRED'?'首次登录需要先修改密码。':'请求未获授权或输入无效。');
  return result;
}
async function restore(){const ticket=++generation;try{const value=accept(await request('me'));if(ticket!==generation)return;display(value);message('服务器会话已恢复。');}catch(error){if(ticket!==generation)return;display(null);message(error instanceof TypeError?'网络中断，身份尚未核验；草稿保留。':error.message,true);}}
async function perform(work){if(busy)return;busy=true;generation++;element('member').setAttribute('aria-busy','true');for(const b of document.querySelectorAll('button'))b.disabled=true;try{await work();}catch(error){if(error instanceof TypeError)display(null);message(error instanceof TypeError?'网络中断，身份尚未核验；草稿保留。':error.message,true);}finally{busy=false;element('member').removeAttribute('aria-busy');for(const b of document.querySelectorAll('button'))b.disabled=false;element('profile').disabled=!state||state.needsPasswordChange;}}
element('login').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{const value=accept(await request('login',{account:element('account').value,password:element('password').value}));element('password').value='';display(value);message(value.needsPasswordChange?'首次登录：请先修改密码。':'合成成员登录成功。');element('refresh').focus();channel?.postMessage('refresh');});});
element('change').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{await request('change-password',{currentPassword:element('current').value,newPassword:element('next').value});element('current').value='';element('next').value='';display(null);message('密码已修改，所有旧会话已撤销，请重新登录。');channel?.postMessage('refresh');});});
element('logout').addEventListener('click',()=>void perform(async()=>{await request('logout',{});display(null);message('此会话已撤销，草稿保留。');element('password').focus();channel?.postMessage('refresh');}));
element('refresh').addEventListener('click',()=>void restore());
element('profile').addEventListener('click',()=>void perform(async()=>{const result=await request('profile'),list=element('profile-data');list.replaceChildren();for(const[label,value]of [['昵称',result.profile.nickname],['成员标识',result.member.id],['身份标签',result.profile.role],['入会日期',result.profile.joinedOn||'—']]){const term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=label;definition.textContent=value;list.append(term,definition);}message('仅已登录成员的本人资料。');}));
try{element('draft').value=localStorage.getItem('jinxi-member-local-draft-v1')||'';}catch{}
element('draft').addEventListener('input',()=>{try{localStorage.setItem('jinxi-member-local-draft-v1',element('draft').value);}catch{message('草稿存储暂不可用，文本仍保留在页面。',true);}});
channel?.addEventListener('message',()=>{if(!busy)void restore();});
window.addEventListener('online',()=>void restore());window.addEventListener('focus',()=>{if(!busy)void restore();});
void restore();
