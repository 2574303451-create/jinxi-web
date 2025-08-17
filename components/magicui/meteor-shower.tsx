"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface Meteor {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  delay: number
}

interface MeteorShowerProps {
  count?: number
  className?: string
}

export function MeteorShower({ count = 10, className = "" }: MeteorShowerProps) {
  const [meteors, setMeteors] = useState<Meteor[]>([])

  useEffect(() => {
    const newMeteors: Meteor[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      angle: Math.random() * 30 + 15, // 15-45 degrees
      speed: Math.random() * 3 + 2,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 10,
    }))
    setMeteors(newMeteors)
  }, [count])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {meteors.map((meteor) => (
        <motion.div
          key={meteor.id}
          className="absolute"
          style={{
            left: `${meteor.x}%`,
            top: `${meteor.y}%`,
          }}
          animate={{
            x: [0, -200],
            y: [0, 300],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: meteor.speed,
            delay: meteor.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: Math.random() * 15 + 5,
            ease: "easeOut",
          }}
        >
          <div
            className="relative"
            style={{
              transform: `rotate(${meteor.angle}deg)`,
            }}
          >
            {/* Meteor head */}
            <div
              className="rounded-full bg-white"
              style={{
                width: `${meteor.size * 2}px`,
                height: `${meteor.size * 2}px`,
                boxShadow: `0 0 ${meteor.size * 4}px #60a5fa`,
              }}
            />
            {/* Meteor tail */}
            <div
              className="absolute top-1/2 left-full"
              style={{
                width: `${meteor.size * 20}px`,
                height: `${meteor.size}px`,
                background: "linear-gradient(90deg, #60a5fa80, transparent)",
                transform: "translateY(-50%)",
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
