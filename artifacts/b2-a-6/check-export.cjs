const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const variants = require('./variants.cjs');

async function main() {
  const stage = process.argv[2];
  if (!Object.hasOwn(variants, stage)) throw Error('Unknown export variant');
  const { build, site } = variants[stage];
  const local = createRequire(path.join(build, 'package.json'));
  const fromCli = createRequire(local.resolve('netlify-cli/package.json'));
  const { parseAllHeaders } = await import(pathToFileURL(fromCli.resolve('@netlify/headers-parser')));
  const { errors, headers } = await parseAllHeaders({
    headersFiles:[path.join(site, '_headers')], netlifyConfigPath:path.join(build, 'netlify.toml'), minimal:false,
  });
  assert.deepEqual(errors.map(error => error.message), []);
  const manifest = JSON.parse(fs.readFileSync(path.join(site, 'csp-manifest.json'), 'utf8'));
  const { policy, pages } = manifest;
  const scriptRule = policy.split('; ').find(rule => rule.startsWith('script-src '));
  assert(!/unsafe-inline|unsafe-eval/.test(scriptRule));
  assert(policy.includes("script-src-attr 'none'"));
  const hashes = new Set();
  for (const { file, inlineScriptHashes } of pages) {
    const html = fs.readFileSync(path.join(site, file), 'utf8');
    const exactHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
      .filter(match => !/\bsrc\s*=/i.test(match[1]) && match[2])
      .map(match => createHash('sha256').update(match[2].replace(/\r\n?/g, '\n')).digest('base64'));
    assert.deepEqual(exactHashes, inlineScriptHashes, file);
    for (const hash of exactHashes) {
      assert(scriptRule.includes("'sha256-" + hash + "'"), file);
      hashes.add(hash);
    }
  }
  const routes = ['/', '/guides/', '/profile-lab/', '/session-lab/', '/404.html', '/_next/static/a.js'];
  for (const route of routes) {
    const matches = headers.filter(rule => rule.forRegExp.test(route));
    assert.deepEqual(matches.flatMap(rule => Object.entries(rule.values)
      .filter(([name]) => name.toLowerCase() === 'content-security-policy')
      .map(([, value]) => value)), [policy], route);
    if (route.endsWith('/')) assert(fs.existsSync(path.join(site, route, 'index.html')), route);
  }
  const report = { stage, scope:'Local static bytes and installed Netlify header parser', routes, pages:pages.length,
    hashes:hashes.size, policyBytes:manifest.policyBytes, onePolicyPerRoute:true };
  fs.writeFileSync(path.join(__dirname, 'browser', stage, 'export.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
