const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');

test('freeze config allows only the separately bound and approved TEST gate', () => {
  const fromCli = createRequire(require.resolve('netlify-cli/package.json'));
  const { parse } = fromCli('@iarna/toml');
  const config = parse(fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8'));
  assert.equal(config.build.ignore, 'node scripts/test-build-gate.cjs');
  assert.equal(config.build.command, 'node scripts/build-test.cjs');
  assert.equal(config.build.publish, 'out');
  assert.equal(config.build.environment.NODE_VERSION, '24.22.2');
  for (const override of Object.values(config.context || {})) {
    assert.equal(override.command, undefined);
    assert.equal(override.ignore, undefined);
  }
  const env = { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP };
  for (const site of [undefined, '613b5b7c-45b1-494f-9328-dd0625a57963', '00000000-0000-4000-8000-000000000123']) {
    const candidate = {...env,...(site?{SITE_ID:site}:{}),CONTEXT:'production'};
    const gate=spawnSync(process.execPath,['scripts/test-build-gate.cjs'],{cwd:root,env:candidate,encoding:'utf8',timeout:5000});
    assert.equal(gate.status,0,'Unapproved/protected site must SKIP, never unlock');
    const forced=spawnSync(process.execPath,['scripts/build-test.cjs','--check'],{cwd:root,env:candidate,encoding:'utf8',timeout:5000});
    assert.equal(forced.status,1,'Forced TEST build must refuse');
    assert.equal(forced.stdout,'');
    assert(!forced.stderr.includes('postgres'));
  }
});

test('legacy publish and account-import entry points exit before any release work', () => {
  const { scripts } = require('../package.json');
  for (const alias of ['deploy', 'deploy:preview', 'deploy:prod']) assert.equal(scripts[alias], 'node deploy.js');
  assert.equal(scripts['accounts:import'], 'node scripts/import_accounts_to_db.js');
  const env = { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP };
  for (const entry of ['deploy.js', 'scripts/import_accounts_to_db.js']) {
    const reply = spawnSync(process.execPath, [entry], { cwd: root, env, encoding: 'utf8', timeout: 5000 });
    assert.equal(reply.status, 1, entry);
    assert.equal(reply.stdout, '', entry);
    assert.match(reply.stderr, /^A7 integration freeze: publishing and account import are blocked on this branch\.\s*$/, entry);
  }
});
