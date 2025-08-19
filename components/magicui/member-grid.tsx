"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MemberDetailModal } from "@/components/member-detail-modal"

interface Member {
  id: number
  name: string
  image: string
  role: string
  description?: string
}

interface MemberGridProps {
  members: Member[]
  className?: string
}

export function MemberGrid({ members, className }: MemberGridProps) {
  const [filter, setFilter] = useState("all")
  const [visibleCount, setVisibleCount] = useState(12)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedMember(null), 300) // 延迟清空以确保动画完成
  }

  const roles = ["all", ...Array.from(new Set(members.map((m) => m.role)))]
  const filteredMembers = filter === "all" ? members : members.filter((m) => m.role === filter)
  const visibleMembers = filteredMembers.slice(0, visibleCount)

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 12, filteredMembers.length))
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filter Buttons */}
      <div className="flex justify-center gap-2 flex-wrap">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => {
              setFilter(role)
              setVisibleCount(12)
            }}
            className={cn(
              "px-4 py-2 rounded-xl border transition-all duration-200 hover:scale-105",
              filter === role
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-white/5 border-white/20 hover:bg-white/10",
            )}
          >
            {role === "all" ? "全部" : role}
          </button>
        ))}
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 member-grid">
        <AnimatePresence mode="popLayout">
          {visibleMembers.map((member, index) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative rounded-2xl overflow-hidden border bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 4px 12px rgba(0,0,0,.3)",
              }}
              whileHover={{
                boxShadow: "0 8px 25px rgba(0,0,0,.4), 0 0 20px rgba(96,165,250,.3)",
              }}
              onClick={() => handleMemberClick(member)}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={member.image || "/placeholder.svg"}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />

                {/* Overlay with role badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{
                      background: 
                        // 轮播成员角色
                        member.role === "会长" || member.role === "创始" ? "#d69e2e" :
                        member.role === "技术" || member.role === "技术控" ? "#805ad5" :
                        member.role === "组织团结" ? "#22c55e" :
                        member.role === "摆烂" || member.role === "元老级摆烂" ? "#6b7280" :
                        member.role === "情绪调控" ? "#f59e0b" :
                        member.role === "东北老爷们" ? "#8b5cf6" :
                        member.role === "嘴炮" ? "#ef4444" :
                        // 展示墙成员角色
                        member.role === "副会" ? "#dc2626" :
                        member.role === "精英" ? "#3b82f6" :
                        member.role === "萌新" ? "#10b981" :
                        member.role === "回忆" ? "#6366f1" :
                        // 原有角色
                        member.role === "火力" ? "#e53e3e" : 
                        member.role === "控位" ? "#4299e1" : 
                        member.role === "后勤" ? "#38a169" :
                        member.role === "战术官" ? "#3182ce" :
                        member.role === "外交" ? "#e53e3e" :
                        "#38a169",
                    }}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    {member.description && (
                      <p className="text-white/90 text-sm leading-relaxed">{member.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-bold text-white mb-1">{member.name}</h4>
                <p className="text-sm text-white/70">{member.role}</p>
              </div>

              {/* Animated border effect on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div
                  className="absolute inset-[-1px] rounded-2xl"
                  style={{
                    background: "conic-gradient(from 0deg, #60a5fa, #22c55e, #f59e0b, #fb7185, #60a5fa)",
                    animation: "spin 3s linear infinite",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: "1px",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {visibleCount < filteredMembers.length && (
        <div className="text-center">
          <button
            onClick={loadMore}
            className="px-6 py-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-all duration-200 hover:scale-105"
            style={{ borderColor: "rgba(255,255,255,.2)" }}
          >
            <i className="ri-add-line mr-2"></i>
            加载更多
          </button>
        </div>
      )}

      {/* 提示信息 */}
      <div className="text-center mt-4">
        <p className="text-white/60 text-sm">
          <i className="ri-information-line mr-1"></i>
          点击成员卡片查看详细信息
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
