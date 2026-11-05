"use client";

import { useEffect, useRef, useState } from "react";
import { useElementActivity } from "../../hooks/use-element-activity";
import { guildTerminalConfig } from "../../lib/guild-terminal-config";
import {
  calculateRuntime,
  getSecurityClearance,
  parseDateStrict,
  type RuntimeParts,
} from "../../lib/guild-terminal-utils";
import styles from "../guild-uptime-terminal.module.css";

function useVisibleTime(active: boolean, interval: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(timer);
  }, [active, interval]);
  return now;
}

function RuntimeReadout({ parts }: { parts: RuntimeParts }) {
  const values = [
    [parts.years, "年"],
    [parts.days, "天"],
    [parts.hours, "小时"],
    [parts.minutes, "分"],
    [parts.seconds, "秒"],
  ] as const;
  return (
    <div className={styles.clockGrid}>
      {values.map(([value, unit]) => (
        <span key={unit} className={styles.clockCell}>
          <strong>
            {String(value).padStart(
              unit === "年" || unit === "天" ? 1 : 2,
              "0",
            )}
          </strong>
          <span>{unit}</span>
        </span>
      ))}
    </div>
  );
}

export function GuildRuntimeClock({
  active,
  compact = false,
}: {
  active: boolean;
  compact?: boolean;
}) {
  const clock = useRef<HTMLDivElement>(null);
  const ownActivity = useElementActivity(clock);
  const ticking = active && ownActivity.active;
  const now = useVisibleTime(ticking, compact ? 60_000 : 1000);
  const start = parseDateStrict(guildTerminalConfig.guildFoundedDate);
  if (!start) return <span className="paper-muted">档案日期暂不可用</span>;
  const parts = calculateRuntime(start, now);
  return (
    <div
      ref={clock}
      className={compact ? styles.compactTime : styles.clockPanel}
      role="timer"
      aria-live="off"
      aria-label="公会同行时长"
      data-time-clock={compact ? "compact" : "guild"}
      data-ticking={ticking}
    >
      {compact ? (
        <>
          <span>已相伴</span>
          <strong>
            {parts.years}
            <small>年</small> {parts.days}
            <small>天</small>
          </strong>
        </>
      ) : (
        <>
          <span className="paper-eyebrow">我们一起走过</span>
          <RuntimeReadout parts={parts} />
        </>
      )}
    </div>
  );
}

export function MemberRuntimeClock({
  joinDate,
  memberId,
  active,
}: {
  joinDate: string;
  memberId?: string;
  active: boolean;
}) {
  const clock = useRef<HTMLDivElement>(null);
  const ownActivity = useElementActivity(clock);
  const ticking = active && ownActivity.active;
  const now = useVisibleTime(ticking, 1000);
  const start = parseDateStrict(joinDate);
  if (!start) return <p className="paper-muted">入会日期暂不可用</p>;
  const parts = calculateRuntime(start, now);
  const stage = memberId
    ? getSecurityClearance(
        memberId,
        parts.years,
        guildTerminalConfig.founderMemberId,
        guildTerminalConfig.founderClearance,
        guildTerminalConfig.securityClearanceRules,
      )
    : null;
  return (
    <div className={styles.memberTime}>
      <div
        ref={clock}
        role="timer"
        aria-live="off"
        aria-label="成员相伴时长"
        data-time-clock="member"
        data-ticking={ticking}
      >
        <RuntimeReadout parts={parts} />
      </div>
      {stage && (
        <p className={styles.memberStage}>
          <span>陪伴印记</span>
          <span className="paper-tag yellow">{stage.title}</span>
          <small>{stage.code}</small>
        </p>
      )}
    </div>
  );
}
