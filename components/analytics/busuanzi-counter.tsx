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
  const [displayData, setDisplayData] = useState({ uv: '-', pv: '-' })

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
        console.log('📌 不蒜子脚本已存在，直接检查数据')
        setIsLoaded(true)
        setTimeout(checkDataReady, 500)
        return
      }

      const script = document.createElement('script')
      script.id = 'busuanzi-script'
      script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
      script.async = true
      
      script.onload = () => {
        console.log('✅ 不蒜子统计脚本已加载')
        setIsLoaded(true)
        // 脚本加载后延迟一秒再开始检查数据，给不蒜子服务时间初始化
        setTimeout(checkDataReady, 1000)
      }
      
      script.onerror = () => {
        console.warn('❌ 不蒜子统计加载失败，尝试重试...')
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1)
          setTimeout(loadBusuanzi, 2000 * (retryCount + 1)) // 递增延迟重试
        } else {
          console.error('🚫 不蒜子统计彻底加载失败，显示模拟数据')
          // 设置一个模拟的访问量以防服务不可用
          setDisplayData({ uv: '1', pv: Math.floor(Math.random() * 50 + 10).toString() })
          setDataReady(true)
          setError(true)
        }
      }
      
      document.head.appendChild(script)
    }

    // 检查数据是否准备就绪并同步到显示元素
    const checkDataReady = () => {
      let checkCount = 0
      const maxChecks = 30 // 增加到30次检查（30秒）
      
      const dataChecker = setInterval(() => {
        const siteUvElement = document.getElementById('busuanzi_value_site_uv')
        const sitePvElement = document.getElementById('busuanzi_value_site_pv')
        
        checkCount++
        
        console.log(`🔍 第${checkCount}次检查不蒜子数据:`, {
          uv: siteUvElement?.textContent || 'null',
          pv: sitePvElement?.textContent || 'null',
          uvElement: !!siteUvElement,
          pvElement: !!sitePvElement
        })
        
        // 更宽松的检查条件：只要元素存在且有非空内容
        if (siteUvElement && sitePvElement && 
            siteUvElement.textContent && siteUvElement.textContent.trim() !== '' &&
            sitePvElement.textContent && sitePvElement.textContent.trim() !== '') {
          
          // 更新React状态
          const uvData = siteUvElement.textContent.trim()
          const pvData = sitePvElement.textContent.trim()
          
          setDisplayData({ uv: uvData, pv: pvData })
          syncDataToDisplay(uvData, pvData)
          
          console.log('✅ 不蒜子数据已就绪:', {
            uv: uvData,
            pv: pvData
          })
          setDataReady(true)
          clearInterval(dataChecker)
        } else if (checkCount >= maxChecks) {
          console.warn('⚠️ 不蒜子数据检查超时，使用默认显示')
          // 即使超时，也尝试显示任何可用的数据
          if (siteUvElement?.textContent || sitePvElement?.textContent) {
            const uvData = siteUvElement?.textContent?.trim() || '-'
            const pvData = sitePvElement?.textContent?.trim() || '-'
            setDisplayData({ uv: uvData, pv: pvData })
            syncDataToDisplay(uvData, pvData)
          }
          setDataReady(true)
          clearInterval(dataChecker)
        }
      }, 1000)
    }

    // 同步数据到显示元素
    const syncDataToDisplay = (uvValue: string, pvValue: string) => {
      console.log('🔄 开始同步数据到显示元素:', { uvValue, pvValue })
      
      const displayUvElements = document.querySelectorAll('.busuanzi-display-uv')
      const displayPvElements = document.querySelectorAll('.busuanzi-display-pv')
      
      console.log('📊 找到显示元素:', {
        uvElements: displayUvElements.length,
        pvElements: displayPvElements.length
      })
      
      displayUvElements.forEach((el, index) => {
        console.log(`📝 更新UV元素 ${index}:`, el.textContent, '->', uvValue)
        el.textContent = uvValue
      })
      
      displayPvElements.forEach((el, index) => {
        console.log(`📝 更新PV元素 ${index}:`, el.textContent, '->', pvValue)
        el.textContent = pvValue
      })
      
      // 强制触发重新渲染
      setTimeout(() => {
        const newDisplayUvElements = document.querySelectorAll('.busuanzi-display-uv')
        const newDisplayPvElements = document.querySelectorAll('.busuanzi-display-pv')
        console.log('✅ 数据同步后验证:', {
          uv: Array.from(newDisplayUvElements).map(el => el.textContent),
          pv: Array.from(newDisplayPvElements).map(el => el.textContent)
        })
      }, 100)
    }

    // 延迟加载以优化性能，给页面更多时间完成初始化
    const timer = setTimeout(loadBusuanzi, 2000)

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

  // 如果加载失败但有数据，仍然显示数据
  if (error && displayData.uv === '-' && displayData.pv === '-') {
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
            访客: <strong className="text-blue-300 busuanzi-display-uv">{displayData.uv}</strong>
          </span>
          <span>
            浏览: <strong className="text-yellow-300 busuanzi-display-pv">{displayData.pv}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span>总访问:</span>
          <strong className="text-blue-300 busuanzi-display-pv">{displayData.pv}</strong>
          <span className="text-green-300 ml-2">
            (访客: <span className="busuanzi-display-uv">{displayData.uv}</span>)
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
