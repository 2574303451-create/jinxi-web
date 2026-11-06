// Call the pinned Netlify packager library offline. The actual hosted
// Functions runtime is a separate control-plane check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { a6: runtime } = require('./variants.cjs');

async function main() {
  assert.equal(process.version, 'v24.22.2');
  const local = createRequire(path.join(runtime.build, 'package.json'));
  const cli = createRequire(local.resolve('netlify-cli/package.json'));
  const { zipFunctions } = await import(pathToFileURL(cli.resolve('@netlify/zip-it-and-ship-it')));
  const scratch = fs.mkdtempSync(path.join(path.dirname(runtime.build), 'bundles-'));
  const functions = await zipFunctions('netlify/functions', scratch, {
    archiveFormat:'none', basePath:runtime.build, repositoryRoot:runtime.build,
    config:{ '*':{ nodeVersion:'nodejs24.x' } }, parallelLimit:2,
  });
  const names = fs.readdirSync(path.join(runtime.build, 'netlify/functions'))
    .filter(file => file.endsWith('.js')).map(file => path.basename(file, '.js')).sort();
  assert.deepEqual(functions.map(item => item.name).sort(), names);
  // Child processes receive no inherited application environment.
  const env = { PATH:process.env.PATH, SystemRoot:process.env.SystemRoot, TEMP:process.env.TEMP };
  const wrappers = [];
  for (const item of functions) {
    const entry = path.join(item.path, item.entryFilename);
    const status = JSON.parse(execFileSync(process.execPath, ['-e', String.raw`
      const { handler } = require(process.argv[1]);
      (async () => {
        const reply = await handler({ httpMethod:'POST', headers:{}, body:'{}' });
        console.log(JSON.stringify(reply.statusCode));
      })().catch(() => process.exit(1));
    `, entry], { env, encoding:'utf8', timeout:5000, windowsHide:true }));
    assert([401, 403, 405, 503].includes(status), item.name);
    wrappers.push({ name:item.name, bundler:item.bundler, api:item.runtimeAPIVersion, packageRuntime:item.runtimeVersion || null, noConfigPostStatus:status });
  }
  const evidence = {
    scope:'Local Netlify ZISI 14.1.4 packaged wrappers under Node 24 with no DB environment',
    node:process.version, requestedRuntime:'nodejs24.x', wrappers,
  };
  fs.writeFileSync(path.join(__dirname, 'browser/a6/function-packaging.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('Packaged and loaded ' + functions.length + ' isolated wrappers.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
