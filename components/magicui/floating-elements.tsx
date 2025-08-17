"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface FloatingElement {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  shape: "circle" | "square" | "triangle" | "star"
  color: string
}

interface FloatingElementsProps {
  count?: number
  className?: string
}

export function FloatingElements({ count = 20, className = "" }: FloatingElementsProps) {
  const [elements, setElements] = useState<FloatingElement[]>([])

  const colors = ["#60a5fa40", "#22c55e40", "#f59e0b40", "#fb718540", "#a78bfa40"]
  const shapes = ["circle", "square", "triangle", "star"] as const

  useEffect(() => {
    const newElements: FloatingElement[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 10,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    setElements(newElements)
  }, [count])

  const renderShape = (element: FloatingElement) => {
    const baseProps = {
      width: element.size,
      height: element.size,
      style: { backgroundColor: element.color },
    }

    switch (element.shape) {
      case "circle":
        return <div {...baseProps} className="rounded-full" />
      case "square":
        return <div {...baseProps} className="rounded-sm" />
      case "triangle":
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${element.size / 2}px solid transparent`,
              borderRight: `${element.size / 2}px solid transparent`,
              borderBottom: `${element.size}px solid ${element.color}`,
            }}
          />
        )
      case "star":
        return (
          <div
            style={{
              width: element.size,
              height: element.size,
              background: element.color,
              clipPath:
                "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          />
        )
      default:
        return <div {...baseProps} className="rounded-full" />
    }
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            rotate: [0, 360],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          {renderShape(element)}
        </motion.div>
      ))}
    </div>
  )
}
