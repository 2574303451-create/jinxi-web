// Non-secret, reviewed resource ownership is separate from deploy context.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PROTECTED_SITE_ID = '613b5b7c-45b1-494f-9328-dd0625a57963';
const FORBIDDEN_KEYS = Object.freeze([
  'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'NETLIFY_DATABASE_URL_UNPOOLED',
  'ADMIN_PASSWORD', 'JINXI_PRODUCTION_READ_DATABASE_URL',
  'NEON_API_KEY', 'NETLIFY_AUTH_TOKEN',
  'NEON_API_TOKEN', 'NETLIFY_ACCESS_TOKEN', 'PGPASSWORD', 'PGPASSFILE',
  'PGSERVICE', 'PGSERVICEFILE', 'PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGOPTIONS',
]);
const CONTEXTS = Object.freeze(['production', 'deploy-preview', 'branch-deploy']);
class ResourceError extends Error {
  constructor(code) { super('TEST resource isolation unavailable'); this.code = code; }
}
const fail = code => { throw new ResourceError(code); };
function digest(binding) {
  return crypto.createHash('sha256').update(JSON.stringify(binding, Object.keys(binding).sort())).digest('hex');
}
function loadResources() {
  let deploy;
  try { deploy = JSON.parse(fs.readFileSync(path.join(__dirname, '../_generated/test-deploy.json'), 'utf8')); }
  catch { deploy = null; }
  return { binding: require('./test-resource-binding.json'), deploy };
}
function assertNoLegacySecrets(env) {
  // Check presence only: never fetch, hash, interpolate or log a secret value.
  if (FORBIDDEN_KEYS.some(key => Object.hasOwn(env, key)) ||
      Object.keys(env).some(key => /^JINXI_(PRODUCTION|PREVIEW|LOCAL|SESSION)_/.test(key))) fail('TEST_INHERITED_FORBIDDEN_VARIABLE');
}
function validateBinding(binding) {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const keys = ['version','status','classification','siteId','projectId','branchId','endpointId','databaseName','hosts','port','readerRole','environmentId','fingerprint','allowedContexts'];
  if (!binding || binding.version !== 1 || binding.status !== 'approved' ||
      Object.keys(binding).some(key => !keys.includes(key)) ||
      binding.classification !== 'synthetic-test' || !uuid.test(binding.siteId || '') ||
      binding.siteId === PROTECTED_SITE_ID ||
      !['projectId', 'branchId', 'endpointId'].every(key => /^[a-zA-Z0-9_-]{3,100}$/.test(binding[key] || '')) ||
      binding.databaseName !== 'neondb' || binding.readerRole !== 'jinxi_test_reader' ||
      binding.port !== '5432' || !uuid.test(binding.environmentId || '') ||
      !/^[a-f0-9]{64}$/.test(binding.fingerprint || '') ||
      !Array.isArray(binding.hosts) || !binding.hosts.length || binding.hosts.length > 2 ||
      !binding.hosts.every(host => typeof host === 'string' && /^[a-z0-9][a-z0-9.-]+\.[a-z]+$/.test(host) && !host.includes('..')) ||
      !Array.isArray(binding.allowedContexts) || !binding.allowedContexts.length ||
      !binding.allowedContexts.every(context => CONTEXTS.includes(context))) fail('TEST_BINDING_UNAPPROVED');
  return binding;
}
function assertSite(env, binding) {
  if (env.SITE_ID !== binding.siteId || env.SITE_ID === PROTECTED_SITE_ID) fail('TEST_SITE_MISMATCH');
  if (env.JINXI_RESOURCE_ENVIRONMENT !== 'synthetic-test') fail('TEST_RESOURCE_CLASSIFICATION_REQUIRED');
  assertNoLegacySecrets(env);
}
function testDatabaseConfig(env, mode, resources = loadResources()) {
  if (mode !== 'public-read') fail('TEST_WRITE_NOT_APPROVED');
  const binding = validateBinding(resources.binding);
  assertSite(env, binding);
  const deploy = resources.deploy;
  if (!deploy || deploy.version !== 1 || deploy.siteId !== binding.siteId ||
      deploy.bindingDigest !== digest(binding) || !/^[a-f0-9]{40}$/.test(deploy.commit || '') ||
      !binding.allowedContexts.includes(deploy.context)) fail('TEST_DEPLOY_PROOF_REQUIRED');
  if (env.JINXI_RUNTIME_CONTEXT !== deploy.context || (env.CONTEXT && env.CONTEXT !== deploy.context)) fail('TEST_DEPLOY_CONTEXT_CONFLICT');
  if (env.JINXI_CLOUD_ISOLATION_APPROVAL !== 'approved') fail('CLOUD_ISOLATION_UNVERIFIED');
  const value = env.JINXI_TEST_READ_DATABASE_URL;
  let url;
  try { if (typeof value !== 'string' || !value) fail('TEST_DATABASE_CONFIGURATION_MISSING'); url = new URL(value); }
  catch (error) { if (error instanceof ResourceError) throw error; fail('TEST_DATABASE_CONFIGURATION_INVALID'); }
  let role, database;
  try { role = decodeURIComponent(url.username); database = decodeURIComponent(url.pathname.slice(1)); }
  catch { fail('TEST_DATABASE_CONFIGURATION_INVALID'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash ||
      !binding.hosts.includes(url.hostname) || (url.port || '5432') !== binding.port ||
      database !== binding.databaseName) fail('TEST_DATABASE_TARGET_REJECTED');
  if (role !== binding.readerRole) fail('TEST_DATABASE_ROLE_REJECTED');
  const allowed = new Map([['sslmode', ['require', 'verify-full']], ['channel_binding', ['require', 'prefer']]]);
  if (![...url.searchParams.keys()].every(key => allowed.has(key) && url.searchParams.getAll(key).length === 1 && allowed.get(key).includes(url.searchParams.get(key))) ||
      !url.searchParams.has('sslmode')) fail('TEST_DATABASE_OPTIONS_REJECTED');
  return { context: deploy.context, mode, url: value, resourceEnvironment: 'synthetic-test', policy: {
    context: deploy.context, classification: 'synthetic-test', environmentId: binding.environmentId,
    fingerprint: binding.fingerprint, role: binding.readerRole,
  } };
}
module.exports = { PROTECTED_SITE_ID, FORBIDDEN_KEYS, CONTEXTS, ResourceError, digest, loadResources, validateBinding, assertSite, assertNoLegacySecrets, testDatabaseConfig };
