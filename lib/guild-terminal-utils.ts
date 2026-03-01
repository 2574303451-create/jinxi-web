import type { GuildMilestone, SecurityClearance, SecurityClearanceRule } from "./guild-terminal-config"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface RuntimeParts {
  years: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function parseDateStrict(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  const utcTime = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const parsed = new Date(utcTime)

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return null
  }

  return parsed
}

export function calculateRuntime(startDate: Date, endDate: Date): RuntimeParts {
  if (endDate.getTime() <= startDate.getTime()) {
    return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  let years = endDate.getUTCFullYear() - startDate.getUTCFullYear()
  let anniversary = new Date(
    Date.UTC(
      startDate.getUTCFullYear() + years,
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
      startDate.getUTCHours(),
      startDate.getUTCMinutes(),
      startDate.getUTCSeconds(),
      startDate.getUTCMilliseconds(),
    ),
  )

  if (anniversary.getTime() > endDate.getTime()) {
    years -= 1
    anniversary = new Date(
      Date.UTC(
        startDate.getUTCFullYear() + years,
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        startDate.getUTCHours(),
        startDate.getUTCMinutes(),
        startDate.getUTCSeconds(),
        startDate.getUTCMilliseconds(),
      ),
    )
  }

  const remainingMs = endDate.getTime() - anniversary.getTime()
  const days = Math.floor(remainingMs / DAY_MS)
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((remainingMs % HOUR_MS) / (60 * 1000))
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000)

  return { years, days, hours, minutes, seconds }
}

export function formatRuntime(parts: RuntimeParts) {
  return `${parts.years}年${parts.days}天${parts.hours}小时${parts.minutes}分${parts.seconds}秒`
}

export function getSecurityClearance(
  memberId: string,
  years: number,
  founderMemberId: string,
  founderClearance: SecurityClearance,
  rules: SecurityClearanceRule[],
): SecurityClearance {
  if (memberId === founderMemberId) {
    return founderClearance
  }

  const matchedRule = rules.find((rule) => {
    const inLowerBound = years >= rule.minYears
    const inUpperBound = typeof rule.maxYearsExclusive === "number" ? years < rule.maxYearsExclusive : true
    return inLowerBound && inUpperBound
  })

  if (matchedRule) {
    return {
      code: matchedRule.code,
      title: matchedRule.title,
      tone: matchedRule.tone,
    }
  }

  const fallback = rules[rules.length - 1]
  if (!fallback) {
    return {
      code: "LEVEL 1",
      title: "过去的过去",
      tone: "normal",
    }
  }

  return {
    code: fallback.code,
    title: fallback.title,
    tone: fallback.tone,
  }
}

export function getUnlockedMilestones(joinDate: string, milestones: GuildMilestone[]) {
  const joinAt = parseDateStrict(joinDate)
  if (!joinAt) {
    return []
  }

  return milestones.filter((milestone) => {
    const milestoneAt = parseDateStrict(milestone.date)
    return milestoneAt ? joinAt.getTime() <= milestoneAt.getTime() : false
  })
}

export function buildCyberHash(memberId: string, joinDate: string) {
  const compactDate = joinDate.replaceAll("-", "")
  const seed = `${memberId}-${compactDate}`

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  }

  const suffix = hash.toString(36).toUpperCase().slice(-4).padStart(4, "0")
  return `ID-${memberId}-${compactDate}-${suffix}`
}

