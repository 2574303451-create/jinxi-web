// One in-memory session for the real React application. Never persisted in Web Storage.
class SessionError extends Error {
  constructor(code, status = 0) { super(code); this.code = code; this.status = status; }
}
function createSession({ fetcher, epoch, randomId, notify = () => {} }) {
  let generation = 0, credential = null, marker = epoch(), authBusy = false, restoring = null, queued = false;
  let state = Object.freeze({ phase: 'checking', member: null, revision: 0, message: '' });
  const listeners = new Set(), pending = new Map(), flights = new Map();
  const emit = patch => { state = Object.freeze({ ...state, ...patch }); for (const f of listeners) f(); };
  function clear(phase = 'unverified', message = '') {
    generation++; credential = null; pending.clear(); flights.clear();
    emit({ phase, member: null, revision: state.revision + 1, message });
  }
  async function transport(module, body, query = {}, csrf = '') {
    if (!['member', 'community', 'attendance', 'points', 'operations'].includes(module)) throw new SessionError('INVALID_MODULE');
    const search = new URLSearchParams(query), options = { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (body) { options.headers['Content-Type'] = 'application/json'; options.headers['X-CSRF-Token'] = csrf; options.body = JSON.stringify(body); }
    let response;
    try { response = await fetcher('/api/' + module + (search.size ? '?' + search : ''), options); }
    catch { throw new SessionError('NETWORK_RESULT_UNKNOWN'); }
    let data;
    try { data = await response.json(); } catch { throw new SessionError('INVALID_RESPONSE', response.status); }
    return { response, data };
  }
  function check(stamp, observed) {
    if (stamp !== generation) throw new SessionError('STALE_RESPONSE');
    if (epoch() !== observed) { marker = epoch(); clear('unverified', '账号已切换，请重新核验。'); throw new SessionError('ACCOUNT_CHANGED'); }
  }
  async function restore() {
    if (authBusy) { queued = true; return; }
    if (restoring) { queued = true; return restoring; }
    const stamp = generation, observed = epoch();
    restoring = (async () => {
      try {
        const { response, data } = await transport('member', null, { op: 'me' });
        check(stamp, observed);
        if (!response.ok) {
          if (response.status === 401 && state.phase === 'anonymous' && !credential) return;
          clear(response.status === 401 ? 'anonymous' : 'unverified', response.status === 429 ? '请求过于频繁，请稍后重新核验。' : '会话未通过核验。');
          return;
        }
        if (!data.member?.id || typeof data.csrfToken !== 'string') throw new SessionError('INVALID_IDENTITY');
        if (credential && credential.member.id !== data.member.id) clear();
        credential = data; marker = observed;
        emit({ phase: data.needsPasswordChange ? 'password' : 'ready', member: data.member, message: data.needsPasswordChange ? '请先完成首次改密。' : '' });
      } catch (e) { if (stamp === generation && e.code !== 'ACCOUNT_CHANGED') clear('unverified', '网络或身份未核验，私有内容已清除。'); }
      finally { restoring = null; if (queued) { queued = false; void restore(); } }
    })();
    return restoring;
  }
  async function authenticate(op, fields = {}) {
    if (authBusy) throw new SessionError('AUTH_BUSY');
    const csrf = credential?.csrfToken || '';
    authBusy = true; clear('busy', '正在核验身份…'); const stamp = generation;
    try {
      const { response, data } = await transport('member', { op, ...fields }, {}, csrf);
      if (stamp !== generation) throw new SessionError('STALE_RESPONSE');
      marker = epoch();
      if (!response.ok) { emit({ phase: 'unverified', message: response.status === 429 ? '请求过于频繁，请稍后重试。' : '身份操作未完成，请重新核验。' }); throw new SessionError(data.code || 'AUTH_REJECTED', response.status); }
      notify();
      if (op === 'login') {
        credential = data;
        emit({ phase: data.needsPasswordChange ? 'password' : 'ready', member: data.member, message: data.needsPasswordChange ? '请先完成首次改密。' : '' });
      } else emit({ phase: 'anonymous', member: null, message: op === 'logout' ? '已退出，所有模块的私有内容已清除。' : '密码已修改，所有旧会话已撤销。请重新登录。' });
      return data;
    } catch (e) { if (stamp === generation && state.phase === 'busy') emit({ phase: 'unverified', message: '操作结果待核验，请检查连接。' }); throw e; }
    finally { authBusy = false; if (queued) { queued = false; void restore(); } }
  }
  async function request(module, body = null, query = {}, privateView = true) {
    const stamp = generation, observed = marker;
    if (privateView) {
      check(stamp, observed);
      if (state.phase !== 'ready' || !credential) throw new SessionError('VERIFIED_SESSION_REQUIRED');
    }
    const { response, data } = await transport(module, body, query, privateView ? credential.csrfToken : '');
    if (privateView) {
      check(stamp, observed);
      if (data.memberId && data.memberId !== credential.member.id) { clear(); throw new SessionError('SUBJECT_MISMATCH'); }
    }
    if (!response.ok) {
      if (privateView && (response.status === 401 || response.status === 429 || ['PASSWORD_RESET_REQUIRED','STAFF_REQUIRED','ADMIN_REQUIRED','REVIEWER_REQUIRED'].includes(data.code))) clear('unverified', response.status === 429 ? '请求过于频繁，请稍后核验。' : '身份或权限已变化，所有私有内容已清除。');
      throw new SessionError(data.code || 'REQUEST_REJECTED', response.status);
    }
    return data;
  }
  function mutate(module, body) {
    const key = JSON.stringify([generation, module, body]);
    if (flights.has(key)) return flights.get(key);
    const id = pending.get(key) || randomId(); pending.set(key, id);
    const flight = request(module, { ...body, requestId: id }).then(result => { pending.delete(key); notify(); return result; }).catch(e => {
      // A lost response retains the SAME actor-bound request ID for an explicit retry.
      if (e.code !== 'NETWORK_RESULT_UNKNOWN' && e.code !== 'INVALID_RESPONSE') pending.delete(key);
      throw e;
    }).finally(() => { if (flights.get(key) === flight) flights.delete(key); });
    flights.set(key, flight); return flight;
  }
  function observeEpoch() { if (epoch() !== marker) { marker = epoch(); clear('unverified', '账号已切换，请重新核验。'); void restore(); } }
  return { getSnapshot: () => state, subscribe: f => { listeners.add(f); return () => listeners.delete(f); }, restore, authenticate, request, mutate, observeEpoch,
    unverify: () => clear('unverified', '连接未核验，所有私有内容已清除。'),
    invalidate: () => { clear(); void restore(); } };
}
module.exports = { createSession, SessionError };
