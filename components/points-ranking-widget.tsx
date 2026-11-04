"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"

interface PointsRankingWidgetProps {
  className?: string
  loggedInAccount?: string
}

interface PointsBoardEntry {
  rank: number
  userId: string
  userName: string
  totalActivityPoints: number
  checkinPoints: number
  otherActivityPoints: number
  balance: number
}

interface SceneSummaryItem {
  scene: string
  points: number
}

interface PointsBoardOverview {
  totalActivityPoints: number
  checkinPoints: number
  otherActivityPoints: number
}

const SCENE_LABELS: Record<string, string> = {
  daily_behavior: "日常活动",
  contribution: "贡献活动",
  growth: "成长活动",
  special: "特殊活动",
}

function toNumber(value: unknown) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function getRankIcon(rank: number) {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `#${rank}`
}

function getRankColor(rank: number) {
  if (rank === 1) return "text-yellow-300"
  if (rank === 2) return "text-slate-300"
  if (rank === 3) return "text-orange-300"
  return "text-white/70"
}

function formatSceneLabel(scene: string) {
  return SCENE_LABELS[scene] || scene
}

export default function PointsRankingWidget({ className, loggedInAccount = "" }: PointsRankingWidgetProps) {
  const [entries, setEntries] = useState<PointsBoardEntry[]>([])
  const [sceneSummary, setSceneSummary] = useState<SceneSummaryItem[]>([])
  const [overview, setOverview] = useState<PointsBoardOverview>({
    totalActivityPoints: 0,
    checkinPoints: 0,
    otherActivityPoints: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true)
    } else {
      setRefreshing(true)
    }
    setErrorMessage("")

    try {
      const response = await fetch("/.netlify/functions/points-board?limit=30", {
        method: "GET",
        cache: "no-store",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `加载积分排行榜失败 (${response.status})`)
      }

      const normalizedEntries: PointsBoardEntry[] = (data.entries || []).map((item: any, index: number) => ({
        rank: index + 1,
        userId: String(item.userId || ""),
        userName: String(item.userName || item.userId || "匿名用户"),
        totalActivityPoints: toNumber(item.totalActivityPoints),
        checkinPoints: toNumber(item.checkinPoints),
        otherActivityPoints: toNumber(item.otherActivityPoints),
        balance: toNumber(item.balance),
      }))

      const normalizedSummary: SceneSummaryItem[] = (data.sceneSummary || []).map((item: any) => ({
        scene: String(item.scene || "unknown"),
        points: toNumber(item.points),
      }))

      setEntries(normalizedEntries)
      setSceneSummary(normalizedSummary)
      setOverview({
        totalActivityPoints: toNumber(data?.overview?.totalActivityPoints),
        checkinPoints: toNumber(data?.overview?.checkinPoints),
        otherActivityPoints: toNumber(data?.overview?.otherActivityPoints),
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载积分排行榜失败")
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadBoard(false)
  }, [loadBoard])

  const topThree = useMemo(() => entries.slice(0, 3), [entries])

  if (isLoading) {
    return (
      <div className={cn("p-6 rounded-2xl border bg-white/5 backdrop-blur-sm", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="ml-3 text-white/70">加载积分排行榜中...</span>
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <i className="ri-award-line text-yellow-300"></i>
          积分排行榜
        </h3>
        <button
          onClick={() => loadBoard(true)}
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

      <p className="text-sm text-white/65 mb-5">汇总当前各项活动积分，已包含签到排行榜积分数据。</p>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {!errorMessage && <>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-lg font-semibold text-white">{overview.totalActivityPoints}</div>
          <div className="text-xs text-white/60">总活动积分</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-blue-500/10 p-3 text-center">
          <div className="text-lg font-semibold text-blue-200">{overview.checkinPoints}</div>
          <div className="text-xs text-white/60">签到积分</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-purple-500/10 p-3 text-center">
          <div className="text-lg font-semibold text-purple-200">{overview.otherActivityPoints}</div>
          <div className="text-xs text-white/60">其他活动积分</div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <i className="ri-bar-chart-grouped-line text-emerald-300"></i>
          活动积分汇总
        </div>
        {sceneSummary.length > 0 ? (
          <div className="space-y-2">
            {sceneSummary.map((item) => (
              <div key={item.scene} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{formatSceneLabel(item.scene)}</span>
                <span className="text-emerald-200">+{item.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/55">暂无活动积分数据</div>
        )}
      </div>

      {topThree.length > 0 && (
        <div className="mb-4 flex gap-2">
          {topThree.map((entry) => (
            <div
              key={`podium-${entry.userId}`}
              className={cn(
                "flex-1 rounded-lg border px-2 py-2 text-center",
                entry.rank === 1 ? "border-yellow-400/40 bg-yellow-500/10" : "border-white/15 bg-white/5"
              )}
            >
              <div className="text-sm">{getRankIcon(entry.rank)}</div>
              <div className="text-xs text-white truncate" title={entry.userName}>
                {entry.userName}
              </div>
              <div className="text-xs text-yellow-200">{entry.totalActivityPoints} 分</div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 ? (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {entries.map((entry) => {
            const isSelf = !!loggedInAccount && entry.userId === loggedInAccount
            return (
              <div
                key={`points-rank-${entry.userId}`}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  isSelf ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("text-base font-bold min-w-[3rem] text-center", getRankColor(entry.rank))}>
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate" title={`${entry.userName} (${entry.userId})`}>
                        {entry.userName}
                      </div>
                      <div className="text-xs text-white/55 truncate">账号：{entry.userId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-300 font-semibold">{entry.totalActivityPoints} 分</div>
                    <div className="text-xs text-white/55">余额：{entry.balance}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/70 flex items-center gap-4">
                  <span>签到：{entry.checkinPoints}</span>
                  <span>其他活动：{entry.otherActivityPoints}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🏆</div>
          <div className="text-white/60">暂无积分排行榜数据</div>
        </div>
      )}
      </>}
    </motion.div>
  )
}
