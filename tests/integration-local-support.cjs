const https=require('node:https'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function httpClient(app){
 const origin=app.db.settings.origin;
 async function request(route,{body,session,headers={},method}={}){
  const raw=body===undefined?null:JSON.stringify(body);
  return new Promise((resolve,reject)=>{
   const req=https.request(new URL(route,origin),{method:method||(raw?'POST':'GET'),ca:app.server.cert,rejectUnauthorized:true,headers:{...(raw?{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...headers}},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');let value;try{value=JSON.parse(text);}catch{value=null;}resolve({status:res.statusCode,body:value,headers:res.headers,bytes:Buffer.concat(chunks).length,raw:text});});
   });req.setTimeout(20000,()=>req.destroy(Error('LOCAL_TEST_TIMEOUT')));req.on('error',reject);if(raw)req.write(raw);req.end();
  });
 }
 async function login(kind='normal'){
  const a=app.db.accounts[kind],r=await request('/api/member',{body:{op:'login',account:a.account,password:a.password}});assert.equal(r.status,200,'synthetic login '+kind);
  const values=r.headers['set-cookie'];return {cookie:values.map(s=>s.split(';')[0]).join('; '),csrf:r.body.csrfToken,memberId:r.body.member.id};
 }
 const mutate=(module,session,body)=>request('/api/'+module,{session,body:{requestId:crypto.randomUUID(),...body}});
 const admin=async(sql,values)=>{const c=await app.db.admin();try{return typeof sql==='function'?await sql(c):await c.query(sql,values);}catch(e){throw Error('SYNTHETIC_SQL_'+(e.code||'ERROR')+(e.constraint?'_'+e.constraint:''));}finally{await c.end();}};
 return {request,login,mutate,admin};
}
module.exports={httpClient};
