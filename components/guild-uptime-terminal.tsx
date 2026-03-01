"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { guildTerminalConfig } from "../lib/guild-terminal-config"
import {
  buildCyberHash,
  calculateRuntime,
  formatRuntime,
  getSecurityClearance,
  getUnlockedMilestones,
  parseDateStrict,
} from "../lib/guild-terminal-utils"
import styles from "./guild-uptime-terminal.module.css"

const SEARCH_DELAY_MS = 500

type QueryMode = "none" | "member" | "date"

interface QueryProfile {
  mode: QueryMode
  memberId: string | null
  memberName: string | null
  joinDate: string | null
  badges: string[]
}

const INITIAL_PROFILE: QueryProfile = {
  mode: "none",
  memberId: null,
  memberName: null,
  joinDate: null,
  badges: [],
}

export function GuildUptimeTerminal() {
  const [now, setNow] = useState(() => new Date())
  const [queryValue, setQueryValue] = useState("")
  const [inputFocused, setInputFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [lookupHint, setLookupHint] = useState("输入工号或入会日期（YYYY-MM-DD），按 Enter 查询")
  const [profile, setProfile] = useState<QueryProfile>(INITIAL_PROFILE)

  const guildStartDate = useMemo(
    () => parseDateStrict(guildTerminalConfig.guildFoundedDate) ?? new Date(Date.UTC(2018, 1, 10, 0, 0, 0, 0)),
    [],
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const guildRuntime = useMemo(() => calculateRuntime(guildStartDate, now), [guildStartDate, now])

  const memberRuntime = useMemo(() => {
    if (!profile.joinDate) {
      return null
    }
    const start = parseDateStrict(profile.joinDate)
    return start ? calculateRuntime(start, now) : null
  }, [now, profile.joinDate])

  const clearance = useMemo(() => {
    if (!profile.memberId || !memberRuntime) {
      return null
    }
    return getSecurityClearance(
      profile.memberId,
      memberRuntime.years,
      guildTerminalConfig.founderMemberId,
      guildTerminalConfig.founderClearance,
      guildTerminalConfig.securityClearanceRules,
    )
  }, [memberRuntime, profile.memberId])

  const unlockedMilestones = useMemo(() => {
    if (!profile.memberId || !profile.joinDate) {
      return []
    }
    return getUnlockedMilestones(profile.joinDate, guildTerminalConfig.milestones)
  }, [profile.joinDate, profile.memberId])

  const cyberHash = useMemo(() => {
    if (!profile.memberId || !profile.joinDate) {
      return "ID-NULL-00000000-0000"
    }
    return buildCyberHash(profile.memberId, profile.joinDate)
  }, [profile.joinDate, profile.memberId])

  const isFounderMode = profile.memberId === guildTerminalConfig.founderMemberId

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSearching) {
      return
    }

    const input = queryValue.trim()
    if (!input) {
      setLookupHint("请输入工号或入会日期（YYYY-MM-DD）")
      setProfile(INITIAL_PROFILE)
      return
    }

    setIsSearching(true)
    setLookupHint("数据检索中...")

    window.setTimeout(() => {
      const matchedMember = guildTerminalConfig.members[input]

      if (matchedMember) {
        const joinAt = parseDateStrict(matchedMember.joinDate)
        if (!joinAt || joinAt.getTime() > now.getTime()) {
          setLookupHint("成员档案日期异常，请检查配置文件")
          setProfile(INITIAL_PROFILE)
          setIsSearching(false)
          return
        }

        setProfile({
          mode: "member",
          memberId: input,
          memberName: matchedMember.name,
          joinDate: matchedMember.joinDate,
          badges: matchedMember.badges || [],
        })

        if (input === guildTerminalConfig.founderMemberId) {
          setLookupHint("创始人档案已载入：致敬创始人")
        } else {
          setLookupHint(`成员档案已载入：${matchedMember.name}（工号 ${input}）`)
        }
        setIsSearching(false)
        return
      }

      const parsedDate = parseDateStrict(input)
      if (parsedDate) {
        if (parsedDate.getTime() > now.getTime()) {
          setLookupHint("入会日期不能晚于当前时间")
          setProfile(INITIAL_PROFILE)
          setIsSearching(false)
          return
        }

        setProfile({
          mode: "date",
          memberId: null,
          memberName: null,
          joinDate: input,
          badges: [],
        })
        setLookupHint(`已按日期 ${input} 进行测算（未绑定工号）`)
        setIsSearching(false)
        return
      }

      setProfile(INITIAL_PROFILE)
      setLookupHint("系统档案中未找到该工号，请直接输入入会日期(YYYY-MM-DD)进行测算")
      setIsSearching(false)
    }, SEARCH_DELAY_MS)
  }

  return (
    <aside className={styles.terminalRoot} aria-label="公会陪伴时间数据终端">
      {!isExpanded ? (
        <button
          type="button"
          className={styles.miniDock}
          onClick={() => setIsExpanded(true)}
          aria-label="展开公会数据终端"
        >
          <span className={styles.miniTitle}>公会运行时间</span>
          <span className={styles.miniTime}>{formatRuntime(guildRuntime)}</span>
          <span className={styles.miniHint}>点击展开</span>
        </button>
      ) : null}

      <section
        className={`${styles.terminalPanel} ${isExpanded ? styles.terminalPanelOpen : styles.terminalPanelClosed}`}
        aria-hidden={!isExpanded}
      >
        <header className={styles.terminalHeader}>
          <h3 className={styles.terminalTitle}>公会数据终端</h3>
          <div className={styles.headerActions}>
            <span className={styles.terminalStatus}>在线</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsExpanded(false)}
              aria-label="折叠公会数据终端"
            >
              收起
            </button>
          </div>
        </header>

        <div className={styles.runtimeBlock}>
          <div className={styles.runtimeLabel}>今夕公会已运行：</div>
          <div className={styles.runtimeValue} aria-live="polite">
            <span className={styles.runtimeNum}>{guildRuntime.years}</span>
            <span className={styles.runtimeUnit}>年</span>
            <span className={styles.runtimeNum}>{guildRuntime.days}</span>
            <span className={styles.runtimeUnit}>天</span>
            <span className={styles.runtimeNum}>{guildRuntime.hours}</span>
            <span className={styles.runtimeUnit}>小时</span>
            <span className={styles.runtimeNum}>{guildRuntime.minutes}</span>
            <span className={styles.runtimeUnit}>分</span>
            <span className={styles.runtimeNum}>{guildRuntime.seconds}</span>
            <span className={styles.runtimeUnit}>秒</span>
          </div>
          <div className={styles.runtimeFoot}>基准日期：{guildTerminalConfig.guildFoundedDate}</div>
        </div>

        <form className={styles.lookupForm} onSubmit={handleLookup}>
          <label className={styles.lookupLabel} htmlFor="guild-member-lookup">
            成员检索
          </label>
          <div className={`${styles.cliInputShell} ${inputFocused ? styles.cliInputShellFocused : ""}`}>
            <span className={styles.cliPrompt}>&gt;</span>
            <input
              id="guild-member-lookup"
              value={queryValue}
              onChange={(event) => setQueryValue(event.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              className={styles.cliInput}
              placeholder="输入工号或 YYYY-MM-DD"
              autoComplete="off"
              spellCheck={false}
            />
            <span className={`${styles.cliCursor} ${inputFocused ? styles.cliCursorVisible : ""}`} />
          </div>
        </form>

        <div className={styles.lookupHint}>{lookupHint}</div>
        {isSearching ? (
          <div className={styles.searchingRow}>
            <span className={styles.searchingDot} />
            <span className={styles.searchingText}>数据检索中...</span>
          </div>
        ) : null}

        <div className={styles.terminalGrid}>
          <section className={`${styles.primaryBlock} ${isFounderMode ? styles.primaryBlockFounder : ""}`}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>成员名称</span>
              <span className={styles.infoValue}>{profile.memberName || (profile.mode === "date" ? "临时测算" : "--")}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>安全许可级别</span>
              <span
                className={`${styles.clearanceValue} ${clearance?.tone === "warning" ? styles.clearanceWarning : styles.clearanceNormal}`}
              >
                {clearance ? `[${clearance.code}] - ${clearance.title}` : "--"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>陪伴时间</span>
              <span className={`${styles.infoValueStrong} ${isFounderMode ? styles.infoValueFounder : ""}`}>
                {memberRuntime ? formatRuntime(memberRuntime) : "--"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>入会日期</span>
              <span className={styles.infoValue}>{profile.joinDate || "--"}</span>
            </div>
          </section>

          <section className={styles.secondaryBlock}>
            <div className={styles.subSection}>
              <h4 className={styles.subTitle}>历史档案见证</h4>
              {profile.memberId ? (
                unlockedMilestones.length > 0 ? (
                  <ul className={styles.milestoneList}>
                    {unlockedMilestones.map((item) => (
                      <li key={`${item.date}-${item.event}`} className={styles.milestoneItem}>
                        <span className={styles.milestoneDate}>{item.date}</span>
                        <span className={styles.milestoneEvent}>{item.event}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyText}>暂无已解锁里程碑</div>
                )
              ) : (
                <div className={styles.emptyText}>输入有效工号后显示</div>
              )}
            </div>

            <div className={styles.subSection}>
              <h4 className={styles.subTitle}>专属勋章</h4>
              {profile.memberId ? (
                profile.badges.length > 0 ? (
                  <div className={styles.badgesWrap}>
                    {profile.badges.map((badge) => (
                      <span key={badge} className={styles.badgeItem}>
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyText}>暂无专属勋章</div>
                )
              ) : (
                <div className={styles.emptyText}>输入有效工号后显示</div>
              )}
            </div>
          </section>
        </div>

        <footer className={styles.barcodeDock}>
          <div className={styles.barcodeLines} aria-hidden />
          <div className={styles.hashText}>{cyberHash}</div>
        </footer>
      </section>
    </aside>
  )
}

