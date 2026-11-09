"use client";
import { useState } from 'react';
import { Modal } from '../../../components/ui/modal';
import { useSession } from './session-context';
export function AuthDialog({ mode, close }: { mode: 'login' | 'password' | null; close: () => void }) {
  const { client } = useSession();
  const [account, setAccount] = useState(''), [password, setPassword] = useState(''), [next, setNext] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <Modal isOpen={mode !== null} onClose={close} title={mode === 'password' ? '合成账号修改密码' : '合成成员登录'} legacy={false} size="md">
    <form className="paper-form" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await client.authenticate(mode === 'password' ? 'change-password' : 'login', mode === 'password' ? { currentPassword: password, newPassword: next } : { account, password }); setPassword(''); setNext(''); close(); }
      catch { setPassword(''); setNext(''); setError('未完成身份操作，请核对合成账号或稍后重试。'); }
      finally { setBusy(false); }
    }}>
      <p className="paper-notice">仅使用本次临时集群生成的合成账号。不要输入真实账号资料。</p>
      {mode !== 'password' && <label className="paper-label">合成账号<input className="paper-input" autoComplete="off" required value={account} onChange={e => setAccount(e.target.value)} /></label>}
      <label className="paper-label">{mode === 'password' ? '当前密码' : '合成密码'}<input className="paper-input" type="password" autoComplete="off" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {mode === 'password' && <label className="paper-label">新密码<input className="paper-input" type="password" autoComplete="off" minLength={12} maxLength={128} required value={next} onChange={e => setNext(e.target.value)} /></label>}
      {error && <p role="alert" className="paper-notice error">{error}</p>}
      <button className="paper-button yellow" disabled={busy}>{busy ? '核验中…' : mode === 'password' ? '确认修改密码' : '登录合成账号'}</button>
    </form>
  </Modal>;
}
