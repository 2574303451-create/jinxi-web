"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { CheckinStatus, CheckinResult, UserCheckinStats } from "@/types/checkin"
import * as checkinAPI from "@/services/checkin-service"

interface CheckinWidgetProps {
  className?: string
}

export function CheckinWidget({ className }: CheckinWidgetProps) {
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [checkinHistory, setCheckinHistory] = useState<any[]>([])

  // 生成或获取用户ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('jinxi-user-id')
      let name = localStorage.getItem('jinxi-user-name') || ''
      
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('jinxi-user-id', id)
      }
      
      setUserId(id)
      setUserName(name)
    }
  }, [])

  // 加载签到状态
  const loadCheckinStatus = async () => {
    if (!userId) return
    
    try {
      setIsLoading(true)
      const status = await checkinAPI.getCheckinStatus(userId)
      setCheckinStatus(status)
    } catch (error) {
      console.error('加载签到状态失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 执行签到
  const handleCheckin = async () => {
    if (!userId || isChecking) return
    
    const currentUserName = userName || '匿名用户'
    
    try {
      setIsChecking(true)
      const result: CheckinResult = await checkinAPI.performCheckin(userId, currentUserName)
      
      if (result.success) {
        // 签到成功，重新加载状态
        await loadCheckinStatus()
        
        // 显示成功提示
        const message = checkinAPI.getCheckinMessage(result.continuousDays || 1)
        alert(`🎉 ${message}\n获得积分：${result.rewardPoints}`)
      } else {
        alert(result.message)
      }
    } catch (error: any) {
      console.error('签到失败:', error)
      alert('签到失败：' + error.message)
    } finally {
      setIsChecking(false)
    }
  }

  // 查看签到历史
  const loadHistory = async () => {
    if (!userId) return
    
    try {
      const history = await checkinAPI.getCheckinHistory(userId, 7) // 最近7天
      setCheckinHistory(history)
      setShowHistory(true)
    } catch (error) {
      console.error('加载签到历史失败:', error)
    }
  }

  useEffect(() => {
    loadCheckinStatus()
  }, [userId])

  if (isLoading) {
    return (
      <div className={cn("p-6 rounded-2xl border bg-white/5 backdrop-blur-sm", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="ml-3 text-white/70">加载中...</span>
        </div>
      </div>
    )
  }

  const stats = checkinStatus?.userStats
  const hasCheckedToday = checkinStatus?.hasCheckedToday || false

  return (
    <div className={cn("space-y-6", className)}>
      {/* 主签到面板 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border bg-white/5 backdrop-blur-sm"
        style={{
          borderColor: "rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.08)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="ri-calendar-check-line text-green-400"></i>
            每日签到
          </h3>
          
          {stats && (
            <button
              onClick={loadHistory}
              className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors"
            >
              <i className="ri-history-line"></i>
              历史记录
            </button>
          )}
        </div>

        {/* 签到按钮区域 */}
        <div className="text-center mb-6">
          <motion.button
            onClick={handleCheckin}
            disabled={hasCheckedToday || isChecking}
            whileHover={!hasCheckedToday ? { scale: 1.05 } : {}}
            whileTap={!hasCheckedToday ? { scale: 0.95 } : {}}
            className={cn(
              "w-32 h-32 rounded-full text-white font-bold text-lg transition-all duration-300 flex flex-col items-center justify-center gap-2",
              hasCheckedToday
                ? "bg-green-500/50 cursor-not-allowed"
                : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
            )}
          >
            {isChecking ? (
              <>
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-sm">签到中...</span>
              </>
            ) : hasCheckedToday ? (
              <>
                <i className="ri-checkbox-circle-fill text-3xl"></i>
                <span className="text-sm">已签到</span>
              </>
            ) : (
              <>
                <i className="ri-calendar-check-line text-3xl"></i>
                <span className="text-sm">点击签到</span>
              </>
            )}
          </motion.button>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">{stats.totalCheckins}</div>
              <div className="text-xs text-white/60">总签到</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-green-400">{stats.continuousCheckins}</div>
              <div className="text-xs text-white/60">连续签到</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-yellow-400">{stats.maxContinuous}</div>
              <div className="text-xs text-white/60">最长连续</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-purple-400">{stats.totalPoints}</div>
              <div className="text-xs text-white/60">总积分</div>
            </div>
          </div>
        )}

        {/* 今日奖励信息 */}
        {stats && !hasCheckedToday && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">今日签到可获得：</span>
              <span className="text-yellow-400 font-medium">
                {checkinAPI.calculateRewardPoints(stats.continuousCheckins + 1)} 积分
              </span>
            </div>
            {stats.continuousCheckins > 0 && (
              <div className="text-xs text-white/60 mt-1">
                连续签到 {stats.continuousCheckins + 1} 天
              </div>
            )}
          </div>
        )}

        {/* 鼓励文案 */}
        {!stats && !hasCheckedToday && (
          <div className="mt-4 text-center">
            <p className="text-white/70 text-sm">
              🌟 开始您的第一次签到，获得积分奖励！
            </p>
          </div>
        )}
      </motion.div>

      {/* 签到历史弹窗 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">签到历史</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-3">
                {checkinHistory.length > 0 ? (
                  checkinHistory.map((record, index) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-800">
                          {new Date(record.checkinDate).toLocaleDateString('zh-CN', {
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.isContinuous ? `连续${record.continuousDays}天` : '单次签到'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-600">+{record.rewardPoints}</div>
                        <div className="text-xs text-gray-500">积分</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无签到记录
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
