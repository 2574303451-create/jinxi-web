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
  const [showNameInput, setShowNameInput] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [nameError, setNameError] = useState('')

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
    localStorage.setItem('jinxi-user-name', trimmedName)
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
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
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
