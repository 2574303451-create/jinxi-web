const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {localSettings,createMemberHandler,COOKIE}=require('../member-local/identity.cjs');
const fixture=()=>({kind:'jinxi-member-local-v1',host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_member_session',password:'synthetic-unit-only',origin:'https://127.0.0.1:3069',environmentId:crypto.randomUUID(),fingerprint:'1'.repeat(64),csrfKey:crypto.randomBytes(32).toString('hex'),rateKey:crypto.randomBytes(32).toString('hex')});
test('local identity accepts only its separate loopback database and rejects cloud before connecting',async()=>{
  const cases=[s=>{s.host='production-like.invalid'},s=>{s.port=55433},s=>{s.database='neondb'},s=>{s.user='neondb_owner'},s=>{s.origin='https://jinxi-web-test.netlify.app'},s=>{s.databaseUrl='forbidden'}];
  for(const mutate of cases){const s=fixture();mutate(s);let connects=0;const h=createMemberHandler({settings:s,env:{},connect:()=>{connects++;throw Error('must not connect')}});const r=await h({httpMethod:'GET',headers:{},queryStringParameters:{op:'me'}});assert.equal(r.statusCode,503);assert.equal(connects,0);assert.equal(r.body.includes(s.password),false);}
});
test('hosted context and inherited database/admin keys reject without reading their values',()=>{
  for(const key of ['SITE_ID','CONTEXT','NETLIFY','DATABASE_URL','ADMIN_PASSWORD','JINXI_TEST_READ_DATABASE_URL','JINXI_LOCAL_SESSION_DATABASE_URL']){let reads=0;const env={};Object.defineProperty(env,key,{enumerable:true,get(){reads++;throw Error('must not read')}});assert.throws(()=>localSettings(fixture(),env));assert.equal(reads,0);}
});
test('origin, CSRF shape, input authority and unsupported businesses reject without database work',async()=>{
  let connects=0;const h=createMemberHandler({settings:fixture(),env:{},connect:()=>{connects++;throw Error('must not connect')}});
  const event=body=>({httpMethod:'POST',headers:{origin:'https://127.0.0.1:3069','content-type':'application/json'},body:JSON.stringify(body)});
  for(const [e,status]of [[{...event({op:'login'}),headers:{origin:'https://attacker.invalid'}},403],[event({op:'points'}),400],[event({op:'login',memberId:'forged',account:'test',password:'test'}),403],[event({op:'login',account:[],password:'test'}),400],[{...event({op:'login'}),isBase64Encoded:true},413],[{httpMethod:'GET',headers:{},queryStringParameters:{op:'profile',memberId:crypto.randomUUID()}},403]]){assert.equal((await h(e)).statusCode,status);}
  assert.equal(connects,0);assert.match(COOKIE,/^__Host-/);
});
test('pre-auth failures do not emit internal errors or permissive CORS',async()=>{
  const h=createMemberHandler({settings:fixture(),env:{},connect:()=>{throw Error('PRIVATE_FAILURE_WITH_CREDENTIALS')}});const r=await h({httpMethod:'GET',headers:{},queryStringParameters:{op:'me'}});assert.equal(r.statusCode,401);assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);assert.equal(r.headers['Cache-Control'],'no-store');assert(!r.body.includes('PRIVATE_'));
});
