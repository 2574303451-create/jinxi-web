export interface CheckinRecord {
  id: string
  userId: string
  userName: string
  checkinDate: string
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
  totalCheckins: number
  continuousCheckins: number
  maxContinuous: number
  totalPoints: number
  lastCheckinDate: string | null
  firstCheckinDate: string | null
  thisMonthCheckins: number
  thisYearCheckins: number
  updatedAt: Date
}

export interface CheckinResult {
  success: boolean
  message: string
  rewardPoints?: number
  continuousDays?: number
  alreadyChecked: boolean
  bizId?: string
  currentBalance?: number
  riskDecision?: string
}

export interface PointAccountSummary {
  userId: string
  balance: number
  totalEarned: number
  totalSpent: number
  updatedAt: Date
}

export interface CheckinStatus {
  hasCheckedToday: boolean
  userStats: UserCheckinStats | null
  todayRecord: CheckinRecord | null
  pointAccount: PointAccountSummary | null
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  value: number
  label: string
  totalCheckins: number
  continuousCheckins: number
  maxContinuous: number
  totalPoints: number
}

export interface Leaderboard {
  type: "total" | "continuous" | "monthly" | "yearly" | "points" | "max_continuous"
  title: string
  entries: LeaderboardEntry[]
  updatedAt: Date
}
