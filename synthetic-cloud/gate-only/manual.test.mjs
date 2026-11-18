import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { manualProbe } from './manual-runtime.mjs';
test('manual pilot: runtime identity, private probe, fail closed',async()=>{
  const sha='a'.repeat(40), expiry=Date.now()+60000, origin='https://jinxi-synthetic-gate-test.netlify.app';
  const pw=randomBytes(32).toString('hex'), env={JINXI_SERVICE_APPROVAL:sha,JINXI_GATE_EXPIRES_AT:new Date(expiry).toISOString(),
    JINXI_SYNTHETIC_ACCESS_SHA256:createHash('sha256').update(pw).digest('hex')};
  const ctx={site:{id:'e8033919-6f54-4a27-b09d-26c14d8831ce',url:origin},account:{id:'689e1405e8627000726e883c'},
    deploy:{id:'1'.repeat(24),published:true,context:'production'}};
  const probe=manualProbe(sha,expiry,k=>env[k]);
  const req=(url=origin,pass=pw)=>new Request(url,{headers:{Authorization:'Basic '+Buffer.from('jinxi-test:'+pass).toString('base64')}});
  const success=await probe(req(),ctx);
  assert.equal(success.status,200);assert.equal(await success.text(),'Synthetic access check OK');
  assert.equal(success.headers.get('X-Jinxi-Deploy'),ctx.deploy.id);assert.equal(success.headers.get('X-Jinxi-Revision'),sha);
  for(const request of [new Request(origin),req(origin,'wrong')]) assert.equal((await probe(request,ctx)).status,401);
  for(const path of ['/api/member','/.netlify/functions/member','/index.html']) assert.equal((await probe(req(origin+path),ctx)).status,404);
  for(const change of [{site:{}},{account:{}},{deploy:{...ctx.deploy,id:''}},{deploy:{...ctx.deploy,published:false}},
    {deploy:{...ctx.deploy,context:'branch-deploy'}}]) assert.equal((await probe(req(),{...ctx,...change})).status,503);
  assert.equal((await probe(req('https://alias.invalid'),ctx)).status,503);
  for(const [key,value] of [['JINXI_SERVICE_APPROVAL',''],['JINXI_GATE_EXPIRES_AT',''],['JINXI_GATE_EXPIRES_AT',new Date(0).toISOString()],
    ['JINXI_GATE_EXPIRES_AT',new Date(expiry+1).toISOString()],['JINXI_SYNTHETIC_ACCESS_SHA256','']]){
    const denied=await manualProbe(sha,expiry,k=>k===key?value:env[k])(req(),ctx);assert.equal(denied.status,503);
  }
  assert.equal((await manualProbe(sha,expiry,()=>{throw Error('fixture')})(req(),ctx)).status,503);
});
