import rawConfig from "../config/guild-terminal.config.json"

export type ClearanceTone = "normal" | "warning"

export interface GuildMilestone {
  date: string
  event: string
}

export interface MemberProfile {
  name: string
  joinDate: string
  role?: "founder" | "member"
  badges?: string[]
}

export interface SecurityClearanceRule {
  code: string
  title: string
  minYears: number
  maxYearsExclusive?: number
  tone: ClearanceTone
}

export interface SecurityClearance {
  code: string
  title: string
  tone: ClearanceTone
}

export interface GuildTerminalConfig {
  guildFoundedDate: string
  founderMemberId: string
  milestones: GuildMilestone[]
  members: Record<string, MemberProfile>
  securityClearanceRules: SecurityClearanceRule[]
  founderClearance: SecurityClearance
}

const DEFAULT_CONFIG: GuildTerminalConfig = {
  guildFoundedDate: "2018-02-10",
  founderMemberId: "0",
  milestones: [
    { date: "2019-12-31", event: "星轨防御战 / 跨年战役" },
    { date: "2021-07-01", event: "协议扩容 / 千人建制达成" },
  ],
  members: {
    "0": {
      name: "执手问年华",
      joinDate: "2018-02-10",
      role: "founder",
      badges: ["O-01 初代机", "核心缔造者"],
    },
  },
  securityClearanceRules: [
    { code: "LEVEL 1", title: "过去的过去", minYears: 0, maxYearsExclusive: 1, tone: "normal" },
    { code: "LEVEL 3", title: "过去", minYears: 1, maxYearsExclusive: 3, tone: "normal" },
    { code: "LEVEL 5", title: "现在", minYears: 3, maxYearsExclusive: 5, tone: "normal" },
    { code: "LEVEL 7", title: "未来", minYears: 5, tone: "normal" },
  ],
  founderClearance: {
    code: "OMEGA LEVEL",
    title: "今夕",
    tone: "warning",
  },
}

function isValidDateText(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeTone(value: unknown, fallback: ClearanceTone): ClearanceTone {
  return value === "warning" ? "warning" : fallback
}

function normalizeMilestones(value: unknown, fallback: GuildMilestone[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const date = (item as { date?: unknown }).date
      const event = (item as { event?: unknown }).event
      if (!isValidDateText(date) || typeof event !== "string" || !event.trim()) {
        return null
      }
      return { date, event: event.trim() }
    })
    .filter((item): item is GuildMilestone => item !== null)

  return normalized.length > 0 ? normalized : fallback
}

function normalizeMembers(value: unknown, fallback: Record<string, MemberProfile>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const normalizedEntries = entries
    .map(([memberId, rawMember]) => {
      if (!rawMember || typeof rawMember !== "object" || Array.isArray(rawMember)) {
        return null
      }

      const name = (rawMember as { name?: unknown }).name
      const joinDate = (rawMember as { joinDate?: unknown }).joinDate
      const role = (rawMember as { role?: unknown }).role
      const badgesRaw = (rawMember as { badges?: unknown }).badges

      if (typeof name !== "string" || !name.trim() || !isValidDateText(joinDate)) {
        return null
      }

      const badges = Array.isArray(badgesRaw)
        ? badgesRaw.filter((badge): badge is string => typeof badge === "string" && badge.trim().length > 0)
        : undefined

      return [
        memberId,
        {
          name: name.trim(),
          joinDate,
          role: role === "founder" ? "founder" : "member",
          badges,
        } satisfies MemberProfile,
      ] as const
    })
    .filter((item): item is readonly [string, MemberProfile] => item !== null)

  if (normalizedEntries.length === 0) {
    return fallback
  }

  return Object.fromEntries(normalizedEntries)
}

function normalizeRules(value: unknown, fallback: SecurityClearanceRule[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const code = (item as { code?: unknown }).code
      const title = (item as { title?: unknown }).title
      const minYears = (item as { minYears?: unknown }).minYears
      const maxYearsExclusive = (item as { maxYearsExclusive?: unknown }).maxYearsExclusive
      const tone = normalizeTone((item as { tone?: unknown }).tone, "normal")

      if (typeof code !== "string" || !code.trim() || typeof title !== "string" || !title.trim() || typeof minYears !== "number") {
        return null
      }

      if (maxYearsExclusive !== undefined && typeof maxYearsExclusive !== "number") {
        return null
      }

      return {
        code: code.trim(),
        title: title.trim(),
        minYears,
        maxYearsExclusive,
        tone,
      } satisfies SecurityClearanceRule
    })
    .filter((item): item is SecurityClearanceRule => item !== null)
    .sort((a, b) => a.minYears - b.minYears)

  return normalized.length > 0 ? normalized : fallback
}

function normalizeFounderClearance(value: unknown, fallback: SecurityClearance): SecurityClearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback
  }

  const code = (value as { code?: unknown }).code
  const title = (value as { title?: unknown }).title
  const tone = normalizeTone((value as { tone?: unknown }).tone, fallback.tone)

  if (typeof code !== "string" || !code.trim() || typeof title !== "string" || !title.trim()) {
    return fallback
  }

  return {
    code: code.trim(),
    title: title.trim(),
    tone,
  }
}

function normalizeConfig(input: unknown): GuildTerminalConfig {
  const config = input && typeof input === "object" ? (input as Record<string, unknown>) : {}

  const guildFoundedDate = isValidDateText(config.guildFoundedDate)
    ? config.guildFoundedDate
    : DEFAULT_CONFIG.guildFoundedDate

  const founderMemberId = typeof config.founderMemberId === "string" && config.founderMemberId.trim()
    ? config.founderMemberId.trim()
    : DEFAULT_CONFIG.founderMemberId

  return {
    guildFoundedDate,
    founderMemberId,
    milestones: normalizeMilestones(config.milestones, DEFAULT_CONFIG.milestones),
    members: normalizeMembers(config.members, DEFAULT_CONFIG.members),
    securityClearanceRules: normalizeRules(config.securityClearanceRules, DEFAULT_CONFIG.securityClearanceRules),
    founderClearance: normalizeFounderClearance(config.founderClearance, DEFAULT_CONFIG.founderClearance),
  }
}

export const guildTerminalConfig: GuildTerminalConfig = normalizeConfig(rawConfig)

