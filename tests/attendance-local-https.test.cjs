const {test}=require('node:test'),assert=require('node:assert/strict'),https=require('node:https'),crypto=require('node:crypto');
const {freshAttendance}=require('../attendance-local/database.cjs');
const {serveAttendance}=require('../attendance-local/server.cjs');
test('actual HTTPS attendance uses original server sessions, CSRF and private-only reads',async()=>{
 const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');
 const db=await freshAttendance(args[1]);let server;
 try{
  await db.setClock('2024-02-29T04:00:00.000Z');server=await serveAttendance(db,args[3]);const origin=db.settings.origin;
  const request=(route,{body,headers={},method}={})=>new Promise((resolve,reject)=>{
   const data=body===undefined?null:JSON.stringify(body),req=https.request(origin+route,{method:method||(data?'POST':'GET'),ca:server.cert,servername:'localhost',headers:{...(data?{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}),...headers}},res=>{let raw='';res.on('data',x=>{raw+=x;});res.on('end',()=>{let value;try{value=JSON.parse(raw);}catch{}resolve({status:res.statusCode,headers:res.headers,body:value,raw});});});req.on('error',reject);req.setTimeout(8000,()=>req.destroy(Error('LOCAL_HTTPS_TIMEOUT')));req.end(data);
  });
  async function login(kind){const a=db.accounts[kind],r=await request('/api/member',{body:{op:'login',account:a.account,password:a.password}});assert.equal(r.status,200);for(const flag of ['HttpOnly','Secure','SameSite=Lax'])assert(r.headers['set-cookie'][0].includes(flag),'Original cookie attribute missing: '+flag);return {Cookie:r.headers['set-cookie'][0].split(';')[0],'X-CSRF-Token':r.body.csrfToken};}
  const a=await login('normal'),b=await login('same'),first=await login('first'),id=crypto.randomUUID(),body={op:'checkin',requestId:id};
  assert.equal((await request('/api/attendance')).status,401);
  const created=await request('/api/attendance',{body,headers:a});assert.equal(created.status,200);assert.equal(created.body.checkedDate,'2024-02-29');assert.equal(created.body.rewardStatus,'unsettled');assert.equal(created.body.rewardPoints,null);
  const again=await request('/api/attendance',{body,headers:a});assert.equal(again.body.outcome,'replayed');assert.equal(again.body.recordId,created.body.recordId);
  const own=await request('/api/attendance?month=2024-02',{headers:a});assert.equal(own.status,200);assert.equal(own.body.stats.totalDays,1);assert.equal(own.headers['set-cookie'],undefined);assert.equal(own.headers['access-control-allow-origin'],undefined);assert.equal(own.headers['cache-control'],'no-store');
  assert.equal((await request('/api/attendance',{headers:b})).body.stats.totalDays,0);
  for(const [headers,extra,status]of [[{},body,401],[{...a,'X-CSRF-Token':'forged'},body,403],[{...a,Origin:'https://attacker.invalid'},body,403],[a,{...body,user_id:db.accounts.same.memberId},403],[a,{...body,checkin_date:'2030-01-01'},403],[first,body,403]])assert.equal((await request('/api/attendance',{body:extra,headers})).status,status);
  assert.equal((await request('/api/attendance?memberId='+db.accounts.same.memberId,{headers:a})).status,403);assert.equal((await request('/api/attendance?month=2024-02&month=2024-03',{headers:a})).status,400);assert.equal((await request('/api/attendance',{method:'OPTIONS'})).status,405);
  for(const route of ['/.netlify/functions/checkin','/.netlify/functions/points','/api/attendance/settle'])assert.equal((await request(route,{body:{op:'checkin'},headers:a})).status,404);
  assert.equal((await request('/attendance',{headers:{Host:'untrusted.invalid'}})).status,403);const page=await request('/attendance');assert.equal(page.status,200);assert.match(page.headers['content-security-policy'],/script-src 'self'/);assert(page.raw.includes('未结算'));
  assert.equal((await request('/api/member',{body:{op:'logout'},headers:a})).status,200);assert.equal((await request('/api/attendance',{body:{op:'checkin',requestId:crypto.randomUUID()},headers:a})).status,401);assert.equal((await request('/api/attendance',{headers:a})).status,401);
 }finally{await server?.close();await db.stop();}
});
