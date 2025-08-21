"use client"

import { useState, useEffect } from 'react'
import { trackEvent } from './baidu-analytics'

interface VisitCounterProps {
  className?: string
  showDetail?: boolean
}

interface VisitStats {
  todayVisits: number
  totalVisits: number
  onlineUsers: number
  lastUpdate: string
}

const VisitCounter: React.FC<VisitCounterProps> = ({ 
  className = "",
  showDetail = false 
}) => {
  const [stats, setStats] = useState<VisitStats>({
    todayVisits: 0,
    totalVisits: 0,
    onlineUsers: 1,
    lastUpdate: new Date().toLocaleString('zh-CN')
  })
  
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 从本地存储获取访问统计
    const getStoredStats = (): VisitStats => {
      if (typeof window === 'undefined') return stats

      const storedData = localStorage.getItem('jinxi-visit-stats')
      const today = new Date().toDateString()
      
      if (storedData) {
        const parsed = JSON.parse(storedData)
        // 检查是否是新的一天
        if (parsed.date !== today) {
          // 新的一天，重置今日访问量
          return {
            todayVisits: 1,
            totalVisits: parsed.totalVisits + 1,
            onlineUsers: Math.floor(Math.random() * 5) + 1, // 模拟在线用户数
            lastUpdate: new Date().toLocaleString('zh-CN')
          }
        } else {
          // 同一天，增加访问量
          return {
            todayVisits: parsed.todayVisits + 1,
            totalVisits: parsed.totalVisits + 1,
            onlineUsers: Math.floor(Math.random() * 5) + 1,
            lastUpdate: new Date().toLocaleString('zh-CN')
          }
        }
      } else {
        // 首次访问
        return {
          todayVisits: 1,
          totalVisits: 1,
          onlineUsers: 1,
          lastUpdate: new Date().toLocaleString('zh-CN')
        }
      }
    }

    // 更新统计数据
    const newStats = getStoredStats()
    setStats(newStats)
    setIsVisible(true)

    // 存储到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem('jinxi-visit-stats', JSON.stringify({
        ...newStats,
        date: new Date().toDateString()
      }))
    }

    // 追踪页面访问事件
    trackEvent('page', 'visit', window.location.pathname)

    // 定期更新在线用户数（模拟）
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        onlineUsers: Math.floor(Math.random() * 8) + 1,
        lastUpdate: new Date().toLocaleString('zh-CN')
      }))
    }, 30000) // 每30秒更新一次

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}w`
    }
    return num.toLocaleString()
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#e1eafc'
      }}
    >
      <span className="text-green-400">●</span>
      
      {showDetail ? (
        <div className="flex items-center gap-4">
          <span>今日访问: <strong className="text-blue-300">{formatNumber(stats.todayVisits)}</strong></span>
          <span>总访问: <strong className="text-yellow-300">{formatNumber(stats.totalVisits)}</strong></span>
          <span>在线: <strong className="text-green-300">{stats.onlineUsers}</strong></span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span>访问量:</span>
          <strong className="text-blue-300">{formatNumber(stats.totalVisits)}</strong>
          <span className="text-green-300 ml-2">({stats.onlineUsers}人在线)</span>
        </div>
      )}
    </div>
  )
}

export default VisitCounter
