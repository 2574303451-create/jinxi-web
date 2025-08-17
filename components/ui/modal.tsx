"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative w-full ${sizeClasses[size]} rounded-2xl border shadow-2xl`}
            style={{
              background: "linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.04))",
              borderColor: "rgba(255,255,255,.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            )}
            <div className="p-6 text-white">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
