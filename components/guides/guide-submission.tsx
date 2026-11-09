"use client";
import { useState } from "react";
import { Modal } from "../ui/modal";
import {
  STRATEGY_CONFIG,
  type StrategySubmission,
  type StrategyCategory,
} from "../../types/strategy-wall";
import { GuideBody } from "./guide-body";
import { safeMediaUrl } from "../../lib/guide-media-policy";
import { useSiteRuntime } from "../site-runtime";
export default function GuideSubmission({
  onClose,
}: {
  onClose: () => void;
}) {
  const runtime = useSiteRuntime();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StrategySubmission>({
      title: "",
      content: "",
      author: "",
      category: "PVE",
      difficulty: 1,
      tags: [],
      mediaFiles: [],
    }),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [mediaUrl, setMediaUrl] = useState(""),
    [mediaType, setMediaType] = useState<"image" | "video">("image");
  function field<K extends keyof StrategySubmission>(
    key: K,
    value: StrategySubmission[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="投稿攻略"
      size="xl"
      legacy={false}
    >
      <div className="guide-submission">
        <p className="paper-notice" role="status">
          {runtime ? "保存到本人合成草稿；随后提交，由独立审核员审核。" : "投稿正在安全升级。可以编辑、预览并复制本次草稿。"}
        </p>
        <button
          className="paper-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "继续编辑" : "预览正文"}
        </button>
        {error && (
          <p role="alert" className="paper-notice error">
            {error}
          </p>
        )}
        {preview ? (
          <section className="guide-body-preview">
            <h2>{form.title || "尚未填写标题"}</h2>
            <GuideBody content={form.content || "尚未填写正文"} />
          </section>
        ) : (
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (!runtime?.canWrite || saving) return;
            setSaving(true); setError("");
            try { await runtime.saveGuide(form); onClose(); }
            catch { setError("保存未完成，原草稿已保留。重试将核对原请求。"); }
            finally { setSaving(false); }
          }}>
            <label className="paper-label" htmlFor="guide-title">
              攻略标题
            </label>
            <input
              id="guide-title"
              className="paper-input"
              value={form.title}
              maxLength={100}
              required
              onChange={(e) => field("title", e.target.value)}
            />
            <label className="paper-label" htmlFor="guide-author">
              作者署名
            </label>
            <input
              id="guide-author"
              className="paper-input"
              value={runtime ? runtime.displayName : form.author}
              readOnly={Boolean(runtime)}
              maxLength={40}
              required
              onChange={(e) => field("author", e.target.value)}
            />
            <div className="guide-form-pair">
              <label>
                分类
                <select
                  className="paper-input"
                  value={form.category}
                  onChange={(e) =>
                    field("category", e.target.value as StrategyCategory)
                  }
                >
                  {STRATEGY_CONFIG.CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                难度
                <select
                  className="paper-input"
                  value={form.difficulty}
                  onChange={(e) => field("difficulty", Number(e.target.value))}
                >
                  {STRATEGY_CONFIG.DIFFICULTIES.map((d) => (
                    <option key={d.level} value={d.level}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="paper-label" htmlFor="guide-content">
              攻略正文
            </label>
            <textarea
              id="guide-content"
              className="paper-input"
              rows={12}
              maxLength={10000}
              required
              value={form.content}
              onChange={(e) => field("content", e.target.value)}
            />
            <p className="paper-muted">
              支持 # 标题、**重点**、`代码`和列表文字；HTML按纯文字显示。
            </p>
            <label className="paper-label" htmlFor="guide-tags">
              标签（逗号分隔，最多10个）
            </label>
            <input
              id="guide-tags"
              className="paper-input"
              value={form.tags.join(",")}
              onChange={(e) =>
                field("tags", e.target.value.split(",").slice(0, 10))
              }
            />
            <fieldset className="guide-media-input">
              <legend>附加媒体（选填）</legend>
              <p className="paper-muted">
                填写已公开的图片或视频链接。本原型不提供云端文件上传。本站和MDN示例来源的视频可内嵌，其他HTTPS视频提供原站打开入口。
              </p>
              <label className="paper-label" htmlFor="media-url">
                媒体URL
              </label>
              <input
                id="media-url"
                className="paper-input"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                type="url"
              />
              <label>
                媒体类型
                <select
                  className="paper-input"
                  value={mediaType}
                  onChange={(e) =>
                    setMediaType(e.target.value as "image" | "video")
                  }
                >
                  <option value="image">图片</option>
                  <option value="video">视频</option>
                </select>
              </label>
              <button
                type="button"
                className="paper-button"
                onClick={() => {
                  if (!mediaUrl || !safeMediaUrl(mediaUrl)) {
                    setError("请填写有效的HTTP(S)媒体链接。");
                    return;
                  }
                  if ((form.mediaFiles?.length || 0) >= 10) {
                    setError("最多10个媒体。");
                    return;
                  }
                  field("mediaFiles", [
                    ...(form.mediaFiles || []),
                    {
                      id: crypto.randomUUID(),
                      title: `媒体 ${(form.mediaFiles?.length || 0) + 1}`,
                      type: mediaType,
                      url: mediaUrl,
                    },
                  ]);
                  setMediaUrl("");
                }}
              >
                添加媒体链接
              </button>
              <ul>
                {form.mediaFiles?.map((m) => (
                  <li key={m.id}>
                    {m.title}
                    <button
                      type="button"
                      className="paper-text-button"
                      onClick={() =>
                        field(
                          "mediaFiles",
                          form.mediaFiles?.filter((item) => item.id !== m.id),
                        )
                      }
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
            <button className="paper-button yellow" disabled={!runtime?.canWrite || saving}>{runtime ? (saving ? "保存中…" : "保存本人草稿") : "投稿暂未开放"}</button>
          </form>
        )}
      </div>
    </Modal>
  );
}
