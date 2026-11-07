const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { npmCliPath, cleanEnv } = require('../scripts/run-clean.cjs');

function layout(portable) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-npm-layout-'));
  const executable = path.join(folder,portable?'node':'bin/node');
  const cli = path.join(folder,portable?'node_modules/npm/bin/npm-cli.js':'lib/node_modules/npm/bin/npm-cli.js');
  fs.mkdirSync(path.dirname(executable),{recursive:true});
  fs.mkdirSync(path.dirname(cli),{recursive:true});
  fs.writeFileSync(executable,'synthetic non-executable layout fixture');
  fs.writeFileSync(cli,'// synthetic layout fixture');
  return {executable,cli};
}

test('portable Node resolves npm next to the executable', () => {
  const fixture = layout(true);
  assert.equal(npmCliPath(fixture.executable),fs.realpathSync(fixture.cli));
});

test('POSIX Node resolves npm under its installation prefix lib directory', () => {
  const fixture = layout(false);
  assert.equal(npmCliPath(fixture.executable),fs.realpathSync(fixture.cli));
});

test('missing npm fails closed without consulting an unrelated PATH installation', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-npm-missing-'));
  const executable = path.join(folder,'node');
  fs.writeFileSync(executable,'synthetic non-executable fixture');
  assert.throws(()=>npmCliPath(executable),/NPM_CLI_NOT_FOUND/);
});

test('normal clean runner entry point executes the installed npm', () => {
  const result = spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/run-clean.cjs'),'--version'],{
    env:cleanEnv(),encoding:'utf8',timeout:10000,
  });
  assert.equal(result.status,0);
  assert.match(result.stdout.trim(),/^\d+\.\d+\.\d+$/);
});
