const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const {chromium} = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const variants = require('./variants.cjs');
const stages = process.argv.slice(2);
if (!stages.length || stages.some(stage=>!Object.hasOwn(variants,stage))) throw Error('Select preview variants');
const output = path.join(__dirname,'performance-'+stages.join('-')+'.json');
const number = values => values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];

async function pair(browser, stage, mobile, repetition) {
  const variant = variants[stage];
  const context = await browser.newContext({
    viewport:{width:mobile?390:1440,height:1000}, locale:'zh-CN', reducedMotion:'reduce',
  });
  try {
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    // Routing in Playwright disables the HTTP cache. Block external HTTPS at
    // CDP instead; all preview URLs and actual API requests use loopback HTTP.
    await cdp.send('Network.setBlockedURLs',{urls:['https://*']});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?6:1});
    if (mobile) await cdp.send('Network.emulateNetworkConditions',{
      offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,
    });
    await cdp.send('Performance.enable');
    await context.addInitScript(()=>{
      window.audit = {lcp:0,cls:0,longTasks:[],events:[],clicks:[],functionalReady:0};
      new PerformanceObserver(list=>{
        for (const e of list.getEntries()) window.audit.lcp=e.startTime;
      }).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{
        for (const e of list.getEntries()) if(!e.hadRecentInput) window.audit.cls+=e.value;
      }).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{
        for (const e of list.getEntries()) window.audit.longTasks.push({start:e.startTime,duration:e.duration});
      }).observe({type:'longtask',buffered:true});
      new PerformanceObserver(list=>{
        for (const e of list.getEntries()) if(e.interactionId) window.audit.events.push({
          name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime,
          processing:e.processingEnd-e.processingStart,
        });
      }).observe({type:'event',buffered:true,durationThreshold:16});
      document.addEventListener('click',event=>{
        const button=event.target.closest?.('.audience-switch button');
        if(!button)return;
        const expected=button.getAttribute('aria-pressed')==='false';
        if(!expected)return;
        const started=event.timeStamp;
        const observer=new MutationObserver(()=>{
          if(button.getAttribute('aria-pressed')!=='true')return;
          observer.disconnect();
          requestAnimationFrame(()=>requestAnimationFrame(()=>{
            window.audit.clicks.push(performance.now()-started);
            if(!window.audit.functionalReady)window.audit.functionalReady=performance.now();
          }));
        });
        observer.observe(button,{attributes:true,attributeFilter:['aria-pressed']});
      },true);
    });
    const rows=[];
    for (const cache of ['cold','warm']) {
      const network=new Map(),errors=[],bodies=[],pending=[];
      const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const sent=e=>{
        const url=new URL(e.request.url);
        network.set(e.requestId,{path:url.origin===variant.origin?url.pathname:'blocked-external',
          type:e.type,method:e.request.method,bytes:0,cached:false,status:null});
      };
      const response=e=>{
        const row=network.get(e.requestId);
        if(row)Object.assign(row,{cached:row.cached||!!(e.response.fromDiskCache||e.response.fromPrefetchCache),
          status:e.response.status,contentEncoding:e.response.headers['Content-Encoding']||e.response.headers['content-encoding']||null});
      };
      const memory=e=>{const row=network.get(e.requestId);if(row)row.cached=true;};
      const finished=e=>{const row=network.get(e.requestId);if(row)row.bytes=e.encodedDataLength;};
      const body=reply=>{
        if(new URL(reply.url()).origin!==variant.origin || !['script','stylesheet'].includes(reply.request().resourceType()))return;
        pending.push(reply.body().then(bytes=>bodies.push({
          path:new URL(reply.url()).pathname,type:reply.request().resourceType(),
          raw:bytes.length,gzip:zlib.gzipSync(bytes).length,
          forbiddenCode:/DOMPurify|jinxi-session-lab-draft-v1|guide-reader-actions|复制分享链接|jinxi-avatar-lab-v1/.test(bytes.toString()),
        })));
      };
      const pageError=error=>errors.push(error.name);
      cdp.on('Network.requestWillBeSent',sent);
      cdp.on('Network.responseReceived',response);
      cdp.on('Network.requestServedFromCache',memory);
      cdp.on('Network.loadingFinished',finished);
      page.on('response',body);
      page.on('pageerror',pageError);
      await page.goto(variant.origin,{waitUntil:'networkidle',timeout:120000});
      const member=page.getByRole('group',{name:'选择浏览入口'}).getByRole('button',{name:'公会成员',exact:true});
      await member.click();
      await page.waitForFunction(()=>window.audit.functionalReady>0);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await Promise.all(pending);
      const initial=await page.evaluate(()=>JSON.parse(JSON.stringify(window.audit)));
      const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const metrics={};
      for(const key of ['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'])metrics[key+'Ms']=(after[key]-before[key])*1000;
      metrics.heapUsedBytes=after.JSHeapUsedSize;
      metrics.nodes=after.Nodes;
      metrics.eventListeners=after.JSEventListeners;
      const requests=[...network.values()];
      assert.deepEqual(errors,[]);
      assert(!requests.some(row=>row.type==='Media'||/strategies|guide-video-stats|session-lab/.test(row.path)));
      assert(!requests.some(row=>!['GET','HEAD'].includes(row.method)));
      assert(!bodies.some(row=>row.forbiddenCode));
      assert(initial.lcp>0);
      const sum=(type,key)=>bodies.filter(row=>row.type===type).reduce((n,row)=>n+row[key],0);
      const inputStart=initial.clicks.length;
      for(let i=0;i<4;i++){
        await page.getByRole('group',{name:'选择浏览入口'}).getByRole('button',{name:i%2?'公会成员':'初次见面',exact:true}).click();
        await page.waitForFunction(count=>window.audit.clicks.length>count,inputStart+i);
      }
      const inputs=await page.evaluate(()=>({clicks:window.audit.clicks,events:window.audit.events}));
      const row={
        stage,mobile,repetition,cache,lcp:initial.lcp,cls:initial.cls,functionalReadyMs:initial.functionalReady,
        ...metrics,longTaskCount:initial.longTasks.length,
        longTaskMs:initial.longTasks.reduce((n,t)=>n+t.duration,0),
        totalBlockingMs:initial.longTasks.reduce((n,t)=>n+Math.max(0,t.duration-50),0),
        longestTaskMs:Math.max(0,...initial.longTasks.map(t=>t.duration)),
        interactionPaintMedianMs:number(inputs.clicks.slice(1)),eventTimingMaxMs:Math.max(0,...inputs.events.map(e=>e.duration)),
        decodedJs:sum('script','raw'),jsGzip:sum('script','gzip'),
        decodedCss:sum('stylesheet','raw'),cssGzip:sum('stylesheet','gzip'),
        scriptNetworkBytes:requests.filter(row=>row.type==='Script').reduce((n,row)=>n+row.bytes,0),
        styleNetworkBytes:requests.filter(row=>row.type==='Stylesheet').reduce((n,row)=>n+row.bytes,0),
        cachedScripts:requests.filter(row=>row.type==='Script'&&row.cached).length,
        scriptRequests:requests.filter(row=>row.type==='Script').length,
        allNetworkBytes:requests.reduce((n,row)=>n+row.bytes,0),
        requests,assets:bodies,longTasks:initial.longTasks,
      };
      rows.push(row);
      console.log(JSON.stringify({stage,mobile,repetition,cache,lcp:row.lcp,scriptMs:metrics.ScriptDurationMs,
        blocking:row.totalBlockingMs,js:row.jsGzip,wire:row.scriptNetworkBytes,cached:row.cachedScripts}));
      cdp.off('Network.requestWillBeSent',sent);cdp.off('Network.responseReceived',response);
      cdp.off('Network.requestServedFromCache',memory);cdp.off('Network.loadingFinished',finished);
      page.off('response',body);page.off('pageerror',pageError);
    }
    return rows;
  } finally { await context.close(); }
}
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const samples=[];
  try{
    for(const mobile of[false,true])for(let rep=1;rep<=3;rep++){
      const order=stages.slice(rep-1).concat(stages.slice(0,rep-1));
      for(const stage of order)samples.push(...await pair(browser,stage,mobile,rep));
    }
    const fields=['lcp','functionalReadyMs','ScriptDurationMs','TaskDurationMs','LayoutDurationMs','RecalcStyleDurationMs',
      'heapUsedBytes','nodes','eventListeners','longTaskCount','longTaskMs','totalBlockingMs','longestTaskMs',
      'interactionPaintMedianMs','eventTimingMaxMs','decodedJs','jsGzip','decodedCss','cssGzip','scriptNetworkBytes',
      'styleNetworkBytes','cachedScripts','scriptRequests','allNetworkBytes'];
    const summary=[];
    for(const mobile of[false,true])for(const cache of['cold','warm'])for(const stage of stages){
      const xs=samples.filter(x=>x.mobile===mobile&&x.cache===cache&&x.stage===stage);
      summary.push({stage,mobile,cache,clsMax:Math.max(...xs.map(x=>x.cls)),
        ...Object.fromEntries(fields.map(field=>[field,number(xs.map(x=>x[field]))]))});
    }
    fs.writeFileSync(output,JSON.stringify({
      scope:'Only identical local synthetic previews. Not hosted or field data.',
      measuredAt:new Date().toISOString(),node:process.version,
      inputs:stages.map(stage=>({
        stage,buildCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:variants[stage].build,encoding:'utf8'}).trim(),
        indexSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(variants[stage].site,'index.html'))).digest('hex'),
        cspSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(variants[stage].site,'csp-manifest.json'))).digest('hex'),
      })),
      method:'Three rotated runs, cold context then same-context cached document navigation. Native asset cache and gzip transport; HTML/API no-store. No Playwright routing. External HTTPS blocked with CDP. 1440px CPU1;390px CPU6,150ms,200000/93750Bps. Reduced motion. Script/task/layout are CDP durations through settling; functionalReady is a successful hero state change after networkidle, not an exact React hydration phase. Click-to-second-frame and EventTiming are lab responsiveness proxies, not a field INP. Heap is unforced-GC retained browser state.',
      edge:browser.version(),summary,samples,
    },null,2)+'\n');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
