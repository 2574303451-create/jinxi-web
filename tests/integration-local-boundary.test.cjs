const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { publicContract } = require('../integration-local/public-contract.cjs');
const root = path.resolve(__dirname,'..');
test('public adapters use only public authenticated handler contracts and never mutate', async () => {
  const calls = [], handlers = Object.fromEntries(['community','operations'].map(module => ['/api/' + module, async event => {
    calls.push(event); return { statusCode: 200, body: JSON.stringify({ items: [] }) };
  }]));
  for (const name of ['messages','strategies','announcements','sponsorship','guide-video-stats']) await publicContract(name, {}, handlers);
  assert.equal(calls.length, 5); for (const event of calls) { assert.equal(event.httpMethod, 'GET'); assert(!event.body); assert(!Object.keys(event.headers).length); assert(['public'].includes(event.queryStringParameters.scope || event.queryStringParameters.view)); }
  assert.equal(await publicContract('points', {}, handlers), null);
});
test('published guide UUID remains its original UUID; filters exclude private and wrong feed', async () => {
  const rows = [{ id: 'uuid-a', title: 'a', content: 'a', mediaFiles: [], comments: [], isPinned: false }, { id: 'uuid-b', title: 'b', content: 'b', mediaFiles: [{ type: 'video' }], comments: [], isPinned: true }];
  const handlers = { '/api/community': async () => ({ statusCode: 200, body: JSON.stringify({ items: rows }) }) };
  const result = await publicContract('strategies', { feed: 'video', limit: '3' }, handlers);
  assert.deepEqual(result.strategies.map(r => r.id), ['uuid-b']); assert.equal(result.appliedFeed, 'video'); assert.equal(result.pagination.total,1);
});
test('production app has no import of isolated runtime, and original auth freeze remains false', () => {
  const visit = directory => fs.readdirSync(directory,{ withFileTypes:true }).flatMap(entry => entry.isDirectory() ? visit(path.join(directory,entry.name)) : [path.join(directory,entry.name)]);
  for (const file of visit(path.join(root,'app')).filter(f => /\.[jt]sx?$/.test(f))) assert(!fs.readFileSync(file,'utf8').includes('integration-local'),path.relative(root,file));
  assert.match(fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'), /const LEGACY_MEMBER_AUTH_READY = false/);
  assert.equal(fs.existsSync(path.join(root,'app/integration-local')),false);
});
test('the development renderer refuses production mode even with a spoofed enabling flag', async () => {
  const { spawnSync } = require('node:child_process'), { cleanEnv } = require('../scripts/run-clean.cjs');
  const r = spawnSync(process.execPath,['-e',"import('./integration-local/site/next.config.mjs')"],{ cwd:root, env:cleanEnv({ NODE_ENV:'production', JINXI_INTEGRATION_RENDERER:'local-synthetic-v1' }),encoding:'utf8' });
  assert.notEqual(r.status,0); assert(r.stderr.includes('LOCAL_DEV_RENDERER_ONLY'));
});
