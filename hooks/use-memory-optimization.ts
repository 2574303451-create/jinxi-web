"use client"

import { useEffect, useCallback, useRef } from 'react'

interface MemoryStats {
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
}

interface PerformanceMemory extends Performance {
  memory?: MemoryStats
}

// 内存优化钩子
export function useMemoryOptimization() {
  const cleanupCallbacks = useRef<(() => void)[]>([])
  const intervalId = useRef<NodeJS.Timeout | null>(null)

  // 获取内存使用情况
  const getMemoryUsage = useCallback((): MemoryStats | null => {
    const performance = globalThis.performance as PerformanceMemory
    if (performance?.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      }
    }
    return null
  }, [])

  // 强制垃圾回收（仅在开发模式下）
  const forceGarbageCollection = useCallback(() => {
    if (process.env.NODE_ENV === 'development' && 'gc' in globalThis) {
      try {
        // @ts-ignore
        globalThis.gc?.()
      } catch (error) {
        console.warn('无法执行垃圾回收:', error)
      }
    }
  }, [])

  // 清理图片缓存
  const clearImageCache = useCallback(() => {
    // 清理不再使用的图片元素
    const images = document.querySelectorAll('img[data-cleanup="true"]')
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        img.src = ''
        img.remove()
      }
    })
  }, [])

  // 清理事件监听器
  const cleanupEventListeners = useCallback(() => {
    cleanupCallbacks.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.warn('清理事件监听器时出错:', error)
      }
    })
    cleanupCallbacks.current = []
  }, [])

  // 注册清理回调
  const registerCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback)
  }, [])

  // 内存监控
  const startMemoryMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return

    intervalId.current = setInterval(() => {
      const memoryUsage = getMemoryUsage()
      if (memoryUsage && memoryUsage.usedJSHeapSize) {
        const usedMB = Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round((memoryUsage.totalJSHeapSize || 0) / 1024 / 1024)
        
        // 如果内存使用超过150MB，进行清理
        if (usedMB > 150) {
          console.warn(`内存使用较高: ${usedMB}MB/${totalMB}MB，正在执行清理...`)
          clearImageCache()
          forceGarbageCollection()
        }
      }
    }, 30000) // 每30秒检查一次
  }, [getMemoryUsage, clearImageCache, forceGarbageCollection])

  // 停止内存监控
  const stopMemoryMonitoring = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current)
      intervalId.current = null
    }
  }, [])

  // 页面可见性变化时的优化
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      // 页面隐藏时执行清理
      clearImageCache()
      forceGarbageCollection()
    }
  }, [clearImageCache, forceGarbageCollection])

  // 初始化
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 开始监控
    startMemoryMonitoring()

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 监听页面卸载
    const handleBeforeUnload = () => {
      cleanupEventListeners()
      clearImageCache()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      stopMemoryMonitoring()
      cleanupEventListeners()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [startMemoryMonitoring, stopMemoryMonitoring, handleVisibilityChange, cleanupEventListeners, clearImageCache])

  return {
    getMemoryUsage,
    forceGarbageCollection,
    clearImageCache,
    registerCleanup,
    startMemoryMonitoring,
    stopMemoryMonitoring
  }
}

// 图片懒加载钩子
export function useImageLazyLoading() {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const imageRefs = useRef<Set<HTMLImageElement>>(new Set())

  const observeImage = useCallback((img: HTMLImageElement) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              const dataSrc = img.dataset.src
              if (dataSrc) {
                img.src = dataSrc
                img.removeAttribute('data-src')
                observerRef.current?.unobserve(img)
                imageRefs.current.delete(img)
              }
            }
          })
        },
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      )
    }

    imageRefs.current.add(img)
    observerRef.current.observe(img)
  }, [])

  const unobserveImage = useCallback((img: HTMLImageElement) => {
    if (observerRef.current) {
      observerRef.current.unobserve(img)
      imageRefs.current.delete(img)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      imageRefs.current.clear()
    }
  }, [])

  return { observeImage, unobserveImage }
}

// 组件卸载清理钩子
export function useComponentCleanup() {
  const cleanupCallbacks = useRef<(() => void)[]>([])

  const addCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback)
  }, [])

  useEffect(() => {
    return () => {
      cleanupCallbacks.current.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.warn('组件清理时出错:', error)
        }
      })
    }
  }, [])

  return { addCleanup }
}
