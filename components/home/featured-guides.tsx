"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useElementActivity } from "../../hooks/use-element-activity";
import {
  readHomeGuides,
  HomeGuideReadError,
  type HomeGuide,
  type HomeGuideFeed,
} from "../../services/home-guides";
import { PaperState } from "../ui/paper";
import { HomeGuideCard } from "./home-guide-card";
import { SectionHeading } from "./guild-sections";
import styles from "./featured-guides.module.css";
import { useSiteRuntime } from "../site-runtime";
export function FeaturedGuides() {
  const runtime = useSiteRuntime(), readFeed = runtime?.readHomeGuides || readHomeGuides;
  const root = useRef<HTMLElement>(null),
    { active } = useElementActivity(root);
  const requestedRevision = useRef(0);
  const [armed, setArmed] = useState(false),
    [revision, setRevision] = useState(0),
    [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
      "idle",
    ),
    [items, setItems] = useState<HomeGuide[]>([]),
    [tab, setTab] = useState<HomeGuideFeed>("latest"),
    [loadedTab, setLoadedTab] = useState<HomeGuideFeed | null>(null),
    [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    if (active) setArmed(true);
  }, [active]);
  useEffect(() => {
    if (!armed || !active) return;
    let alive = true;
    setStatus("loading");
    setUnsupported(false);
    const force = requestedRevision.current !== revision;
    requestedRevision.current = revision;
    readFeed(tab, force)
      .then((rows) => {
        if (alive) {
          setItems(rows);
          setStatus("ready");
          setLoadedTab(tab);
        }
      })
      .catch((error: unknown) => {
        if (alive) {
          setStatus("error");
          setLoadedTab(tab);
          setUnsupported(
            error instanceof HomeGuideReadError &&
              error.reason === "upgrade-required",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [armed, active, revision, tab, readFeed, runtime?.dataVersion]);
  const visibleStatus = loadedTab === tab ? status : "loading";
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
              ["latest", "最近发布"],
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
      {visibleStatus === "idle" || visibleStatus === "loading" ? (
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
      ) : visibleStatus === "error" ? (
        <PaperState kind="error" title="攻略暂时无法读取">
          <span>
            {unsupported
              ? "当前服务暂不支持首页筛选，可前往攻略中心查看。"
              : "原有攻略仍可从攻略中心访问。"}
          </span>
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
      ) : items.length ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <HomeGuideCard key={item.id} guide={item} />
          ))}
        </div>
      ) : (
        <PaperState
          kind="empty"
          title={
            tab === "pinned"
              ? "暂无已置顶的公开攻略"
              : tab === "video"
                ? "暂无带有效视频链接的公开攻略"
                : "暂时还没有可展示的公开攻略"
          }
        >
          <span>保留真实内容，有新的分享时再来看看。</span>
          <a className="paper-button" href="/guides/">
            前往攻略中心
          </a>
        </PaperState>
      )}
      <p className={styles.source}>
        来源：已发布攻略，服务端
        {tab === "video"
          ? "筛选有效视频链接"
          : tab === "pinned"
            ? "筛选置顶"
            : "按发布时间排序"}
        后取前3篇。
        请求共享60秒缓存，停留时不自动刷新。
      </p>
    </section>
  );
}
