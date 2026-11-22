const { isIP } = require('node:net');
const { PROTECTED_SITE_ID, FORBIDDEN_KEYS } = require('../netlify/functions/_shared/test-resource');
const readOnlyTest = require('../netlify/functions/_shared/test-resource-binding.json');
const { roles } = require('../service-adapter/resource.cjs');
const { matchesSiteMetadata } = require('../service-adapter/site-origin.mjs');

const DATABASE = 'jinxi_synthetic_write_v1';
const REVISION = 'synthetic-write-v1';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha = /^[a-f0-9]{40}$/;
const hex = /^[a-f0-9]{64}$/;
const branch = /^codex\/jinxi-phase4-synthetic-cloud-[a-z0-9-]{1,48}$/;
const deployId = /^[a-f0-9]{24}$/;
const teamId = /^[a-z0-9]{20,36}$/;
const repository = 'https://github.com/2574303451-create/jinxi-web';
const endpoint = /^ep-[a-z0-9-]{3,90}$/;
const providerId = /^[a-zA-Z0-9_-]{3,100}$/;
const protectedOrigins = ['https://jinxi-web.netlify.app', 'https://jinxi-web-test.netlify.app'];

const credentialNames = Object.freeze({
  ...Object.fromEntries(Object.keys(roles).map(name => [name, 'JINXI_SYNTHETIC_DB_' + name.toUpperCase()])),
  csrfKey: 'JINXI_SYNTHETIC_CSRF_KEY',
  rateKey: 'JINXI_SYNTHETIC_RATE_KEY',
});
const deny = () => { throw Error('SYNTHETIC_DEPLOYMENT_NOT_APPROVED'); };
function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

const resourceKeys = ['projectId', 'branchId', 'endpointId', 'host', 'database', 'environmentId', 'fingerprint', 'serverAddresses'];
function checkDatabase(value) {
  if (!providerId.test(value.projectId || '') || value.projectId === readOnlyTest.projectId ||
      !providerId.test(value.branchId || '') || value.branchId === readOnlyTest.branchId ||
      !endpoint.test(value.endpointId || '') || value.endpointId.endsWith('-pooler') || value.endpointId === readOnlyTest.endpointId ||
      !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/.test(value.host || '') ||
      !value.host.startsWith(value.endpointId + '.') || readOnlyTest.hosts.includes(value.host) ||
      value.database !== DATABASE || !uuid.test(value.environmentId || '') || value.environmentId === readOnlyTest.environmentId ||
      !hex.test(value.fingerprint || '') || value.fingerprint === readOnlyTest.fingerprint ||
      !Array.isArray(value.serverAddresses) || !value.serverAddresses.length || value.serverAddresses.length > 8 ||
      new Set(value.serverAddresses).size !== value.serverAddresses.length ||
      !value.serverAddresses.every(address => typeof address === 'string' && isIP(address))) deny();
}

function rejectInherited(env) {
  if (Object.keys(env).some(key => FORBIDDEN_KEYS.includes(key) ||
    /^PGSSL|^JINXI_(PRODUCTION|PREVIEW|LOCAL|SESSION|TEST_READ)_|^NEXT_PUBLIC_.*(?:SECRET|PASSWORD|TOKEN|DATABASE)/.test(key)) ||
    env.NODE_TLS_REJECT_UNAUTHORIZED === '0') deny();
}

function checkApproval(value, now = Date.now()) {
  if (!exactKeys(value, ['version', 'enabled', 'classification', 'schemaRevision', ...resourceKeys,
    'schemaFingerprint', 'siteId', 'teamId', 'origin', 'gitBranch', 'commit', 'expiresAt']) ||
    value.version !== 1 || value.enabled !== true || value.classification !== 'synthetic-test' ||
    value.schemaRevision !== REVISION || !hex.test(value.schemaFingerprint || '') ||
    !uuid.test(value.siteId || '') || [PROTECTED_SITE_ID, readOnlyTest.siteId].includes(value.siteId) ||
      !teamId.test(value.teamId || '') || !/^https:\/\/[a-z0-9][a-z0-9-]{1,62}\.netlify\.app$/.test(value.origin || '') ||
    protectedOrigins.includes(value.origin) || !branch.test(value.gitBranch || '') || !sha.test(value.commit || '') ||
    !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now) deny();
  checkDatabase(value);
  return value;
}

function buildReceipt(env, gitHead, gitClean) {
  rejectInherited(env);
  // On Netlify plans without variable scopes, dedicated site credentials can
  // be present during install. Enforce a scoped, clean environment for every
  // child process, and reject all known inherited legacy/administrator keys.
  const input = env.JINXI_SYNTHETIC_BUILD_APPROVAL;
  if (typeof input !== 'string' || input.length > 5000) deny();
  let approval;
  try { approval = checkApproval(JSON.parse(input)); } catch { deny(); }
  if (!gitClean || gitHead !== approval.commit || env.NETLIFY !== 'true' || env.CONTEXT !== 'production' ||
      env.BRANCH !== approval.gitBranch || env.COMMIT_REF !== approval.commit || env.SITE_ID !== approval.siteId ||
      ![repository,repository + '.git',repository.replace('https://github.com/','git@github.com:') + '.git'].includes(env.REPOSITORY_URL) ||
      env.ACCOUNT_ID !== approval.teamId || env.URL !== approval.origin || env.PULL_REQUEST !== 'false' ||
      env.NETLIFY_PREVIEW_SERVER === 'true' || ['INCOMING_HOOK_TITLE','INCOMING_HOOK_URL','INCOMING_HOOK_BODY']
        .some(key => Object.hasOwn(env,key)) || !deployId.test(env.DEPLOY_ID || '')) deny();
  return { approval, deployId: env.DEPLOY_ID };
}

function checkInvocation(receipt, env, context, origin) {
  if (!exactKeys(receipt, ['approval', 'deployId']) || !deployId.test(receipt.deployId || '')) deny();
  const approval = checkApproval(receipt.approval);
  rejectInherited(env);
  if (origin !== approval.origin || env.SITE_ID !== approval.siteId || env.URL !== approval.origin ||
      env.JINXI_SERVICE_APPROVAL !== approval.commit ||
      context?.account?.id !== approval.teamId || context?.site?.id !== approval.siteId ||
      !matchesSiteMetadata(approval.origin, context.site.url) || context?.deploy?.id !== receipt.deployId ||
      context.deploy.context !== 'production' || context.deploy.published !== true || !isIP(context.ip || '')) deny();

  // Only SITE_ID and URL are guaranteed at runtime. If build variables are
  // also present, a conflicting value must still reject the invocation.
  for (const [key, expected] of Object.entries({
    NETLIFY: 'true', CONTEXT: 'production', COMMIT_REF: approval.commit, BRANCH: approval.gitBranch,
    DEPLOY_ID: receipt.deployId, ACCOUNT_ID: approval.teamId,
  })) {
    if (Object.hasOwn(env, key) && env[key] !== expected) deny();
  }
  return approval;
}

function readCredentials(env) {
  const secrets = Object.fromEntries(Object.entries(credentialNames).map(([key, name]) => [key, env[name]]));
  const values = Object.values(secrets);
  if (values.some(value => typeof value !== 'string' || !hex.test(value)) || new Set(values).size !== values.length) deny();
  return secrets;
}

module.exports = { DATABASE, REVISION, resourceKeys, checkDatabase, exactKeys, buildReceipt, checkInvocation, readCredentials, credentialNames };
