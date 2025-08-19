"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Leaderboard, LeaderboardEntry } from "@/types/checkin"
import * as checkinAPI from "@/services/checkin-service"

interface LeaderboardWidgetProps {
  className?: string
}

export function LeaderboardWidget({ className }: LeaderboardWidgetProps) {
  const [activeTab, setActiveTab] = useState<'total' | 'continuous' | 'monthly' | 'points' | 'max_continuous'>('total')
  const [leaderboards, setLeaderboards] = useState<{[key: string]: Leaderboard}>({})
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 排行榜标签配置
  const tabs = [
    { key: 'total', label: '总签到', icon: 'ri-calendar-line', color: 'text-blue-400' },
    { key: 'continuous', label: '连续签到', icon: 'ri-fire-line', color: 'text-red-400' },
    { key: 'monthly', label: '本月', icon: 'ri-calendar-event-line', color: 'text-green-400' },
    { key: 'points', label: '积分', icon: 'ri-coin-line', color: 'text-yellow-400' },
    { key: 'max_continuous', label: '最长连续', icon: 'ri-trophy-line', color: 'text-purple-400' }
  ] as const

  // 加载排行榜数据
  const loadLeaderboards = async () => {
    try {
      setIsLoading(true)
      const data = await checkinAPI.getAllLeaderboards(50)
      setLeaderboards({
        total: data.total,
        continuous: data.continuous,
        monthly: data.monthly,
        points: data.points,
        max_continuous: data.maxContinuous
      })
    } catch (error) {
      console.error('加载排行榜失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 刷新排行榜
  const refreshLeaderboard = async () => {
    if (refreshing) return
    
    try {
      setRefreshing(true)
      const data = await checkinAPI.getLeaderboard(activeTab, 50)
      setLeaderboards(prev => ({
        ...prev,
        [activeTab]: data
      }))
    } catch (error) {
      console.error('刷新排行榜失败:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLeaderboards()
  }, [])

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  // 获取排名颜色
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400'
      case 2: return 'text-gray-400'
      case 3: return 'text-orange-400'
      default: return 'text-white/70'
    }
  }

  const currentLeaderboard = leaderboards[activeTab]

  if (isLoading) {
    return (
      <div className={cn("p-6 rounded-2xl border bg-white/5 backdrop-blur-sm", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="ml-3 text-white/70">加载排行榜中...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-6 rounded-2xl border bg-white/5 backdrop-blur-sm", className)}
      style={{
        borderColor: "rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.08)",
      }}
    >
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <i className="ri-trophy-line text-yellow-400"></i>
          签到排行榜
        </h3>
        
        <button
          onClick={refreshLeaderboard}
          disabled={refreshing}
          className={cn(
            "px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-all",
            "bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50"
          )}
        >
          <i className={cn("ri-refresh-line", refreshing && "animate-spin")}></i>
          刷新
        </button>
      </div>

      {/* 排行榜标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === tab.key
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            )}
          >
            <i className={cn(tab.icon, tab.color)}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 排行榜内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentLeaderboard?.entries.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentLeaderboard.entries.map((entry, index) => (
                <motion.div
                  key={`${entry.userId}-${activeTab}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all",
                    "bg-white/5 hover:bg-white/10 border border-white/10",
                    entry.rank <= 3 && "ring-1 ring-yellow-500/30 bg-yellow-500/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* 排名 */}
                    <div className={cn(
                      "text-xl font-bold min-w-[3rem] text-center",
                      getRankColor(entry.rank)
                    )}>
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    {/* 用户信息 */}
                    <div>
                      <div className="font-medium text-white">
                        {entry.userName || '匿名用户'}
                      </div>
                      <div className="text-sm text-white/60">
                        {entry.label}
                      </div>
                    </div>
                  </div>

                  {/* 额外信息 */}
                  <div className="text-right text-sm text-white/60">
                    <div>总签到: {entry.totalCheckins}天</div>
                    {entry.continuousCheckins > 0 && (
                      <div>连续: {entry.continuousCheckins}天</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-white/60">
                暂无排行榜数据，快来签到争夺榜首吧！
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 排行榜说明 */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <i className="ri-information-line"></i>
          积分规则
        </h4>
        <div className="text-xs text-white/70 space-y-1">
          <div>• 每日签到获得 1 积分</div>
          <div>• 连续签到 3 天及以上，每天获得 2 积分</div>
          <div>• 连续签到 7 天及以上，每天获得 3 积分</div>
          <div>• 排行榜数据实时更新，点击刷新获取最新数据</div>
        </div>
      </div>
    </motion.div>
  )
}
