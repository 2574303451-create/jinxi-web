const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../points-local/demo.js'),'utf8'),flush=()=>new Promise(r=>{setImmediate(r);});
const me=(id='A',reset=false)=>({member:{id,displayName:'同昵称合成成员'},csrfToken:'synthetic-'+id,needsPasswordChange:reset});
const state=(id='A',balance='10')=>({memberId:id,syntheticOnly:true,businessNow:'2024-03-01T04:00:00.000Z',permissions:{admin:false},account:{balance,totalEarned:balance,netEarned:balance,totalSpent:'0',grossSpent:'0',refunds:'0',reversed:'0',listed:false},ledger:[{id:'ledger-'+id,kind:'award',pointDelta:balance,direction:1,balanceAfter:balance}],orders:[],catalogue:[],events:[],rules:[],adminOrders:[],adminAwards:[],nextLedgerBefore:null,nextOrdersBefore:null});
function page(){
 class Element{constructor(tag='div'){this.tagName=tag.toUpperCase();this.textContent='';this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.children=[];this.dataset={};this.listeners={};}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(){}addEventListener(n,f){this.listeners[n]=f;}emit(n){this.listeners[n]?.({preventDefault(){}});}reset(){}}
 const ids=['session','notice','private','stats','ledger','orders','events','catalogue','board','admin','rules','admin-orders','admin-awards','reload','retry','listed','save-visibility','metric','board-next','ledger-next','orders-next','latest','rule-form','item-form','r-code','r-version','r-day1','r-day3','r-day7','r-daily','r-total','r-from','r-to','r-status','i-name','i-cost','i-stock','i-limit','i-min'],elements=Object.fromEntries(ids.map(id=>[id,new Element()]));elements.metric.value='earned';
 const requests=[],events={},channels=[];let nonce=0;
 vm.runInNewContext(source,{document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag),querySelectorAll:()=>Object.values(elements)},window:{addEventListener:(n,f)=>{events[n]=f;}},BroadcastChannel:class{constructor(){channels.push(this);}addEventListener(n,f){this[n]=f;}},URLSearchParams,Map,JSON,Number,String,Object,Error,TypeError,AbortSignal:{timeout:()=>undefined},crypto:{randomUUID:()=> '00000000-0000-4000-8000-'+String(++nonce).padStart(12,'0')},fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({url,options,resolve,reject});})},{filename:'points-local/demo.js'});
 return {elements,requests,broadcast:()=>channels[0].message?.({data:'refresh'}),event:n=>events[n]?.(),reply:async(i,status,body={})=>{assert(requests[i],'Expected request '+i);requests[i].resolve({ok:status>=200&&status<300,status,json:async()=>body});await flush();},fail:async i=>{requests[i].reject(new TypeError('synthetic network fault'));await flush();}};
}
async function ready(balance='10',model){const p=page();await p.reply(0,200,me());await p.reply(1,200,model||state('A',balance));await p.reply(2,200,{entries:[],nextCursor:null});return p;}
function text(n){return n.textContent+' '+n.children.map(text).join(' ');}
test('an A-bound financial click discovers B and never submits A intent as B',async()=>{
 const p=await ready();assert.equal(p.elements.private.hidden,false);p.elements.listed.checked=true;p.elements['save-visibility'].emit('click');assert.equal(p.elements.private.hidden,true);
 await p.reply(3,200,me('B'));assert.equal(p.requests.filter(r=>r.options.method==='POST').length,0);assert(!text(p.elements.stats).includes('10'));await p.reply(4,200,me('B'));await p.reply(5,200,state('B','0'));await p.reply(6,200,{entries:[],nextCursor:null});assert.equal(p.elements.private.hidden,false);assert(!text(p.elements.ledger).includes('ledger-A'));
});
test('identity broadcasts, focus and online clear financial data before the next identity response',async()=>{
 for(const kind of ['broadcast','focus','online']){const p=await ready();if(kind==='broadcast')p.broadcast();else p.event(kind);assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);assert.equal(p.elements.ledger.children.length,0);assert.equal(p.elements.admin.hidden,true);await p.reply(3,401);assert.equal(p.elements.private.hidden,true);assert(!p.elements.session.textContent.includes('已由服务器核验'));}
});
test('a lost redeem response retains the original intent and UUID and never automatically repeats a deduction',async()=>{
 const model=state();model.catalogue=[{id:'00000000-0000-4000-8000-000000000099',name:'虚构纸星',unitCost:'2',available:2,perMemberLimit:2}];const p=await ready('10',model),redeem=p.elements.catalogue.children[0].children.find(n=>n.dataset.op==='redeem');redeem.emit('click');await p.reply(3,200,me());const original=JSON.parse(p.requests[4].options.body);assert.equal(original.op,'redeem');await p.fail(4);
 const after=state('A','8');after.account.totalEarned='10';after.account.totalSpent='2';after.account.netEarned='10';await p.reply(5,200,me());await p.reply(6,200,after);await p.reply(7,200,{entries:[],nextCursor:null});assert.equal(p.requests.filter(r=>r.options.method==='POST').length,1);assert.equal(p.elements.retry.hidden,false);assert(text(p.elements.stats).includes('8 分'));
 p.elements.retry.emit('click');await p.reply(8,200,me());assert.deepEqual(JSON.parse(p.requests[9].options.body),original);await p.reply(9,200,{memberId:'A',replayed:true});await p.reply(10,200,me());await p.reply(11,200,after);await p.reply(12,200,{entries:[],nextCursor:null});assert.equal(p.elements.retry.hidden,true);assert(p.elements.notice.textContent.includes('原请求已确认'));
});
test('a delayed A write result cannot populate B balances, orders or administrative controls',async()=>{
 const p=await ready();p.elements['save-visibility'].emit('click');await p.reply(3,200,me());p.broadcast();await p.reply(5,200,me('B'));await p.reply(6,200,state('B','0'));await p.reply(7,200,{entries:[],nextCursor:null});await p.reply(4,200,{memberId:'A'});assert(!text(p.elements.stats).includes('10 分'));assert(!text(p.elements.ledger).includes('ledger-A'));assert.equal(p.elements.admin.hidden,true);
 await p.reply(8,200,me('B'));await p.reply(9,200,state('B','0'));await p.reply(10,200,{entries:[],nextCursor:null});assert.equal(p.elements.private.hidden,false);assert.equal(p.elements.admin.hidden,true);
});
test('a delayed A identity check cannot send its command after a B invalidation notification',async()=>{
 const p=await ready();p.elements['save-visibility'].emit('click');p.broadcast();await p.reply(4,200,me('B'));await p.reply(3,200,me('A'));assert.equal(p.requests.filter(r=>r.options.method==='POST').length,0);assert.equal(p.elements.ledger.children.length,0);
});
test('first-reset and mismatched private responses reveal no financial history',async()=>{
 const first=page();await first.reply(0,200,me('A',true));assert.equal(first.requests.length,1);assert.equal(first.elements.private.hidden,true);assert.equal(first.elements.stats.children.length,0);
 const p=page();await p.reply(0,200,me());await p.reply(1,200,state('B','999'));assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);assert.equal(p.requests.length,2);
});
test('a failed private read clears prior counters and never presents a fake zero balance',async()=>{
 const p=await ready();p.elements.reload.emit('click');await p.reply(3,200,me());await p.reply(4,503,{code:'POINTS_UNAVAILABLE'});assert.equal(p.elements.private.hidden,true);assert.equal(p.elements.stats.children.length,0);assert(!text(p.elements.stats).includes('0 分'));assert.equal(p.elements.retry.hidden,true);
});
test('failure before a write is sent is not described as an unconfirmed financial operation',async()=>{
 const p=await ready();p.elements['save-visibility'].emit('click');await p.fail(3);await p.reply(4,200,me());await p.reply(5,200,state());await p.reply(6,200,{entries:[],nextCursor:null});assert.equal(p.requests.filter(r=>r.options.method==='POST').length,0);assert.equal(p.elements.retry.hidden,true);assert(!p.elements.notice.textContent.includes('原请求结果待确认'));
});
