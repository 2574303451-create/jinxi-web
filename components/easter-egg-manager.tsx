"use client"

import { useState, useEffect } from 'react'
import { AnniversaryEasterEgg } from './anniversary-easter-egg'

interface EasterEggManagerProps {
  children: React.ReactNode
}

export function EasterEggManager({ children }: EasterEggManagerProps) {
  const [showAnniversary, setShowAnniversary] = useState(false)
  const [showTimeEgg, setShowTimeEgg] = useState(false)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [keySequence, setKeySequence] = useState('')
  const [lastScrollTime, setLastScrollTime] = useState(0)
  const [scrollCount, setScrollCount] = useState(0)

  // 键盘彩蛋监听器 (JINXI7)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toUpperCase()
      const newSequence = keySequence + key
      const trimmedSequence = newSequence.slice(-10)
      setKeySequence(trimmedSequence)
      
      if (trimmedSequence.includes('JINXI7')) {
        setShowAnniversary(true)
        setKeySequence('')
        showToast('🎉 发现隐藏彩蛋！今夕7周年庆典开启！')
      }
      
      if (trimmedSequence.length > 8 || /[^A-Z0-9]/.test(key)) {
        setTimeout(() => setKeySequence(''), 2000)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [keySequence])

  // 时间彩蛋 (每天21:00-21:05，公会活动时间)
  useEffect(() => {
    const checkTimeEasterEgg = () => {
      const now = new Date()
      const hour = now.getHours()
      const minute = now.getMinutes()
      
      // 每天21:00-21:05触发时间彩蛋
      if (hour === 21 && minute >= 0 && minute <= 5) {
        const hasShownToday = localStorage.getItem(`timeEgg-${now.toDateString()}`)
        if (!hasShownToday) {
          setTimeout(() => {
            setShowTimeEgg(true)
            localStorage.setItem(`timeEgg-${now.toDateString()}`, 'true')
            showToast('⏰ 今夕活动时间到啦！大家集合开黑！', 'info')
          }, Math.random() * 30000) // 0-30秒内随机触发
        }
      }
    }

    const timeInterval = setInterval(checkTimeEasterEgg, 60000) // 每分钟检查一次
    checkTimeEasterEgg() // 立即检查一次

    return () => clearInterval(timeInterval)
  }, [])

  // Logo点击彩蛋 (连击7次)
  useEffect(() => {
    const handleLogoClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('a[href="#top"]') || target.closest('img[alt="Logo"]')) {
        const newCount = logoClickCount + 1
        setLogoClickCount(newCount)
        
        if (newCount === 7) {
          setShowAnniversary(true)
          setLogoClickCount(0)
          showToast('🎯 发现点击彩蛋！Logo连击7次解锁庆典！')
        } else if (newCount >= 3) {
          showToast(`💫 继续点击Logo... (${newCount}/7)`, 'info')
        }
        
        // 重置计数器
        setTimeout(() => setLogoClickCount(0), 5000)
      }
    }

    document.addEventListener('click', handleLogoClick)
    return () => document.removeEventListener('click', handleLogoClick)
  }, [logoClickCount])

  // 滚动彩蛋 (快速滚动触发)
  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now()
      const timeDiff = now - lastScrollTime
      
      if (timeDiff < 100) { // 快速滚动
        const newScrollCount = scrollCount + 1
        setScrollCount(newScrollCount)
        
        if (newScrollCount >= 20) { // 快速滚动20次
          setShowAnniversary(true)
          setScrollCount(0)
          showToast('🌪️ 发现滚动彩蛋！你滚动得像龙卷风一样快！')
        }
      } else {
        setScrollCount(0)
      }
      
      setLastScrollTime(now)
    }

    let ticking = false
    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    document.addEventListener('scroll', requestTick)
    return () => document.removeEventListener('scroll', requestTick)
  }, [lastScrollTime, scrollCount])

  // 特殊日期彩蛋
  useEffect(() => {
    const checkSpecialDates = () => {
      const now = new Date()
      const month = now.getMonth() + 1
      const day = now.getDate()
      
      // 节日彩蛋
      const specialDates = [
        { month: 1, day: 1, message: '🎊 新年快乐！今夕与你同在！' },
        { month: 2, day: 14, message: '💕 情人节快乐！今夕是你永远的伙伴！' },
        { month: 5, day: 1, message: '🎖️ 劳动节快乐！感谢今夕每一位辛勤的成员！' },
        { month: 6, day: 1, message: '👶 儿童节快乐！保持童心，快乐游戏！' },
        { month: 9, day: 10, message: '👨‍🏫 教师节快乐！感谢每一位今夕导师！' },
        { month: 10, day: 1, message: '🇨🇳 国庆节快乐！今夕与祖国共庆！' },
        { month: 12, day: 25, message: '🎄 圣诞快乐！今夕大家庭祝你幸福！' },
      ]
      
      specialDates.forEach(({ month: targetMonth, day: targetDay, message }) => {
        if (month === targetMonth && day === targetDay) {
          const hasShownToday = localStorage.getItem(`specialDate-${now.toDateString()}`)
          if (!hasShownToday) {
            setTimeout(() => {
              showToast(message)
              localStorage.setItem(`specialDate-${now.toDateString()}`, 'true')
            }, 2000)
          }
        }
      })
    }

    setTimeout(checkSpecialDates, 1000)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    // 创建简单的toast通知
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-[10000] px-6 py-4 rounded-xl border text-white transition-all duration-300 transform translate-x-full`
    toast.style.background = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                           type === 'info' ? 'rgba(59, 130, 246, 0.9)' : 
                           'rgba(34, 197, 94, 0.9)'
    toast.style.borderColor = 'rgba(255,255,255,0.2)'
    toast.style.backdropFilter = 'blur(10px)'
    toast.innerHTML = message
    
    document.body.appendChild(toast)
    
    // 显示动画
    setTimeout(() => {
      toast.style.transform = 'translate-x-0'
    }, 100)
    
    // 自动消失
    setTimeout(() => {
      toast.style.transform = 'translate-x-full'
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }

  // 时间彩蛋组件
  const TimeEasterEgg = () => (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000 ${showTimeEgg ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTimeEgg(false)} />
      <div className="relative z-10 text-center bg-black/40 p-8 rounded-2xl border border-white/20 backdrop-blur-sm max-w-md mx-4">
        <div className="text-6xl mb-4">⏰</div>
        <h2 className="text-2xl font-bold text-white mb-4">今夕活动时间！</h2>
        <p className="text-white/80 mb-6">
          现在是晚上21:00活动时间，快来QQ群集合开黑吧！
        </p>
        <div className="text-yellow-300 mb-4">
          QQ群：<strong>713162467</strong>
        </div>
        <button
          onClick={() => setShowTimeEgg(false)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {children}
      
      {/* 7周年庆典彩蛋 */}
      <AnniversaryEasterEgg
        isVisible={showAnniversary}
        onClose={() => setShowAnniversary(false)}
      />
      
      {/* 时间彩蛋 */}
      <TimeEasterEgg />
      
      {/* 彩蛋说明（隐藏的开发者信息） */}
      <div style={{ display: 'none' }} data-easter-eggs="true">
        {/* 
        今夕公会彩蛋系统：
        1. 键盘彩蛋：输入 "JINXI7" 触发7周年庆典
        2. 点击彩蛋：快速点击Logo 7次
        3. 滚动彩蛋：快速滚动页面20次
        4. 时间彩蛋：每天21:00-21:05自动触发
        5. 节日彩蛋：特殊节日自动触发
        */}
      </div>
    </div>
  )
}
