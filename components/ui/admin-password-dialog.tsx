"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface AdminPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
  title: string
  description: string
}

export function AdminPasswordDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description
}: AdminPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!password.trim()) {
      setError('请输入管理密码')
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(password)
      setPassword('')
      onClose()
    } catch (error: any) {
      setError(error.message || '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    setIsLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 max-w-md w-full"
            style={{
              background: "linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.90))",
              boxShadow: "0 20px 40px rgba(0,0,0,.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i className="ri-shield-keyhole-line text-yellow-600"></i>
                {title}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <p className="text-gray-600 mb-6">{description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  管理密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理密码"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-white/50 text-gray-800 placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all",
                    error ? "border-red-300" : "border-gray-300"
                  )}
                  disabled={isLoading}
                  autoFocus
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <i className="ri-error-warning-line"></i>
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!password.trim() || isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line"></i>
                      确认
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
