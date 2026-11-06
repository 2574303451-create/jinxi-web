const assert = require('node:assert/strict');
const { request } = require('node:http');
const { test } = require('node:test');
const { resolvePlayback } = require('./policy.cjs');
const { startDemo } = require('./serve.cjs');
const { isPublicAttachmentUrl } = require('../../../lib/guide-attachment-policy');

const origin = 'https://test-site.invalid';
const nativePath = '/guide-videos/synthetic-motion.mp4';
const bili = 'https://www.bilibili.com/video/BV0A8JX0TEST';
const youtube = 'https://www.youtube.com/watch?v=A8GuideDemo';
const assets = new Set([nativePath]);
const attachment = (url, extra) => ({ id: 'old-id', type: 'video', url, ...extra });
const resolve = item => resolvePlayback(item, origin, assets);

test('explicit external mode returns only canonical HTTPS watch pages', () => {
  assert.deepEqual(resolve(attachment(`${bili}/?share_source=copy#redirect`, { playbackMode: 'external' })), { mode: 'external', url: bili });
  assert.deepEqual(resolve(attachment(`${youtube}&si=tracking`, { playbackMode: 'external' })), { mode: 'external', url: youtube });
});

test('external mode rejects unsafe protocols, impostors, redirects, duplicates and direct media', () => {
  for (const url of [null, 'javascript:alert(1)', 'data:text/html,test', 'blob:https://www.bilibili.com/1',
    '//www.bilibili.com/video/BV0A8JX0TEST', bili.replace('https:', 'http:'),
    bili.replace('.com', '.com.evil.invalid'), bili.replace('.com', '.com:444'),
    bili.replace('www.', 'example.invalid@www.'), 'https://www.bilibili.com/redirect?to=https://127.0.0.1/',
    'https://www.youtube.com/embed/A8GuideDemo', `${youtube}&v=A8GuideDemo`, `${bili}.mp4`,
    nativePath, 'https://www.bilibili.com/a/%2e%2e/video/BV0A8JX0TEST']) {
    assert.equal(resolve(attachment(url, { playbackMode: 'external' })), null, String(url));
  }
});

test('native mode requires an approved same-origin asset, without a query or fragment', () => {
  for (const url of [nativePath, `${origin}${nativePath}`]) {
    assert.deepEqual(resolve(attachment(url, { playbackMode: 'native' })), { mode: 'native', url: nativePath });
  }
  for (const url of [`https://not-approved.invalid${nativePath}`, '/guide-videos/new-upload.mp4',
    '/1.mp4', '/2.mp4', `${nativePath}?download=1`, `${nativePath}#t=1`, '/guide-videos/%2e%2e/1.mp4', bili]) {
    assert.equal(resolve(attachment(url, { playbackMode: 'native' })), null, url);
  }
});

test('legacy records infer only approved destinations and malformed explicit modes stay unavailable', () => {
  assert.deepEqual(resolve(attachment(nativePath)), { mode: 'native', url: nativePath });
  assert.deepEqual(resolve(attachment(youtube)), { mode: 'external', url: youtube });
  assert.equal(resolve(attachment('https://not-approved.invalid/video')), null);
  assert.equal(resolve(null), null);
  assert.equal(resolve({ type: 'image', url: nativePath }), null);
  for (const playbackMode of [null, undefined, 'legacy', 'bogus']) {
    assert.equal(resolve(attachment(bili, { playbackMode })), null);
  }
});

test('projecting playback mode preserves all legacy fields and the B1 attachment-count unit', () => {
  const existing = [attachment(bili, { thumbnail: '/cover.png', duration: 'old-value', original: { key: 1 } }),
    attachment(bili, { id: 'distinct-id' }), attachment('/1.mp4'), { type: 'image', url: '/cover.png' }];
  const updated = existing.map((item, index) => index === 0 ? { ...item, playbackMode: 'external' } : item);
  const snapshot = structuredClone(updated);
  updated.forEach(resolve);
  assert.deepEqual(updated, snapshot);
  const b1Count = items => items.filter(item => item.type === 'video' && isPublicAttachmentUrl(item.url, true)).length;
  assert.equal(b1Count(existing), 2);
  assert.equal(b1Count(updated), 2);
});

test('demo serves only local immutable fixtures and honors a video byte range', async t => {
  const server = await startDemo(0);
  t.after(() => server.close());
  const local = `http://127.0.0.1:${server.address().port}`;
  const root = await fetch(local);
  assert.match(root.headers.get('Content-Security-Policy'), /script-src 'self';/);
  assert.equal(root.headers.get('X-DNS-Prefetch-Control'), 'off');
  await root.text();
  const items = await (await fetch(`${local}/fixtures.json`)).json();
  assert.equal(items.find(item => item.id === 'unavailable').playback, null);
  assert.equal(JSON.stringify(items).includes('not-approved.invalid'), false);
  const part = await fetch(`${local}${nativePath}`, { headers: { Range: 'bytes=0-15' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('Content-Type'), 'video/mp4');
  assert.match(part.headers.get('Content-Range'), /^bytes 0-15\/\d+$/);
  assert.equal((await part.arrayBuffer()).byteLength, 16);
  assert.equal((await fetch(`${local}/fixtures.json`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${local}/fixtures.json?url=https://example.invalid/`)).status, 404);
  const mismatchedHost = await new Promise((resolve, reject) => {
    const req = request(local, { headers: { Host: 'other.invalid' } }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(mismatchedHost, 421);
});
