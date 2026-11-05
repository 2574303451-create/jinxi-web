// Correct seam: real streamed HTML preload + IMG requests, no React or fixtures.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const policy=process.argv[2]||'configured',image=fs.readFileSync(path.join(__dirname,'../../public/logo.png'));
const server=http.createServer((req,res)=>{
 if(req.url==='/logo.png'){res.writeHead(200,{'Content-Type':'image/png','Content-Length':image.length,'Cache-Control':policy==='legacy'?'no-store':'public,max-age=2592000'});return res.end(image)}
 if(req.url!=='/'){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.write('<!doctype html><meta name="viewport" content="width=device-width"><link rel="preload" as="image" href="/logo.png">');
 setTimeout(()=>res.end('<img src="/logo.png" alt="isolated image-cache regression">'),300);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const rows=[];try{
for(let run=1;run<=3;run++){const p=await b.newPage(),requests=[],cdp=await p.context().newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});p.on('request',r=>{if(r.resourceType()==='image')requests.push({path:new URL(r.url()).pathname})});await p.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});rows.push({run,requests,oneDownload:requests.length===1});await p.close()}
const result={policy,rows,passed:rows.every(r=>r.oneDownload),scope:'Real browser preload and image through a two-chunk HTTP response; same bytes, one changed cache header. No user data/production requests.'};fs.writeFileSync(path.join(__dirname,`image-cache-regression-${policy}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert(result.passed,'Duplicate download through actual streamed preload/IMG seam');
}finally{await b.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e.message);process.exitCode=1});
