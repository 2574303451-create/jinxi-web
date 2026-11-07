const https=require('node:https'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {cleanEnv}=require('../scripts/run-clean.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
const {createAttendanceHandler}=require('./handler.cjs');
async function serveAttendance(db,openssl){
 if(!path.isAbsolute(openssl)||!fs.existsSync(openssl))throw Error('LOCAL_OPENSSL_REQUIRED');
 const key=path.join(db.folder,'attendance-tls-key.private'),certificate=path.join(db.folder,'attendance-cert.pem');
 const tool=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',certificate],{env:cleanEnv(),encoding:'utf8',timeout:15000,windowsHide:true});
 if(tool.status!==0)throw Error('LOCAL_TLS_UNAVAILABLE');
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:cleanEnv(),clientAddress:e=>e.localClientAddress});
 const attendance=createAttendanceHandler({settings:db.settings,identity,connect:db.connectAttendance,env:cleanEnv()});
 const policy="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
 const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(certificate)},async(req,res)=>{
  const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':policy};
  const send=(status,body,type='application/json; charset=utf-8',extra={})=>{res.writeHead(status,{...common,'Content-Type':type,...extra});res.end(body);};
  try{
   if(req.headers.host!=='127.0.0.1:3069'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,'{"code":"LOCAL_HOST_REQUIRED"}');
   const url=new URL(req.url,db.settings.origin);
   if(url.pathname==='/api/member'||url.pathname==='/api/attendance'){
    if([...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length>1))return send(400,'{"code":"DUPLICATE_QUERY"}');
    const limit=url.pathname==='/api/member'?4096:2048;if(Number(req.headers['content-length'])>limit)return send(413,'{"code":"BODY_REJECTED"}');
    let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>limit){req.resume();return send(413,'{"code":"BODY_REJECTED"}');}chunks.push(chunk);}
    const r=await (url.pathname==='/api/member'?identity:attendance)({httpMethod:req.method,headers:req.headers,queryStringParameters:Object.fromEntries(url.searchParams),body:Buffer.concat(chunks).toString('utf8'),localClientAddress:req.socket.remoteAddress});
    return send(r.statusCode,r.body,'application/json; charset=utf-8',r.headers);
   }
   if(req.method!=='GET')return send(404,'{"code":"NOT_FOUND"}');
   const files={'/':['../member-local/demo.html','text/html; charset=utf-8'],'/demo.js':['../member-local/demo.js','application/javascript'],'/demo.css':['../member-local/demo.css','text/css'],'/theme.css':['../styles/guild-theme.css','text/css'],'/community.css':['../styles/community-components.css','text/css'],'/attendance':['demo.html','text/html; charset=utf-8'],'/attendance.js':['demo.js','application/javascript'],'/attendance.css':['demo.css','text/css']};
   const entry=Object.hasOwn(files,url.pathname)?files[url.pathname]:null;if(!entry||url.search)return send(404,'{"code":"NOT_FOUND"}');
   let value=fs.readFileSync(path.join(__dirname,entry[0]));if(url.pathname==='/')value=Buffer.from(value.toString('utf8').replace('</header>','<p><a href="/attendance">进入本机合成签到与统计</a></p></header>'));
   return send(200,value,entry[1]);
  }catch{return send(503,'{"code":"LOCAL_ATTENDANCE_UNAVAILABLE"}');}
 });
 server.requestTimeout=8000;server.headersTimeout=8000;server.timeout=12000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3069,'127.0.0.1',resolve);});
 return {cert:fs.readFileSync(certificate),close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
module.exports={serveAttendance};
