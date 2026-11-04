"use client";

import { GuildImage } from "./guild-image";

import { useState } from "react";
import { ArrowRight, Heart, ImageIcon, ShieldCheck } from "lucide-react";
import { MemberDetailModal } from "../member-detail-modal";

interface Member {
  id: number;
  name: string;
  image: string;
  role: string;
  description?: string;
}

interface Manager {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

export function GuildManagement({
  members,
  onJoin,
}: {
  members: Manager[];
  onJoin: () => void;
}) {
  return (
    <section id="management" className="management-band">
      <div className="guild-shell guild-section">
        <div className="guild-section-heading">
          <div>
            <span className="guild-badge">
              <ShieldCheck size={13} />
              管理团队
            </span>
            <h2>有人带队，也有人照应</h2>
            <p>认识公会里负责统筹、引导和配合的伙伴。</p>
          </div>
        </div>
        <div className="management-layout">
          <aside className="guild-panel dark-panel management-intro">
            <Heart size={36} />
            <h3>
              认真游戏，
              <br />
              也温柔相待。
            </h3>
            <p>
              把配合写进每一次操作，
              <br />
              把欢笑留在每一次集合。
            </p>
            <ul>
              <li>文明交流，尊重彼此</li>
              <li>支持指挥，接受分工</li>
              <li>分享经验，帮助新人</li>
            </ul>
            <button className="guild-button yellow" onClick={onJoin}>
              加入这个大家庭 <ArrowRight size={17} />
            </button>
          </aside>
          <div className="management-cards">
            {members.map((member) => (
              <article className="guild-panel management-card" key={member.id}>
                <GuildImage
                  src={member.avatar}
                  alt=""
                  width={64}
                  height={64}
                />
                <span className="guild-badge">今夕管理组</span>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function GuildMembers({
  members,
  onAll,
  onShowcase,
}: {
  members: Member[];
  onAll: () => void;
  onShowcase: () => void;
}) {
  const [selected, setSelected] = useState<Member | null>(null);
  return (
    <section id="members" className="guild-shell guild-section">
      <div className="guild-section-heading">
        <div>
          <span className="guild-badge">成员群像</span>
          <h2>并肩作战的人</h2>
          <p>每一个名字，都是今夕故事的一部分。</p>
        </div>
        <button className="guild-button compact" onClick={onAll}>
          查看全部 <ArrowRight size={15} />
        </button>
      </div>
      <div id="members-page" className="guild-member-grid">
        {members.slice(0, 6).map((member) => (
          <button
            className="guild-panel guild-member-card"
            key={member.id}
            onClick={() => setSelected(member)}
            aria-label={`查看 ${member.name} 的详情`}
          >
            <div className="member-cover">
              <GuildImage
                src={member.image}
                alt={member.name}
                loading="lazy"
              />
              <span className="guild-badge">{member.role}</span>
            </div>
            <div className="member-card-content">
              <h3>{member.name}</h3>
              <p>{member.description || "今夕公会的一员"}</p>
              <span>
                认识这位伙伴 <ArrowRight size={15} />
              </span>
            </div>
          </button>
        ))}
      </div>
      <div id="roster" className="showcase-link">
        <div>
          <ImageIcon size={23} />
          <span>换个角度，看看成员精彩展示</span>
        </div>
        <button className="guild-button compact" onClick={onShowcase}>
          打开轮播展示 <ArrowRight size={16} />
        </button>
      </div>
      <MemberDetailModal
        isOpen={selected !== null}
        member={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
