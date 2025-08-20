"use client"

import { useState, useEffect } from 'react'
import { AnimatedBeam } from './magicui/animated-beam'
import { Sparkles } from './magicui/sparkles'
import { TypingAnimation } from './magicui/typing-animation'
import { Particles } from './magicui/particles'

interface AnniversaryEasterEggProps {
  isVisible: boolean
  onClose: () => void
}

export function AnniversaryEasterEgg({ isVisible, onClose }: AnniversaryEasterEggProps) {
  const [showFireworks, setShowFireworks] = useState(false)
  const [showText, setShowText] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(0)

  const anniversaryMessages = [
    "🎉 今夕公会 7周年庆典 🎉",
    "七年征程，星光为伴",
    "七载春秋，今夕如初",
    "感谢每一位今夕家人",
    "愿今夕的故事永远续写",
    "下一个七年，我们一起前行！"
  ]

  useEffect(() => {
    if (isVisible) {
      // 延迟显示效果，创造层次感
      const fireworksTimer = setTimeout(() => setShowFireworks(true), 300)
      const textTimer = setTimeout(() => setShowText(true), 800)
      
      // 循环显示庆祝消息
      const messageInterval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % anniversaryMessages.length)
      }, 3000)

      // 自动关闭彩蛋（15秒后）
      const autoCloseTimer = setTimeout(() => {
        onClose()
      }, 15000)

      return () => {
        clearTimeout(fireworksTimer)
        clearTimeout(textTimer)
        clearInterval(messageInterval)
        clearTimeout(autoCloseTimer)
      }
    } else {
      setShowFireworks(false)
      setShowText(false)
      setCurrentMessage(0)
    }
  }, [isVisible, onClose, anniversaryMessages.length])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)'
        }}
        onClick={onClose}
      />
      
      {/* 背景粒子效果 */}
      <Particles
        count={200}
        className="absolute inset-0"
        interactive={true}
        colors={["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8E8"]}
        size={[1, 4]}
        speed={[0.3, 1.5]}
      />

      {/* 烟花效果 */}
      {showFireworks && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                top: Math.random() * 60 + 20 + '%',
                left: Math.random() * 80 + 10 + '%',
                animationDelay: Math.random() * 2 + 's',
                animationDuration: Math.random() * 2 + 1 + 's'
              }}
            >
              <div className="relative">
                {/* 中心爆炸点 */}
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]}, transparent)`
                  }}
                />
                
                {/* 放射状火花 */}
                {Array.from({ length: 12 }).map((_, j) => (
                  <div
                    key={j}
                    className="absolute w-1 h-8 opacity-80 animate-pulse"
                    style={{
                      background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                      transform: `rotate(${j * 30}deg) translateY(-20px)`,
                      transformOrigin: 'bottom center',
                      top: '-16px',
                      left: '10px',
                      animationDelay: Math.random() * 0.5 + 's'
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* 主要内容区域 */}
      <div className="relative z-10 text-center max-w-4xl px-6">
        {/* 装饰性光环 */}
        <div className="absolute inset-0 -m-20">
          <div 
            className="w-full h-full rounded-full opacity-30 animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, #FFD700, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DDA0DD, #FFD700)',
              animation: 'spin 20s linear infinite'
            }}
          />
        </div>

        {/* 7周年logo */}
        <div className="mb-8 relative">
          <Sparkles density={20} className="absolute inset-0">
            <div className="text-8xl font-bold text-transparent bg-clip-text animate-pulse"
                 style={{
                   background: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4, #45B7D1)',
                   WebkitBackgroundClip: 'text',
                   backgroundClip: 'text'
                 }}>
              7
            </div>
          </Sparkles>
          <div className="absolute -top-4 -right-4 text-2xl animate-bounce">🎂</div>
          <div className="absolute -bottom-2 -left-4 text-2xl animate-bounce" style={{animationDelay: '0.5s'}}>🎉</div>
        </div>

        {/* 动态庆祝文字 */}
        {showText && (
          <AnimatedBeam delay={0.5}>
            <div className="mb-6 min-h-[100px] flex items-center justify-center">
              <TypingAnimation
                text={anniversaryMessages[currentMessage]}
                className="text-4xl md:text-5xl font-bold text-white text-center leading-tight"
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                  textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,215,0,0.3)'
                }}
              />
            </div>
          </AnimatedBeam>
        )}

        {/* 装饰性元素 */}
        <div className="flex justify-center gap-8 mb-6">
          {['🌟', '🎊', '🎈', '🎁', '✨'].map((emoji, i) => (
            <div 
              key={i}
              className="text-4xl animate-bounce"
              style={{
                animationDelay: i * 0.2 + 's',
                animationDuration: '2s'
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* 公会特色元素 */}
        <div className="bg-black/30 rounded-2xl p-6 border border-white/20 backdrop-blur-sm">
          <div className="text-xl text-yellow-300 mb-2">今夕公会 · 2018-2025</div>
          <div className="text-white/80 text-lg">
            "以战会友，彼此成就" 💫
          </div>
          <div className="text-sm text-white/60 mt-3 italic">
            七年来，感谢每一位今夕家人的陪伴与支持
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          <i className="ri-close-line mr-2"></i>
          收起庆典
        </button>

        {/* 提示文字 */}
        <div className="mt-4 text-xs text-white/40">
          点击任意处关闭 • 彩蛋触发：输入 "JINXI7"
        </div>
      </div>

      {/* 浮动装饰元素 */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-ping opacity-60"
          style={{
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 3 + 's',
            animationDuration: Math.random() * 3 + 2 + 's'
          }}
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]
            }}
          />
        </div>
      ))}

      {/* CSS动画样式 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
