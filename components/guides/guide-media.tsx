"use client";
import { useState } from "react";
import type { MediaFile } from "../../types/strategy-wall";
import { Modal } from "../ui/modal";
import { ContentImage } from "../ui/content-image";
import { safeMediaUrl } from "../../lib/guide-media-policy";
import { GuideVideo } from "./guide-video";
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
                <GuideVideo
                  url={item.url}
                  title={item.title}
                  poster={item.thumbnail}
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
