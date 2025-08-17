"use client"

import { motion } from "framer-motion"

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: string
}

export function Progress({ value, max = 100, className, showLabel = false, color = "#60a5fa" }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-white/80 mb-2">
          <span>进度</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
