const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../attendance-local/demo.js'),'utf8');
const flush=()=>new Promise(resolve=>{setImmediate(resolve);});
const identity=(id='A',reset=false)=>({member:{id,displayName:'同昵称合成成员'},csrfToken:'synthetic-'+id,needsPasswordChange:reset});
const state=(id='A',total=0,today='2024-02-29',checked=false)=>({memberId:id,today,businessTimeZone:'Asia/Shanghai',hasCheckedToday:checked,stats:{totalDays:total,currentStreak:total,longestStreak:total,month:today.slice(0,7),monthDays:total},history:total?[{id:'fact-'+id,businessDate:today,continuousDays:total}]:[],nextBefore:null});
function page(){
 class Element{constructor(){this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.children=[];this.dataset={};this.listeners={};}setAttribute(){}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}addEventListener(name,fn){this.listeners[name]=fn;}emit(name){this.listeners[name]?.({preventDefault(){}});}}
 const elements=Object.fromEntries(['notice','session','private','stats','history','today','state','checkin','reload','latest','older','month'].map(id=>[id,new Element()])),requests=[],events={},channels=[];let nonce=0;
 vm.runInNewContext(source,{document:{getElementById:id=>elements[id],createElement:()=>new Element()},window:{addEventListener:(name,fn)=>{events[name]=fn;}},BroadcastChannel:class{constructor(){channels.push(this);}addEventListener(name,fn){this[name]=fn;}},URLSearchParams,Map,Error,TypeError,AbortSignal:{timeout:()=>undefined},crypto:{randomUUID:()=> '00000000-0000-4000-8000-'+String(++nonce).padStart(12,'0')},fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({url,options,resolve,reject});})},{filename:'attendance-local/demo.js'});
 return {elements,requests,event:name=>events[name]?.(),broadcast:()=>channels[0].message?.({data:'refresh'}),reply:async(index,status,body={})=>{assert(requests[index],'Expected request '+index);requests[index].resolve({ok:status>=200&&status<300,status,json:async()=>body});await flush();},fail:async index=>{requests[index].reject(new TypeError('synthetic network fault'));await flush();}};
}
async function signed(total=0,checked=false){const p=page();await p.reply(0,200,identity());await p.reply(1,200,state('A',total,'2024-02-29',checked));return p;}
function text(n){return n.textContent+' '+n.children.map(text).join(' ');}
test('identity invalidation clears even the previous signed-in button caption before the next response',async()=>{
 const p=await signed(1,true);assert.equal(p.elements.checkin.textContent,'今日已签到');p.broadcast();
 assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);assert.equal(p.elements.today.textContent,'');assert(!p.elements.checkin.textContent.includes('已签到'),'No A status may remain visible during identity revalidation');
 await p.fail(2);assert.equal(p.elements.private.hidden,true);assert(!p.elements.session.textContent.includes('已由服务器核验'));
});
test('discovering B during an A click sends no attendance POST or private A read',async()=>{
 const p=await signed(5);p.elements.checkin.emit('click');await p.reply(2,200,identity('B'));
 assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,0);assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.history.children.length,0);
 await p.reply(3,200,identity('B'));await p.reply(4,200,state('B'));
 assert(text(p.elements.stats).includes('0 天'));assert(!text(p.elements.history).includes('fact-A'));
});
test('broadcasts and online events discard an old private read and clear failed authentication',async()=>{
 for(const kind of ['broadcast','online']){
  const p=page();await p.reply(0,200,identity());if(kind==='broadcast')p.broadcast();else p.event('online');
  await p.reply(1,200,state('A',7));assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);
  await p.reply(2,401);assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.checkin.disabled,true);
 }
});
test('a lost POST response retries the original UUID and does not falsely sign the next day',async()=>{
 const p=await signed();p.elements.checkin.emit('click');await p.reply(2,200,identity());const id=JSON.parse(p.requests[3].options.body).requestId;
 await p.fail(3);await p.reply(4,200,identity());await p.reply(5,200,state('A',1,'2024-03-01',false));
 assert.equal(p.elements.checkin.textContent,'重试原签到请求');assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,1);
 p.elements.checkin.emit('click');await p.reply(6,200,identity());assert.equal(JSON.parse(p.requests[7].options.body).requestId,id);
 await p.reply(7,200,{...state('A',1,'2024-03-01',false),outcome:'replayed',checkedDate:'2024-02-29'});await p.reply(8,200,identity());await p.reply(9,200,state('A',1,'2024-03-01',false));
 assert.equal(p.elements.state.textContent,'今日未签到');assert(p.elements.notice.textContent.includes('原请求已确认：2024-02-29'));assert.equal(p.elements.checkin.disabled,false);
 p.elements.checkin.emit('click');await p.reply(10,200,identity());assert.notEqual(JSON.parse(p.requests[11].options.body).requestId,id);
});
test('an old write response cannot render A statistics after B was verified',async()=>{
 const p=await signed();p.elements.checkin.emit('click');await p.reply(2,200,identity());p.broadcast();await p.reply(4,200,identity('B'));await p.reply(5,200,state('B'));
 await p.reply(3,200,{...state('A',99),outcome:'checked',checkedDate:'2024-02-29'});
 assert(!text(p.elements.stats).includes('99'));assert(!text(p.elements.history).includes('fact-A'));
 await p.reply(6,200,identity('B'));await p.reply(7,200,state('B'));assert(text(p.elements.stats).includes('0 天'));
});
test('a delayed A identity response cannot start a write after B notification',async()=>{
 const p=await signed();p.elements.checkin.emit('click');p.broadcast();await p.reply(3,200,identity('B'));await p.reply(2,200,identity('A'));
 assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,0);assert.equal(p.elements.history.children.length,0);
});
test('mismatched private responses and forced password reset never render statistics',async()=>{
 const p=page();await p.reply(0,200,identity('B'));await p.reply(1,200,state('A',99));assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);
 const first=page();await first.reply(0,200,identity('A',true));assert.equal(first.requests.length,1);assert.equal(first.elements.checkin.disabled,true);assert.equal(first.elements.private.hidden,true);
});
test('a failed pre-submit identity check neither sends nor marks a submitted request as pending',async()=>{
 const p=await signed();p.elements.checkin.emit('click');await p.fail(2);await p.reply(3,200,identity());await p.reply(4,200,state());
 assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,0);assert.equal(p.elements.checkin.textContent,'签到');assert(!p.elements.notice.textContent.includes('原请求结果待确认'));
});
