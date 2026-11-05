const {test}=require('node:test'),assert=require('node:assert/strict');
const {POLICIES,databaseConfig}=require('../netlify/functions/_shared/function-security');
const {handler}=require('./support/function-handler.cjs');
test('all legacy identity/mutations are denied without a database transport',async()=>{
 for(const name of Object.keys(POLICIES))for(const method of ['POST','PUT','DELETE']){
  let calls=0;const h=handler(name,{DATABASE_URL:'synthetic-transport-only'},()=>{calls++;return async()=>[]});
  const r=await h({httpMethod:method,body:JSON.stringify({account:'synthetic-b',userId:'synthetic-b',action:'award',pointDelta:4999,pointCost:1,scene:'daily_behavior',eventType:'checkin',bizId:'forged'})});
  assert.equal(calls,0,name+' '+method+' must not create a legacy connection');assert([401,403,405].includes(r.statusCode),name+' '+r.statusCode);
 }
});
test('missing runtime context never reads an inherited DATABASE_URL',async()=>{
 for(const name of Object.keys(POLICIES)){
  let reads=0,calls=0;const env={};Object.defineProperty(env,'DATABASE_URL',{get(){reads++;throw Error('Forbidden production value read')}});
  const r=await handler(name,env,()=>{calls++;throw Error('Must not connect')})({httpMethod:'GET',queryStringParameters:{}});
  assert.equal(reads,0,name);assert.equal(calls,0,name);assert([401,403,503].includes(r.statusCode));assert(!/postgres|password|stack/.test(r.body));
 }
});
test('contexts and least-privilege policy are explicit; no old URL fallback',()=>{
 for(const context of ['production','deploy-preview','branch-deploy','local',undefined,'preview-server'])assert.throws(()=>databaseConfig({CONTEXT:context,DATABASE_URL:'must-not-use'}));
 assert.throws(()=>databaseConfig({JINXI_RUNTIME_CONTEXT:'local',CONTEXT:'production'}));
});
module.exports={handler};
