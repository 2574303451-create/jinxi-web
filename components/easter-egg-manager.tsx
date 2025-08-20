"use client"

import { useState, useEffect, useRef } from 'react'
import { AnniversaryEasterEgg } from './anniversary-easter-egg'

interface EasterEggManagerProps {
  children: React.ReactNode
}

// 创意彩蛋类型定义
interface CreativeEasterEgg {
  type: 'developer' | 'invisible' | 'fullscreen' | 'title' | 'scroll'
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
  const [scrollCount, setScrollCount] = useState(0)
  const [scrollTimer, setScrollTimer] = useState<NodeJS.Timeout | null>(null)
  const [sidebarForceVisible, setSidebarForceVisible] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // 成就系统状态
  const [showAchievementPanel, setShowAchievementPanel] = useState(false)
  const [showLevelUpNotification, setShowLevelUpNotification] = useState<Achievement | null>(null)
  const [easterEggRecords, setEasterEggRecords] = useState<EasterEggRecord[]>([])
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  
  // 安全检查彩蛋是否已发现的辅助函数
  const safeCheckEggDiscovered = (eggId: string): boolean => {
    try {
      const saved = localStorage.getItem('jinxi-easter-eggs')
      if (saved) {
        const parsedRecords = JSON.parse(saved)
        const egg = parsedRecords.find((egg: EasterEggRecord) => egg.id === eggId)
        if (egg?.discovered) {
          return true
        }
      }
    } catch (error) {
      console.warn(`检查彩蛋 ${eggId} 状态时出错:`, error)
    }
    
    // 备用检查：使用当前状态
    const egg = easterEggRecords.find(egg => egg.id === eggId)
    return egg?.discovered || false
  }
  
  // 数据完整性验证和恢复函数
  const validateAndRestoreData = () => {
    try {
      const saved = localStorage.getItem('jinxi-easter-eggs')
      if (!saved) return
      
      const parsedRecords = JSON.parse(saved)
      const discoveredEggs = parsedRecords.filter((r: EasterEggRecord) => r.discovered)
      
      console.log('🔍 数据完整性检查:', {
        保存的记录数: parsedRecords.length,
        已发现彩蛋数: discoveredEggs.length,
        当前状态记录数: easterEggRecords.length,
        当前已发现数: easterEggRecords.filter(e => e.discovered).length
      })
      
      // 如果保存的数据中有更多已发现的彩蛋，恢复它们
      if (discoveredEggs.length > easterEggRecords.filter(e => e.discovered).length) {
        console.log('🔄 检测到数据不一致，恢复localStorage中的数据')
        const restoredRecords = easterEggDefinitions.map(def => {
          const savedRecord = parsedRecords.find((r: EasterEggRecord) => r.id === def.id)
          return savedRecord && savedRecord.discovered ? savedRecord : def
        })
        setEasterEggRecords(restoredRecords)
        return true
      }
    } catch (error) {
      console.warn('数据验证时出错:', error)
    }
    return false
  }
  
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
      name: '双击魔法彩蛋',
      description: '快速双击页面背景空白区域',
      icon: '✨',
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
      id: 'scroll',
      name: '滚轮狂热彩蛋',
      description: '在2秒内连续滚动鼠标滚轮20次',
      icon: '🎡',
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
    // 确保侧边栏始终可见
    setSidebarForceVisible(true)
    
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
        
        // 数据加载后再次确保侧边栏可见
        setTimeout(() => {
          setSidebarForceVisible(true)
          setForceProgressBarUpdate(prev => prev + 50)
        }, 100)
      } catch (error) {
        console.log('🔄 重新初始化彩蛋系统')
        setEasterEggRecords(easterEggDefinitions)
        setSidebarForceVisible(true)
      }
    } else {
      console.log('🆕 首次访问，初始化彩蛋系统')
      setEasterEggRecords(easterEggDefinitions)
      setSidebarForceVisible(true)
      
      // 首次访问时，短暂展开侧边栏提示用户
      setTimeout(() => {
        setSidebarExpanded(true)
        setSidebarForceVisible(true)
        setTimeout(() => {
          setSidebarExpanded(false)
          setSidebarForceVisible(true) // 即使折叠也要保持可见
        }, 3000) // 3秒后自动折叠
      }, 2000) // 页面加载2秒后展开
    }
    
    // 额外保险：定时强制确保侧边栏可见
    const ensureVisibility = setInterval(() => {
      setSidebarForceVisible(true)
    }, 5000)
    
    return () => clearInterval(ensureVisibility)
  }, [])
  
  // 组件更新监听器 - 确保在任何状态变化时侧边栏都保持可见
  useEffect(() => {
    console.log('🔄 组件状态更新，确保侧边栏可见并验证数据完整性')
    setSidebarForceVisible(true)
    
    // 在状态变化时验证数据完整性
    setTimeout(() => {
      const restored = validateAndRestoreData()
      if (restored) {
        console.log('✅ 数据已恢复')
        setForceProgressBarUpdate(prev => prev + 100)
      }
    }, 100)
  }, [showCreativeEgg, showLevelUpNotification, showAchievementPanel, isVideoFullscreen])

  // 保存成就进度 - 增强版，确保数据完整性
  const saveProgress = (newRecords: EasterEggRecord[]) => {
    // 验证新记录的完整性
    const validRecords = newRecords.length >= easterEggDefinitions.length ? newRecords : 
      // 如果数据不完整，从localStorage读取现有数据并合并
      (() => {
        try {
          const saved = localStorage.getItem('jinxi-easter-eggs')
          if (saved) {
            const existingRecords = JSON.parse(saved)
            // 合并现有数据和新数据
            return easterEggDefinitions.map(def => {
              const newRecord = newRecords.find(r => r.id === def.id)
              const existingRecord = existingRecords.find((r: EasterEggRecord) => r.id === def.id)
              
              if (newRecord && newRecord.discovered) {
                return newRecord // 使用新的已发现记录
              } else if (existingRecord && existingRecord.discovered) {
                return existingRecord // 保持现有的已发现记录
              } else {
                return def // 使用默认定义
              }
            })
          }
        } catch (error) {
          console.warn('恢复数据时出错:', error)
        }
        return newRecords
      })()
    
    console.log('💾 保存彩蛋数据:', validRecords.filter(r => r.discovered).map(r => r.name))
    localStorage.setItem('jinxi-easter-eggs', JSON.stringify(validRecords))
    setEasterEggRecords(validRecords)
  }

  // 记录彩蛋发现 - 安全版本，防止数据丢失
  const recordEasterEggDiscovery = (eggId: string) => {
    console.log(`🎯 开始记录彩蛋发现: ${eggId}`)
    
    const currentTime = new Date().toLocaleString('zh-CN')
    
    // 从localStorage获取最新数据，确保不会丢失之前的记录
    let currentRecords: EasterEggRecord[] = []
    try {
      const saved = localStorage.getItem('jinxi-easter-eggs')
      if (saved) {
        const parsedRecords = JSON.parse(saved)
        // 确保数据完整性，合并所有彩蛋定义
        currentRecords = easterEggDefinitions.map(def => {
          const existingRecord = parsedRecords.find((r: EasterEggRecord) => r.id === def.id)
          return existingRecord || def
        })
      } else {
        currentRecords = [...easterEggRecords]
      }
    } catch (error) {
      console.warn('读取保存数据时出错，使用当前状态:', error)
      currentRecords = [...easterEggRecords]
    }
    
    // 如果当前状态数据更完整，使用当前状态
    if (easterEggRecords.length >= easterEggDefinitions.length) {
      const currentDiscoveredCount = easterEggRecords.filter(egg => egg.discovered).length
      const savedDiscoveredCount = currentRecords.filter(egg => egg.discovered).length
      
      if (currentDiscoveredCount >= savedDiscoveredCount) {
        currentRecords = [...easterEggRecords]
        console.log('🔄 使用当前状态数据（更完整）')
      } else {
        console.log('📂 使用localStorage数据（包含更多已发现彩蛋）')
      }
    }
    
    // 更新指定彩蛋的状态
    const updatedRecords = currentRecords.map(egg => 
      egg.id === eggId 
        ? { ...egg, discovered: true, discoveredAt: currentTime }
        : egg
    )
    
    console.log(`✅ 彩蛋 ${eggId} 已标记为发现。总进度: ${updatedRecords.filter(e => e.discovered).length}/${updatedRecords.length}`)
    
    saveProgress(updatedRecords)
    
    // 强制确保侧边栏在彩蛋发现后保持可见
    setSidebarForceVisible(true)
    setForceProgressBarUpdate(prev => prev + 25)
    
    // 检查是否达到新等级
    const discoveredCount = updatedRecords.filter(egg => egg.discovered).length
    checkLevelUp(discoveredCount)
    
    // 额外确保侧边栏显示更新，并验证数据完整性
    setTimeout(() => {
      setSidebarForceVisible(true)
      setForceProgressBarUpdate(prev => prev + 30)
      
      // 彩蛋发现后验证数据完整性
      const restored = validateAndRestoreData()
      if (restored) {
        console.log('🔧 彩蛋发现后数据已自动恢复')
      }
    }, 500)
    
    // 额外的保险措施：延迟更长时间再次检查
    setTimeout(() => {
      validateAndRestoreData()
    }, 2000)
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
        // 强制确保侧边栏在等级提升时可见
        setSidebarForceVisible(true)
        setForceProgressBarUpdate(prev => prev + 50)
        
        setTimeout(() => {
          setShowLevelUpNotification(newAchievement)
          // 等级提升时再次确保侧边栏可见
          setSidebarForceVisible(true)
          setForceProgressBarUpdate(prev => prev + 75)
        }, 1500) // 延迟显示，让彩蛋动画先播放
        
        // 等级提升后继续确保侧边栏可见
        setTimeout(() => {
          setSidebarForceVisible(true)
          setForceProgressBarUpdate(prev => prev + 100)
        }, 3000)
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
          
          // 安全检查是否已经发现过这个彩蛋
          const isAlreadyDiscovered = safeCheckEggDiscovered('fullscreen')
          
          console.log('🔍 全屏彩蛋检查:', { isAlreadyDiscovered, isVideoFullscreen })
          
          if (!isAlreadyDiscovered) {
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
                
                // 特别为全屏彩蛋强制更新进度条，多次更新确保显示
                setTimeout(() => {
                  setForceProgressBarUpdate(prev => prev + 10) // 立即更新
                  // 再次确认更新
                  setTimeout(() => {
                    setForceProgressBarUpdate(prev => prev + 15) // 再次强制更新
                  }, 1000)
                  // 第三次确保显示
                  setTimeout(() => {
                    setForceProgressBarUpdate(prev => prev + 20) // 最终确保更新
                  }, 3000)
                }, 500)
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
      
      // 强制更新侧边栏显示
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

  // ✨ 创意彩蛋4: 双击魔法彩蛋 - 快速双击页面背景
  useEffect(() => {
    let clickCount = 0
    let clickTimer: NodeJS.Timeout | null = null
    
    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // 只在点击背景或空白区域时触发，排除按钮、链接、输入框等交互元素
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('.easter-egg-modal') ||
          target.closest('.achievement-progress-bar')) {
        return
      }
      
      clickCount++
      
      if (clickCount === 1) {
        // 设置双击检测窗口（500ms内）
        clickTimer = setTimeout(() => {
          clickCount = 0
        }, 500)
      } else if (clickCount === 2) {
        // 检测到双击
        if (clickTimer) {
          clearTimeout(clickTimer)
          clickTimer = null
        }
        clickCount = 0
        
        // 安全检查是否已经发现过这个彩蛋
        if (!safeCheckEggDiscovered('title')) {
          triggerCreativeEgg({
            type: 'title',
            title: '✨ 双击魔法师',
            message: '你掌握了双击的奥秘！魔法在指尖绽放！',
            icon: '✨'
          }, 'title')
        }
      }
    }
    
    document.addEventListener('click', handleDoubleClick)
    return () => {
      document.removeEventListener('click', handleDoubleClick)
      if (clickTimer) {
        clearTimeout(clickTimer)
      }
    }
  }, [easterEggRecords])

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

  // 🎡 滚轮狂热彩蛋：在2秒内连续滚动鼠标滚轮20次
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      // 安全检查是否已经发现过这个彩蛋
      if (safeCheckEggDiscovered('scroll')) {
        return
      }

      const newCount = scrollCount + 1
      setScrollCount(newCount)
      
      console.log(`滚轮计数: ${newCount}/20`) // 调试信息
      
      // 清除之前的定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer)
      }
      
      // 检查是否达到触发条件
      if (newCount >= 20) {
        triggerCreativeEgg({
          type: 'scroll',
          title: '🎡 滚轮疯狂者',
          message: '你的滚轮转动如闪电，掌握了页面穿梭的终极奥义！',
          icon: '🎡'
        }, 'scroll')
        setScrollCount(0)
        return
      }
      
      // 2秒后重置计数
      const timer = setTimeout(() => {
        setScrollCount(0)
      }, 2000)
      setScrollTimer(timer)
    }

    document.addEventListener('wheel', handleWheel, { passive: true })
    
    return () => {
      document.removeEventListener('wheel', handleWheel)
      if (scrollTimer) {
        clearTimeout(scrollTimer)
      }
    }
  }, [scrollCount, scrollTimer, easterEggRecords])

  // 🖥️ 全屏状态监听器 - 专门为侧边栏优化
  useEffect(() => {
    const handleFullscreenChange = () => {
      // 强制更新侧边栏状态
      setForceProgressBarUpdate(prev => prev + 1)
      
      // 检测全屏状态
      const isNowFullscreen = document.fullscreenElement !== null || 
                             (document as any).webkitFullscreenElement !== null ||
                             (document as any).mozFullScreenElement !== null ||
                             (document as any).msFullscreenElement !== null
      
      console.log('🖥️ 全屏状态变化:', isNowFullscreen)
      
      // 在全屏状态下，给侧边栏添加特殊处理
      const sidebar = document.querySelector('.achievement-sidebar') as HTMLElement
      if (sidebar) {
        if (isNowFullscreen) {
          sidebar.classList.add('fullscreen-mode')
          sidebar.style.zIndex = '999999999'
        } else {
          sidebar.classList.remove('fullscreen-mode')
          sidebar.style.zIndex = '9999999'
        }
      }
    }

    // 监听所有可能的全屏事件
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 🚀 创意彩蛋触发器 - 不同类型有不同特效
  const triggerCreativeEgg = (egg: CreativeEasterEgg, eggId: string) => {
    setShowCreativeEgg(egg)
    recordEasterEggDiscovery(eggId)
    showToast(`${egg.icon} ${egg.title}：${egg.message}`, 'success')
    
    // 强制更新进度条，确保它在彩蛋触发后保持可见
    setTimeout(() => {
      setForceProgressBarUpdate(prev => prev + 1)
    }, 100)
    
    // 特别处理全屏彩蛋的进度条保持
    if (eggId === 'fullscreen') {
      // 强制侧边栏始终可见
      setSidebarForceVisible(true)
      
      // 多次强制更新确保进度条不会消失
      const intervals = [500, 1500, 3000, 5000, 7000, 10000]
      intervals.forEach((delay, index) => {
        setTimeout(() => {
          console.log(`🔄 全屏彩蛋强制更新 ${index + 1}/${intervals.length}`)
          setForceProgressBarUpdate(prev => prev + (index + 1) * 20)
          setSidebarForceVisible(true)
          
          // 确保DOM元素可见
          const sidebar = document.querySelector('.achievement-sidebar')
          if (sidebar) {
            ;(sidebar as HTMLElement).style.cssText += `
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              z-index: 999999999 !important;
            `
          }
        }, delay)
      })
    }
    
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
        // 双击彩蛋：魔法星光特效
        createMagicSparkleEffect()
        break
        
      case 'scroll':
        // 滚轮彩蛋：旋转风暴特效
        createScrollStormEffect()
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

  const createMagicSparkleEffect = () => {
    // 魔法星光特效
    const magicColors = ['✨', '🌟', '💫', '⭐', '🔸', '🔹', '💎', '🌠']
    
    // 中心爆炸效果
    for (let i = 0; i < 15; i++) {
      const sparkle = document.createElement('div')
      sparkle.innerHTML = magicColors[Math.floor(Math.random() * magicColors.length)]
      sparkle.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: ${Math.random() * 2 + 1.5}rem;
        z-index: 9999;
        pointer-events: none;
        animation: magicSparkle 2s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
      
      document.body.appendChild(sparkle)
      setTimeout(() => sparkle.remove(), 2500)
    }
    
    // 环形扩散效果
    for (let i = 0; i < 8; i++) {
      const ring = document.createElement('div')
      ring.innerHTML = '✨'
      const angle = (i / 8) * 2 * Math.PI
      const radius = 150
      ring.style.cssText = `
        position: fixed;
        top: calc(50% + ${Math.sin(angle) * radius}px);
        left: calc(50% + ${Math.cos(angle) * radius}px);
        font-size: 2rem;
        z-index: 9999;
        pointer-events: none;
        animation: magicRing 1.5s ease-out forwards;
        animation-delay: ${i * 150}ms;
      `
      
      document.body.appendChild(ring)
      setTimeout(() => ring.remove(), 2000)
    }
    
    if (!document.getElementById('magicSparkleStyle')) {
      const style = document.createElement('style')
      style.id = 'magicSparkleStyle'
      style.textContent = `
        @keyframes magicSparkle {
          0% { 
            transform: translate(-50%, -50%) scale(0) rotate(0deg); 
            opacity: 0; 
          }
          30% { 
            transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 600 - 300}px, ${Math.random() * 400 - 200}px) scale(0.3) rotate(720deg); 
            opacity: 0; 
          }
        }
        @keyframes magicRing {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createScrollStormEffect = () => {
    // 滚轮风暴特效 - 旋转和螺旋元素
    const stormElements = ['🌪️', '💨', '🎡', '⚡', '🌀', '💫', '🎭', '🔥']
    
    // 中心旋转风暴
    for (let i = 0; i < 20; i++) {
      const element = document.createElement('div')
      element.innerHTML = stormElements[Math.floor(Math.random() * stormElements.length)]
      element.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: ${Math.random() * 2 + 1.5}rem;
        z-index: 9999;
        pointer-events: none;
        animation: scrollStorm 3s ease-out forwards;
        animation-delay: ${i * 50}ms;
      `
      
      document.body.appendChild(element)
      setTimeout(() => element.remove(), 3500)
    }
    
    // 螺旋上升效果
    for (let i = 0; i < 12; i++) {
      const spiral = document.createElement('div')
      spiral.innerHTML = '🎡'
      spiral.style.cssText = `
        position: fixed;
        top: 80%;
        left: 50%;
        font-size: 1.5rem;
        z-index: 9999;
        pointer-events: none;
        animation: scrollSpiral 4s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
      
      document.body.appendChild(spiral)
      setTimeout(() => spiral.remove(), 4500)
    }
    
    // 页面震动效果
    document.body.style.animation = 'scrollShake 0.5s ease-in-out'
    setTimeout(() => {
      document.body.style.animation = ''
    }, 500)
    
    if (!document.getElementById('scrollStormStyle')) {
      const style = document.createElement('style')
      style.id = 'scrollStormStyle'
      style.textContent = `
        @keyframes scrollStorm {
          0% { 
            transform: translate(-50%, -50%) scale(0) rotate(0deg); 
            opacity: 0; 
          }
          20% { 
            transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 800 - 400}px, ${Math.random() * 600 - 300}px) scale(0.2) rotate(1440deg); 
            opacity: 0; 
          }
        }
        @keyframes scrollSpiral {
          0% { 
            transform: translate(-50%, 0) rotate(0deg); 
            opacity: 0; 
          }
          30% { 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 600 - 300}px, -600px) rotate(720deg); 
            opacity: 0; 
          }
        }
        @keyframes scrollShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
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
        // 安全检查是否已经发现过这个彩蛋
        if (!safeCheckEggDiscovered('invisible')) {
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
      <div className="fixed inset-0 flex items-center justify-center transition-opacity duration-1000" style={{ zIndex: 999998 }}>
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
      <div className="fixed inset-0 flex items-center justify-center transition-opacity duration-1000" style={{ zIndex: 999998 }}>
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

  // 右侧悬浮成就侧边栏 - 强制永久显示版本
  const AchievementSidebar = () => {
    // 使用默认值确保即使数据未加载也能显示
    const discoveredCount = easterEggRecords.length > 0 ? easterEggRecords.filter(egg => egg.discovered).length : 0
    const totalCount = easterEggDefinitions.length
    const progress = totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0
    const currentAchievement = getCurrentAchievement()

    // 调试信息 - 包含更多状态信息
    console.log('🎯 侧边栏数据:', { 
      discoveredCount, 
      totalCount, 
      progress, 
      easterEggRecords: easterEggRecords.length,
      forceProgressBarUpdate,
      showCreativeEgg: !!showCreativeEgg,
      showLevelUpNotification: !!showLevelUpNotification,
      showAchievementPanel,
      isVideoFullscreen,
      sidebarExpanded,
      sidebarForceVisible
    })

    // 强制显示：除非明确设置为不可见，否则总是显示
    if (!sidebarForceVisible) return null

    // 检测是否在全屏状态
    const isInFullscreen = document.fullscreenElement !== null || 
                          (document as any).webkitFullscreenElement !== null ||
                          (document as any).mozFullScreenElement !== null ||
                          (document as any).msFullscreenElement !== null

    return (
      <div 
        ref={sidebarRef}
        className={`achievement-sidebar force-visible fixed right-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
          sidebarExpanded ? 'w-80' : 'w-16'
        } ${isInFullscreen ? 'fullscreen-mode' : ''}`}
        style={{ 
          zIndex: isInFullscreen ? 999999999 : 9999999, // 全屏状态下使用更高的z-index
          pointerEvents: 'auto',
          position: 'fixed',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'block',
          visibility: 'visible',
          opacity: 1
        }}
        data-testid="achievement-sidebar"
        data-force-visible="true"
      >
        {/* 折叠状态的小按钮 */}
        {!sidebarExpanded && (
          <div 
            className="bg-gradient-to-b from-purple-900/90 to-blue-900/90 backdrop-blur-sm border-l border-t border-b border-white/20 rounded-l-xl p-3 cursor-pointer hover:from-purple-800/90 hover:to-blue-800/90 transition-all duration-300 shadow-lg"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSidebarExpanded(true)
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-xl">{currentAchievement?.icon || '🥉'}</div>
              <div className="text-white text-xs font-medium text-center">
                <div>{discoveredCount}</div>
                <div className="text-white/60">/</div>
                <div>{totalCount}</div>
              </div>
              <div className="w-2 h-8 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-gradient-to-t from-yellow-400 to-orange-400 transition-all duration-1000"
                  style={{ height: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 展开状态的详细面板 */}
        {sidebarExpanded && (
          <div className="bg-gradient-to-b from-purple-900/95 to-blue-900/95 backdrop-blur-md border-l border-t border-b border-white/20 rounded-l-xl p-4 shadow-xl">
            {/* 顶部标题和折叠按钮 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{currentAchievement?.icon || '🥉'}</div>
                <div>
                  <div className="text-white font-medium text-sm">
                    {currentAchievement?.name || '探索者'}
                  </div>
                  <div className="text-white/60 text-xs">
                    探索进度
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSidebarExpanded(false)
                }}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 进度条 */}
            <div className="mb-4">
              <div className="flex justify-between text-white/80 text-sm mb-2">
                <span>彩蛋发现</span>
                <span>{discoveredCount}/{totalCount}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-white/60 text-xs mt-1">
                {progress.toFixed(0)}% 完成
              </div>
            </div>

            {/* 最近发现的彩蛋 */}
            <div className="mb-4">
              <div className="text-white/80 text-sm mb-2">最新发现</div>
              <div className="space-y-1">
                {easterEggRecords
                  .filter(egg => egg.discovered)
                  .slice(-3)
                  .reverse()
                  .map(egg => (
                    <div key={egg.id} className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{egg.icon}</span>
                      <span className="text-white/70 truncate">{egg.name}</span>
                    </div>
                  ))
                }
                {discoveredCount === 0 && (
                  <div className="text-white/50 text-xs">还未发现任何彩蛋</div>
                )}
              </div>
            </div>

            {/* 查看详情按钮 */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowAchievementPanel(true)
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white text-sm transition-all duration-300 hover:scale-105"
            >
              查看全部彩蛋
            </button>
          </div>
        )}
      </div>
    )
  }

  // 成就详情面板
  const AchievementPanel = () => {
    if (!showAchievementPanel) return null

    const discoveredCount = easterEggRecords.filter(egg => egg.discovered).length
    const currentAchievement = getCurrentAchievement()

    return (
      <div className="fixed inset-0 flex items-center justify-center transition-opacity duration-1000" style={{ zIndex: 999998 }}>
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

  // 强制侧边栏永久显示机制
  useEffect(() => {
    if (!document.getElementById('sidebarForceStyle')) {
      const style = document.createElement('style')
      style.id = 'sidebarForceStyle'
      style.textContent = `
        /* 基础强制显示样式 */
        .achievement-sidebar.force-visible {
          display: block !important;
          visibility: visible !important;
          position: fixed !important;
          z-index: 9999999 !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
        }
        
        /* 全屏状态下的超级强制显示 */
        .achievement-sidebar.fullscreen-mode,
        body:-webkit-full-screen .achievement-sidebar,
        body:-moz-full-screen .achievement-sidebar,
        body:-ms-fullscreen .achievement-sidebar,
        body:fullscreen .achievement-sidebar {
          z-index: 999999999 !important;
          position: fixed !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
        }
        
        /* 防止被其他元素覆盖 */
        .achievement-sidebar * {
          pointer-events: auto !important;
        }
        
        /* 确保在视频全屏时也可见 */
        video:fullscreen ~ .achievement-sidebar,
        video:-webkit-full-screen ~ .achievement-sidebar,
        video:-moz-full-screen ~ .achievement-sidebar {
          z-index: 999999999 !important;
          display: block !important;
          visibility: visible !important;
        }
      `
      document.head.appendChild(style)
    }
    
    // 定期检查侧边栏是否可见，如果不可见就强制显示
    const forceVisibilityInterval = setInterval(() => {
      const sidebar = document.querySelector('.achievement-sidebar')
      if (sidebar) {
        const computedStyle = window.getComputedStyle(sidebar)
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
          console.log('🔧 检测到侧边栏被隐藏，强制显示')
          ;(sidebar as HTMLElement).style.cssText += `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: fixed !important;
            z-index: 9999999 !important;
            right: 0 !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
          `
        }
      }
    }, 1000)
    
    return () => clearInterval(forceVisibilityInterval)
  }, [])
  
  // 侧边栏DOM自我保护机制
  useEffect(() => {
    const checkSidebarVisibility = () => {
      const sidebarElement = document.querySelector('.achievement-sidebar') as HTMLElement
      if (!sidebarElement) return
      
      const computedStyle = window.getComputedStyle(sidebarElement)
      
      if (computedStyle.display === 'none' || 
          computedStyle.visibility === 'hidden' || 
          parseFloat(computedStyle.opacity) < 0.1) {
        
        console.log('🚨 侧边栏被检测到隐藏，立即强制恢复显示！')
        
        // 立即强制显示
        sidebarElement.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: fixed !important;
          z-index: 999999999 !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          pointer-events: auto !important;
        `
        
        // 更新React状态
        setSidebarForceVisible(true)
        setForceProgressBarUpdate(prev => prev + 200)
      }
    }
    
    // 立即检查一次
    setTimeout(checkSidebarVisibility, 100)
    
    // 定期检查侧边栏可见性
    const visibilityChecker = setInterval(checkSidebarVisibility, 1000)
    
    return () => clearInterval(visibilityChecker)
  }, [sidebarForceVisible, easterEggRecords])
  
  // 监听全屏变化并强制更新侧边栏显示
  useEffect(() => {
    const handleVisibilityForce = () => {
      console.log('🔄 全屏状态变化，强制更新侧边栏显示')
      setForceProgressBarUpdate(prev => prev + 100) // 大幅增加更新值
      setSidebarForceVisible(false)
      
      // 立即重新显示
      setTimeout(() => {
        setSidebarForceVisible(true)
      }, 50)
      
      // 再次确保显示
      setTimeout(() => {
        const sidebar = document.querySelector('.achievement-sidebar')
        if (sidebar) {
          ;(sidebar as HTMLElement).style.cssText += `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999999999 !important;
          `
        }
      }, 500)
    }
    
    document.addEventListener('fullscreenchange', handleVisibilityForce)
    document.addEventListener('webkitfullscreenchange', handleVisibilityForce)
    document.addEventListener('mozfullscreenchange', handleVisibilityForce)
    document.addEventListener('msfullscreenchange', handleVisibilityForce)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleVisibilityForce)
      document.removeEventListener('webkitfullscreenchange', handleVisibilityForce)
      document.removeEventListener('mozfullscreenchange', handleVisibilityForce)
      document.removeEventListener('msfullscreenchange', handleVisibilityForce)
    }
  }, [])

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
      
      {/* 右侧悬浮成就侧边栏 - 强制显示版本 */}
      <AchievementSidebar />
      
      {/* 成就详情面板 */}
      <AchievementPanel />
      
      {/* 调试信息面板（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '10px', 
          left: '10px', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '8px', 
          fontSize: '12px',
          borderRadius: '4px',
          zIndex: 999999999
        }}>
          侧边栏状态: {sidebarForceVisible ? '✅ 可见' : '❌ 隐藏'} | 
          更新计数: {forceProgressBarUpdate} | 
          记录数: {easterEggRecords.length}
        </div>
      )}
      
      {/* 彩蛋说明（隐藏的开发者信息） */}
      <div style={{ display: 'none' }} data-easter-eggs="creative">
        {/* 
        今夕公会创意彩蛋系统 v2.4 - 成就系统：
        1. 键盘彩蛋：输入 "JINXI7" 触发7周年庆典
        2. 点击彩蛋：快速点击Logo 7次
        3. 全屏视频彩蛋：全屏观看今夕宣传视频
        4. 开发者彩蛋：打开F12开发者工具
        5. 双击魔法彩蛋：快速双击页面背景空白区域
        6. 商标点击彩蛋：点击页面底部的今夕商标
        7. 滚轮狂热彩蛋：在2秒内连续滚动鼠标滚轮20次（更严格的挑战！）
        
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
