const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const results=[],errors=[],writes=[];
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const c=await b.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'}),p=await c.newPage(),cdp=await c.newCDPSession(p);
 await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://cdn.jsdelivr.net/*']});
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))errors.push(m.text())});
 const requests=[];p.on('request',r=>{requests.push({method:r.method(),type:r.resourceType(),url:r.url()});if(!['GET','HEAD'].includes(r.method()))writes.push(r.method())});
 for(const id of [14,13,12,11,2,1,3,4,5,6,7,8]){
  await p.goto('http://127.0.0.1:3044/guides/?id='+id,{waitUntil:'networkidle'});await p.locator('.guide-reader h1').waitFor();assert.equal(await p.locator('.guide-reader h1').innerText(),'【隔离样本】攻略'+id);
  if(id===2)assert((await p.getByText('媒体地址不可用',{exact:true}).count())>=3);
  results.push({id,passed:true});
 }
 assert.equal(requests.filter(r=>r.type==='media').length,0,'Reader does not autoplay/preload videos');
 // A legacy malformed body is an explicit HTTP response injection; actual SQL remains unchanged.
 await c.route('**/.netlify/functions/strategies?id=14',async r=>{const response=await r.fetch(),body=await response.json();body.strategy.author=null;body.strategy.comments=[null,42,{id:'injected-comment',content:'缺少署名和日期的隔离评论'}];body.strategy.mediaFiles=[null,{type:'image',url:{invalid:true},title:{invalid:true}}];await r.fulfill({response,json:body})});
 await p.goto('http://127.0.0.1:3044/guides/?id=14',{waitUntil:'networkidle'});await p.locator('.guide-reader h1').waitFor();assert((await p.locator('.guide-author').innerText()).includes('匿名署名'));assert.equal(await p.locator('.guide-reader li strong').innerText(),'匿名署名');await p.getByText(/时间未提供/).waitFor();assert.equal(await p.getByText('媒体地址不可用',{exact:true}).count(),2);
 results.push({name:'null author, malformed comments and media render explicit fallbacks',passed:true,networkInjection:true});
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await c.close();
 }finally{fs.writeFileSync(path.join(__dirname,'reader-results.json'),JSON.stringify({results,errors,writes},null,2));await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
