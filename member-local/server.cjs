const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {cleanEnv}=require('../scripts/run-clean.cjs');
const {createMemberHandler}=require('./identity.cjs');
async function serve(database,openssl){
  if(!path.isAbsolute(openssl)||!fs.existsSync(openssl))throw Error('EXPLICIT_LOCAL_OPENSSL_REQUIRED');
  const key=path.join(database.folder,'tls-key.private'),cert=path.join(database.folder,'tls-cert.pem');
  const tool=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',cert],{env:cleanEnv(),encoding:'utf8',timeout:15000,windowsHide:true});
  if(tool.status!==0)throw Error('LOCAL_TLS_SETUP_FAILED');
  const handler=createMemberHandler({settings:database.settings,connect:database.connect,env:cleanEnv(),clientAddress:event=>event.localClientAddress});
  const policy="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
  const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},async(req,res)=>{
    const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow, noarchive','Content-Security-Policy':policy};
    const send=(status,body,type='application/json',extra={})=>{res.writeHead(status,{...common,'Content-Type':type,...extra});res.end(body);};
    try{
      if(req.headers.host!=='127.0.0.1:3069'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,'{"code":"LOCAL_HOST_REQUIRED"}');
      const url=new URL(req.url,database.settings.origin);
      if(url.pathname==='/api/member'){
        if([...url.searchParams.keys()].some(key=>url.searchParams.getAll(key).length>1))return send(400,'{"code":"DUPLICATE_QUERY"}');
        if(Number(req.headers['content-length'])>4096)return send(413,'{"code":"BODY_REJECTED"}');
        let bytes=0;const chunks=[];
        for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){req.resume();return send(413,'{"code":"BODY_REJECTED"}');}chunks.push(chunk);}
        const result=await handler({httpMethod:req.method,headers:req.headers,queryStringParameters:Object.fromEntries(url.searchParams),body:Buffer.concat(chunks).toString('utf8'),localClientAddress:req.socket.remoteAddress});
        return send(result.statusCode,result.body,'application/json',result.headers);
      }
      if(req.method!=='GET')return send(405,'{"code":"METHOD_NOT_ALLOWED"}');
      const files={'/':['demo.html','text/html; charset=utf-8'],'/demo.js':['demo.js','application/javascript'],'/demo.css':['demo.css','text/css'],'/theme.css':['../styles/guild-theme.css','text/css'],'/community.css':['../styles/community-components.css','text/css']};
      const entry=Object.hasOwn(files,url.pathname)?files[url.pathname]:null;
      if(!entry||url.search)return send(404,'{"code":"NOT_FOUND"}');
      return send(200,fs.readFileSync(path.join(__dirname,entry[0])),entry[1]);
    }catch{return send(503,'{"code":"LOCAL_SERVICE_UNAVAILABLE"}');}
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.timeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3069,'127.0.0.1',resolve);});
  return {server,cert:fs.readFileSync(cert),close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
module.exports={serve};
