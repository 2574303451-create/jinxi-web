"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { readGuideList, type GuideSummary } from "../../services/guide-service";
import { STRATEGY_CONFIG } from "../../types/strategy-wall";
import { useGuideLocation } from "../../hooks/use-guide-location";
import { guideHref } from "../../lib/guide-location";
import type { MouseEvent } from "react";
import { PaperState, PublicAvatar } from "../ui/paper";
const GuideReader = lazy(() => import("./guide-reader"));
const GuideSubmission = lazy(() => import("./guide-submission"));
export function GuideCenter() {
  const { route, navigate, restoreScroll } = useGuideLocation();
  const [query, setQuery] = useState(""),
    [reload, setReload] = useState(0),
    [posting, setPosting] = useState(false);
  const {
    q: search = "",
    category = "",
    difficulty = "",
    sort = "created_at",
    page = 1,
    id = null,
  } = route || {};
  useEffect(() => setQuery(search), [search]);
  const follow = (
    event: MouseEvent<HTMLAnchorElement>,
    patch: Parameters<typeof navigate>[0],
    target: number | "list" = 0,
  ) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      navigate(patch, target);
    }
  };
  const [items, setItems] = useState<GuideSummary[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [loadedRoute, setLoadedRoute] = useState<typeof route>(null);
  useEffect(() => {
    if (!route || id !== null) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    readGuideList(
      {
        search,
        category: category || undefined,
        difficulty: difficulty ? Number(difficulty) : undefined,
        sortBy: sort as "created_at" | "view_count" | "likes",
        sortOrder: "DESC",
        offset: (page - 1) * 12,
        limit: 12,
      },
      controller.signal,
    )
      .then((result) => {
        setItems(result.strategies);
        setPagination(result.pagination);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedRoute(route);
        }
      });
    return () => controller.abort();
  }, [route, id, search, category, difficulty, sort, page, reload]);
  useEffect(() => {
    if (route && id === null && !loading && loadedRoute === route)
      restoreScroll();
  }, [route, id, loading, loadedRoute, restoreScroll]);
  if (!route) return <PaperState kind="loading" title="正在打开攻略中心…" />;
  if (id !== null)
    return (
      <Suspense fallback={<PaperState kind="loading" title="正在打开攻略…" />}>
        <GuideReader
          id={id}
          listHref={guideHref(route, { id: null })}
          onReturn={(event) => follow(event, { id: null }, "list")}
          onReady={restoreScroll}
        />
      </Suspense>
    );
  return (
    <>
      <section className="guide-hero">
        <span className="paper-tag yellow">今夕 · 攻略中心</span>
        <h1>
          把经验留下，
          <br />
          <em>让下一局更有把握。</em>
        </h1>
        <div>
          <p>
            从第一场副本，到每一次默契配合。
            <br />
            在这里读攻略、写心得，和伙伴一起变强。
          </p>
          <button
            className="paper-button yellow"
            onClick={() => setPosting(true)}
          >
            写一篇攻略 ↗
          </button>
        </div>
      </section>
      <section className="guide-browser" aria-label="攻略筛选与列表">
        <form
          className="guide-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: query.trim(), page: 1 }, "list");
          }}
        >
          <label className="paper-label" htmlFor="guide-search">
            找一篇需要的攻略
          </label>
          <div>
            <input
              className="paper-input"
              id="guide-search"
              type="search"
              maxLength={200}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题与正文"
            />
            <button className="paper-button dark">搜索</button>
          </div>
        </form>
        <div className="guide-categories" aria-label="攻略分类">
          {[{ key: "", label: "全部攻略" }, ...STRATEGY_CONFIG.CATEGORIES].map(
            (c) => (
              <button
                key={c.key}
                className="paper-filter"
                aria-pressed={category === c.key}
                onClick={() => {
                  navigate(
                    { category: c.key as typeof category, page: 1 },
                    "list",
                  );
                }}
              >
                {c.label}
              </button>
            ),
          )}
        </div>
        <div className="guide-list-head">
          <p>
            {loading
              ? "正在读取攻略…"
              : `当前筛选共 ${pagination.total} 篇公开攻略`}
          </p>
          <div>
            <label>
              难度
              <select
                className="paper-input"
                value={difficulty}
                onChange={(e) => {
                  navigate({ difficulty: e.target.value, page: 1 }, "list");
                }}
              >
                <option value="">全部难度</option>
                {STRATEGY_CONFIG.DIFFICULTIES.map((d) => (
                  <option key={d.level} value={d.level}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              排序
              <select
                className="paper-input"
                value={sort}
                onChange={(e) => {
                  navigate(
                    { sort: e.target.value as typeof sort, page: 1 },
                    "list",
                  );
                }}
              >
                <option value="created_at">最近发布</option>
                <option value="view_count">浏览最多</option>
                <option value="likes">点赞最多</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <PaperState kind="loading" title="正在读取公开攻略…" />
        ) : error ? (
          <PaperState
            kind="error"
            title={error}
            action={
              <button
                className="paper-button"
                onClick={() => setReload((n) => n + 1)}
              >
                重试
              </button>
            }
          />
        ) : !items.length ? (
          <PaperState kind="empty" title="这里还没有匹配的攻略">
            换个关键词或分类试试。
          </PaperState>
        ) : (
          <div className="guide-grid">
            {items.map((item) => (
              <article className="guide-card" key={item.id}>
                <div className="guide-card-tags">
                  <span
                    className={`paper-tag${item.isPinned ? " yellow" : ""}`}
                  >
                    {item.isPinned ? "置顶" : item.category}
                  </span>
                  <span className="paper-muted">
                    难度 {item.difficulty} / 5
                  </span>
                </div>
                <h2>
                  <a
                    href={guideHref(route, { id: item.id })}
                    onClick={(event) => follow(event, { id: item.id })}
                  >
                    {item.title}
                  </a>
                </h2>
                <p>
                  {item.excerpt
                    .replace(/^#{1,6}\s*/gm, "")
                    .replace(/\*\*|`/g, "")
                    .replace(/\s+/g, " ")}
                </p>
                <div className="guide-author">
                  <PublicAvatar name={item.author} />
                  <span>
                    {item.author}
                    <small>署名 · 未认证</small>
                  </span>
                </div>
                <footer>
                  <span>
                    {item.likeCount} 点赞 · {item.commentCount} 评论
                  </span>
                  <a
                    href={guideHref(route, { id: item.id })}
                    onClick={(event) => follow(event, { id: item.id })}
                  >
                    阅读全文 ↗
                  </a>
                </footer>
              </article>
            ))}
          </div>
        )}
        {!error && !loading && pagination.total > 0 && (
          <div className="guide-pagination">
            <button
              className="paper-button"
              disabled={page === 1}
              onClick={() => {
                navigate({ page: page - 1 }, "list");
              }}
            >
              上一页
            </button>
            <span>第 {page} 页</span>
            <button
              className="paper-button"
              disabled={!pagination.hasMore}
              onClick={() => {
                navigate({ page: page + 1 }, "list");
              }}
            >
              下一页
            </button>
          </div>
        )}
      </section>
      {posting && (
        <Suspense
          fallback={<PaperState kind="loading" title="正在打开投稿表单…" />}
        >
          <GuideSubmission
            onClose={() => setPosting(false)}
            onSaved={() => {
              setPosting(false);
              navigate({ page: 1 }, "list");
              setReload((n) => n + 1);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
