import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { accessDigestKey, accessUser } from '../synthetic-cloud/access.mjs';
import { createAccessEdge } from '../synthetic-cloud/edge-access.mjs';
import { makeEdge } from '../synthetic-cloud/build-edge.cjs';

function fixture() {
  const binding = {
    origin: 'https://synthetic-access-example.netlify.app', siteId: 'unit-site',
    teamId: 'unit-team', deployId: 'unit-deploy', commit: 'c'.repeat(40),
    expiresAt: '2099-01-01T00:00:00Z',
  };
  const context = {
    account: { id: binding.teamId },
    site: { id: binding.siteId, url: binding.origin },
    deploy: { id: binding.deployId, context: 'production', published: true },
  };
  const secret = randomBytes(32).toString('hex');
  const authorization = 'Basic ' + Buffer.from(accessUser + ':' + secret).toString('base64');
  const vars = { JINXI_SERVICE_APPROVAL: binding.commit, [accessDigestKey]: createHash('sha256').update(secret).digest('hex') };
  const assets = Object.fromEntries(Object.entries({
    '/index.html': 'private fixture',
    '/guides/index.html': 'private guide',
    '/404.html': 'private error document',
    '/_next/static/example.js': 'private asset',
  }).map(([path, body]) => [path, { bytes: Buffer.from(body).toString('base64'), type: 'text/plain' }]));
  return { binding, context, authorization, vars, assets, run: createAccessEdge(binding, assets, "default-src 'self';", key => vars[key]) };
}

function authorized(x, path, options = {}) {
  return new Request(x.binding.origin + path, { ...options, headers: { Authorization: x.authorization, ...options.headers } });
}

function uncacheable(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  assert.equal(response.headers.get('netlify-cdn-cache-control'), 'no-store');
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
  assert.match(response.headers.get('Vary'), /Authorization/i);
}

test('the Edge build keeps the publication directory empty and rejects linked output', t => {
  const fixtureRoot = fs.mkdtempSync(path.join(tmpdir(), 'jinxi-edge-output-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  const source = path.join(fixtureRoot, 'export');
  const publish = path.join(fixtureRoot, 'public');
  const functions = path.join(fixtureRoot, 'edge-functions');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'index.html'), 'synthetic page');
  fs.writeFileSync(path.join(source, 'csp-manifest.json'), JSON.stringify({ policy: "default-src 'self';" }));
  const { binding } = fixture();
  const receipt = { approval: binding, deployId: binding.deployId };
  makeEdge(receipt, source, publish, functions);
  assert.deepEqual(fs.readdirSync(publish), []);
  const unrelated = path.join(fixtureRoot, 'unrelated.txt');
  const output = path.join(functions, 'access.js');
  fs.writeFileSync(unrelated, 'file outside the Edge directory');
  fs.unlinkSync(output);
  fs.linkSync(unrelated, output);
  assert.throws(() => makeEdge(receipt, source, publish, functions), /SYNTHETIC_DEPLOY_DIRECTORY_REJECTED/);
  assert.equal(fs.readFileSync(unrelated, 'utf8'), 'file outside the Edge directory');
  assert.deepEqual(fs.readdirSync(publish), []);
});

test('all paths and methods require the same visitor proof before responding or forwarding', async () => {
  const x = fixture();
  let forwarded = 0;
  x.context.next = () => { forwarded++; return new Response('business reply'); };
  for (const path of ['/', '/_next/static/example.js', '/guides', '/404.html',
    '/.netlify/functions/jinxi-service', '/.netlify/functions/messages', '/api/member', '/unknown']) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const reply = await x.run(new Request(x.binding.origin + path, { method }), x.context);
      assert.equal(reply.status, 401);
      assert.match(reply.headers.get('WWW-Authenticate'), /^Basic /);
      assert.equal(reply.headers.get('Location'), null);
      assert.equal(await reply.text(), method === 'HEAD' ? '' : 'TEST_ACCESS_REQUIRED');
      uncacheable(reply);
    }
  }
  assert.equal(forwarded, 0);
});

test('wrong and malformed credentials, cookie-only and URL-only values do not authorize', async () => {
  const x = fixture();
  for (const init of [{ Authorization: 'Basic ???' }, { Authorization: 'Bearer placeholder' },
    { Authorization: 'Basic ' + Buffer.from(accessUser + ':' + randomBytes(32).toString('hex')).toString('base64') },
    { Cookie: 'visitor=sample-test-cookie' }]) {
    const reply = await x.run(new Request(x.binding.origin + '/?access=sample-test-value', { headers: init }), x.context);
    assert.equal(reply.status, 401);
    uncacheable(reply);
    assert.equal(await reply.text(), 'TEST_ACCESS_REQUIRED');
  }
});

test('only the approved published deployment and its canonical origin are trusted', async () => {
  const x = fixture();
  for (const origin of ['http://synthetic-access-example.netlify.app',
    'https://deploy-preview-1--synthetic-access-example.netlify.app',
    'https://unit-deploy--synthetic-access-example.netlify.app',
    'https://synthetic-access-example.example.invalid']) {
    const reply = await x.run(new Request(origin + '/', { headers: { Authorization: x.authorization } }), x.context);
    assert.equal(reply.status, 503);
    assert.equal(reply.headers.get('WWW-Authenticate'), null);
    uncacheable(reply);
  }
  for (const changed of [{ account: { id: 'other' } }, { site: { ...x.context.site, id: 'old-site' } },
    { deploy: { ...x.context.deploy, context: 'deploy-preview' } }, { deploy: { ...x.context.deploy, published: false } },
    { deploy: { ...x.context.deploy, id: 'another-deploy' } }, { site: undefined }]) {
    const reply = await x.run(authorized(x, '/'), { ...x.context, ...changed });
    assert.equal(reply.status, 503);
  }
});

test('missing credentials/configuration or an exception deny without downstream use', async () => {
  const x = fixture();
  let forwarded = 0;
  x.context.next = () => { forwarded++; throw Error('private runtime details'); };
  for (const run of [
    createAccessEdge(null, x.assets, "default-src 'self';", key => x.vars[key]),
    createAccessEdge({ ...x.binding, expiresAt: '2000-01-01T00:00:00Z' }, x.assets, "default-src 'self';", key => x.vars[key]),
    createAccessEdge(x.binding, null, "default-src 'self';", key => x.vars[key]),
    createAccessEdge(x.binding, x.assets, "default-src 'self';", key => key === accessDigestKey ? undefined : x.vars[key]),
    createAccessEdge(x.binding, x.assets, "default-src 'self';", key => key === accessDigestKey ? 'malformed' : x.vars[key]),
    createAccessEdge(x.binding, x.assets, "default-src 'self';", () => { throw Error('private settings details'); }),
  ]) {
    const response = await run(authorized(x, '/api/member'), x.context);
    assert.equal(response.status, 503);
    assert.equal(await response.text(), 'TEST_ACCESS_UNAVAILABLE');
    uncacheable(response);
  }
  assert.equal(forwarded, 0);
  const downstreamError = await x.run(authorized(x, '/api/member'), x.context);
  assert.equal(downstreamError.status, 503);
  assert.equal(await downstreamError.text(), 'TEST_ACCESS_UNAVAILABLE');
  assert.equal(forwarded, 1);
});

test('successful assets, internal redirects, generic errors and API responses stay private', async () => {
  const x = fixture();
  const root = await x.run(authorized(x, '/'), x.context);
  assert.equal(await root.text(), 'private fixture');
  uncacheable(root);
  const head = await x.run(authorized(x, '/', { method: 'HEAD' }), x.context);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('Content-Length'), '15');
  uncacheable(head);
  const redirect = await x.run(authorized(x, '/guides'), x.context);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('Location'), '/guides/');
  uncacheable(redirect);
  const unknown = await x.run(authorized(x, '/unknown'), x.context);
  assert.equal(unknown.status, 404);
  assert.equal(await unknown.text(), 'TEST_ROUTE_NOT_FOUND');
  uncacheable(unknown);
  const forwardedResponse = await x.run(authorized(x, '/api/community'), { ...x.context, next: request => {
    assert.equal(request.headers.get('authorization'), x.authorization);
    return new Response('business reply', { headers: [
      ['Cache-Control', 'public, max-age=900'], ['Netlify-CDN-Cache-Control', 'public, max-age=900'],
      ['CDN-Cache-Control', 'public, max-age=900'], ['Vary', 'Cookie, Origin'],
      ['Set-Cookie', 'first=fixture'], ['Set-Cookie', 'second=fixture'],
    ] });
  } });
  assert.equal(await forwardedResponse.text(), 'business reply');
  uncacheable(forwardedResponse);
  assert.equal(forwardedResponse.headers.get('Vary'), 'Cookie, Origin, Authorization');
  assert.deepEqual(forwardedResponse.headers.getSetCookie(), ['first=fixture', 'second=fixture']);
  assert.equal((await x.run(new Request(x.binding.origin + '/'), x.context)).status, 401);
});
