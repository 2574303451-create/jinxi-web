// Preparation only: deliberately outside netlify/functions and never imported by app/.
const crypto=require('node:crypto');
const {approve,roles}=require('./resource.cjs'),{handlers}=require('./handlers.cjs');
const disabled=require('./approval.disabled.json');
const response=(status,code)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Vary':'Cookie, Origin'},body:JSON.stringify({code})});
function router({services,origin,clientAddress}){return async (event,context)=>{
 try{
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  if(new URL(event.rawUrl).origin!==origin)return response(403,'HOST_REJECTED');
  if(headers['sec-fetch-site']==='cross-site'||headers.origin&&headers.origin!==origin)return response(403,'ORIGIN_REJECTED');
  const match=/^\/\.netlify\/functions\/jinxi-service\/(member|community|attendance|points|operations)$/.exec(event.path||'');
  if(!match)return response(404,'SERVICE_ROUTE_REJECTED');
  const raw=event.rawQuery||'';if([...new URLSearchParams(raw).keys()].some(k=>new URLSearchParams(raw).getAll(k).length!==1))return response(400,'DUPLICATE_QUERY');
  if(!['GET','POST'].includes(event.httpMethod))return response(405,'METHOD_NOT_ALLOWED');
  if(event.httpMethod==='POST'&&headers.origin!==origin)return response(403,'ORIGIN_REQUIRED');
  const result=await services[match[1]]({...event,headers,localClientAddress:clientAddress(context)});
  const safe={...result.headers,...response(200,'').headers};for(const key of Object.keys(safe))if(/^access-control-|^cdn-cache-control$|^netlify-cdn-cache-control$/i.test(key))delete safe[key];
  if(match[1]==='member'&&result.headers['Set-Cookie'])safe['Set-Cookie']=[result.headers['Set-Cookie'],'__Host-jinxi_points_epoch='+crypto.randomUUID()+'; Path=/; Secure; SameSite=Strict'];
  return {...result,headers:safe};
 }catch{return response(503,'SERVICE_UNAVAILABLE');}
};}
async function createCloudService({approval=disabled,env=process.env,secrets,Client=require('pg').Client}={}){
 if(approval?.enabled!==true)throw Error('APPROVED_TEST_RESOURCE_REQUIRED');
 approval=Object.freeze(structuredClone(approval));env=Object.freeze({...env});secrets=Object.freeze({...secrets});
 const settings=approve(approval,env,secrets),connections={};
 for(const name of Object.keys(roles))connections[name]=async()=>{
  // No connection strings, role escalation, SET ROLE, insecure SSL or fallback.
  const c=new Client({host:settings.host,port:settings.port,database:settings.database,user:roles[name],password:secrets[name],ssl:{rejectUnauthorized:true},connectionTimeoutMillis:3000,application_name:'jinxi-approved-test-'+name});
  try{await c.connect();return c;}catch{await c.end().catch(()=>{});throw Error('APPROVED_TEST_CONNECTION_FAILED');}
 };
 const services=handlers({settings,connections,env,clientAddress:event=>event.localClientAddress});
 const verifiers={member:require('../member-local/identity.cjs').verifyMember,...Object.fromEntries(['community','attendance','points','operations'].map(name=>[name,require('../'+name+'-local/proof.cjs').verify]))};
 for(const name of Object.keys(roles)){const c=await connections[name]();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await verifiers[name](c,settings);await c.query('COMMIT');}finally{await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}}
 // Netlify Fetch API context.ip, not a client-controlled forwarding header.
 return router({services,origin:settings.origin,clientAddress:context=>{
  const ip=context?.ip;if(context?.site?.id!==approval.siteId||new URL(context.site.url).origin!==approval.origin||context?.deploy?.context!=='production'||!require('node:net').isIP(ip||''))throw Error('TRUSTED_CLIENT_ADDRESS_REQUIRED');return ip;
 }});
}
function netlifyFetch(service){return async(request,context)=>{
 try{const url=new URL(request.url);let bytes=0;const chunks=[];if(request.body){const reader=request.body.getReader();while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>65536){await reader.cancel();return new Response(JSON.stringify({code:'BODY_REJECTED'}),{status:413,headers:response(413,'').headers});}chunks.push(Buffer.from(r.value));}}
  const event={rawUrl:request.url,path:url.pathname,httpMethod:request.method,headers:Object.fromEntries(request.headers),rawQuery:url.search.slice(1),queryStringParameters:Object.fromEntries(url.searchParams),body:Buffer.concat(chunks).toString('utf8'),isBase64Encoded:false};
  const r=await service(event,context),headers=new Headers();for(const[k,v]of Object.entries(r.headers||{}))for(const item of Array.isArray(v)?v:[v])headers.append(k,item);return new Response(r.body,{status:r.statusCode,headers});
 }catch{return new Response(JSON.stringify({code:'SERVICE_UNAVAILABLE'}),{status:503,headers:response(503,'').headers});}
};}
module.exports={createCloudService,router,netlifyFetch};
