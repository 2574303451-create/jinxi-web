"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Sparkles } from "@/components/magicui/sparkles"
import { TypingAnimation } from "@/components/magicui/typing-animation"
import { Particles } from "@/components/magicui/particles"
import { FloatingElements } from "@/components/magicui/floating-elements"

interface IntroPageProps {
  onComplete: () => void
}

export function IntroPage({ onComplete }: IntroPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showSkipButton, setShowSkipButton] = useState(false)

  useEffect(() => {
    // 3秒后显示跳过按钮
    const timer = setTimeout(() => {
      setShowSkipButton(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleVideoEnd = () => {
    // 视频播放结束后自动进入主页
    setTimeout(() => {
      onComplete()
    }, 2000)
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* 背景粒子效果 */}
      <Particles
        count={50}
        className="absolute inset-0"
        size={[0.5, 2]}
        speed={[0.1, 0.5]}
        colors={["#60a5fa40", "#22c55e40", "#f59e0b40"]}
      />
      
      {/* 浮动元素 */}
      <FloatingElements count={12} className="absolute inset-0" />

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Logo/标题区域 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mb-8"
              >
                <Sparkles className="mb-6">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-blue-400/30 shadow-2xl">
                    <img
                      src="/logo.png"
                      alt="今夕公会"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Sparkles>

                <TypingAnimation
                  text="弹弹堂 · 今夕公会"
                  className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent mb-4"
                />
              </motion.div>

              {/* 历史介绍 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="space-y-6 text-lg md:text-xl text-blue-100"
              >
                <div className="p-6 rounded-2xl border border-blue-400/20 bg-blue-950/30 backdrop-blur-sm">
                  <p className="leading-relaxed">
                    始建于 <span className="text-yellow-300 font-semibold">2018年7月酷暑</span>
                  </p>
                  <p className="leading-relaxed mt-2">
                    创始人：<span className="text-blue-300 font-semibold">执手问年华</span>
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5, duration: 0.8 }}
                  className="text-blue-200"
                >
                  <p>七年风雨同舟，今夕依然闪耀</p>
                  <p>每一局都有高光，每一次集合都有欢笑</p>
                </motion.div>
              </motion.div>

              {/* 继续按钮 */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.5, duration: 0.8 }}
                onClick={() => setCurrentStep(1)}
                className="mt-12 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
              >
                <span>观看精彩视频</span>
                <i className="ri-play-circle-line text-xl"></i>
              </motion.button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="video"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-4xl mx-auto text-center"
            >
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl md:text-4xl font-bold text-white mb-8"
              >
                今夕公会 · 精彩瞬间
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-blue-400/30"
              >
                <video
                  src="/2.mp4"
                  controls
                  autoPlay
                  onLoadedData={() => setIsVideoLoaded(true)}
                  onEnded={handleVideoEnd}
                  className="w-full h-auto max-h-[70vh] bg-black"
                  poster="/logo.png"
                >
                  您的浏览器不支持视频播放。
                </video>

                {!isVideoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-950/50 backdrop-blur-sm">
                    <div className="text-center text-white">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p>视频加载中...</p>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                onClick={onComplete}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 mx-auto"
              >
                <span>进入官网</span>
                <i className="ri-arrow-right-line"></i>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 跳过按钮 */}
        <AnimatePresence>
          {showSkipButton && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onClick={handleSkip}
              className="fixed top-6 right-6 px-4 py-2 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white rounded-lg backdrop-blur-sm transition-all duration-300 flex items-center gap-2 text-sm"
            >
              <span>跳过介绍</span>
              <i className="ri-skip-forward-line"></i>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 底部装饰 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4, duration: 0.8 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 text-center text-blue-300/60 text-sm"
        >
          <div className="flex items-center gap-2">
            <i className="ri-heart-fill text-red-400"></i>
            <span>Welcome to JINXI Guild</span>
            <i className="ri-heart-fill text-red-400"></i>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
