"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MemberDetailModal } from "@/components/member-detail-modal"

interface Member {
  id: number
  name: string
  image: string
  role?: string
  description?: string
}

interface Carousel3DProps {
  members: Member[]
  className?: string
}

export function Carousel3D({ members, className }: Carousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [radius, setRadius] = useState(600)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const handleMemberDoubleClick = (member: Member) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedMember(null), 300)
  }

  const totalMembers = members.length
  const theta = 360 / totalMembers
  const angle = -currentIndex * theta

  useEffect(() => {
    const updateRadius = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const itemWidth = 320
        const desiredGap = 40
        const halfChord = (itemWidth + desiredGap) / 2
        const minRadius = halfChord / Math.sin((theta / 2) * (Math.PI / 180))
        const visibleRadius = containerWidth * 0.9
        setRadius(Math.max(minRadius, visibleRadius, 600))
      }
    }

    updateRadius()
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", updateRadius)
      return () => window.removeEventListener("resize", updateRadius)
    }
  }, [theta])

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalMembers)
    }, 3000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, totalMembers])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + totalMembers) % totalMembers)
    setIsAutoPlaying(false)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalMembers)
    setIsAutoPlaying(false)
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
  }

  return (
    <div className={cn("relative carousel-3d", className)}>
      <div
        ref={containerRef}
        className="relative h-[600px] md:h-[800px] lg:h-[1000px] overflow-hidden rounded-2xl carousel-stage"
        style={{ perspective: "1800px" }}
      >
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${angle}deg)`,
          }}
        >
          {members.map((member, index) => {
            const isSelected = index === currentIndex
            return (
              <motion.div
                key={member.id}
                className={cn(
                  "absolute left-1/2 top-1/2 w-80 h-96 -ml-40 -mt-48 rounded-2xl overflow-hidden border cursor-pointer",
                  isSelected ? "z-10" : "z-0",
                )}
                style={{
                  transform: `rotateY(${index * theta}deg) translateZ(${radius}px)`,
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: isSelected ? "#60a5fa" : "rgba(255,255,255,.12)",
                  boxShadow: isSelected
                    ? "0 0 30px rgba(96,165,250,.6), 0 18px 52px rgba(0,0,0,.48)"
                    : "0 18px 52px rgba(0,0,0,.48)",
                }}
                whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
                onClick={() => setCurrentIndex(index)}
                onDoubleClick={() => handleMemberDoubleClick(member)}
              >
                <div className="relative w-full h-full">
                  <img
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    className="w-full h-3/4 object-cover"
                    style={{ transform: "translateZ(20px)" }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 p-4 text-white"
                    style={{
                      background: "linear-gradient(180deg,transparent,rgba(0,0,0,.8))",
                      transform: "translateZ(25px)",
                    }}
                  >
                    <div className="font-bold text-lg">{member.name}</div>
                    {member.role && <div className="text-sm opacity-80">{member.role}</div>}
                  </div>

                  {/* Animated particles for selected member */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                      >
                        {Array.from({ length: 8 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-blue-400 rounded-full"
                            style={{
                              left: `${20 + ((i * 10) % 60)}%`,
                              top: `${15 + ((i * 15) % 70)}%`,
                            }}
                            animate={{
                              y: [-10, -30, -10],
                              opacity: [0, 1, 0],
                              scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4 mt-6 flex-wrap">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
          style={{ borderColor: "rgba(255,255,255,.2)" }}
        >
          <i className="ri-arrow-left-s-line"></i> 上一张
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
          style={{ borderColor: "rgba(255,255,255,.2)" }}
        >
          下一张 <i className="ri-arrow-right-s-line"></i>
        </button>

        <button
          onClick={toggleAutoPlay}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
          style={{ borderColor: "rgba(255,255,255,.2)" }}
        >
          <i className={isAutoPlaying ? "ri-pause-mini-line" : "ri-play-mini-line"}></i>
          {isAutoPlaying ? "暂停" : "恢复"}
        </button>

        <span className="text-sm opacity-70">
          {currentIndex + 1} / {totalMembers}
        </span>
      </div>

      {/* 提示信息 */}
      <div className="text-center mt-4">
        <p className="text-white/60 text-sm">
          <i className="ri-information-line mr-1"></i>
          单击选择成员，双击查看详细信息
        </p>
      </div>

      {/* 成员详情模态框 */}
      <MemberDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        member={selectedMember}
      />
    </div>
  )
}
