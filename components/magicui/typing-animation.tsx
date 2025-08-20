"use client"

import { cn } from "../../lib/utils"
import { motion } from "framer-motion"

interface TypingAnimationProps {
  text: string
  className?: string
  duration?: number
}

export function TypingAnimation({ text, className, duration = 200 }: TypingAnimationProps) {
  const letters = Array.from(text)

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration / 1000, delayChildren: 0.04 * i },
    }),
  }

  const child = {
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      x: -20,
      y: 10,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  }

  return (
    <motion.div
      style={{ overflow: "hidden", display: "flex", fontSize: "inherit" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {letters.map((letter, index) => (
        <motion.span variants={child} key={index} className={cn(letter === " " ? "mr-1" : "")}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  )
}
