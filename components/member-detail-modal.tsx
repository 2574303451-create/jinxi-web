"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Member {
  id: number
  name: string
  image: string
  role: string
  description?: string
}

interface MemberDetailModalProps {
  isOpen: boolean
  onClose: () => void
  member: Member | null
}

export function MemberDetailModal({ isOpen, onClose, member }: MemberDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (isOpen && member) {
      setImageLoaded(false)
    }
  }, [isOpen, member])

  if (!member) return null

  const getRoleColor = (role: string) => {
    const roleColors = {
      // 轮播成员角色
      "会长": "#d69e2e",
      "创始": "#d69e2e", 
      "技术": "#805ad5",
      "技术控": "#805ad5",
      "组织团结": "#22c55e",
      "摆烂": "#6b7280",
      "元老级摆烂": "#6b7280",
      "情绪调控": "#f59e0b",
      "东北老爷们": "#8b5cf6",
      "嘴炮": "#ef4444",
      // 展示墙成员角色
      "副会": "#3b82f6",
      "精英": "#dc2626", 
      "萌新": "#10b981",
      "回忆": "#6366f1",
      // 原有角色
      "火力": "#e53e3e",
      "控位": "#4299e1",
      "后勤": "#38a169",
      "战术官": "#3182ce",
      "外交": "#e53e3e"
    }
    return roleColors[role as keyof typeof roleColors] || "#38a169"
  }

  const getRoleGradient = (role: string) => {
    const baseColor = getRoleColor(role)
    // 将颜色转换为渐变
    const colorMap: { [key: string]: string } = {
      "#d69e2e": "from-yellow-400 to-orange-500",
      "#805ad5": "from-purple-400 to-purple-600", 
      "#22c55e": "from-green-400 to-green-600",
      "#6b7280": "from-gray-400 to-gray-600",
      "#f59e0b": "from-amber-400 to-orange-500",
      "#8b5cf6": "from-violet-400 to-purple-500",
      "#ef4444": "from-red-400 to-red-600",
      "#3b82f6": "from-blue-400 to-blue-600",
      "#dc2626": "from-red-500 to-red-700",
      "#10b981": "from-emerald-400 to-green-500", 
      "#6366f1": "from-indigo-400 to-purple-500",
      "#e53e3e": "from-red-400 to-pink-500",
      "#4299e1": "from-blue-300 to-blue-500",
      "#38a169": "from-green-400 to-emerald-500",
      "#3182ce": "from-blue-500 to-indigo-600"
    }
    return colorMap[baseColor] || "from-green-400 to-emerald-500"
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* 模态框内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 高光边框效果 */}
            <div 
              className="absolute inset-0 rounded-3xl p-[3px]"
              style={{
                background: `conic-gradient(from 0deg, ${getRoleColor(member.role)}, transparent, ${getRoleColor(member.role)})`,
                animation: "spin 6s linear infinite"
              }}
            >
              <div 
                className="w-full h-full rounded-3xl"
                style={{
                  background: "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))"
                }}
              />
            </div>

            {/* 内容区域 */}
            <div className="relative z-10 p-8 h-full flex flex-col lg:flex-row gap-8 items-center">
              
              {/* 图片区域 */}
              <div className="flex-1 flex justify-center items-center">
                <div className="relative group">
                  {/* 图片容器 */}
                  <div className="relative rounded-2xl overflow-hidden">
                    <motion.img
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      className="w-full h-auto max-w-md max-h-[60vh] object-cover"
                      style={{
                        filter: imageLoaded ? "none" : "blur(5px)",
                        transition: "filter 0.3s ease"
                      }}
                      onLoad={() => setImageLoaded(true)}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                    />
                    
                    {/* 图片高光效果 */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-60"
                      style={{
                        background: `linear-gradient(45deg, transparent 30%, ${getRoleColor(member.role)}20 50%, transparent 70%)`,
                        animation: "shimmer 3s ease-in-out infinite"
                      }}
                    />
                  </div>

                  {/* 角色徽章 */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", damping: 15 }}
                    className="absolute -top-4 -right-4"
                  >
                    <div 
                      className={cn(
                        "px-4 py-2 rounded-xl text-white font-bold text-sm shadow-lg",
                        `bg-gradient-to-r ${getRoleGradient(member.role)}`
                      )}
                      style={{
                        boxShadow: `0 0 20px ${getRoleColor(member.role)}40`
                      }}
                    >
                      {member.role}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* 信息区域 */}
              <div className="flex-1 space-y-6">
                {/* 姓名 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 
                    className="text-4xl font-bold text-transparent bg-clip-text mb-2"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${getRoleColor(member.role)}, #ffffff)`
                    }}
                  >
                    {member.name}
                  </h2>
                  <div className="h-1 w-24 rounded-full bg-gradient-to-r from-current to-transparent opacity-60" />
                </motion.div>

                {/* 描述 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  {member.description ? (
                    <div 
                      className="p-6 rounded-2xl border relative overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
                        borderColor: `${getRoleColor(member.role)}40`,
                        boxShadow: `0 8px 32px ${getRoleColor(member.role)}20`
                      }}
                    >
                      {/* 背景装饰 */}
                      <div 
                        className="absolute inset-0 opacity-5"
                        style={{
                          background: `radial-gradient(circle at 30% 20%, ${getRoleColor(member.role)}, transparent 50%)`
                        }}
                      />
                      
                      <p className="text-white text-lg leading-relaxed relative z-10 font-medium">
                        {member.description}
                      </p>
                      
                      {/* 引用装饰 */}
                      <div 
                        className="absolute top-2 left-2 text-6xl opacity-20"
                        style={{ color: getRoleColor(member.role) }}
                      >
                        "
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-white/60 text-lg">暂无详细描述</div>
                      <div className="text-white/40 text-sm mt-2">期待更多精彩故事...</div>
                    </div>
                  )}
                </motion.div>

                {/* 装饰性信息 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-4 text-white/60 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <i className="ri-user-star-line"></i>
                    <span>公会成员</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/40"></div>
                  <div className="flex items-center gap-2">
                    <i className="ri-shield-star-line"></i>
                    <span>今夕公会</span>
                  </div>
                </motion.div>
              </div>

              {/* 关闭按钮 */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <i className="ri-close-line text-xl"></i>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// CSS动画样式将通过 Tailwind CSS 和 globals.css 处理
