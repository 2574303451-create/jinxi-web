"use client";
import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/modal';
import { PaperState } from '../../../components/ui/paper';
import { loadAnnouncementSanitizer, type AnnouncementSanitizer } from '../../../lib/announcement-html';
import { useCommand, useResource, useSession } from './session-context';
type Permissions = { admin: boolean; staff: boolean };
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
  const [title, setTitle] = useState(''), [html, setHtml] = useState(''), [editing, setEditing] = useState<any>(null);
  const load = useCallback(async () => {
    const published = await client.request('operations', null, { kind: 'announcement', view: 'public', limit: '50' }, false);
    const managed = ready && permissions.staff ? await client.request('operations', null, { kind: 'announcement', view: 'private', limit: '50' }) : { items: [] };
    return { published: published.items, managed: managed.items };
  }, [client, ready, permissions.staff]);
  const resource = useResource(load);
  return <section className="integration-panel" aria-label="公告发布管理">
    <p className="paper-notice">本轮使用合成发布人员与独立审核员，不变动云端公告。本机草稿与已发布内容分别显示。</p>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新公告</button>
    {resource.error && <p role="alert">{resource.error}</p>}
    <h2>已公开公告</h2><ul data-testid="public-announcements">{resource.data?.published.map((r: any) => <li key={r.id} className="integration-record" data-item-id={r.id}><h3>{r.title}</h3><SafeAnnouncement html={r.contentHtml} /><p>发布 {r.publishedAt} · 修改 {r.updatedAt}</p></li>)}</ul>
    {ready && permissions.staff && <>
      <h2>{editing ? '修订公告草稿' : '创建公告草稿'}</h2>
      <form aria-label="公告草稿" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
        await client.mutate('operations', { op: editing ? 'announcement.edit' : 'announcement.create', ...(editing ? { id: editing.id, version: editing.version } : {}), title, contentHtml: html, expiresAt: editing?.expiresAt ?? null }); setTitle(''); setHtml(''); setEditing(null);
      }); }}>
        <label className="paper-label">公告标题<input className="paper-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required /></label>
        <label className="paper-label">公告富文本源<textarea className="paper-input" rows={6} value={html} onChange={e => setHtml(e.target.value)} maxLength={32768} required /></label>
        <p>支持安全段落、强调、列表与固定合成图片。服务端过滤后保存，禁止上传。</p>
        <button className="paper-button yellow" disabled={cmd.busy || resource.loading}>保存公告草稿</button>
      </form>
      <h2>公告审核与修订</h2><ul data-testid="managed-announcements">{resource.data?.managed.map((r: any) => <li key={r.id} className="integration-record" data-item-id={r.id}>
        <h3>{r.title}</h3><p>{r.effectiveStatus} · 版本 {r.version}</p><SafeAnnouncement html={r.contentHtml} />
        <div className="integration-actions">
          {['draft','withdrawn'].includes(r.status) && (r.ownerId === state.member?.id || permissions.admin) && <button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => { setEditing(r); setTitle(r.title); setHtml(r.contentHtml); }}>修订此公告</button>}
          {r.status === 'draft' && (r.ownerId === state.member?.id || permissions.admin) && <button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: 'announcement.submit', id: r.id, version: r.version }))}>提交公告审核</button>}
          {r.status === 'submitted' && r.lastEditor !== state.member?.id && <button className="paper-button yellow" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: 'announcement.publish', id: r.id, version: r.version }))}>独立审核并发布</button>}
          {['submitted','published'].includes(r.status) && (r.ownerId === state.member?.id || permissions.admin) && <button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: 'announcement.withdraw', id: r.id, version: r.version }))}>撤回公告</button>}
        </div>
      </li>)}</ul>
    </>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
export function SponsorshipDialog({ open, close, permissions }: { open: boolean; close: () => void; permissions: Permissions }) {
  return <Modal isOpen={open} onClose={close} title="合成感谢记录" legacy={false} size="lg"><SponsorshipPanel permissions={permissions} /></Modal>;
}
function SponsorshipPanel({ permissions }: { permissions: Permissions }) {
  const { client, ready } = useSession(), cmd = useCommand();
  const [name, setName] = useState(''), [date, setDate] = useState('2024-03-01T12:00'), [editing, setEditing] = useState<any>(null);
  const load = useCallback(async () => {
    const published = await client.request('operations', null, { kind: 'sponsor', view: 'public', limit: '50' }, false);
    const managed = ready && permissions.admin ? await client.request('operations', null, { kind: 'sponsor', view: 'private', limit: '50' }) : { items: [] };
    return { published: published.items, managed: managed.items };
  }, [client, ready, permissions.admin]);
  const resource = useResource(load);
  return <section className="integration-panel" aria-label="感谢名单管理">
    <p className="paper-notice">只验证虚构感谢记录；没有收款二维码、真实付款或财务结算。</p>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新感谢记录</button>
    {resource.error && <p role="alert">{resource.error}</p>}
    <table><thead><tr><th>感谢对象</th><th>登记时间</th></tr></thead><tbody>{resource.data?.published.map((r: any) => <tr key={r.id} data-sponsor-id={r.id}><td>{r.sponsor}</td><td>{r.time}</td></tr>)}</tbody></table>
    {ready && permissions.admin && <>
      <form aria-label="维护感谢记录" onSubmit={e => { e.preventDefault(); void cmd.run(async () => {
        const sponsorTime = editing && date === shanghaiInput(editing.sponsorTime) ? editing.sponsorTime : new Date(date + '+08:00').toISOString();
        await client.mutate('operations', { op: editing ? 'sponsor.edit' : 'sponsor.create', ...(editing ? { id: editing.id, version: editing.version } : {}), sponsor: name, sponsorTime }); setName(''); setEditing(null);
      }); }}>
        <label className="paper-label">合成感谢对象<input className="paper-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
        <label className="paper-label">发生时间（上海）<input className="paper-input" type="datetime-local" step="0.001" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <button className="paper-button yellow" disabled={cmd.busy || resource.loading}>{editing ? '保存感谢修订' : '登记合成感谢'}</button>
      </form>
      <ul>{resource.data?.managed.map((r: any) => <li key={r.id} className="integration-record"><strong>{r.sponsor}</strong><p>{r.status} · {r.time}</p><div className="integration-actions">
        {r.status !== 'deleted' && <><button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => { setEditing(r); setName(r.sponsor); setDate(shanghaiInput(r.sponsorTime)); }}>编辑感谢记录</button><button className="paper-button" disabled={cmd.busy || resource.loading} onClick={() => void cmd.run(() => client.mutate('operations', { op: r.status === 'visible' ? 'sponsor.hide' : 'sponsor.show', id: r.id, version: r.version }))}>{r.status === 'visible' ? '隐藏感谢记录' : '恢复感谢展示'}</button></>}
      </div></li>)}</ul>
    </>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
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
