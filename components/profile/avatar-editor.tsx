"use client";
import { useEffect, useRef, useState } from "react";
import {
  decodeAvatar,
  drawAvatar,
  encodeAvatar,
  type AvatarImage,
} from "../../lib/avatar-crop";
export function AvatarEditor({
  onSave,
  onReset,
}: {
  onSave: (blob: Blob) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [image, setImage] = useState<AvatarImage | null>(null),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      image?.bitmap.close();
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  useEffect(() => {
    if (canvas.current && image) drawAvatar(canvas.current, image, 1, x, y);
  }, [image, x, y]);
  async function choose(file?: File) {
    if (!file) return;
    const version = ++request.current;
    setError("");
    try {
      const next = await decodeAvatar(file);
      if (version !== request.current) {
        next.bitmap.close();
        URL.revokeObjectURL(next.url);
        return;
      }
      setImage(next);
      setX(50);
      setY(50);
    } catch (e) {
      if (version === request.current) setError((e as Error).message);
    }
  }
  return (
    <section className="avatar-editor">
      <h2>换一张喜欢的头像</h2>
      <p className="paper-muted">
        JPEG / PNG / WebP ·
        2MB以内。默认居中填满头像框，处理为128px小图，仅保存在这台浏览器的隔离测试存储。
      </p>
      <label className="paper-label" htmlFor="avatar-file">
        选择头像图片
      </label>
      <input
        id="avatar-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {image && (
        <div className="avatar-crop-layout">
          <canvas
            ref={canvas}
            width={128}
            height={128}
            role="img"
            aria-label="头像裁剪预览"
          />
          <details>
            <summary>调整位置（选填）</summary>
            {(
              [
                ["水平位置", x, setX, 0, 100, 1],
                ["垂直位置", y, setY, 0, 100, 1],
              ] as const
            ).map(([label, value, setter, min, max, step]) => (
              <label key={label}>
                {label}
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                />
              </label>
            ))}
          </details>
        </div>
      )}
      {error && (
        <p role="alert" className="paper-notice error">
          {error}
        </p>
      )}
      <div className="profile-controls">
        <button
          className="paper-button yellow"
          disabled={!image || busy}
          onClick={async () => {
            if (!canvas.current) return;
            setBusy(true);
            setError("");
            try {
              await onSave(await encodeAvatar(canvas.current));
              setImage(null);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "正在处理…" : "保存到隔离测试存储"}
        </button>
        <button
          className="paper-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onReset();
              setImage(null);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          恢复默认头像
        </button>
      </div>
    </section>
  );
}
