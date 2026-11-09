"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback } from 'react';
import type { SessionClient, Snapshot } from './model';
export const SessionContext = createContext<SessionClient | null>(null);
export function useSession() {
  const client = useContext(SessionContext);
  if (!client) throw Error('LOCAL_SESSION_PROVIDER_REQUIRED');
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return { client, state, ready: state.phase === 'ready' };
}
export function useResource<T>(load: () => Promise<T>) {
  const { state } = useSession();
  const [revision, setRevision] = useState(0), [result, setResult] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => { window.addEventListener('integration:data', reload); return () => window.removeEventListener('integration:data', reload); }, [reload]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    load().then(value => { if (live) setResult(value); }).catch(e => { if (live) { setResult(null); setError(e.code || 'REQUEST_UNAVAILABLE'); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load, revision, state.revision]);
  return { data: result, error, loading, reload };
}
export function useCommand() {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [active] = useState(() => ({ value: false }));
  async function run(action: () => Promise<unknown>) {
    if (active.value) return;
    active.value = true; setBusy(true); setNotice('');
    try { await action(); setNotice('操作已由服务器确认。'); }
    catch (e) { const code = (e as { code?: string }).code; setNotice(code === 'NETWORK_RESULT_UNKNOWN' ? '响应丢失，结果待确认。请原样重试，将复用同一请求编号。' : '请求未完成：' + (code || 'UNAVAILABLE')); }
    finally { active.value = false; setBusy(false); }
  }
  return { run, busy, notice };
}
export const anonymousSnapshot: Snapshot = { phase: 'checking', member: null, revision: 0, message: '' };
