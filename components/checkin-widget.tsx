"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"
import { CheckinRecord, CheckinStatus } from "../types/checkin"
import * as checkinAPI from "../services/checkin-service"
import { updateCheckinStreak } from "../services/daily-task-service"

interface CheckinWidgetProps {
  className?: string
  loggedInAccount?: string
}

export function CheckinWidget({ className, loggedInAccount = "" }: CheckinWidgetProps) {
  const [account, setAccount] = useState(loggedInAccount)
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history, setHistory] = useState<CheckinRecord[]>([])
  const [errorMessage, setErrorMessage] = useState("")

  const isLoggedIn = !!account
  const hasCheckedToday = checkinStatus?.hasCheckedToday || false
  const stats = checkinStatus?.userStats
  const pointAccount = checkinStatus?.pointAccount

  useEffect(() => {
    setAccount(loggedInAccount || "")
  }, [loggedInAccount])

  useEffect(() => {
    const syncAuthState = () => {
      if (typeof window === "undefined") return
      setAccount(localStorage.getItem("jinxi-auth-account") || "")
    }

    syncAuthState()
    window.addEventListener("jinxi-auth-changed", syncAuthState as EventListener)
    return () => {
      window.removeEventListener("jinxi-auth-changed", syncAuthState as EventListener)
    }
  }, [])

  const loadCheckinStatus = useCallback(async () => {
    if (!account) {
      setCheckinStatus(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage("")
    try {
      const status = await checkinAPI.getCheckinStatus(account)
      setCheckinStatus(status)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载签到状态失败")
    } finally {
      setIsLoading(false)
    }
  }, [account])

  useEffect(() => {
    loadCheckinStatus()
  }, [loadCheckinStatus])

  const handleCheckin = async () => {
    if (!account || isChecking) return

    setIsChecking(true)
    setErrorMessage("")
    try {
      const result = await checkinAPI.performCheckin(account)
      if (!result.success) {
        setErrorMessage(result.message || "签到失败，请稍后重试")
        return
      }

      // 中文注释：签到成功后联动每日任务系统
      updateCheckinStreak()

      await loadCheckinStatus()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "签到失败，请稍后重试")
    } finally {
      setIsChecking(false)
    }
  }

  const openHistory = async () => {
    if (!account) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const records = await checkinAPI.getCheckinHistory(account, 14)
      setHistory(records)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载签到历史失败")
    } finally {
      setHistoryLoading(false)
    }
  }

  const nextRewardPoints = useMemo(() => {
    const nextContinuous = (stats?.continuousCheckins || 0) + 1
    return checkinAPI.calculateRewardPoints(nextContinuous)
  }, [stats?.continuousCheckins])

  if (!isLoggedIn) {
    return (
      <div className={cn("p-6 rounded-2xl border bg-white/5 backdrop-blur-sm", className)}>
        <div className="flex items-center gap-3 mb-4">
          <i className="ri-calendar-check-line text-2xl text-blue-400"></i>
          <div>
            <h3 className="text-xl font-bold text-white">每日签到</h3>
            <p className="text-sm text-white/60">签到模块已与账号系统绑定</p>
          </div>
        </div>
        <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-yellow-200 text-sm">
          请先登录后签到。登录成功后将自动绑定账号身份并解锁签到按钮。
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border bg-white/5 backdrop-blur-sm"
        style={{
          borderColor: "rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.08)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="ri-calendar-check-line text-green-400"></i>
              每日签到
            </h3>
            <p className="text-sm text-white/60 mt-1">
              当前账号：<span className="text-white">{account}</span>
            </p>
          </div>
          <button
            onClick={openHistory}
            className="px-3 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            签到历史
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60 mb-1">今日状态</div>
            <div className={cn("text-lg font-semibold", hasCheckedToday ? "text-green-300" : "text-blue-300")}>
              {isLoading ? "加载中..." : hasCheckedToday ? "今日已签到" : "今日未签到"}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60 mb-1">下次签到奖励</div>
            <div className="text-lg font-semibold text-yellow-300">+{nextRewardPoints} 积分</div>
          </div>
        </div>

        {/* 中文注释：签到主按钮，未登录或今日已签时自动禁用 */}
        <button
          onClick={handleCheckin}
          disabled={isLoading || hasCheckedToday || isChecking}
          className={cn(
            "w-full py-4 rounded-xl text-white font-semibold transition-all",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasCheckedToday
              ? "bg-gradient-to-r from-green-600 to-emerald-600"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          )}
        >
          {isChecking ? "签到处理中..." : hasCheckedToday ? "今日已签到" : "立即签到"}
        </button>

        {(stats || pointAccount) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-lg text-blue-300 font-bold">{stats?.totalCheckins || 0}</div>
              <div className="text-xs text-white/60">总签到天数</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-lg text-green-300 font-bold">{stats?.continuousCheckins || 0}</div>
              <div className="text-xs text-white/60">当前连续</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-lg text-yellow-300 font-bold">{stats?.maxContinuous || 0}</div>
              <div className="text-xs text-white/60">最长连续</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-lg text-purple-300 font-bold">
                {pointAccount ? pointAccount.balance : stats?.totalPoints || 0}
              </div>
              <div className="text-xs text-white/60">{pointAccount ? "当前余额" : "累计积分"}</div>
            </div>
          </div>
        )}
      </motion.div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <i className="ri-lightbulb-line text-yellow-300"></i>
          签到活动规则（已对接账号）
        </h4>
        <ul className="text-sm text-white/75 space-y-2">
          <li>基础签到：每日 1 次，必须已登录账号才可签到。</li>
          <li>连续奖励：第 1-2 天 +1，第 3-6 天 +2，第 7 天及以上 +3。</li>
          <li>身份统一：签到昵称由账号自动绑定，前端不可手动修改。</li>
          <li>防重复：同一账号同一天不可重复签到。</li>
        </ul>
      </div>

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white text-lg font-semibold">最近 14 天签到记录</h4>
              <button
                onClick={() => setHistoryOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <div className="text-white/70 py-6 text-center">加载中...</div>
            ) : history.length === 0 ? (
              <div className="text-white/70 py-6 text-center">暂无签到记录</div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {history.map((record) => (
                  <div key={record.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm">{record.checkinDate}</div>
                      <div className="text-yellow-300 text-sm">+{record.rewardPoints} 积分</div>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {record.isContinuous ? `连续签到第 ${record.continuousDays} 天` : "普通签到"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
