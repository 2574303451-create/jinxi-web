/**
 * 每日任务服务
 * 使用 LocalStorage 存储任务进度和用户数据
 */

import { DailyTask, TaskStatus, TaskStats, UserTaskProgress } from '../types/daily-task'
import { getUserId } from '../lib/user-utils'

const STORAGE_KEY_PREFIX = 'jinxi-tasks-'
const STORAGE_KEY_STATS = 'jinxi-task-stats-'
const STORAGE_KEY_LAST_RESET = 'jinxi-task-last-reset'

// 预定义任务列表
const DEFAULT_TASKS: Omit<DailyTask, 'progress' | 'status' | 'completedAt'>[] = [
  {
    id: 'daily-checkin',
    title: '每日签到',
    description: '完成每日签到，获得积分奖励',
    type: 'daily',
    category: 'social',
    icon: '✅',
    target: 1,
    reward: { points: 10 },
    expiresAt: undefined,
  },
  {
    id: 'daily-message',
    title: '留言互动',
    description: '在留言墙发布一条留言',
    type: 'daily',
    category: 'social',
    icon: '💬',
    target: 1,
    reward: { points: 15 },
    expiresAt: undefined,
  },
  {
    id: 'daily-strategy-view',
    title: '查看攻略',
    description: '查看攻略墙内容',
    type: 'daily',
    category: 'game',
    icon: '📖',
    target: 1,
    reward: { points: 20 },
    expiresAt: undefined,
  },
  {
    id: 'daily-like',
    title: '点赞评论',
    description: '为他人的留言或攻略点赞',
    type: 'daily',
    category: 'social',
    icon: '👍',
    target: 3,
    reward: { points: 10 },
    expiresAt: undefined,
  },
  {
    id: 'weekly-strategy-post',
    title: '发布攻略',
    description: '发布一篇游戏攻略',
    type: 'weekly',
    category: 'contribution',
    icon: '📝',
    target: 1,
    reward: { points: 50, badge: '贡献者' },
    expiresAt: undefined,
  },
  {
    id: 'weekly-checkin-streak',
    title: '连续签到',
    description: '连续签到7天',
    type: 'weekly',
    category: 'social',
    icon: '🔥',
    target: 7,
    reward: { points: 100, title: '坚持者' },
    expiresAt: undefined,
  },
  {
    id: 'achievement-checkin-30',
    title: '签到达人',
    description: '累计签到30天',
    type: 'achievement',
    category: 'social',
    icon: '🏆',
    target: 30,
    reward: { points: 300, badge: '签到达人', title: '老玩家' },
    expiresAt: undefined,
  },
  {
    id: 'achievement-strategy-10',
    title: '攻略大师',
    description: '发布10篇攻略',
    type: 'achievement',
    category: 'contribution',
    icon: '🎓',
    target: 10,
    reward: { points: 500, badge: '攻略大师', title: '游戏专家' },
    expiresAt: undefined,
  },
]

/**
 * 检查是否需要重置每日任务
 */
function shouldResetDailyTasks(): boolean {
  if (typeof window === 'undefined') return false

  const lastReset = localStorage.getItem(STORAGE_KEY_LAST_RESET)
  if (!lastReset) return true

  const lastResetDate = new Date(lastReset)
  const today = new Date()

  // 如果不是同一天，需要重置
  return lastResetDate.toDateString() !== today.toDateString()
}

/**
 * 重置每日任务
 */
function resetDailyTasks(): void {
  if (typeof window === 'undefined') return

  const userId = getUserId()
  const tasks = getAllTasks()

  tasks.forEach(task => {
    if (task.type === 'daily') {
      const progressKey = `${STORAGE_KEY_PREFIX}${userId}-${task.id}`
      const progress: UserTaskProgress = {
        userId,
        taskId: task.id,
        progress: 0,
        status: 'available',
        lastUpdated: new Date(),
      }
      localStorage.setItem(progressKey, JSON.stringify(progress))
    }
  })

  localStorage.setItem(STORAGE_KEY_LAST_RESET, new Date().toISOString())
}

/**
 * 获取所有任务
 */
export function getAllTasks(): DailyTask[] {
  if (typeof window === 'undefined') return []

  // 检查是否需要重置每日任务
  if (shouldResetDailyTasks()) {
    resetDailyTasks()
  }

  const userId = getUserId()

  return DEFAULT_TASKS.map(task => {
    const progressKey = `${STORAGE_KEY_PREFIX}${userId}-${task.id}`
    const savedProgress = localStorage.getItem(progressKey)

    if (savedProgress) {
      const progress: UserTaskProgress = JSON.parse(savedProgress)
      return {
        ...task,
        progress: progress.progress,
        status: progress.status,
        completedAt: progress.lastUpdated,
      }
    }

    return {
      ...task,
      progress: 0,
      status: 'available' as TaskStatus,
    }
  })
}

/**
 * 获取指定类型的任务
 */
export function getTasksByType(type: 'daily' | 'weekly' | 'achievement'): DailyTask[] {
  return getAllTasks().filter(task => task.type === type)
}

/**
 * 更新任务进度
 */
export function updateTaskProgress(taskId: string, increment: number = 1): DailyTask | null {
  if (typeof window === 'undefined') return null

  const userId = getUserId()
  const tasks = getAllTasks()
  const task = tasks.find(t => t.id === taskId)

  if (!task) return null

  const progressKey = `${STORAGE_KEY_PREFIX}${userId}-${taskId}`
  const newProgress = Math.min(task.progress + increment, task.target)
  const newStatus: TaskStatus = newProgress >= task.target ? 'completed' : 'in_progress'

  const progress: UserTaskProgress = {
    userId,
    taskId,
    progress: newProgress,
    status: newStatus,
    lastUpdated: new Date(),
  }

  localStorage.setItem(progressKey, JSON.stringify(progress))

  // 如果任务完成，自动领取奖励
  if (newStatus === 'completed' && task.status !== 'completed') {
    claimReward(taskId)
  }

  return {
    ...task,
    progress: newProgress,
    status: newStatus,
    completedAt: new Date(),
  }
}

/**
 * 领取任务奖励
 */
export function claimReward(taskId: string): boolean {
  if (typeof window === 'undefined') return false

  const userId = getUserId()
  const tasks = getAllTasks()
  const task = tasks.find(t => t.id === taskId)

  if (!task || task.status !== 'completed') return false

  // 更新任务状态为已领取
  const progressKey = `${STORAGE_KEY_PREFIX}${userId}-${taskId}`
  const progress: UserTaskProgress = {
    userId,
    taskId,
    progress: task.progress,
    status: 'claimed',
    lastUpdated: new Date(),
  }
  localStorage.setItem(progressKey, JSON.stringify(progress))

  // 更新用户统计数据
  const stats = getTaskStats()
  stats.totalPoints += task.reward.points
  stats.totalCompleted += 1

  if (task.type === 'daily') {
    stats.completedToday += 1
  }
  if (task.type === 'weekly') {
    stats.completedWeek += 1
  }

  if (task.reward.badge && !stats.badges.includes(task.reward.badge)) {
    stats.badges.push(task.reward.badge)
  }
  if (task.reward.title && !stats.titles.includes(task.reward.title)) {
    stats.titles.push(task.reward.title)
  }

  saveTaskStats(stats)

  return true
}

/**
 * 获取用户任务统计
 */
export function getTaskStats(): TaskStats {
  if (typeof window === 'undefined') {
    return {
      totalPoints: 0,
      completedToday: 0,
      completedWeek: 0,
      totalCompleted: 0,
      badges: [],
      titles: [],
      currentStreak: 0,
      longestStreak: 0,
    }
  }

  const userId = getUserId()
  const statsKey = `${STORAGE_KEY_STATS}${userId}`
  const savedStats = localStorage.getItem(statsKey)

  if (savedStats) {
    return JSON.parse(savedStats)
  }

  return {
    totalPoints: 0,
    completedToday: 0,
    completedWeek: 0,
    totalCompleted: 0,
    badges: [],
    titles: [],
    currentStreak: 0,
    longestStreak: 0,
  }
}

/**
 * 保存用户任务统计
 */
function saveTaskStats(stats: TaskStats): void {
  if (typeof window === 'undefined') return

  const userId = getUserId()
  const statsKey = `${STORAGE_KEY_STATS}${userId}`
  localStorage.setItem(statsKey, JSON.stringify(stats))
}

/**
 * 更新签到连续天数
 */
export function updateCheckinStreak(): void {
  if (typeof window === 'undefined') return

  const stats = getTaskStats()
  stats.currentStreak += 1
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak)
  saveTaskStats(stats)

  // 更新连续签到任务进度
  updateTaskProgress('weekly-checkin-streak', 1)
  updateTaskProgress('achievement-checkin-30', 1)
}

/**
 * 重置签到连续天数
 */
export function resetCheckinStreak(): void {
  if (typeof window === 'undefined') return

  const stats = getTaskStats()
  stats.currentStreak = 0
  saveTaskStats(stats)
}
