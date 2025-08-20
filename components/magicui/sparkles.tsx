"use client"

import type React from "react"

import { cn } from "../../lib/utils"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface SparklesProps {
  className?: string
  children?: React.ReactNode
  density?: number
}

export function Sparkles({ className, children, density = 8 }: SparklesProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: density }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      }))
      setSparkles(newSparkles)
    }

    generateSparkles()
    const interval = setInterval(generateSparkles, 3000)
    return () => clearInterval(interval)
  }, [density])

  return (
    <div className={cn("relative", className)}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute w-1 h-1 bg-yellow-400 rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{
            duration: 2,
            delay: sparkle.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 1,
          }}
        />
      ))}
      {children}
    </div>
  )
}
