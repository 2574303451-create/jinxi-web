const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { cleanEnv } = require('../scripts/run-clean.cjs');
const { PROTECTED_SITE_ID } = require('../netlify/functions/_shared/test-resource');
const previousTest = require('../netlify/functions/_shared/test-resource-binding.json');
const { makeApproval, buildEnv, contextFor } = require('./synthetic-cloud-support.cjs');
const { buildReceipt, checkInvocation, credentialNames, DATABASE } = require('../synthetic-cloud/binding.cjs');
const { createEntry } = require('../synthetic-cloud/entry.cjs');
const { accessDigestKey, accessUser } = require('../synthetic-cloud/access.mjs');
const { administer, verifyAdminApproval } = require('../synthetic-cloud/database/admin.cjs');

function configuration() {
  const commit = 'a'.repeat(40);
  const approval = makeApproval({ target: { projectId:'synthetic-rehearsal-project',branchId:'br-synthetic-rehearsal',
    endpointId:'ep-synthetic-rehearsal',host:'ep-synthetic-rehearsal.us-east-2.aws.neon.tech',
    database:DATABASE,environmentId:'badb6a4a-6938-4b27-9e76-bfd78895133e',fingerprint:'3'.repeat(64),serverAddresses:['127.0.0.1'] } }, '4'.repeat(64), commit);
  const id = 'b'.repeat(24), env = buildEnv(approval,id), context = contextFor(approval,id);
  const password = randomBytes(32).toString('hex');
  const authorization = 'Basic ' + Buffer.from(accessUser + ':' + password).toString('base64');
  const runtime = { SITE_ID:approval.siteId, URL:approval.origin, JINXI_SERVICE_APPROVAL:commit,
    [accessDigestKey]:createHash('sha256').update(password).digest('hex') };
  return { commit, approval, id, env, context, runtime, authorization };
}

test('only the exact fresh checkout and trusted build metadata can produce a receipt', () => {
  const x = configuration();
  const receipt = buildReceipt(x.env,x.commit,true);
  assert.equal(receipt.deployId,x.id);
  assert.equal(receipt.approval.commit,x.commit);
  assert.throws(() => buildReceipt(x.env,'c'.repeat(40),true));
  assert.throws(() => buildReceipt(x.env,x.commit,false));
  for (const env of [
    {}, { CONTEXT:'deploy-preview' }, { CONTEXT:'branch-deploy' }, { BRANCH:'main' },
    { COMMIT_REF:'c'.repeat(40) }, { SITE_ID:PROTECTED_SITE_ID }, { PULL_REQUEST:'true' },
    { ACCOUNT_ID:'c'.repeat(24) }, { NETLIFY_PREVIEW_SERVER:'true' }, { INCOMING_HOOK_TITLE:'hook' },
    { REPOSITORY_URL:'https://github.com/synthetic-test/unapproved' },
    { DEPLOY_ID:'bad-id' }, { ENABLE_TEST:'true', JINXI_SYNTHETIC_BUILD_APPROVAL:undefined },
    { DATABASE_URL:'inherited' },
  ]) {
    const input = Object.keys(env).length ? { ...x.env, ...env } : {};
    assert.throws(() => buildReceipt(input,x.commit,true), /SYNTHETIC_DEPLOYMENT_NOT_APPROVED/);
  }
  for (const changed of [
    { siteId:PROTECTED_SITE_ID }, { siteId:previousTest.siteId }, { origin:'https://jinxi-web.netlify.app' },
    { origin:'https://jinxi-web-test.netlify.app' }, { projectId:previousTest.projectId },
    { branchId:previousTest.branchId }, { endpointId:previousTest.endpointId }, { host:previousTest.hosts[0] },
    { fingerprint:previousTest.fingerprint }, { environmentId:previousTest.environmentId },
    { database:'pr17-validation' }, { database:'neondb' }, { enabled:false }, { teamId:'badb6a4a-6938-4b27-9e76-bfd78895133e' },
    { expiresAt:'2000-01-01T00:00:00Z' }, { unexpectedKey:'rejected' },
  ]) {
    assert.throws(() => buildReceipt({ ...x.env,JINXI_SYNTHETIC_BUILD_APPROVAL:JSON.stringify({ ...x.approval,...changed }) },
      x.commit,true), /SYNTHETIC_DEPLOYMENT_NOT_APPROVED/);
  }
});

test('Runtime matches the published deploy, origin, site, team and approved SHA without build-only variables', () => {
  const x = configuration(), receipt = buildReceipt(x.env,x.commit,true);
  assert.equal(checkInvocation(receipt,x.runtime,x.context,x.approval.origin).commit,x.commit);
  for (const bad of [
    { site:{ ...x.context.site,id:PROTECTED_SITE_ID } }, { account:{ id:'wrong' } },
    { deploy:{ ...x.context.deploy,id:'d'.repeat(24) } }, { deploy:{ ...x.context.deploy,context:'branch-deploy' } },
    { deploy:{ ...x.context.deploy,published:false } }, { ip:'not-an-address' },
  ]) assert.throws(() => checkInvocation(receipt,x.runtime,{ ...x.context,...bad },x.approval.origin));
  for (const env of [
    { BRANCH:'main' }, { COMMIT_REF:'c'.repeat(40) }, { NODE_TLS_REJECT_UNAUTHORIZED:'0' },
    { PGSSLMODE:'disable' }, { JINXI_SERVICE_APPROVAL:'wrong' }, { SITE_ID:previousTest.siteId },
  ]) assert.throws(() => checkInvocation(receipt,{ ...x.runtime,...env },x.context,x.approval.origin));
  assert.throws(() => checkInvocation(receipt,x.runtime,x.context,'https://other.netlify.app'));
});

test('unapproved requests, unsupported paths, legacy writes and missing keys are rejected with no private output', async () => {
  const x = configuration(), entry = createEntry(buildReceipt(x.env,x.commit,true),x.runtime);
  const call = (url,opts,ctx=x.context) => entry(new Request(x.approval.origin+url,{
    ...opts, headers:{ Authorization:x.authorization,...opts?.headers },
  }),ctx);
  const unavailable = await call('/api/member');
  assert.equal(unavailable.status,503);
  assert.equal((await unavailable.json()).code,'SYNTHETIC_SERVICE_UNAVAILABLE');
  assert.equal(unavailable.headers.get('cache-control'),'no-store, private');
  assert.equal(unavailable.headers.get('set-cookie'),null);
  assert.equal((await call('/api/member',{}, { ...x.context, site:{...x.context.site,id:previousTest.siteId} })).status,503);
  for (const route of ['/api/member/','/api/admin','/.netlify/functions/auth-login','/.netlify/functions/jinxi-service/member']) {
    assert.equal((await call(route)).status,404);
  }
  const options = { method:'POST', body:'{}', headers:{ Origin:x.approval.origin } };
  assert.equal((await call('/.netlify/functions/messages',options)).status,410);
  assert.equal((await call('/api/member',{ ...options,headers:{ Origin:'https://example.invalid' } })).status,403);
  assert.equal((await call('/api/member',{ method:'PUT' })).status,405);
  assert.equal((await call('/api/member?op=me&op=profile')).status,400);
  assert.equal((await call('/api/member',{ ...options, headers:{ ...options.headers,'Content-Length':'65537' } })).status,413);
  const invalid = { ...x.runtime, ...Object.fromEntries(Object.values(credentialNames).map(key => [key,randomBytes(32).toString('hex')])) };
  invalid[credentialNames.member] = 'invalid-private-value';
  const result = await createEntry(buildReceipt(x.env,x.commit,true),invalid)(new Request(x.approval.origin+'/api/member',{
    headers:{Authorization:x.authorization},
  }),x.context);
  assert.equal(result.status,503);
  assert(!((await result.text()).includes(invalid[credentialNames.member])));
});

test('ordinary build cannot package this function or select the separate static app', () => {
  const root = path.resolve(__dirname,'..');
  assert(!fs.readdirSync(path.join(root,'netlify/functions')).some(name => name.startsWith('jinxi-service')));
  const ordinary = fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
  assert.match(ordinary,/directory = "netlify\/functions"/);
  assert.doesNotMatch(ordinary,/synthetic-cloud/);
  assert.match(fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'),/LEGACY_MEMBER_AUTH_READY = false/);
  const run = args => spawnSync(process.execPath,args,{cwd:root,env:cleanEnv(),encoding:'utf8',windowsHide:true});
  assert.equal(run(['synthetic-cloud/build.cjs','--check']).status,0);
  assert.equal(run(['synthetic-cloud/build.cjs']).status,1);
  assert.notEqual(run(['-e',"import('./synthetic-cloud/site/next.config.mjs')"]).status,0);
});

test('the shipped admin CLI refuses cloud DDL and role changes before making a connection', async () => {
  const { Client } = require('pg');
  const connect = Client.prototype.connect;
  let connections = 0;
  Client.prototype.connect = async () => { connections++; throw Error('UNEXPECTED_CONNECTION'); };
  try {
    const target = { projectId:'synthetic-rehearsal-project',branchId:'br-synthetic-rehearsal',
      endpointId:'ep-synthetic-rehearsal',host:'ep-synthetic-rehearsal.us-east-2.aws.neon.tech',
      database:DATABASE,environmentId:'badb6a4a-6938-4b27-9e76-bfd78895133e',fingerprint:'3'.repeat(64),
      serverAddresses:['127.0.0.1'],initializer:'synthetic_initializer' };
    for (const action of ['initialize','seed','activate','freeze','rollback-empty','verify']) {
      await assert.rejects(administer({action,target,password:'local test sentinel'}), /SYNTHETIC_ADMIN_APPROVAL_REQUIRED/);
    }
    assert.equal(connections,0);
  } finally { Client.prototype.connect = connect; }
});

test('an expired approval can freeze only its original environment and cannot enable service logins', () => {
  const { approval } = configuration();
  const keys = require('../synthetic-cloud/binding.cjs').resourceKeys;
  const target = { ...Object.fromEntries(keys.map(key=>[key,approval[key]])), initializer:'synthetic_initializer' };
  const expired = { version:1, enabled:true, target, expiresAt:'2000-01-01T00:00:00Z', schemaFingerprint:approval.schemaFingerprint };
  for (const action of ['initialize','seed','activate','rollback-empty']) {
    assert.throws(()=>verifyAdminApproval(expired,target,action,approval.schemaFingerprint), /SYNTHETIC_ADMIN_APPROVAL_REQUIRED/);
  }
  assert.doesNotThrow(()=>verifyAdminApproval(expired,target,'freeze'));
  assert.throws(()=>verifyAdminApproval(expired,{...target,environmentId:'389972b0-7347-40c5-bf81-415439318517'},'freeze'),
    /SYNTHETIC_ADMIN_APPROVAL_REQUIRED/);
  assert.throws(()=>verifyAdminApproval({...expired,enabled:false},target,'freeze'), /SYNTHETIC_ADMIN_APPROVAL_REQUIRED/);
});
