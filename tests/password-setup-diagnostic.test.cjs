const {test}=require('node:test');
const assert=require('node:assert/strict');
const {describeFailure,parseMode,checkScope}=require('../scripts/setup-test-reader-password.cjs');
const {APPROVED_TARGET}=require('../scripts/prepare-test-bootstrap.cjs');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {EventEmitter}=require('node:events');

async function diagnosticCli(connectionError) {
 const filename=path.resolve(__dirname,'../scripts/setup-test-reader-password.cjs');
 const actualRequire=createRequire(filename),mod={exports:{}},queries=[],output=[];
 let prompts=0,ended=false;
 const gate={initializationAccepted:true,credentialIncident:{status:'user-confirmed-rotated'},
  readerHandoff:{endpoint:{directHost:'ep-dry-queen-bd6q46s6.c-8.us-east-2.aws.neon.tech'}},
  bootstrap:{target:APPROVED_TARGET,environmentId:'00000000-0000-4000-8000-000000000000'}};
 const privateFixture='SyntheticOnly-Not-A-Real-Password';
 class FakeClient extends EventEmitter {
  constructor(config) {
   super();assert.equal(config.password,privateFixture);
   assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.enableChannelBinding,true);
  }
  async connect() {if(connectionError)throw connectionError;}
  async query(sql,values) {
   assert.equal(values,undefined);queries.push(sql);
   return {rows:[{statements:'none',duration:'-1',sample:'-1',error_parameters:'0',minimum_messages:'warning',
    debug_parse:'off',debug_rewrite:'off',debug_plan:'off',stats:null,audit:null,audit_role:null,explain:null}]};
  }
  async end() {ended=true;}
 }
 const mocks={pg:{Client:FakeClient},'node:fs':{
  readFileSync:()=>JSON.stringify({gate2Execution:gate}),existsSync:()=>false,
  writeFileSync:()=>{throw Error('diagnostic must never write a provisioning receipt');},
 },'node:readline':{createInterface:()=>{
  const rl=new EventEmitter();
  rl.question=(_label,done)=>{prompts++;done(privateFixture);};
  rl.close=()=>rl.emit('close');return rl;
 }},'node:child_process':{spawnSync:()=>{throw Error('diagnostic child must never start reader proof');}}};
 const mockRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:actualRequire(id);
 const proc={argv:['node',filename,'--clean-child','--diagnose'],execArgv:[],env:{},
  stdin:{isTTY:true},stdout:{isTTY:true,write:text=>output.push(text)}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nmodule.exports.testMain=main;',
  {require:mockRequire,module:mod,__dirname:path.dirname(filename),__filename:filename,process:proc,
   console:{log:text=>output.push(text)}});
 let failure;
 try{await mod.exports.testMain();}catch(error){failure=error;}
 assert.equal(prompts,1);assert.equal(ended,true);
 assert(!output.join('\n').includes(privateFixture));
 return {queries,output,failure};
}
test('administrator authentication failure exposes only stage and SQLSTATE',()=>{
 const e=Object.assign(Error('fixture private text must not be returned'),{code:'28P01'});
 assert.deepEqual(describeFailure(e,'ADMIN_CONNECT'),{stage:'ADMIN_CONNECT',reason:'ADMIN_AUTHENTICATION_FAILED',code:'28P01'});
});
test('TLS validation failure is distinct and never requests disabling verification',()=>{
 const e=Object.assign(Error('fixture certificate detail must not be returned'),{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'});
 assert.deepEqual(describeFailure(e,'ADMIN_CONNECT'),{stage:'ADMIN_CONNECT',reason:'TLS_CERTIFICATE_REJECTED',code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'});
});
test('known preflight guard messages survive without database query or parameters',()=>{
 const e=Object.assign(Error('TEST_VERIFICATION_STRUCTURE_CHANGED'),{code:'P0001',detail:'fixture detail',where:'fixture query'});
 assert.deepEqual(describeFailure(e,'PREFLIGHT'),{stage:'PREFLIGHT',reason:'TEST_VERIFICATION_STRUCTURE_CHANGED',code:'P0001'});
});
test('a familiar-looking prefix cannot disclose arbitrary error content',()=>{
 const e=Object.assign(Error('TEST_READER_fixture_private_detail'),{code:'P0001',detail:'fixture details'});
 const diagnostic=describeFailure(e,'PREFLIGHT');
 assert.equal(diagnostic.reason,'DATABASE_ERROR');
 assert(!JSON.stringify(diagnostic).includes('fixture'));
});

test('unknown stage, message, details and code cannot appear in the diagnostic',()=>{
 const diagnostic=describeFailure({message:'fixture private',code:'fixture private',detail:'fixture private'},'fixture private');
 assert.deepEqual(diagnostic,{stage:'UNKNOWN',reason:'UNCLASSIFIED_FAILURE'});
 assert(!JSON.stringify(diagnostic).includes('fixture'));
});

test('logging-policy diagnostics contain only fixed names, never setting values',()=>{
 const diagnostic=describeFailure({message:'TEST_PASSWORD_LOGGING_POLICY_UNPROVEN',
  blockedLogging:['log_statement','fixture private','log_statement']},'PREFLIGHT');
 assert.deepEqual(diagnostic,{stage:'PREFLIGHT',reason:'TEST_PASSWORD_LOGGING_POLICY_UNPROVEN',blockedLogging:['log_statement']});
});

test('diagnostic mode accepts no password, connection or extra argument',()=>{
 assert.deepEqual(parseMode(['--diagnose']),{child:false,diagnoseOnly:true});
 assert.deepEqual(parseMode(['--clean-child','--diagnose']),{child:true,diagnoseOnly:true});
 assert.deepEqual(parseMode([]),{child:false,diagnoseOnly:false});
 for(const args of [['--diagnose','fixture'],['--host','fixture'],['--clean-child','--password','fixture']]) {
  assert.throws(()=>parseMode(args),/^Error: NO_PASSWORD_OR_CONNECTION_ARGUMENTS_ACCEPTED$/);
 }
});

test('diagnostic preflight has enforced read-only SQL and rolls back without secret parameters',async()=>{
 const sql=[];
 const safe={statements:'none',duration:'-1',sample:'-1',error_parameters:'0',minimum_messages:'warning',
  debug_parse:'off',debug_rewrite:'off',debug_plan:'off',stats:null,audit:null,audit_role:null,explain:null};
 const client={query:async(text,values)=>{
  assert.equal(values,undefined);
  sql.push(text);
  return {rows:[safe]};
 }};
 await checkScope(client,{...APPROVED_TARGET,environmentId:'00000000-0000-4000-8000-000000000000'});
 assert.match(sql[0],/^BEGIN READ ONLY;\n/);
 assert.equal(sql.at(-1),'ROLLBACK');
 assert(!sql.join('\n').includes('ALTER ROLE jinxi_test_reader'));
 assert(!sql.join('\n').includes('reader_password_input'));
});

test('failed diagnostic preflight still rolls back and does not expose the rejected setting value',async()=>{
 const sql=[];
 const client={query:async text=>{sql.push(text);return {rows:[{statements:'fixture private'}]};}};
 await assert.rejects(checkScope(client,{...APPROVED_TARGET,environmentId:'00000000-0000-4000-8000-000000000000'}),error=>{
  const diagnostic=describeFailure(error,'PREFLIGHT');
  assert.equal(diagnostic.reason,'TEST_PASSWORD_LOGGING_POLICY_UNPROVEN');
  assert(diagnostic.blockedLogging.includes('log_statement'));
  assert(!JSON.stringify(diagnostic).includes('fixture'));
  return true;
 });
 assert.equal(sql.at(-1),'ROLLBACK');
});

test('actual diagnostic CLI stops after read-only preflight with no reader prompt, write or proof launch',async()=>{
 const result=await diagnosticCli();
 assert.equal(result.failure,undefined);
 assert.match(result.queries[0],/^BEGIN READ ONLY;\n/);
 assert.equal(result.queries.at(-1),'ROLLBACK');
 assert(result.output.includes('{"stage":"PREFLIGHT","reason":"READ_ONLY_PREFLIGHT_PASSED"}'));
});

test('actual diagnostic CLI identifies administrator auth failure and never submits SQL',async()=>{
 const result=await diagnosticCli(Object.assign(Error('fixture private backend message'),{code:'28P01'}));
 assert.deepEqual(JSON.parse(JSON.stringify(result.failure.diagnostic)),
  {stage:'ADMIN_CONNECT',reason:'ADMIN_AUTHENTICATION_FAILED',code:'28P01'});
 assert.equal(result.queries.length,0);
});
