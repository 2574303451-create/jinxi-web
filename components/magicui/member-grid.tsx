"use client";

import { useMemo, useState } from "react";
import { MemberDetailModal, type GuildMember } from "../member-detail-modal";
import { ContentImage } from "../ui/content-image";
import { PaperState } from "../ui/paper";

export function MemberGrid({
  members,
  className = "",
}: {
  members: GuildMember[];
  className?: string;
}) {
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(12);
  const [selected, setSelected] = useState<GuildMember | null>(null);
  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((m) => m.role)
            .filter((role): role is string => Boolean(role)),
        ),
      ),
    [members],
  );
  const filtered =
    filter === "all" ? members : members.filter((m) => m.role === filter);
  return (
    <section className={`member-directory ${className}`} aria-label="成员列表">
      <header className="paper-section-head">
        <div>
          <span className="paper-eyebrow">认识今夕</span>
          <h3>并肩作战的人</h3>
          <p>按角色认识伙伴，点击卡片查看完整介绍。</p>
        </div>
        <span className="paper-tag">成员展示</span>
      </header>
      <div className="paper-filters" role="group" aria-label="按成员角色筛选">
        {["all", ...roles].map((role) => (
          <button
            key={role}
            className="paper-filter"
            aria-pressed={filter === role}
            onClick={() => {
              setFilter(role);
              setVisibleCount(12);
            }}
          >
            {role === "all" ? "全部" : role}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <PaperState kind="empty" title="暂无可展示的成员">
          有新的成员档案时，会出现在这里。
        </PaperState>
      ) : (
        <>
          <div className="member-directory-grid">
            {filtered.slice(0, visibleCount).map((member) => (
              <button
                key={member.id}
                className="member-directory-card"
                onClick={() => setSelected(member)}
                aria-label={`查看 ${member.name} 的详情`}
              >
                <ContentImage
                  src={member.image}
                  alt={`${member.name}的成员展示图`}
                  fallback="brand"
                />
                <span className="member-card-copy">
                  <span className="paper-tag">{member.role || "成员"}</span>
                  <strong>{member.name}</strong>
                  <span className="member-card-description">
                    {member.description || "还没有留下个人介绍。"}
                  </span>
                  <span className="member-card-link">
                    查看成员详情 <span aria-hidden="true">↗</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="member-directory-footer">
            <p className="paper-muted" role="status">
              已展示 {Math.min(visibleCount, filtered.length)} /{" "}
              {filtered.length} 份成员档案
            </p>
            {visibleCount < filtered.length && (
              <button
                className="paper-button yellow"
                onClick={() => setVisibleCount((count) => count + 12)}
              >
                加载更多成员 <span aria-hidden="true">＋</span>
              </button>
            )}
          </div>
        </>
      )}
      <MemberDetailModal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        member={selected}
      />
    </section>
  );
}
