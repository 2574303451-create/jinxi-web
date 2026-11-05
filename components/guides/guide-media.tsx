"use client";
import { useState } from "react";
import type { MediaFile } from "../../types/strategy-wall";
import { Modal } from "../ui/modal";
import { ContentImage } from "../ui/content-image";
export function safeMediaUrl(value: string) {
  // Preserve legacy inline raster/video media without accepting executable SVG/HTML URLs.
  if (/^data:(?:image\/(?:jpeg|png|gif|webp)|video\/(?:mp4|webm|quicktime|x-msvideo));base64,[a-z\d+/=\s]+$/i.test(value)) return value;
  try {
    const url = new URL(value, "https://local.invalid");
    return ["http:", "https:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}
export function GuideMedia({
  items,
  cover,
}: {
  items: MediaFile[];
  cover?: string;
}) {
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const all = items?.length
    ? items
    : cover
      ? [{ id: "cover", type: "image" as const, url: cover, title: "攻略配图" }]
      : [];
  if (!all.length) return null;
  return (
    <section className="guide-media">
      <h2>配图与演示</h2>
      <div>
        {all.map((item) => (
          <figure key={item.id}>
            {safeMediaUrl(item.url) ? (
              item.type === "video" ? (
                <video
                  controls
                  preload="none"
                  src={item.url}
                  poster={
                    (item.thumbnail && safeMediaUrl(item.thumbnail)) ||
                    undefined
                  }
                  aria-label={item.title}
                />
              ) : (
                <button
                  onClick={() => setPreview(item)}
                  aria-label={`预览 ${item.title}`}
                >
                  <ContentImage src={item.url} alt={item.title} />
                </button>
              )
            ) : (
              <p className="paper-notice error">媒体地址不可用</p>
            )}
            <figcaption>{item.title}</figcaption>
          </figure>
        ))}
      </div>
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title="攻略配图"
        size="xl"
        legacy={false}
      >
        {preview && <ContentImage src={preview.url} alt={preview.title} />}
      </Modal>
    </section>
  );
}
