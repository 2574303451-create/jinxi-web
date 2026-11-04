import { CheckinRecord, CheckinResult, CheckinStatus, Leaderboard } from "@/types/checkin"

const API_BASE = "/.netlify/functions"
const DEVICE_ID_STORAGE_KEY = "jinxi-device-id"

function getOrCreateDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined

  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (existing) return existing

  const generated = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated)
  return generated
}

export const getCheckinStatus = async (userId: string): Promise<CheckinStatus> => {
  const response = await fetch(`${API_BASE}/checkin?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取签到状态失败 (${response.status})`)
  }

  const data = await response.json()
  return {
    hasCheckedToday: !!data.hasCheckedToday,
    userStats: data.userStats
      ? {
          ...data.userStats,
          updatedAt: new Date(data.userStats.updatedAt),
        }
      : null,
    todayRecord: data.todayRecord
      ? {
          ...data.todayRecord,
          checkinTime: new Date(data.todayRecord.checkinTime),
          createdAt: new Date(data.todayRecord.createdAt),
        }
      : null,
    pointAccount: data.pointAccount
      ? {
          ...data.pointAccount,
          updatedAt: new Date(data.pointAccount.updatedAt),
        }
      : null,
  }
}

export const performCheckin = async (userId: string): Promise<CheckinResult> => {
  const deviceId = getOrCreateDeviceId()
  const response = await fetch(`${API_BASE}/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      action: "checkin",
      deviceId,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `签到失败 (${response.status})`)
  }

  return response.json()
}

export const getCheckinHistory = async (
  userId: string,
  limit = 30
): Promise<CheckinRecord[]> => {
  const response = await fetch(`${API_BASE}/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      action: "history",
      limit,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取签到历史失败 (${response.status})`)
  }

  const data = await response.json()
  return (data.records || []).map((record: CheckinRecord) => ({
    ...record,
    checkinTime: new Date(record.checkinTime),
    createdAt: new Date(record.createdAt),
  }))
}

export const getLeaderboard = async (
  type: "total" | "continuous" | "monthly" | "yearly" | "points" | "max_continuous" = "total",
  limit = 50
): Promise<Leaderboard> => {
  const response = await fetch(`${API_BASE}/leaderboard?type=${type}&limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取排行榜失败 (${response.status})`)
  }

  const data = await response.json()
  return {
    ...data,
    updatedAt: new Date(data.updatedAt),
  }
}

export const getAllLeaderboards = async (limit = 50) => {
  const [total, continuous, monthly, points, maxContinuous] = await Promise.all([
    getLeaderboard("total", limit),
    getLeaderboard("continuous", limit),
    getLeaderboard("monthly", limit),
    getLeaderboard("points", limit),
    getLeaderboard("max_continuous", limit),
  ])

  return {
    total,
    continuous,
    monthly,
    points,
    maxContinuous,
  }
}

export const calculateRewardPoints = (continuousDays: number): number => {
  if (continuousDays >= 7) return 3
  if (continuousDays >= 3) return 2
  return 1
}

export const getCheckinMessage = (continuousDays: number): string => {
  if (continuousDays <= 1) return "签到成功，新的连续记录开始了"
  if (continuousDays < 3) return `签到成功，已连续 ${continuousDays} 天`
  if (continuousDays < 7) return `签到成功，已连续 ${continuousDays} 天，奖励提升`
  if (continuousDays < 15) return `签到成功，已连续 ${continuousDays} 天，状态很稳`
  if (continuousDays < 30) return `签到成功，已连续 ${continuousDays} 天，表现优秀`
  return `签到成功，已连续 ${continuousDays} 天，已进入满勤冲刺`
}
