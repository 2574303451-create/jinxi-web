"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  duration?: number
}

interface ToastContextType {
  addToast: (message: string, type: Toast["type"], duration?: number) => void
}

let toastContext: ToastContextType | null = null

export function useToast() {
  return toastContext!
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: Toast["type"], duration = 3000) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }

    setToasts((prev) => [...prev, toast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  toastContext = { addToast }

  const getToastStyles = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return { bg: "#22c55e", icon: "ri-check-line" }
      case "error":
        return { bg: "#ef4444", icon: "ri-close-line" }
      case "warning":
        return { bg: "#f59e0b", icon: "ri-alert-line" }
      case "info":
      default:
        return { bg: "#60a5fa", icon: "ri-information-line" }
    }
  }

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => {
            const styles = getToastStyles(toast.type)
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg backdrop-blur-sm max-w-sm"
                style={{ background: `${styles.bg}dd` }}
              >
                <i className={`${styles.icon} text-lg`}></i>
                <span className="flex-1 text-sm font-medium">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <i className="ri-close-line"></i>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </>
  )
}
