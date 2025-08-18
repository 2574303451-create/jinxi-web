"use client"

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void
  maxImages?: number
  maxSize?: number // MB
  className?: string
}

export function ImageUpload({ 
  onImagesChange, 
  maxImages = 3, 
  maxSize = 5,
  className 
}: ImageUploadProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    setError('')

    // 验证文件
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setError('只能上传图片文件')
        return
      }
      if (file.size > maxSize * 1024 * 1024) {
        setError(`图片大小不能超过 ${maxSize}MB`)
        return
      }
    }

    // 检查总数量
    if (selectedImages.length + fileArray.length > maxImages) {
      setError(`最多只能上传 ${maxImages} 张图片`)
      return
    }

    // 添加新图片
    const newImages = [...selectedImages, ...fileArray]
    setSelectedImages(newImages)
    onImagesChange(newImages)

    // 生成预览
    const newPreviews = [...previews]
    fileArray.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string)
          setPreviews([...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    
    setSelectedImages(newImages)
    setPreviews(newPreviews)
    onImagesChange(newImages)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 上传区域 */}
      <div
        className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-white/40 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        <div className="space-y-2">
          <div className="text-white/60">
            <i className="ri-image-add-line text-2xl"></i>
          </div>
          <div className="text-sm text-white/80">
            点击或拖拽上传图片
          </div>
          <div className="text-xs text-white/50">
            支持 JPG、PNG，最多 {maxImages} 张，单张不超过 {maxSize}MB
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* 图片预览 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`预览 ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-white/20"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(index)
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
