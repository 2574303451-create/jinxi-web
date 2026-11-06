const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateBinding, assertSite, digest } = require('../netlify/functions/_shared/test-resource');
function verifyBuild(env, binding, commit) {
  validateBinding(binding);
  assertSite(env, binding);
  if (!binding.allowedContexts.includes(env.CONTEXT) || env.JINXI_RUNTIME_CONTEXT !== env.CONTEXT) throw Error('TEST_BUILD_CONTEXT_REJECTED');
  if (env.JINXI_CLOUD_ISOLATION_APPROVAL !== 'approved' || !/^[a-f0-9]{40}$/.test(commit || '') || env.JINXI_TEST_APPROVED_COMMIT !== commit) throw Error('TEST_BUILD_REVISION_UNAPPROVED');
  return { version: 1, siteId: binding.siteId, context: env.CONTEXT, commit, bindingDigest: digest(binding) };
}
function currentBuild(env = process.env, root = path.resolve(__dirname, '..')) {
  const binding = JSON.parse(fs.readFileSync(path.join(root, 'netlify/functions/_shared/test-resource-binding.json'), 'utf8'));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  if (dirty.trim()) throw Error('TEST_BUILD_WORKTREE_NOT_CLEAN');
  if (env.COMMIT_REF && env.COMMIT_REF !== commit) throw Error('TEST_BUILD_REVISION_CONFLICT');
  return verifyBuild(env, binding, commit);
}
if (require.main === module) {
  // Netlify ignore: 0 means skip; every unexpected failure must also skip.
  try { currentBuild(); process.exitCode = 1; } catch { process.exitCode = 0; }
}
module.exports = { verifyBuild, currentBuild };
