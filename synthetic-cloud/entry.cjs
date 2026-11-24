const { createHash } = require('node:crypto');
const { createCloudService, netlifyFetch } = require('../service-adapter/cloud.cjs');
const { publicContract } = require('../integration-local/public-contract.cjs');
const { checkInvocation, readCredentials } = require('./binding.cjs');
const { verifySchema } = require('./database/guard.cjs');
const { accessDigestKey, accessError, authorizeAccess, privateHeaders, privateResponse } = require('./access.mjs');

const prefix = '/.netlify/functions/';
const modules = ['member', 'community', 'attendance', 'points', 'operations'];
const publicNames = ['messages', 'strategies', 'guide-video-stats', 'announcements', 'sponsorship'];
const publicHeaders = privateHeaders({
  'Content-Type': 'application/json',
}, 'Cookie, Origin, Authorization');
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: publicHeaders });
const credentialFingerprint = secrets => createHash('sha256').update(JSON.stringify(secrets)).digest('hex');

function createEntry(receipt, env = process.env) {
  // This receipt is bundled with the function, never accepted from a request.
  const bound = structuredClone(receipt);
  let startup;
  function currentStartup() {
    let secrets;
    try {
      secrets = readCredentials(env, bound.approval);
    } catch (error) {
      startup = undefined;
      throw error;
    }
    const fingerprint = credentialFingerprint(secrets);
    if (startup?.fingerprint !== fingerprint) startup = { fingerprint, promise: null, retryAt: 0 };
    return { attempt: startup, secrets };
  }

  return async function handle(request, context) {
    let url, approval;
    try {
      url = new URL(request.url);
      approval = checkInvocation(bound, env, context, url.origin);
    } catch {
      return reply(503, { code: 'SYNTHETIC_DEPLOYMENT_NOT_APPROVED' });
    }

    try {
      const refusal = await authorizeAccess(request, env[accessDigestKey]);
      if (refusal) return refusal;
    } catch {
      return accessError(503, request.method === 'HEAD');
    }

    const route = modules.find(name => url.pathname === '/api/' + name);
    const publicName = publicNames.find(name => url.pathname === prefix + name);
    if (!route && !publicName) return reply(404, { code: 'SERVICE_ROUTE_REJECTED' });
    if (publicName && request.method !== 'GET') return reply(410, { code: 'LEGACY_WRITES_FROZEN' });
    if (!['GET', 'POST'].includes(request.method)) return reply(405, { code: 'METHOD_NOT_ALLOWED' });
    const origin = request.headers.get('origin');
    if (request.headers.get('sec-fetch-site') === 'cross-site' ||
        (origin && origin !== approval.origin) || (request.method === 'POST' && origin !== approval.origin)) {
      return reply(403, { code: 'ORIGIN_REJECTED' });
    }
    if (url.search.length > 2048 || new Set(url.searchParams.keys()).size !== url.searchParams.size) {
      return reply(400, { code: 'INVALID_QUERY' });
    }
    if (Number(request.headers.get('content-length')) > 65536) return reply(413, { code: 'BODY_REJECTED' });

    try {
      const { attempt, secrets } = currentStartup();
      if (!attempt.promise) {
        if (Date.now() < attempt.retryAt) return reply(503, { code: 'SYNTHETIC_SERVICE_UNAVAILABLE' });
        const trustedEnv = { ...env, NETLIFY: 'true', CONTEXT: 'production', COMMIT_REF: approval.commit };
        attempt.promise = createCloudService({
          approval: { ...approval, port: 5432 }, env: trustedEnv, secrets,
          verifyDeployment: (client, role) => verifySchema(client, approval, role),
        }).catch(() => {
          attempt.promise = null;
          attempt.retryAt = Date.now() + 2000;
          throw Error('SYNTHETIC_SERVICE_UNAVAILABLE');
        });
      }
      const service = await attempt.promise;
      checkInvocation(bound, env, context, url.origin);
      if (startup !== attempt || currentStartup().attempt !== attempt) {
        return reply(503, { code: 'SYNTHETIC_SERVICE_UNAVAILABLE' });
      }
      if (publicName) {
        const publicHandlers = Object.fromEntries(modules.map(name => ['/api/' + name, event => service({
          ...event, rawUrl: approval.origin + prefix + 'jinxi-service/' + name, path: prefix + 'jinxi-service/' + name,
        }, context)]));
        return reply(200, await publicContract(publicName, Object.fromEntries(url.searchParams), publicHandlers));
      }

      url.pathname = prefix + 'jinxi-service/' + route;
      const authorizedRequest = new Request(url, request);
      authorizedRequest.headers.delete('Authorization');
      return privateResponse(await netlifyFetch(service)(authorizedRequest, context));
    } catch {
      return reply(503, { code: 'SYNTHETIC_SERVICE_UNAVAILABLE' });
    }
  };
}

module.exports = { createEntry };
