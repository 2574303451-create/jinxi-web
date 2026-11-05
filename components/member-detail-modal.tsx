"use client";

import { Modal } from "./ui/modal";
import { ContentImage } from "./ui/content-image";

export interface GuildMember {
  id: number;
  name: string;
  image: string;
  role?: string;
  description?: string;
}

export function MemberDetailModal({
  isOpen,
  onClose,
  member,
}: {
  isOpen: boolean;
  onClose: () => void;
  member: GuildMember | null;
}) {
  if (!member) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.name}
      size="xl"
      legacy={false}
    >
      <article className="member-profile">
        <div className="member-profile-image">
          <ContentImage
            src={member.image}
            alt={`${member.name}的成员展示图`}
            fallback="brand"
            loading="eager"
          />
        </div>
        <div className="member-profile-copy">
          <span className="paper-eyebrow">今夕公会 / 成员档案</span>
          <h3>{member.name}</h3>
          {member.role && (
            <span className="paper-tag yellow">{member.role}</span>
          )}
          <div className="member-profile-description">
            <span className="paper-eyebrow">关于这位伙伴</span>
            <p>{member.description || "这位伙伴暂时还没有留下个人介绍。"}</p>
          </div>
          <p className="paper-muted">每一个名字，都是今夕故事的一部分。</p>
          <button className="paper-button" onClick={onClose}>
            返回成员展示 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </article>
    </Modal>
  );
}
