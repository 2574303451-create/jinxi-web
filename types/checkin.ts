// 签到系统类型定义

export interface CheckinRecord {
  id: string
  userId: string
  userName: string
  checkinDate: string // YYYY-MM-DD 格式
  checkinTime: Date
  rewardPoints: number
  isContinuous: boolean
  continuousDays: number
  createdAt: Date
}

export interface UserCheckinStats {
  id: string
  userId: string
  userName: string
  totalCheckins: number      // 总签到天数
  continuousCheckins: number // 当前连续签到天数
  maxContinuous: number      // 最长连续签到记录
  totalPoints: number        // 总积分
  lastCheckinDate: string | null // 最后签到日期
  firstCheckinDate: string | null // 首次签到日期
  thisMonthCheckins: number  // 本月签到次数
  thisYearCheckins: number   // 今年签到次数
  updatedAt: Date
}

export interface CheckinResult {
  success: boolean
  message: string
  rewardPoints?: number
  continuousDays?: number
  alreadyChecked: boolean
}

export interface CheckinStatus {
  hasCheckedToday: boolean
  userStats: UserCheckinStats | null
  todayRecord: CheckinRecord | null
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  value: number
  label: string // 如："15天" 或 "连续7天"
}

export interface Leaderboard {
  type: 'total' | 'continuous' | 'monthly' | 'yearly'
  title: string
  entries: LeaderboardEntry[]
  updatedAt: Date
}

// API请求/响应类型
export interface CheckinRequest {
  userId: string
  userName: string
}

export interface CheckinStatusRequest {
  userId: string
}

export interface LeaderboardRequest {
  type: 'total' | 'continuous' | 'monthly' | 'yearly'
  limit?: number // 默认20
}
