const https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {cleanEnv}=require('../scripts/run-clean.cjs');
const {createMemberHandler}=require('../member-local/identity.cjs');
const {createCommunityHandler}=require('./handler.cjs');
async function serveCommunity(db,openssl){
 if(!path.isAbsolute(openssl)||!fs.existsSync(openssl))throw Error('LOCAL_OPENSSL_REQUIRED');
 const key=path.join(db.folder,'community-tls-key.private'),certificate=path.join(db.folder,'community-tls-cert.pem');
 const tool=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',certificate],{env:cleanEnv(),encoding:'utf8',timeout:15000,windowsHide:true});
 if(tool.status!==0)throw Error('LOCAL_TLS_UNAVAILABLE');
 const identity=createMemberHandler({settings:db.settings,connect:db.connect,env:cleanEnv(),clientAddress:e=>e.localClientAddress});
 const community=createCommunityHandler({settings:db.settings,identity,connect:db.connectBusiness,env:cleanEnv()});
 const policy="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
 const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(certificate)},async(req,res)=>{
  const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':policy};
  const send=(status,body,type='application/json; charset=utf-8',headers={})=>{res.writeHead(status,{...common,'Content-Type':type,...headers});res.end(body);};
  try{
   if(req.headers.host!=='127.0.0.1:3069'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,'{"code":"LOCAL_HOST_REQUIRED"}');
   const url=new URL(req.url,db.settings.origin);
   if(url.pathname==='/api/member'||url.pathname==='/api/community'){
    if([...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length>1))return send(400,'{"code":"DUPLICATE_QUERY"}');
    const limit=url.pathname==='/api/member'?4096:40000;
    if(Number(req.headers['content-length'])>limit)return send(413,'{"code":"BODY_REJECTED"}');
    let bytes=0;const chunks=[];
    for await(const chunk of req){bytes+=chunk.length;if(bytes>limit){req.resume();return send(413,'{"code":"BODY_REJECTED"}');}chunks.push(chunk);}
    const result=await (url.pathname==='/api/member'?identity:community)({httpMethod:req.method,headers:req.headers,queryStringParameters:Object.fromEntries(url.searchParams),body:Buffer.concat(chunks).toString('utf8'),localClientAddress:req.socket.remoteAddress});
    return send(result.statusCode,result.body,'application/json; charset=utf-8',result.headers);
   }
   if(req.method!=='GET')return send(404,'{"code":"NOT_FOUND"}');
   const files={'/':['../member-local/demo.html','text/html; charset=utf-8'],'/demo.js':['../member-local/demo.js','application/javascript'],'/demo.css':['../member-local/demo.css','text/css'],'/theme.css':['../styles/guild-theme.css','text/css'],'/community.css':['../styles/community-components.css','text/css'],'/community':['demo.html','text/html; charset=utf-8'],'/business.js':['demo.js','application/javascript'],'/business.css':['demo.css','text/css'],'/fixtures/community-cover.jpg':['../public/placeholder.jpg','image/jpeg'],'/fixtures/community-demo.mp4':['../public/2.mp4','video/mp4']};
   const entry=Object.hasOwn(files,url.pathname)?files[url.pathname]:null;
   if(!entry||url.search)return send(404,'{"code":"NOT_FOUND"}');
   let data=fs.readFileSync(path.join(__dirname,entry[0]));
   if(url.pathname==='/')data=Buffer.from(data.toString('utf8').replace('</select>','<option value="synthetic-reviewer">合成审核员</option><option value="synthetic-admin">合成管理员</option></select>').replace('</header>','<p><a href="/community">进入本机合成留言与攻略验证</a></p></header>'));
   return send(200,data,entry[1]);
  }catch{return send(503,'{"code":"LOCAL_COMMUNITY_UNAVAILABLE"}');}
 });
 server.requestTimeout=8000;server.headersTimeout=8000;server.timeout=12000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3069,'127.0.0.1',resolve);});
 return {cert:fs.readFileSync(certificate),close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
module.exports={serveCommunity};
