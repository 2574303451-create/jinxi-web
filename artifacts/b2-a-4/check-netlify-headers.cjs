// Local parser from the installed Netlify CLI. No Netlify CLI login/API calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');

async function main() {
  const source = 'E:/Recovery/.jinxi-research/b2-a-4/source';
  const requireFromCli = createRequire(require.resolve('netlify-cli/package.json'));
  const entry = requireFromCli.resolve('@netlify/headers-parser');
  const {parseAllHeaders} = await import(pathToFileURL(entry));
  const {errors, headers} = await parseAllHeaders({
    headersFiles: [path.join(source, 'out/_headers')],
    netlifyConfigPath: path.join(source, 'netlify.toml'),
    minimal: false,
  });
  assert.deepEqual(errors.map(error => error.message), []);
  const manifest = JSON.parse(fs.readFileSync(path.join(source, 'out/csp-manifest.json'), 'utf8'));
  const routes = ['/', '/guides/', '/profile-lab/', '/session-lab/', '/404.html', '/_next/static/a.js'];
  for (const route of routes) {
    const matches = headers.filter(rule => rule.forRegExp.test(route));
    const policies = matches.flatMap(rule => Object.entries(rule.values)
      .filter(([name]) => name.toLowerCase() === 'content-security-policy')
      .map(([,value]) => value));
    assert.deepEqual(policies, [manifest.policy], route);
  }
  const evidence = {...manifest, parser: 'Installed @netlify/headers-parser, offline only', routes, singlePolicy: true};
  fs.writeFileSync(path.join(__dirname, 'csp-build-proof.json'), JSON.stringify(evidence, null, 2));
  console.log(`Netlify header parser verified one generated CSP on ${routes.length} local routes.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
