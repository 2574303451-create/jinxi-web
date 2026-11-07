const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCommunityHandler}=require('../community-local/handler.cjs');
const fixture=()=>({kind:'jinxi-member-local-v1',host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_member_session',password:'unit-synthetic',origin:'https://127.0.0.1:3069',environmentId:crypto.randomUUID(),fingerprint:'0'.repeat(64),csrfKey:'1'.repeat(64),rateKey:'2'.repeat(64)});
const event=body=>({httpMethod:'POST',headers:{origin:'https://127.0.0.1:3069','content-type':'application/json'},queryStringParameters:{},body:JSON.stringify(body)});
test('community rejects cloud targets and inherited credential names before connection or value access',async()=>{
 for(const key of ['DATABASE_URL','ADMIN_PASSWORD','NETLIFY','JINXI_TEST_READ_DATABASE_URL']){
  let reads=0,connects=0;const env={};Object.defineProperty(env,key,{enumerable:true,get(){reads++;throw Error('DO_NOT_READ');}});
  const h=createCommunityHandler({settings:fixture(),env,identity:()=>{throw Error('must not authenticate');},connect:()=>{connects++;}});
  assert.equal((await h({httpMethod:'GET',headers:{},queryStringParameters:{kind:'message'}})).statusCode,503);assert.equal(reads,0);assert.equal(connects,0);
 }
 let connects=0;const h=createCommunityHandler({settings:{...fixture(),host:'cloud-like.invalid'},env:{},connect:()=>{connects++;}});
 assert.equal((await h(event({op:'message.create',requestId:crypto.randomUUID(),content:'test'}))).statusCode,503);assert.equal(connects,0);
});
test('community rejects forged authority, invalid methods and CSRF before business connection',async()=>{
 let connects=0;const identity=async()=>({statusCode:200,body:JSON.stringify({member:{id:crypto.randomUUID(),displayName:'合成'},needsPasswordChange:false,csrfToken:'trusted-synthetic'})});
 const h=createCommunityHandler({settings:fixture(),identity,env:{},connect:()=>{connects++;throw Error('DO_NOT_CONNECT');}});
 const body={op:'message.create',requestId:crypto.randomUUID(),content:'合成'};
 for(const [e,status]of [
  [{...event(body),headers:{origin:'https://attacker.invalid'}},403],
  [event({...body,memberId:crypto.randomUUID()}),403],[event({...body,author:'伪造昵称'}),403],[event({...body,isAdmin:true}),403],
  [event(body),403],[event({...body,requestId:'invalid'}),400],
  [{...event(body),httpMethod:'OPTIONS'},405],[{...event(body),isBase64Encoded:true},413],
  [{httpMethod:'GET',headers:{},queryStringParameters:{kind:'message',scope:'public',userId:'forged'}},400]
 ])assert.equal((await h(e)).statusCode,status);
 assert.equal(connects,0);
});
test('community transport errors are sanitized and never set cookies or permissive CORS',async()=>{
 const h=createCommunityHandler({settings:fixture(),env:{},connect:()=>{throw Error('PRIVATE_DATABASE_PASSWORD_MARKER');}});
 const r=await h({httpMethod:'GET',headers:{},queryStringParameters:{kind:'message',scope:'public'}});
 assert.equal(r.statusCode,503);assert(!r.body.includes('PRIVATE_'));assert.equal(r.headers['Set-Cookie'],undefined);assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);assert.equal(r.headers['Cache-Control'],'no-store');
});
