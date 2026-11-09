"use client";
import { useCallback, useState } from 'react';
import type { Strategy } from '../../../types/strategy-wall';
import { PaperState } from '../../../components/ui/paper';
import { useCommand, useResource, useSession } from './session-context';
import type { Item } from './model';

export function CommunityManagement({ kind, staff }: { kind: 'message' | 'guide'; staff: boolean }) {
  const { client, ready } = useSession();
  const load = useCallback(async () => {
    if (!ready) return { mine: [] as Item[], review: [] as Item[] };
    const mine = await client.request<{ items: Item[] }>('community', null, { kind, scope: 'mine' });
    const review = staff ? await client.request<{ items: Item[] }>('community', null, { kind, scope: 'review' }) : { items: [] };
    return { mine: mine.items, review: review.items.filter(r => !mine.items.some(m => m.id === r.id)) };
  }, [client, ready, kind, staff]);
  const resource = useResource(load), cmd = useCommand();
  const [editing, setEditing] = useState<Item | null>(null), [content, setContent] = useState(''), [title, setTitle] = useState('');
  if (!ready) return <p className="paper-notice">登录并完成改密后才能管理本人内容。</p>;
  return <section className="integration-panel" data-testid={'manage-' + kind} aria-label={kind === 'message' ? '本人留言与审核' : '本人攻略与审核'}>
    <h3>{kind === 'message' ? '本人留言与审核' : '本人攻略与审核'}</h3>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新本人内容</button>
    {resource.error && <p role="alert">{resource.error}</p>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
    {editing && <form aria-label="编辑本人内容" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
      await client.mutate('community', { op: 'item.edit', id: editing.id, version: editing.version, content, category: editing.category,
        ...(kind === 'message' ? { color: editing.color } : { title, difficulty: editing.difficulty, tags: editing.tags, mediaFiles: editing.mediaFiles }),
        ...(editing.imageUrl ? { imageUrl: editing.imageUrl } : {}) }); setEditing(null);
    }); }}>
      {kind === 'guide' && <label className="paper-label">修改攻略标题<input className="paper-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required /></label>}
      <label className="paper-label">修改正文<textarea className="paper-input" value={content} onChange={e => setContent(e.target.value)} maxLength={kind === 'message' ? 1000 : 10000} required /></label>
      <div className="integration-actions"><button className="paper-button yellow" disabled={cmd.busy}>保存本人修改</button><button className="paper-button" type="button" onClick={() => setEditing(null)}>取消编辑</button></div>
    </form>}
    {!resource.loading && !resource.data?.mine.length && <p>暂无本人内容，历史同名记录不会自动认领。</p>}
    <ul>{resource.data?.mine.map(item => <li className="integration-record" key={item.id} data-item-id={item.id}>
      <strong>{item.title || item.content}</strong><p>状态：{item.status} · 版本 {item.version}</p>
      <div className="integration-actions">
        {!['deleted','archived'].includes(item.status) && <>
          <button className="paper-button" disabled={cmd.busy} onClick={() => { setEditing(item); setContent(item.content); setTitle(item.title || ''); }}>编辑本人内容</button>
          <button className="paper-button" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'item.delete', id: item.id, version: item.version }))}>删除本人内容</button>
        </>}
        {kind === 'guide' && ['draft','rejected'].includes(item.status) && <button className="paper-button yellow" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'item.submit', id: item.id, version: item.version }))}>提交攻略审核</button>}
      </div>
    </li>)}</ul>
    {staff && <><h3>独立审核队列</h3><ul>{resource.data?.review.map(item => <li className="integration-record" key={item.id} data-review-id={item.id}>
      <strong>{item.title || item.content}</strong><p>{item.content}</p>
      <div className="integration-actions">{(['approve','reject'] as const).map(decision => <button className="paper-button" key={decision} disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'item.review', id: item.id, version: item.version, decision }))}>{decision === 'approve' ? '审核通过' : '审核拒绝'}</button>)}</div>
    </li>)}</ul></>}
  </section>;
}

export function GuideDiscussion({ guide }: { guide: Strategy }) {
  const { client, ready } = useSession(), cmd = useCommand(), [comment, setComment] = useState('');
  return <section className="integration-panel" aria-label="攻略交流">
    <h2>一起讨论</h2><p>{guide.comments.length} 条已公开评论。互动只依据当前服务端会话。</p>
    <div className="integration-actions"><button className="paper-button" disabled={!ready || cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'reaction.set', id: guide.id, type: 'like', active: true }))}>回应这篇攻略</button></div>
    <form onSubmit={e => { e.preventDefault(); void cmd.run(async () => { await client.mutate('community', { op: 'reply.create', id: guide.id, content: comment }); setComment(''); }); }}>
      <label className="paper-label">攻略评论<textarea className="paper-input" required maxLength={1000} value={comment} onChange={e => setComment(e.target.value)} /></label>
      <button className="paper-button yellow" disabled={!ready || cmd.busy}>发布攻略评论</button>
    </form>
    {cmd.notice && <p role="status">{cmd.notice} 重新打开正文可核对最新公开评论。</p>}
    <ul>{guide.comments.map(c => <li key={c.id}><strong>{c.userName}</strong><p>{c.content}</p></li>)}</ul>
    {!ready && <PaperState kind="empty" title="请先登录合成账号" />}
  </section>;
}
