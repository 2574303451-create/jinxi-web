"use client";

import { GuildImage } from "./guild-image";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Gamepad2,
  Play,
  Users,
} from "lucide-react";

export function GuildHero({
  onJoin,
  onActions,
}: {
  onJoin: () => void;
  onActions: () => void;
}) {
  const [audience, setAudience] = useState<"new" | "member">("new");
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = async () => {
    const player = videoRef.current;
    if (!player) return;
    setVideoLoading(true);
    const timeout = window.setTimeout(() => {
      if (player.readyState < 2) {
        player.pause();
        setVideoFailed(true);
        setPlaying(false);
      }
    }, 8000);
    try {
      player.load();
      await player.play();
    } catch {
      setVideoFailed(true);
      setPlaying(false);
    } finally {
      window.clearTimeout(timeout);
      setVideoLoading(false);
    }
  };

  return (
    <section id="top" className="guild-hero dot-pattern">
      <span className="hero-geometry circle" aria-hidden="true" />
      <span className="hero-geometry square" aria-hidden="true" />
      <div className="guild-shell hero-content">
        <a className="hero-pill" href="#community">
          <b>DDT</b>
          <span>
            弹弹堂 · 今夕公会，
            <br className="mobile-only" />
            把下一局留给好伙伴
          </span>
          <ArrowRight size={18} />
        </a>
        <h1>
          今晚开黑，<span>星光作陪。</span>
        </h1>
        <p className="hero-subtitle">
          组队、交流、分享高光，和志同道合的伙伴一起玩。
        </p>
        <div className="audience-switch" role="group" aria-label="选择浏览入口">
          <button
            aria-pressed={audience === "new"}
            onClick={() => setAudience("new")}
          >
            <Users size={20} />
            初次见面
          </button>
          <button
            aria-pressed={audience === "member"}
            onClick={() => setAudience("member")}
          >
            <Gamepad2 size={21} />
            公会成员
          </button>
        </div>
        <div className="hero-game-art">
          <div className="game-print print-back" aria-hidden="true">
            <GuildImage src="/14.png" alt="" />
          </div>
          <div className="game-print print-front">
            <GuildImage src="/13.png" alt="今夕成员的弹弹堂游戏角色展示" />
            <span>今夕 · 我们的游戏时光</span>
          </div>
          <GuildImage
            className="hero-logo-sticker"
            src="/logo.png"
            alt=""
            width={80}
            height={80}
          />
          <span className="game-label">JINXI GUILD</span>
        </div>
        <div className="hero-context" aria-live="polite">
          {audience === "new" ? (
            <>
              <span className="context-arrow" aria-hidden="true">
                <ArrowRight />
              </span>
              <span>来认识一下，和你同频的队友。</span>
            </>
          ) : (
            <button onClick={onActions}>
              <span className="context-arrow" aria-hidden="true">
                <ArrowRight />
              </span>
              签到、任务与积分，从这里开始
            </button>
          )}
        </div>
        <div className="hero-tags" aria-label="公会内容快捷入口">
          <a href="#about">公会介绍</a>
          <a href="#management">管理团队</a>
          <a href="#members">成员展示</a>
          <a href="#community">活动公告</a>
        </div>
        <div className="hero-cta">
          <button className="guild-button dark" onClick={onJoin}>
            <Gamepad2 size={19} />
            加入今夕
          </button>
          <a className="guild-button" href="#about">
            <BookOpen size={19} />
            认识公会
          </a>
        </div>
        <div className="hero-values">
          <div>
            <b>以战会友</b>
            <span>认真配合每一局</span>
          </div>
          <div>
            <b>分享经验</b>
            <span>一起研究新打法</span>
          </div>
          <div>
            <b>找到伙伴</b>
            <span>为默契留个位置</span>
          </div>
          <div>
            <b>记录高光</b>
            <span>收藏并肩的时刻</span>
          </div>
        </div>
        <div className="guild-video-invitation">
          <details className="guild-video">
            <summary>
              <Play size={15} />
              看看今夕的游戏影像 <ArrowDown size={14} />
            </summary>
            <div className="video-frame">
              {!videoFailed && (
                <video
                  ref={videoRef}
                  src="/1.mp4"
                  poster="/bg.png"
                  preload="none"
                  playsInline
                  controls={playing}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => setVideoFailed(true)}
                />
              )}
              {videoFailed && (
                <>
                  <GuildImage src="/bg.png" alt="公会影像封面" />
                  <p role="status">视频暂不可用，已显示封面。</p>
                </>
              )}
              {!playing && !videoFailed && (
                <button
                  onClick={play}
                  disabled={videoLoading}
                  className="guild-button"
                  aria-label="播放公会视频"
                >
                  <Play size={16} />
                  {videoLoading ? "影像加载中…" : "播放影像"}
                </button>
              )}
            </div>
          </details>
          <span className="guild-video-cue" aria-hidden="true">
            <span className="guild-video-cue-label">看看我们的高光！</span>
            <svg
              className="guild-video-cue-curve"
              viewBox="0 0 165 68"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M140 2 C178 43 125 72 78 49 C45 30 17 20 5 30 M14 19 L5 30 L19 34" />
              <path d="M140 2 C178 43 125 72 78 49 C45 30 17 20 5 30 M14 19 L5 30 L19 34" />
            </svg>
            <svg
              className="guild-video-cue-compact"
              viewBox="0 0 60 40"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M45 3 C13 2 8 27 34 32 M25 23 L34 32 L21 34" />
              <path d="M45 3 C13 2 8 27 34 32 M25 23 L34 32 L21 34" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  );
}
