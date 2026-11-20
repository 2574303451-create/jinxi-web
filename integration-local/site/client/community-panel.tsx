"use client";
import { useCallback, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { GuideDiscussionProps } from '../../../components/site-runtime';
import { PaperState } from '../../../components/ui/paper';
import { PageControls } from './page-controls';
import { ConfirmRemoval } from './confirm-removal';
import { useCommand, useResource, useSession } from './session-context';
import type { Item } from './model';

const copy = {
  mine: {title:'本人内容', refresh:'刷新本人内容', empty:'暂无本人内容，历史同名记录不会自动认领。'},
  review: {title:'独立审核队列', refresh:'刷新审核队列', empty:'暂无待审核内容'},
  'published-admin': {title:'已发布内容管理', refresh:'刷新已发布内容', empty:'暂无可管理的已发布内容'},
};
type PublishedSummary = Pick<Item, 'id' | 'version' | 'isPinned' | 'title' | 'content' | 'name'>;

function CommunityPage<Record extends PublishedSummary = Item>({ kind, scope, busy, children }: {
  kind: 'message' | 'guide'; scope: keyof typeof copy; busy: boolean;
  children: (items: Record[], heading: RefObject<HTMLHeadingElement | null>, reload: () => void) => ReactNode;
}) {
  const { client } = useSession();
  const [cursor, setCursor] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { title, refresh, empty } = copy[scope];
  const load = useCallback(async () => {
    const page = await client.request<{ items: Record[]; nextCursor: string | null }>('community', null, {
      kind, scope, limit: '50', ...(cursor ? { cursor } : {}),
    });
    return { cursor, page };
  }, [client, cursor, kind, scope]);
  const resource = useResource(load);
  const page = resource.data?.cursor === cursor ? resource.data?.page : null;
  const loading = resource.loading || (!page && !resource.error);
  const changed = resource.error === 'PAGE_CHANGED';
  return <section aria-label={title}>
    <h3 ref={heading} tabIndex={-1}>{title}</h3>
    <button className="paper-button" onClick={resource.reload} disabled={loading || changed}>{refresh}</button>
    {loading && <PaperState kind="loading" title={`读取${title}…`} />}
    {resource.error && <PaperState kind="error" title={changed ? `${title}已更新，请返回第一页。` : `暂时无法读取${title}，请刷新。`} />}
    {page && !loading && (page.items.length ? children(page.items, heading, resource.reload) : <PaperState kind="empty" title={empty} />)}
    <PageControls label={`${title}分页`} olderLabel="查看更早记录" atStart={!cursor} next={page?.nextCursor}
      loading={loading || busy} heading={heading} onChange={setCursor} />
  </section>;
}

export function CommunityManagement({ kind, staff, admin }: { kind: 'message' | 'guide'; staff: boolean; admin: boolean }) {
  const { client, ready } = useSession(), cmd = useCommand();
  const contentId = useId();
  const publishedId = useId();
  const [showPublished, setShowPublished] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null), [content, setContent] = useState(''), [title, setTitle] = useState('');
  if (!ready) return <p className="paper-notice">登录并完成改密后才能管理本人内容。</p>;
  const updatePublished = (item: PublishedSummary, op: 'item.pin' | 'item.delete', reload: () => void) =>
    void cmd.run(async () => {
      try {
        await client.mutate('community', { op, id: item.id, version: item.version, ...(op === 'item.pin' ? { pinned: !item.isPinned } : {}) });
      } catch (error) {
        if ((error as { code?: string }).code === 'VERSION_CONFLICT') reload();
        throw error;
      }
    });
  return <section className="integration-panel" data-testid={'manage-' + kind} aria-label={kind === 'message' ? '本人留言与审核' : '本人攻略与审核'}>
    <h3>{kind === 'message' ? '本人留言与审核' : '本人攻略与审核'}</h3>
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
    {editing && <form aria-label="编辑本人内容" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
      await client.mutate('community', { op: 'item.edit', id: editing.id, version: editing.version, content, category: editing.category,
        ...(kind === 'message' ? { color: editing.color } : { title, difficulty: editing.difficulty, tags: editing.tags, mediaFiles: editing.mediaFiles }),
        ...(editing.imageUrl ? { imageUrl: editing.imageUrl } : {}) }); setEditing(null);
    }); }}>
      {kind === 'guide' && <label className="paper-label">修改攻略标题<input className="paper-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required /></label>}
      <div className="paper-label">
        <label htmlFor={contentId}>修改正文</label>
        <textarea id={contentId} className="paper-input" value={content} onChange={e => setContent(e.target.value)} maxLength={kind === 'message' ? 1000 : 10000} required />
      </div>
      <div className="integration-actions"><button className="paper-button yellow" disabled={cmd.busy}>保存本人修改</button><button className="paper-button" type="button" onClick={() => setEditing(null)}>取消编辑</button></div>
    </form>}
    <CommunityPage kind={kind} scope="mine" busy={cmd.busy}>{(items, heading) =>
    <ul>{items.map(item => <li className="integration-record" key={item.id} data-item-id={item.id}>
      <strong>{item.title || item.content}</strong><p>状态：{item.status} · 版本 {item.version}</p>
      <div className="integration-actions">
        {!['deleted','archived'].includes(item.status) && <>
          <button className="paper-button" disabled={cmd.busy} onClick={() => { setEditing(item); setContent(item.content); setTitle(item.title || ''); }}>编辑本人内容</button>
          <ConfirmRemoval key={item.version} label="本人内容" busy={cmd.busy} heading={heading}
            description="删除后将停止展示，操作会留下审计记录。"
            onConfirm={() => void cmd.run(() => client.mutate('community', { op: 'item.delete', id: item.id, version: item.version }))} />
          {kind === 'guide' && <ConfirmRemoval key={`archive-${item.version}`} label="本人攻略" action="归档" busy={cmd.busy} heading={heading}
            description="归档后将停止公开展示，之后无法编辑或再次送审。"
            onConfirm={() => void cmd.run(() => client.mutate('community', { op: 'item.archive', id: item.id, version: item.version }))} />}
        </>}
        {kind === 'guide' && ['draft','rejected'].includes(item.status) && <button className="paper-button yellow" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'item.submit', id: item.id, version: item.version }))}>提交攻略审核</button>}
      </div>
    </li>)}</ul>}</CommunityPage>
    {staff && <CommunityPage kind={kind} scope="review" busy={cmd.busy}>{items =>
    <ul>{items.map(item => <li className="integration-record" key={item.id} data-review-id={item.id}>
      <strong>{item.title || item.content}</strong><p>{item.content}</p>
      <div className="integration-actions">{(['approve','reject'] as const).map(decision => <button className="paper-button" key={decision} disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('community', { op: 'item.review', id: item.id, version: item.version, decision }))}>{decision === 'approve' ? '审核通过' : '审核拒绝'}</button>)}</div>
    </li>)}</ul>}</CommunityPage>}
    {admin && <>
      <button type="button" className="paper-button" aria-expanded={showPublished} aria-controls={publishedId}
        disabled={cmd.busy} onClick={() => setShowPublished(!showPublished)}>{showPublished ? '收起已发布内容管理' : '管理已发布内容'}</button>
      <div id={publishedId} hidden={!showPublished}>
        {showPublished && <CommunityPage<PublishedSummary> kind={kind} scope="published-admin" busy={cmd.busy}>{(items, heading, reload) =>
          <ul>{items.map(item => <li className="integration-record" key={item.id} data-moderation-id={item.id}>
            <p className="break-words"><strong>{item.title || item.content}</strong></p>
            <p>{item.name}{item.isPinned && ' · 已置顶'}</p>
            <div className="integration-actions">
              <button type="button" className="paper-button" aria-pressed={Boolean(item.isPinned)} disabled={cmd.busy}
                onClick={() => { heading.current?.focus(); updatePublished(item, 'item.pin', reload); }}>{item.isPinned ? '取消置顶' : '置顶'}</button>
              <ConfirmRemoval key={item.version} label="已发布内容" busy={cmd.busy} heading={heading}
                description={`删除「${item.title || item.content}」后将停止展示，操作会留下审计记录。`}
                onConfirm={() => updatePublished(item, 'item.delete', reload)} />
            </div>
          </li>)}</ul>
        }</CommunityPage>}
      </div>
    </>}
  </section>;
}

export function GuideDiscussion({ guide, refreshing, comment, setComment }: GuideDiscussionProps) {
  const { client, ready } = useSession(), cmd = useCommand();
  const commentId = useId();
  const verified = guide.ownership === 'verified';
  const canInteract = ready && Boolean(guide.viewerReactions) && !refreshing && !cmd.busy;
  const react = (type: 'like' | 'favorite') => {
    if (!canInteract) return;
    void cmd.run(() => client.mutate('community', { op: 'reaction.set', id: guide.id, type, active: !guide.viewerReactions?.[type] }));
  };
  return <section className="integration-panel" aria-label="攻略交流">
    <h2>一起讨论</h2><p>{guide.comments.length} 条已公开评论。</p>
    {verified ? <>
    <div className="integration-actions">
      <button type="button" className="paper-button" aria-pressed={ready && guide.viewerReactions?.like === true} disabled={!canInteract} onClick={() => react('like')}>点赞攻略</button>
      <button type="button" className="paper-button" aria-pressed={ready && guide.viewerReactions?.favorite === true} disabled={!canInteract} onClick={() => react('favorite')}>收藏攻略</button>
    </div>
    <form onSubmit={e => {
      e.preventDefault();
      if (!canInteract) return;
      const submitted = comment;
      void cmd.run(async () => {
        await client.mutate('community', { op: 'reply.create', id: guide.id, content: submitted });
        setComment(current => current === submitted ? '' : current);
      });
    }}>
      <div className="paper-label">
        <label htmlFor={commentId}>攻略评论</label>
        <textarea id={commentId} className="paper-input" required maxLength={1000} value={comment} onChange={e => setComment(e.target.value)} />
      </div>
      <button className="paper-button yellow" disabled={!canInteract}>发布攻略评论</button>
    </form>
    {!ready && <PaperState kind="empty" title="请先登录合成账号" />}
    </> : <p className="paper-notice">这篇历史攻略仅供阅读。</p>}
    {cmd.notice && <p role="status">{cmd.notice}</p>}
    <ul>{guide.comments.map(c => <li key={c.id}><strong>{c.userName}</strong><p>{c.content}</p></li>)}</ul>
  </section>;
}
