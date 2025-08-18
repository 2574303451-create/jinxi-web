"use client"

import { useEffect, useState } from 'react'

export default function MouseFollower() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [cursorType, setCursorType] = useState('default')

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // 检测元素类型并设置相应的鼠标样式
      if (target.matches('button, a, [role="button"], input[type="submit"], input[type="button"], .cursor-pointer, .hover-effect')) {
        setCursorType('pointer')
      } else if (target.matches('input[type="text"], input[type="email"], input[type="password"], textarea, [contenteditable]')) {
        setCursorType('text')
      } else if (target.matches('.loading')) {
        setCursorType('loading')
      } else if (target.matches('.carousel-3d .carousel-stage:not(:active)')) {
        setCursorType('grab')
      } else if (target.matches('.carousel-3d .carousel-stage:active')) {
        setCursorType('grabbing')
      } else {
        setCursorType('default')
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.matches('.carousel-3d .carousel-stage, .draggable')) {
        setCursorType('grabbing')
      }
    }

    const handleMouseUp = () => {
      setCursorType('default')
    }

    // 添加事件监听器
    document.addEventListener('mousemove', updateMousePosition)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', updateMousePosition)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div
      className={`mouse-follower ${cursorType}`}
      style={{
        left: mousePosition.x,
        top: mousePosition.y,
      }}
    />
  )
}
