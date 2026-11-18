const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { controlledDirectory } = require('../build-edge.cjs');
const { FORBIDDEN_KEYS } = require('../../netlify/functions/_shared/test-resource.js');

const siteId = 'e8033919-6f54-4a27-b09d-26c14d8831ce';
const teamId = '689e1405e8627000726e883c';
const origin = 'https://jinxi-synthetic-gate-test.netlify.app';
const branch = 'codex/jinxi-phase4-synthetic-cloud-gate-only';
const repository = 'https://github.com/2574303451-create/jinxi-web';

function bindingFor(env, commit, clean) {
  const expires = Date.parse(env.JINXI_GATE_EXPIRES_AT);
  if (!clean || !/^[a-f0-9]{40}$/.test(commit) || env.JINXI_SERVICE_APPROVAL !== commit ||
      env.COMMIT_REF !== commit || env.BRANCH !== branch || env.NETLIFY !== 'true' ||
      env.CONTEXT !== 'production' || env.PULL_REQUEST !== 'false' || env.NETLIFY_PREVIEW_SERVER === 'true' ||
      ![repository, repository + '.git', 'git@github.com:2574303451-create/jinxi-web.git'].includes(env.REPOSITORY_URL) ||
      env.SITE_ID !== siteId || env.ACCOUNT_ID !== teamId || env.URL !== origin ||
      !/^[a-f0-9]{24}$/.test(env.DEPLOY_ID || '') || !Number.isFinite(expires) ||
      expires <= Date.now() || expires > Date.now() + 86400000 ||
      env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || Object.keys(env).some(key =>
        FORBIDDEN_KEYS.includes(key) || /^INCOMING_HOOK_|^PGSSL|DATABASE_URL|^JINXI_(?!SERVICE_APPROVAL$|GATE_EXPIRES_AT$|SYNTHETIC_ACCESS_SHA256$)/.test(key))) {
    throw Error('GATE_ONLY_BUILD_REJECTED');
  }
  return { siteId, teamId, origin, commit, expiresAt: new Date(expires).toISOString(), deployId: env.DEPLOY_ID };
}

function emit(parent, binding) {
  controlledDirectory(parent);
  for (const dir of ['public', 'functions', 'edge']) controlledDirectory(path.join(parent, dir));
  const source = "import { gateProbe } from '../../handler.mjs';\n" +
    "export const config = { path: '/*', onError: 'fail' };\n" +
    'export default gateProbe(' + JSON.stringify(binding) + ');\n';
  fs.writeFileSync(path.join(parent, 'edge', 'access.js'), source, { flag: 'wx' });
}

if (require.main === module) {
  const git = (...args) => execFileSync('git', args, { cwd: __dirname, encoding: 'utf8' }).trim();
  const binding = bindingFor(process.env, git('rev-parse', 'HEAD'), !git('status', '--porcelain', '--untracked-files=all'));
  emit(path.join(__dirname, '.output'), binding);
}
module.exports = { bindingFor, emit };
