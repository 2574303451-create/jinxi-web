/**
 * 战队系统类型定义
 */

export interface Member {
  id: string
  name: string
  avatar: string
  role: string
  level?: number
  power?: number
  joinDate: Date
}

export interface TeamStats {
  totalPoints: number
  weeklyPoints: number
  rank: number
  winRate: number
  totalBattles: number
  wins: number
  losses: number
  draws: number
}

export interface TeamActivity {
  id: string
  type: 'battle' | 'training' | 'event' | 'achievement'
  title: string
  description: string
  date: Date
  participants: Member[]
  result?: 'win' | 'lose' | 'draw'
  points: number
  rewards?: string[]
}

export interface Team {
  id: string
  name: string
  icon: string
  color: string
  slogan: string
  leader: Member
  members: Member[]
  stats: TeamStats
  activities: TeamActivity[]
  createdAt: Date
  description?: string
  requirements?: string
  maxMembers: number
}

export interface TeamApplication {
  id: string
  userId: string
  userName: string
  teamId: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface TeamRanking {
  rank: number
  team: Team
  weeklyPoints: number
  trend: 'up' | 'down' | 'same'
  trendChange: number
}
