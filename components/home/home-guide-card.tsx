"use client";
import { useState } from "react";
import { ArrowUpRight, BookOpen, Play } from "lucide-react";
import type { HomeGuide } from "../../services/home-guides";
import styles from "./featured-guides.module.css";
export function HomeGuideCard({ guide }: { guide: HomeGuide }) {
  const [failed, setFailed] = useState(false);
  return (
    <a
      className={styles.card}
      href={`/guides/?id=${encodeURIComponent(guide.id)}`}
      data-home-guide={guide.id}
    >
      <div className={styles.cover}>
        {guide.image && !failed ? (
          <img
            src={guide.image}
            alt=""
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <BookOpen size={36} aria-hidden="true" />
            <span>今夕 · 攻略笔记</span>
            <small>{failed ? "封面暂不可用" : "原文暂无封面"}</small>
          </div>
        )}
        <span className={styles.category}>{guide.category}</span>
        {guide.hasVideo && (
          <span className={styles.video}>
            <Play size={14} fill="currentColor" aria-hidden="true" />
            含视频
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          {guide.isPinned ? (
            <span className="paper-tag yellow">置顶</span>
          ) : (
            <span>公开攻略</span>
          )}
          {guide.updatedAt && (
            <time dateTime={guide.updatedAt}>
              {guide.updatedAt.slice(0, 10)}
            </time>
          )}
        </div>
        <h3>{guide.title}</h3>
        <p>{guide.excerpt || "这篇攻略暂未提供摘要，进入原文阅读。"}</p>
        {!!guide.tags.length && (
          <div className={styles.tags}>
            {guide.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
        <div className={styles.author}>未认证署名 · {guide.author}</div>
        <footer>
          <span>
            {guide.views !== null && `${guide.views} 浏览`}
            {guide.views !== null && guide.comments !== null ? " · " : ""}
            {guide.comments !== null && `${guide.comments} 评论`}
          </span>
          <span>
            读攻略
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </footer>
      </div>
    </a>
  );
}
