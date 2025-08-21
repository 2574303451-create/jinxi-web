"use client"

import { useEffect, useState } from 'react'

interface BusuanziCounterProps {
  className?: string
  showDetail?: boolean
}

// 不蒜子访问统计组件
const BusuanziCounter: React.FC<BusuanziCounterProps> = ({ 
  className = "",
  showDetail = false 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // 检查是否为开发环境 - 更精确的检测逻辑
    const isDev = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.includes('127.0.0.1') ||
       (window.location.port && ['3000', '3001', '8080', '8000', '5000'].includes(window.location.port)))

    if (typeof window === 'undefined') {
      return
    }

    if (isDev) {
      console.log('🔧 开发环境，跳过不蒜子加载')
      return
    }

    console.log('🚀 生产环境，开始加载不蒜子统计...')

    // 加载不蒜子统计脚本
    const loadBusuanzi = () => {
      // 检查是否已经加载过
      if (document.getElementById('busuanzi-script')) {
        setIsLoaded(true)
        checkDataReady()
        return
      }

      const script = document.createElement('script')
      script.id = 'busuanzi-script'
      script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
      script.async = true
      
      script.onload = () => {
        console.log('✅ 不蒜子统计脚本已加载')
        setIsLoaded(true)
        checkDataReady()
      }
      
      script.onerror = () => {
        console.warn('❌ 不蒜子统计加载失败，尝试重试...')
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1)
          setTimeout(loadBusuanzi, 2000 * (retryCount + 1)) // 递增延迟重试
        } else {
          setError(true)
        }
      }
      
      document.head.appendChild(script)
    }

    // 检查数据是否准备就绪并同步到显示元素
    const checkDataReady = () => {
      let checkCount = 0
      const maxChecks = 20 // 最多检查20次（20秒）
      
      const dataChecker = setInterval(() => {
        const siteUvElement = document.getElementById('busuanzi_value_site_uv')
        const sitePvElement = document.getElementById('busuanzi_value_site_pv')
        
        checkCount++
        
        if (siteUvElement && sitePvElement && 
            siteUvElement.textContent && siteUvElement.textContent !== '' && siteUvElement.textContent !== '0' &&
            sitePvElement.textContent && sitePvElement.textContent !== '' && sitePvElement.textContent !== '0') {
          
          // 同步数据到显示元素
          syncDataToDisplay(siteUvElement.textContent, sitePvElement.textContent)
          
          console.log('✅ 不蒜子数据已就绪:', {
            uv: siteUvElement.textContent,
            pv: sitePvElement.textContent
          })
          setDataReady(true)
          clearInterval(dataChecker)
        } else if (checkCount >= maxChecks) {
          console.warn('⚠️ 不蒜子数据检查超时', {
            uv: siteUvElement?.textContent || 'null',
            pv: sitePvElement?.textContent || 'null',
            uvElement: !!siteUvElement,
            pvElement: !!sitePvElement
          })
          setDataReady(true) // 即使数据未准备好，也停止加载状态
          clearInterval(dataChecker)
        }
      }, 1000)
    }

    // 同步数据到显示元素
    const syncDataToDisplay = (uvValue: string, pvValue: string) => {
      const displayUvElements = document.querySelectorAll('.busuanzi-display-uv')
      const displayPvElements = document.querySelectorAll('.busuanzi-display-pv')
      
      displayUvElements.forEach(el => {
        el.textContent = uvValue
      })
      
      displayPvElements.forEach(el => {
        el.textContent = pvValue
      })
    }

    // 延迟加载以优化性能
    const timer = setTimeout(loadBusuanzi, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [retryCount])

  // 开发环境显示占位符 - 更精确的检测逻辑
  const isDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('127.0.0.1') ||
     (window.location.port && ['3000', '3001', '8080', '8000', '5000'].includes(window.location.port)))

  if (isDev) {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e1eafc'
        }}
      >
        <span className="text-blue-400">●</span>
        <span>开发环境 (访问统计已禁用)</span>
      </div>
    )
  }

  // 如果加载失败，显示错误状态
  if (error) {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e1eafc'
        }}
      >
        <span className="text-red-400">●</span>
        <span>访问统计加载失败</span>
      </div>
    )
  }

  // 如果还在加载中
  if (!isLoaded || !dataReady) {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e1eafc'
        }}
      >
        <span className="text-yellow-400 animate-pulse">●</span>
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
            访客: <strong className="text-blue-300 busuanzi-display-uv">-</strong>
          </span>
          <span>
            浏览: <strong className="text-yellow-300 busuanzi-display-pv">-</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span>总访问:</span>
          <strong className="text-blue-300 busuanzi-display-pv">-</strong>
          <span className="text-green-300 ml-2">
            (访客: <span className="busuanzi-display-uv">-</span>)
          </span>
        </div>
      )}
      
      {/* 不蒜子统计元素 */}
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
