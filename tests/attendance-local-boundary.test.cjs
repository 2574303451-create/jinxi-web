const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createAttendanceHandler}=require('../attendance-local/handler.cjs');
const settings=()=>({kind:'jinxi-member-local-v1',host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_member_session',password:'synthetic-unit-only',origin:'https://127.0.0.1:3069',environmentId:crypto.randomUUID(),fingerprint:'0'.repeat(64),csrfKey:'1'.repeat(64),rateKey:'2'.repeat(64)});
const post=body=>({httpMethod:'POST',headers:{origin:'https://127.0.0.1:3069','content-type':'application/json','x-csrf-token':'unit-csrf'},body:JSON.stringify(body),queryStringParameters:{}});
const me=async()=>({statusCode:200,body:JSON.stringify({member:{id:crypto.randomUUID()},csrfToken:'unit-csrf',needsPasswordChange:false})});
test('attendance refuses cloud names and nonlocal targets before credential value access or connection',async()=>{
 for(const key of ['DATABASE_URL','ADMIN_PASSWORD','NETLIFY','JINXI_TEST_READ_DATABASE_URL']){
  let reads=0,connections=0;const env={};Object.defineProperty(env,key,{enumerable:true,get(){reads++;throw Error('DO_NOT_READ');}});
  const h=createAttendanceHandler({settings:settings(),env,identity:me,connect:()=>{connections++;}});assert.equal((await h({httpMethod:'GET',headers:{}})).statusCode,503);assert.equal(reads,0);assert.equal(connections,0);
 }
 let connections=0;const h=createAttendanceHandler({settings:{...settings(),host:'not-local.invalid'},env:{},identity:me,connect:()=>{connections++;}});assert.equal((await h(post({op:'checkin',requestId:crypto.randomUUID()}))).statusCode,503);assert.equal(connections,0);
});
test('client identity, date, reward, malformed reads and CSRF never reach the attendance database',async()=>{
 let connects=0;const h=createAttendanceHandler({settings:settings(),env:{},identity:me,connect:()=>{connects++;throw Error('MUST_NOT_CONNECT');}}),body={op:'checkin',requestId:crypto.randomUUID()};
 for(const key of ['userId','user_id','memberId','user_name','account','date','checkin_date','checkin_time','continuous_days','is_continuous','reward_points','bizId','isAdmin'])assert.equal((await h(post({...body,[key]:'forged'}))).statusCode,403);
 for(const query of [{month:'2024-13'},{before:'2024-02-30'},{limit:'0'},{limit:'101'},{limit:'1e2'}])assert.equal((await h({httpMethod:'GET',headers:{},queryStringParameters:query})).statusCode,400);
 for(const [e,status]of [[{...post(body),headers:{origin:'https://attacker.invalid'}},403],[{...post(body),headers:{}},403],[{...post(body),headers:{...post(body).headers,'x-csrf-token':'forged'}},403],[{...post(body),httpMethod:'OPTIONS'},405],[{...post(body),isBase64Encoded:true},413],[post({...body,requestId:'wrong'}),400],[post({op:'settle',requestId:crypto.randomUUID()}),400]])assert.equal((await h(e)).statusCode,status);
 assert.equal(connects,0);
});
test('unavailable storage and identity failures return no internal credentials, private data, cookies or CORS',async()=>{
 const h=createAttendanceHandler({settings:settings(),env:{},identity:me,connect:()=>{throw Error('PRIVATE_DATABASE_CREDENTIAL_MARKER');}});
 const r=await h(post({op:'checkin',requestId:crypto.randomUUID()}));assert.equal(r.statusCode,503);assert(!r.body.includes('PRIVATE_'));assert(!r.headers['Set-Cookie']);assert(!r.headers['Access-Control-Allow-Origin']);assert.equal(r.headers['Cache-Control'],'no-store');
 let connects=0;const unavailable=createAttendanceHandler({settings:settings(),env:{},identity:async()=>({statusCode:401,headers:{},body:'{"code":"SESSION_INVALID"}'}),connect:()=>{connects++;}});assert.equal((await unavailable({httpMethod:'GET',headers:{}})).statusCode,401);assert.equal(connects,0);
});
