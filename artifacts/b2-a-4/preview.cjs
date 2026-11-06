// Local synthetic-only HTTPS harness. No .env loading, production resources or request-body logs.
const https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const http=require('node:http'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),b2=require('../../tests/support/b2-postgres.cjs');
const {handler}=require('../../tests/support/function-handler.cjs'),{createSessionLabHandler}=require('../../netlify/functions/_shared/session-lab');
const baseline=process.argv.includes('--pr12');
const site=baseline?'E:/Recovery/.jinxi-research/b2-a-ci-check/source/out':'E:/Recovery/.jinxi-research/b2-a-4/source/out';
const tmp=path.dirname(b2.runtimeFile);
if(!fs.existsSync(path.join(site,'session-lab/index.html')))throw Error('Expected independent static export missing');
const oldPolicy=()=>{
  const config=execFileSync('git',['show','483495aefcd75316731efce76372748a0f00c8c7:netlify.toml'],{cwd:root,encoding:'utf8'});
  const policy=config.match(/^\s*Content-Security-Policy = "([^"\r\n]+)"/m)?.[1];
  if(!policy)throw Error('Pinned PR12 CSP missing');
  return policy;
};
const env=b2.environment(),cache=new Map();
const csp=baseline?oldPolicy():JSON.parse(fs.readFileSync(path.join(site,'csp-manifest.json'))).policy;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.ico':'image/x-icon'};
function reader(){return{async transaction(...args){const c=await b2.connect('reader');try{return await b2.adapter(c).transaction(...args)}finally{await c.end()}}}}
const session=createSessionLabHandler({env:b2.environment('session-lab'),connect:()=>b2.connect('session'),clientAddress:e=>e.localAddress});
async function request(req,res){
 try{
  const url=new URL(req.url,'https://localhost:3048');
  if(url.pathname.startsWith('/.netlify/functions/')){
   const name=url.pathname.slice('/.netlify/functions/'.length);if(!/^[a-z-]+$/.test(name)){res.writeHead(404);return res.end()}
   if(name==='session-lab'&&!req.socket.encrypted){res.writeHead(503);return res.end()}
   let size=0,body='';for await(const part of req){size+=part.length;if(size>8192){res.writeHead(413);return res.end()}body+=part.toString('utf8')}
   const event={httpMethod:req.method,headers:req.headers,body,isBase64Encoded:false,queryStringParameters:Object.fromEntries(url.searchParams),localAddress:req.socket.remoteAddress};
   if(name!=='session-lab'&&!cache.has(name)){if(!fs.existsSync(path.join(root,'netlify/functions',name+'.js'))){res.writeHead(404);return res.end()}cache.set(name,handler(name,env,reader))}
   const r=await(name==='session-lab'?session:cache.get(name))(event);res.writeHead(r.statusCode,r.headers);return res.end(r.body);
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
  const pathname=decodeURIComponent(url.pathname),file=path.resolve(site,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(path.resolve(site)+path.sep)){res.writeHead(403);return res.end()}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Security-Policy':csp,'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Synthetic local preview unavailable"}')}
}
if(baseline){
 http.createServer(request).listen(3049,'127.0.0.1',()=>console.log('Frozen PR12 build and pinned original CSP at http://127.0.0.1:3049/'));
}else{
 const tls={key:fs.readFileSync(path.join(tmp,'tls-key.pem')),cert:fs.readFileSync(path.join(tmp,'tls-cert.pem'))};
 https.createServer(tls,request).listen(3048,'127.0.0.1',()=>console.log('Local synthetic HTTPS preview at https://localhost:3048/session-lab/'));
 http.createServer(request).listen(3050,'127.0.0.1',()=>console.log('Public-page regression harness at http://127.0.0.1:3050/'));
}
