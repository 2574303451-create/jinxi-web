const {test}=require('node:test'),assert=require('node:assert/strict');
const {databaseConfig,guardedDatabase,withFunctionSecurity,requestDatabase,ATTESTATION_SQL,POLICIES}=require('../netlify/functions/_shared/function-security');
const {digest,FORBIDDEN_KEYS,PROTECTED_SITE_ID}=require('../netlify/functions/_shared/test-resource');
const {verifyBuild}=require('../scripts/test-build-gate.cjs');
const {fixture}=require('./support/test-resource.cjs');
const {cleanEnv}=require('../scripts/run-clean.cjs');
function transport(proof,counts){return()=>{counts.factories++;return{async transaction(fn){const queries=typeof fn==='function'?fn({query:(text,values)=>({text,values})}):fn;if(queries.some(q=>q.text===ATTESTATION_SQL)){counts.identity++;return[[],[proof]];}counts.business++;return[[],[{syntheticOnly:true}]];}}};}
const counter=()=>({factories:0,identity:0,business:0});
test('TEST in its own production context remains synthetic-test',async()=>{const f=fixture(),c=counter();assert.equal(databaseConfig(f.env,'public-read',f.resources).policy.classification,'synthetic-test');const result=await guardedDatabase(f.env,transport(f.proof,c),'public-read',f.resources).query('SELECT synthetic');assert.equal(result[0].syntheticOnly,true);assert.deepEqual(c,{factories:1,identity:1,business:1});});
test('build-stamped context works without runtime CONTEXT; available CONTEXT must agree',()=>{const f=fixture();assert.equal(databaseConfig(f.env,'public-read',f.resources).context,'production');f.env.CONTEXT='branch-deploy';assert.throws(()=>databaseConfig(f.env,'public-read',f.resources),e=>e.code==='TEST_DEPLOY_CONTEXT_CONFLICT');});
test('explicit approved deploy-preview and branch-deploy preserve resource classification',()=>{for(const context of ['deploy-preview','branch-deploy']){const f=fixture();f.resources.deploy.context=context;f.env.CONTEXT=context;f.env.JINXI_RUNTIME_CONTEXT=context;assert.equal(databaseConfig(f.env,'public-read',f.resources).policy.classification,'synthetic-test');}});
const invalidCases={
 'missing binding':f=>{f.resources.binding=null},
 'unapproved binding':f=>{f.resources.binding.status='pending-approval'},
 'missing resource identity':f=>{delete f.env.JINXI_RESOURCE_ENVIRONMENT},
 'missing site':f=>{delete f.env.SITE_ID},
 'wrong site':f=>{f.env.SITE_ID='00000000-0000-4000-8000-000000000999'},
 'protected production site':f=>{f.env.SITE_ID=PROTECTED_SITE_ID},
 'wrong context':f=>{f.env.CONTEXT='deploy-preview'},
 'missing runtime policy':f=>{delete f.env.JINXI_RUNTIME_CONTEXT},
 'missing deploy proof':f=>{f.resources.deploy=null},
 'changed binding after build':f=>{f.resources.binding.branchId='br-changed'},
 'missing approval':f=>{delete f.env.JINXI_CLOUD_ISOLATION_APPROVAL},
 'missing TEST URL':f=>{delete f.env.JINXI_TEST_READ_DATABASE_URL},
 'simulated production host':f=>{const u=new URL(f.env.JINXI_TEST_READ_DATABASE_URL);u.hostname='production-like.invalid';f.env.JINXI_TEST_READ_DATABASE_URL=u.toString()},
 'simulated production role':f=>{const u=new URL(f.env.JINXI_TEST_READ_DATABASE_URL);u.username='production_owner';f.env.JINXI_TEST_READ_DATABASE_URL=u.toString()},
 'different database':f=>{const u=new URL(f.env.JINXI_TEST_READ_DATABASE_URL);u.pathname='/other';f.env.JINXI_TEST_READ_DATABASE_URL=u.toString()},
 'TLS disabled':f=>{const u=new URL(f.env.JINXI_TEST_READ_DATABASE_URL);u.search='?sslmode=disable';f.env.JINXI_TEST_READ_DATABASE_URL=u.toString()},
 'role injection options':f=>{const u=new URL(f.env.JINXI_TEST_READ_DATABASE_URL);u.searchParams.set('options','-c role=production_owner');f.env.JINXI_TEST_READ_DATABASE_URL=u.toString()},
 'wrong declared classification':f=>{f.resources.binding.classification='production'},
};
for(const [name,mutate]of Object.entries(invalidCases))test(name+' refuses before transport',async()=>{const f=fixture(),c=counter();mutate(f);const h=withFunctionSecurity('messages',transport(f.proof,c),f.env,async()=>{throw Error('Business must not run')},f.resources);const r=await h({httpMethod:'GET'});assert.equal(r.statusCode,503);assert.deepEqual(c,counter());});
test('forbidden inherited keys reject without reading even one value',()=>{for(const key of FORBIDDEN_KEYS){const f=fixture();let reads=0;Object.defineProperty(f.env,key,{get(){reads++;throw Error('No value read permitted')}});assert.throws(()=>databaseConfig(f.env,'public-read',f.resources),e=>e.code==='TEST_INHERITED_FORBIDDEN_VARIABLE');assert.equal(reads,0);}});
for(const [name,change]of Object.entries({fingerprint:p=>{p.cluster_id='other'},classification:p=>{p.classification='production'},role:p=>{p.role='other'},membership:p=>{p.role_memberships=true},ownership:p=>{p.owns_objects=true},columnWrite:p=>{p.writes_outside_scope=true},definer:p=>{p.unsafe_definer_access=true}}))test('actual '+name+' mismatch prevents business query',async()=>{const f=fixture(),c=counter();change(f.proof);await assert.rejects(guardedDatabase(f.env,transport(f.proof,c),'public-read',f.resources).query('SELECT synthetic'));assert.deepEqual(c,{factories:1,identity:1,business:0});});
test('transport failure returns sanitized unavailable and never logs connection data',async()=>{const f=fixture();let business=0;const h=withFunctionSecurity('messages',()=>{throw Error(f.env.JINXI_TEST_READ_DATABASE_URL)},f.env,async()=>{await requestDatabase().query('SELECT synthetic');business++;return{}},f.resources);const r=await h({httpMethod:'GET'});assert.equal(r.statusCode,503);assert.equal(business,0);assert(!r.body.includes(new URL(f.env.JINXI_TEST_READ_DATABASE_URL).password));assert(!r.body.includes('synthetic-unit.invalid'));assert(!r.body.includes('postgres'));});
test('all old write interfaces remain closed before any TEST transport',async()=>{for(const name of Object.keys(POLICIES))for(const method of ['POST','PUT','DELETE']){const f=fixture(),c=counter(),h=withFunctionSecurity(name,transport(f.proof,c),f.env,async()=>{throw Error('Closed')},f.resources);assert([401,403,405].includes((await h({httpMethod:method})).statusCode));assert.deepEqual(c,counter());}});
test('session-lab stays local-only; future writer has no cloud endpoint',()=>{const f=fixture();assert.throws(()=>databaseConfig(f.env,'session-lab',f.resources),e=>e.code==='TEST_WRITE_NOT_APPROVED');});
test('Free-plan all-scope TEST build is pinned and rejects inherited production variables',()=>{const f=fixture();f.env.CONTEXT='production';f.env.JINXI_TEST_APPROVED_COMMIT=f.resources.deploy.commit;assert.equal(verifyBuild(f.env,f.resources.binding,f.resources.deploy.commit).bindingDigest,digest(f.resources.binding));assert.throws(()=>verifyBuild({...f.env,JINXI_TEST_APPROVED_COMMIT:'b'.repeat(40)},f.resources.binding,f.resources.deploy.commit));for(const key of FORBIDDEN_KEYS)assert.throws(()=>verifyBuild({...f.env,[key]:'forbidden-placeholder'},f.resources.binding,f.resources.deploy.commit));});
test('Next build subprocess never inherits any database/admin/cloud variable',()=>{const child=cleanEnv();for(const key of [...FORBIDDEN_KEYS,'JINXI_TEST_READ_DATABASE_URL','JINXI_CLOUD_ISOLATION_APPROVAL','JINXI_RUNTIME_CONTEXT'])assert.equal(Object.hasOwn(child,key),false);});
