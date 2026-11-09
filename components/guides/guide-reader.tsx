"use client";
import { useEffect, useState, type MouseEvent } from "react";
import type { Strategy } from "../../types/strategy-wall";
import { readGuide } from "../../services/guide-service";
import { PaperState, PublicAvatar } from "../ui/paper";
import { GuideBody } from "./guide-body";
import { GuideMedia } from "./guide-media";
import { useSiteRuntime } from "../site-runtime";
export default function GuideReader({
  id,
  listHref,
  onReturn,
  onReady,
}: {
  id: string;
  listHref: string;
  onReturn: (event: MouseEvent<HTMLAnchorElement>) => void;
  onReady: () => void;
}) {
  const runtime = useSiteRuntime();
  const read = runtime?.readGuide || readGuide;
  const [guide, setGuide] = useState<Strategy | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(""),
    [name, setName] = useState(""),
    [comment, setComment] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    read(id, controller.signal)
      .then(setGuide)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedId(id);
        }
      });
    return () => controller.abort();
  }, [id, revision, read, runtime?.dataVersion]);
  useEffect(() => {
    if (!loading && loadedId === id) onReady();
  }, [loading, loadedId, id, onReady]);
  if (loading) return <PaperState kind="loading" title="正在读取攻略正文…" />;
  if (error || !guide)
    return (
      <section className="guide-reader">
        <a href={listHref} onClick={onReturn}>
          ← 返回攻略列表
        </a>
        <PaperState
          kind="error"
          title={error || "攻略暂不可用"}
          action={
            <button
              className="paper-button"
              onClick={() => setRevision((n) => n + 1)}
            >
              重试
            </button>
          }
        />
      </section>
    );
  return (
    <article className="guide-reader">
      <a className="paper-text-button" href={listHref} onClick={onReturn}>
        ← 返回攻略列表
      </a>
      <header>
        <div className="guide-card-tags">
          <span className="paper-tag yellow">{guide.category}</span>
          <span className="paper-tag">难度 {guide.difficulty} / 5</span>
          {guide.isPinned && <span className="paper-tag">置顶攻略</span>}
        </div>
        <h1>{guide.title}</h1>
        <div className="guide-author">
          <PublicAvatar name={guide.author} />
          <span>
            {guide.author}
            <small>
              历史署名 · 未认证 ·{" "}
              {new Date(guide.createdAt).toLocaleDateString("zh-CN")}
            </small>
          </span>
        </div>
        <p className="paper-muted">
          {guide.viewCount} 浏览 · {guide.likeCount ?? guide.likes.length} 点赞 ·{" "}
          {guide.favoriteCount ?? guide.favorites.length} 收藏 · {guide.comments.length} 评论
        </p>
      </header>
      <GuideBody content={guide.content} />
      <GuideMedia items={guide.mediaFiles} cover={guide.imageUrl} />
      {runtime ? runtime.guideDiscussion(guide) : <>
      <p className="paper-notice" role="status">点赞、收藏和评论暂未开放。攻略与历史评论仍可阅读。</p>
      <div className="guide-reader-actions">
        <button className="paper-button" disabled>点赞 {guide.likes.length}</button>
        <button className="paper-button" disabled>收藏</button>
        <button
          className="paper-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setNotice("攻略链接已复制。");
            } catch {
              setNotice("复制失败，请复制浏览器地址栏中的链接。");
            }
          }}
        >
          复制分享链接
        </button>
      </div>
      <p role="status" className="paper-muted">
        {notice}
      </p>
      <section className="guide-comments">
        <h2>
          一起讨论 <small>{guide.comments.length}</small>
        </h2>
        <p className="paper-muted">可以先编辑并复制评论草稿。</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <label className="paper-label" htmlFor="comment-name">
            你的署名
          </label>
          <input
            id="comment-name"
            className="paper-input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="paper-label" htmlFor="guide-comment">
            评论内容
          </label>
          <textarea
            id="guide-comment"
            className="paper-input"
            required
            maxLength={1000}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="paper-button yellow" disabled>发布评论暂未开放</button>
        </form>
        {!guide.comments.length ? (
          <p className="paper-muted">暂无评论，期待你的交流。</p>
        ) : (
          <ul>
            {guide.comments.map((c) => (
              <li key={c.id}>
                <PublicAvatar name={c.userName} />
                <div>
                  <strong>{c.userName}</strong>
                  <small>
                    游客署名 ·{" "}
                    {Number.isFinite(c.timestamp.getTime())
                      ? c.timestamp.toLocaleDateString("zh-CN")
                      : "时间未提供"}
                  </small>
                  <p>{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <details className="guide-admin">
        <summary>管理操作</summary>
        <p className="paper-muted">管理权限正在安全升级。</p>
        <button className="paper-button" disabled>
          {guide.isPinned ? "取消置顶" : "置顶"}
        </button>
        <button className="paper-button" disabled>
          删除攻略
        </button>
      </details>
      </>}
    </article>
  );
}
