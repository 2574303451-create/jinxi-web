/**
 * 每日任务系统类型定义
 */

export type TaskType = 'daily' | 'weekly' | 'achievement'
export type TaskCategory = 'social' | 'game' | 'contribution'
export type TaskStatus = 'available' | 'in_progress' | 'completed' | 'claimed'

export interface TaskReward {
  points: number
  badge?: string
  title?: string
}

export interface DailyTask {
  id: string
  title: string
  description: string
  type: TaskType
  category: TaskCategory
  icon: string
  progress: number
  target: number
  reward: TaskReward
  status: TaskStatus
  expiresAt?: Date
  completedAt?: Date
}

export interface UserTaskProgress {
  userId: string
  taskId: string
  progress: number
  status: TaskStatus
  lastUpdated: Date
}

export interface TaskStats {
  totalPoints: number
  completedToday: number
  completedWeek: number
  totalCompleted: number
  badges: string[]
  titles: string[]
  currentStreak: number
  longestStreak: number
}
