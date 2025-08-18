"use client"

import { useEffect, useState } from 'react'

export default function TechCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [cursorState, setCursorState] = useState('default')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let animationFrame: number

    const updateCursorPosition = (e: MouseEvent) => {
      animationFrame = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY })
        if (!isVisible) setIsVisible(true)
      })
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    // 检测鼠标悬停的元素类型
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // 检测可点击元素
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.getAttribute('role') === 'button' ||
        target.classList.contains('cursor-pointer') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      ) {
        setCursorState('pointer')
      }
      // 检测文本输入元素
      else if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        setCursorState('text')
      }
      // 检测拖拽元素
      else if (
        target.classList.contains('cursor-grab') ||
        target.closest('.carousel-3d') ||
        target.closest('.draggable')
      ) {
        setCursorState('grab')
      }
      // 检测加载状态
      else if (
        target.classList.contains('loading') ||
        target.closest('.loading')
      ) {
        setCursorState('loading')
      }
      // 默认状态
      else {
        setCursorState('default')
      }
    }

    // 检测拖拽状态
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.classList.contains('cursor-grab') ||
        target.closest('.carousel-3d') ||
        target.closest('.draggable')
      ) {
        setCursorState('grabbing')
      }
    }

    const handleMouseUp = () => {
      if (cursorState === 'grabbing') {
        setCursorState('grab')
      }
    }

    // 添加事件监听器
    document.addEventListener('mousemove', updateCursorPosition)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      document.removeEventListener('mousemove', updateCursorPosition)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isVisible, cursorState])

  if (!isVisible) return null

  return (
    <>
      {/* 主指针 */}
      <div
        className={`tech-cursor ${cursorState}`}
        style={{
          left: position.x,
          top: position.y,
        }}
      />
      
      {/* 外环指示器 */}
      <div
        className={`tech-cursor-ring ${cursorState}`}
        style={{
          left: position.x,
          top: position.y,
        }}
      />
    </>
  )
}
