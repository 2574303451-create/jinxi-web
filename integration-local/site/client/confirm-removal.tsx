"use client";
import { useRef, useState, type RefObject } from 'react';

export function ConfirmRemoval({ label, busy, heading, onConfirm, action = '删除',
  description = '删除后将停止展示，保留历史版本和审计记录。' }: {
  label: string; busy: boolean; heading: RefObject<HTMLHeadingElement | null>; onConfirm: () => void;
  action?: '删除' | '归档'; description?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div>
    <button ref={trigger} type="button" className="paper-button" aria-expanded={confirming} disabled={busy}
      onClick={() => setConfirming(!confirming)}>{action}{label}</button>
    {confirming && <div className="integration-actions">
      <p>{description}</p>
      <button type="button" className="paper-button" disabled={busy} onClick={() => { setConfirming(false); trigger.current?.focus(); }}>取消{action}</button>
      <button type="button" className="paper-button" disabled={busy} onClick={() => {
        setConfirming(false); heading.current?.focus(); onConfirm();
      }}>确认{action}{label}</button>
    </div>}
  </div>;
}
