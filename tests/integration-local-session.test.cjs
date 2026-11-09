const test = require('node:test'), assert = require('node:assert/strict');
const { createSession } = require('../integration-local/session.cjs');
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const identity = who => ({ member: { id: who, displayName: '同名合成成员' }, csrfToken: who + '-csrf', needsPasswordChange: false });
function setup() {
  let marker = 'epoch-a', id = 0; const calls = [], queue = [];
  const client = createSession({ epoch: () => marker, randomId: () => 'nonce-' + (++id), fetcher: async (url, options) => {
    const input = { url, options, body: options.body ? JSON.parse(options.body) : null }; calls.push(input);
    assert(queue.length, 'unexpected request ' + url); return queue.shift()(input);
  } });
  return { client, calls, push: fn => queue.push(fn), marker: value => { marker = value; } };
}
async function login(s, who = 'A') { s.push(() => response(200, identity(who))); s.push(() => response(200, identity(who))); await s.client.authenticate('login', { account: who, password: 'synthetic-only' }); }
test('old restoration cannot overwrite a newly logged-in member', async () => {
  const s = setup(), old = deferred(); s.push(() => old.promise); const restoring = s.client.restore();
  await login(s, 'B'); old.resolve(response(401, { code: 'SESSION_INVALID' })); await restoring;
  assert.equal(s.client.getSnapshot().member.id, 'B'); assert.equal(s.client.getSnapshot().phase, 'ready');
});
test('pending private response from A is discarded after B login, including old 401', async () => {
  for (const status of [200,401]) {
    const s = setup(); await login(s); const old = deferred(); s.push(() => old.promise);
    const request = s.client.request('points').catch(e => e.code); await login(s, 'B');
    old.resolve(response(status, { memberId: 'A', privateDraft: 'A-private-only' }));
    assert.equal(await request, 'STALE_RESPONSE'); assert.equal(s.client.getSnapshot().member.id, 'B');
  }
});
test('silent cookie switch blocks writes before fetch and clears memory', async () => {
  const s = setup(); await login(s); const before = s.calls.length; s.marker('epoch-b');
  await assert.rejects(s.client.mutate('attendance', { op: 'checkin' }), e => e.code === 'ACCOUNT_CHANGED');
  assert.equal(s.calls.length, before); assert.equal(s.client.getSnapshot().member, null);
});
test('switch between private request and response cannot leak another subject', async () => {
  const s = setup(); await login(s); s.push(() => { s.marker('epoch-b'); return response(200, { memberId: 'B', orders: ['B-private'] }); });
  await assert.rejects(s.client.request('points'), e => e.code === 'ACCOUNT_CHANGED'); assert.equal(s.client.getSnapshot().member, null);
});
test('explicit member mismatch fails closed even when epoch was unchanged', async () => {
  const s = setup(); await login(s); s.push(() => response(200, { memberId: 'B', drafts: ['secret'] }));
  await assert.rejects(s.client.request('community'), e => e.code === 'SUBJECT_MISMATCH'); assert.equal(s.client.getSnapshot().member, null);
});
test('lost response retry reuses nonce and CSRF; simultaneous repeats share one write', async () => {
  const s = setup(); await login(s); s.push(() => { throw Error('network'); });
  const body = { op: 'redeem', itemId: 'fixture', quantity: 1 };
  await assert.rejects(s.client.mutate('points', body), e => e.code === 'NETWORK_RESULT_UNKNOWN');
  const nonce = s.calls.at(-1).body.requestId, deferredResult = deferred(); s.push(() => deferredResult.promise);
  const first = s.client.mutate('points', body), second = s.client.mutate('points', body);
  assert.equal(first, second); assert.equal(s.calls.at(-1).body.requestId, nonce); assert.equal(s.calls.at(-1).options.headers['X-CSRF-Token'], 'A-csrf');
  deferredResult.resolve(response(200, { memberId: 'A', orderId: 'one' })); assert.equal((await second).orderId, 'one');
  assert.equal(s.calls.filter(c => c.body?.op === 'redeem').length, 2);
});
test('failed logout or password change clears private state and requires server recovery', async () => {
  for (const op of ['logout','change-password']) {
    const s = setup(); await login(s); s.push(() => response(503, { code: 'UNAVAILABLE' }));
    await assert.rejects(s.client.authenticate(op)); assert.equal(s.client.getSnapshot().member, null); assert.equal(s.client.getSnapshot().phase, 'unverified');
    await assert.rejects(s.client.mutate('attendance', { op: 'checkin' }), e => e.code === 'VERIFIED_SESSION_REQUIRED');
    s.push(() => response(200, identity('A'))); await s.client.restore(); assert.equal(s.client.getSnapshot().member.id, 'A');
  }
});
test('duplicate identity operations are rejected while notifications queue one revalidation', async () => {
  const s = setup(), delayed = deferred(); s.push(() => delayed.promise);
  const first = s.client.authenticate('login', { account: 'A', password: 'synthetic' });
  await assert.rejects(s.client.authenticate('login', { account: 'B', password: 'synthetic' }), e => e.code === 'AUTH_BUSY');
  await s.client.restore(); await s.client.restore(); s.push(() => response(200, identity('A'))); s.push(() => response(200, identity('A')));
  delayed.resolve(response(200, identity('A'))); await first; await new Promise(r => { setImmediate(r); });
  assert.equal(s.calls.length, 3); assert.equal(s.client.getSnapshot().member.id, 'A');
});
test('successful password change and logout remove credentials from all future commands', async () => {
  for (const op of ['logout','change-password']) {
    const s = setup(); await login(s); s.push(() => response(200, { success: true })); await s.client.authenticate(op);
    assert.equal(s.client.getSnapshot().phase, 'anonymous'); assert.equal(s.client.getSnapshot().member, null);
    await assert.rejects(s.client.request('points'), e => e.code === 'VERIFIED_SESSION_REQUIRED');
  }
});
test('expiry, password-reset and real 429 errors clear every shared private view', async () => {
  for (const [status,code] of [[401,'SESSION_INVALID'],[403,'PASSWORD_RESET_REQUIRED'],[403,'STAFF_REQUIRED'],[403,'ADMIN_REQUIRED'],[403,'REVIEWER_REQUIRED'],[429,'RATE_LIMITED']]) {
    const s = setup(); await login(s); s.push(() => response(status, { code })); await assert.rejects(s.client.request('operations'), e => e.status === status);
    assert.equal(s.client.getSnapshot().member, null); assert.equal(s.client.getSnapshot().phase, 'unverified');
  }
});
test('first-reset identity cannot call any of the four business modules', async () => {
  const s = setup(); s.push(() => response(200, { ...identity('first'), needsPasswordChange: true })); s.push(() => response(200, { ...identity('first'), needsPasswordChange: true })); await s.client.authenticate('login', {});
  for (const module of ['community','attendance','points','operations']) await assert.rejects(s.client.request(module), e => e.code === 'VERIFIED_SESSION_REQUIRED');
  assert.equal(s.calls.length, 2);
});
test('offline invalidation rejects previously started response and erases nonce scope', async () => {
  const s = setup(); await login(s); const delayed = deferred(); s.push(() => delayed.promise); const old = s.client.request('community').catch(e => e.code);
  s.client.unverify(); delayed.resolve(response(200, { memberId: 'A' })); assert.equal(await old, 'STALE_RESPONSE'); assert.equal(s.client.getSnapshot().member, null);
});
test('lost write response -> offline -> same verified member -> retry keeps its original nonce', async () => {
  const s = setup(); await login(s); const body = { op:'redeem',itemId:'synthetic-item',quantity:1 };
  s.push(() => { throw Error('lost after commit'); });
  await assert.rejects(s.client.mutate('points',body),e=>e.code==='NETWORK_RESULT_UNKNOWN');
  const first=s.calls.at(-1).body.requestId;s.client.unverify();s.push(()=>response(200,identity('A')));await s.client.restore();
  s.push(()=>response(200,{memberId:'A',orderId:'same-order'}));await s.client.mutate('points',{quantity:1,itemId:'synthetic-item',op:'redeem'});
  assert.equal(s.calls.at(-1).body.requestId,first);assert.equal(s.client.getSnapshot().member.id,'A');
});
test('unknown A receipt cannot be used by B; returning A still safely reuses only its own receipt', async () => {
  const s=setup();await login(s);const body={op:'redeem',itemId:'shared-synthetic-item',quantity:1};s.push(()=>{throw Error('lost');});await assert.rejects(s.client.mutate('points',body));const a=s.calls.at(-1).body.requestId;
  await login(s,'B');s.push(()=>response(200,{memberId:'B'}));await s.client.mutate('points',body);assert.notEqual(s.calls.at(-1).body.requestId,a);
  await login(s,'A');s.push(()=>response(200,{memberId:'A'}));await s.client.mutate('points',body);assert.equal(s.calls.at(-1).body.requestId,a);
});
test('delayed A login JSON cannot adopt the current B cookie epoch and enable A private UI', async () => {
  const s=setup();s.push(()=>{s.marker('epoch-b');return response(200,identity('A'));});s.push(()=>response(200,identity('B')));
  await assert.rejects(s.client.authenticate('login',{account:'A',password:'synthetic-only'}),e=>e.code==='LOGIN_SESSION_CHANGED');
  assert.equal(s.client.getSnapshot().member,null);assert.equal(s.client.getSnapshot().phase,'unverified');
});
test('profile member.id is checked as strictly as business memberId', async () => {
  const s=setup();await login(s);s.push(()=>response(200,{member:{id:'B'},profile:{nickname:'private-B'}}));
  await assert.rejects(s.client.request('member',null,{op:'profile'}),e=>e.code==='SUBJECT_MISMATCH');assert.equal(s.client.getSnapshot().member,null);
});
test('unknown committed receipt survives an intervening 401, role denial or rate limit until same-member confirmation', async () => {
  for(const [status,code]of [[401,'SESSION_INVALID'],[403,'STAFF_REQUIRED'],[429,'RATE_LIMITED']]){
    const s=setup();await login(s);const body={op:'redeem',itemId:'synthetic-item',quantity:1};s.push(()=>{throw Error('committed response lost');});await assert.rejects(s.client.mutate('points',body));
    const original=s.calls.at(-1).body.requestId;s.push(()=>response(status,{code}));await assert.rejects(s.client.mutate('points',body));assert.equal(s.calls.at(-1).body.requestId,original);
    s.push(()=>response(200,identity('A')));await s.client.restore();s.push(()=>response(200,{memberId:'A',orderId:'original-order'}));await s.client.mutate('points',body);assert.equal(s.calls.at(-1).body.requestId,original);
  }
});
test('a first definitive rejection without an earlier unknown result may use a fresh request on recovery', async () => {
  const s=setup();await login(s);const body={op:'redeem',itemId:'synthetic-item',quantity:1};s.push(()=>response(403,{code:'STAFF_REQUIRED'}));await assert.rejects(s.client.mutate('points',body));const rejected=s.calls.at(-1).body.requestId;
  s.push(()=>response(200,identity('A')));await s.client.restore();s.push(()=>response(200,{memberId:'A'}));await s.client.mutate('points',body);assert.notEqual(s.calls.at(-1).body.requestId,rejected);
});
test('first 5xx or malformed response cannot prove no commit: retain the original receipt', async () => {
  for(const status of [500,502,503,504]){
    const s=setup();await login(s);const body={op:'redeem',itemId:'synthetic-item',quantity:1};s.push(()=>response(status,{code:'POINTS_UNAVAILABLE'}));await assert.rejects(s.client.mutate('points',body));const first=s.calls.at(-1).body.requestId;
    s.push(()=>response(200,{memberId:'A',orderId:'original'}));await s.client.mutate('points',body);assert.equal(s.calls.at(-1).body.requestId,first);
  }
  for(const value of [null,[],42]){
    const s=setup();await login(s);const body={op:'redeem',itemId:'synthetic-item',quantity:1};s.push(()=>response(200,value));await assert.rejects(s.client.mutate('points',body));const first=s.calls.at(-1).body.requestId;s.push(()=>response(200,{memberId:'A'}));await s.client.mutate('points',body);assert.equal(s.calls.at(-1).body.requestId,first);
  }
});
