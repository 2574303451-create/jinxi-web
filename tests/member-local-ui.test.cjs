const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../member-local/demo.js'),'utf8');
const session=(id='synthetic-one')=>({syntheticOnly:true,member:{id,displayName:'合成成员 '+id},csrfToken:'synthetic-csrf-'+id,needsPasswordChange:false});
const flush=()=>new Promise(resolve=>{setImmediate(resolve);});

// Run the real browser event handlers with controllable transport promises.
// This keeps request ordering deterministic without copying the state logic.
function page(){
  class Element{
    constructor(){this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.listeners={};}
    addEventListener(name,handler){this.listeners[name]=handler;}
    setAttribute(){}
    removeAttribute(){}
    focus(){}
    replaceChildren(){this.children=[];}
    append(...children){this.children.push(...children);}
    emit(name){this.listeners[name]?.({preventDefault(){}});}
  }
  const ids=['status','login','member','profile-data','identity','reset-note','profile','refresh','account','password','change','current','next','logout','draft','login-button','change-button'];
  const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
  elements.member.hidden=true;elements.account.value='synthetic-normal';elements.password.value='Synthetic-Password-123!';
  const events={},channels=[],requests=[],storage=new Map([['jinxi-member-local-draft-v1','保留的合成草稿']]);
  const buttons=['profile','refresh','logout','login-button','change-button'].map(id=>elements[id]);
  const sandbox={
    document:{getElementById:id=>elements[id],querySelectorAll:()=>buttons,createElement:()=>new Element()},
    window:{addEventListener:(name,handler)=>{events[name]=handler;}},
    BroadcastChannel:class{constructor(){channels.push(this);}addEventListener(name,handler){this[name]=handler;}postMessage(){}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({op:options.body?JSON.parse(options.body).op:new URL(url,'https://127.0.0.1:3069').searchParams.get('op'),resolve,reject});}),
    Error,TypeError,
  };
  vm.runInNewContext(source,sandbox,{filename:'member-local/demo.js'});
  return {
    elements,requests,
    event:name=>events[name]?.(),
    broadcast:()=>channels[0].message?.({data:'refresh'}),
    reply:async(index,status,payload={})=>{assert(requests[index],'Expected pending request '+index);requests[index].resolve({ok:status>=200&&status<300,status,json:async()=>payload});await flush();},
    fail:async(index)=>{requests[index].reject(new TypeError('synthetic network unavailable'));await flush();},
  };
}
async function signedIn(){const p=page();await p.reply(0,200,session());return p;}

test('online during login waits for the new cookie, coalesces recovery events, and keeps the successful identity',async()=>{
  const p=page();await p.reply(0,401);p.elements.login.emit('submit');
  for(let n=0;n<10;n++){p.event('online');p.event('focus');p.broadcast();}
  assert.deepEqual(p.requests.map(r=>r.op),['me','login'],'Recovery must not send a pre-login check while login is pending');
  await p.reply(1,200,session());
  assert.deepEqual(p.requests.map(r=>r.op),['me','login','me'],'Missed events must produce one verification after login');
  await p.reply(2,200,session());
  assert.equal(p.elements.member.hidden,false);
  assert.equal(p.elements.identity.textContent,'合成成员 synthetic-one');
  assert.equal(p.elements.status.textContent,'合成成员登录成功。');
  assert.equal(p.elements.draft.value,'保留的合成草稿');
});

test('a delayed old401 before login cannot erase the newer successful login',async()=>{
  const p=page();p.elements.login.emit('submit');await p.reply(1,200,session());
  await p.reply(0,401);
  assert.equal(p.elements.member.hidden,false);
  assert.equal(p.elements.status.textContent,'合成成员登录成功。');
});

test('online during an uncertain login is replayed after failure and recovers only the server-confirmed identity',async()=>{
  const p=page();await p.reply(0,401);p.elements.login.emit('submit');p.event('online');
  await p.fail(1);
  assert.equal(p.elements.member.hidden,true);
  assert.deepEqual(p.requests.map(r=>r.op),['me','login','me']);
  await p.reply(2,200,session('confirmed-on-server'));
  assert.equal(p.elements.member.hidden,false);
  assert.equal(p.elements.identity.textContent,'合成成员 confirmed-on-server');
});

test('recovery after a profile request preserves the already-read data when identity is unchanged',async()=>{
  const p=await signedIn();p.elements.profile.emit('click');p.event('online');
  assert.deepEqual(p.requests.map(r=>r.op),['me','profile']);
  await p.reply(1,200,{member:session().member,profile:{nickname:'合成昵称',role:'member',joinedOn:'2018-02-10'}});
  assert.equal(p.elements['profile-data'].children.length,8);
  await p.reply(2,200,session());
  assert.equal(p.elements['profile-data'].children.length,8);
  assert.equal(p.elements.status.textContent,'仅已登录成员的本人资料。');
});

test('a cross-tab revocation during a profile request is not lost',async()=>{
  const p=await signedIn();p.elements.profile.emit('click');p.broadcast();
  await p.reply(1,200,{member:session().member,profile:{nickname:'合成昵称',role:'member'}});
  assert.deepEqual(p.requests.map(r=>r.op),['me','profile','me']);
  await p.reply(2,401);
  assert.equal(p.elements.member.hidden,true);
  assert.equal(p.elements['profile-data'].children.length,0);
  assert.equal(p.elements.draft.value,'保留的合成草稿');
});

for(const operation of ['logout','change-password']){
  test(operation+' plus pending recovery keeps confirmed sign-out and ignores an older successful check',async()=>{
    const p=await signedIn();p.elements.refresh.emit('click');
    p.elements.current.value='Synthetic-Old-123!';p.elements.next.value='Synthetic-New-123!';
    if(operation==='logout')p.elements.logout.emit('click');else p.elements.change.emit('submit');
    p.event('online');
    assert.deepEqual(p.requests.map(r=>r.op),['me','me',operation]);
    await p.reply(2,200,{success:true,syntheticOnly:true});
    assert.deepEqual(p.requests.map(r=>r.op),['me','me',operation,'me']);
    const confirmedMessage=p.elements.status.textContent;
    await p.reply(3,401);await p.reply(1,200,session());
    assert.equal(p.elements.member.hidden,true);
    assert.equal(p.elements.status.textContent,confirmedMessage);
    assert.equal(p.elements.draft.value,'保留的合成草稿');
    if(operation==='change-password'){assert.equal(p.elements.current.value,'');assert.equal(p.elements.next.value,'');}
  });
}

test('out-of-order verification results cannot resurrect a session rejected by the latest check',async()=>{
  const p=await signedIn();p.event('focus');p.event('online');
  await p.reply(2,401);await p.reply(1,200,session());
  assert.equal(p.elements.member.hidden,true);
});

test('duplicate login, logout and password submissions send only one operation while busy',async()=>{
  const login=page();await login.reply(0,401);
  login.elements.login.emit('submit');login.elements.login.emit('submit');
  assert.deepEqual(login.requests.map(r=>r.op),['me','login']);
  await login.reply(1,200,session());
  assert.equal(login.elements.member.hidden,false);
  for(const operation of ['logout','change-password']){
    const p=await signedIn();
    const submit=()=>operation==='logout'?p.elements.logout.emit('click'):p.elements.change.emit('submit');
    submit();submit();
    assert.deepEqual(p.requests.map(r=>r.op),['me',operation]);
    await p.reply(1,200,{success:true,syntheticOnly:true});
    assert.equal(p.elements.member.hidden,true);
  }
});

test('rapid A logout and B login ignore both a delayed A200 and the queued signed-out401',async()=>{
  const p=page();await p.reply(0,401);
  p.elements.login.emit('submit');await p.reply(1,200,session('A'));
  p.event('focus'); // A's request remains in flight.
  p.elements.logout.emit('click');p.event('online');
  await p.reply(3,200,{success:true,syntheticOnly:true}); // Queues the signed-out check.
  p.elements.account.value='synthetic-B';p.elements.password.value='Synthetic-B-Password-123!';
  p.elements.login.emit('submit');await p.reply(5,200,session('B'));
  await p.reply(2,200,session('A'));await p.reply(4,401);
  assert.deepEqual(p.requests.map(r=>r.op),['me','login','me','logout','me','login']);
  assert.equal(p.elements.member.hidden,false);
  assert.equal(p.elements.identity.textContent,'合成成员 B');
  assert.equal(p.elements.status.textContent,'合成成员登录成功。');
});

for(const operation of ['logout','change-password']){
  test(operation+' failure never claims success and permits one subsequent retry',async()=>{
    const p=await signedIn();
    p.elements.current.value='Synthetic-Old-123!';p.elements.next.value='Synthetic-New-123!';
    const submit=()=>operation==='logout'?p.elements.logout.emit('click'):p.elements.change.emit('submit');
    submit();submit();await p.reply(1,operation==='logout'?503:403);
    assert.equal(p.elements.member.hidden,false);
    assert(!p.elements.status.textContent.includes('已撤销'));
    assert(!p.elements.status.textContent.includes('已修改'));
    assert.equal(p.elements.logout.disabled,false);
    if(operation==='change-password')assert.equal(p.elements.current.value,'Synthetic-Old-123!');
    submit();await p.reply(2,200,{success:true,syntheticOnly:true});
    assert.deepEqual(p.requests.map(r=>r.op),['me',operation,operation]);
    assert.equal(p.elements.member.hidden,true);
    assert.equal(p.elements.draft.value,'保留的合成草稿');
  });
}
