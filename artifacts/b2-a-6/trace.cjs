const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const variants=require('./variants.cjs');
const stages=process.argv.slice(2);
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const reports=[];
 try{
  for(const stage of stages){
   if(!Object.hasOwn(variants,stage))throw Error('Unknown trace variant');
   const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
   try{
    const page=await context.newPage(),cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs',{urls:['https://*']});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
    const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
    await cdp.send('Tracing.start',{
     categories:'devtools.timeline,v8,disabled-by-default-v8.compile,blink.user_timing',
     transferMode:'ReturnAsStream',
    });
    await page.goto(variants[stage].origin,{waitUntil:'networkidle',timeout:120000});
    await page.waitForTimeout(1000);
    await cdp.send('Tracing.end');
    const {stream}=await complete,parts=[];
    for(;;){
     const part=await cdp.send('IO.read',{handle:stream});
     parts.push(Buffer.from(part.data,part.base64Encoded?'base64':'utf8'));
     if(part.eof)break;
    }
    await cdp.send('IO.close',{handle:stream});
    const bytes=Buffer.concat(parts),trace=JSON.parse(bytes),events=trace.traceEvents.filter(e=>e.ph==='X'&&e.dur);
    const byName=new Map(),scripts=new Map();
    for(const e of events){
     if(/v8|compile|parse/i.test(e.cat+' '+e.name)){
      const old=byName.get(e.name)||{name:e.name,count:0,ms:0};old.count++;old.ms+=e.dur/1000;byName.set(e.name,old);
     }
     if(e.name==='EvaluateScript'){
      const raw=e.args?.data?.url||e.args?.data?.scriptName||'unknown';
      const file=raw.startsWith(variants[stage].origin)?new URL(raw).pathname:raw==='unknown'?'unknown':'external-blocked';
      const old=scripts.get(file)||{file,count:0,ms:0};old.count++;old.ms+=e.dur/1000;scripts.set(file,old);
     }
    }
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('Performance.enable');
    const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    const file=stage+'-mobile.trace.json.gz';
    fs.writeFileSync(path.join(__dirname,file),zlib.gzipSync(bytes));
    reports.push({stage,file,bytes:bytes.length,compressed:zlib.gzipSync(bytes).length,
     evaluateScripts:[...scripts.values()].sort((a,b)=>b.ms-a.ms),
     compileAndParse:[...byName.values()].sort((a,b)=>b.ms-a.ms),
     postGcHeapUsedBytes:metrics.JSHeapUsedSize,
    });
    console.log(stage+' recorded parse/evaluate trace and post-GC heap');
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(__dirname,'trace-summary.json'),JSON.stringify({
   method:'Cold mobile390, CPU6,150ms,200000Bps, gzip loopback transport and no-store HTML/API. Public synthetic read pages only. Trace instrumentation has overhead; durations are supplementary, not merged into the untraced repeated measurements. V8 categories include nested/background events and their duration totals must not be added.',
   reports,
  },null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
