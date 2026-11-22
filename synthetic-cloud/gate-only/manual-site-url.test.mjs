import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {manualProbe} from './manual-runtime.mjs';

function fixture(){
  const sha='a'.repeat(40),deadline=Date.now()+60000,origin='https://jinxi-synthetic-gate-test.netlify.app';
  const password=randomBytes(32).toString('hex'),headers={Authorization:'Basic '+Buffer.from('jinxi-test:'+password).toString('base64')};
  const env={JINXI_SERVICE_APPROVAL:sha,JINXI_GATE_EXPIRES_AT:new Date(deadline).toISOString(),
    JINXI_SYNTHETIC_ACCESS_SHA256:createHash('sha256').update(password).digest('hex')};
  const ctx={account:{id:'689e1405e8627000726e883c'},site:{id:'e8033919-6f54-4a27-b09d-26c14d8831ce',url:origin.replace('https:','http:')},
    deploy:{id:'1'.repeat(24),context:'production',published:true}};
  const events=[],probe=manualProbe(sha,deadline,key=>env[key],event=>events.push(event));
  return {origin,ctx,headers,events,probe};
}

test('provider HTTP site metadata permits only the approved HTTPS request origin',async()=>{
  const f=fixture();
  const anonymous=await f.probe(new Request(f.origin),f.ctx);
  assert.equal(anonymous.status,401);
  assert.equal(await anonymous.text(),'TEST_ACCESS_REQUIRED');
  const success=await f.probe(new Request(f.origin,{headers:f.headers}),f.ctx);
  assert.equal(success.status,200);
  assert.equal(await success.text(),'Synthetic access check OK');
  assert.equal(success.headers.get('cache-control'),'no-store, private');
  assert.equal(success.headers.get('x-jinxi-deploy'),f.ctx.deploy.id);
  assert.deepEqual(f.events,[]);
});

test('HTTP requests, deploy aliases and forged headers cannot use the metadata allowance',async()=>{
  const f=fixture();
  for(const origin of [f.origin.replace('https:','http:'),'https://'+'1'.repeat(24)+'--jinxi-synthetic-gate-test.netlify.app','https://other.invalid']){
    const headers={...f.headers,Host:new URL(f.origin).host,'x-forwarded-host':new URL(f.origin).host,
      'x-forwarded-proto':'https','x-nf-deploy-context':'production','x-jinxi-environment':'synthetic-test'};
    const response=await f.probe(new Request(origin,{headers}),f.ctx);
    assert.equal(response.status,503);
    assert.equal(await response.text(),'TEST_ACCESS_UNAVAILABLE');
    assert.equal(response.headers.get('x-jinxi-revision'),null);
    assert.equal(f.events.at(-1).checks.requestOrigin,false);
  }
});

test('metadata matching stays exact and rejects alternate hosts, ports, paths and URL decorations',async()=>{
  const f=fixture(),host=new URL(f.origin).host;
  for(const url of [
    'http://other.invalid','https://other.invalid','https://'+host+'.other.invalid',
    'http://'+host+':8080','https://'+host+':443','http://name@'+host,
    'http://'+host+'/','https://'+host+'/extra','http://'+host+'?query=1','http://'+host+'#fragment',
    'ftp://'+host,'HTTP://'+host,'',null,{},
  ]){
    const response=await f.probe(new Request(f.origin,{headers:f.headers}),{...f.ctx,site:{...f.ctx.site,url}});
    assert.equal(response.status,503);
    assert.equal(await response.text(),'TEST_ACCESS_UNAVAILABLE');
    assert.equal(f.events.at(-1).checks.siteOrigin,false);
  }
});

test('accepting provider HTTP metadata does not bypass other identity or access checks',async()=>{
  const f=fixture();
  for(const change of [
    {account:{id:'other'}},{site:{...f.ctx.site,id:'other'}},
    {deploy:{...f.ctx.deploy,context:'branch-deploy'}},{deploy:{...f.ctx.deploy,published:false}},
    {deploy:{...f.ctx.deploy,id:'not-a-deploy'}},
  ])assert.equal((await f.probe(new Request(f.origin,{headers:f.headers}),{...f.ctx,...change})).status,503);
  const wrong=await f.probe(new Request(f.origin,{headers:{Authorization:'Basic '+Buffer.from('jinxi-test:'+'0'.repeat(64)).toString('base64')}}),f.ctx);
  assert.equal(wrong.status,401);
  assert.equal((await f.probe(new Request(f.origin+'/api/member',{headers:f.headers}),f.ctx)).status,404);
});
