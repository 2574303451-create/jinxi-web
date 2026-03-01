"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"
import { getUserId, getUserName, setUserName as persistUserName } from "../lib/user-utils"
import { CheckinStatus, CheckinResult, UserCheckinStats } from "../types/checkin"
import * as checkinAPI from "../services/checkin-service"
import { updateTaskProgress, updateCheckinStreak } from "../services/daily-task-service"

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

  // 浣跨敤鍏变韩鐨勭敤鎴稩D鍜岀敤鎴峰悕宸ュ叿
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = getUserId()
      const name = getUserName()

      setUserId(id)
      setUserName(name)
      setTempUserName(name)

      // 濡傛灉娌℃湁鐢ㄦ埛鍚嶏紝鏄剧ず杈撳叆鐣岄潰
    }
  }, [])

  // 鍔犺浇绛惧埌鐘舵€?
  const loadCheckinStatus = async () => {
    if (!userId) return
    
    try {
      setIsLoading(true)
      const status = await checkinAPI.getCheckinStatus(userId)
      setCheckinStatus(status)
    } catch (error) {
      console.error('鍔犺浇绛惧埌鐘舵€佸け璐?', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 楠岃瘉鐢ㄦ埛鍚?
  const validateUserName = (name: string): boolean => {
    setNameError('')
    
    if (!name.trim()) {
      setNameError('Please enter your account name')
      return false
    }
    
    if (name.trim().length < 2) {
      setNameError('Account name must be at least 2 characters')
      return false
    }
    
    if (name.trim().length > 20) {
      setNameError('Account name must be at most 20 characters')
      return false
    }
    
    // 妫€鏌ョ壒娈婂瓧绗?
    const validPattern = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
    if (!validPattern.test(name.trim())) {
      setNameError('Only Chinese, English letters, numbers, and underscore are allowed')
      return false
    }
    
    return true
  }

  // 淇濆瓨鐢ㄦ埛鍚?
  const handleSaveUserName = () => {
    if (!validateUserName(tempUserName)) {
      return
    }

    const trimmedName = tempUserName.trim()
    setUserName(trimmedName)
    persistUserName(trimmedName)
    setShowNameInput(false)
    setNameError('')
  }

  // 缂栬緫鐢ㄦ埛鍚?
  const editUserName = () => {
    setTempUserName(userName)
    setShowNameInput(true)
    setNameError('')
  }

  // 鎵ц绛惧埌
  const handleCheckin = async () => {
    if (!userId || isChecking) return

    // 妫€鏌ユ槸鍚︽湁鐢ㄦ埛鍚?
    if (!userName.trim()) {
      setShowNameInput(true)
      alert('璇峰厛璁剧疆鎮ㄧ殑璐﹀彿鍚嶇О')
      return
    }

    try {
      setIsChecking(true)
      const result: CheckinResult = await checkinAPI.performCheckin(userId, userName)

      if (result.success) {
        // 绛惧埌鎴愬姛锛岄噸鏂板姞杞界姸鎬?
        await loadCheckinStatus()

        // 鏇存柊姣忔棩浠诲姟杩涘害
        updateTaskProgress('daily-checkin', 1)

        // 鏇存柊绛惧埌杩炵画澶╂暟
        updateCheckinStreak()

        // 鏄剧ず鎴愬姛鎻愮ず
        const message = checkinAPI.getCheckinMessage(result.continuousDays || 1)
        alert(`馃帀 ${message}\n鑾峰緱绉垎锛?{result.rewardPoints}`)
      } else {
        alert(result.message)
      }
    } catch (error: any) {
      console.error('绛惧埌澶辫触:', error)
      alert('Check-in failed: ' + error.message)
    } finally {
      setIsChecking(false)
    }
  }

  // 鏌ョ湅绛惧埌鍘嗗彶
  const loadHistory = async () => {
    if (!userId) return
    
    try {
      const history = await checkinAPI.getCheckinHistory(userId, 7) // 鏈€杩?澶?
      setCheckinHistory(history)
      setShowHistory(true)
    } catch (error) {
      console.error('鍔犺浇绛惧埌鍘嗗彶澶辫触:', error)
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
          <span className="ml-3 text-white/70">鍔犺浇涓?..</span>
        </div>
      </div>
    )
  }

  const stats = checkinStatus?.userStats
  const hasCheckedToday = checkinStatus?.hasCheckedToday || false

  return (
    <div className={cn("space-y-6", className)}>
      {/* 涓荤鍒伴潰鏉?*/}
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
            姣忔棩绛惧埌
          </h3>
          
          {stats && (
            <button
              onClick={loadHistory}
              className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors"
            >
              <i className="ri-history-line"></i>
              鍘嗗彶璁板綍
            </button>
        </div>

        {/* 鐢ㄦ埛鍚嶇鐞嗗尯鍩?*/}
        <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="ri-user-3-line text-blue-400 text-lg"></i>
              <div>
                <div className="text-sm text-white/60">褰撳墠璐﹀彿</div>
                <div className="text-white font-medium">
                  {userName ? userName : 'Not set'}
                </div>
              </div>
            </div>
            <button
              onClick={editUserName}
              className="text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 flex items-center gap-1"
            >
              <i className="ri-edit-line"></i>
              {userName ? '淇敼' : '璁剧疆'}
            </button>
          </div>
        </div>

        {/* 绛惧埌鎸夐挳鍖哄煙 - 灞呬腑绐佸嚭 */}
        <div className="flex flex-col items-center justify-center mb-8">
          {/* 瑁呴グ鎬ц儗鏅渾鍦?*/}
          <div className="relative flex items-center justify-center">
            {/* 澶栧眰瑁呴グ鍦嗙幆 */}
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
            
            {/* 涓眰鑳屾櫙 */}
            <div className="absolute inset-0 w-44 h-44 m-2 rounded-full bg-white/5 backdrop-blur-sm" />
            
            {/* 绛惧埌鎸夐挳 */}
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
                  <span className="text-base">绛惧埌涓?..</span>
                </>
              ) : hasCheckedToday ? (
                <>
                  <motion.i 
                    className="ri-checkbox-circle-fill text-5xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  />
                  <span className="text-base">浠婃棩宸茬鍒?/span>
                  <div className="text-sm text-green-100 font-normal">
                    馃帀 宸茶幏寰楃Н鍒嗗鍔?
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
                  <span className="text-base">姣忔棩绛惧埌</span>
                  <div className="text-sm text-blue-100 font-normal">
                    鐐瑰嚮鑾峰緱绉垎 馃巵
                  </div>
                </>
              )}
            </motion.button>
            
            {/* 绮掑瓙鏁堟灉 */}
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
          
          {/* 绛惧埌鎻愮ず鏂囧瓧 */}
          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {hasCheckedToday ? (
              <p className="text-green-300 text-sm font-medium">
                鉁?绛惧埌鎴愬姛锛佹槑澶╁啀鏉ラ鍙栧鍔卞惂~
              </p>
            ) : (
              <p className="text-white/70 text-sm">
                馃挕 姣忔棩绛惧埌鍙幏寰楃Н鍒嗭紝杩炵画绛惧埌濂栧姳鏇翠赴鍘?
              </p>
            )}
          </motion.div>
        </div>

        {/* 缁熻淇℃伅 */}
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
              <div className="text-xs text-white/60">鎬荤鍒?/div>
              <div className="mt-1">
                <i className="ri-calendar-line text-blue-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-green-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-green-400 mb-1">{stats.continuousCheckins}</div>
              <div className="text-xs text-white/60">杩炵画绛惧埌</div>
              <div className="mt-1">
                <i className="ri-fire-line text-green-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.maxContinuous}</div>
              <div className="text-xs text-white/60">鏈€闀胯繛缁?/div>
              <div className="mt-1">
                <i className="ri-trophy-line text-yellow-400/60"></i>
              </div>
            </motion.div>
            <motion.div 
              className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 hover:border-purple-400/30 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="text-2xl font-bold text-purple-400 mb-1">{stats.totalPoints}</div>
              <div className="text-xs text-white/60">鎬荤Н鍒?/div>
              <div className="mt-1">
                <i className="ri-coin-line text-purple-400/60"></i>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 浠婃棩濂栧姳淇℃伅 */}
        {stats && !hasCheckedToday && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">浠婃棩绛惧埌鍙幏寰楋細</span>
              <span className="text-yellow-400 font-medium">
                {checkinAPI.calculateRewardPoints(stats.continuousCheckins + 1)} 绉垎
              </span>
            </div>
            {stats.continuousCheckins > 0 && (
              <div className="text-xs text-white/60 mt-1">
                杩炵画绛惧埌 {stats.continuousCheckins + 1} 澶?
              </div>
            )}
          </div>
        )}

        {/* 榧撳姳鏂囨 */}
        {!stats && !hasCheckedToday && (
          <div className="mt-4 text-center">
            <p className="text-white/70 text-sm">
              馃専 寮€濮嬫偍鐨勭涓€娆＄鍒帮紝鑾峰緱绉垎濂栧姳锛?
            </p>
          </div>
        )}
      </motion.div>

      {/* 绛惧埌鍘嗗彶寮圭獥 */}
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
                <h3 className="text-lg font-semibold text-gray-800">绛惧埌鍘嗗彶</h3>
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
                          {record.isContinuous ? `Streak ${record.continuousDays} days` : 'Single check-in'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-600">+{record.rewardPoints}</div>
                        <div className="text-xs text-gray-500">绉垎</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    鏆傛棤绛惧埌璁板綍
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 鐢ㄦ埛鍚嶈緭鍏ュ脊绐?*/}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowNameInput(false)
              setNameError('')
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
                <h3 className="text-xl font-bold text-white mb-2">璁剧疆璐﹀彿鍚嶇О</h3>
                <p className="text-white/70 text-sm">
                  {userName ? 'Update your account name' : 'Set your account name for check-in display'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    璐﹀彿鍚嶇О
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
                        handleSaveUserName()
                      }
                    }}
                    placeholder="Please enter 2-20 characters"
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
                  <div>鈥?鏀寔涓枃銆佽嫳鏂囥€佹暟瀛楀拰涓嬪垝绾?/div>
                  <div>鈥?闀垮害涓?2-20 涓瓧绗?/div>
                  <div>鈥?灏嗗湪鎺掕姒滀腑鍏紑鏄剧ず</div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                      onClick={() => {
                        setShowNameInput(false)
                        setNameError('')
                        setTempUserName(userName)
                      }}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-200 font-medium"
                    >
                      鍙栨秷
                    </button>
                  <button
                    onClick={handleSaveUserName}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    {userName ? 'Save' : 'Start Check-in'}
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


