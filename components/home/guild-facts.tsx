"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Users,
  Wifi,
} from "lucide-react";
import facts from "../../lib/guild-home-facts.json";
import {
  calculateRuntime,
  parseDateStrict,
} from "../../lib/guild-terminal-utils";
import { useElementActivity } from "../../hooks/use-element-activity";
import styles from "./guild-facts.module.css";

export function GuildFacts() {
  const root = useRef<HTMLElement>(null),
    { active } = useElementActivity(root);
  const [now, setNow] = useState<Date | null>(null),
    [methods, setMethods] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timer: number;
    const refresh = () => {
      const date = new Date();
      setNow(date);
      const next = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
      );
      timer = window.setTimeout(refresh, next - date.getTime() + 50);
    };
    refresh();
    return () => clearTimeout(timer);
  }, [active]);
  const start = parseDateStrict(facts.foundedDate),
    runtime = start && now ? calculateRuntime(start, now) : null;
  return (
    <section
      ref={root}
      className={`guild-shell ${styles.section}`}
      aria-labelledby="guild-facts-title"
      id="guild-facts"
    >
      <div className={styles.heading}>
        <span className="guild-badge">今夕 · 一路同行</span>
        <h2 id="guild-facts-title">把相遇，写进公会的每一天。</h2>
        <p>有据可查的档案，和正在积累的故事。</p>
      </div>
      <div className={styles.grid}>
        <a className={styles.fact} href="#members">
          <Users size={20} aria-hidden="true" />
          <span className={styles.value}>
            {facts.archiveCount}
            <small>份</small>
          </span>
          <strong>成员档案</strong>
          <span>按唯一档案编号收录</span>
          <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
        </a>
        <a
          className={styles.fact}
          href="#online-status"
          onClick={() => setMethods(true)}
        >
          <Wifi size={20} aria-hidden="true" />
          <span
            className={`${styles.value} ${styles.pending}`}
            aria-label="在线人数尚未接入"
          >
            —
          </span>
          <strong>当前在线登录成员</strong>
          <span>统计接入中 · 查看说明</span>
          <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
        </a>
        <a className={styles.fact} href="#guild-time-anchor">
          <CalendarDays size={20} aria-hidden="true" />
          <span className={`${styles.value} ${styles.time}`} aria-live="off">
            {runtime ? (
              <>
                <span>
                  {runtime.years}
                  <small>年</small>
                </span>
                <span>
                  {runtime.days}
                  <small>天</small>
                </span>
              </>
            ) : (
              "—"
            )}
          </span>
          <strong>公会同行时长</strong>
          <span>始于 {facts.foundedDate}</span>
          <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
        </a>
        <a className={styles.fact} href="/guides/">
          <BookOpen size={20} aria-hidden="true" />
          <span
            className={`${styles.value} ${styles.pending}`}
            aria-label="攻略视频总数尚未核实"
          >
            —
          </span>
          <strong>已收录攻略视频</strong>
          <span>公开攻略视频索引接入中</span>
          <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
        </a>
      </div>
      <details
        id="online-status"
        className={styles.methods}
        open={methods}
        onToggle={(e) => setMethods(e.currentTarget.open)}
      >
        <summary>数字从哪里来？</summary>
        <div className={styles.sources}>
          <p>
            <strong>档案</strong>：{facts.archiveCount}个唯一编号，含
            {facts.founderCount}位创始成员、{facts.ordinaryCount}
            条普通成员档案。不是当前在会或实时活跃人数。配置记录更新于
            {facts.sourceUpdatedAt.slice(0, 10)}，随构建核对。
          </p>
          <p>
            <strong>在线</strong>
            ：定义为已登录今夕账号且仍停留本站的成员。可信服务器会话与心跳尚未接入，暂不计数，也不读取本地账号推算。
          </p>
          <p>
            <strong>时长</strong>
            ：复用同行时光的创立日期与计算方法，按UTC日期显示年、天；可见时按日更新。
            {now
              ? `截至 ${now.toISOString().slice(0, 10)}。`
              : "等待页面可见后核对日期。"}
          </p>
          <p>
            <strong>视频</strong>
            ：未来只聚合published攻略中type=video的条目，不包含首页宣传片。服务端聚合尚未接入，本页不根据少量卡片推算全站总数。
          </p>
        </div>
      </details>
    </section>
  );
}
