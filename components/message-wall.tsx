"use client";

import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ImagePlus,
  MessageCircle,
  Pin,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { getUserId } from "../lib/user-utils";
import * as backendAPI from "../services/message-wall-backend";
import { updateTaskProgress } from "../services/daily-task-service";
import {
  PUBLIC_MESSAGES_CHANGED,
  usePublicMessages,
} from "../hooks/use-public-messages";
import { AdminPasswordDialog } from "./ui/admin-password-dialog";
import { Modal } from "./ui/modal";
import { ContentImage } from "./ui/content-image";
import { PaperState, PublicAvatar, messageDate } from "./ui/paper";
import type { MessageActions } from "./site-runtime";

const categories = ["闲聊", "公告", "提醒", "求助"];
const reactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const colors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

function MessageImageInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  function read(file?: File) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("图片不能超过 2MB。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => setError("图片读取失败，请重新选择。");
    reader.readAsDataURL(file);
  }
  return (
    <div
      className="message-image-input"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        read(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label="留言配图文件"
        onChange={(e) => {
          read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <>
          <div className="message-upload-preview">
            <ContentImage src={value} alt="待发布的留言配图" />
          </div>
          <button
            type="button"
            className="paper-text-button"
            onClick={() => onChange(null)}
          >
            移除配图
          </button>
        </>
      ) : (
        <button
          type="button"
          className="message-upload-button"
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={21} />
          <span>
            添加一张配图<small>点击或拖入 · 不超过 2MB</small>
          </span>
          <span aria-hidden="true">＋</span>
        </button>
      )}
      {error && (
        <p className="paper-notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const MessageWall = memo(function MessageWall({
  className = "",
  loggedInAccount = "",
  loggedInNickname = "",
  initialMessageId,
  writesPaused = false,
  actions,
  management,
}: {
  className?: string;
  loggedInAccount?: string;
  loggedInNickname?: string;
  initialMessageId?: string | null;
  writesPaused?: boolean;
  actions?: MessageActions;
  management?: ReactNode;
}) {
  const api = actions || backendAPI;
  const { messages, loading, error, reload, readOnly } = usePublicMessages();
  const canWrite = !writesPaused && !readOnly;
  const [name, setName] = useState(""),
    [content, setContent] = useState("");
  const [category, setCategory] = useState("闲聊"),
    [color, setColor] = useState("#3b82f6");
  const [image, setImage] = useState<string | null>(null);
  const [filter, setFilter] = useState("all"),
    [userId, setUserId] = useState("anonymous");
  const [submitting, setSubmitting] = useState(false),
    [busy, setBusy] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null),
    [reply, setReply] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    type: "pin" | "delete";
    id: string;
  } | null>(null);
  const root = useRef<HTMLElement>(null),
    located = useRef<string | null>(null);
  const formId = useId();
  useEffect(() => {
    if (!actions) setUserId(getUserId());
  }, [actions]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 801px)");
    const update = () => setComposerOpen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (loggedInAccount) setName(loggedInNickname.trim() || loggedInAccount);
  }, [loggedInAccount, loggedInNickname]);
  useEffect(() => {
    if (
      !initialMessageId ||
      loading ||
      error ||
      located.current === initialMessageId
    )
      return;
    setFilter("all");
    const frame = requestAnimationFrame(() => {
      const target = Array.from(
        root.current?.querySelectorAll<HTMLElement>("[data-message-id]") || [],
      ).find((element) => element.dataset.messageId === initialMessageId);
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
        target.focus({ preventScroll: true });
      }
      located.current = initialMessageId;
    });
    return () => cancelAnimationFrame(frame);
  }, [initialMessageId, loading, error]);
  async function refresh() {
    await reload();
    window.dispatchEvent(new Event(PUBLIC_MESSAGES_CHANGED));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) { setNotice({error:true,text:"留言发布暂未开放，草稿仍可复制。"}); return; }
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await api.addMessage({
        name: name.trim() || "匿名",
        content,
        category,
        color,
        imageUrl: image || undefined,
      });
      if (!actions) updateTaskProgress("daily-message", 1);
      setContent("");
      setCategory("闲聊");
      setColor("#3b82f6");
      setImage(null);
      setNotice({ error: false, text: actions ? "留言已提交审核。通过审核后公开显示。" : "留言已发布。谢谢你留下这一刻。" });
      await refresh();
    } catch {
      setNotice({ error: true, text: "发布失败，内容已保留，请稍后重试。" });
    } finally {
      setSubmitting(false);
    }
  }
  async function sendReply(event: FormEvent, id: string) {
    event.preventDefault();
    if (!canWrite) { setNotice({error:true,text:"留言回复暂未开放，草稿仍可复制。"}); return; }
    if (!reply.trim() || busy) return;
    setBusy(id);
    setNotice(null);
    try {
      await api.addReply(id, {
        name: name.trim() || "匿名",
        content: reply,
        color,
      });
      setReply("");
      setReplyingTo(null);
      await refresh();
    } catch {
      setNotice({
        error: true,
        text: "回复失败，内容已保留。请检查留言是否仍然存在后重试。",
      });
    } finally {
      setBusy(null);
    }
  }
  async function react(id: string, type: string) {
    if (!canWrite) return;
    if (busy) return;
    setBusy(id);
    setNotice(null);
    try {
      await api.toggleReaction(id, type, userId);
      await refresh();
    } catch {
      setNotice({ error: true, text: "表情回应失败，请稍后重试。" });
    } finally {
      setBusy(null);
    }
  }
  async function adminAction(password: string) {
    if (!canWrite) throw new Error("留言管理正在安全升级。");
    if (!pending) throw new Error("请重新选择需要管理的留言。");
    if (!password.trim()) throw new Error("请输入管理密码。");
    if (pending.type === "pin")
      await api.togglePin(pending.id, password);
    else await api.deleteMessage(pending.id, password);
    // Keep the pending action if the server rejects the password, so retry is real.
    await refresh();
    setPending(null);
  }
  const filtered =
    filter === "all"
      ? messages
      : messages.filter((item) => item.category === filter);
  const missingTarget =
    initialMessageId &&
    !loading &&
    !error &&
    !messages.some((item) => item.id === initialMessageId);
  return (
    <section
      ref={root}
      className={`message-wall ${className}`}
      aria-label="公会留言墙"
    >
      <header className="paper-section-head">
        <div>
          <span className="paper-eyebrow">今夕留言板</span>
          <h3>留下你的声音</h3>
          <p>一句问候、一点心得，或是下一次组队的邀约。</p>
        </div>
        <button
          className="paper-button"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "paper-spinner" : undefined}
          />
          刷新留言
        </button>
      </header>
      {writesPaused && <p className="paper-notice" role="status">留言、回复和表情回应暂未开放。可以阅读旧留言，或在表单内编辑并复制草稿。</p>}
      {management}
      <div className="message-wall-layout">
        <details
          className="message-composer-disclosure"
          open={composerOpen}
          onToggle={(event) => setComposerOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <MessageCircle size={20} />
              写一条留言
            </span>
            <span aria-hidden="true">{composerOpen ? "−" : "＋"}</span>
          </summary>
          <form
            onSubmit={submit}
            className="message-compose paper-form"
            aria-busy={submitting}
          >
            <div className="message-compose-title">
              <MessageCircle size={22} />
              <h4>写给今夕的伙伴</h4>
            </div>
            <p className="paper-muted">
              留言及配图对访客公开，请勿填写隐私或账号密码。
            </p>
            <div>
              <label className="paper-label" htmlFor={`${formId}-name`}>
                你的昵称 <span>可留空</span>
              </label>
              <input
                id={`${formId}-name`}
                className="paper-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={Boolean(loggedInAccount)}
                placeholder="匿名伙伴"
              />
              {loggedInAccount && (
                <small className="paper-muted">使用当前账号的展示昵称</small>
              )}
            </div>
            <div>
              <label className="paper-label" htmlFor={`${formId}-category`}>
                留言分类
              </label>
              <select
                id={`${formId}-category`}
                className="paper-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="paper-label" htmlFor={`${formId}-content`}>
                想说的话 <span>必填</span>
              </label>
              <textarea
                id={`${formId}-content`}
                className="paper-input"
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="分享此刻的想法…"
              />
            </div>
            {actions ? <p className="paper-muted">合成集成仅验证文字与固定媒体引用，不提供上传。</p> : <MessageImageInput value={image} onChange={setImage} />}
            <fieldset className="message-color-picker">
              <legend>头像标记色</legend>
              {colors.map((item, i) => (
                <button
                  key={item}
                  className="message-color"
                  type="button"
                  aria-label={`标记色 ${i + 1}`}
                  aria-pressed={color === item}
                  onClick={() => setColor(item)}
                >
                  <span style={{ backgroundColor: item }} />
                  {color === item && <b aria-hidden="true">✓</b>}
                </button>
              ))}
            </fieldset>
            <button
              type="submit"
              className="paper-button yellow"
              disabled={!canWrite || submitting || !content.trim()}
            >
              <Send size={17} />
              {canWrite ? (submitting ? "正在发布…" : "发布留言") : "发布暂未开放"}
            </button>
          </form>
        </details>
        <div className="message-feed">
          <div
            className="paper-filters"
            role="group"
            aria-label="按留言分类筛选"
          >
            {["all", ...categories].map((item) => (
              <button
                key={item}
                className="paper-filter"
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item === "all" ? "全部留言" : item}
              </button>
            ))}
          </div>
          {notice && (
            <p
              className={`paper-notice ${notice.error ? "error" : "success"}`}
              role={notice.error ? "alert" : "status"}
            >
              {notice.text}
            </p>
          )}
          {missingTarget && (
            <p className="paper-notice" role="status">
              这条留言不在当前公开列表中，可能已被移除或不在最近 100 条内。
            </p>
          )}
          {loading ? (
            <PaperState kind="loading" title="正在读取留言…">
              稍等片刻，伙伴的声音正在路上。
            </PaperState>
          ) : error ? (
            <PaperState
              kind="error"
              title={error}
              action={
                <button className="paper-button" onClick={() => void reload()}>
                  重新加载
                </button>
              }
            >
              暂时无法取得公开留言，稍后再来看看。
            </PaperState>
          ) : filtered.length === 0 ? (
            <PaperState
              kind="empty"
              title={
                filter === "all" ? "留言板还是空的" : `还没有「${filter}」留言`
              }
            >
              写一条留言，留下第一句问候。
              {filter !== "all" && (
                <button
                  className="paper-text-button"
                  onClick={() => setFilter("all")}
                >
                  查看全部留言
                </button>
              )}
            </PaperState>
          ) : (
            <div className="message-card-list">
              <p className="message-list-caption">
                当前展示 {filtered.length} 条公开留言
                <span>置顶优先 · 由近到远</span>
              </p>
              {filtered.map((message) => (
                <article
                  key={message.id}
                  className={`message-card${message.isPinned ? " is-pinned" : ""}${initialMessageId === message.id ? " is-target" : ""}`}
                  data-message-id={message.id}
                  tabIndex={-1}
                  aria-label={`${message.name}的留言`}
                >
                  {message.isPinned && (
                    <div className="message-pin">
                      <Pin size={13} />
                      置顶留言
                    </div>
                  )}
                  <header className="message-card-head">
                    <PublicAvatar name={message.name} color={message.color} subject={`message:${message.id}`} />
                    <div>
                      <h4>{message.name}</h4>
                      <time>{messageDate(message.timestamp)}</time>
                    </div>
                    <span className="paper-tag">{message.category}</span>
                  </header>
                  <p className="message-content">{message.content}</p>
                  {message.imageUrl && (
                    <button
                      className="message-attachment"
                      aria-label={`查看${message.name}的留言配图`}
                      onClick={() => setPreview(message.imageUrl || null)}
                    >
                      <ContentImage
                        src={message.imageUrl}
                        alt={`${message.name}的留言配图`}
                      />
                      <span>查看大图 ↗</span>
                    </button>
                  )}
                  <div
                    className="message-reactions"
                    role="group"
                    aria-label={`回应${message.name}的留言`}
                  >
                    {(actions ? reactions.slice(0, 3) : reactions).map((type) => {
                      const data = message.reactions.find(
                        (item) => item.type === type,
                      );
                      return (
                        <button
                          key={type}
                          className="message-reaction"
                          aria-label={`回应 ${type}`}
                          aria-pressed={Boolean(data?.users.includes(userId))}
                          disabled={!canWrite || busy === message.id}
                          onClick={() => void react(message.id, type)}
                        >
                          {type}
                          <span>{data?.count || 0}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="message-card-toolbar">
                    <button
                      className="paper-text-button"
                      aria-expanded={replyingTo === message.id}
                      aria-controls={`${formId}-reply-${message.id}`}
                      onClick={() => {
                        setReplyingTo(
                          replyingTo === message.id ? null : message.id,
                        );
                        setReply("");
                      }}
                    >
                      <MessageCircle size={16} />
                      回复
                      {message.replies.length > 0
                        ? ` · ${message.replies.length}`
                        : ""}
                    </button>
                    {!actions && <details className="message-admin-menu">
                      <summary>管理留言</summary>
                      <div>
                        {!canWrite && <p className="paper-muted">管理权限正在安全升级。</p>}
                        <button
                          disabled={!canWrite}
                          onClick={() =>
                            setPending({ type: "pin", id: message.id })
                          }
                        >
                          <Pin size={15} />
                          {message.isPinned ? "取消置顶" : "置顶留言"}
                        </button>
                        <button
                          disabled={!canWrite}
                          onClick={() => {
                            if (
                              window.confirm(
                                "确定要删除这条留言吗？此操作需要管理员验证。",
                              )
                            )
                              setPending({ type: "delete", id: message.id });
                          }}
                        >
                          <Trash2 size={15} />
                          删除留言
                        </button>
                      </div>
                    </details>}
                  </div>
                  {replyingTo === message.id && (
                    <form
                      className="message-reply-form"
                      id={`${formId}-reply-${message.id}`}
                      onSubmit={(e) => void sendReply(e, message.id)}
                    >
                      <label
                        className="paper-label"
                        htmlFor={`${formId}-reply-input-${message.id}`}
                      >
                        回复 {message.name}
                      </label>
                      <textarea
                        autoFocus
                        className="paper-input"
                        id={`${formId}-reply-input-${message.id}`}
                        rows={2}
                        required
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="写下你的回复…"
                      />
                      <div>
                        <small className="paper-muted">
                          以「{name.trim() || "匿名"}」回复
                        </small>
                        <button
                          className="paper-button yellow"
                          type="submit"
                          disabled={!canWrite || busy === message.id || !reply.trim()}
                        >
                          {canWrite ? (busy === message.id ? "发送中…" : "发送回复") : "回复暂未开放"}
                        </button>
                      </div>
                    </form>
                  )}
                  {message.replies.length > 0 && (
                    <ul className="message-replies" aria-label="留言回复">
                      {message.replies.map((item) => (
                        <li key={item.id}>
                          <PublicAvatar name={item.name} color={item.color} subject={`reply:${item.id}`} />
                          <div>
                            <div className="reply-meta">
                              <strong>{item.name}</strong>
                              <time>{messageDate(item.timestamp)}</time>
                            </div>
                            <p>{item.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        title="留言配图"
        size="xl"
        legacy={false}
      >
        {preview && (
          <div className="message-image-preview">
            <ContentImage src={preview} alt="留言配图大图" loading="eager" />
          </div>
        )}
      </Modal>
      <AdminPasswordDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={adminAction}
        title={pending?.type === "pin" ? "管理置顶" : "删除留言"}
        description={
          pending?.type === "pin"
            ? "请输入管理员密码，确认置顶或取消置顶这条留言。"
            : "删除后无法在留言墙恢复。请输入管理密码确认删除。"
        }
      />
    </section>
  );
});
