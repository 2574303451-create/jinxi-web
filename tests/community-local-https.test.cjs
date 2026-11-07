const {test}=require('node:test'),assert=require('node:assert/strict'),https=require('node:https'),crypto=require('node:crypto');
const {freshCommunity}=require('../community-local/database.cjs');
const {serveCommunity}=require('../community-local/server.cjs');
test('actual HTTPS community uses the original identity cookie, Origin and CSRF',async()=>{
 const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');
 const db=await freshCommunity(args[1]);let server;
 try{
  server=await serveCommunity(db,args[3]);
  async function request(route,{body,headers={},method}={}){
   return new Promise((resolve,reject)=>{const data=body===undefined?null:JSON.stringify(body);
    const req=https.request(db.settings.origin+route,{method:method||(data?'POST':'GET'),ca:server.cert,servername:'localhost',headers:{...(data?{Origin:db.settings.origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}),...headers}},res=>{let raw='';res.on('data',x=>{raw+=x;});res.on('end',()=>{let json;try{json=JSON.parse(raw);}catch{}resolve({status:res.statusCode,headers:res.headers,body:json,raw});});});req.on('error',reject);req.setTimeout(7000,()=>req.destroy(Error('LOCAL_HTTPS_TIMEOUT')));req.end(data);
   });
  }
  const login=async kind=>{const a=db.accounts[kind],r=await request('/api/member',{body:{op:'login',account:a.account,password:a.password}});assert.equal(r.status,200);return {Cookie:r.headers['set-cookie'][0].split(';')[0],'X-CSRF-Token':r.body.csrfToken};};
  const a=await login('normal'),b=await login('same'),reviewer=await login('reviewer');
  const write=(op,headers,extra={})=>request('/api/community',{body:{op,requestId:crypto.randomUUID(),...extra},headers});
  const created=await write('message.create',a,{content:'通过真实HTTPS创建的合成留言'});assert.equal(created.status,200);const item=created.body.item;
  assert.equal((await write('message.create',{}, {content:'游客不可写'})).status,401);
  assert.equal((await write('message.create',{...a,'X-CSRF-Token':'forged'},{content:'伪造CSRF'})).status,403);
  assert.equal((await write('message.create',{...a,Origin:'https://attacker.invalid'},{content:'跨域写入'})).status,403);
  assert.equal((await write('item.review',a,{id:item.id,version:item.version,decision:'approve'})).status,403);
  assert.equal((await write('item.review',reviewer,{id:item.id,version:item.version,decision:'approve'})).status,200);
  assert.equal((await write('reply.create',b,{id:item.id,content:'可信HTTPS回复'})).status,200);
  const feed=await request('/api/community?kind=message&scope=public');assert.equal(feed.status,200);assert(feed.body.items.some(x=>x.id===item.id));assert.equal(feed.headers['set-cookie'],undefined);assert.equal(feed.headers['access-control-allow-origin'],undefined);
  assert.equal((await request('/api/community?kind=message&scope=mine',{headers:{Cookie:'__Host-jinxi_member_local=forged'}})).status,401);
  assert.equal((await request('/api/community?kind=message&scope=public',{method:'OPTIONS'})).status,405);
  assert.equal((await request('/.netlify/functions/message-actions',{body:{action:'delete'}})).status,404);
  assert.equal((await request('/.netlify/functions/strategy-actions',{body:{action:'delete'}})).status,404);
  assert.equal((await request('/community',{headers:{Host:'untrusted.invalid'}})).status,403);
  const page=await request('/community');assert.equal(page.status,200);assert.match(page.headers['content-security-policy'],/script-src 'self'/);assert(!page.raw.includes('ADMIN_PASSWORD'));
  const exited=await request('/api/member',{body:{op:'logout'},headers:a});assert.equal(exited.status,200);
  assert.equal((await write('message.create',a,{content:'退出后的写入'})).status,401);
 }finally{await server?.close();await db.stop();}
});
