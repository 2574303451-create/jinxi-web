"use client"

import { useEffect, useState } from 'react'

interface BusuanziCounterProps {
  className?: string
  showDetail?: boolean
}

// 不蒜子访问统计组件（备用方案）
const BusuanziCounter: React.FC<BusuanziCounterProps> = ({ 
  className = "",
  showDetail = false 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // 只在生产环境加载不蒜子
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
      return
    }

    // 加载不蒜子统计脚本
    const loadBusuanzi = () => {
      // 检查是否已经加载过
      if (document.getElementById('busuanzi-script')) {
        setIsLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.id = 'busuanzi-script'
      script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
      script.async = true
      
      script.onload = () => {
        console.log('✅ 不蒜子统计已加载')
        setIsLoaded(true)
        
        // 等待数据加载
        setTimeout(() => {
          const siteUvElement = document.getElementById('busuanzi_value_site_uv')
          const sitePvElement = document.getElementById('busuanzi_value_site_pv')
          
          if (siteUvElement && sitePvElement) {
            console.log('✅ 不蒜子数据已更新')
          }
        }, 2000)
      }
      
      script.onerror = () => {
        console.warn('❌ 不蒜子统计加载失败')
        setError(true)
      }
      
      document.head.appendChild(script)
    }

    // 延迟加载以优化性能
    const timer = setTimeout(loadBusuanzi, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // 如果不是生产环境或加载失败，显示占位符
  if (!isLoaded || error || typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e1eafc'
        }}
      >
        <span className="text-yellow-400">●</span>
        <span>访问统计加载中...</span>
      </div>
    )
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
          <span>
            访客: <strong className="text-blue-300" id="busuanzi_value_site_uv">-</strong>
          </span>
          <span>
            浏览: <strong className="text-yellow-300" id="busuanzi_value_site_pv">-</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span>总访问:</span>
          <strong className="text-blue-300" id="busuanzi_value_site_pv">-</strong>
          <span className="text-green-300 ml-2">
            (访客: <span id="busuanzi_value_site_uv">-</span>)
          </span>
        </div>
      )}
      
      {/* 隐藏的不蒜子元素 */}
      <div style={{ display: 'none' }}>
        <span id="busuanzi_container_site_pv">
          本站总访问量<span id="busuanzi_value_site_pv"></span>次
        </span>
        <span id="busuanzi_container_site_uv">
          本站访客数<span id="busuanzi_value_site_uv"></span>人次
        </span>
      </div>
    </div>
  )
}

export default BusuanziCounter
