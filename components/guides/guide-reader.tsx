"use client";
import { useEffect, useState, type MouseEvent } from "react";
import type { Strategy } from "../../types/strategy-wall";
import { readGuide } from "../../services/guide-service";
import * as api from "../../services/strategy-wall-service";
import { getUserId } from "../../lib/user-utils";
import { PaperState, PublicAvatar } from "../ui/paper";
import { AdminPasswordDialog } from "../ui/admin-password-dialog";
import { GuideBody } from "./guide-body";
import { GuideMedia } from "./guide-media";
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
  const [guide, setGuide] = useState<Strategy | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [name, setName] = useState(""),
    [comment, setComment] = useState(""),
    [admin, setAdmin] = useState<"pin" | "delete" | null>(null),
    [userId, setUserId] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(getUserId());
    const controller = new AbortController();
    setLoading(true);
    setError("");
    readGuide(id, controller.signal)
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
  }, [id, revision]);
  useEffect(() => {
    if (!loading && loadedId === id) onReady();
  }, [loading, loadedId, id, onReady]);
  async function action(kind: "like" | "favorite") {
    if (busy || !guide) return;
    setBusy(true);
    try {
      await (kind === "like" ? api.likeStrategy : api.favoriteStrategy)(
        id,
        userId,
      );
      setGuide(await readGuide(id));
      setNotice("操作已保存。");
    } catch {
      setNotice("操作失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
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
          {guide.viewCount} 浏览 · {guide.likes.length} 点赞 ·{" "}
          {guide.favorites.length} 收藏 · {guide.comments.length} 评论
        </p>
      </header>
      <GuideBody content={guide.content} />
      <GuideMedia items={guide.mediaFiles} cover={guide.imageUrl} />
      <div className="guide-reader-actions">
        <button
          className="paper-button"
          disabled={busy}
          aria-pressed={guide.likes.includes(userId)}
          onClick={() => action("like")}
        >
          {guide.likes.includes(userId) ? "已点赞" : "点赞"}{" "}
          {guide.likes.length}
        </button>
        <button
          className="paper-button"
          disabled={busy}
          aria-pressed={guide.favorites.includes(userId)}
          onClick={() => action("favorite")}
        >
          {guide.favorites.includes(userId) ? "已收藏" : "收藏"}
        </button>
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
        <p className="paper-muted">当前署名尚未认证，请勿填写私密资料。</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !comment.trim()) return;
            setBusy(true);
            try {
              await api.commentStrategy(
                id,
                userId,
                comment.trim(),
                name.trim() || "匿名游客",
              );
              setGuide(await readGuide(id));
              setComment("");
              setNotice("评论已保存。");
            } catch {
              setNotice("评论失败，草稿已保留。");
            } finally {
              setBusy(false);
            }
          }}
        >
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
          <button className="paper-button yellow" disabled={busy}>
            {busy ? "正在保存…" : "发布评论"}
          </button>
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
        <p className="paper-muted">继续由原管理员验证接口检查权限。</p>
        <button className="paper-button" onClick={() => setAdmin("pin")}>
          {guide.isPinned ? "取消置顶" : "置顶"}
        </button>
        <button className="paper-button" onClick={() => setAdmin("delete")}>
          删除攻略
        </button>
      </details>
      <AdminPasswordDialog
        isOpen={admin !== null}
        onClose={() => setAdmin(null)}
        description="该操作由原服务器管理员接口验证。"
        title={admin === "delete" ? "删除攻略" : "更新置顶"}
        onConfirm={async (password) => {
          if (admin === "delete") {
            await api.deleteStrategy(id, password);
            location.assign(listHref);
          } else {
            await api.pinStrategy(id, password);
            setGuide(await readGuide(id));
          }
          setAdmin(null);
        }}
      />
    </article>
  );
}
