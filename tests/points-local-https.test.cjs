const {test}=require('node:test'),assert=require('node:assert/strict'),https=require('node:https'),crypto=require('node:crypto');
const {freshPoints}=require('../points-local/database.cjs'),{servePoints}=require('../points-local/server.cjs');
test('actual local HTTPS points consumes existing sessions and attendance without cloud write paths',async()=>{
 const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');const db=await freshPoints(args[1]);let server;
 try{
  await db.setClock('2024-03-01T04:00:00.000Z');server=await servePoints(db,args[3]);const origin=db.settings.origin;
  const request=(route,{body,headers={},method}={})=>new Promise((resolve,reject)=>{
   const data=body===undefined?null:JSON.stringify(body),req=https.request(origin+route,{method:method||(data?'POST':'GET'),ca:server.cert,servername:'localhost',headers:{...(data?{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}),...headers}},res=>{let raw='';res.on('data',x=>{raw+=x;});res.on('end',()=>{let value;try{value=JSON.parse(raw);}catch{}resolve({status:res.statusCode,headers:res.headers,body:value,raw});});});req.on('error',reject);req.setTimeout(8000,()=>req.destroy(Error('LOCAL_HTTPS_TIMEOUT')));req.end(data);
  });
  async function login(kind){const a=db.accounts[kind],r=await request('/api/member',{body:{op:'login',account:a.account,password:a.password}});assert.equal(r.status,200);for(const flag of ['Secure','HttpOnly','SameSite=Lax'])assert(r.headers['set-cookie'][0].includes(flag),'Existing cookie flag missing: '+flag);return {Cookie:r.headers['set-cookie'][0].split(';')[0],'X-CSRF-Token':r.body.csrfToken};}
  const a=await login('normal'),b=await login('same'),first=await login('first');assert.equal((await request('/api/points')).status,401);assert.equal((await request('/api/points',{headers:first})).status,403);
  const fact=await request('/api/attendance',{body:{op:'checkin',requestId:crypto.randomUUID()},headers:a});assert.equal(fact.status,200);const eventId=fact.body.history[0].rewardEventId,body={op:'settle',eventId,requestId:crypto.randomUUID()};
  assert.equal((await request('/api/points',{body,headers:{...a,'X-CSRF-Token':'forged'}})).status,403);assert.equal((await request('/api/points',{body,headers:{...a,Origin:'https://attacker.invalid'}})).status,403);assert.equal((await request('/api/points',{body,headers:b})).status,403);
  let r=await request('/api/points',{body,headers:a});assert.equal(r.status,200);assert.equal(r.body.amount,'1');const originalId=r.body.ledgerId;r=await request('/api/points',{body,headers:a});assert.equal(r.status,200);assert.equal(r.body.ledgerId,originalId);assert.equal(r.body.replayed,true);
  r=await request('/api/points',{headers:a});assert.equal(r.body.account.balance,'1');assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers['access-control-allow-origin'],undefined);assert.equal((await request('/api/points',{headers:b})).body.account.balance,'0');
  for(const field of ['memberId','userId','amount','pointCost','isAdmin'])assert.equal((await request('/api/points',{body:{...body,requestId:crypto.randomUUID(),[field]:'forged'},headers:a})).status,403);
  assert.equal((await request('/api/points?memberId='+db.accounts.same.memberId,{headers:a})).status,403);assert.equal((await request('/api/points?limit=1&limit=2',{headers:a})).status,400);assert.equal((await request('/api/points',{method:'OPTIONS'})).status,405);
  for(const route of ['/.netlify/functions/points','/.netlify/functions/checkin','/.netlify/functions/points-board','/api/points/manual-credit','/api/points/real-redeem'])assert.equal((await request(route,{body:{op:'award'},headers:a})).status,404);
  assert.equal((await request('/points',{headers:{Host:'untrusted.invalid'}})).status,403);r=await request('/points');assert.equal(r.status,200);assert.match(r.headers['content-security-policy'],/script-src 'self'/);assert(r.raw.includes('合成'));
  assert.equal((await request('/api/member',{body:{op:'logout'},headers:a})).status,200);assert.equal((await request('/api/points',{body,headers:a})).status,401);assert.equal((await request('/api/points',{headers:a})).status,401);
 }finally{await server?.close();await db.stop();}
});
