import type { RefObject } from 'react';

export function PageControls({ label, olderLabel, atStart, next, loading, heading, onChange }: {
  label: string; olderLabel: string; atStart: boolean; next?: string | null; loading: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
  onChange: (cursor: string | null) => void;
}) {
  if (atStart && !next) return null;
  const navigate = (cursor: string | null) => {
    onChange(cursor);
    heading.current?.focus();
  };
  return <nav className="integration-actions" aria-label={label} aria-busy={loading}>
    <button type="button" className="paper-button" disabled={atStart} onClick={() => navigate(null)}>返回第一页</button>
    <button type="button" className="paper-button" disabled={loading || !next} onClick={() => { if (next) navigate(next); }}>{olderLabel}</button>
  </nav>;
}
