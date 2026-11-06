// Scans reviewed Git blobs for a short list of credential patterns. Reports
// paths and counts only. It does not enumerate the host environment or caches.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 10000000 });
const commit = git(['rev-parse', 'HEAD']).trim();
const workflows = git(['ls-tree', '-r', '--name-only', commit, '.github/workflows']).trim().split('\n').filter(Boolean);

const config = git(['show', commit + ':.npmrc']);
const authOptionCount = config.split(/\r?\n/).filter(line => {
  const key = line.trim().split('=', 1)[0];
  return /(?:^|:)(?:_auth|_authToken|_password|username|certfile|keyfile)$/i.test(key);
}).length;
const lock = JSON.parse(git(['show', commit + ':package-lock.json']));
const credentialedLockUrls = Object.values(lock.packages).filter(entry => {
  if (!/^https?:\/\//.test(entry.resolved || '')) return false;
  const url = new URL(entry.resolved);
  return url.username || url.password;
}).length;

const pattern = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|postgres(ql)?://[^[:space:]:/]+:[^[:space:]@/$]+@';
const scan = cp.spawnSync('git', [
  'grep', '-IlE', '-e', pattern, commit, '--', '.github', '.npmrc', 'app', 'components',
  'hooks', 'lib', 'netlify', 'scripts', 'services', 'deploy.js', 'netlify.toml', 'package.json',
], { cwd: root, encoding: 'utf8' });
if (![0, 1].includes(scan.status)) throw Error('Source pattern scan could not complete');
const matches = scan.stdout.trim().split('\n').filter(Boolean);

const report = {
  commit,
  scope: 'Tracked source blobs at the code candidate. Pattern findings and npm option counts only.',
  workflows,
  authOptionCount,
  credentialedLockUrls,
  matchedPaths: matches,
  registeredAccountCsvTemplates: git(['ls-tree', '-r', '--name-only', commit, 'scripts']).split('\n').filter(file => /_template\.csv$/.test(file)),
};
fs.writeFileSync(path.join(__dirname, 'release-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (authOptionCount || credentialedLockUrls || matches.length) process.exitCode = 1;
