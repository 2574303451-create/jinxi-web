import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {manualProbe} from './manual-runtime.mjs';

function fixture(){
  const sha='a'.repeat(40),deadline=Date.now()+60000,origin='https://jinxi-synthetic-gate-test.netlify.app';
  const password=randomBytes(32).toString('hex');
  const env={JINXI_SERVICE_APPROVAL:sha,JINXI_GATE_EXPIRES_AT:new Date(deadline).toISOString(),
    JINXI_SYNTHETIC_ACCESS_SHA256:createHash('sha256').update(password).digest('hex')};
  const ctx={account:{id:'689e1405e8627000726e883c'},site:{id:'e8033919-6f54-4a27-b09d-26c14d8831ce',url:origin},
    deploy:{id:'1'.repeat(24),context:'production',published:true}};
  return {sha,deadline,origin,password,env,ctx};
}

test('context refusal reports only boolean checks and keeps the public 503 private',async()=>{
  const f=fixture(),events=[];
  const probe=manualProbe(f.sha,f.deadline,key=>f.env[key],event=>events.push(event));
  const response=await probe(new Request(f.origin),{...f.ctx,account:{id:'unexpected-account-value'}});
  assert.equal(response.status,503);
  assert.equal(await response.text(),'TEST_ACCESS_UNAVAILABLE');
  assert.equal(response.headers.get('cache-control'),'no-store, private');
  assert.equal(response.headers.get('x-jinxi-deploy'),null);
  assert.equal(events.length,1);
  assert.equal(events[0].reason,'context');
  assert.equal(events[0].checks.account,false);
  assert(Object.values(events[0].checks).every(value=>typeof value==='boolean'));
  const serialized=JSON.stringify(events);
  for(const value of [f.password,...Object.values(f.env),f.ctx.account.id,f.ctx.site.id,f.ctx.deploy.id,f.origin,'unexpected-account-value']){
    assert(!serialized.includes(value),'diagnostics leaked a binding, URL or secret value');
  }
});

test('environment refusals and thrown reads identify a safe stage while logging failures still refuse',async()=>{
  const f=fixture();
  const scenarios=[
    {key:'JINXI_SERVICE_APPROVAL',value:'unapproved-sensitive-value',reason:'approval'},
    {key:'JINXI_GATE_EXPIRES_AT',value:'invalid-sensitive-value',reason:'expiry'},
    {key:'JINXI_GATE_EXPIRES_AT',value:new Date(0).toISOString(),reason:'expiry'},
    {key:'JINXI_GATE_EXPIRES_AT',value:new Date(f.deadline+1).toISOString(),reason:'expiry'},
    {key:'JINXI_SYNTHETIC_ACCESS_SHA256',value:'invalid-sensitive-value',reason:'access-config'},
    ...[['JINXI_GATE_EXPIRES_AT','expiry-read'],['JINXI_SERVICE_APPROVAL','approval-read'],
      ['JINXI_SYNTHETIC_ACCESS_SHA256','digest-read']].map(([key,stage])=>({key,stage,throws:true,reason:'exception'})),
  ];
  for(const scenario of scenarios){
    const read=key=>{if(key!==scenario.key)return f.env[key];if(scenario.throws)throw Error(f.password);return scenario.value;};
    const events=[];
    for(const method of ['GET','HEAD']){
      const response=await manualProbe(f.sha,f.deadline,read,event=>events.push(event))(new Request(f.origin,{method}),f.ctx);
      assert.equal(response.status,503);
      assert.equal(await response.text(),method==='HEAD'?'':'TEST_ACCESS_UNAVAILABLE');
      assert.equal(response.headers.get('x-jinxi-revision'),null);
    }
    assert.equal(events.length,2);
    assert(events.every(event=>event.reason===scenario.reason));
    if(scenario.stage)assert(events.every(event=>event.stage===scenario.stage));
    for(const event of events)assert(Object.values(event.checks).every(value=>typeof value==='boolean'));
    const output=JSON.stringify(events);
    for(const value of [f.password,...Object.values(f.env),'invalid-sensitive-value','unapproved-sensitive-value'])assert(!output.includes(value));
    const stillClosed=await manualProbe(f.sha,f.deadline,read,()=>{throw Error(f.password);})(new Request(f.origin),f.ctx);
    assert.equal(stillClosed.status,503);
    assert.equal(await stillClosed.text(),'TEST_ACCESS_UNAVAILABLE');
  }
});

test('valid identity and ordinary credential rejection keep their public behavior without diagnostics',async()=>{
  const f=fixture(),events=[];
  const probe=manualProbe(f.sha,f.deadline,key=>f.env[key],event=>events.push(event));
  const headers={Authorization:'Basic '+Buffer.from('jinxi-test:'+f.password).toString('base64')};
  for(const [request,status,body]of [
    [new Request(f.origin),401,'TEST_ACCESS_REQUIRED'],
    [new Request(f.origin,{headers:{Authorization:'Basic '+Buffer.from('jinxi-test:'+'0'.repeat(64)).toString('base64')}}),401,'TEST_ACCESS_REQUIRED'],
    [new Request(f.origin,{headers}),200,'Synthetic access check OK'],
    [new Request(f.origin,{headers,method:'HEAD'}),200,''],
    [new Request(f.origin+'/api/member',{headers}),404,'TEST_ROUTE_NOT_FOUND'],
    [new Request(f.origin,{headers,method:'POST'}),405,'TEST_METHOD_REJECTED'],
  ]){
    const response=await probe(request,f.ctx);
    assert.equal(response.status,status);assert.equal(await response.text(),body);
    assert.equal(response.headers.get('cache-control'),'no-store, private');
    assert.equal(response.headers.get('vary'),'Authorization');
    assert(![...response.headers.keys()].some(name=>/diagnostic|reason|stage|checks/.test(name)));
  }
  assert.deepEqual(events,[]);
});

test('default reporter writes a static server log marker and no exception contents',async t=>{
  const f=fixture(),lines=[];
  t.mock.method(console,'warn',(...args)=>lines.push(args));
  const response=await manualProbe(f.sha,f.deadline,()=>{throw Error(f.password);})(new Request(f.origin),f.ctx);
  assert.equal(response.status,503);
  assert.equal(lines.length,1);assert.equal(lines[0][0],'JINXI_GATE_REFUSAL');
  assert.deepEqual(JSON.parse(lines[0][1]),{version:1,reason:'exception',stage:'expiry-read',checks:{}});
  assert(!JSON.stringify(lines).includes(f.password));
});
