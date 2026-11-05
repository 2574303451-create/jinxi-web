"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { MemberDetailModal, type GuildMember } from "../member-detail-modal";
import { ContentImage } from "../ui/content-image";
import { PaperState } from "../ui/paper";

// Retain the public export used by existing callers; the stage is now a paper gallery.
export function Carousel3D({
  members,
  className = "",
}: {
  members: GuildMember[];
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false),
    [selected, setSelected] = useState<GuildMember | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = members.length,
    active = total ? index % total : 0;
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const running =
    playing &&
    !reduced &&
    !hovered &&
    !focused &&
    !selected &&
    !hidden &&
    total > 1;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % total),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [running, total]);
  function move(delta: number) {
    if (total < 2) return;
    setPlaying(false);
    setIndex((i) => (i + delta + total) % total);
  }
  const member = members[active];
  if (!member)
    return (
      <PaperState kind="empty" title="暂无成员展示">
        成员素材准备好后，会在这里展示。
      </PaperState>
    );
  return (
    <section
      className={`member-carousel ${className}`}
      role="region"
      aria-roledescription="轮播"
      aria-label="成员精彩展示"
      data-autoplay={running}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (selected) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
      }}
    >
      <header className="paper-section-head">
        <div>
          <span className="paper-eyebrow">今夕群像</span>
          <h3>这一页，留给我们的伙伴</h3>
          <p>左右滑动或使用方向键浏览，随时打开完整成员档案。</p>
        </div>
        <span className="paper-tag yellow">成员精彩展示</span>
      </header>
      <div
        className="member-carousel-stage"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x,
            dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
            move(dx > 0 ? -1 : 1);
        }}
      >
        <div className="member-carousel-art">
          <ContentImage
            key={member.id}
            src={member.image}
            alt={`${member.name}的成员展示图`}
            fallback="brand"
            loading="eager"
          />
          <span className="gallery-stamp" aria-hidden="true">
            JINXI
            <br />
            GUILD
          </span>
        </div>
        <div
          className="member-carousel-copy"
          aria-live={running ? "off" : "polite"}
          aria-atomic="true"
        >
          <span className="paper-eyebrow">
            成员档案 / {String(active + 1).padStart(2, "0")}
          </span>
          <h3>{member.name}</h3>
          {member.role && (
            <span className="paper-tag yellow">{member.role}</span>
          )}
          <p>{member.description || "这位伙伴暂时还没有留下个人介绍。"}</p>
          <button
            className="paper-button dark"
            onClick={() => {
              setPlaying(false);
              setSelected(member);
            }}
          >
            查看成员详情 <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="member-carousel-controls">
        <div>
          <button
            className="paper-button icon"
            onClick={() => move(-1)}
            disabled={total < 2}
            aria-label="上一张"
          >
            <ArrowLeft size={20} />
          </button>
          <span
            className="carousel-pagination"
            aria-label={`第 ${active + 1} 张，共 ${total} 张`}
          >
            {active + 1} <span>/ {total}</span>
          </span>
          <button
            className="paper-button icon"
            onClick={() => move(1)}
            disabled={total < 2}
            aria-label="下一张"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <button
          className="paper-button"
          disabled={Boolean(reduced) || total < 2}
          aria-pressed={!playing || Boolean(reduced)}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing && !reduced ? <Pause size={16} /> : <Play size={16} />}{" "}
          {reduced
            ? "已遵循减少动态设置"
            : playing
              ? "暂停自动播放"
              : "恢复自动播放"}
        </button>
      </div>
      <p className="paper-muted carousel-hint">
        {reduced
          ? "自动播放已关闭，可手动浏览。"
          : "每 5 秒切换；悬停、键盘操作或打开详情时暂停。"}
      </p>
      <MemberDetailModal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        member={selected}
      />
    </section>
  );
}
