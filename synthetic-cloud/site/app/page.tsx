'use client';

import { useState } from 'react';
import { ArrowRight, CalendarCheck, Trophy, Users } from 'lucide-react';
import { GuildNavigation } from '../../../components/home/guild-navigation';
import { CommunityUpdates } from '../../../components/home/community-updates';
import { MessageShowcase } from '../../../components/home/message-showcase';
import { FeaturedGuides } from '../../../components/home/featured-guides';
import { MessageWall } from '../../../components/message-wall';
import { Modal } from '../../../components/ui/modal';
import { ToastProvider } from '../../../components/ui/toast';
import { useSiteRuntime } from '../../../components/site-runtime';

const actions = [
  { id: 'checkin', title: '每日签到', description: '记录今天的签到，查看连续签到和历史记录。', icon: CalendarCheck },
  { id: 'points', title: '积分与兑换', description: '结算签到积分、兑换物品并查看订单。', icon: Trophy },
  { id: 'teams', title: '寻找队伍', description: '查看队伍、入队要求和我的组队状态。', icon: Users },
] as const;
type Panel = typeof actions[number]['id'] | 'messages';

export default function SyntheticHome() {
  const runtime = useSiteRuntime();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  if (!runtime) return null;
  const openMessages = (id?: string) => { setMessageId(id || null); setPanel('messages'); };
  const title = panel === 'messages' ? '留下你的声音' : actions.find(action => action.id === panel)?.title || '';

  return <ToastProvider><div className="jinxi-site synthetic-home" id="top">
    <a href="#actions" className="skip-link">跳到会员服务</a>
    <GuildNavigation testSite account={runtime.accountLabel} nickname={runtime.displayName} onLogin={runtime.onLogin}
      onLogout={runtime.onLogout} onPassword={runtime.onPassword} onAnnouncement={runtime.onAnnouncement}
      onJoin={runtime.onJoin} onProfile={runtime.onProfile} />
    <main>
      <section className="guild-shell synthetic-welcome" aria-labelledby="welcome-title">
        <h1 id="welcome-title">今夕公会测试站</h1>
        <p>使用测试账号体验签到、积分和兑换。这里的账号和业务记录均为虚构数据。</p>
        {runtime.accountLabel ? <p className="synthetic-member">当前会员 <strong>{runtime.displayName || '测试会员'}</strong></p> :
          <button type="button" className="guild-button yellow" onClick={runtime.onLogin}>登录测试账号 <ArrowRight size={18} aria-hidden="true" /></button>}
      </section>
      <section id="actions" tabIndex={-1} className="guild-shell synthetic-services" aria-labelledby="services-title">
        <h2 id="services-title">会员服务</h2>
        <div className="synthetic-service-grid">
          {actions.map(({ id, title, description, icon: Icon }) => (
            <button key={id} type="button" className="synthetic-service" onClick={() => setPanel(id)}>
              <Icon size={23} aria-hidden="true" />
              <span><strong>{title}</strong><span>{description}</span></span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section id="community" className="guild-shell guild-section">
        <CommunityUpdates onAnnouncement={runtime.onAnnouncement} onMessages={openMessages} />
        <MessageShowcase onOpen={openMessages} />
      </section>
      <FeaturedGuides />
    </main>
    <Modal isOpen={panel !== null} onClose={() => setPanel(null)}
      title={title} size="2xl" legacy={false}>
      {panel === 'messages' ? <MessageWall writesPaused={!runtime.canWrite} loggedInAccount={runtime.accountLabel}
        loggedInNickname={runtime.displayName} initialMessageId={messageId} actions={runtime.messageActions}
        management={runtime.messageManagement} /> : panel ? runtime.panels[panel] : null}
    </Modal>
  </div></ToastProvider>;
}
