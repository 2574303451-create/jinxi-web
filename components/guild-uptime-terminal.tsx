"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { guildTerminalConfig } from "../lib/guild-terminal-config";
import {
  resolveGuildLookup,
  type GuildLookupResult,
} from "../lib/guild-terminal-utils";
import { useElementActivity } from "../hooks/use-element-activity";
import { GuildRuntimeClock } from "./guild-time/runtime-clock";
import { ArchiveRecord } from "./guild-time/archive-record";
import styles from "./guild-uptime-terminal.module.css";

const errors = {
  empty: "请输入工号、昵称或入会日期（YYYY-MM-DD）。",
  future: "入会日期不能晚于今天，请检查后重新查询。",
  "invalid-date": "这个日期无效，请使用 YYYY-MM-DD 格式并检查年月日。",
  "invalid-record": "这份档案的入会日期暂不可用，请联系公会核对。",
  "not-found": "没有找到对应工号或昵称。你也可以直接输入入会日期测算。",
};

export function GuildUptimeTerminal() {
  const root = useRef<HTMLElement>(null);
  const { active } = useElementActivity(root);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GuildLookupResult | null>(null);
  const id = useId();
  const hint = !result
    ? "支持工号、昵称，或 YYYY-MM-DD 日期。"
    : result.kind === "error"
      ? errors[result.reason]
      : result.kind === "date"
        ? `已按 ${result.joinDate} 测算，未绑定成员档案。`
        : `已找到 ${result.profile.name} 的档案（${result.matchedBy === "nickname" ? "昵称" : "工号"}匹配）。`;
  function lookup(event: FormEvent) {
    event.preventDefault();
    setResult(resolveGuildLookup(query, guildTerminalConfig.members));
  }
  return (
    <aside
      id="guild-time-anchor"
      ref={root}
      className={styles.timeRoot}
      aria-label="今夕同行时光"
      data-guild-time
      data-active={active}
    >
      <header className={styles.summary}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <CalendarDays size={26} aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${id}-title`}>今夕 · 同行时光</h2>
            <p>从档案起点 {guildTerminalConfig.guildFoundedDate} 开始</p>
          </div>
        </div>
        <button
          className={`paper-button ${styles.toggleButton}`}
          type="button"
          aria-label={expanded ? "收起同行时光" : "展开同行时光"}
          aria-expanded={expanded}
          aria-controls={expanded ? `${id}-content` : undefined}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起" : "展开"}
          <ChevronDown
            size={17}
            className={expanded ? styles.chevronOpen : undefined}
          />
        </button>
        {!expanded && <GuildRuntimeClock active={active} compact />}
      </header>
      {expanded && (
        <section
          id={`${id}-content`}
          className={styles.content}
          aria-labelledby={`${id}-title`}
        >
          <div className={styles.overview}>
            <div>
              <GuildRuntimeClock active={active} />
              <p className={styles.clockCaption}>每一段同行，都值得被记住。</p>
            </div>
            <form className={styles.lookupForm} onSubmit={lookup}>
              <label className="paper-label" htmlFor="guild-member-lookup">
                查找你的同行记录
              </label>
              <div className={styles.lookupActions}>
                <input
                  id="guild-member-lookup"
                  className="paper-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="工号、昵称或 YYYY-MM-DD"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={`${id}-hint`}
                  aria-invalid={result?.kind === "error"}
                />
                <button type="submit" className="paper-button yellow">
                  <Search size={17} />
                  查询
                </button>
              </div>
              <p
                id={`${id}-hint`}
                role="status"
                className={`${styles.lookupHint} ${result?.kind === "error" ? styles.lookupError : ""}`}
              >
                {hint}
              </p>
            </form>
          </div>
          <ArchiveRecord result={result} active={active} />
          <p className={styles.sourceNote}>
            创立日与历史条目沿用现有公会档案，尚待公会确认。此处记录不代表实时在线状态。
          </p>
        </section>
      )}
    </aside>
  );
}
