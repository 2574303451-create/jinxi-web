const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../community-local/demo.js'),'utf8');
const flush=()=>new Promise(resolve=>{setImmediate(resolve);});
const session=id=>({syntheticOnly:true,member:{id,displayName:'member '+id},needsPasswordChange:false,csrfToken:'csrf-'+id});
const secret={id:'11111111-1111-4111-8111-111111111111',title:'A private guide',content:'A PRIVATE CONTENT',category:'PVE',tags:[],difficulty:2,status:'draft',version:1,ownership:'verified',mediaFiles:[]};

// Executes the actual community source and its browser handlers. All transport is
// controlled promises; no ports, databases, browser, credentials or cloud calls.
function page(){
 const nodes=[];
 class Element{
  constructor(tag=''){this.tagName=tag;this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.checked=false;this.children=[];this.listeners={};this.dataset={};nodes.push(this);}
  setAttribute(){}
  focus(){}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  addEventListener(name,handler){this.listeners[name]=handler;}
  emit(name){this.listeners[name]?.({preventDefault(){}});}
  querySelector(){return submit;}
 }
 const ids=['notice','compose','retry','cancel','session','items','editing','body','title','tags','category','difficulty','fixture-media','loading','kind','scope','new','guide-fields','reload'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const submit=new Element('button');
 elements.kind.value='guide';elements.scope.value='mine';elements.category.value='PVE';elements.difficulty.value='2';
 const requests=[],events={},channels=[];
 const context=vm.createContext({
  document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag),querySelectorAll:()=>nodes.filter(node=>node.tagName==='button')},
  window:{addEventListener:(name,handler)=>{events[name]=handler;}},
  BroadcastChannel:class{constructor(name){this.name=name;channels.push(this);}addEventListener(name,handler){this[name]=handler;}postMessage(){}},
  URLSearchParams,Error,TypeError,
  crypto:{randomUUID:()=> '22222222-2222-4222-8222-222222222222'},
  fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({url,options,resolve,reject});})
 });
 vm.runInContext(source,context,{filename:'community-local/demo.js'});
 return {elements,nodes,requests,events,context,
  broadcast(){for(const channel of channels)if(channel.name==='jinxi-member-local-refresh')channel.message?.({data:'refresh'});},
  async reply(index,status,payload){assert(requests[index],'Expected pending request '+index);requests[index].resolve({ok:status>=200&&status<300,status,json:async()=>payload});await flush();},
  async fail(index){assert(requests[index],'Expected pending request '+index);requests[index].reject(new TypeError('synthetic network unavailable'));await flush();}
 };
}
async function editingA(){
 const p=page();await p.reply(0,200,session('A'));await p.reply(1,200,{items:[secret]});
 p.nodes.find(node=>node.tagName==='button'&&node.textContent==='修订').emit('click');
 assert.equal(p.elements.body.value,secret.content);
 return p;
}
function readableText(element){return [element.textContent,...element.children.map(readableText)].join('\n');}

test('failed identity revalidation removes server-loaded private editor text',async()=>{
 const p=await editingA();
 // A is no longer a trusted identity; an external logout/login could already
 // have changed the cookie when the next revalidation encounters a network error.
 p.elements.reload.emit('click');await p.fail(2);
 assert.equal(p.elements.body.value,'','A private editor text must not survive failed identity verification');
 assert(!p.elements.session.textContent.includes('member A'),'The failed verification must not retain the old verified identity');
});

test('discovering B during submit must not send an earlier snapshot of A private text',async()=>{
 const p=await editingA();
 // The real type-change handler clears editing but retains server-loaded text.
 p.elements.kind.value='message';p.elements.kind.emit('change');
 await p.reply(2,200,session('A'));await p.reply(3,200,{items:[]});
 // Login on the identity page now changes the browser cookie to B. Submitting
 // on this page must reject the A-bound snapshot, even if it clears the editor.
 p.elements.compose.emit('submit');await p.reply(4,200,session('B'));
 assert.equal(p.elements.body.value,'');
 const posts=p.requests.filter(request=>request.options?.method==='POST').map(request=>JSON.parse(request.options.body));
 assert(!posts.some(body=>body.content===secret.content),'An A-bound private snapshot must never be POSTed after B verification');
});

test('identity-page broadcasts invalidate an in-flight A private read',async()=>{
 const p=page();await p.reply(0,200,session('A'));
 // An identity-page logout, password change, or B login emits this existing
 // broadcast. A previously authorized private response arrives afterwards.
 p.broadcast();await p.reply(1,200,{items:[secret]});
 assert(!readableText(p.elements.items).includes(secret.content),'An obsolete A private response must not render after an identity change notification');
});

test('an unsent member draft is cleared when another member is verified',async()=>{
 const p=page();await p.reply(0,200,session('A'));await p.reply(1,200,{items:[]});
 p.elements.body.value='A unsent member draft';p.elements.title.value='A unsent title';
 p.elements.reload.emit('click');await p.reply(2,200,session('B'));
 assert.equal(p.elements.body.value,'');assert.equal(p.elements.title.value,'');
});

test('online revalidation rejects an old private response and fails closed on auth failure',async()=>{
 const p=page();await p.reply(0,200,session('A'));
 p.events.online?.();await p.reply(1,200,{items:[secret]});
 assert(!readableText(p.elements.items).includes(secret.content));
 assert(p.requests[2],'Online must trigger real identity revalidation');await p.reply(2,401,{});
 assert(!p.elements.session.textContent.includes('member A'));assert.equal(p.elements.body.value,'');
});

test('a late A write response cannot clear a newly verified B draft or publish A content',async()=>{
 const p=page();await p.reply(0,200,session('A'));await p.reply(1,200,{items:[]});
 p.elements.body.value='A unsent member draft';p.elements.title.value='A private title';p.elements.compose.emit('submit');
 await p.reply(2,200,session('A'));assert.equal(p.requests[3].options.method,'POST');
 p.broadcast();await p.reply(4,200,session('B'));p.elements.body.value='B own new draft';
 await p.reply(3,200,{item:secret});
 assert.equal(p.elements.body.value,'B own new draft');assert(!readableText(p.elements.items).includes(secret.content));
 await p.reply(6,200,session('B'));await p.reply(7,200,{items:[]});
 assert.equal(p.elements.body.value,'B own new draft');
});

test('a delayed A identity lookup cannot start a write after a B identity broadcast',async()=>{
 const p=page();await p.reply(0,200,session('A'));await p.reply(1,200,{items:[]});
 p.elements.body.value='A draft captured before identity lookup';p.elements.compose.emit('submit');
 p.broadcast();await p.reply(3,200,session('B'));await p.reply(2,200,session('A'));
 assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,0);
 assert.equal(p.elements.body.value,'');assert(!readableText(p.elements.items).includes(secret.content));
});
