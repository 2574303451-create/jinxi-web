import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';
import { gateProbe } from './handler.mjs';
import build from './build.cjs';

const commit = '1'.repeat(40);
const env = {
  NETLIFY: 'true', CONTEXT: 'production', PULL_REQUEST: 'false',
  SITE_ID: 'e8033919-6f54-4a27-b09d-26c14d8831ce', ACCOUNT_ID: '689e1405e8627000726e883c',
  URL: 'https://jinxi-synthetic-gate-test.netlify.app', BRANCH: 'codex/jinxi-phase4-synthetic-cloud-gate-only',
  REPOSITORY_URL: 'https://github.com/2574303451-create/jinxi-web', DEPLOY_ID: '2'.repeat(24),
  JINXI_GATE_EXPIRES_AT: new Date(Date.now() + 600000).toISOString(), COMMIT_REF: commit, JINXI_SERVICE_APPROVAL: commit,
};
const binding = build.bindingFor(env, commit, true);
test('build rejects mismatched identity, inherited credentials and stale approvals', () => {
  for (const key of Object.keys(env)) assert.throws(() => build.bindingFor({ ...env, [key]: '' }, commit, true), /REJECTED/, key);
  for (const key of ['DATABASE_URL', 'PGPASSWORD', 'JINXI_SYNTHETIC_DB_MEMBER', 'INCOMING_HOOK_URL']) {
    assert.throws(() => build.bindingFor({ ...env, [key]: 'fixture' }, commit, true), /REJECTED/);
  }
  assert.throws(() => build.bindingFor(env, commit, false), /REJECTED/);
  assert.throws(() => build.bindingFor({ ...env, JINXI_GATE_EXPIRES_AT: new Date(0).toISOString() }, commit, true), /REJECTED/);
});
test('output contains only a bound Edge entry, refuses preexisting content', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jinxi-gate-'));
  try {
    const synthetic = join(dir, 'synthetic-cloud');
    const gate = join(synthetic, 'gate-only');
    mkdirSync(gate, {recursive:true});
    mkdirSync(join(dir, 'service-adapter'));
    copyFileSync(new URL('../../service-adapter/site-origin.mjs', import.meta.url), join(dir, 'service-adapter/site-origin.mjs'));
    copyFileSync(new URL('./handler.mjs', import.meta.url), join(gate, 'handler.mjs'));
    for (const name of ['edge-access.mjs', 'access.mjs']) {
      copyFileSync(new URL('../' + name, import.meta.url), join(synthetic, name));
    }
    const output = join(gate, '.output');
    build.emit(output, binding);
    for (const folder of ['public', 'functions']) assert.deepEqual(readdirSync(join(output, folder)), []);
    assert.deepEqual(readdirSync(join(output, 'edge')), ['access.js']);
    assert.match(readFileSync(join(output, 'edge', 'access.js'), 'utf8'), /onError: 'fail'/);
    const bundled = await import(pathToFileURL(join(output, 'edge', 'access.js')));
    assert.deepEqual(bundled.config, { path: '/*', onError: 'fail' });
    assert.equal((await bundled.default(new Request(env.URL), {})).status, 503);
    assert.throws(() => build.emit(output, binding), /REJECTED/);
    const dirty = join(dir, 'dirty'); mkdirSync(dirty); writeFileSync(join(dirty, 'unexpected'), '');
    assert.throws(() => build.emit(dirty, binding), /REJECTED/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('visitor probe authenticates all routes and never delegates requests', async () => {
  const password = randomBytes(32).toString('hex');
  const digest = createHash('sha256').update(password).digest('hex');
  const values = { JINXI_SERVICE_APPROVAL: commit, JINXI_SYNTHETIC_ACCESS_SHA256: digest };
  const probe = gateProbe(binding, key => values[key]);
  const ctx = { account: { id: binding.teamId }, site: { id: binding.siteId, url: binding.origin },
    deploy: { id: binding.deployId, context: 'production', published: true } };
  const headers = { Authorization: 'Basic ' + Buffer.from('jinxi-test:' + password).toString('base64') };
  for (const path of ['/', '/api/member', '/.netlify/functions/jinxi-service', '/index.html', '/missing.js']) {
    for (const valid of [true, false]) {
      const result = await probe(new Request(env.URL + path, { headers: valid ? headers : {} }), ctx);
      assert.equal(result.status, valid ? (path === '/' ? 200 : 404) : 401);
      assert.equal(result.headers.get('Netlify-CDN-Cache-Control'), 'no-store');
      assert.equal((await result.text()).includes('Synthetic access check OK'), valid && path === '/');
    }
  }
  const req = new Request(env.URL, { headers });
  assert.equal((await probe(new Request('https://alias.invalid', { headers }), ctx)).status, 503);
  assert.equal((await probe(req, { ...ctx, deploy: { ...ctx.deploy, published: false } })).status, 503);
  assert.equal((await probe(new Request(env.URL, { method: 'POST', headers }), ctx)).status, 405);
  delete values.JINXI_SYNTHETIC_ACCESS_SHA256;
  assert.equal((await probe(req, ctx)).status, 503);
});
