"use client";
import { useEffect, useState } from "react";
import { canEmbedVideo, safeMediaUrl } from "../../lib/guide-media-policy";
export function GuideVideo({
  url,
  title,
  poster,
}: {
  url: string;
  title: string;
  poster?: string;
}) {
  const [base, setBase] = useState<string>(),
    [failed, setFailed] = useState(false);
  useEffect(() => setBase(location.origin), []);
  useEffect(() => setFailed(false), [url]);
  const safe = safeMediaUrl(url),
    external = safe && /^https?:\/\//i.test(safe);
  if (!safe)
    return (
      <p className="paper-notice error">
        视频链接无效或仅为已失效的本地预览，无法播放。
      </p>
    );
  const allowed = base && canEmbedVideo(safe, base);
  return (
    <div className="guide-video">
      {allowed && !failed ? (
        <video
          controls
          playsInline
          preload="none"
          src={safe}
          poster={(poster && safeMediaUrl(poster)) || undefined}
          aria-label={title}
          onError={() => setFailed(true)}
        />
      ) : (
        <p className="paper-muted" role={failed ? "status" : undefined}>
          {failed
            ? "视频暂时无法播放，请稍后重试或在原站打开。"
            : base
              ? "该视频来源不在本站的内嵌允许列表中。"
              : "正在检查视频来源…"}
        </p>
      )}
      {external && (
        <a
          className="paper-text-button"
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
        >
          在原站打开视频 ↗
        </a>
      )}
      {failed && allowed && (
        <button className="paper-button" onClick={() => setFailed(false)}>
          重试视频
        </button>
      )}
    </div>
  );
}
