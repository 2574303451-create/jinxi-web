"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface AnimatedBeamProps {
  className?: string
  children?: React.ReactNode
  delay?: number
  duration?: number
}

export function AnimatedBeam({ className, children, delay = 0, duration = 2 }: AnimatedBeamProps) {
  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 3,
          delay: delay + 1,
          ease: "linear",
        }}
      />
      {children}
    </motion.div>
  )
}
