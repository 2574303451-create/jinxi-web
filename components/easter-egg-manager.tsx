"use client"

import { useState, useEffect, useRef } from 'react'
// 神秘探索彩蛋管理器 - 全新设计

interface EasterEggManagerProps {
  children: React.ReactNode
}

// 创意彩蛋类型定义
interface CreativeEasterEgg {
  type: 'observation' | 'invisible' | 'fullscreen' | 'title' | 'scroll' | 'detective'
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
  const [showCreativeEgg, setShowCreativeEgg] = useState<CreativeEasterEgg | null>(null)
  const [keySequence, setKeySequence] = useState('')
  
  // 创意彩蛋相关状态
  const [forceProgressBarUpdate, setForceProgressBarUpdate] = useState(0)
  const [sidebarForceVisible, setSidebarForceVisible] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // 🕰️ 层层递进探索彩蛋状态
  const [explorationStage, setExplorationStage] = useState(0) // 0-4，分别对应未开始和四个阶段
  const [explorationClues, setExplorationClues] = useState<string[]>([])
  const [showExplorationInterface, setShowExplorationInterface] = useState(false)
  const [explorationStartTime, setExplorationStartTime] = useState<number>(0)
  
  // 成就系统状态
  const [showAchievementPanel, setShowAchievementPanel] = useState(false)
  const [showLevelUpNotification, setShowLevelUpNotification] = useState<Achievement | null>(null)
  const [easterEggRecords, setEasterEggRecords] = useState<EasterEggRecord[]>([])
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  
  // 🗺️ 地图连接彩蛋状态
  const [showMapChallenge, setShowMapChallenge] = useState(false)
  const [mapConnections, setMapConnections] = useState<Array<{from: number, to: number}>>([])
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null)
  const [isDrawingConnection, setIsDrawingConnection] = useState(false)
  
  // 🔐 加密工具函数
  const encryptData = (data: string): string => {
    return btoa(encodeURIComponent(data))
      .split('').reverse().join('')
      .replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + (c <= 'Z' ? 13 : 13)))
  }
  
  const decryptData = (encrypted: string): string => {
    try {
      const reversed = encrypted
        .replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - (c <= 'Z' ? 13 : 13)))
        .split('').reverse().join('')
      const decoded = decodeURIComponent(Buffer.from(reversed, 'base64').toString())
      return decoded
    } catch (error) {
      // 使用浏览器兼容的方式
      const reversed = encrypted
        .replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - (c <= 'Z' ? 13 : 13)))
        .split('').reverse().join('')
      return decodeURIComponent(atob(reversed))
    }
  }
  
  const obfuscateKey = (key: string): string => {
    return 'jx_' + btoa(key).replace(/[=+/]/g, (c) => ({
      '=': '_e',
      '+': '_p',
      '/': '_s'
    })[c] || c)
  }
  
  // 地图上的头像位置数据（基于提供的地图图片）
  const mapAvatars = [
    { id: 0, x: 45, y: 25, region: '内蒙古', avatar: '👨‍💻' },
    { id: 1, x: 65, y: 35, region: '河北', avatar: '👩‍🎨' },
    { id: 2, x: 25, y: 45, region: '宁夏', avatar: '👦' },
    { id: 3, x: 35, y: 50, region: '陕西', avatar: '🧑‍💼' },
    { id: 4, x: 50, y: 60, region: '湖北', avatar: '👧' },
    { id: 5, x: 75, y: 55, region: '江苏', avatar: '👨‍🔬' },
    { id: 6, x: 80, y: 75, region: '浙江', avatar: '👩‍🏫' },
    { id: 7, x: 25, y: 75, region: '四川', avatar: '🧑‍🎓' },
    { id: 8, x: 50, y: 85, region: '广西', avatar: '👨‍🎤' },
    { id: 9, x: 60, y: 95, region: '广东', avatar: '👩‍⚕️' }
  ]
  
  // 🗺️ 地图连接相关函数
  const handleAvatarClick = (avatarId: number) => {
    if (!showMapChallenge) return
    
    if (selectedAvatar === null) {
      // 选择第一个头像
      setSelectedAvatar(avatarId)
      setIsDrawingConnection(true)
    } else if (selectedAvatar !== avatarId) {
      // 连接两个头像
      const newConnection = { from: selectedAvatar, to: avatarId }
      const reverseConnection = { from: avatarId, to: selectedAvatar }
      
      // 检查是否已经存在这个连接
      const connectionExists = mapConnections.some(conn => 
        (conn.from === newConnection.from && conn.to === newConnection.to) ||
        (conn.from === newConnection.to && conn.to === newConnection.from)
      )
      
      if (!connectionExists) {
        const updatedConnections = [...mapConnections, newConnection]
        setMapConnections(updatedConnections)
        
        // 检查是否完成挑战
        _0x3d7f(updatedConnections)
      }
      
      setSelectedAvatar(null)
      setIsDrawingConnection(false)
    } else {
      // 取消选择
      setSelectedAvatar(null)
      setIsDrawingConnection(false)
    }
  }
  
  const _0x3d7f = (connections: Array<{from: number, to: number}>) => {
    // 检查连接是否足够（需要连接至少6个头像，形成网络）
    const connectedAvatars = new Set<number>()
    connections.forEach(conn => {
      connectedAvatars.add(conn.from)
      connectedAvatars.add(conn.to)
    })
    
    if (connectedAvatars.size >= 6 && connections.length >= 5) {
      // 成功完成地图连接挑战
      setTimeout(() => {
        setShowMapChallenge(false)
        setMapConnections([])
        
        triggerCreativeEgg({
          type: 'observation',
          title: '🗺️ 以战会友缔造者',
          message: '你成功连接了全国各地的今夕伙伴！以战会友，彼此成就的理念将我们紧密相连！',
          icon: '🗺️'
        }, 'legend-awakener')
        
        createMapConnectionEffect()
        showToast('🗺️ 以战会友！你连接了分散各地的今夕伙伴！', 'success')
      }, 1000)
    }
  }
  
  const _0x8a4c = () => {
    if (_0x5c1d('legend-awakener')) {
      showToast('你已经发现过这个彩蛋了！', 'info')
      return
    }
    
    setShowMapChallenge(true)
    setMapConnections([])
    setSelectedAvatar(null)
    showToast('🗺️ 发现神秘地图！连接各地的今夕伙伴吧！', 'info')
  }
  
  // 安全检查彩蛋是否已发现的辅助函数
  const _0x5c1d = (eggId: string): boolean => {
    try {
      const storageKey = obfuscateKey('progress-data')
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const decryptedData = decryptData(saved)
        const parsedRecords = JSON.parse(decryptedData)
        const egg = parsedRecords.find((egg: EasterEggRecord) => egg.id === eggId)
        if (egg?.discovered) {
          return true
        }
      }
    } catch (error) {
      // 静默处理错误，避免暴露调试信息
      if (process.env.NODE_ENV === 'development') {
        console.warn(`状态检查异常:`, error)
      }
    }
    
    // 备用检查：使用当前状态
    const egg = easterEggRecords.find(egg => egg.id === eggId)
    return egg?.discovered || false
  }
  
  // 数据完整性验证和恢复函数
  const validateAndRestoreData = () => {
    try {
      const storageKey = obfuscateKey('progress-data')
      const saved = localStorage.getItem(storageKey)
      if (!saved) return
      
      const decryptedData = decryptData(saved)
      const parsedRecords = JSON.parse(decryptedData)
      const discoveredEggs = parsedRecords.filter((r: EasterEggRecord) => r.discovered)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 数据完整性检查:', {
          保存的记录数: parsedRecords.length,
          已发现彩蛋数: discoveredEggs.length,
          当前状态记录数: easterEggRecords.length,
          当前已发现数: easterEggRecords.filter(e => e.discovered).length
        })
      }
      
      // 如果保存的数据中有更多已发现的彩蛋，恢复它们
      if (discoveredEggs.length > easterEggRecords.filter(e => e.discovered).length) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 检测到数据不一致，恢复存储的数据')
        }
        const restoredRecords = easterEggDefinitions.map(def => {
          const savedRecord = parsedRecords.find((r: EasterEggRecord) => r.id === def.id)
          return savedRecord && savedRecord.discovered ? savedRecord : def
        })
        setEasterEggRecords(restoredRecords)
        return true
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('数据验证时出错:', error)
      }
    }
    return false
  }
  
  // 🔐 加密的探索数据
  const _0x4a5b = [
    '0VbWQWbW0bbW5xaWQWbW0bbW1xaW0RbW1bbWOuaWPWbW0bbW0taWOyaW3bbWVbWQyaW1bbW0taWxaW1bbWRWbWPyaW1bbW4RbW1taW1bbW1RbWSuaW2bbWSyaWTWbW4bbWQqaW1taWtaW4bbWRbWtaW5bbW0xaWQWbW3bbWPuaWTuaW1bbWOyaWQWbW0bbW4xaW4taW2bbW1RbWPWbW0bbW',
    'taWRbW3bbW2taWTSbW1bbW2RbWQSbW3bbW3xaWRSbW1bbW0taWOyaW3bbWTuaW3xaW4bbWxaWOyaW5bbWRbW3RbW4bbW0VbWRbW3bbWQqaW4taW4VbW1bbWxaWTSbW4bbW0VbWRbW3bbWtaWRbW3bbW2taWTSbW1bbW',
    '3xaWRSbW1bbW0RbW4VbW0bbW1xaW0RbW1bbWOuaWPWbW0bbW5xaW2taW1bbW2RbW5VbW0bbW3taWRbW2bbWRbWQWbW5bbW4RbW0xaW3bbWQqaW2VbWSSbW1bbW1xaWVbW2bbW2RbW5VbW0bbW1xaW0RbW1bbWOuaWPWbW0bbW',
    'RbWPSbW3bbWxaW5VbW0bbWTuaW3xaW4bbWxaWOyaW5bbWTuaW1RbW1bbW0xaWQWbW2bbW4xaWPyaW3bbWSSbW0xaW5bbW4RbW0xaW3bbWQqaW2VbWSSbW1bbWVbWPyaW2bbWQyaWRWbW0bbWPuaWSWbW1bbWPuaW3xaW2bbW',
    '==t^PcP\\4b`[Scv[Pc[5bv[Scv_5bP[5b[Sc`_5bv_OcP\\ScP[4b`^5b[ScP_OcP\\PcP[Sc`Z5b`^5bv[Sc[Pc`[4b`\\ScP[Pc`\\Pc`[ScP\\NwZ4RbWQyaW1bbW1xaW0RbW1bbWOuaWPWbW0bbWtaWTSbW4bbWtaW3RbW4bbWQuaWQWbWTcbW5taW1taW1bbW2VbW3xaW2bbWOuaW2VbW4bbWTWbW5RbW3bbWQqaW1taWtaW4bbWRbW0VbW3bbWRbWSuaW2bbW5taW1taW1bbW2VbW3xaW2bbWVaWTuaW4VbWTcbWVbW1xaWTyaWfbW',
    '4xaW3RbW3bbW1RbW1RbW1bbW0taWOyaW3bbW4xaWRbW5bbWQyaWVbW4bbW3xaWRSbW1bbWVbW1xaW2bbWtaWQWbW1bbWRbW3RbW4bbWQqaW4taW4VbW1bbW1xaWVbW2bbW2RbWRSbW1bbWVbW1xaW2bbW',
    'TSbWTuaW1bbW0RbWSSbW4bbW3xaWSWbW1bbW3VbWSuaW4bbW4xaW4taW2bbWxaWQuaW2bbW2taWTWbW1bbWVbWSSbW4bbW3taWTWbW4bbWOyaWtaW5bbWQqaW1taWtaW4bbW0RbWOuaW2bbW4taWSSbW1bbW2taWTWbW1bbWVbWSSbW4bbW',
    '5xaWRyaW5bbWVbW5VbW1bbWtaWTWbW1bbW1taW2taW1bbWSWbW5taW2bbWPWbWTSbW1bbWRSbW4VbW0bbW4xaWPWbW5bbW5xaWRyaW5bbW4RbWQyaW1bbWQqaW4taW4VbW1bbW3RbW0RbW1bbWtaWTWbW1bbW1taW2RbW3bbW',
    'TyaWTyaW1bbWOWbWQuaW1bbW2taWTSbW1bbW4xaW3RbW3bbW0taWOyaW3bbWTuaW3xaW4bbWxaWOyaW5bbWRSbW4VbW0bbWRbWRyaW5bbW1VbWRbW5bbWVbWSuaW3bbWxaWTuaW1bbWQqaW1taWtaW4bbWRbW0VbW3bbWRbWSuaW2bbW4xaW3RbW3bbWxaWOyaW5bbW',
    '1taWtaW4bbW0VbWTSbW4bbWRbWQWbW0bbW0taWOyaW3bbWRWbWtaW4bbWtaWOuaW2bbWRbW0VbW3bbWRbWSuaW2bbW5taWQyaW2bbWtaW5taW2bbWRbWTuaW2bbWQuaWSuaW2bbWQqaW1taWtaW4bbWRyaWSSbW1bbWPWbWTSbW1bbWtaWSyaW2bbW4taWPWbW3bbW'
  ]
  
  const _0x6c8d = () => {
    try {
      const _0x2f1a = ['legend-awakener', 'cipher-breaker', 'geometry-artist', 'melody-composer', 'time-explorer', 'math-wizard', 'memory-keeper', 'patience-master', 'explorer', 'ultimate-seeker']
      const _0x8e3b = ['🗺️', '🔐', '📐', '🎵', '🕰️', '🧮', '🧠', '🧘', '🗺️', '💎']
      
      return _0x4a5b.map((item, index) => {
        const decoded = decryptData(item)
        const parts = decoded.split('|')
        return {
          id: _0x2f1a[index],
          name: parts[0],
          description: parts[1],
          icon: _0x8e3b[index],
          discovered: false
        }
      })
    } catch {
      // 备用数据防止解密失败
      return Array(10).fill(0).map((_, i) => ({
        id: `item-${i}`,
        name: '神秘探索者',
        description: '发现隐藏的秘密',
        icon: '✨',
        discovered: false
      }))
    }
  }
  
  const easterEggDefinitions: EasterEggRecord[] = _0x6c8d()
  
  // 神秘探索成就等级定义
  const achievements: Achievement[] = [
    {
      id: 'novice',
      name: '神秘学徒',
      description: '发现3个隐藏秘密',
      icon: '🌟',
      requiredEggs: 3,
      level: 1
    },
    {
      id: 'seeker',
      name: '秘密探寻者',
      description: '发现6个神秘彩蛋',
      icon: '🔮',
      requiredEggs: 6,
      level: 2
    },
    {
      id: 'master',
      name: '探索宗师',
      description: '发现9个隐藏宝藏',
      icon: '👑',
      requiredEggs: 9,
      level: 3
    },
    {
      id: 'legend',
      name: '传说寻宝师',
      description: '掌握所有神秘知识',
      icon: '🏆',
      requiredEggs: 10,
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
        
        // 数据加载后确保侧边栏可见
        setTimeout(() => {
          setSidebarForceVisible(true)
          setForceProgressBarUpdate(prev => prev + 50)
        }, 100)
      } catch (error) {
        setEasterEggRecords(easterEggDefinitions)
        setSidebarForceVisible(true)
      }
    } else {
      setEasterEggRecords(easterEggDefinitions)
      setSidebarForceVisible(true)
      
      // 首次访问时短暂展开侧边栏
      setTimeout(() => {
        setSidebarExpanded(true)
        setSidebarForceVisible(true)
        setTimeout(() => {
          setSidebarExpanded(false)
          setSidebarForceVisible(true)
        }, 3000)
      }, 2000)
    }
    
    return () => {}
  }, [])
  
  // 组件更新监听器 - 确保在任何状态变化时侧边栏都保持可见
  useEffect(() => {
    setSidebarForceVisible(true)
    
    // 在状态变化时验证数据完整性
    setTimeout(() => {
      const restored = validateAndRestoreData()
      if (restored) {
        setForceProgressBarUpdate(prev => prev + 100)
      }
    }, 100)
  }, [showCreativeEgg, showLevelUpNotification, showAchievementPanel])

  // 保存成就进度 - 加密版本
  const saveProgress = (newRecords: EasterEggRecord[]) => {
    // 验证新记录的完整性
    const validRecords = newRecords.length >= easterEggDefinitions.length ? newRecords : 
      // 如果数据不完整，从localStorage读取现有数据并合并
      (() => {
        try {
          const storageKey = obfuscateKey('progress-data')
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const decryptedData = decryptData(saved)
            const existingRecords = JSON.parse(decryptedData)
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
          if (process.env.NODE_ENV === 'development') {
            console.warn('恢复数据时出错:', error)
          }
        }
        return newRecords
      })()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 保存进度数据:', validRecords.filter(r => r.discovered).map(r => r.name))
    }
    
    const storageKey = obfuscateKey('progress-data')
    const encryptedData = encryptData(JSON.stringify(validRecords))
    localStorage.setItem(storageKey, encryptedData)
    setEasterEggRecords(validRecords)
  }

  // 记录彩蛋发现 - 加密版本
  const _0x9b2e = (eggId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 开始记录彩蛋发现: ${eggId}`)
    }
    
    const currentTime = new Date().toLocaleString('zh-CN')
    
    // 从localStorage获取最新数据，确保不会丢失之前的记录
    let currentRecords: EasterEggRecord[] = []
    try {
      const storageKey = obfuscateKey('progress-data')
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const decryptedData = decryptData(saved)
        const parsedRecords = JSON.parse(decryptedData)
        // 确保数据完整性，合并所有彩蛋定义
        currentRecords = easterEggDefinitions.map(def => {
          const existingRecord = parsedRecords.find((r: EasterEggRecord) => r.id === def.id)
          return existingRecord || def
        })
      } else {
        currentRecords = [...easterEggRecords]
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('读取保存数据时出错，使用当前状态:', error)
      }
      currentRecords = [...easterEggRecords]
    }
    
    // 如果当前状态数据更完整，使用当前状态
    if (easterEggRecords.length >= easterEggDefinitions.length) {
      const currentDiscoveredCount = easterEggRecords.filter(egg => egg.discovered).length
      const savedDiscoveredCount = currentRecords.filter(egg => egg.discovered).length
      
      if (currentDiscoveredCount >= savedDiscoveredCount) {
        currentRecords = [...easterEggRecords]
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 使用当前状态数据（更完整）')
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📂 使用存储数据（包含更多已发现彩蛋）')
        }
      }
    }
    
    // 更新指定彩蛋的状态
    const updatedRecords = currentRecords.map(egg => 
      egg.id === eggId 
        ? { ...egg, discovered: true, discoveredAt: currentTime }
        : egg
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ 彩蛋 ${eggId} 已标记为发现。总进度: ${updatedRecords.filter(e => e.discovered).length}/${updatedRecords.length}`)
    }
    
    // 立即更新React状态，确保成就栏实时更新
    setEasterEggRecords(updatedRecords)
    
    // 保存到localStorage
    saveProgress(updatedRecords)
    
    // 强制确保侧边栏在彩蛋发现后保持可见和更新
    setSidebarForceVisible(true)
    setForceProgressBarUpdate(prev => prev + 100) // 增加更新幅度
    
    // 检查是否达到新等级
    const discoveredCount = updatedRecords.filter(egg => egg.discovered).length
    checkLevelUp(discoveredCount)
    
    // 立即再次强制更新，确保UI响应
    setTimeout(() => {
      setForceProgressBarUpdate(prev => prev + 50)
      setSidebarForceVisible(true)
    }, 100)
    
    // 额外确保数据持久化和UI同步
    setTimeout(() => {
      setSidebarForceVisible(true)
      setForceProgressBarUpdate(prev => prev + 30)
      
      // 彩蛋发现后验证数据完整性
      const restored = validateAndRestoreData()
      
      // 强制同步等级牌显示
      const newAchievement = getCurrentAchievement()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 彩蛋发现后状态同步完成', {
          discoveredCount,
          totalCount: updatedRecords.length,
          achievement: newAchievement?.name
        })
      }
    }, 500)
    
    // 额外的保险措施
    setTimeout(() => {
      validateAndRestoreData()
      setForceProgressBarUpdate(prev => prev + 50)
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

  // 获取当前成就 - 修复版，返回最高级别的成就
  const getCurrentAchievement = (): Achievement | null => {
    const discoveredCount = easterEggRecords.filter(egg => egg.discovered).length
    
    // 找到所有符合条件的成就，然后返回等级最高的
    const eligibleAchievements = achievements
      .filter(a => a.requiredEggs <= discoveredCount && a.level <= 3)
      .sort((a, b) => b.level - a.level) // 按等级降序排序
    
    return eligibleAchievements[0] || null
  }

  // 🌟 时空守护者彩蛋 - 特殊时间触发器
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key
      const newSequence = keySequence + key
      const trimmedSequence = newSequence.slice(-20) // 增长序列以支持更复杂的密码
      setKeySequence(trimmedSequence)
      
      // 移除了原有的键盘输入机制，改为地图连接机制
      
      // 🔐 密码破译师彩蛋 - 输入神秘字符序列（更严格的条件）
      const treasurePattern = /TREASURE|treasure/
      const cipherSequences = [
        'JXTREASURE', 'jxtreasure', 'TREASURE2024', 'treasure2024',
        'JINXI+TREASURE', 'jinxi+treasure', 'cipher:TREASURE', 'cipher:treasure'
      ]
      
      const hasCipherPattern = cipherSequences.some(pattern => trimmedSequence.includes(pattern)) ||
                              (treasurePattern.test(trimmedSequence) && 
                               (trimmedSequence.includes('cipher') || 
                                trimmedSequence.includes('CIPHER') ||
                                trimmedSequence.includes('jinxi') ||
                                trimmedSequence.includes('JINXI') ||
                                trimmedSequence.includes('2024')))
      
      if (hasCipherPattern) {
        if (!_0x5c1d('cipher-breaker')) {
          triggerCreativeEgg({
            type: 'observation',
            title: '🔐 密码破译师',
            message: '你破解了古老的密码！宝藏就在眼前！',
            icon: '🔐'
          }, 'cipher-breaker')
          createCipherBreakEffect()
        }
        setKeySequence('')
        return
      }
      
      // 清理过长的序列
      if (trimmedSequence.length > 18) {
        setTimeout(() => setKeySequence(''), 3000)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [keySequence])



  // 🕰️ 层层递进探索彩蛋 - 今夕2018年酷暑创建之旅
  useEffect(() => {
    let timeExplorationTimer: NodeJS.Timeout | null = null
    let stageCheckTimer: NodeJS.Timeout | null = null
    
    // 检查是否已经发现过这个彩蛋
    if (_0x5c1d('time-explorer')) {
      return
    }
    
    // 初始化探索开始时间
    if (explorationStartTime === 0) {
      setExplorationStartTime(Date.now())
    }
    
    // 第一阶段：时间线索 - 页面停留时间检测
    const startTimeExploration = () => {
      // 2分钟后触发第一阶段
      timeExplorationTimer = setTimeout(() => {
        if (explorationStage === 0) {
          setExplorationStage(1)
          setExplorationClues(['⏰ 时间的痕迹'])
          showToast('🕰️ 时间探索者，你感受到了历史的足迹...', 'info')
          createTimeExplorationEffect(1)
        }
      }, 120000) // 2分钟
    }
    
    // 阶段检查和推进
    const checkStageProgression = () => {
      stageCheckTimer = setInterval(() => {
        if (explorationStartTime === 0) return
        
        const currentTime = Date.now()
        const timeSpent = currentTime - explorationStartTime
        
        // 第二阶段：酷暑元素探索
        if (explorationStage === 1 && timeSpent > 180000) { // 3分钟后
          setExplorationStage(2)
          setExplorationClues(prev => [...prev, '🌞 酷暑的记忆'])
          showToast('☀️ 炎热的夏日，似乎有故事在召唤...', 'info')
          createTimeExplorationEffect(2)
          createHeatWaveElements()
        }
        
        // 第三阶段：2018年线索
        if (explorationStage === 2 && timeSpent > 240000) { // 4分钟后
          setExplorationStage(3)
          setExplorationClues(prev => [...prev, '📅 2018年的印记'])
          showToast('📆 2018年，那个特殊的年份...', 'info')
          createTimeExplorationEffect(3)
          create2018Elements()
        }
        
        // 第四阶段：今夕创建故事
        if (explorationStage === 3 && timeSpent > 300000) { // 5分钟后
          setExplorationStage(4)
          setExplorationClues(prev => [...prev, '🌅 今夕的诞生'])
          setShowExplorationInterface(true)
          triggerCreativeEgg({
            type: 'observation',
            title: '🕰️ 时光探索者',
            message: '你穿越时光，见证了今夕在2018年酷暑中的诞生时刻！',
            icon: '🕰️'
          }, 'time-explorer')
          createTimeExplorationEffect(4)
          createJinXiBirthEffect()
          
          // 清理定时器
          if (stageCheckTimer) clearInterval(stageCheckTimer)
        }
      }, 30000) // 每30秒检查一次
    }
    
    if (explorationStage === 0) {
      startTimeExploration()
    }
    checkStageProgression()
    
    return () => {
      if (timeExplorationTimer) clearTimeout(timeExplorationTimer)
      if (stageCheckTimer) clearInterval(stageCheckTimer)
    }
  }, [explorationStage, explorationStartTime])

  // 🕵️ 观察大师彩蛋 - 细节观察挑战
  useEffect(() => {
    let clickPattern: string[] = []
    let observationChallenge = false
    
    // 创建隐藏的观察元素
    const createObservationElements = () => {
      if (_0x5c1d('detective') || observationChallenge) return
      
      // 随机在页面上创建3个微妙的变化元素
      const positions = [
        { top: '20%', left: '80%' },
        { top: '60%', left: '15%' },
        { top: '40%', left: '50%' }
      ]
      
      positions.forEach((pos, index) => {
        const element = document.createElement('div')
        element.style.cssText = `
          position: fixed;
          top: ${pos.top};
          left: ${pos.left};
          width: 8px;
          height: 8px;
          background: rgba(255, 215, 0, 0.3);
          border-radius: 50%;
          cursor: pointer;
          z-index: 999;
          transition: all 0.3s ease;
          animation: subtlePulse 3s ease-in-out infinite;
        `
        element.dataset.observationId = index.toString()
        
        element.addEventListener('mouseenter', () => {
          element.style.background = 'rgba(255, 215, 0, 0.6)'
          element.style.transform = 'scale(1.5)'
        })
        
        element.addEventListener('mouseleave', () => {
          element.style.background = 'rgba(255, 215, 0, 0.3)'
          element.style.transform = 'scale(1)'
        })
        
        element.addEventListener('click', () => {
          clickPattern.push(index.toString())
          element.style.background = 'rgba(0, 255, 0, 0.8)'
          
          // 检查是否按正确顺序点击 (0, 1, 2)
          if (clickPattern.length === 3) {
            if (clickPattern.join('') === '012') {
              triggerCreativeEgg({
                type: 'invisible',
                title: '🕵️ 观察大师',
                message: '你拥有敏锐的观察力！成功发现并解开了隐藏的观察谜题！',
                icon: '🕵️'
              }, 'detective')
              createDetectiveEffect()
            } else {
              showToast('🔍 观察顺序不对，重新开始挑战！', 'error')
            }
            
            // 清理元素
            document.querySelectorAll('[data-observation-id]').forEach(el => el.remove())
            clickPattern = []
            observationChallenge = false
          }
        })
        
        document.body.appendChild(element)
      })
      
      // 添加微妙脉冲动画
      if (!document.getElementById('subtlePulseStyle')) {
        const style = document.createElement('style')
        style.id = 'subtlePulseStyle'
        style.textContent = `
          @keyframes subtlePulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
        `
        document.head.appendChild(style)
      }
      
      observationChallenge = true
      showToast('🕵️ 观察挑战：发现页面上3个微妙的变化，按顺序点击！', 'info')
      
      // 60秒后自动清理
      setTimeout(() => {
        document.querySelectorAll('[data-observation-id]').forEach(el => el.remove())
        clickPattern = []
        observationChallenge = false
      }, 60000)
    }
    
    // 90秒后触发观察挑战
    const observationTimer = setTimeout(createObservationElements, 90000)
    
    return () => {
      clearTimeout(observationTimer)
      document.querySelectorAll('[data-observation-id]').forEach(el => el.remove())
    }
  }, [])

  // 📐 几何艺术家彩蛋 - 互动式图形绘制挑战
  useEffect(() => {
    let mouseTrail: { x: number, y: number, timestamp: number }[] = []
    let isDrawing = false
    let trailVisuals: HTMLDivElement[] = []
    let currentChallenge: string | null = null
    let challengeStartTime = 0
    
    const challenges = ['今夕']
    
    // 显示绘制轨迹的视觉反馈
    const createTrailVisual = (x: number, y: number) => {
      const dot = document.createElement('div')
      dot.style.cssText = `
        position: fixed;
        top: ${y - 3}px;
        left: ${x - 3}px;
        width: 6px;
        height: 6px;
        background: rgba(255, 215, 0, 0.8);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        animation: trailFade 2s ease-out forwards;
      `
      document.body.appendChild(dot)
      trailVisuals.push(dot)
      
      // 限制轨迹视觉元素数量
      if (trailVisuals.length > 50) {
        const oldDot = trailVisuals.shift()
        if (oldDot) oldDot.remove()
      }
      
      setTimeout(() => dot.remove(), 2000)
    }
    
    // 随机触发绘制挑战
    const triggerDrawingChallenge = () => {
      if (_0x5c1d('geometry-artist') || currentChallenge) return
      
      currentChallenge = challenges[Math.floor(Math.random() * challenges.length)]
      challengeStartTime = Date.now()
      
      showToast(`📐 书法挑战：请用鼠标书写"${currentChallenge}"两字！`, 'info')
      
      // 30秒后取消挑战
      setTimeout(() => {
        if (currentChallenge) {
          currentChallenge = null
          showToast('⏰ 绘制挑战超时，等待下次机会...', 'error')
        }
      }, 30000)
    }
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDrawing || !currentChallenge) return
      
      const now = Date.now()
      mouseTrail.push({ x: event.clientX, y: event.clientY, timestamp: now })
      
      // 创建轨迹视觉效果
      createTrailVisual(event.clientX, event.clientY)
      
      // 限制轨迹长度和时间范围（10秒内的轨迹）
      mouseTrail = mouseTrail.filter(point => now - point.timestamp < 10000).slice(-150)
      
      // 检查是否完成挑战
      if (mouseTrail.length > 40) {
        const shape = analyzeAdvancedShape(mouseTrail, currentChallenge)
        if (shape && shape === currentChallenge) {
          triggerCreativeEgg({
            type: 'title',
            title: '📐 今夕书法家',
            message: `太棒了！你在${((now - challengeStartTime) / 1000).toFixed(1)}秒内完美书写了"${shape}"！`,
            icon: '📐'
          }, 'geometry-artist')
          createGeometryEffect(shape)
          
          // 清理轨迹
          mouseTrail = []
          isDrawing = false
          currentChallenge = null
          trailVisuals.forEach(dot => dot.remove())
          trailVisuals = []
        }
      }
    }
    
    const handleMouseDown = (event: MouseEvent) => {
      if (currentChallenge) {
        isDrawing = true
        mouseTrail = []
        trailVisuals.forEach(dot => dot.remove())
        trailVisuals = []
      }
    }
    
    const handleMouseUp = () => {
      setTimeout(() => {
        isDrawing = false
      }, 500)
    }

    // 添加轨迹淡出动画
    if (!document.getElementById('trailFadeStyle')) {
      const style = document.createElement('style')
      style.id = 'trailFadeStyle'
      style.textContent = `
        @keyframes trailFade {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.3); }
        }
      `
      document.head.appendChild(style)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    
    // 45秒后随机触发绘制挑战
    const challengeTimer = setTimeout(triggerDrawingChallenge, 45000)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      clearTimeout(challengeTimer)
      trailVisuals.forEach(dot => dot.remove())
    }
  }, [])

  // 🎵 旋律作曲家彩蛋 - 键盘音乐序列
  useEffect(() => {
    let melodySequence: string[] = []
    let melodyTimer: NodeJS.Timeout | null = null
    
    const handleMelodyKeys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // 目标旋律：C-D-E-F-G (对应键盘 1-2-3-4-5)
      const musicKeys = ['1', '2', '3', '4', '5']
      
      if (musicKeys.includes(event.key)) {
        melodySequence.push(event.key)
        
        // 播放音符反馈
        playMelodyNote(event.key)
        
        if (melodyTimer) clearTimeout(melodyTimer)
        
        // 检查完整旋律
        if (melodySequence.join('') === '12345') {
          if (!_0x5c1d('melody-composer')) {
          triggerCreativeEgg({
            type: 'observation',
              title: '🎵 旋律作曲家',
              message: '你演奏了完美的五音阶！音乐的奥秘在你指尖绽放！',
              icon: '🎵'
            }, 'melody-composer')
            createMelodyEffect()
          }
          melodySequence = []
          return
        }
        
        // 5秒后重置序列
        melodyTimer = setTimeout(() => {
          melodySequence = []
        }, 5000)
        
        // 超过5个音符就重置
        if (melodySequence.length > 5) {
          melodySequence = []
        }
      }
    }

    document.addEventListener('keydown', handleMelodyKeys)
    return () => {
      document.removeEventListener('keydown', handleMelodyKeys)
      if (melodyTimer) clearTimeout(melodyTimer)
    }
  }, [])

  // 🧘 禅心大师彩蛋 - 静默等待的艺术
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout | null = null
    let lastActivity = Date.now()
    
    const resetInactivityTimer = () => {
      lastActivity = Date.now()
      if (inactivityTimer) clearTimeout(inactivityTimer)
      
      // 检查是否已经发现过这个彩蛋
      if (!_0x5c1d('patience-master')) {
        inactivityTimer = setTimeout(() => {
        triggerCreativeEgg({
            type: 'title',
            title: '🧘 禅心大师',
            message: '在静默中你找到了内心的平静。真正的智慧来自于等待。',
            icon: '🧘'
          }, 'patience-master')
          createZenEffect()
        }, 120000) // 2分钟静默
      }
    }
    
    const activities = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    
    activities.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true })
    })
    
    // 初始启动计时器
    resetInactivityTimer()
    
    return () => {
      activities.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer)
      })
      if (inactivityTimer) clearTimeout(inactivityTimer)
    }
  }, [])

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
    _0x9b2e(eggId)
    showToast(`${egg.icon} ${egg.title}：${egg.message}`, 'success')
    
    // 立即强制更新成就栏
    setForceProgressBarUpdate(prev => prev + 100)
    setSidebarForceVisible(true)
    
    // 额外的强制更新确保实时响应
    setTimeout(() => {
      setForceProgressBarUpdate(prev => prev + 50)
      setSidebarForceVisible(true)
    }, 50)
    
    // 再次确保更新
    setTimeout(() => {
      setForceProgressBarUpdate(prev => prev + 25)
    }, 200)
    
    // 根据彩蛋类型触发不同特效
    switch(egg.type) {
      case 'observation':
        // 根据具体的彩蛋ID决定特效
        if (eggId === 'time-explorer') {
          createJinXiBirthEffect()
        } else {
          createDetectiveEffect()
        }
        break
      case 'detective':
        createDetectiveEffect()
        break
      case 'invisible':
        createDiscoveryGlowEffect()
        break
      case 'title':
        createMagicSparkleEffect()
        break
      case 'scroll':
        createScrollStormEffect()
        break
      default:
        createSimpleParticleEffect()
    }
  }

  // 🎨 特效函数集合
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

  // 🎭 今夕传说觉醒特效 - 最壮观的终极效果
  const createLegendAwakeningEffect = () => {
    // 公会旗帜背景
    const guildBanner = document.createElement('div')
    guildBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(45deg, 
        rgba(138, 43, 226, 0.8) 0%, 
        rgba(30, 144, 255, 0.8) 25%,
        rgba(255, 215, 0, 0.8) 50%,
        rgba(220, 20, 60, 0.8) 75%,
        rgba(138, 43, 226, 0.8) 100%);
      z-index: 9997;
      pointer-events: none;
      animation: guildBanner 8s ease-in-out forwards;
    `
    document.body.appendChild(guildBanner)
    setTimeout(() => guildBanner.remove(), 8000)
    
    // 今夕理念文字飞舞
    const mottos = ['以战会友', '彼此成就', '今夕如梦', '友谊永恒', '荣耀征程']
    mottos.forEach((motto, index) => {
      const text = document.createElement('div')
      text.innerHTML = motto
      text.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: 4rem;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
        z-index: 9998;
        pointer-events: none;
        animation: mottoFloat 3s ease-out forwards;
        animation-delay: ${index * 800}ms;
        font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
      `
      document.body.appendChild(text)
      setTimeout(() => text.remove(), 4000)
    })
    
    // 战士群像环绕效果
    const warriors = ['⚔️', '🛡️', '🏹', '🗡️', '⚡', '🔥', '💫', '🌟']
    for (let i = 0; i < warriors.length; i++) {
      const warrior = document.createElement('div')
      warrior.innerHTML = warriors[i]
      const angle = (i / warriors.length) * 2 * Math.PI
      const radius = 200
      warrior.style.cssText = `
        position: fixed;
        top: calc(50% + ${Math.sin(angle) * radius}px);
        left: calc(50% + ${Math.cos(angle) * radius}px);
        font-size: 3rem;
        z-index: 9998;
        pointer-events: none;
        animation: warriorOrbit 6s linear infinite;
        animation-delay: ${i * 200}ms;
      `
      document.body.appendChild(warrior)
      setTimeout(() => warrior.remove(), 8000)
    }
    
    // 公会徽章绽放
    const emblem = document.createElement('div')
    emblem.innerHTML = '🏰'
    emblem.style.cssText = `
        position: fixed;
      top: 50%;
      left: 50%;
      font-size: 8rem;
      transform: translate(-50%, -50%);
        z-index: 9999;
        pointer-events: none;
      animation: emblemBloom 4s ease-out forwards;
      filter: drop-shadow(0 0 50px rgba(255, 215, 0, 0.8));
    `
    document.body.appendChild(emblem)
    setTimeout(() => emblem.remove(), 6000)
    
    if (!document.getElementById('guildEffectStyle')) {
      const style = document.createElement('style')
      style.id = 'guildEffectStyle'
      style.textContent = `
        @keyframes guildBanner {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes mottoFloat {
          0% { 
            transform: translate(-50%, -50%) scale(0) rotate(-180deg); 
            opacity: 0; 
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.5) rotate(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 600 - 300}px, ${Math.random() * 400 - 200}px) scale(0.5) rotate(180deg); 
            opacity: 0; 
          }
        }
        @keyframes warriorOrbit {
          0% { transform: rotate(0deg) translateX(200px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(200px) rotate(-360deg); }
        }
        @keyframes emblemBloom {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.5) rotate(180deg); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1.2) rotate(360deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(540deg); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }



  // 🔐 密码破译特效
  const createCipherBreakEffect = () => {
    const codes = ['01001000', '01100101', '01101100', '01110000', '01101111']
    for (let i = 0; i < codes.length; i++) {
      const code = document.createElement('div')
      code.innerHTML = codes[i]
      code.style.cssText = `
        position: fixed;
        top: ${20 + i * 15}%;
        left: ${10 + Math.random() * 80}%;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        font-size: 1.5rem;
        z-index: 9999;
        pointer-events: none;
        animation: cipherBreak 3s ease-out forwards;
        animation-delay: ${i * 200}ms;
      `
      document.body.appendChild(code)
      setTimeout(() => code.remove(), 3500)
    }
  }

  // 🎵 旋律特效
  const createMelodyEffect = () => {
    const notes = ['♪', '♫', '♬', '♩', '♭', '♯', '𝄞']
    for (let i = 0; i < 20; i++) {
      const note = document.createElement('div')
      note.innerHTML = notes[Math.floor(Math.random() * notes.length)]
      note.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 2 + 2}rem;
        color: hsl(${Math.random() * 360}, 70%, 60%);
        z-index: 9999;
        pointer-events: none;
        animation: melodyNote 4s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
      document.body.appendChild(note)
      setTimeout(() => note.remove(), 4500)
    }
  }

  // 📐 书法特效 - 专为"今夕"设计
  const createGeometryEffect = (shape: string) => {
    // 如果是"今夕"，使用汉字书法特效
    if (shape === '今夕') {
      const characters = ['今', '夕', '✍️', '📜', '🖋️', '🎋']
      
      for (let i = 0; i < 20; i++) {
        const char = document.createElement('div')
        char.innerHTML = characters[Math.floor(Math.random() * characters.length)]
        char.style.cssText = `
          position: fixed;
          top: ${Math.random() * 100}%;
          left: ${Math.random() * 100}%;
          font-size: ${Math.random() * 3 + 2}rem;
          color: hsl(${Math.random() * 60 + 20}, 80%, 70%);
          font-family: 'SimHei', 'Microsoft YaHei', serif;
          z-index: 9999;
          pointer-events: none;
          animation: calligraphyFloat 4s ease-out forwards;
          animation-delay: ${i * 100}ms;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        `
        document.body.appendChild(char)
        setTimeout(() => char.remove(), 4500)
      }
      
      // 添加书法特效动画
      if (!document.getElementById('calligraphyFloatStyle')) {
        const style = document.createElement('style')
        style.id = 'calligraphyFloatStyle'
        style.textContent = `
          @keyframes calligraphyFloat {
            0% { 
              opacity: 0; 
              transform: scale(0) rotate(-30deg); 
            }
            30% { 
              opacity: 1; 
              transform: scale(1.3) rotate(0deg); 
            }
            100% { 
              opacity: 0; 
              transform: scale(0.8) rotate(30deg) translateY(-100px); 
            }
          }
        `
        document.head.appendChild(style)
      }
    } else {
      // 原有的几何图形特效
    for (let i = 0; i < 15; i++) {
      const geom = document.createElement('div')
      geom.innerHTML = shape === '圆形' ? '○' : shape === '三角形' ? '△' : '⬟'
      geom.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 3 + 2}rem;
        color: hsl(${Math.random() * 360}, 80%, 70%);
        z-index: 9999;
        pointer-events: none;
        animation: geometryFloat 3s ease-out forwards;
        animation-delay: ${i * 150}ms;
      `
      document.body.appendChild(geom)
      setTimeout(() => geom.remove(), 3500)
      }
    }
  }

  // 🧘 禅意特效
  const createZenEffect = () => {
    const zenSymbols = ['☯', '🕯️', '🧘', '🌸', '🍃', '💆', '🙏']
    for (let i = 0; i < 12; i++) {
      const zen = document.createElement('div')
      zen.innerHTML = zenSymbols[Math.floor(Math.random() * zenSymbols.length)]
      zen.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: 3rem;
        z-index: 9999;
        pointer-events: none;
        animation: zenFloat 6s ease-in-out forwards;
        animation-delay: ${i * 500}ms;
      `
      document.body.appendChild(zen)
      setTimeout(() => zen.remove(), 7000)
    }
  }

  // 🗺️ 地图连接特效
  const createMapConnectionEffect = () => {
    // 中国地图连接特效
    const mapElements = ['🗺️', '🌏', '🤝', '💫', '⭐', '🌟', '🔗', '💝', '🏮', '🎋']
    
    // 主要的连接光束效果
    for (let i = 0; i < 15; i++) {
      const element = document.createElement('div')
      element.innerHTML = mapElements[Math.floor(Math.random() * mapElements.length)]
      element.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 3 + 2}rem;
        color: hsl(${Math.random() * 60 + 200}, 80%, 70%);
        z-index: 9999;
        pointer-events: none;
        animation: mapConnection 4s ease-out forwards;
        animation-delay: ${i * 150}ms;
        text-shadow: 0 0 15px rgba(135, 206, 235, 0.8);
      `
      
      document.body.appendChild(element)
      setTimeout(() => element.remove(), 4500)
    }
    
    // 连接线动画效果
    for (let i = 0; i < 8; i++) {
      const line = document.createElement('div')
      line.style.cssText = `
        position: fixed;
        top: ${20 + i * 10}%;
        left: 10%;
        width: 80%;
        height: 3px;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(135, 206, 235, 0.8), 
          rgba(255, 215, 0, 0.8), 
          rgba(135, 206, 235, 0.8), 
          transparent);
        z-index: 9998;
        pointer-events: none;
        animation: connectionPulse 2s ease-in-out forwards;
        animation-delay: ${i * 200}ms;
        border-radius: 2px;
      `
      
      document.body.appendChild(line)
      setTimeout(() => line.remove(), 3000)
    }
    
    // 添加动画样式
    if (!document.getElementById('mapConnectionStyle')) {
      const style = document.createElement('style')
      style.id = 'mapConnectionStyle'
      style.textContent = `
        @keyframes mapConnection {
          0% { 
            opacity: 0; 
            transform: scale(0) rotate(-90deg); 
          }
          30% { 
            opacity: 1; 
            transform: scale(1.5) rotate(0deg); 
          }
          100% { 
            opacity: 0; 
            transform: scale(0.8) rotate(90deg) translateY(-150px); 
          }
        }
        @keyframes connectionPulse {
          0% { 
            opacity: 0; 
            transform: scaleX(0); 
          }
          50% { 
            opacity: 1; 
            transform: scaleX(1); 
          }
          100% { 
            opacity: 0; 
            transform: scaleX(0.8); 
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  // 🗺️ 探索者特效
  const createExplorerEffect = () => {
    const treasures = ['💎', '🗝️', '🏺', '📜', '🧭', '🔍', '🗺️']
    for (let i = 0; i < treasures.length; i++) {
      const treasure = document.createElement('div')
      treasure.innerHTML = treasures[i]
      treasure.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: 4rem;
        z-index: 9999;
        pointer-events: none;
        animation: treasureReveal 3s ease-out forwards;
        animation-delay: ${i * 300}ms;
      `
      document.body.appendChild(treasure)
      setTimeout(() => treasure.remove(), 4000)
    }
  }

  // 🕵️ 侦探发现特效
  const createDetectiveEffect = () => {
    // 放大镜扫描效果
    const magnifier = document.createElement('div')
    magnifier.innerHTML = '🔍'
    magnifier.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      font-size: 8rem;
      z-index: 9999;
      pointer-events: none;
      animation: detectiveScan 4s ease-out forwards;
      transform: translate(-50%, -50%);
    `
    document.body.appendChild(magnifier)
    setTimeout(() => magnifier.remove(), 4000)
    
    // 线索发现动画
    const clues = ['🔍', '📝', '🧩', '💡', '🎯', '✨', '🏆']
    clues.forEach((clue, index) => {
      const element = document.createElement('div')
      element.innerHTML = clue
      element.style.cssText = `
        position: fixed;
        top: ${20 + index * 12}%;
        left: ${10 + Math.random() * 80}%;
        font-size: 3rem;
        z-index: 9999;
        pointer-events: none;
        animation: clueReveal 3s ease-out forwards;
        animation-delay: ${index * 400}ms;
      `
      document.body.appendChild(element)
      setTimeout(() => element.remove(), 4000)
    })
    
    // 侦探徽章闪耀
    const badge = document.createElement('div')
    badge.innerHTML = '🏅'
    badge.style.cssText = `
      position: fixed;
      top: 30%;
      right: 20%;
      font-size: 5rem;
      z-index: 9999;
      pointer-events: none;
      animation: badgeShine 3s ease-out forwards;
      filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
    `
    document.body.appendChild(badge)
    setTimeout(() => badge.remove(), 3000)
    
    if (!document.getElementById('detectiveEffectStyle')) {
      const style = document.createElement('style')
      style.id = 'detectiveEffectStyle'
      style.textContent = `
        @keyframes detectiveScan {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.5) rotate(180deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(360deg); opacity: 0; }
        }
        @keyframes clueReveal {
          0% { opacity: 0; transform: translateY(20px) scale(0); }
          50% { opacity: 1; transform: translateY(0) scale(1.2); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.8); }
        }
        @keyframes badgeShine {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.3) rotate(180deg); }
          100% { opacity: 0; transform: scale(1) rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }
  }

  // 🎵 音符播放反馈
  const playMelodyNote = (key: string) => {
    // 创建视觉音符反馈
    const note = document.createElement('div')
    const noteMap: { [key: string]: string } = {
      '1': '♪ Do',
      '2': '♫ Re', 
      '3': '♬ Mi',
      '4': '♩ Fa',
      '5': '♭ Sol'
    }
    note.innerHTML = noteMap[key] || '♪'
    note.style.cssText = `
        position: fixed;
      top: 70%;
      left: ${20 + parseInt(key) * 15}%;
        font-size: 2rem;
      color: hsl(${parseInt(key) * 60}, 80%, 60%);
        z-index: 9999;
        pointer-events: none;
      animation: notePlay 1s ease-out forwards;
    `
    document.body.appendChild(note)
    setTimeout(() => note.remove(), 1000)
  }

  // 📐 高级图形分析函数 - 支持"今夕"汉字识别（严格版本）
  const analyzeAdvancedShape = (points: { x: number, y: number, timestamp: number }[], targetShape: string): string | null => {
    if (points.length < 80) return null // 提高最低点数要求
    
    const coords = points.map(p => ({ x: p.x, y: p.y }))
    const bounds = {
      minX: Math.min(...coords.map(p => p.x)),
      maxX: Math.max(...coords.map(p => p.x)),
      minY: Math.min(...coords.map(p => p.y)),
      maxY: Math.max(...coords.map(p => p.y))
    }
    
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    const ratio = width / height
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    
    // 检测"今夕"汉字
    if (targetShape === '今夕') {
      // 汉字特征分析：
      let directionalChanges = 0
      let verticalStrokes = 0
      let horizontalStrokes = 0
      let crossingPoints = 0
      let sharpTurns = 0
      
      // 分析笔画方向（更严格的检测）
      for (let i = 8; i < coords.length - 8; i += 4) {
        if (i >= coords.length - 8) break
        
        const prev = coords[i - 8]
        const curr = coords[i]
        const next = coords[i + 8]
        
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
        const angleDiff = Math.abs(angle2 - angle1)
        
        // 检测方向变化（提高阈值）
        if (angleDiff > Math.PI / 4) { // 45度以上的转折
          directionalChanges++
        }
        
        // 检测尖锐转折（汉字的特征）
        if (angleDiff > Math.PI / 2) { // 90度以上的急转
          sharpTurns++
        }
        
        // 检测垂直笔画（更严格）
        if (Math.abs(Math.abs(angle1) - Math.PI / 2) < Math.PI / 8) {
          verticalStrokes++
        }
        
        // 检测水平笔画（更严格）
        if (Math.abs(angle1) < Math.PI / 8 || Math.abs(Math.abs(angle1) - Math.PI) < Math.PI / 8) {
          horizontalStrokes++
        }
      }
      
      // 检测轨迹交叉点（更严格的汉字特征）
      for (let i = 0; i < coords.length - 30; i += 15) {
        for (let j = i + 30; j < coords.length; j += 15) {
          const p1 = coords[i]
          const p2 = coords[j]
          const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
          
          // 如果两个距离较远的点很接近，可能是交叉
          if (distance < 15 && Math.abs(i - j) > 50) {
            crossingPoints++
          }
        }
      }
      
      // 检测左右结构（"今夕"是两个字的特征）
      const leftThird = bounds.minX + width * 0.33
      const rightThird = bounds.maxX - width * 0.33
      const leftPoints = coords.filter(p => p.x < leftThird)
      const rightPoints = coords.filter(p => p.x > rightThird)
      const middlePoints = coords.filter(p => p.x >= leftThird && p.x <= rightThird)
      
      const hasDefiniteTwoCharStructure = 
        leftPoints.length >= 20 && 
        rightPoints.length >= 20 && 
        middlePoints.length >= 10 && // 中间有连接部分
        ratio > 1.8 && ratio < 3.5 // 适合两个字的宽高比
      
      // 检测"今"字特征（左半部分）
      const leftBounds = {
        minX: Math.min(...leftPoints.map(p => p.x)),
        maxX: Math.max(...leftPoints.map(p => p.x)),
        minY: Math.min(...leftPoints.map(p => p.y)),
        maxY: Math.max(...leftPoints.map(p => p.y))
      }
      const leftWidth = leftBounds.maxX - leftBounds.minX
      const leftHeight = leftBounds.maxY - leftBounds.minY
      const leftRatio = leftWidth / leftHeight
      
      // 检测"夕"字特征（右半部分）
      const rightBounds = {
        minX: Math.min(...rightPoints.map(p => p.x)),
        maxX: Math.max(...rightPoints.map(p => p.x)),
        minY: Math.min(...rightPoints.map(p => p.y)),
        maxY: Math.max(...rightPoints.map(p => p.y))
      }
      const rightWidth = rightBounds.maxX - rightBounds.minX
      const rightHeight = rightBounds.maxY - rightBounds.minY
      const rightRatio = rightWidth / rightHeight
      
      const hasBothCharacterFeatures = 
        leftRatio > 0.4 && leftRatio < 1.5 && // "今"字比例
        rightRatio > 0.4 && rightRatio < 1.5 && // "夕"字比例
        leftWidth > 30 && leftHeight > 30 && // 最小尺寸
        rightWidth > 30 && rightHeight > 30
      
      // 严格的识别条件
      const strictChineseCharacterFeatures = 
        directionalChanges >= 12 && // 需要足够多的方向变化
        sharpTurns >= 4 && // 需要尖锐转折
        (verticalStrokes >= 8 && horizontalStrokes >= 8) && // 需要明显的横竖笔画
        crossingPoints >= 2 && // 需要多个交叉点
        width > 120 && height > 50 && // 更大的最小尺寸
        ratio > 1.8 && ratio < 3.2 && // 适合两字的比例
        coords.length >= 120 // 足够的复杂度
      
      // 最终验证：必须同时满足多个严格条件
      const isValidJinXi = 
        strictChineseCharacterFeatures &&
        hasDefiniteTwoCharStructure &&
        hasBothCharacterFeatures
      
      if (isValidJinXi) {
        return '今夕'
      }
    }
    
    return null
  }

  // 简化的图形分析函数（保留兼容性）
  const analyzeShape = (points: { x: number, y: number }[]): string | null => {
    const pointsWithTime = points.map(p => ({ ...p, timestamp: Date.now() }))
    return analyzeAdvancedShape(pointsWithTime, '今夕')
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

  // 🕰️ 时光探索特效函数集合
  const createTimeExplorationEffect = (stage: number) => {
    switch(stage) {
      case 1:
        createTimeTracesEffect()
        break
      case 2:
        createSummerHeatEffect()
        break
      case 3:
        createYear2018Effect()
        break
      case 4:
        createJinXiOriginEffect()
        break
    }
  }

  const createTimeTracesEffect = () => {
    // 第一阶段：时间痕迹特效
    const timeSymbols = ['⏰', '🕰️', '⌛', '⏳', '🌅', '🌇', '📅', '📆']
    
    for (let i = 0; i < 12; i++) {
      const trace = document.createElement('div')
      trace.innerHTML = timeSymbols[Math.floor(Math.random() * timeSymbols.length)]
      trace.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 2 + 1.5}rem;
        z-index: 9999;
        pointer-events: none;
        animation: timeTrace 4s ease-out forwards;
        animation-delay: ${i * 200}ms;
        color: rgba(255, 215, 0, 0.8);
      `
      document.body.appendChild(trace)
      setTimeout(() => trace.remove(), 5000)
    }
    
    if (!document.getElementById('timeTraceStyle')) {
      const style = document.createElement('style')
      style.id = 'timeTraceStyle'
      style.textContent = `
        @keyframes timeTrace {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          20% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg) translateY(-100px); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createHeatWaveElements = () => {
    // 创建酷暑元素，用户需要找到并点击
    const heatElements = [
      { emoji: '☀️', text: '烈日' },
      { emoji: '🌡️', text: '高温' },
      { emoji: '🔥', text: '炎热' }
    ]
    
    heatElements.forEach((element, index) => {
      const heatDiv = document.createElement('div')
      heatDiv.innerHTML = `${element.emoji}`
      heatDiv.title = element.text
      heatDiv.style.cssText = `
        position: fixed;
        top: ${20 + index * 30}%;
        right: ${10 + index * 5}%;
        font-size: 2rem;
        z-index: 9998;
        cursor: pointer;
        animation: heatPulse 2s infinite;
        filter: drop-shadow(0 0 10px rgba(255, 140, 0, 0.8));
      `
      heatDiv.setAttribute('data-heat-element', 'true')
      
      heatDiv.addEventListener('click', () => {
        if (explorationStage === 2) {
          heatDiv.style.animation = 'none'
          heatDiv.style.transform = 'scale(1.5)'
          setTimeout(() => heatDiv.remove(), 1000)
          
          const foundHeatElements = document.querySelectorAll('[data-heat-element]').length
          if (foundHeatElements <= 1) { // 最后一个元素
            showToast('🌞 酷暑的记忆已被唤醒...', 'info')
          }
        }
      })
      
      document.body.appendChild(heatDiv)
      
      // 30秒后自动消失
      setTimeout(() => {
        if (heatDiv.parentNode) heatDiv.remove()
      }, 30000)
    })
    
    if (!document.getElementById('heatPulseStyle')) {
      const style = document.createElement('style')
      style.id = 'heatPulseStyle'
      style.textContent = `
        @keyframes heatPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const create2018Elements = () => {
    // 创建2018年相关元素
    const yearNumbers = ['2', '0', '1', '8']
    
    yearNumbers.forEach((number, index) => {
      const numberDiv = document.createElement('div')
      numberDiv.innerHTML = number
      numberDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: ${20 + index * 15}%;
        font-size: 4rem;
        font-weight: bold;
        color: rgba(59, 130, 246, 0.8);
        z-index: 9998;
        cursor: pointer;
        animation: yearFloat 3s ease-in-out infinite;
        animation-delay: ${index * 0.5}s;
        text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      `
      numberDiv.setAttribute('data-year-element', number)
      
      numberDiv.addEventListener('click', () => {
        if (explorationStage === 3) {
          numberDiv.style.color = 'rgba(34, 197, 94, 1)'
          numberDiv.style.transform = 'scale(1.5) rotate(360deg)'
          
          const clickedNumbers = document.querySelectorAll('[data-year-element][style*="34, 197, 94"]').length
          if (clickedNumbers >= 4) {
            showToast('📅 2018年的秘密正在显现...', 'info')
          }
        }
      })
      
      document.body.appendChild(numberDiv)
      
      // 60秒后自动消失
      setTimeout(() => {
        if (numberDiv.parentNode) numberDiv.remove()
      }, 60000)
    })
    
    if (!document.getElementById('yearFloatStyle')) {
      const style = document.createElement('style')
      style.id = 'yearFloatStyle'
      style.textContent = `
        @keyframes yearFloat {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0px) rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createJinXiBirthEffect = () => {
    // 今夕诞生最终特效
    const birthSymbols = ['🌅', '✨', '🎊', '🎉', '💫', '⭐']
    
    for (let i = 0; i < 20; i++) {
      const birth = document.createElement('div')
      birth.innerHTML = birthSymbols[Math.floor(Math.random() * birthSymbols.length)]
      birth.style.cssText = `
        position: fixed;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        font-size: ${Math.random() * 3 + 2}rem;
        z-index: 9999;
        pointer-events: none;
        animation: birthCelebration 6s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
      document.body.appendChild(birth)
      setTimeout(() => birth.remove(), 7000)
    }
    
    // 创建今夕文字特效
    const jinxiText = document.createElement('div')
    jinxiText.innerHTML = '今夕'
    jinxiText.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 6rem;
      font-weight: bold;
      color: rgba(255, 215, 0, 1);
      z-index: 10000;
      pointer-events: none;
      animation: jinxiBirth 8s ease-in-out forwards;
      text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
    `
    document.body.appendChild(jinxiText)
    setTimeout(() => jinxiText.remove(), 8000)
    
    if (!document.getElementById('birthEffectStyle')) {
      const style = document.createElement('style')
      style.id = 'birthEffectStyle'
      style.textContent = `
        @keyframes birthCelebration {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          20% { opacity: 1; transform: scale(1.5) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.3) rotate(720deg) translateY(-300px); }
        }
        @keyframes jinxiBirth {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createSummerHeatEffect = () => {
    // 夏日炎热背景特效
    const heatBackground = document.createElement('div')
    heatBackground.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, 
        rgba(255, 140, 0, 0.1) 0%, 
        rgba(255, 69, 0, 0.05) 50%, 
        transparent 100%);
      z-index: 9997;
      pointer-events: none;
      animation: heatWave 4s ease-in-out forwards;
    `
    document.body.appendChild(heatBackground)
    setTimeout(() => heatBackground.remove(), 4000)
    
    if (!document.getElementById('heatWaveStyle')) {
      const style = document.createElement('style')
      style.id = 'heatWaveStyle'
      style.textContent = `
        @keyframes heatWave {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createYear2018Effect = () => {
    // 2018年时代背景特效
    const year2018 = document.createElement('div')
    year2018.innerHTML = '2018'
    year2018.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8rem;
      font-weight: bold;
      color: rgba(59, 130, 246, 0.3);
      z-index: 9997;
      pointer-events: none;
      animation: year2018Appear 5s ease-in-out forwards;
      text-shadow: 0 0 50px rgba(59, 130, 246, 0.5);
    `
    document.body.appendChild(year2018)
    setTimeout(() => year2018.remove(), 5000)
    
    if (!document.getElementById('year2018Style')) {
      const style = document.createElement('style')
      style.id = 'year2018Style'
      style.textContent = `
        @keyframes year2018Appear {
          0% { opacity: 0; transform: translateX(-50%) scale(0); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.2); }
          100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
      `
      document.head.appendChild(style)
    }
  }

  const createJinXiOriginEffect = () => {
    // 今夕起源故事特效
    const storyElements = [
      '🌅 那个酷暑难耐的夏天',
      '💡 一个想法悄然诞生',
      '🤝 志同道合的伙伴相聚',
      '🌟 今夕公会正式成立'
    ]
    
    storyElements.forEach((story, index) => {
      setTimeout(() => {
        const storyDiv = document.createElement('div')
        storyDiv.innerHTML = story
        storyDiv.style.cssText = `
          position: fixed;
          top: ${30 + index * 10}%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.9);
          z-index: 10000;
          pointer-events: none;
          animation: storyUnfold 3s ease-in-out forwards;
          text-align: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 10px 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        `
        document.body.appendChild(storyDiv)
        setTimeout(() => storyDiv.remove(), 4000)
      }, index * 1000)
    })
    
    if (!document.getElementById('storyUnfoldStyle')) {
      const style = document.createElement('style')
      style.id = 'storyUnfoldStyle'
      style.textContent = `
        @keyframes storyUnfold {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0px); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
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

  // 🗺️ 留言墙头像触发地图彩蛋机制（严格版本）
  useEffect(() => {
    let lastClickTime = 0
    let clickCount = 0
    const DEBOUNCE_TIME = 1000 // 1秒防抖
    const REQUIRED_CLICKS = 3 // 需要连续点击3次
    
    const handleAvatarClick = (event: Event) => {
      const target = event.target as HTMLElement
      const currentTime = Date.now()
      
      // 防抖检查
      if (currentTime - lastClickTime > DEBOUNCE_TIME) {
        clickCount = 0
      }
      lastClickTime = currentTime
      
      // 检测是否已经发现过这个彩蛋
      if (_0x5c1d('legend-awakener')) {
        return
      }
      
      // 更严格的头像检测
      const isValidAvatar = (
        // 方式1：具有avatar相关的CSS类
        (target.classList.contains('avatar') || 
         target.classList.contains('user-avatar') ||
         target.classList.contains('message-avatar') ||
         target.classList.contains('profile-image')) ||
        
        // 方式2：img标签且src包含avatar相关关键词
        (target.tagName === 'IMG' && target.getAttribute('src') && 
         (target.getAttribute('src')!.includes('avatar') || 
          target.getAttribute('src')!.includes('profile') ||
          target.getAttribute('src')!.includes('user'))) ||
        
        // 方式3：具有特定的圆形样式且尺寸合适
        (target.style.borderRadius && 
         (target.style.borderRadius.includes('50%') || target.style.borderRadius.includes('circle')) &&
         target.getBoundingClientRect().width >= 32 && 
         target.getBoundingClientRect().width <= 64)
      )
      
      // 检测是否在置顶消息区域
      const pinnedMessage = target.closest('.pinned-message') || 
                           target.closest('.pinned') ||
                           target.closest('[data-pinned="true"]') ||
                           target.closest('.highlight-message')
      
      // 检测是否有管理员或特殊标识
      const hasSpecialIdentifier = (
        pinnedMessage && (
          pinnedMessage.textContent?.includes('管理员') ||
          pinnedMessage.textContent?.includes('置顶') ||
          pinnedMessage.querySelector('.admin-badge') ||
          pinnedMessage.querySelector('.pinned-badge') ||
          pinnedMessage.classList.contains('admin-message')
        )
      )
      
      const isValidTrigger = isValidAvatar && pinnedMessage && hasSpecialIdentifier
      
      if (isValidTrigger) {
        clickCount++
        
        if (clickCount === 1) {
          // 第一次点击，显示提示
          const hint = document.createElement('div')
          hint.textContent = '🗺️ 再点击2次以发现隐藏地图...'
          hint.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
          `
          document.body.appendChild(hint)
          setTimeout(() => hint.remove(), 2000)
        } else if (clickCount === 2) {
          // 第二次点击，继续提示
          const hint = document.createElement('div')
          hint.textContent = '🗺️ 最后一次点击...'
          hint.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 165, 0, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
          `
          document.body.appendChild(hint)
          setTimeout(() => hint.remove(), 1500)
        } else if (clickCount >= REQUIRED_CLICKS) {
          // 第三次点击，触发彩蛋
          event.preventDefault()
          event.stopPropagation()
          clickCount = 0 // 重置计数
          _0x8a4c()
        }
      } else {
        // 无效点击，重置计数
        clickCount = 0
      }
    }
    
    // 监听所有点击事件
    document.addEventListener('click', handleAvatarClick, true)
    
    return () => {
      document.removeEventListener('click', handleAvatarClick, true)
    }
  }, [])

  // 🗺️ 隐秘探索者彩蛋 - 发现隐藏区域
  useEffect(() => {
    let hiddenArea: HTMLDivElement | null = null
    
    const createHiddenArea = () => {
      if (hiddenArea || _0x5c1d('explorer')) return
      
      hiddenArea = document.createElement('div')
      hiddenArea.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 30px;
        height: 30px;
        background: transparent;
        cursor: pointer;
        z-index: 999999;
        border: 1px solid transparent;
        transition: all 0.3s ease;
      `
      
      hiddenArea.addEventListener('mouseenter', () => {
        if (hiddenArea) {
          hiddenArea.style.background = 'rgba(255, 215, 0, 0.1)'
          hiddenArea.style.border = '1px solid rgba(255, 215, 0, 0.3)'
        }
      })
      
      hiddenArea.addEventListener('mouseleave', () => {
        if (hiddenArea) {
          hiddenArea.style.background = 'transparent'
          hiddenArea.style.border = '1px solid transparent'
        }
      })
      
      hiddenArea.addEventListener('click', () => {
        if (!_0x5c1d('explorer')) {
          triggerCreativeEgg({
            type: 'invisible',
            title: '🗺️ 隐秘探索者',
            message: '你发现了隐藏在视野边缘的秘密区域！真正的探索者永远好奇！',
            icon: '🗺️'
          }, 'explorer')
          createExplorerEffect()
        }
        if (hiddenArea) {
          hiddenArea.remove()
          hiddenArea = null
        }
      })
      
      document.body.appendChild(hiddenArea)
    }
    
    // 页面加载10秒后创建隐藏区域
    const timer = setTimeout(createHiddenArea, 10000)
    
    return () => {
      clearTimeout(timer)
      if (hiddenArea) {
        hiddenArea.remove()
    }
    }
  }, [])

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
          {showCreativeEgg.type === 'detective' && (
            <div className="text-xs text-yellow-300 mb-4 bg-black/30 p-3 rounded-lg">
              🔍 观察力 +100 | 🧠 智力 +50 | 🏆 侦探等级提升
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

    // 强制重新渲染的state
    const [localForceUpdate, setLocalForceUpdate] = useState(0)

    // 响应forceProgressBarUpdate的变化
    useEffect(() => {
      setLocalForceUpdate(prev => prev + 1)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 成就栏强制更新触发:', { forceProgressBarUpdate, discoveredCount, totalCount })
      }
    }, [forceProgressBarUpdate, easterEggRecords, discoveredCount])

    // 定期检查和强制更新成就栏（确保实时性）
    useEffect(() => {
      const interval = setInterval(() => {
        // 检查是否有新的已发现彩蛋
        const currentDiscoveredCount = easterEggRecords.filter(egg => egg.discovered).length
        if (currentDiscoveredCount !== discoveredCount) {
          setLocalForceUpdate(prev => prev + 1)
          if (process.env.NODE_ENV === 'development') {
            console.log('⏰ 定期检查发现成就变化，强制更新成就栏')
          }
        }
      }, 2000) // 每2秒检查一次

      return () => clearInterval(interval)
    }, [discoveredCount, easterEggRecords])

    // 检测是否在全屏状态 - 加强检测
    const isInFullscreen = document.fullscreenElement !== null || 
                          (document as any).webkitFullscreenElement !== null ||
                          (document as any).mozFullScreenElement !== null ||
                          (document as any).msFullscreenElement !== null

    // 调试信息（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 侧边栏数据:', { 
        discoveredCount, 
        totalCount, 
        progress: progress.toFixed(1),
        forceUpdate: localForceUpdate,
        recordsLength: easterEggRecords.length
      })
    }

    // 强制显示：除非明确设置为不可见，否则总是显示
    if (!sidebarForceVisible) return null

    return (
      <div 
        ref={sidebarRef}
        className={`achievement-sidebar force-visible fixed right-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
          sidebarExpanded ? 'w-80' : 'w-16'
        } ${isInFullscreen ? 'fullscreen-mode' : ''}`}
        style={{ 
          zIndex: isInFullscreen ? 2147483647 : 9999999, // 使用最高的z-index值
          pointerEvents: 'auto',
          position: 'fixed',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'block !important',
          visibility: 'visible',
          opacity: '1 !important'
        }}
        data-testid="achievement-sidebar"
        data-force-visible="true"
      >
        {/* 折叠状态的小按钮 */}
        {!sidebarExpanded && (
          <div 
            className="bg-gradient-to-b from-purple-900/90 to-blue-900/90 backdrop-blur-sm border-l border-t border-b border-white/20 rounded-l-xl p-3 cursor-pointer hover:from-purple-800/90 hover:to-blue-800/90 transition-all duration-300 shadow-lg"
            title={`${currentAchievement?.name || '探索者'} - ${discoveredCount}/${totalCount} 彩蛋已发现 (${progress.toFixed(0)}%)`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSidebarExpanded(true)
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-xl animate-pulse">{currentAchievement?.icon || '🥉'}</div>
              <div className="text-white text-xs font-medium text-center">
                <div>{discoveredCount}</div>
                <div className="text-white/60">/</div>
                <div>{totalCount}</div>
              </div>
              <div className="w-2 h-8 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-gradient-to-t from-yellow-400 to-orange-400 transition-all duration-1000"
                  style={{ height: `${progress}%` }}
                  key={`progress-mini-${localForceUpdate}-${discoveredCount}`}
                />
              </div>
              {/* 等级名称提示 */}
              <div className="text-white/60 text-[10px] font-medium truncate max-w-12 text-center">
                {currentAchievement?.name?.slice(0, 3) || '探索'}
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
                  key={`progress-full-${localForceUpdate}-${discoveredCount}`}
                />
              </div>
              <div className="text-white/60 text-xs mt-1">
                {progress.toFixed(0)}% 完成
              </div>
            </div>

            {/* 最近发现的彩蛋 - 只显示图标 */}
            <div className="mb-4">
              <div className="text-white/80 text-sm mb-2">最新发现</div>
              <div className="flex items-center gap-1 flex-wrap">
                {easterEggRecords
                  .filter(egg => egg.discovered)
                  .slice(-3)
                  .reverse()
                  .map(egg => (
                    <div 
                      key={egg.id} 
                      className="text-xl hover:scale-110 transition-transform cursor-pointer"
                      title={`${egg.name} - ${egg.discoveredAt || '已发现'}`}
                    >
                      {egg.icon}
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
                  <div className={`text-2xl ${egg.discovered ? '' : 'opacity-50'}`}>
                    {egg.discovered ? egg.icon : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${egg.discovered ? 'text-white' : 'text-white/60'}`}>
                      {egg.discovered ? egg.name : '***彩蛋'}
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
          visibility: visible;
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
          z-index: 2147483647 !important;
          position: fixed !important;
          display: block !important;
          visibility: visible;
          opacity: 1 !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          pointer-events: auto !important;
        }
        
        /* 防止被其他元素覆盖 */
        .achievement-sidebar * {
          pointer-events: auto !important;
        }
        
        /* 确保在视频全屏时也可见 */
        video:fullscreen ~ .achievement-sidebar,
        video:-webkit-full-screen ~ .achievement-sidebar,
        video:-moz-full-screen ~ .achievement-sidebar {
          z-index: 2147483647 !important;
          display: block !important;
          visibility: visible;
          position: fixed !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        
        /* 全局强制显示 - 最高优先级 */
        .achievement-sidebar[data-force-visible="true"] {
          z-index: 2147483647 !important;
          display: block !important;
          visibility: visible;
          position: fixed !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        
        /* 对所有全屏元素下的侧边栏强制显示 */
        *:fullscreen .achievement-sidebar,
        *:-webkit-full-screen .achievement-sidebar,
        *:-moz-full-screen .achievement-sidebar,
        *:-ms-fullscreen .achievement-sidebar {
          z-index: 2147483647 !important;
          display: block !important;
          visibility: visible;
          position: fixed !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
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
          ;(sidebar as HTMLElement).style.cssText += `
            display: block !important;
            visibility: visible;
            opacity: 1 !important;
            position: fixed !important;
            z-index: 2147483647 !important;
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
        
        // 立即强制显示
        sidebarElement.style.cssText = `
          display: block !important;
          visibility: visible;
          opacity: 1 !important;
          position: fixed !important;
          z-index: 999999999 !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          pointer-events: auto !important;
        `
        
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
            visibility: visible;
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

  // 🗺️ 地图连接挑战界面组件
  const MapChallengeInterface = () => {
    if (!showMapChallenge) return null

    return (
      <div className="fixed inset-0 flex items-center justify-center transition-opacity duration-1000 bg-black/80 backdrop-blur-sm" style={{ zIndex: 999997 }}>
        <div className="relative w-full max-w-4xl mx-4 h-[80vh]">
          {/* 地图背景 */}
          <div className="relative w-full h-full bg-gradient-to-br from-blue-900/20 to-green-900/20 rounded-2xl border border-white/20 backdrop-blur-sm overflow-hidden">
            {/* 地图标题 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                🗺️ 今夕伙伴连接图
              </h2>
              <p className="text-white/80 text-sm text-center">
                点击头像连接全国各地的今夕伙伴 ({mapConnections.length}/5+ 连接)
              </p>
            </div>
            
            {/* 中国地图轮廓 */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path 
                  d="M20,30 Q30,25 40,30 Q50,20 65,25 Q80,30 85,45 Q80,55 85,65 Q80,75 70,80 Q60,85 50,80 Q40,85 30,75 Q25,65 20,55 Q15,45 20,30 Z" 
                  fill="none" 
                  stroke="rgba(135, 206, 235, 0.3)" 
                  strokeWidth="1"
                />
              </svg>
            </div>
            
            {/* 头像位置点 */}
            {mapAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  selectedAvatar === avatar.id 
                    ? 'scale-125 animate-pulse' 
                    : 'hover:scale-110'
                }`}
                style={{ 
                  left: `${avatar.x}%`, 
                  top: `${avatar.y}%`,
                }}
                onClick={() => handleAvatarClick(avatar.id)}
                title={`${avatar.region} - 点击连接`}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg border-2 transition-all ${
                  selectedAvatar === avatar.id 
                    ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
                    : 'border-white/30 hover:border-white/60'
                }`}>
                  {avatar.avatar}
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/80 whitespace-nowrap">
                  {avatar.region}
                </div>
              </div>
            ))}
            
            {/* 连接线 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {mapConnections.map((connection, index) => {
                const fromAvatar = mapAvatars.find(a => a.id === connection.from)
                const toAvatar = mapAvatars.find(a => a.id === connection.to)
                if (!fromAvatar || !toAvatar) return null
                
                return (
                  <line
                    key={index}
                    x1={`${fromAvatar.x}%`}
                    y1={`${fromAvatar.y}%`}
                    x2={`${toAvatar.x}%`}
                    y2={`${toAvatar.y}%`}
                    stroke="rgba(255, 215, 0, 0.8)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                  />
                )
              })}
            </svg>
            
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowMapChallenge(false)
                setMapConnections([])
                setSelectedAvatar(null)
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              ✕
            </button>
            
            {/* 进度提示 */}
            {mapConnections.length >= 3 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-500/80 text-white px-4 py-2 rounded-lg text-sm animate-bounce">
                  很好！继续连接更多伙伴...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 🕰️ 时光探索界面组件
  const TimeExplorationInterface = () => {
    if (!showExplorationInterface || explorationStage < 4) return null

    return (
      <div className="fixed inset-0 flex items-center justify-center transition-opacity duration-1000 bg-gradient-to-br from-orange-900/80 via-yellow-900/80 to-red-900/80 backdrop-blur-sm" style={{ zIndex: 999998 }}>
        <div className="relative w-full max-w-5xl mx-4 h-[90vh] overflow-hidden">
          {/* 时光探索背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-800/30 via-orange-800/30 to-red-800/30 rounded-3xl backdrop-blur-md border border-yellow-400/30"></div>
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setShowExplorationInterface(false)}
            className="absolute top-6 right-6 z-50 w-10 h-10 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            ✕
          </button>
          
          {/* 主要内容 */}
          <div className="relative z-10 h-full p-8 overflow-y-auto">
            {/* 标题 */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-yellow-300 mb-2">🕰️ 时光探索之旅</h2>
              <p className="text-xl text-yellow-100">今夕公会·2018年酷暑创建史</p>
            </div>
            
            {/* 线索进度 */}
            <div className="bg-black/40 rounded-2xl p-6 mb-8">
              <h3 className="text-2xl font-bold text-yellow-300 mb-4">🔍 发现的线索</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {explorationClues.map((clue, index) => (
                  <div key={index} className="bg-gradient-to-br from-yellow-600/30 to-orange-600/30 rounded-xl p-4 border border-yellow-400/30">
                    <div className="text-lg">{clue}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 今夕创建故事 */}
            <div className="bg-black/40 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-yellow-300 mb-6">📖 今夕创建传说</h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 rounded-xl p-6 border-l-4 border-yellow-400">
                  <h4 className="text-xl font-bold text-yellow-300 mb-3">🌅 2018年·酷暑初现</h4>
                  <p className="text-yellow-100 leading-relaxed">
                    那是一个异常炎热的夏天，酷暑难耐。在这样的环境中，一群怀着共同理想的朋友开始思考：
                    如何在这个快节奏的世界中，创造一个属于我们的精神家园？
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-600/20 to-red-600/20 rounded-xl p-6 border-l-4 border-yellow-400">
                  <h4 className="text-xl font-bold text-yellow-300 mb-3">💡 灵感火花</h4>
                  <p className="text-yellow-100 leading-relaxed">
                    "今夕何夕，见此良人"——这句古诗成为了灵感的源泉。今夕，不仅代表着当下这个美好的时刻，
                    更象征着我们相遇相知的珍贵缘分。就在那个酷暑难耐的午后，今夕公会的雏形悄然诞生。
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-xl p-6 border-l-4 border-yellow-400">
                  <h4 className="text-xl font-bold text-yellow-300 mb-3">🤝 伙伴相聚</h4>
                  <p className="text-yellow-100 leading-relaxed">
                    志同道合的朋友们开始聚集，大家带着对未来的憧憬和对友谊的珍视，
                    决定共同打造一个温暖的公会家园。每个人都贡献着自己的想法和力量。
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 rounded-xl p-6 border-l-4 border-yellow-400">
                  <h4 className="text-xl font-bold text-yellow-300 mb-3">🌟 今夕诞生</h4>
                  <p className="text-yellow-100 leading-relaxed">
                    2018年的那个酷暑，今夕公会正式成立了。从此，这里成为了朋友们的精神港湾，
                    承载着"以战会友，彼此成就"的美好理念，见证着每一个温暖的今夕时刻。
                  </p>
                </div>
              </div>
              
              {/* 庆祝按钮 */}
              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    createJinXiBirthEffect()
                    setTimeout(() => setShowExplorationInterface(false), 3000)
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  🎉 庆祝今夕诞生
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {children}
      

      
      {/* 创意彩蛋展示 */}
      <CreativeEasterEggDisplay />
      
      {/* 等级升级通知 */}
      <LevelUpNotification />
      
      {/* 地图连接挑战界面 */}
      <MapChallengeInterface />
      
      {/* 时光探索界面 */}
      <TimeExplorationInterface />
      
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
      
      {/* 加密的系统数据 */}
      <div style={{ display: 'none' }} data-sys-info={encryptData('system-metadata')}>
        {(() => {
          const _0x1f2e = encryptData('探索系统已加载')
          return process.env.NODE_ENV === 'development' ? `<!--${_0x1f2e}-->` : null
        })()}
      </div>
    </div>
  )
}
