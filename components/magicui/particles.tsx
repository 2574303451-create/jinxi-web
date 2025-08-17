"use client"

import { useEffect, useRef } from "react"

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

interface ParticlesProps {
  count?: number
  colors?: string[]
  size?: [number, number]
  speed?: [number, number]
  className?: string
  interactive?: boolean
}

export function Particles({
  count = 50,
  colors = ["#60a5fa", "#22c55e", "#f59e0b", "#fb7185"],
  size = [1, 3],
  speed = [0.5, 2],
  className = "",
  interactive = false,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const createParticle = (id: number): Particle => {
      const maxLife = Math.random() * 300 + 200
      return {
        id,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed[1],
        vy: (Math.random() - 0.5) * speed[1],
        size: Math.random() * (size[1] - size[0]) + size[0],
        opacity: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: maxLife,
        maxLife,
      }
    }

    const initParticles = () => {
      particlesRef.current = Array.from({ length: count }, (_, i) => createParticle(i))
    }

    const updateParticles = () => {
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life--

        // Interactive mouse attraction
        if (interactive) {
          const dx = mouseRef.current.x - particle.x
          const dy = mouseRef.current.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            const force = (100 - distance) / 100
            particle.vx += (dx / distance) * force * 0.01
            particle.vy += (dy / distance) * force * 0.01
          }
        }

        // Boundary wrapping
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Fade out near end of life
        particle.opacity = Math.min(0.8, particle.life / particle.maxLife)

        // Respawn particle
        if (particle.life <= 0) {
          Object.assign(particle, createParticle(particle.id))
        }
      })
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle) => {
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
    }

    const animate = () => {
      updateParticles()
      drawParticles()
      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    resizeCanvas()
    initParticles()
    animate()

    window.addEventListener("resize", resizeCanvas)
    if (interactive) {
      canvas.addEventListener("mousemove", handleMouseMove)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", resizeCanvas)
      if (interactive) {
        canvas.removeEventListener("mousemove", handleMouseMove)
      }
    }
  }, [count, colors, size, speed, interactive])

  return (
    <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }} />
  )
}
