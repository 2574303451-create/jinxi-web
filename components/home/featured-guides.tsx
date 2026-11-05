"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useElementActivity } from "../../hooks/use-element-activity";
import { readHomeGuides, type HomeGuide } from "../../services/home-guides";
import { PaperState } from "../ui/paper";
import { HomeGuideCard } from "./home-guide-card";
import { SectionHeading } from "./guild-sections";
import styles from "./featured-guides.module.css";
export function FeaturedGuides() {
  const root = useRef<HTMLElement>(null),
    { active } = useElementActivity(root);
  const [armed, setArmed] = useState(false),
    [revision, setRevision] = useState(0),
    [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
      "idle",
    ),
    [items, setItems] = useState<HomeGuide[]>([]),
    [tab, setTab] = useState<"all" | "video" | "pinned">("all"),
    [updated, setUpdated] = useState<Date | null>(null);
  useEffect(() => {
    if (active) setArmed(true);
  }, [active]);
  useEffect(() => {
    if (!armed) return;
    let alive = true;
    setStatus("loading");
    readHomeGuides(revision > 0)
      .then((rows) => {
        if (alive) {
          setItems(rows);
          setUpdated(new Date());
          setStatus("ready");
        }
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [armed, revision]);
  const filtered = items.filter(
      (item) =>
        tab === "all" ||
        (tab === "video" ? item.hasVideo === true : item.isPinned),
    ),
    videoUnknown =
      tab === "video" && items.some((item) => item.hasVideo === null);
  return (
    <section
      ref={root}
      className={`guild-shell guild-section ${styles.section}`}
      id="home-guides"
      aria-labelledby="home-guides-title"
    >
      <SectionHeading
        id="home-guides-title"
        label="攻略补给"
        title="把经验留下，让下一局更有把握。"
        description="读一篇笔记，带着新的思路出发。这里连着公会自己的攻略中心。"
        action={
          <a className="guild-button" href="/guides/">
            查看全部攻略
            <ArrowRight size={17} />
          </a>
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="首页攻略筛选">
          {(
            [
              ["all", "公开更新"],
              ["video", "视频附件"],
              ["pinned", "置顶精选"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className="paper-filter"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>首页最多展示3篇 · 更多内容见攻略中心</p>
      </div>
      {status === "idle" || status === "loading" ? (
        <div className={styles.loading} role="status">
          <span className="sr-only">
            {status === "idle" ? "公开攻略在这里等你" : "正在读取公开攻略…"}
          </span>
          <div className={styles.grid}>
            {[0, 1, 2].map((key) => (
              <div key={key} className={styles.skeleton} aria-hidden="true">
                <div />
                <div className={styles.skeletonBody}>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : status === "error" ? (
        <PaperState kind="error" title="攻略暂时无法读取">
          <span>原有攻略仍可从攻略中心访问。</span>
          <button
            className="paper-button"
            onClick={() => {
              if (active) setRevision((n) => n + 1);
            }}
          >
            <RefreshCw size={16} />
            重试
          </button>
        </PaperState>
      ) : filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <HomeGuideCard key={item.id} guide={item} />
          ))}
        </div>
      ) : (
        <PaperState
          kind="empty"
          title={
            videoUnknown
              ? "视频索引接入中"
              : !items.length
                ? "暂时还没有可展示的公开攻略"
                : tab === "pinned"
                  ? "这批公开内容尚无置顶攻略"
                  : "这批公开内容尚无视频附件"
          }
        >
          <span>
            {videoUnknown
              ? "当前摘要还未提供视频标记，不推算视频数量。"
              : "保留真实内容，有新的分享时再来看看。"}
          </span>
          <a className="paper-button" href="/guides/">
            前往攻略中心
          </a>
        </PaperState>
      )}
      <p className={styles.source}>
        来源：已发布攻略公开列表，沿用原列表顺序，置顶优先。
        {updated &&
          `本次读取：${updated.toLocaleString("zh-CN", { hour12: false })}。`}
      </p>
    </section>
  );
}
