"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Pause, Play } from "lucide-react";
import {
  PUBLIC_MESSAGES_CHANGED,
  usePublicMessages,
} from "../../hooks/use-public-messages";
import { PaperState, PublicAvatar, messageDate } from "../ui/paper";

const SPEED = 32; // px/s, independent of record count or screen width.

export function MessageShowcase({ onOpen }: { onOpen: (id?: string) => void }) {
  const { messages, loading, error, reload } = usePublicMessages();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false),
    [hidden, setHidden] = useState(false);
  const [distance, setDistance] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewport = useRef<HTMLDivElement>(null),
    group = useRef<HTMLUListElement>(null);
  // Only fields already public in the existing API. Never use reaction user IDs or replies here.
  const items = messages
    .filter((item) => typeof item.content === "string" && item.content.trim())
    .slice(0, 12);
  const running =
    !loading &&
    !error &&
    !paused &&
    !hovered &&
    !focused &&
    !reduced &&
    !hidden &&
    items.length > 1 &&
    distance > 0;
  useEffect(() => {
    const changed = () => void reload();
    const visibility = () => setHidden(document.hidden);
    visibility();
    window.addEventListener(PUBLIC_MESSAGES_CHANGED, changed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener(PUBLIC_MESSAGES_CHANGED, changed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reload]);
  useEffect(() => {
    const list = group.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      const gap =
        Number.parseFloat(getComputedStyle(list.parentElement!).columnGap) ||
        20;
      setDistance(list.getBoundingClientRect().width + gap);
      setViewportWidth(viewport.current?.clientWidth || 0);
    });
    observer.observe(list);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [loading, error, messages]);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous = 0,
      position = viewport.current?.scrollLeft || 0;
    const step = (time: number) => {
      if (previous && viewport.current) {
        position += (Math.min(time - previous, 50) * SPEED) / 1000;
        if (position >= distance) position -= distance;
        viewport.current.scrollLeft = position;
      }
      previous = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, distance]);
  function open(id: string) {
    const original = viewport.current?.querySelector<HTMLButtonElement>(
      `button[data-public-message="${id.replace(/[^\w-]/g, "")}"]`,
    );
    original?.focus({ preventScroll: true });
    onOpen(id);
  }
  const cards = (duplicate: boolean) =>
    items.map((item) => (
      <li key={item.id}>
        <button
          className="message-ribbon-card"
          data-public-message={duplicate ? undefined : item.id}
          tabIndex={duplicate ? -1 : 0}
          onMouseDown={
            duplicate ? (event) => event.preventDefault() : undefined
          }
          onClick={() => open(item.id)}
        >
          <span className="ribbon-card-top">
            <PublicAvatar name={item.name} />
            <span>
              <strong>{item.name}</strong>
              <small>{messageDate(item.timestamp)}</small>
            </span>
            <MessageCircle size={17} aria-hidden="true" />
          </span>
          <span className="ribbon-excerpt">
            {Array.from(item.content.replace(/\s+/g, " ").trim())
              .slice(0, 100)
              .join("")}
            {Array.from(item.content.trim()).length > 100 ? "…" : ""}
          </span>
          <span className="ribbon-card-bottom">
            <span className={`paper-tag${item.isPinned ? " yellow" : ""}`}>
              {item.isPinned ? "置顶" : item.category}
            </span>
            <span>
              查看留言 <ArrowRight size={14} />
            </span>
          </span>
        </button>
      </li>
    ));
  return (
    <section className="message-showcase" aria-label="公会公开留言展播">
      <header>
        <div>
          <span className="paper-eyebrow">来自留言墙</span>
          <h3>伙伴们，正在聊</h3>
          <p className="paper-muted">公会的日常，就藏在这些小小的对话里。</p>
        </div>
        <div className="ribbon-actions">
          {!loading && !error && items.length > 1 && (
            <button
              className="paper-button"
              onClick={() => setPaused((value) => !value)}
              disabled={Boolean(reduced)}
              aria-pressed={paused || Boolean(reduced)}
            >
              {paused || reduced ? <Play size={16} /> : <Pause size={16} />}{" "}
              {reduced ? "减少动态已开启" : paused ? "恢复滚动" : "暂停滚动"}
            </button>
          )}
          <button className="paper-text-button" onClick={() => onOpen()}>
            打开留言墙 <ArrowRight size={16} />
          </button>
        </div>
      </header>
      {loading ? (
        <PaperState kind="loading" title="正在读取公开留言…" />
      ) : error ? (
        <PaperState
          kind="error"
          title="暂时无法读取留言"
          action={
            <button className="paper-button" onClick={() => void reload()}>
              重试
            </button>
          }
        >
          公开留言恢复后，这里会继续展示。
        </PaperState>
      ) : items.length === 0 ? (
        <PaperState
          kind="empty"
          title="等待第一句问候"
          action={
            <button className="paper-button yellow" onClick={() => onOpen()}>
              去留言
            </button>
          }
        >
          暂时没有可展示的公开留言。
        </PaperState>
      ) : (
        <>
          <div
            ref={viewport}
            className="message-ribbon"
            tabIndex={0}
            role="region"
            aria-label="留言卡片，可左右滑动浏览"
            data-running={running}
            data-speed={SPEED}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
            }}
            onTouchStart={() => setPaused(true)}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") setPaused(true);
            }}
            onKeyDown={(e) => {
              if (
                e.target === e.currentTarget &&
                (e.key === "ArrowLeft" || e.key === "ArrowRight")
              ) {
                e.preventDefault();
                e.currentTarget.scrollBy({
                  left: e.key === "ArrowLeft" ? -320 : 320,
                  behavior: reduced ? "instant" : "smooth",
                });
              }
            }}
          >
            <div className="message-ribbon-track">
              <ul ref={group} className="message-ribbon-group">
                {cards(false)}
              </ul>
              {!reduced &&
                items.length > 1 &&
                Array.from(
                  {
                    length: Math.max(
                      1,
                      Math.ceil(viewportWidth / (distance || 1)),
                    ),
                  },
                  (_, index) => (
                    <ul
                      key={index}
                      className="message-ribbon-group"
                      aria-hidden="true"
                    >
                      {cards(true)}
                    </ul>
                  ),
                )}
            </div>
          </div>
          <p className="ribbon-hint">
            左右滑动浏览 · 点击查看原留言{!reduced && " · 悬停或键盘聚焦时暂停"}
          </p>
        </>
      )}
    </section>
  );
}
