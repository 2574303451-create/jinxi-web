"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../../../components/ui/modal';
import { PaperState } from '../../../components/ui/paper';
import { loadAnnouncementSanitizer, type AnnouncementSanitizer } from '../../../lib/announcement-html';
import { PageControls } from './page-controls';
import { useCommand, useResource, useSession } from './session-context';
type Permissions = { admin: boolean; staff: boolean };
type AnnouncementRecord = {
  id: string;
  title: string;
  contentHtml: string;
  status: 'draft' | 'submitted' | 'published' | 'withdrawn' | 'deleted';
  effectiveStatus: string;
  publishedAt: string | null;
  updatedAt: string;
  expiresAt: string | null;
  version: number;
  legacy: boolean;
  ownerId?: string | null;
  lastEditor?: string | null;
};
type SponsorRecord = {
  id: string;
  sponsor: string;
  time: string;
  sponsorTime: string;
  status: 'visible' | 'hidden' | 'deleted';
  version: number;
  legacy: boolean;
};
const defaultSponsorDate = '2024-03-01T12:00';
const shanghaiInput = (iso: string) => new Date(Date.parse(iso) + 8*60*60*1000).toISOString().slice(0,-1);
export function SafeAnnouncement({ html }: { html: string }) {
  const [safe, setSafe] = useState<string | null>(null);
  useEffect(() => { let live = true; setSafe(null); loadAnnouncementSanitizer().then(sanitize => { if (live) setSafe(sanitize(html)); }).catch(() => {}); return () => { live = false; }; }, [html]);
  return safe === null ? <p>内容过滤尚未就绪。</p> : <div className="announcement-content" dangerouslySetInnerHTML={{ __html: safe }} />;
}
export function AnnouncementDialog({ open, close, permissions }: { open: boolean; close: () => void; permissions: Permissions }) {
  return <Modal isOpen={open} onClose={close} title="公会动态 · 合成发布流程" legacy={false} size="xl"><AnnouncementPanel permissions={permissions} /></Modal>;
}
function AnnouncementPanel({ permissions }: { permissions: Permissions }) {
  const { client, ready, state } = useSession(), cmd = useCommand();
  const contentId = useId();
  const [title, setTitle] = useState(''), [html, setHtml] = useState('');
  const [editing, setEditing] = useState<AnnouncementRecord | null>(null);
  const resetDraft = () => { setTitle(''); setHtml(''); setEditing(null); };
  const advance = (op: 'announcement.submit' | 'announcement.publish' | 'announcement.withdraw', record: AnnouncementRecord) =>
    void cmd.run(() => client.mutate('operations', { op, id: record.id, version: record.version }));
  return <section className="integration-panel" aria-label="公告发布管理">
    <p className="paper-notice">本轮使用合成发布人员与独立审核员，不变动云端公告。本机草稿与已发布内容分别显示。</p>
    <OperationsRecords<AnnouncementRecord> kind="announcement" view="public" label="公告" title="已公开公告" refresh="刷新公告">
      {records => <ul data-testid="public-announcements">{records.map(record => <li key={record.id} className="integration-record" data-item-id={record.id}>
        <h3>{record.title}</h3><SafeAnnouncement html={record.contentHtml} /><p>发布 {record.publishedAt} · 修改 {record.updatedAt}</p>
      </li>)}</ul>}
    </OperationsRecords>
    {ready && permissions.staff && <>
      <h2>{editing ? '修订公告草稿' : '创建公告草稿'}</h2>
      <form aria-label="公告草稿" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
        await client.mutate('operations', { op: editing ? 'announcement.edit' : 'announcement.create', ...(editing ? { id: editing.id, version: editing.version } : {}), title, contentHtml: html, expiresAt: editing?.expiresAt ?? null });
        resetDraft();
      }); }}>
        <label className="paper-label">公告标题<input className="paper-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required disabled={cmd.busy} /></label>
        <div className="paper-label">
          <label htmlFor={contentId}>公告富文本源</label>
          <textarea id={contentId} className="paper-input" rows={6} value={html} onChange={e => setHtml(e.target.value)} maxLength={32768} required disabled={cmd.busy} />
        </div>
        <p>支持安全段落、强调、列表与固定合成图片。服务端过滤后保存，禁止上传。</p>
        <button className="paper-button yellow" disabled={cmd.busy}>保存公告草稿</button>
        {editing && <button type="button" className="paper-button" disabled={cmd.busy} onClick={resetDraft}>取消公告修订</button>}
      </form>
      <OperationsRecords<AnnouncementRecord> kind="announcement" view="private" label="公告" title="公告审核与修订" refresh="刷新管理公告" busy={cmd.busy}>
        {records => <ul data-testid="managed-announcements">{records.map(record => {
          const canManage = permissions.admin || (record.ownerId != null && record.ownerId === state.member?.id);
          return <li key={record.id} className="integration-record" data-item-id={record.id}>
            <h3>{record.title}</h3><p>{record.effectiveStatus} · 版本 {record.version}</p><SafeAnnouncement html={record.contentHtml} />
            {record.legacy ? <p>历史公告 · 仅供查看</p> : <div className="integration-actions">
              {canManage && ['draft','withdrawn'].includes(record.status) && <button className="paper-button" disabled={cmd.busy}
                onClick={() => { setEditing(record); setTitle(record.title); setHtml(record.contentHtml); }}>修订此公告</button>}
              {canManage && record.status === 'draft' && <button className="paper-button" disabled={cmd.busy} onClick={() => advance('announcement.submit', record)}>提交公告审核</button>}
              {record.status === 'submitted' && record.lastEditor !== state.member?.id && <button className="paper-button yellow" disabled={cmd.busy} onClick={() => advance('announcement.publish', record)}>独立审核并发布</button>}
              {canManage && ['submitted','published'].includes(record.status) && <button className="paper-button" disabled={cmd.busy} onClick={() => advance('announcement.withdraw', record)}>撤回公告</button>}
            </div>}
          </li>;
        })}</ul>}
      </OperationsRecords>
    </>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
export function SponsorshipDialog({ open, close, permissions }: { open: boolean; close: () => void; permissions: Permissions }) {
  return <Modal isOpen={open} onClose={close} title="合成感谢记录" legacy={false} size="lg"><SponsorshipPanel permissions={permissions} /></Modal>;
}
function SponsorshipPanel({ permissions }: { permissions: Permissions }) {
  const { client, ready } = useSession(), cmd = useCommand();
  const [name, setName] = useState(''), [date, setDate] = useState(defaultSponsorDate);
  const [editing, setEditing] = useState<SponsorRecord | null>(null);
  return <section className="integration-panel" aria-label="感谢名单管理">
    <p className="paper-notice">只验证虚构感谢记录；没有收款二维码、真实付款或财务结算。</p>
    <SponsorshipRecords />
    {ready && permissions.admin && <>
      <form aria-label="维护感谢记录" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
        const sponsorTime = editing && date === shanghaiInput(editing.sponsorTime) ? editing.sponsorTime : new Date(date + '+08:00').toISOString();
        await client.mutate('operations', { op: editing ? 'sponsor.edit' : 'sponsor.create', ...(editing ? { id: editing.id, version: editing.version } : {}), sponsor: name, sponsorTime }); setName(''); setEditing(null);
      }); }}>
        <label className="paper-label">合成感谢对象<input className="paper-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
        <label className="paper-label">发生时间（上海）<input className="paper-input" type="datetime-local" step="0.001" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <button className="paper-button yellow" disabled={cmd.busy}>{editing ? '保存感谢修订' : '登记合成感谢'}</button>
        {editing && <button type="button" className="paper-button" disabled={cmd.busy} onClick={() => {
          setEditing(null); setName(''); setDate(defaultSponsorDate);
        }}>取消修订</button>}
      </form>
      <SponsorshipRecords management={{
        busy: cmd.busy,
        edit: record => { setEditing(record); setName(record.sponsor); setDate(shanghaiInput(record.sponsorTime)); },
        toggle: record => void cmd.run(() => client.mutate('operations', {
          op: record.status === 'visible' ? 'sponsor.hide' : 'sponsor.show', id: record.id, version: record.version,
        })),
      }} />
    </>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
function SponsorshipRecords({ management }: { management?: {
  busy: boolean;
  edit: (record: SponsorRecord) => void;
  toggle: (record: SponsorRecord) => void;
} }) {
  const title = management ? '感谢记录管理' : '公开感谢记录';
  return <OperationsRecords<SponsorRecord> kind="sponsor" view={management ? 'private' : 'public'} label="感谢记录" title={title}
    refresh={management ? '刷新管理记录' : '刷新感谢记录'} busy={management?.busy}>
    {records => management ? <ul>{records.map(record => <li key={record.id} className="integration-record" data-managed-sponsor-id={record.id}>
      <strong>{record.sponsor}</strong><p>{record.status} · {record.time}</p>
      {record.legacy ? <p>历史记录 · 仅供查看</p> : record.status !== 'deleted' && <div className="integration-actions">
        <button className="paper-button" disabled={management.busy} onClick={() => management.edit(record)}>编辑感谢记录</button>
        <button className="paper-button" disabled={management.busy} onClick={() => management.toggle(record)}>{record.status === 'visible' ? '隐藏感谢记录' : '恢复感谢展示'}</button>
      </div>}
    </li>)}</ul> : <table><thead><tr><th>感谢对象</th><th>登记时间</th></tr></thead><tbody>{records.map(record =>
      <tr key={record.id} data-sponsor-id={record.id}><td>{record.sponsor}</td><td>{record.time}</td></tr>)}</tbody></table>}
  </OperationsRecords>;
}
function OperationsRecords<Record>({ kind, view, title, label, refresh, busy, children }: {
  kind: 'sponsor' | 'announcement'; view: 'public' | 'private'; title: string; label: string; refresh: string;
  busy?: boolean; children: (items: Record[]) => ReactNode;
}) {
  const { client } = useSession();
  const [cursor, setCursor] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    const page = await client.request<{ items: Record[]; nextCursor: string | null }>('operations', null, {
      kind, view, limit: '50', ...(cursor ? { cursor } : {}),
    }, view === 'private');
    return { cursor, page };
  }, [client, cursor, kind, view]);
  const resource = useResource(load);
  const page = resource.data?.cursor === cursor ? resource.data?.page : null;
  const loading = resource.loading || (!page && !resource.error);
  const changed = resource.error === 'PAGE_CHANGED';
  return <section aria-label={title}>
    <h2 ref={heading} tabIndex={-1}>{title}</h2>
    <button className="paper-button" onClick={resource.reload} disabled={loading || changed}>{refresh}</button>
    {loading && <PaperState kind="loading" title={`读取${label}…`} />}
    {resource.error && <PaperState kind="error" title={changed ? `${label}已更新，请返回第一页。` : `暂时无法读取${label}，请刷新。`} />}
    {page && !loading && (page.items.length ? children(page.items) : <PaperState kind="empty" title={`暂无${label}`} />)}
    <PageControls label={`${title}分页`} olderLabel="查看更早记录" atStart={!cursor} next={page?.nextCursor}
      loading={loading || Boolean(busy)} heading={heading} onChange={setCursor} />
  </section>;
}
export function TeamPanel() {
  const { client, ready } = useSession(), cmd = useCommand();
  const [name, setName] = useState(''), [slogan, setSlogan] = useState(''), [capacity, setCapacity] = useState(2);
  const load = useCallback(async () => {
    const published = await client.request('operations', null, { kind: 'team', view: 'public', limit: '50' }, false);
    const mine = ready ? await client.request('operations', null, { kind: 'team', view: 'private', limit: '50' }) : { items: [] };
    return { published: published.items, mine: mine.items[0] || null };
  }, [client, ready]);
  const resource = useResource(load), mine = resource.data?.mine;
  useEffect(() => { setName(mine?.name || ''); setSlogan(mine?.slogan || ''); setCapacity(mine?.maxMembers ?? 2); }, [mine?.id, mine?.version]);
  return <section className="integration-panel" aria-label="统一组队">
    <h2>寻找队伍</h2><p>容量包括队长；每个可信成员同时最多一队。没有伪造战绩、在线人数或战队积分。</p>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新队伍</button>
    {resource.error && <p role="alert">{resource.error}</p>}
    {mine && <article className="integration-record" data-testid="own-team"><h3>本人队伍：{mine.name}</h3><p>{mine.myRole} · {mine.memberCount}/{mine.maxMembers}</p>{mine.myRole === 'member' && <button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: 'team.leave', id: mine.id }))}>退出本人队伍</button>}</article>}
    {ready && !resource.loading && (!mine || mine.myRole === 'leader') && <form aria-label="本人队伍管理" onSubmit={e => { e.preventDefault(); void cmd.run(() => client.mutate('operations', { op: mine ? 'team.edit' : 'team.create', ...(mine ? { id: mine.id, version: mine.version } : {}), name, slogan, maxMembers: capacity, description: mine?.description ?? '', requirements: mine?.requirements ?? '', icon: mine?.icon ?? '⭐', color: mine?.color ?? '#2360f5' })); }}>
      <label className="paper-label">队伍名称<input className="paper-input" value={name} onChange={e => setName(e.target.value)} maxLength={60} required /></label>
      <label className="paper-label">队伍说明<input className="paper-input" value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={160} /></label>
      <label className="paper-label">人数上限<input className="paper-input" type="number" min={1} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} required /></label>
      <button className="paper-button yellow" disabled={cmd.busy || resource.loading}>{mine ? '保存本人队伍' : '创建合成队伍'}</button>
    </form>}
    <ul data-testid="team-list">{resource.data?.published.map((r: any) => <li className="integration-record" key={r.id} data-team-id={r.id}><h3>{r.icon} {r.name}</h3><p>{r.slogan} · {r.memberCount}/{r.maxMembers}</p>{ready && !mine && <button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: 'team.join', id: r.id, message: '' }))}>加入此合成队伍</button>}</li>)}</ul>
    {!ready && <PaperState kind="empty" title="登录合成账号后才能加入或管理队伍" />}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
