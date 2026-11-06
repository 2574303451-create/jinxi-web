"use client"

import { useCallback, useEffect, useState } from "react"
import { Modal } from "./ui/modal"

type AppreciationEntry = {
  id: number
  sponsor: string
  time: string
}

const QR_CODE_PATH = "./收钱码.jpg"

export function GuildSponsorship() {
  const [isOpen, setIsOpen] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [entries, setEntries] = useState<AppreciationEntry[]>([])

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true)
    setLoadError("")
    try {
      const response = await fetch("/.netlify/functions/sponsorship?limit=100", {
        method: "GET",
        cache: "no-store",
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `加载失败 (${response.status})`)
      }

      const normalized: AppreciationEntry[] = Array.isArray(data.entries)
        ? data.entries.map((item: any) => ({
            id: Number(item.id || Date.now()),
            sponsor: String(item.sponsor || ""),
            time: String(item.time || ""),
          }))
        : []

      setEntries(normalized)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "感谢名单加载失败，请稍后重试。")
    } finally {
      setIsLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    loadEntries()
  }, [isOpen, loadEntries])

  return (
    <>
      <button
        type="button"
        aria-label="赞助公会"
        title="赞助公会"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[160] h-12 w-12 rounded-full border border-white/30 text-xl text-white shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/70"
        style={{
          background: "linear-gradient(180deg,#fb7185,#be123c)",
          boxShadow: "0 10px 25px rgba(190,18,60,.35)",
        }}
      >
        <span aria-hidden="true">❤️</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="公会赞助" size="md">
        <div className="space-y-5">
          <div className="space-y-2">
            <h4 className="text-xl font-semibold text-white">❤️ 助力公会发展</h4>
            <p className="text-white/85 leading-relaxed text-sm sm:text-base">
              感谢大家一直以来的陪伴！为了维持公会的日常运营，我们开启了自愿赞助通道。赞助纯属自愿，量力而行，绝不强求。感谢各位的奉献！
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src={QR_CODE_PATH}
              alt="公会赞助收款二维码"
              className="w-44 sm:w-52 md:w-60 h-auto rounded-xl border border-white/20 shadow-lg"
            />
          </div>

          <p className="text-center text-xs sm:text-sm text-white/80">扫码付款时请备注您的【游戏昵称】哦！</p>

          <p className="paper-notice" role="status">赞助登记暂未开放。可查看已有感谢名单。</p>

          <hr className="border-white/20" />

          <div className="space-y-3">
            <h5 className="text-lg font-semibold text-white">🏆 感谢名单</h5>
            {loadError && <p className="paper-notice error" role="alert">{loadError}</p>}
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20">
              <table className="w-full text-sm">
                <thead className="bg-white/10">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-white/90">赞助人</th>
                    <th className="text-left px-4 py-2 font-medium text-white/90">赞助时间</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? null : isLoadingEntries ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-white/70">
                        感谢名单加载中...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-white/70">
                        暂无登记记录，感谢第一位支持者。
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-white/10">
                        <td className="px-4 py-2 text-white/90">{entry.sponsor}</td>
                        <td className="px-4 py-2 text-white/80">{entry.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
