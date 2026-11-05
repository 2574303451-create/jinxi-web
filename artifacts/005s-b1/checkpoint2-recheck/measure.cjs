// Run alone after builds/browser/DB tests finish. No routing/interception or cache disabling.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const report={method:'A+ d4769e7 vs B1 exact staged product build; 3 fresh contexts each, alternating stage order by repetition; desktop1440 CPU1, mobile390 CPU6/150ms/down200000/up93750 Bps. Same local native synthetic PG and cache headers. No Playwright routing; only identical external icon CDN block. CDP wire bytes differ from decoded bodies/calculated gzip. Not field vitals or Neon/Netlify network latency.',results:[]};
const save=()=>fs.writeFileSync(path.join(__dirname,'performance-results.json'),JSON.stringify(report,null,2));
const move=(p,s)=>p.locator(s).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-90,behavior:'instant'}));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const slow of [false,true])for(let run=1;run<=3;run++)for(const stage of run%2?['A+','B1']:['B1','A+']){
  const ctx=await browser.newContext({viewport:{width:slow?390:1440,height:1000},reducedMotion:'reduce',locale:'zh-CN',timezoneId:'Asia/Shanghai'}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p),assets={},api=[],waterfall=[],errors=[],consoleErrors=[],pending=[],requests=[];
  const base='http://127.0.0.1:'+(stage==='A+'?3041:3044);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  p.on('request',r=>requests.push({url:r.url(),method:r.method(),type:r.resourceType()}));
  p.on('response',r=>{const type=r.request().resourceType(),url=new URL(r.url());if(['script','stylesheet','image'].includes(type)||url.pathname.startsWith('/.netlify/functions/'))pending.push((async()=>{const body=await r.body().catch(()=>Buffer.alloc(0));const data={type,bytes:body.length,status:r.status(),gzip:type==='image'?null:zlib.gzipSync(body).length,fullGuideCode:type==='script'&&/复制分享链接|预览正文|guide-reader-actions/.test(body.toString())};if(url.pathname.startsWith('/.netlify/functions/'))api.push({path:url.pathname+url.search,...data});else assets[url.pathname]=data})())});
  await cdp.send('Network.enable');await cdp.send('Performance.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://cdn.jsdelivr.net/*']});await cdp.send('Emulation.setCPUThrottlingRate',{rate:slow?6:1});if(slow)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
  cdp.on('Network.requestWillBeSent',e=>waterfall.push({event:'request',id:e.requestId,time:e.timestamp,url:e.request.url,type:e.type}));
  cdp.on('Network.responseReceived',e=>waterfall.push({event:'response',id:e.requestId,time:e.timestamp,url:e.response.url,status:e.response.status,cache:e.response.fromDiskCache}));
  cdp.on('Network.loadingFinished',e=>waterfall.push({event:'complete',id:e.requestId,time:e.timestamp,encodedBytes:e.encodedDataLength}));
  await ctx.addInitScript(()=>{window.__b1vitals={lcp:0,cls:0,shifts:[]};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__b1vitals.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__b1vitals.shifts.push({time:e.startTime,value:e.value,recentInput:e.hadRecentInput});if(!e.hadRecentInput)window.__b1vitals.cls+=e.value}}).observe({type:'layout-shift',buffered:true})});
  if(run===1)await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing',transferMode:'ReturnAsStream'});
  const snapshot=async()=>({assets:structuredClone(assets),api:structuredClone(api),requests:structuredClone(requests),waterfall:structuredClone(waterfall),vitals:await p.evaluate(()=>window.__b1vitals)});
  await p.goto(base,{waitUntil:'networkidle',timeout:120000});await p.waitForTimeout(1200);await Promise.all(pending);const initial=await snapshot();
  assert.equal(initial.requests.filter(r=>r.type==='media').length,0);assert.equal(initial.api.filter(r=>/strategies|guide-video-stats/.test(r.path)).length,0);assert(!Object.values(initial.assets).some(a=>a.fullGuideCode));
  let begin=performance.now();await move(p,'#guild-facts');if(stage==='B1')await p.getByLabel('4条公开攻略视频附件',{exact:true}).waitFor();const statsReadyMs=performance.now()-begin;
  begin=performance.now();await move(p,'#home-guides');await p.locator('[data-home-guide]').first().waitFor();const recommendationReadyMs=performance.now()-begin;await p.waitForTimeout(1000);await Promise.all(pending);const content=await snapshot();
  if(run===1){const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done;let trace='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});trace+=chunk.data;if(chunk.eof)break}await cdp.send('IO.close',{handle:stream});fs.writeFileSync(path.join(__dirname,`perf-${stage==='A+'?'baseline':'b1'}-${slow?'mobile':'desktop'}.trace.json.gz`),zlib.gzipSync(trace))}
  const feeds=[];
  if(stage==='B1')for(const [name,expected]of [['视频附件',['11','2','1']],['置顶精选',['3','1']],['最近发布',['14','13','12']]]){begin=performance.now();await p.locator('#home-guides').getByRole('button',{name,exact:true}).click();await p.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('[data-home-guide]')].map(el=>el.dataset.homeGuide))===JSON.stringify(ids),expected);feeds.push({name,ms:performance.now()-begin})}
  begin=performance.now();await p.locator('[data-home-guide="14"]').click();await p.waitForURL('**/guides/?id=14');await p.locator('.guide-reader h1').waitFor();const detailReadyMs=performance.now()-begin;await Promise.all(pending);
  assert(!requests.some(r=>!['GET','HEAD'].includes(r.method)));assert.deepEqual(errors,[]);
  const result={stage,slow,run,width:slow?390:1440,initial,statsReadyMs,recommendationReadyMs,content,feeds,detailReadyMs,api,requests,waterfall,errors,consoleErrors};report.results.push(result);save();console.log(JSON.stringify({stage,slow,run,lcp:initial.vitals.lcp,cls:initial.vitals.cls,recommendationReadyMs,feeds,detailReadyMs}));await ctx.close();
 }}catch(e){report.failure=e.stack;save();throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
