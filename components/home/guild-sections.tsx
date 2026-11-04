"use client";

import {
  ArrowRight,
  CalendarCheck,
  Check,
  Gamepad2,
  Gift,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type MemberAction =
  | "checkin"
  | "tasks"
  | "points"
  | "teams"
  | "game"
  | "messages"
  | "members"
  | "showcase";

export function SectionHeading({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="guild-section-heading">
      <div>
        <span className="guild-badge">{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function GuildIntroduction({
  onAnnouncement,
}: {
  onAnnouncement: () => void;
}) {
  return (
    <section id="about" className="guild-shell guild-section">
      <div className="guild-feature dark-panel">
        <div>
          <span className="feature-label">
            <Sparkles size={16} />
            认识今夕
          </span>
          <h2>
            以战会友，
            <br className="mobile-only" />
            彼此成就。
          </h2>
          <p>
            认真配合每一局，也珍惜每一次相遇。
            <br />
            我们期待默契的队友，更欢迎温柔有趣的你。
          </p>
        </div>
        <div className="feature-actions">
          <a className="guild-button yellow" href="#members">
            认识公会伙伴 <ArrowRight size={18} />
          </a>
          <a className="feature-link" href="#faq">
            入会要求与常见问题
          </a>
        </div>
      </div>
      <div className="guild-entry-list">
        <a className="guild-entry guild-panel" href="#management">
          <span>
            <small>配合 · 信任</small>
            <b>管理团队，认识带队的伙伴</b>
            <p>公会统筹、新人引导、战术配合与活动交流。</p>
          </span>
          <ArrowRight size={21} />
        </a>
        <a className="guild-entry guild-panel yellow" href="#members">
          <span>
            <small>每个名字 · 一段故事</small>
            <b>并肩作战的人，都在这里</b>
            <p>看看游戏角色，也看看今夕成员的自我介绍。</p>
          </span>
          <ArrowRight size={21} />
        </a>
        <button
          className="guild-entry guild-panel blue-soft"
          onClick={onAnnouncement}
        >
          <span>
            <small>集合通知</small>
            <b>这一周怎么玩？先看公会公告</b>
            <p>历史活跃时段尚待确认，具体活动请以实际公告为准。</p>
          </span>
          <ArrowRight size={21} />
        </button>
      </div>
    </section>
  );
}

const memberActions = [
  {
    id: "checkin",
    action: "checkin",
    icon: CalendarCheck,
    title: "每日签到",
    description: "登录账号，记录今天的相聚。",
    label: "去签到",
  },
  {
    id: "daily-tasks",
    action: "tasks",
    icon: Check,
    title: "每日任务",
    description: "查看个人任务与完成进度。",
    label: "查看任务",
  },
  {
    id: "points",
    action: "points",
    icon: Trophy,
    title: "积分与排行",
    description: "活动积分与签到榜单，在这里查看。",
    label: "查看排行",
  },
  {
    id: "team-system",
    action: "teams",
    icon: Users,
    title: "寻找队伍",
    description: "打开当前浏览器的本地组队面板。",
    label: "打开组队",
  },
  {
    id: "game-data",
    action: "game",
    icon: Gamepad2,
    title: "游戏数据",
    description: "查看浏览器本地游戏记录。",
    label: "打开面板",
  },
] as const;

export function MemberActions({
  onOpen,
  account,
}: {
  onOpen: (action: MemberAction) => void;
  account: string;
}) {
  return (
    <section id="actions" className="guild-shell guild-section">
      <SectionHeading
        label="成员行动"
        title="下一场集结，从这里开始"
        description={
          account
            ? "欢迎回来，选一件今天想做的事。"
            : "登录后查看你的个人任务与积分，也可以先逛逛公会。"
        }
      />
      <div className="member-actions">
        {memberActions.map((item) => (
          <article
            id={item.id}
            key={item.id}
            className="guild-panel action-card"
          >
            <item.icon size={30} strokeWidth={1.8} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <button className="text-action" onClick={() => onOpen(item.action)}>
              {item.label}
              <ArrowRight size={17} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function JoinBanner({ onJoin }: { onJoin: () => void }) {
  return (
    <section id="join" className="guild-shell guild-section">
      <div className="guild-panel join-banner">
        <Gift size={36} />
        <span className="guild-badge">JOIN JINXI</span>
        <h2>下一局，留个位置给你。</h2>
        <p>文明游戏、认真配合，一起把日常玩出高光。</p>
        <button className="guild-button dark" onClick={onJoin}>
          <MessageCircle size={18} />
          加入今夕 <ArrowRight size={18} />
        </button>
        <div className="join-contacts">
          QQ群 <b>713162467</b>
          <span>
            联系人 <b>执手</b>
          </span>
        </div>
      </div>
    </section>
  );
}
