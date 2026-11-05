// One-variable browser probes; CDP blocking preserves the HTTP cache.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const rows=[];try{
for(const variant of ['legacy','configured','legacy-no-js','legacy-html-control','legacy-no-preload'])for(let run=1;run<=3;run++){
const ctx=await b.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce',javaScriptEnabled:variant!=='legacy-no-js'}),p=await ctx.newPage(),c=await ctx.newCDPSession(p),events=[];
await c.send('Network.enable');await c.send('Emulation.setCPUThrottlingRate',{rate:6});await c.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});await c.send('Network.setBlockedURLs',{urls:['https://cdn.jsdelivr.net/*']});
if(variant.includes('html')||variant==='legacy-no-preload')await p.route('**/',async r=>{const response=await r.fetch();let body=await response.text();if(variant==='legacy-no-preload')body=body.replace(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/g,'');await r.fulfill({response,body})});
c.on('Network.requestWillBeSent',e=>{if(e.type==='Image')events.push({event:'request',id:e.requestId,url:new URL(e.request.url).pathname,time:e.timestamp,initiator:e.initiator})});
c.on('Network.responseReceived',e=>{if(e.type==='Image')events.push({event:'response',id:e.requestId,cache:e.response.fromDiskCache||false,status:e.response.status,cacheControl:e.response.headers['Cache-Control'],time:e.timestamp})});
c.on('Network.loadingFinished',e=>{if(events.some(x=>x.event==='request'&&x.id===e.requestId))events.push({event:'complete',id:e.requestId,bytes:e.encodedDataLength,time:e.timestamp})});
await p.goto('http://127.0.0.1:'+(variant==='configured'?3028:3030)+'/',{waitUntil:'networkidle',timeout:60000});await p.waitForTimeout(600);
const counts={};for(const e of events.filter(e=>e.event==='request'))counts[e.url]=(counts[e.url]||0)+1;
const duplicateBytes=events.filter(e=>e.event==='complete'&&events.filter(x=>x.event==='request'&&counts[x.url]>1).some(x=>x.id===e.id)).reduce((n,e)=>n+e.bytes,0);
rows.push({variant,run,counts,duplicateBytes,events});fs.writeFileSync(path.join(__dirname,'image-probes.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify({variant,run,duplicates:Object.entries(counts).filter(([,n])=>n>1),duplicateBytes}));await ctx.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
