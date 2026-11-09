"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSession } from '../../session.cjs';
import { SiteRuntimeContext, type SiteRuntime, type MessageActions } from '../../../components/site-runtime';
import type { Message } from '../../../types/message-wall';
import type { Strategy, StrategySubmission } from '../../../types/strategy-wall';
import type { HomeGuideFeed, HomeGuide } from '../../../services/home-guides';
import { Modal } from '../../../components/ui/modal';
import { SessionContext, useSession, useResource } from './session-context';
import type { SessionClient } from './model';
import { AuthDialog } from './auth-dialog';
import { CommunityManagement, GuideDiscussion } from './community-panel';
import { AttendancePanel } from './attendance-panel';
import { PointsPanel } from './points-panel';
import { AnnouncementDialog, SponsorshipDialog, TeamPanel } from './operations-panel';
const epoch = () => typeof document === 'undefined' ? '' : document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('__Host-jinxi_points_epoch=')) || '';
const message = (r: any): Message => ({ ...r, timestamp: new Date(r.timestamp), replies: (r.replies || []).map((x: any) => ({ ...x, timestamp: new Date(x.timestamp) })), reactions: r.reactions || [] });

export function IntegrationProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createSession({ fetcher: (...args: Parameters<typeof fetch>) => fetch(...args), epoch, randomId: () => crypto.randomUUID(), notify: () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('integration:data')); } }) as SessionClient);
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel('jinxi-local-integration'); channel.onmessage = () => { client.observeEpoch(); window.dispatchEvent(new Event('integration:remote-data')); }; } catch { /* Epoch polling also covers tabs without BroadcastChannel. */ }
    const announce = () => channel?.postMessage({ changed: true });
    const verify = () => { client.observeEpoch(); void client.restore().then(() => window.dispatchEvent(new Event('integration:capabilities'))); };
    const visibility = () => { if (document.visibilityState === 'visible') verify(); };
    const unverify = () => client.unverify();
    void client.restore();
    const markerTimer = setInterval(() => client.observeEpoch(), 500), serverTimer = setInterval(() => { if (document.visibilityState === 'visible') verify(); }, 10000);
    window.addEventListener('integration:data', announce); window.addEventListener('online', verify); window.addEventListener('offline', unverify); window.addEventListener('focus', verify); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(markerTimer); clearInterval(serverTimer); channel?.close(); window.removeEventListener('integration:data', announce); window.removeEventListener('online', verify); window.removeEventListener('offline', unverify); window.removeEventListener('focus', verify); document.removeEventListener('visibilitychange', visibility); };
  }, [client]);
  return <SessionContext.Provider value={client}><ConnectedSite>{children}</ConnectedSite></SessionContext.Provider>;
}
function ConnectedSite({ children }: { children: ReactNode }) {
  const { client, state, ready } = useSession();
  const [auth, setAuth] = useState<'login' | 'password' | null>(null), [announcements, setAnnouncements] = useState(false), [sponsorship, setSponsorship] = useState(false), [joinNotice, setJoinNotice] = useState(false), [profile, setProfile] = useState(false), [panel, setPanel] = useState<'checkin' | 'points' | 'teams' | null>(null), [dataVersion, setDataVersion] = useState(0);
  const permissionsLoad = useCallback(() => ready ? client.request('operations', null, { kind: 'team', view: 'private' }).then(r => r.permissions as { admin: boolean; staff: boolean }) : Promise.resolve({ admin: false, staff: false }), [client, ready]);
  const privileges = useResource(permissionsLoad), permissions = privileges.data || { admin: false, staff: false };
  useEffect(() => { window.addEventListener('integration:capabilities', privileges.reload); return () => window.removeEventListener('integration:capabilities', privileges.reload); }, [privileges.reload]);
  useEffect(() => { const update = () => setDataVersion(n => n + 1); window.addEventListener('integration:data', update); window.addEventListener('integration:remote-data', update); return () => { window.removeEventListener('integration:data', update); window.removeEventListener('integration:remote-data', update); }; }, []);
  const messageActions = useMemo<MessageActions>(() => ({
    addMessage: async input => message((await client.mutate('community', { op: 'message.create', content: input.content, category: input.category, color: input.color })).item),
    addReply: async (id, input) => { const r = await client.mutate('community', { op: 'reply.create', id, content: input.content }); return message(r.item).replies.find(x => x.id === r.replyId)!; },
    // Explicit set, rather than a browser-derived count or identity. Repeated responses stay idempotent.
    toggleReaction: async (id, type) => (await client.mutate('community', { op: 'reaction.set', id, type, active: true })).item.reactions,
    togglePin: async () => { throw Error('USE_SERVER_AUTHORIZED_MANAGEMENT'); },
    deleteMessage: async () => { throw Error('USE_SERVER_AUTHORIZED_MANAGEMENT'); },
  }), [client]);
  const readGuide = useCallback(async (id: string, signal?: AbortSignal): Promise<Strategy> => {
    const r = await client.request('community', null, { kind: 'guide', scope: 'public' }, false);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const guide = r.items.find((x: any) => x.id === id);
    if (!guide) throw Error('这篇攻略尚未公开。');
    return { ...guide, createdAt: new Date(guide.createdAt), updatedAt: new Date(guide.updatedAt), comments: guide.comments.map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) })), likes: [], favorites: [] };
  }, [client]);
  const readHomeGuides = useCallback(async (feed: HomeGuideFeed): Promise<HomeGuide[]> => {
    const r = await client.request('community', null, { kind: 'guide', scope: 'public' }, false);
    return r.items.filter((g: any) => feed === 'latest' || feed === 'pinned' && g.isPinned || feed === 'video' && g.mediaFiles.some((m: any) => m.type === 'video')).slice(0,3).map((g: any) => ({ id: g.id, title: g.title, excerpt: g.content.slice(0,150), author: g.author, category: g.category, image: g.imageUrl || null, hasVideo: g.mediaFiles.some((m: any) => m.type === 'video'), isPinned: g.isPinned, views: g.viewCount, comments: g.comments.length, updatedAt: g.updatedAt, tags: g.tags }));
  }, [client]);
  const saveGuide = useCallback(async (draft: StrategySubmission) => {
    await client.mutate('community', { op: 'guide.create', title: draft.title, content: draft.content, category: draft.category, difficulty: draft.difficulty, tags: draft.tags.filter(Boolean), mediaFiles: draft.mediaFiles || [] });
  }, [client]);
  const runtime: SiteRuntime = {
    accountLabel: state.member?.id || '', displayName: state.member?.displayName || '', canWrite: ready, dataVersion,
    onLogin: () => setAuth('login'), onPassword: () => setAuth('password'), onLogout: () => { void client.authenticate('logout').catch(() => {}); }, onAnnouncement: () => setAnnouncements(true),
    onJoin: () => setJoinNotice(true), onProfile: () => setProfile(true),
    banner: null, dialogs: null, announcement: null, sponsorship: null,
    panels: { checkin: <AttendancePanel />, points: <PointsPanel />, teams: <TeamPanel />, tasks: <p className="paper-notice">游戏任务缺少可信来源及奖励规则。本轮不连接积分、不伪造任务成功。</p>, game: <p className="paper-notice">真实战绩与在线来源尚未核验，本轮不导入浏览器示例记录。</p> },
    messageActions, messageManagement: <CommunityManagement kind="message" staff={permissions.staff} />, readGuide, readHomeGuides, saveGuide,
    guideManagement: <CommunityManagement kind="guide" staff={permissions.staff} />, guideDiscussion: guide => <GuideDiscussion guide={guide} />,
  };
  return <SiteRuntimeContext.Provider value={runtime}>
    <aside className="integration-bar" aria-label="本地统一集成状态">
      <strong>本地合成集成预览 · 复用今夕网站</strong><p>与生产和云端 TEST 隔离；未接入真实成员、历史积分或支付。</p>
      <p role="status" data-testid="unified-session">{state.member?.displayName || '未核验成员'} · {state.phase} · {state.message}</p>
      <p data-testid="unified-permissions">{!ready ? '未授予业务权限' : privileges.loading ? '核验权限中…' : permissions.admin ? '合成管理员' : permissions.staff ? '合成审核员' : '合成成员'}</p>
      <div className="integration-actions">
        <button className="paper-button" onClick={() => setAuth('login')}>合成登录</button>
        <button className="paper-button" onClick={() => setAuth('password')} disabled={!state.member}>合成改密</button>
        <button className="paper-button" onClick={runtime.onLogout} disabled={!state.member}>退出统一会话</button>
        <button className="paper-button" onClick={() => void client.restore()}>重新核验身份</button>
        <button className="paper-button" onClick={() => setAnnouncements(true)}>公告发布与审核</button>
        <button className="paper-button" onClick={() => setSponsorship(true)}>合成感谢记录</button>
        {(['checkin','points','teams'] as const).map((k,i) => <button className="paper-button" key={k} onClick={() => setPanel(k)}>{['签到事实','账户与兑换','可信组队'][i]}</button>)}
      </div>
    </aside>
    <div key={`${state.revision}-${permissions.admin}-${permissions.staff}`} data-session-revision={state.revision}>{children}</div>
    <AuthDialog key={(auth || 'closed') + (state.member?.id || 'anonymous') + epoch()} mode={auth} close={() => setAuth(null)} />
    <div key={`private-${state.revision}-${permissions.admin}-${permissions.staff}`}>
      <AnnouncementDialog open={announcements} close={() => setAnnouncements(false)} permissions={permissions} />
      <SponsorshipDialog open={sponsorship} close={() => setSponsorship(false)} permissions={permissions} />
      <Modal isOpen={profile} onClose={() => setProfile(false)} title="本人合成资料" legacy={false} size="md"><ProfilePanel /></Modal>
      <Modal isOpen={panel !== null} onClose={() => setPanel(null)} title={panel ? { checkin: '每日签到', points: '积分与兑换', teams: '寻找队伍' }[panel] : ''} legacy={false} size="xl">{panel && runtime.panels[panel]}</Modal>
    </div>
    <Modal isOpen={joinNotice} onClose={() => setJoinNotice(false)} title="入会申请未接入" legacy={false} size="md"><p className="paper-notice">本地合成预览不发送真实申请、邮件或其他外部消息。本轮仅验证已授权的五组业务。</p></Modal>
  </SiteRuntimeContext.Provider>;
}
function ProfilePanel() {
  const { client, ready } = useSession();
  const load = useCallback(() => ready ? client.request('member', null, { op: 'profile' }) : Promise.resolve(null), [client, ready]);
  const resource = useResource(load);
  if (!ready) return <p>请先登录并完成首次改密。</p>;
  return <section className="integration-panel">{resource.error ? <p role="alert">{resource.error}</p> : resource.data ? <dl><dt>展示名</dt><dd>{resource.data.profile.displayName}</dd><dt>昵称</dt><dd>{resource.data.profile.nickname}</dd><dt>合成入会日期</dt><dd>{resource.data.profile.joinedOn}</dd></dl> : <p role="status">正在读取本人资料…</p>}</section>;
}
