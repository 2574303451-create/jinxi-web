"use client"

import { useEffect } from 'react'

interface BaiduAnalyticsProps {
  siteId?: string
  enabled?: boolean
}

declare global {
  interface Window {
    _hmt: any[]
    hm: HTMLScriptElement
  }
}

const BaiduAnalytics: React.FC<BaiduAnalyticsProps> = ({ 
  siteId = process.env.NEXT_PUBLIC_BAIDU_ANALYTICS_ID || '您的百度统计站点ID',
  enabled = true 
}) => {
  useEffect(() => {
    // 仅在生产环境和浏览器环境中启用统计
    if (!enabled || typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return
    }

    // 初始化百度统计
    const initBaiduAnalytics = () => {
      // 初始化统计队列
      window._hmt = window._hmt || []
      
      // 创建统计脚本
      const script = document.createElement('script')
      script.src = `https://hm.baidu.com/hm.js?${siteId}`
      script.async = true
      script.defer = true
      
      // 添加错误处理
      script.onerror = () => {
        console.warn('百度统计加载失败')
      }
      
      // 插入脚本
      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript)
      }
    }

    // 延迟加载统计脚本以优化性能
    const timer = setTimeout(initBaiduAnalytics, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [siteId, enabled])

  return null // 这是一个无UI组件
}

// 手动追踪页面浏览
export const trackPageView = (pageUrl?: string) => {
  if (typeof window !== 'undefined' && window._hmt) {
    window._hmt.push(['_trackPageview', pageUrl || window.location.pathname])
  }
}

// 追踪自定义事件
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window._hmt) {
    window._hmt.push(['_trackEvent', category, action, label, value])
  }
}

// 追踪网站搜索
export const trackSiteSearch = (keyword: string, category?: string) => {
  if (typeof window !== 'undefined' && window._hmt) {
    window._hmt.push(['_trackEvent', 'search', keyword, category])
  }
}

export default BaiduAnalytics
