'use client'

/**
 * 每日任务面板组件
 * 展示每日、每周和成就任务
 */

import { useState, useEffect } from 'react'
import { DailyTask, TaskStats } from '../types/daily-task'
import {
  getAllTasks,
  getTasksByType,
  claimReward,
  getTaskStats,
} from '../services/daily-task-service'

interface DailyTasksProps {
  onTaskComplete?: (taskId: string) => void
}

export function DailyTasks({ onTaskComplete }: DailyTasksProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievement'>('daily')
  const [isExpanded, setIsExpanded] = useState(true)

  // 加载任务和统计数据
  useEffect(() => {
    loadTasks()
    loadStats()
  }, [])

  const loadTasks = () => {
    const allTasks = getAllTasks()
    setTasks(allTasks)
  }

  const loadStats = () => {
    const taskStats = getTaskStats()
    setStats(taskStats)
  }

  const handleClaimReward = (taskId: string) => {
    const success = claimReward(taskId)
    if (success) {
      loadTasks()
      loadStats()
      onTaskComplete?.(taskId)
    }
  }

  const filteredTasks = getTasksByType(activeTab)

  const getProgressPercentage = (task: DailyTask) => {
    return Math.min((task.progress / task.target) * 100, 100)
  }

  const getTaskCategoryColor = (category: string) => {
    switch (category) {
      case 'social':
        return 'cartoon-pink'
      case 'game':
        return 'cartoon-cyan'
      case 'contribution':
        return 'cartoon-purple'
      default:
        return 'cartoon-green'
    }
  }

  return (
    <div className="relative">
      {/* 任务统计卡片 */}
      <div
        className="p-6 rounded-2xl border mb-6 cartoon-card cartoon-card-pink animate-slide-in-up"
        style={{
          background: 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03))',
          borderColor: 'rgba(255,107,157,.3)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-xl font-bold gradient-text-candy"
            style={{ fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive' }}
          >
            🎯 每日任务
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isExpanded ? '收起 ▲' : '展开 ▼'}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-candy">{stats.totalPoints}</div>
              <div className="text-sm text-white/60 mt-1">总积分</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-sky">{stats.completedToday}</div>
              <div className="text-sm text-white/60 mt-1">今日完成</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-fresh">{stats.currentStreak}</div>
              <div className="text-sm text-white/60 mt-1">连续签到</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-rainbow">{stats.badges.length}</div>
              <div className="text-sm text-white/60 mt-1">徽章数量</div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* 任务类型切换 */}
          <div className="flex gap-3 mb-6">
            {[
              { key: 'daily', label: '每日任务', icon: '📅' },
              { key: 'weekly', label: '每周任务', icon: '📆' },
              { key: 'achievement', label: '成就任务', icon: '🏆' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  activeTab === tab.key
                    ? 'cartoon-btn cartoon-btn-pink'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            {filteredTasks.map((task, index) => (
              <div
                key={task.id}
                className={`p-5 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-up delay-${index * 100}`}
                style={{
                  background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
                  borderColor: `rgba(${
                    getTaskCategoryColor(task.category) === 'cartoon-pink'
                      ? '255,107,157'
                      : getTaskCategoryColor(task.category) === 'cartoon-cyan'
                      ? '107,207,255'
                      : getTaskCategoryColor(task.category) === 'cartoon-purple'
                      ? '199,125,255'
                      : '74,222,128'
                  },.3)`,
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* 任务图标 */}
                  <div
                    className="text-4xl flex-shrink-0 animate-float"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    {task.icon}
                  </div>

                  {/* 任务信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg text-white">{task.title}</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'claimed'
                            ? 'bg-green-500/20 text-green-300'
                            : task.status === 'completed'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {task.status === 'claimed'
                          ? '已完成'
                          : task.status === 'completed'
                          ? '待领取'
                          : '进行中'}
                      </span>
                    </div>

                    <p className="text-white/60 text-sm mb-3">{task.description}</p>

                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-white/60">
                          进度: {task.progress}/{task.target}
                        </span>
                        <span className="text-white/60">{getProgressPercentage(task).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-candy transition-all duration-500 animate-gradient-shift"
                          style={{ width: `${getProgressPercentage(task)}%` }}
                        />
                      </div>
                    </div>

                    {/* 奖励和操作 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-yellow-300">💰 {task.reward.points} 积分</span>
                        {task.reward.badge && (
                          <span className="text-purple-300">🎖️ {task.reward.badge}</span>
                        )}
                        {task.reward.title && (
                          <span className="text-cyan-300">👑 {task.reward.title}</span>
                        )}
                      </div>

                      {task.status === 'completed' && (
                        <button
                          onClick={() => handleClaimReward(task.id)}
                          className="cartoon-btn cartoon-btn-fresh px-4 py-2 text-sm animate-pulse-glow"
                        >
                          领取奖励
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <div className="text-6xl mb-4">📭</div>
                <p>暂无{activeTab === 'daily' ? '每日' : activeTab === 'weekly' ? '每周' : '成就'}任务</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
