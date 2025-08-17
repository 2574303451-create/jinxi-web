"use client"

import { motion } from "framer-motion"

interface AuroraBackgroundProps {
  className?: string
  colors?: string[]
}

export function AuroraBackground({
  className = "",
  colors = ["#60a5fa", "#22c55e", "#f59e0b", "#fb7185", "#a78bfa"],
}: AuroraBackgroundProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {colors.map((color, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full mix-blend-screen filter blur-xl opacity-30"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            width: `${300 + index * 100}px`,
            height: `${300 + index * 100}px`,
          }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -100, 50, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 20 + index * 5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: index * 2,
          }}
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  )
}
