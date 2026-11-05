// Retained diagnostic harness. Requests/initiators only; never stores credentials.
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
(async () => {
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const rows=[];
 try {
  for(let run=1;run<=3;run++) {
   const ctx=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page),events=[];
   await cdp.send('Network.enable'); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
   await page.route('https://cdn.jsdelivr.net/**',r=>r.abort());
   await page.addInitScript(()=>{window.__imageChanges=[];new MutationObserver(ms=>{for(const m of ms)if(m.type==='attributes'&&m.target.tagName==='IMG')window.__imageChanges.push({src:m.target.getAttribute('src'),attribute:m.attributeName,time:performance.now()})}).observe(document,{subtree:true,attributes:true,attributeFilter:['src','srcset']})});
   cdp.on('Network.requestWillBeSent',e=>{if(e.type==='Image')events.push({event:'request',id:e.requestId,url:new URL(e.request.url).pathname,time:e.timestamp,initiator:e.initiator})});
   cdp.on('Network.responseReceived',e=>{if(e.type==='Image')events.push({event:'response',id:e.requestId,status:e.response.status,cache:e.response.fromDiskCache||false,headers:{cacheControl:e.response.headers['Cache-Control']},time:e.timestamp})});
   cdp.on('Network.loadingFinished',e=>{if(events.some(x=>x.event==='request'&&x.id===e.requestId))events.push({event:'complete',id:e.requestId,encodedBytes:e.encodedDataLength,time:e.timestamp})});
   await page.goto('http://127.0.0.1:3030/',{waitUntil:'networkidle',timeout:60000});
   await page.waitForTimeout(1200);
   const changes=await page.evaluate(()=>window.__imageChanges),counts={};
   for(const e of events.filter(e=>e.event==='request'))counts[e.url]=(counts[e.url]||0)+1;
   rows.push({run,counts,changes,events});
   console.log(JSON.stringify({run,duplicates:Object.entries(counts).filter(([,n])=>n>1),changes}));
   await ctx.close();
  }
  fs.writeFileSync(path.join(__dirname,'image-repro.json'),JSON.stringify(rows,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
