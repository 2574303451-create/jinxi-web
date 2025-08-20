"use client"

import { useState, useEffect } from 'react'
import { AnniversaryEasterEgg } from './anniversary-easter-egg'

interface EasterEggManagerProps {
  children: React.ReactNode
}

// 创意彩蛋类型定义
interface CreativeEasterEgg {
  type: 'developer' | 'invisible' | 'gaze' | 'trace' | 'title'
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
  const [mouseTrail, setMouseTrail] = useState<{x: number, y: number}[]>([])
  const [gazeTimer, setGazeTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastMousePos, setLastMousePos] = useState({x: 0, y: 0})
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  
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
      id: 'trace',
      name: '鼠标轨迹彩蛋',
      description: '用鼠标画出数字"7"的形状',
      icon: '🎨',
      discovered: false
    },
    {
      id: 'gaze',
      name: '凝视彩蛋',
      description: '鼠标在Logo上静止3秒',
      icon: '👁️',
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
      name: '隐形按钮彩蛋',
      description: '发现右下角的隐形区域',
      icon: '🔍',
      discovered: false
    },
    {
      id: 'ultimate',
      name: '终极彩蛋',
      description: '在console中输入 jinxi.surprise()',
      icon: '🎯',
      discovered: false
    }
  ]
  
  // 成就等级定义
  const achievements: Achievement[] = [
    {
      id: 'beginner',
      name: '初级探索者',
      description: '发现3个彩蛋',
      icon: '🥉',
      requiredEggs: 3,
      level: 1
    },
    {
      id: 'advanced',
      name: '资深发现者',
      description: '发现6个彩蛋',
      icon: '🥈',
      requiredEggs: 6,
      level: 2
    },
    {
      id: 'master',
      name: '彩蛋大师',
      description: '发现全部8个彩蛋',
      icon: '🥇',
      requiredEggs: 8,
      level: 3
    },
    {
      id: 'legend',
      name: '今夕传奇',
      description: '在单次访问中发现所有彩蛋',
      icon: '🏆',
      requiredEggs: 8,
      level: 4
    }
  ]

  // 初始化成就系统
  useEffect(() => {
    const savedProgress = localStorage.getItem('jinxi-easter-eggs')
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress)
        setEasterEggRecords(parsed)
      } catch (error) {
        // 如果数据损坏，重新初始化
        setEasterEggRecords(easterEggDefinitions)
      }
    } else {
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

  // 🎨 创意彩蛋1: 鼠标轨迹彩蛋 - 用鼠标在页面画出数字"7"
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPos = { x: event.clientX, y: event.clientY }
      setLastMousePos(newPos)
      
      // 记录鼠标轨迹，最多保留最近20个点
      setMouseTrail(prev => {
        const newTrail = [...prev, newPos].slice(-20)
        
        // 检测是否画出了数字"7"的形状
        if (newTrail.length >= 15) {
          const isSevenShape = detectSevenShape(newTrail)
          if (isSevenShape) {
            triggerCreativeEgg({
              type: 'trace',
              title: '🎨 鼠标艺术家',
              message: '你用鼠标画出了数字"7"！代表今夕7周年！',
              icon: '🎨'
            }, 'trace')
            setMouseTrail([]) // 重置轨迹
          }
        }
        return newTrail
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // 🔍 创意彩蛋2: 凝视彩蛋 - 鼠标在Logo上静止3秒
  useEffect(() => {
    const handleMouseStill = () => {
      // 检测鼠标是否在Logo区域静止
      const logoElement = document.querySelector('img[alt="Logo"]') as HTMLElement
      if (logoElement) {
        const rect = logoElement.getBoundingClientRect()
        const { x, y } = lastMousePos
        
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          if (gazeTimer) clearTimeout(gazeTimer)
          
          const timer = setTimeout(() => {
            triggerCreativeEgg({
              type: 'gaze',
              title: '👁️ 深度凝视者',
              message: '你凝视Logo超过3秒，发现了隐藏的秘密！',
              icon: '👁️'
            }, 'gaze')
          }, 3000)
          
          setGazeTimer(timer)
        } else {
          if (gazeTimer) {
            clearTimeout(gazeTimer)
            setGazeTimer(null)
          }
        }
      }
    }

    const interval = setInterval(handleMouseStill, 100)
    return () => {
      clearInterval(interval)
      if (gazeTimer) clearTimeout(gazeTimer)
    }
  }, [lastMousePos, gazeTimer])

  // 💻 创意彩蛋3: 开发者彩蛋 - 检测开发者工具
  useEffect(() => {
    const checkDevTools = () => {
      const threshold = 160
      const isOpen = window.outerHeight - window.innerHeight > threshold || 
                    window.outerWidth - window.innerWidth > threshold
      
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
      if (target.closest('a[href="#top"]') || target.closest('img[alt="Logo"]')) {
        const newCount = logoClickCount + 1
        setLogoClickCount(newCount)
        
        if (newCount === 7) {
          setShowAnniversary(true)
          setLogoClickCount(0)
          recordEasterEggDiscovery('click')
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

  // 🎯 辅助函数：检测鼠标轨迹是否形成数字"7"
  const detectSevenShape = (trail: {x: number, y: number}[]): boolean => {
    if (trail.length < 10) return false
    
    // 简化的"7"形状检测：先水平，后向下倾斜
    const firstQuarter = trail.slice(0, Math.floor(trail.length * 0.25))
    const lastThreeQuarters = trail.slice(Math.floor(trail.length * 0.25))
    
    // 检测开始是否相对水平（横线）
    const startHorizontal = firstQuarter.every((point, index) => {
      if (index === 0) return true
      const prevPoint = firstQuarter[index - 1]
      return Math.abs(point.y - prevPoint.y) < 30 // 容忍30px的垂直偏差
    })
    
    // 检测后续是否向下倾斜（竖线）
    const endDiagonal = lastThreeQuarters.length > 5 && 
      lastThreeQuarters[lastThreeQuarters.length - 1].y > lastThreeQuarters[0].y + 50
    
    return startHorizontal && endDiagonal
  }

  // 🚀 创意彩蛋触发器
  const triggerCreativeEgg = (egg: CreativeEasterEgg, eggId: string) => {
    setShowCreativeEgg(egg)
    recordEasterEggDiscovery(eggId)
    showToast(`${egg.icon} ${egg.title}：${egg.message}`, 'success')
    
    // 根据彩蛋类型，有时也触发7周年庆典
    if (egg.type === 'trace' || egg.type === 'developer') {
      setTimeout(() => {
        setShowAnniversary(true)
      }, 2000)
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

  // 🎨 创意彩蛋5: 隐形按钮彩蛋 - 在页面某处添加看不见的可点击区域
  useEffect(() => {
    // 在页面底部添加一个隐形的彩蛋区域
    const createInvisibleEgg = () => {
      const invisibleButton = document.createElement('div')
      invisibleButton.id = 'invisible-easter-egg'
      invisibleButton.style.cssText = `
        position: fixed;
        bottom: 50px;
        right: 20px;
        width: 30px;
        height: 30px;
        cursor: help;
        opacity: 0;
        z-index: 999;
        transition: opacity 0.3s ease;
      `
      
      // 鼠标悬停时轻微显示
      invisibleButton.addEventListener('mouseenter', () => {
        invisibleButton.style.opacity = '0.1'
        invisibleButton.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'
        invisibleButton.style.borderRadius = '50%'
      })
      
      invisibleButton.addEventListener('mouseleave', () => {
        invisibleButton.style.opacity = '0'
        invisibleButton.style.backgroundColor = 'transparent'
      })
      
      invisibleButton.addEventListener('click', () => {
        triggerCreativeEgg({
          type: 'invisible',
          title: '🔍 隐秘发现者',
          message: '你发现了隐藏在角落的秘密按钮！观察力MAX！',
          icon: '🔍'
        }, 'invisible')
        // 点击后移除按钮，避免重复触发
        invisibleButton.remove()
      })
      
      document.body.appendChild(invisibleButton)
    }

    // 延迟5秒创建，让用户先熟悉页面
    const timer = setTimeout(createInvisibleEgg, 5000)
    return () => {
      clearTimeout(timer)
      const existingButton = document.getElementById('invisible-easter-egg')
      if (existingButton) existingButton.remove()
    }
  }, [])

  // 创意彩蛋展示组件
  const CreativeEasterEggDisplay = () => {
    if (!showCreativeEgg) return null

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreativeEgg(null)} />
        <div className="relative z-10 text-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-8 rounded-2xl border border-white/20 backdrop-blur-sm max-w-md mx-4">
          <div className="text-6xl mb-4 animate-bounce">{showCreativeEgg.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-4">{showCreativeEgg.title}</h2>
          <p className="text-white/80 mb-6">{showCreativeEgg.message}</p>
          
          {/* 根据不同彩蛋类型显示特殊内容 */}
          {showCreativeEgg.type === 'developer' && (
            <div className="text-xs text-green-300 mb-4 font-mono bg-black/30 p-3 rounded-lg">
              console.log("Easter egg found!");
            </div>
          )}
          
          {showCreativeEgg.type === 'trace' && (
            <div className="text-yellow-300 mb-4 text-sm">
              ✏️ 艺术创作已保存到回忆录中
            </div>
          )}
          
          <button
            onClick={() => setShowCreativeEgg(null)}
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
        <div className="relative z-10 text-center bg-gradient-to-br from-yellow-600/30 to-orange-600/30 p-8 rounded-2xl border border-yellow-400/30 backdrop-blur-sm max-w-md mx-4">
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
            onClick={() => setShowLevelUpNotification(null)}
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

    if (discoveredCount === 0) return null

    return (
      <div 
        className="fixed bottom-0 left-0 right-0 z-[9998] bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-sm border-t border-white/10 p-4 cursor-pointer hover:bg-gradient-to-r hover:from-purple-900/90 hover:to-blue-900/90 transition-all duration-300"
        onClick={() => setShowAchievementPanel(true)}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{currentAchievement?.icon || '🥉'}</div>
            <div>
              <div className="text-white font-medium text-sm">
                {currentAchievement?.name || '探索者'}
              </div>
              <div className="text-white/60 text-xs">
                彩蛋进度：{discoveredCount}/{totalCount}
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
        <div className="relative z-10 bg-gradient-to-br from-gray-900/95 to-black/95 p-6 rounded-2xl border border-white/20 backdrop-blur-sm max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🏆 成就系统</h2>
            <div className="text-white/60">
              已发现 {discoveredCount} / {easterEggDefinitions.length} 个彩蛋
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
                      {egg.description}
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
            onClick={() => setShowAchievementPanel(false)}
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
        今夕公会创意彩蛋系统 v2.0 - 成就系统：
        1. 键盘彩蛋：输入 "JINXI7" 触发7周年庆典
        2. 点击彩蛋：快速点击Logo 7次
        3. 鼠标轨迹彩蛋：用鼠标画出数字"7"的形状
        4. 凝视彩蛋：鼠标在Logo上静止3秒
        5. 开发者彩蛋：打开F12开发者工具
        6. 页面标题彩蛋：切换标签页后回归
        7. 隐形按钮彩蛋：发现右下角的隐藏区域
        8. 终极彩蛋：在console中输入 jinxi.surprise()
        
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
