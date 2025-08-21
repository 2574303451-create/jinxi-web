"use client"

import Image from 'next/image'
import { useState, memo, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  quality?: number
  loading?: 'lazy' | 'eager'
  onClick?: () => void
  unoptimized?: boolean
}

// 创建优化的图片组件，使用memo减少不必要的重新渲染
export const OptimizedImage = memo(forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    width = 400,
    height = 400,
    className,
    priority = false,
    placeholder = 'empty',
    blurDataURL,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    quality = 75, // 降低默认质量以减少内存占用
    loading = 'lazy',
    onClick,
    unoptimized = false,
    ...props
  }, ref) => {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    // 生成简单的模糊占位符
    const generateBlurDataURL = () => {
      if (blurDataURL) return blurDataURL
      return `data:image/svg+xml;base64,${Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="14">
            加载中...
          </text>
        </svg>`
      ).toString('base64')}`
    }

    if (hasError) {
      return (
        <div 
          className={cn(
            "flex items-center justify-center bg-gray-100 text-gray-400 text-sm",
            className
          )}
          style={{ width, height }}
        >
          图片加载失败
        </div>
      )
    }

    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          ref={ref}
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={generateBlurDataURL()}
          sizes={sizes}
          quality={quality}
          loading={loading}
          unoptimized={unoptimized}
          className={cn(
            "transition-all duration-300",
            isLoading && "scale-110 blur-sm",
            !isLoading && "scale-100 blur-0",
            onClick && "cursor-pointer hover:scale-105"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true)
            setIsLoading(false)
          }}
          onClick={onClick}
          {...props}
        />
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    )
  }
))

OptimizedImage.displayName = 'OptimizedImage'

// 专门用于头像的组件，进一步优化
export const AvatarImage = memo(({ 
  src, 
  alt, 
  size = 40,
  className,
  fallbackText,
  ...props 
}: {
  src: string
  alt: string
  size?: number
  className?: string
  fallbackText?: string
} & Omit<OptimizedImageProps, 'width' | 'height'>) => {
  const [hasError, setHasError] = useState(false)

  if (hasError && fallbackText) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold rounded-full",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackText.slice(-2)}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      quality={60} // 头像使用更低质量
      className={cn("rounded-full object-cover", className)}
      sizes={`${size}px`}
      onError={() => setHasError(true)}
      {...props}
    />
  )
})

AvatarImage.displayName = 'AvatarImage'
