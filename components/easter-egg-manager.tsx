"use client"

import { useState, useEffect } from 'react'
import { AnniversaryEasterEgg } from './anniversary-easter-egg'

interface EasterEggManagerProps {
  children: React.ReactNode
}

// 创意彩蛋类型定义
interface CreativeEasterEgg {
  type: 'developer' | 'invisible' | 'fullscreen' | 'title' | 'patience'
  title: string
  message: string
  icon: string
}

// 成就系统定义
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  requiredEggs: number
  level: 1 | 2 | 3 | 4
}

interface EasterEggRecord {
  id: string
  name: string
  description: string
  icon: string
  discoveredAt?: string
  discovered: boolean
}

export function EasterEggManager({ children }: EasterEggManagerProps) {
  const [showAnniversary, setShowAnniversary] = useState(false)
  const [showCreativeEgg, setShowCreativeEgg] = useState<CreativeEasterEgg | null>(null)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [keySequence, setKeySequence] = useState('')
  
  // 创意彩蛋相关状态
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const [forceProgressBarUpdate, setForceProgressBarUpdate] = useState(0)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [patienceTimer, setPatienceTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())
  const [patienceEggTriggered, setPatienceEggTriggered] = useState(false)
  
  // 成就系统状态
  const [showAchievementPanel, setShowAchievementPanel] = useState(false)
  const [showLevelUpNotification, setShowLevelUpNotification] = useState<Achievement | null>(null)
  const [easterEggRecords, setEasterEggRecords] = useState<EasterEggRecord[]>([])
  
  // 彩蛋定义
  const easterEggDefinitions: EasterEggRecord[] = [
    {
      id: 'keyboard',
      name: '键盘彩蛋',
      description: '在页面任意位置输入 "JINXI7"',
      icon: '🔤',
      discovered: false
    },
    {
      id: 'click',
      name: '点击彩蛋',
      description: '快速点击Logo 7次',
      icon: '🎯',
      discovered: false
    },
    {
      id: 'fullscreen',
      name: '全屏视频彩蛋',
      description: '全屏观看今夕宣传视频',
      icon: '📺',
      discovered: false
    },
    {
      id: 'developer',
      name: '开发者彩蛋',
      description: '打开浏览器开发者工具(F12)',
      icon: '🛠️',
      discovered: false
    },
    {
      id: 'title',
      name: '页面标题彩蛋',
      description: '切换标签页超过10秒后回归',
      icon: '💕',
      discovered: false
    },
    {
      id: 'invisible',
      name: '商标点击彩蛋',
      description: '点击页面底部的今夕商标',
      icon: '🔍',
      discovered: false
    },
    {
      id: 'patience',
      name: '耐心彩蛋',
      description: '在页面静静等待2分钟不做任何操作',
      icon: '⏰',
      discovered: false
    }
  ]
  
  // 成就等级定义
  const achievements: Achievement[] = [
    {
      id: 'beginner',
      name: '初级探索者',
      description: '发现2个彩蛋',
      icon: '🥉',
      requiredEggs: 2,
      level: 1
    },
    {
      id: 'advanced',
      name: '资深发现者',
      description: '发现4个彩蛋',
      icon: '🥈',
      requiredEggs: 4,
      level: 2
    },
    {
      id: 'master',
      name: '彩蛋大师',
      description: '发现全部7个彩蛋',
      icon: '🥇',
      requiredEggs: 7,
      level: 3
    },
    {
      id: 'legend',
      name: '今夕传奇',
      description: '在单次访问中发现所有彩蛋',
      icon: '🏆',
      requiredEggs: 7,
      level: 4
    }
  ]

  // 初始化成就系统
  useEffect(() => {
    const savedProgress = localStorage.getItem('jinxi-easter-eggs')
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress)
        // 确保所有最新的彩蛋定义都存在，清理旧的trace彩蛋
        const cleanedRecords = easterEggDefinitions.map(def => {
          const saved = parsed.find((p: EasterEggRecord) => p.id === def.id)
          return saved ? { ...def, discovered: saved.discovered, discoveredAt: saved.discoveredAt } : def
        })
        setEasterEggRecords(cleanedRecords)
        console.log('🎯 已加载彩蛋进度:', cleanedRecords)
      } catch (error) {
        console.log('🔄 重新初始化彩蛋系统')
        setEasterEggRecords(easterEggDefinitions)
      }
    } else {
      console.log('🆕 首次访问，初始化彩蛋系统')
      setEasterEggRecords(easterEggDefinitions)
    }
  }, [])

  // 保存成就进度
  const saveProgress = (newRecords: EasterEggRecord[]) => {
    localStorage.setItem('jinxi-easter-eggs', JSON.stringify(newRecords))
    setEasterEggRecords(newRecords)
  }

  // 记录彩蛋发现
  const recordEasterEggDiscovery = (eggId: string) => {
    const currentTime = new Date().toLocaleString('zh-CN')
    const updatedRecords = easterEggRecords.map(egg => 
      egg.id === eggId 
        ? { ...egg, discovered: true, discoveredAt: currentTime }
        : egg
    )
    
    saveProgress(updatedRecords)
    
    // 检查是否达到新等级
    const discoveredCount = updatedRecords.filter(egg => egg.discovered).length
    checkLevelUp(discoveredCount)
  }

  // 检查等级提升
  const checkLevelUp = (discoveredCount: number) => {
    const currentLevel = getCurrentLevel(discoveredCount)
    const previousCount = easterEggRecords.filter(egg => egg.discovered).length
    const previousLevel = getCurrentLevel(previousCount)
    
    // 如果等级提升了，显示升级通知
    if (currentLevel > previousLevel) {
      const newAchievement = achievements.find(a => a.requiredEggs === discoveredCount)
      if (newAchievement) {
        setTimeout(() => {
          setShowLevelUpNotification(newAchievement)
        }, 1500) // 延迟显示，让彩蛋动画先播放
      }
    }
  }

  // 获取当前等级
  const getCurrentLevel = (discoveredCount: number): number => {
    if (discoveredCount >= 8) return 3 // 彩蛋大师
    if (discoveredCount >= 6) return 2 // 资深发现者
    if (discoveredCount >= 3) return 1 // 初级探索者
    return 0 // 未分级
  }

  // 获取当前成就
  const getCurrentAchievement = (): Achievement | null => {
    const discoveredCount = easterEggRecords.filter(egg => egg.discovered).length
    return achievements.find(a => a.requiredEggs <= discoveredCount && a.level <= 3) || null
  }

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
        recordEasterEggDiscovery('keyboard')
        showToast('🎉 发现键盘彩蛋！今夕7周年庆典开启！')
      }
      
      if (trimmedSequence.length > 8 || /[^A-Z0-9]/.test(key)) {
        setTimeout(() => setKeySequence(''), 2000)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [keySequence])



  // 📺 创意彩蛋2: 全屏视频彩蛋 - 全屏观看今夕宣传视频
  useEffect(() => {
    let videoTimer: NodeJS.Timeout | null = null
    
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement !== null || 
                          (document as any).webkitFullscreenElement !== null ||
                          (document as any).mozFullScreenElement !== null ||
                          (document as any).msFullscreenElement !== null
      
      if (isFullscreen) {
        // 检测是否是视频元素进入全屏
        const fullscreenElement = document.fullscreenElement || 
                                 (document as any).webkitFullscreenElement ||
                                 (document as any).mozFullScreenElement ||
                                 (document as any).msFullscreenElement
        
        if (fullscreenElement && fullscreenElement.tagName === 'VIDEO' && !isVideoFullscreen) {
          setIsVideoFullscreen(true)
          
          // 检查是否已经发现过这个彩蛋
          const fullscreenEgg = easterEggRecords.find(egg => egg.id === 'fullscreen')
          if (!fullscreenEgg?.discovered) {
            // 延迟3秒触发彩蛋，确保用户真的在观看
            videoTimer = setTimeout(() => {
              // 再次检查是否还在全屏状态
              const stillFullscreen = document.fullscreenElement !== null || 
                                     (document as any).webkitFullscreenElement !== null ||
                                     (document as any).mozFullScreenElement !== null ||
                                     (document as any).msFullscreenElement !== null
              
              if (stillFullscreen) {
                triggerCreativeEgg({
                  type: 'fullscreen',
                  title: '📺 视频专注者',
                  message: '你全屏观看今夕宣传视频，展现了对今夕的真正关注！',
                  icon: '📺'
                }, 'fullscreen')
              }
            }, 3000)
          }
        }
      } else {
        // 退出全屏状态
        if (isVideoFullscreen) {
          setIsVideoFullscreen(false)
        }
        if (videoTimer) {
          clearTimeout(videoTimer)
          videoTimer = null
        }
      }
      
      // 强制更新进度条显示
      setForceProgressBarUpdate(prev => prev + 1)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
      if (videoTimer) clearTimeout(videoTimer)
    }
  }, []) // 移除依赖，避免不必要的重新执行

  // 💻 创意彩蛋3: 开发者彩蛋 - 检测开发者工具
  useEffect(() => {
    const checkDevTools = () => {
      const threshold = 200 // 增加阈值，减少误判
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight)
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth)
      const isOpen = heightDiff > threshold || widthDiff > threshold
      
      if (isOpen && !devToolsOpen) {
        setDevToolsOpen(true)
        // 延迟触发，让用户有时间看到console
        setTimeout(() => {
          triggerCreativeEgg({
            type: 'developer',
            title: '🛠️ 代码探索者',
            message: '欢迎来到代码的世界！你是真正的技术爱好者！',
            icon: '🛠️'
          }, 'developer')
          
          // 在console中留下彩蛋信息
          console.log(`
🎉 恭喜发现开发者彩蛋！
━━━━━━━━━━━━━━━━━━━━━━
👾 今夕公会 - 代码彩蛋系统 v2.0
🎨 设计理念：隐藏在细节中的惊喜
💝 特别献给：所有热爱探索的开发者们
━━━━━━━━━━━━━━━━━━━━━━
🚀 输入 jinxi.surprise() 解锁更多惊喜
          `)
          
          // 添加全局函数作为隐藏彩蛋
          ;(window as any).jinxi = {
            surprise: () => {
              triggerCreativeEgg({
                type: 'developer',
                title: '🎯 终极开发者',
                message: '你找到了隐藏的JavaScript API！真正的代码大师！',
                icon: '🎯'
              }, 'ultimate')
            }
          }
        }, 2000)
      } else if (!isOpen && devToolsOpen) {
        setDevToolsOpen(false)
      }
    }

    const interval = setInterval(checkDevTools, 500)
    return () => clearInterval(interval)
  }, [devToolsOpen])

  // 📱 创意彩蛋4: 页面标题互动彩蛋
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPageVisible) {
        setIsPageVisible(false)
        document.title = '👋 别走呀~ 今夕想你了...'
        
        // 如果用户离开超过10秒再回来，触发彩蛋
        setTimeout(() => {
          if (!document.hidden) return
          
          const originalTitle = document.title
          document.title = '🎁 有惊喜等你回来哦~'
          
          const handleReturn = () => {
            if (!document.hidden) {
              document.title = originalTitle
              setTimeout(() => {
                triggerCreativeEgg({
                  type: 'title',
                  title: '💕 忠实访客',
                  message: '感谢你的回归！今夕永远为你保留一个位置~',
                  icon: '💕'
                }, 'title')
              }, 1000)
              document.removeEventListener('visibilitychange', handleReturn)
            }
          }
          
          document.addEventListener('visibilitychange', handleReturn)
        }, 10000)
      } else if (!document.hidden && !isPageVisible) {
        setIsPageVisible(true)
        document.title = '弹弹堂-今夕公会官网'
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isPageVisible])

  // Logo点击彩蛋 (连击7次)
  useEffect(() => {
    const handleLogoClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // 如果当前有彩蛋弹窗显示，不处理Logo点击
      if (showCreativeEgg || showAnniversary) {
        return
      }
      
      // 排除彩蛋弹窗内的点击和特定UI元素，但允许进度条点击
      if (target.closest('.fixed.inset-0.z-\\[9999\\]') || 
          target.closest('.easter-egg-modal') ||
          (target.closest('button') && !target.closest('.achievement-progress-bar'))) {
        return
      }
      
      // 特别排除进度条区域的点击
      if (target.closest('.achievement-progress-bar')) {
        return
      }
      
      // 更准确的Logo检测：检查多种可能的选择器
      const isLogoClick = target.closest('a[href="#top"]') || 
                         target.closest('img[alt="Logo"]') ||
                         target.closest('img[src*="logo"]') ||
                         target.tagName === 'IMG' && target.getAttribute('src')?.includes('logo') ||
                         (target.tagName === 'A' && target.getAttribute('href') === '#top')
      
      if (isLogoClick) {
        const newCount = logoClickCount + 1
        setLogoClickCount(newCount)
        
        console.log(`Logo clicked ${newCount} times`) // 调试日志
        
        if (newCount === 7) {
          recordEasterEggDiscovery('click')
          // 触发专门的点击彩蛋特效，而不是默认的7周年庆典
          triggerCreativeEgg({
            type: 'developer',
            title: '🎯 点击大师',
            message: '你精准连击Logo 7次！手速惊人！',
            icon: '🎯'
          }, 'click')
          setLogoClickCount(0)
          showToast('🎯 发现点击彩蛋！Logo连击7次解锁！')
        } else if (newCount >= 3) {
          showToast(`💫 继续点击Logo... (${newCount}/7)`, 'info')
        }
        
        // 重置计数器
        setTimeout(() => setLogoClickCount(0), 8000) // 延长到8秒
      }
    }

    document.addEventListener('click', handleLogoClick)
    return () => document.removeEventListener('click', handleLogoClick)
  }, [logoClickCount, showCreativeEgg, showAnniversary])

  // 🕰️ 耐心彩蛋：在页面静静等待2分钟不做任何操作
  useEffect(() => {
    // 如果已经发现过耐心彩蛋或已经触发过，不再设置计时器
    const patienceEgg = easterEggRecords.find(egg => egg.id === 'patience')
    if (patienceEgg?.discovered || patienceEggTriggered) {
      return
    }

    const PATIENCE_TIME = 30 * 1000 // 30秒 (测试用，正式版改为2分钟)
    let activityTimer: NodeJS.Timeout | null = null

    // 重置活动计时器
    const resetActivityTimer = () => {
      // 如果已经触发过，立即返回
      if (patienceEggTriggered) return
      
      setLastActivityTime(Date.now())
      
      // 清除之前的计时器
      if (activityTimer) {
        clearTimeout(activityTimer)
        activityTimer = null
      }
      
      // 再次检查是否已发现，避免竞态条件
      const currentPatienceEgg = easterEggRecords.find(egg => egg.id === 'patience')
      if (currentPatienceEgg?.discovered || patienceEggTriggered) {
        return
      }
      
      // 设置新的计时器
      activityTimer = setTimeout(() => {
        // 最终检查是否已经发现过这个彩蛋或已触发
        const finalCheck = easterEggRecords.find(egg => egg.id === 'patience')
        if (!finalCheck?.discovered && !patienceEggTriggered) {
          setPatienceEggTriggered(true) // 立即设置标记防止重复触发
          triggerCreativeEgg({
            type: 'patience',
            title: '⏰ 耐心大师',
            message: '你静静等待了2分钟，展现了真正的耐心！时间见证了你的专注。',
            icon: '⏰'
          }, 'patience')
        }
      }, PATIENCE_TIME)
    }

    // 监听各种用户活动
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer, { passive: true })
    })

    // 初始化计时器
    resetActivityTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimer)
      })
      if (activityTimer) {
        clearTimeout(activityTimer)
      }
    }
  }, []) // 完全移除依赖，只在组件挂载时执行一次



  // 🚀 创意彩蛋触发器 - 不同类型有不同特效
  const triggerCreativeEgg = (egg: CreativeEasterEgg, eggId: string) => {
    setShowCreativeEgg(egg)
    recordEasterEggDiscovery(eggId)
    showToast(`${egg.icon} ${egg.title}：${egg.message}`, 'success')
    
    // 根据彩蛋类型触发不同特效
    switch(egg.type) {
      case 'fullscreen':
        // 全屏视频彩蛋：视频播放特效
        createVideoWatchEffect()
        break
      
      case 'developer':
        // 开发者彩蛋：代码雨特效
        createCodeRainEffect()
        break
      
      case 'invisible':
        // 商标点击彩蛋：发现光芒特效
        createDiscoveryGlowEffect()
        break
      
      case 'title':
        // 标题彩蛋：温暖粒子特效
        createWarmParticleEffect()
        break
        
      case 'patience':
        // 耐心彩蛋：时间流逝特效 + 7周年庆典
        createTimeFlowEffect()
        setTimeout(() => {
          setShowAnniversary(true)
        }, 3000)
        break
      
      default:
        // 默认：小规模粒子特效
        createSimpleParticleEffect()
    }
  }

  // 🎨 特效函数集合
  const createEyeFlashEffect = () => {
    // 眼睛闪烁特效
    for (let i = 0; i < 6; i++) {
      const eye = document.createElement('div')
      eye.innerHTML = '👁️'
      eye.style.cssText = `
        position: fixed;
        top: ${Math.random() * window.innerHeight}px;
        left: ${Math.random() * window.innerWidth}px;
        font-size: 3rem;
        z-index: 9999;
        pointer-events: none;
        animation: eyeFlash 2s ease-out forwards;
      `
      
      document.body.appendChild(eye)
      setTimeout(() => eye.remove(), 2000)
    }
    
    // 添加CSS动画
    if (!document.getElementById('eyeFlashStyle')) {
      const style = document.createElement('style')
      style.id = 'eyeFlashStyle'
      style.textContent = `
        @keyframes eyeFlash {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createCodeRainEffect = () => {
    // 代码雨特效
    const characters = '01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]()'.split('')
    
    for (let i = 0; i < 20; i++) {
      const code = document.createElement('div')
      code.innerHTML = characters[Math.floor(Math.random() * characters.length)]
      code.style.cssText = `
        position: fixed;
        top: -20px;
        left: ${Math.random() * window.innerWidth}px;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: ${Math.random() * 20 + 14}px;
        z-index: 9999;
        pointer-events: none;
        animation: codeRain 3s linear forwards;
      `
      
      document.body.appendChild(code)
      setTimeout(() => code.remove(), 3000)
    }
    
    if (!document.getElementById('codeRainStyle')) {
      const style = document.createElement('style')
      style.id = 'codeRainStyle'
      style.textContent = `
        @keyframes codeRain {
          0% { transform: translateY(-20px); opacity: 1; }
          100% { transform: translateY(${window.innerHeight + 20}px); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createDiscoveryGlowEffect = () => {
    // 发现光芒特效
    const glow = document.createElement('div')
    glow.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 70%);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 9998;
      pointer-events: none;
      animation: discoveryGlow 2s ease-out forwards;
    `
    
    document.body.appendChild(glow)
    setTimeout(() => glow.remove(), 2000)
    
    if (!document.getElementById('discoveryGlowStyle')) {
      const style = document.createElement('style')
      style.id = 'discoveryGlowStyle'
      style.textContent = `
        @keyframes discoveryGlow {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createWarmParticleEffect = () => {
    // 温暖粒子特效
    const colors = ['💕', '💖', '💝', '💗', '💓']
    
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div')
      particle.innerHTML = colors[Math.floor(Math.random() * colors.length)]
      particle.style.cssText = `
        position: fixed;
        top: ${window.innerHeight / 2}px;
        left: ${window.innerWidth / 2}px;
        font-size: 2rem;
        z-index: 9999;
        pointer-events: none;
        animation: warmFloat 3s ease-out forwards;
        animation-delay: ${i * 200}ms;
      `
      
      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 3500)
    }
    
    if (!document.getElementById('warmFloatStyle')) {
      const style = document.createElement('style')
      style.id = 'warmFloatStyle'
      style.textContent = `
        @keyframes warmFloat {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          20% { opacity: 1; transform: scale(1); }
          100% { 
            transform: translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px) scale(0.5); 
            opacity: 0; 
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createSimpleParticleEffect = () => {
    // 简单粒子特效
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div')
      particle.innerHTML = '✨'
      particle.style.cssText = `
        position: fixed;
        top: ${Math.random() * window.innerHeight}px;
        left: ${Math.random() * window.innerWidth}px;
        font-size: 1.5rem;
        z-index: 9999;
        pointer-events: none;
        animation: simpleSparkle 1.5s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
      
      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 2000)
    }
    
    if (!document.getElementById('simpleSparkleStyle')) {
      const style = document.createElement('style')
      style.id = 'simpleSparkleStyle'
      style.textContent = `
        @keyframes simpleSparkle {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createTimeFlowEffect = () => {
    // 时间流逝特效
    const timeSymbols = ['⏰', '⏳', '⌛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕']
    
    for (let i = 0; i < 12; i++) {
      const timeElement = document.createElement('div')
      timeElement.innerHTML = timeSymbols[Math.floor(Math.random() * timeSymbols.length)]
      timeElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: 3rem;
        z-index: 9999;
        pointer-events: none;
        animation: timeFlow 4s ease-out forwards;
        animation-delay: ${i * 300}ms;
      `
      
      document.body.appendChild(timeElement)
      setTimeout(() => timeElement.remove(), 4500)
    }
    
    // 添加数字倒计时效果
    for (let i = 0; i < 5; i++) {
      const number = document.createElement('div')
      number.innerHTML = `${120 - i * 30}s`
      number.style.cssText = `
        position: fixed;
        top: ${30 + i * 15}%;
        left: ${20 + i * 15}%;
        font-size: 2rem;
        color: rgba(255, 215, 0, 0.8);
        z-index: 9999;
        pointer-events: none;
        animation: timeCountdown 3s ease-out forwards;
        animation-delay: ${i * 600}ms;
      `
      
      document.body.appendChild(number)
      setTimeout(() => number.remove(), 4000)
    }
    
    if (!document.getElementById('timeFlowStyle')) {
      const style = document.createElement('style')
      style.id = 'timeFlowStyle'
      style.textContent = `
        @keyframes timeFlow {
          0% { 
            transform: translate(-50%, -50%) scale(0) rotate(0deg); 
            opacity: 0; 
          }
          30% { 
            transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 800 - 400}px, ${Math.random() * 600 - 300}px) scale(0.3) rotate(720deg); 
            opacity: 0; 
          }
        }
        @keyframes timeCountdown {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createVideoWatchEffect = () => {
    // 视频观看特效 - 影院风格的光影效果
    const videoSymbols = ['📺', '🎬', '🍿', '🎭', '🎪', '📽️', '🎞️', '🌟']
    
    // 主舞台光束效果
    const spotlight = document.createElement('div')
    spotlight.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      width: 300px;
      height: 100vh;
      background: linear-gradient(180deg, 
        rgba(255, 215, 0, 0.3) 0%, 
        rgba(255, 215, 0, 0.1) 50%, 
        rgba(255, 215, 0, 0) 100%);
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: none;
      animation: videoSpotlight 3s ease-in-out forwards;
    `
    
    document.body.appendChild(spotlight)
    setTimeout(() => spotlight.remove(), 3000)
    
    // 漂浮的视频符号
    for (let i = 0; i < 10; i++) {
      const symbol = document.createElement('div')
      symbol.innerHTML = videoSymbols[Math.floor(Math.random() * videoSymbols.length)]
      symbol.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 2 + 2}rem;
        z-index: 9999;
        pointer-events: none;
        animation: videoFloat 4s ease-out forwards;
        animation-delay: ${i * 200}ms;
      `
      
      document.body.appendChild(symbol)
      setTimeout(() => symbol.remove(), 4500)
    }
    
    // 屏幕边缘光效
    for (let i = 0; i < 4; i++) {
      const glow = document.createElement('div')
      const positions = ['top: 0; left: 0; width: 100%; height: 5px;', 
                        'bottom: 0; left: 0; width: 100%; height: 5px;',
                        'left: 0; top: 0; width: 5px; height: 100%;',
                        'right: 0; top: 0; width: 5px; height: 100%;']
      
      glow.style.cssText = `
        position: fixed;
        ${positions[i]}
        background: linear-gradient(${i % 2 === 0 ? '90deg' : '0deg'}, 
          rgba(255, 215, 0, 0.8), 
          rgba(255, 165, 0, 0.6), 
          rgba(255, 215, 0, 0.8));
        z-index: 9999;
        pointer-events: none;
        animation: videoGlow 2s ease-in-out forwards;
        animation-delay: ${i * 100}ms;
      `
      
      document.body.appendChild(glow)
      setTimeout(() => glow.remove(), 2500)
    }
    
    if (!document.getElementById('videoWatchStyle')) {
      const style = document.createElement('style')
      style.id = 'videoWatchStyle'
      style.textContent = `
        @keyframes videoSpotlight {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes videoFloat {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          20% { opacity: 1; transform: scale(1) rotate(90deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg) translateY(-200px); }
        }
        @keyframes videoGlow {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }

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

  // 🎨 创意彩蛋5: 商标点击彩蛋 - 点击页面底部的今夕商标
  useEffect(() => {
    const handleLogoFooterClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // 检测是否点击的是底部商标相关元素
      // 查找各种可能的底部商标选择器
      const isFooterLogo = target.closest('footer') && (
        target.closest('img[alt*="今夕"]') ||
        target.closest('img[alt*="jinxi"]') ||
        target.closest('img[alt*="logo"]') ||
        target.closest('img[src*="logo"]') ||
        target.closest('[href*="#"]') ||
        target.closest('a') ||
        (target.tagName === 'IMG' && (target.getAttribute('alt')?.includes('今夕') || target.getAttribute('src')?.includes('logo')))
      )
      
      // 也检测页面底部区域的其他可能商标元素
      const isBottomAreaLogo = window.innerHeight - event.clientY < 200 && (
        target.tagName === 'IMG' ||
        target.closest('img') ||
        target.closest('a') ||
        target.textContent?.includes('今夕') ||
        target.closest('[class*="logo"]') ||
        target.closest('[class*="footer"]')
      )
      
      if (isFooterLogo || isBottomAreaLogo) {
        // 检查是否已经发现过这个彩蛋
        const logoEgg = easterEggRecords.find(egg => egg.id === 'invisible')
        if (!logoEgg?.discovered) {
          triggerCreativeEgg({
            type: 'invisible',
            title: '🔍 商标探索者',
            message: '你点击了页面底部的今夕商标！发现了隐藏的秘密！',
            icon: '🔍'
          }, 'invisible')
        }
      }
    }

    // 监听整个页面的点击事件
    document.addEventListener('click', handleLogoFooterClick)
    
    return () => {
      document.removeEventListener('click', handleLogoFooterClick)
    }
  }, [easterEggRecords])

  // 创意彩蛋展示组件
  const CreativeEasterEggDisplay = () => {
    if (!showCreativeEgg) return null

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreativeEgg(null)} />
        <div className="easter-egg-modal relative z-10 text-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-8 rounded-2xl border border-white/20 backdrop-blur-sm max-w-md mx-4">
          <div className="text-6xl mb-4 animate-bounce">{showCreativeEgg.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-4">{showCreativeEgg.title}</h2>
          <p className="text-white/80 mb-6">{showCreativeEgg.message}</p>
          
          {/* 根据不同彩蛋类型显示特殊内容 */}
          {showCreativeEgg.type === 'developer' && (
            <div className="text-xs text-green-300 mb-4 font-mono bg-black/30 p-3 rounded-lg">
              console.log("Easter egg found!");
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowCreativeEgg(null)
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white transition-all duration-300 hover:scale-105"
          >
            继续探索
          </button>
        </div>
      </div>
    )
  }

  // 等级升级通知组件
  const LevelUpNotification = () => {
    if (!showLevelUpNotification) return null

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLevelUpNotification(null)} />
        <div className="easter-egg-modal relative z-10 text-center bg-gradient-to-br from-yellow-600/30 to-orange-600/30 p-8 rounded-2xl border border-yellow-400/30 backdrop-blur-sm max-w-md mx-4">
          <div className="text-8xl mb-4 animate-pulse">{showLevelUpNotification.icon}</div>
          <div className="text-yellow-300 text-lg font-bold mb-2">🎉 等级提升！</div>
          <h2 className="text-3xl font-bold text-white mb-4">{showLevelUpNotification.name}</h2>
          <p className="text-white/80 mb-6">{showLevelUpNotification.description}</p>
          
          <div className="bg-black/20 p-4 rounded-lg mb-6">
            <div className="text-yellow-300 text-sm mb-2">成就进度</div>
            <div className="text-2xl font-bold text-white">
              {easterEggRecords.filter(egg => egg.discovered).length} / {easterEggDefinitions.length}
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowLevelUpNotification(null)
            }}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl text-white font-bold transition-all duration-300 hover:scale-105"
          >
            太棒了！
          </button>
        </div>
      </div>
    )
  }

  // 底部成就进度条
  const AchievementProgressBar = () => {
    const discoveredCount = easterEggRecords.filter(egg => egg.discovered).length
    const totalCount = easterEggDefinitions.length
    const progress = (discoveredCount / totalCount) * 100
    const currentAchievement = getCurrentAchievement()

    // 调试信息
    console.log('🎯 进度条数据:', { discoveredCount, totalCount, progress, easterEggRecords, forceProgressBarUpdate })

    // 只要系统初始化完成就显示进度条
    if (easterEggRecords.length === 0) return null

    // 检测是否在全屏状态
    const isInFullscreen = document.fullscreenElement !== null || 
                          (document as any).webkitFullscreenElement !== null ||
                          (document as any).mozFullScreenElement !== null ||
                          (document as any).msFullscreenElement !== null

    return (
      <div 
        className="achievement-progress-bar fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-sm border-t border-white/10 p-4 cursor-pointer hover:bg-gradient-to-r hover:from-purple-900/90 hover:to-blue-900/90 transition-all duration-300"
        style={{ 
          display: 'block !important' as any,
          visibility: 'visible !important' as any,
          position: 'fixed !important' as any,
          zIndex: isInFullscreen ? 999999 : 9997, // 全屏时使用更高的z-index
          bottom: 0,
          left: 0,
          right: 0,
          opacity: 1
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('🎯 进度条被点击!')
          setShowAchievementPanel(true)
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{currentAchievement?.icon || '🥉'}</div>
            <div>
              <div className="text-white font-medium text-sm">
                {currentAchievement?.name || '探索者'}
              </div>
              <div className="text-white/60 text-xs">
                探索进度：{discoveredCount}/{totalCount}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="text-white/60 text-xs">
            点击查看详情
          </div>
        </div>
      </div>
    )
  }

  // 成就详情面板
  const AchievementPanel = () => {
    if (!showAchievementPanel) return null

    const discoveredCount = easterEggRecords.filter(egg => egg.discovered).length
    const currentAchievement = getCurrentAchievement()

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAchievementPanel(false)} />
        <div className="easter-egg-modal relative z-10 bg-gradient-to-br from-gray-900/95 to-black/95 p-6 rounded-2xl border border-white/20 backdrop-blur-sm max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🏆 成就系统</h2>
            <div className="text-white/60">
              已发现 {discoveredCount} / {easterEggDefinitions.length} 个隐藏彩蛋
            </div>
          </div>

          {/* 当前等级 */}
          {currentAchievement && (
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-4 rounded-xl border border-yellow-400/30 mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{currentAchievement.icon}</div>
                <div>
                  <div className="text-white font-bold">{currentAchievement.name}</div>
                  <div className="text-white/80 text-sm">{currentAchievement.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* 彩蛋列表 */}
          <div className="space-y-3">
            <h3 className="text-white font-bold mb-3">彩蛋收集进度</h3>
            {easterEggRecords.map((egg) => (
              <div 
                key={egg.id}
                className={`p-3 rounded-lg border transition-all ${
                  egg.discovered 
                    ? 'bg-green-600/20 border-green-400/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${egg.discovered ? '' : 'grayscale opacity-50'}`}>
                    {egg.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${egg.discovered ? 'text-white' : 'text-white/60'}`}>
                      {egg.name}
                    </div>
                    <div className={`text-sm ${egg.discovered ? 'text-white/80' : 'text-white/40'}`}>
                      {egg.discovered ? '已发现的神秘彩蛋' : '待发现的神秘彩蛋'}
                    </div>
                    {egg.discovered && egg.discoveredAt && (
                      <div className="text-xs text-green-300 mt-1">
                        ✓ 获得时间：{egg.discoveredAt}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowAchievementPanel(false)
            }}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white transition-all duration-300 hover:scale-105"
          >
            继续探索
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {children}
      
      {/* 7周年庆典彩蛋 */}
      <AnniversaryEasterEgg
        isVisible={showAnniversary}
        onClose={() => setShowAnniversary(false)}
      />
      
      {/* 创意彩蛋展示 */}
      <CreativeEasterEggDisplay />
      
      {/* 等级升级通知 */}
      <LevelUpNotification />
      
      {/* 底部成就进度条 */}
      <AchievementProgressBar />
      
      {/* 成就详情面板 */}
      <AchievementPanel />
      
      {/* 彩蛋说明（隐藏的开发者信息） */}
      <div style={{ display: 'none' }} data-easter-eggs="creative">
        {/* 
        今夕公会创意彩蛋系统 v2.2 - 成就系统：
        1. 键盘彩蛋：输入 "JINXI7" 触发7周年庆典
        2. 点击彩蛋：快速点击Logo 7次
        3. 凝视彩蛋：鼠标在Logo上静止3秒
        4. 开发者彩蛋：打开F12开发者工具
        5. 页面标题彩蛋：切换标签页后回归
        6. 商标点击彩蛋：点击页面底部的今夕商标
        7. 耐心彩蛋：在页面静静等待2分钟不做任何操作
        
        成就系统：
        - 底部进度条显示发现进度
        - 点击进度条查看详细成就面板
        - 升级时会有专门的通知动画
        - 所有数据持久化保存
        */}
      </div>
    </div>
  )
}
