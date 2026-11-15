'use client';

import { useState } from 'react';
import { GuildNavigation } from '../../../components/home/guild-navigation';
import { CommunityUpdates } from '../../../components/home/community-updates';
import { MemberActions, SectionHeading, type MemberAction } from '../../../components/home/guild-sections';
import { MessageShowcase } from '../../../components/home/message-showcase';
import { FeaturedGuides } from '../../../components/home/featured-guides';
import { MessageWall } from '../../../components/message-wall';
import { Modal } from '../../../components/ui/modal';
import { ToastProvider } from '../../../components/ui/toast';
import { useSiteRuntime } from '../../../components/site-runtime';

const titles: Partial<Record<MemberAction, string>> = {
  messages: '留下你的声音', checkin: '每日签到', points: '积分与排行', teams: '寻找队伍',
  tasks: '每日任务', game: '游戏数据',
};

export default function SyntheticHome() {
  const runtime = useSiteRuntime();
  const [panel, setPanel] = useState<MemberAction | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  if (!runtime) return null;
  const openMessages = (id?: string) => { setMessageId(id || null); setPanel('messages'); };

  return <ToastProvider><div className="jinxi-site" id="top">
    <GuildNavigation account={runtime.accountLabel} nickname={runtime.displayName} onLogin={runtime.onLogin}
      onLogout={runtime.onLogout} onPassword={runtime.onPassword} onAnnouncement={runtime.onAnnouncement}
      onJoin={runtime.onJoin} onProfile={runtime.onProfile} />
    <main id="about">
      <section id="members" className="guild-shell guild-section">
        <SectionHeading label="今夕公会" title="独立合成 TEST" description="此处的账号、内容、积分和兑换记录均为合成测试数据。" />
      </section>
      <MemberActions account={runtime.accountLabel} onOpen={setPanel} />
      <section id="community" className="guild-shell guild-section">
        <CommunityUpdates onAnnouncement={runtime.onAnnouncement} onMessages={openMessages} />
        <MessageShowcase onOpen={openMessages} />
      </section>
      <FeaturedGuides />
    </main>
    <Modal isOpen={panel !== null && !!titles[panel]} onClose={() => setPanel(null)}
      title={panel ? titles[panel] || '' : ''} size="2xl" legacy={false}>
      {panel === 'messages' ? <MessageWall writesPaused={!runtime.canWrite} loggedInAccount={runtime.accountLabel}
        loggedInNickname={runtime.displayName} initialMessageId={messageId} actions={runtime.messageActions}
        management={runtime.messageManagement} /> : panel ? runtime.panels[panel] : null}
    </Modal>
  </div></ToastProvider>;
}
