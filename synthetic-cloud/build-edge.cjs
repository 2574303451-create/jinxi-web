const fs = require('node:fs');
const path = require('node:path');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.rsc': 'text/x-component',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

function controlledDirectory(folder, allowed = []) {
  fs.mkdirSync(folder, { recursive: true });
  const expectedFile = name => {
    if (!allowed.includes(name)) return false;
    const stat = fs.lstatSync(path.join(folder, name));
    return stat.isFile() && stat.nlink === 1;
  };
  if (!fs.lstatSync(folder).isDirectory() || !fs.readdirSync(folder).every(expectedFile)) {
    throw Error('SYNTHETIC_DEPLOY_DIRECTORY_REJECTED');
  }
}

function makeEdge(receipt, staticExport, publish, edgeFunctions) {
  // No protected bytes are ever copied to the publicly served directory.
  controlledDirectory(publish);
  controlledDirectory(edgeFunctions, ['access.js']);
  const assets = {};
  let bytes = 0;
  for (const relative of fs.readdirSync(staticExport, { recursive: true })) {
    const filename = path.join(staticExport, relative);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) continue;
    if (!stat.isFile()) throw Error('SYNTHETIC_EDGE_ASSET_REJECTED');
    if (relative === '_headers' || relative === 'csp-manifest.json') continue;
    const type = types[path.extname(relative)];
    const key = '/' + relative.split(path.sep).join('/');
    if (!type || !/^\/[a-zA-Z0-9_./-]+$/.test(key) || key.includes('/.')) throw Error('SYNTHETIC_EDGE_ASSET_REJECTED');
    bytes += stat.size;
    if (bytes > 8 * 1024 * 1024) throw Error('SYNTHETIC_EDGE_ASSET_LIMIT');
    assets[key] = { type, bytes: fs.readFileSync(filename).toString('base64') };
  }
  if (!assets['/index.html']) throw Error('SYNTHETIC_EDGE_ASSET_REJECTED');
  const { policy } = JSON.parse(fs.readFileSync(path.join(staticExport, 'csp-manifest.json'), 'utf8'));
  if (typeof policy !== 'string' || !policy.startsWith("default-src 'self';") || /[\r\n]/.test(policy)) {
    throw Error('SYNTHETIC_EDGE_POLICY_REJECTED');
  }
  const { origin, siteId, teamId, commit, expiresAt } = receipt.approval;
  const binding = { origin, siteId, teamId, commit, expiresAt, deployId: receipt.deployId };
  const template = fs.readFileSync(path.join(__dirname, 'edge', 'access.js'), 'utf8');
  const built = template.replace('null; // JINXI_EDGE_BINDING', JSON.stringify(binding) + ';')
    .replace('null; // JINXI_EDGE_ASSETS', JSON.stringify(assets) + ';')
    .replace('null; // JINXI_EDGE_CSP', JSON.stringify(policy) + ';');
  fs.writeFileSync(path.join(edgeFunctions, 'access.js'), built);
}

module.exports = { controlledDirectory, makeEdge };
