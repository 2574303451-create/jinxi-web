const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { cleanEnv } = require('../scripts/run-clean.cjs');
const { generate } = require('../scripts/generate-export-csp.cjs');
const { buildReceipt, credentialNames } = require('./binding.cjs');
const { accessDigestKey } = require('./access.mjs');
const { controlledDirectory, makeEdge } = require('./build-edge.cjs');

const root = path.resolve(__dirname, '..');
const site = path.join(__dirname, 'site');
const staticExport = path.join(site, 'out');
const generated = path.join(__dirname, '.generated');
const publish = path.join(generated, 'public');
const edgeFunctions = path.join(generated, 'edge-functions');
const functions = path.join(generated, 'functions');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, env: cleanEnv(), encoding: 'utf8', timeout: 10000, windowsHide: true });
  if (result.status !== 0) throw Error('SYNTHETIC_BUILD_SOURCE_UNVERIFIED');
  return result.stdout.trim();
}

function exportFile(relative, source, approval, secrets) {
  if (/\.(?:pem|key|crt|private|map)$/i.test(relative)) throw Error('SYNTHETIC_STATIC_FILE_REJECTED');
  if (!/\.(?:js|html|json|txt|css|rsc)$/i.test(relative)) return;
  const content = fs.readFileSync(source,'utf8');
  if (['jinxi_synthetic_write_v1', 'JINXI_SERVICE_APPROVAL', approval.host, approval.siteId, ...secrets]
      .some(marker => content.includes(marker)) || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
    throw Error('SYNTHETIC_STATIC_DATA_REJECTED');
  }
}

function inspectExport(approval, env) {
  const secrets = [...Object.values(credentialNames), accessDigestKey].map(name => env[name])
    .filter(value => typeof value === 'string' && value.length >= 16);
  for (const relative of fs.readdirSync(staticExport,{recursive:true})) {
    const absolute = path.join(staticExport,relative), stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw Error('SYNTHETIC_STATIC_FILE_REJECTED');
    if (stat.isFile()) exportFile(relative,absolute,approval,secrets);
  }
}

async function makeFunction(receipt) {
  controlledDirectory(functions, ['jinxi-service.mjs']);
  const template = fs.readFileSync(path.join(__dirname, 'function', 'jinxi-service.mjs'), 'utf8');
  const marker = 'const receipt = null; // JINXI_BUILD_RECEIPT';
  if (!template.includes(marker)) throw Error('SYNTHETIC_FUNCTION_SOURCE_REJECTED');
  const source = template.replace(marker, 'const receipt = ' + JSON.stringify(receipt) + ';');
  // Use esbuild already pinned by the installed Netlify CLI. Bundling the
  // runtime packages here makes the V2 entry self-contained before NFT.
  const { build } = createRequire(require.resolve('netlify-cli/package.json'))('esbuild');
  const artifact = await build({
    stdin: { contents: source, resolveDir: functions, sourcefile: 'jinxi-service.mjs', loader: 'js' },
    bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false,
    banner: { js: "import { createRequire as jinxiCreateRequire } from 'node:module'; const require = jinxiCreateRequire(import.meta.url);" },
    external: ['pg-native'],
    logLevel: 'silent',
  });
  fs.writeFileSync(path.join(functions, 'jinxi-service.mjs'), artifact.outputFiles[0].contents);
}

function exportSite(receipt) {
  if (fs.readdirSync(site).some(name => name === 'public' || name.startsWith('.env'))) {
    throw Error('SYNTHETIC_STATIC_BUILD_INPUT_REJECTED');
  }
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', site, '--webpack'], {
    cwd: root, env: cleanEnv({ NODE_ENV: 'production', JINXI_SYNTHETIC_EXPORT: '1' }),
    stdio: 'inherit', windowsHide: true, timeout: 180000,
  });
  if (result.status !== 0) throw Error('SYNTHETIC_STATIC_EXPORT_FAILED');
  const fixtures = path.join(staticExport, 'fixtures');
  fs.mkdirSync(fixtures, { recursive: true });
  for (const [name, source] of Object.entries({
    'community-cover.jpg': 'public/placeholder.jpg',
    'community-demo.mp4': 'artifacts/b2-a-8/video-demo/synthetic-motion.mp4',
    'operations-cover.svg': 'artifacts/b2-a-8/video-demo/synthetic-cover.svg',
    'operations-motion.mp4': 'artifacts/b2-a-8/video-demo/synthetic-motion.mp4',
    'placeholder-user.jpg': 'public/placeholder-user.jpg',
  })) fs.copyFileSync(path.join(root, source), path.join(fixtures, name));
  for (const name of ['logo.png', 'placeholder.svg', 'placeholder.jpg', 'placeholder-user.jpg']) {
    fs.copyFileSync(path.join(root, 'public', name), path.join(staticExport, name));
  }

  const policy = hashes => [
    "default-src 'self'", "script-src 'self' " + hashes.map(hash => "'sha256-" + hash + "'").join(' '),
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "media-src 'self'", "font-src 'self' data:", "connect-src 'self'", "object-src 'none'",
    "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'",
  ].join('; ');
  const csp = generate(staticExport, policy);
  inspectExport(receipt.approval,process.env);
  console.log('Synthetic static export verified:', JSON.stringify(csp));
}

if (require.main === module) {
  const check = process.argv.length === 3 && process.argv[2] === '--check';
  (async () => {
    const receipt = buildReceipt(process.env, git(['rev-parse', 'HEAD']), git(['status', '--porcelain', '--untracked-files=all']) === '');
    if (check) {
      // Netlify's ignore command uses 0 to skip and 1 to proceed.
      process.exitCode = 1;
    } else if (process.argv.length === 2) {
      fs.mkdirSync(generated, { recursive: true });
      if (!fs.lstatSync(generated).isDirectory()) throw Error('SYNTHETIC_DEPLOY_DIRECTORY_REJECTED');
      exportSite(receipt);
      makeEdge(receipt, staticExport, publish, edgeFunctions);
      await makeFunction(receipt);
      controlledDirectory(publish);
    } else throw Error('SYNTHETIC_BUILD_ARGUMENT_REJECTED');
  })().catch(() => {
    console.error('Synthetic TEST build refused or failed. Verify the approved source, build identity and configuration.');
    process.exitCode = check ? 0 : 1;
  });
}
module.exports = { root, staticExport, publish, edgeFunctions, functions };
