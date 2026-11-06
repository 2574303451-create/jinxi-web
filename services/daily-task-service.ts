/**
 * Daily task service based on localStorage.
 * Used for task progress UI and lightweight client-side stats.
 */

import { DailyTask, TaskStatus, TaskStats, UserTaskProgress } from '../types/daily-task'
import { getUserId } from '../lib/user-utils'

const STORAGE_KEY_PREFIX = 'jinxi-tasks-'
const STORAGE_KEY_STATS = 'jinxi-task-stats-'
const STORAGE_KEY_LAST_RESET = 'jinxi-task-last-reset'
const STORAGE_KEY_SCHEMA_VERSION = 'jinxi-task-schema-version'
const TASK_SCHEMA_VERSION = '20260305-reset-all-v3'

const DEFAULT_TASKS: Omit<DailyTask, 'progress' | 'status' | 'completedAt'>[] = [
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
    description: '浏览一篇公会攻略内容',
    type: 'daily',
    category: 'game',
    icon: '📌',
    target: 1,
    reward: { points: 20 },
    expiresAt: undefined,
  },
  {
    id: 'daily-like',
    title: '点赞互动',
    description: '给他人留言或攻略点赞 3 次',
    type: 'daily',
    category: 'social',
    icon: '👏',
    target: 3,
    reward: { points: 10 },
    expiresAt: undefined,
  },
  {
    id: 'weekly-strategy-post',
    title: '发布攻略',
    description: '本周发布一篇攻略',
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
    description: '连续签到 7 天',
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
    description: '累计签到 30 天',
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
    description: '累计发布 10 篇攻略',
    type: 'achievement',
    category: 'contribution',
    icon: '🏅',
    target: 10,
    reward: { points: 500, badge: '攻略大师', title: '游戏专家' },
    expiresAt: undefined,
  },
]

function getDefaultStats(): TaskStats {
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

function shouldResetDailyTasks(): boolean {
  if (typeof window === 'undefined') return false

  const lastReset = localStorage.getItem(STORAGE_KEY_LAST_RESET)
  if (!lastReset) return true

  const lastResetDate = new Date(lastReset)
  if (Number.isNaN(lastResetDate.getTime())) return true

  return lastResetDate.toDateString() !== new Date().toDateString()
}

function resetDailyTasks(): void {
  if (typeof window === 'undefined') return

  const userId = getUserId()
  for (const task of DEFAULT_TASKS) {
    if (task.type !== 'daily') continue

    const key = `${STORAGE_KEY_PREFIX}${userId}-${task.id}`
    const progress: UserTaskProgress = {
      userId,
      taskId: task.id,
      progress: 0,
      status: 'available',
      lastUpdated: new Date(),
    }
    localStorage.setItem(key, JSON.stringify(progress))
  }

  localStorage.setItem(STORAGE_KEY_LAST_RESET, new Date().toISOString())
}

function clearAllTaskState(): void {
  if (typeof window === 'undefined') return

  const keysToDelete: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_KEY_STATS) || key === STORAGE_KEY_LAST_RESET) {
      keysToDelete.push(key)
    }
  }

  for (const key of keysToDelete) {
    localStorage.removeItem(key)
  }
}

function ensureTaskSchemaVersion(): void {
  if (typeof window === 'undefined') return

  const currentVersion = localStorage.getItem(STORAGE_KEY_SCHEMA_VERSION)
  if (currentVersion === TASK_SCHEMA_VERSION) return

  clearAllTaskState()
  localStorage.setItem(STORAGE_KEY_SCHEMA_VERSION, TASK_SCHEMA_VERSION)
}

function parseSavedProgress(raw: string): UserTaskProgress | null {
  try {
    const parsed = JSON.parse(raw) as Partial<UserTaskProgress> & { lastUpdated?: string | Date }
    if (!parsed || typeof parsed.userId !== 'string' || typeof parsed.taskId !== 'string') return null
    if (typeof parsed.progress !== 'number' || typeof parsed.status !== 'string') return null

    return {
      userId: parsed.userId,
      taskId: parsed.taskId,
      progress: parsed.progress,
      status: parsed.status as TaskStatus,
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : new Date(),
    }
  } catch {
    return null
  }
}

function saveTaskStats(stats: TaskStats): void {
  if (typeof window === 'undefined') return
  const key = `${STORAGE_KEY_STATS}${getUserId()}`
  localStorage.setItem(key, JSON.stringify(stats))
}

export function getAllTasks(): DailyTask[] {
  if (typeof window === 'undefined') return []

  ensureTaskSchemaVersion()

  if (shouldResetDailyTasks()) {
    resetDailyTasks()
  }

  const userId = getUserId()

  return DEFAULT_TASKS.map((task) => {
    const key = `${STORAGE_KEY_PREFIX}${userId}-${task.id}`
    const saved = localStorage.getItem(key)
    const progress = saved ? parseSavedProgress(saved) : null

    if (!progress) {
      return {
        ...task,
        progress: 0,
        status: 'available' as TaskStatus,
      }
    }

    return {
      ...task,
      progress: progress.progress,
      status: progress.status,
      completedAt: progress.lastUpdated,
    }
  })
}

export function getTasksByType(type: 'daily' | 'weekly' | 'achievement'): DailyTask[] {
  return getAllTasks().filter((task) => task.type === type)
}

export function updateTaskProgress(taskId: string, increment: number = 1): DailyTask | null {
  if (typeof window === 'undefined') return null

  const userId = getUserId()
  const tasks = getAllTasks()
  const task = tasks.find((item) => item.id === taskId)
  if (!task) return null
  if (task.status === 'claimed') return task

  const key = `${STORAGE_KEY_PREFIX}${userId}-${taskId}`
  const safeIncrement = Number.isFinite(increment) ? Math.max(Math.trunc(increment), 0) : 0
  const newProgress = Math.min(task.progress + safeIncrement, task.target)
  const nextStatus: TaskStatus = newProgress >= task.target ? 'completed' : 'in_progress'

  const progress: UserTaskProgress = {
    userId,
    taskId,
    progress: newProgress,
    status: nextStatus,
    lastUpdated: new Date(),
  }
  localStorage.setItem(key, JSON.stringify(progress))

  return {
    ...task,
    progress: newProgress,
    status: nextStatus,
    completedAt: new Date(),
  }
}

export function claimReward(_taskId: string): boolean {
  // Completion stored in this browser is not a server-verified reward event.
  // Preserve progress/drafts, but never mint points or pretend a claim succeeded.
  return false
}

export function getTaskStats(): TaskStats {
  if (typeof window === 'undefined') return getDefaultStats()

  ensureTaskSchemaVersion()

  const userId = getUserId()
  const key = `${STORAGE_KEY_STATS}${userId}`
  const raw = localStorage.getItem(key)
  if (!raw) return getDefaultStats()

  try {
    const parsed = JSON.parse(raw) as Partial<TaskStats>
    return {
      totalPoints: Number(parsed.totalPoints || 0),
      completedToday: Number(parsed.completedToday || 0),
      completedWeek: Number(parsed.completedWeek || 0),
      totalCompleted: Number(parsed.totalCompleted || 0),
      badges: Array.isArray(parsed.badges) ? parsed.badges.map(String) : [],
      titles: Array.isArray(parsed.titles) ? parsed.titles.map(String) : [],
      currentStreak: Number(parsed.currentStreak || 0),
      longestStreak: Number(parsed.longestStreak || 0),
    }
  } catch {
    return getDefaultStats()
  }
}

export function updateCheckinStreak(): void {
  if (typeof window === 'undefined') return

  const stats = getTaskStats()
  stats.currentStreak += 1
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak)
  saveTaskStats(stats)

  updateTaskProgress('weekly-checkin-streak', 1)
  updateTaskProgress('achievement-checkin-30', 1)
}

export function resetCheckinStreak(): void {
  if (typeof window === 'undefined') return

  const stats = getTaskStats()
  stats.currentStreak = 0
  saveTaskStats(stats)
}
