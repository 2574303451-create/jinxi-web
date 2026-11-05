const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const stage=process.argv[2]||'before';
const base=process.env.PREVIEW_URL||(stage==='before'?'http://127.0.0.1:3011':'http://127.0.0.1:3013/preview-app/');
const out=path.join(__dirname,stage);fs.mkdirSync(out,{recursive:true});
const results={stage,base,labOnly:true,config:{edge:'system Edge, independent headless context',runtimeSampleMs:7000,samples:3,mobile:{cpuSlowdown:6,latencyMs:150,downloadBytesPerSecond:200000,uploadBytesPerSecond:93750}},profiles:[],errors:[]};
function vitalObserver(){
 window.__labVitals={lcp:null,cls:0,interactions:[],longTasks:[]};let session=0,start=0,last=0;
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.__labVitals.lcp={ms:e.startTime,element:e.element?.tagName,url:e.url||null}}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.hadRecentInput)continue;if(e.startTime-last>1000||e.startTime-start>5000){session=0;start=e.startTime}session+=e.value;last=e.startTime;window.__labVitals.cls=Math.max(window.__labVitals.cls,session)}}).observe({type:'layout-shift',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.__labVitals.interactions.push({type:e.name,duration:e.duration,id:e.interactionId})}).observe({type:'event',buffered:true,durationThreshold:16});
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.__labVitals.longTasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true});
}
async function trace(session,name,action){
 await session.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,v8,disabled-by-default-v8.cpu_profiler,toplevel',transferMode:'ReturnAsStream'});
 await action();
 const done=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));await session.send('Tracing.end');const {stream}=await done;let text='';
 for(;;){const part=await session.send('IO.read',{handle:stream});text+=part.base64Encoded?Buffer.from(part.data,'base64').toString('utf8'):part.data;if(part.eof)break}await session.send('IO.close',{handle:stream});
 const data=JSON.parse(text),counts={},durations={};for(const e of data.traceEvents){counts[e.name]=(counts[e.name]||0)+1;if(e.ph==='X'&&typeof e.dur==='number')durations[e.name]=(durations[e.name]||0)+e.dur/1000}
 fs.writeFileSync(path.join(out,name+'.trace.json.gz'),zlib.gzipSync(text));
 return {file:name+'.trace.json.gz',events:data.traceEvents.length,counts:Object.fromEntries(['FireAnimationFrame','RequestAnimationFrame','Layout','Paint','UpdateLayoutTree','FunctionCall','RunTask'].map(k=>[k,counts[k]||0])),durationMs:Object.fromEntries(['Layout','Paint','UpdateLayoutTree','FunctionCall'].map(k=>[k,durations[k]||0]))};
}
async function metric(session){return Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))}
async function steady(page,session,label){
 const samples=[];let recording;
 for(let i=0;i<results.config.samples;i++){
  const first=await metric(session);const action=()=>page.waitForTimeout(results.config.runtimeSampleMs);
  if(i===0)recording=await trace(session,label,action);else await action();
  const last=await metric(session),delta={};for(const key of ['Timestamp','ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'])delta[key]=last[key]-first[key];samples.push(delta);
 }
 return {samples,recording};
}
async function screenshot(page,name){await page.screenshot({path:path.join(out,name+'.png')})}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const profile of [{name:'desktop',width:1440,cpu:1},{name:'slow-mobile',width:390,cpu:6}]){
   const context=await browser.newContext({viewport:{width:profile.width,height:1000},locale:'zh-CN',timezoneId:'Asia/Shanghai',reducedMotion:'no-preference'});await context.addInitScript(vitalObserver);
   const page=await context.newPage(),errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,160))});
   const session=await context.newCDPSession(page);await session.send('Performance.enable');await session.send('Network.enable');await session.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});
   if(profile.cpu>1)await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular3g'});
   console.log('LOAD',stage,profile.name);const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});if(response.status()!==200)throw new Error('Preview unavailable');
   await page.locator('h1').waitFor();await page.waitForFunction(()=>document.fonts.status==='loaded'&&[...document.images].filter(image=>{const r=image.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0&&r.width>0}).every(i=>i.complete),null,{timeout:120000});await page.waitForTimeout(500);
   const loadVitals=await page.evaluate(()=>({...window.__labVitals,navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,duration:e.duration,bytes:e.transferSize}))}));await screenshot(page,`home-${profile.width}`);
   await page.locator('.message-showcase').scrollIntoViewIfNeeded();await page.locator('.message-ribbon-card').first().waitFor();await page.mouse.move(1,1);await page.waitForTimeout(1500);
   console.log('TRACE',stage,profile.name,'visible');const visible=await steady(page,session,profile.name+'-visible');await screenshot(page,`ribbon-${profile.width}`);
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);console.log('TRACE',stage,profile.name,'offscreen');const offscreen=await steady(page,session,profile.name+'-offscreen');
   // Actual interactions; the latency samples below are not a field INP estimate.
   const time=page.locator(stage==='before'?'aside[aria-label="公会陪伴时间数据终端"]':'aside[aria-label="今夕同行时光"]');await time.scrollIntoViewIfNeeded();await time.screenshot({path:path.join(out,`time-collapsed-${profile.width}.png`)});
   await page.getByRole('button',{name:stage==='before'?'展开公会数据终端':'展开同行时光',exact:true}).click();
   const input=page.locator('#guild-member-lookup');await input.fill('0');const begin=Date.now();await input.press('Enter');if(stage==='after')await time.locator('[data-profile-mode="member"]').waitFor();else await time.getByText('2018-02-10',{exact:true}).last().waitFor();const queryMs=Date.now()-begin;await page.waitForTimeout(600);
   await time.screenshot({path:path.join(out,`time-expanded-${profile.width}.png`)});
   const finalVitals=await page.evaluate(()=>window.__labVitals);
   results.profiles.push({...profile,loadVitals,visible,offscreen,queryMs,interactionSampleMaxMs:Math.max(0,...finalVitals.interactions.map(e=>e.duration)),finalVitals,errors,consoleErrors});results.errors.push(...errors);fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));await context.close();console.log('DONE',stage,profile.name);
  }
 }catch(error){results.error=String(error);fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
