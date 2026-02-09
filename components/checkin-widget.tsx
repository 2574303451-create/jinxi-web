"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"
import { getUserId, getUserName, setUserName as saveUserName } from "../lib/user-utils"
import { CheckinStatus, CheckinResult, UserCheckinStats } from "../types/checkin"
import * as checkinAPI from "../services/checkin-service"

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
  const [showNameInput, setShowNameInput] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [nameError, setNameError] = useState('')

  // 使用共享的用户ID和用户名工具
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = getUserId()
      const name = getUserName()

      setUserId(id)
      setUserName(name)
      setTempUserName(name)

      // 如果没有用户名，显示输入界面
      if (!name.trim()) {
        setShowNameInput(true)
      }
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

  // 验证用户名
  const validateUserName = (name: string): boolean => {
    setNameError('')
    
    if (!name.trim()) {
      setNameError('请输入您的账号名称')
      return false
    }
    
    if (name.trim().length < 2) {
      setNameError('账号名称至少需要2个字符')
      return false
    }
    
    if (name.trim().length > 20) {
      setNameError('账号名称不能超过20个字符')
      return false
    }
    
    // 检查特殊字符
    const validPattern = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
    if (!validPattern.test(name.trim())) {
      setNameError('账号名称只能包含中文、英文、数字和下划线')
      return false
    }
    
    return true
  }

  // 保存用户名
  const saveUserName = () => {
    if (!validateUserName(tempUserName)) {
      return
    }

    const trimmedName = tempUserName.trim()
    setUserName(trimmedName)
    saveUserName(trimmedName)
    setShowNameInput(false)
    setNameError('')
  }

  // 编辑用户名
  const editUserName = () => {
    setTempUserName(userName)
    setShowNameInput(true)
    setNameError('')
  }

  // 执行签到
  const handleCheckin = async () => {
    if (!userId || isChecking) return
    
    // 检查是否有用户名
    if (!userName.trim()) {
      setShowNameInput(true)
      alert('请先设置您的账号名称')
      return
    }
    
    try {
      setIsChecking(true)
      const result: CheckinResult = await checkinAPI.performCheckin(userId, userName)
      
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

        {/* 用户名管理区域 */}
        <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="ri-user-3-line text-blue-400 text-lg"></i>
              <div>
                <div className="text-sm text-white/60">当前账号</div>
                <div className="text-white font-medium">
                  {userName ? userName : '未设置'}
                </div>
              </div>
            </div>
            <button
              onClick={editUserName}
              className="text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 flex items-center gap-1"
            >
              <i className="ri-edit-line"></i>
              {userName ? '修改' : '设置'}
            </button>
          </div>
        </div>

        {/* 签到按钮区域 - 居中突出 */}
        <div className="flex flex-col items-center justify-center mb-8">
          {/* 装饰性背景圆圈 */}
          <div className="relative flex items-center justify-center">
            {/* 外层装饰圆环 */}
            <div className="absolute inset-0 w-48 h-48 rounded-full">
              <div 
                className="w-full h-full rounded-full opacity-20"
                style={{
                  background: hasCheckedToday 
                    ? 'conic-gradient(from 0deg, #22c55e, #16a34a, #22c55e)' 
                    : 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #3b82f6)',
                  animation: !hasCheckedToday ? 'spin 8s linear infinite' : 'none'
                }}
              />
            </div>
            
            {/* 中层背景 */}
            <div className="absolute inset-0 w-44 h-44 m-2 rounded-full bg-white/5 backdrop-blur-sm" />
            
            {/* 签到按钮 */}
            <motion.button
              onClick={handleCheckin}
              disabled={hasCheckedToday || isChecking}
              whileHover={!hasCheckedToday ? { scale: 1.08 } : {}}
              whileTap={!hasCheckedToday ? { scale: 0.95 } : {}}
              className={cn(
                "relative z-10 w-40 h-40 rounded-full text-white font-bold text-xl transition-all duration-500 flex flex-col items-center justify-center gap-3 border-4",
                hasCheckedToday
                  ? "bg-gradient-to-br from-green-500/80 to-emerald-600/80 border-green-400/50 cursor-not-allowed"
                  : "bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 border-white/30 shadow-2xl hover:shadow-3xl"
              )}
              style={{
                boxShadow: hasCheckedToday 
                  ? '0 20px 60px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)' 
                  : '0 20px 60px rgba(59, 130, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              {isChecking ? (
                <>
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-base">签到中...</span>
                </>
              ) : hasCheckedToday ? (
                <>
                  <motion.i 
                    className="ri-checkbox-circle-fill text-5xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  />
                  <span className="text-base">今日已签到</span>
                  <div className="text-sm text-green-100 font-normal">
                    🎉 已获得积分奖励
                  </div>
                </>
              ) : (
                <>
                  <motion.i 
                    className="ri-calendar-check-line text-5xl"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  />
                  <span className="text-base">每日签到</span>
                  <div className="text-sm text-blue-100 font-normal">
                    点击获得积分 🎁
                  </div>
                </>
              )}
            </motion.button>
            
            {/* 粒子效果 */}
            {!hasCheckedToday && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full"
                    style={{
                      left: `${20 + (i * 12)}%`,
                      top: `${25 + (i * 8)}%`,
                    }}
                    animate={{
                      y: [-5, -15, -5],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* 签到提示文字 */}
          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {hasCheckedToday ? (
              <p className="text-green-300 text-sm font-medium">
                ✨ 签到成功！明天再来领取奖励吧~
              </p>
            ) : (
              <p className="text-white/70 text-sm">
                💡 每日签到可获得积分，连续签到奖励更丰厚
              </p>
            )}
          </motion.div>
        </div>

        {/* 统计信息 */}
        {stats && (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-blue-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-blue-400 mb-1">{stats.totalCheckins}</div>
              <div className="text-xs text-white/60">总签到</div>
              <div className="mt-1">
                <i className="ri-calendar-line text-blue-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-green-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-green-400 mb-1">{stats.continuousCheckins}</div>
              <div className="text-xs text-white/60">连续签到</div>
              <div className="mt-1">
                <i className="ri-fire-line text-green-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.maxContinuous}</div>
              <div className="text-xs text-white/60">最长连续</div>
              <div className="mt-1">
                <i className="ri-trophy-line text-yellow-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-purple-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-purple-400 mb-1">{stats.totalPoints}</div>
              <div className="text-xs text-white/60">总积分</div>
              <div className="mt-1">
                <i className="ri-coin-line text-purple-400/60"></i>
              </div>
            </motion.div>
          </motion.div>
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

      {/* 用户名输入弹窗 */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => {
              if (userName.trim()) {
                setShowNameInput(false)
                setNameError('')
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-user-3-line text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">设置账号名称</h3>
                <p className="text-white/70 text-sm">
                  {userName ? '修改您的账号名称，这将在排行榜中显示' : '请设置您的账号名称，以便在排行榜中显示'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    账号名称
                  </label>
                  <input
                    type="text"
                    value={tempUserName}
                    onChange={(e) => {
                      setTempUserName(e.target.value)
                      setNameError('')
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveUserName()
                      }
                    }}
                    placeholder="请输入2-20个字符"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                    autoFocus
                  />
                  {nameError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-2 flex items-center gap-1"
                    >
                      <i className="ri-error-warning-line"></i>
                      {nameError}
                    </motion.p>
                  )}
                </div>

                <div className="text-xs text-white/50 space-y-1">
                  <div>• 支持中文、英文、数字和下划线</div>
                  <div>• 长度为 2-20 个字符</div>
                  <div>• 将在排行榜中公开显示</div>
                </div>

                <div className="flex gap-3 pt-2">
                  {userName && (
                    <button
                      onClick={() => {
                        setShowNameInput(false)
                        setNameError('')
                        setTempUserName(userName)
                      }}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-200 font-medium"
                    >
                      取消
                    </button>
                  )}
                  <button
                    onClick={saveUserName}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    {userName ? '保存修改' : '开始签到'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
