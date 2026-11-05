"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMotionPreference } from "../../hooks/use-motion-preference";
import { ArrowRight, Pause, Play } from "lucide-react";
import {
  PUBLIC_MESSAGES_CHANGED,
  usePublicMessages,
} from "../../hooks/use-public-messages";
import { PaperState } from "../ui/paper";
import { MessageRibbonRow } from "./message-ribbon-row";
import type { PublicMessageSummary } from "./ribbon-card";

export function MessageShowcase({ onOpen }: { onOpen: (id?: string) => void }) {
  const { messages, loading, error, reload } = usePublicMessages();
  const reduced = useMotionPreference();
  const [paused, setPaused] = useState(false);
  const [loopable, setLoopable] = useState<Record<number, boolean>>({});
  const onLoopChange = useCallback(
    (index: number, loop: boolean) =>
      setLoopable((previous) =>
        previous[index] === loop ? previous : { ...previous, [index]: loop },
      ),
    [],
  );
  const items = useMemo(() => {
    const seen = new Set<string>();
    return messages
      .flatMap((item) => {
        if (typeof item.content !== "string") return [];
        const key = item.content
          .replace(/\s+/g, " ")
          .trim()
          .toLocaleLowerCase();
        if (!key || seen.has(key)) return [];
        seen.add(key);
        // Explicit public projection. Do not pass reactions, replies, account IDs or other API fields.
        const summary: PublicMessageSummary = {
          id: item.id,
          name: item.name,
          content: item.content,
          timestamp: item.timestamp,
          category: item.category,
          isPinned: item.isPinned,
        };
        return [summary];
      })
      .slice(0, 12);
  }, [messages]);
  const twoRows = items.length >= 6;
  const canAnimate = twoRows && !reduced && (loopable[0] || loopable[1]);
  const rows = twoRows
    ? [
        items.filter((_, index) => index % 2 === 0),
        items.filter((_, index) => index % 2 === 1),
      ]
    : [items];
  useEffect(() => {
    const changed = () => void reload();
    window.addEventListener(PUBLIC_MESSAGES_CHANGED, changed);
    return () => window.removeEventListener(PUBLIC_MESSAGES_CHANGED, changed);
  }, [reload]);
  return (
    <section className="message-showcase" aria-label="公会公开留言展播">
      <header>
        <div>
          <span className="paper-eyebrow">来自留言墙</span>
          <h3>伙伴们，正在聊</h3>
          <p className="paper-muted">公会的日常，就藏在这些小小的对话里。</p>
        </div>
        <div className="ribbon-actions">
          {!loading && !error && twoRows && (
            <button
              className="paper-button"
              onClick={() => setPaused((value) => !value)}
              disabled={!canAnimate}
              aria-pressed={paused || reduced}
            >
              {paused || !canAnimate ? <Play size={16} /> : <Pause size={16} />}{" "}
              {reduced
                ? "减少动态已开启"
                : !canAnimate
                  ? "静态浏览"
                  : paused
                    ? "恢复滚动"
                    : "暂停滚动"}
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
          <div className="message-ribbon-rows" data-rows={rows.length}>
            {rows.map((row, index) => (
              <MessageRibbonRow
                key={index}
                rowIndex={index}
                onLoopChange={onLoopChange}
                items={row}
                direction={index === 0 ? "left" : "right"}
                paused={paused}
                reduced={reduced}
                allowLoop={twoRows}
                onPause={() => setPaused(true)}
                onOpen={onOpen}
              />
            ))}
          </div>
          <p className="ribbon-hint">
            左右滑动浏览 · 点击查看原留言
            {canAnimate ? " · 悬停或键盘聚焦时暂停" : " · 当前为静态浏览"}
          </p>
        </>
      )}
    </section>
  );
}
