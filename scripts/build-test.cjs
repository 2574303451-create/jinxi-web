const fs = require('node:fs');
const path = require('node:path');
const { currentBuild } = require('./test-build-gate.cjs');
const { npm } = require('./run-clean.cjs');
function build() {
  const root = path.resolve(__dirname, '..');
  const target = path.join(root, 'netlify/functions/_generated/test-deploy.json');
  // Never let a stale successful proof survive a failed new attempt.
  fs.rmSync(target, { force: true });
  const proof = currentBuild();
  if (process.argv.includes('--check')) return;
  const result = npm(['run', 'build'], { cwd: root });
  if (result.status !== 0) throw Error('TEST_BUILD_FAILED');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
  console.log('Approved TEST build completed; non-secret deploy proof generated.');
}
if (require.main === module) {
  try { build(); } catch { console.error('TEST build refused or failed; no deploy proof is available.'); process.exitCode = 1; }
}
module.exports = { build };
