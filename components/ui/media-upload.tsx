"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"
import { 
  MediaFile, 
  MediaFileType,
  STRATEGY_CONFIG,
  isValidFileType,
  isValidFileSize,
  formatFileSize,
  generateMediaFileId,
  isImageFile,
  isVideoFile
} from "../../types/strategy-wall"

interface MediaUploadProps {
  mediaFiles: MediaFile[]
  onMediaFilesChange: (files: MediaFile[]) => void
  className?: string
}

export function MediaUpload({ mediaFiles, onMediaFilesChange, className }: MediaUploadProps) {
  const [isUrlMode, setIsUrlMode] = useState(true)
  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [selectedType, setSelectedType] = useState<MediaFileType>('image')
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 添加URL媒体文件
  const addUrlMediaFile = () => {
    setErrors([])
    
    if (!urlInput.trim()) {
      setErrors(['请输入文件URL'])
      return
    }
    
    if (!titleInput.trim()) {
      setErrors(['请输入文件标题'])
      return
    }
    
    if (mediaFiles.length >= STRATEGY_CONFIG.MAX_MEDIA_FILES) {
      setErrors([`最多只能添加${STRATEGY_CONFIG.MAX_MEDIA_FILES}个文件`])
      return
    }

    const newFile: MediaFile = {
      id: generateMediaFileId(selectedType),
      type: selectedType,
      url: urlInput.trim(),
      title: titleInput.trim(),
      description: descriptionInput.trim() || undefined
    }

    onMediaFilesChange([...mediaFiles, newFile])
    
    // 重置表单
    setUrlInput('')
    setTitleInput('')
    setDescriptionInput('')
  }

  // 处理本地文件上传
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    
    setErrors([])
    const newErrors: string[] = []
    const newMediaFiles: MediaFile[] = []

    Array.from(files).forEach((file) => {
      if (mediaFiles.length + newMediaFiles.length >= STRATEGY_CONFIG.MAX_MEDIA_FILES) {
        newErrors.push(`最多只能添加${STRATEGY_CONFIG.MAX_MEDIA_FILES}个文件`)
        return
      }

      const isImage = isImageFile(file)
      const isVideo = isVideoFile(file)
      
      if (!isImage && !isVideo) {
        newErrors.push(`不支持的文件类型: ${file.name}`)
        return
      }

      const fileType: MediaFileType = isImage ? 'image' : 'video'
      
      if (!isValidFileType(file, fileType)) {
        newErrors.push(`不支持的${fileType === 'image' ? '图片' : '视频'}格式: ${file.name}`)
        return
      }

      if (!isValidFileSize(file, fileType)) {
        const maxSize = fileType === 'image' 
          ? STRATEGY_CONFIG.MAX_IMAGE_SIZE 
          : STRATEGY_CONFIG.MAX_VIDEO_SIZE
        newErrors.push(`文件过大: ${file.name} (最大${formatFileSize(maxSize)})`)
        return
      }

      // 创建预览URL
      const previewUrl = URL.createObjectURL(file)
      
      const mediaFile: MediaFile = {
        id: generateMediaFileId(fileType),
        type: fileType,
        url: previewUrl,
        title: file.name.split('.')[0],
        description: undefined,
        size: file.size
      }

      newMediaFiles.push(mediaFile)
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
    }

    if (newMediaFiles.length > 0) {
      onMediaFilesChange([...mediaFiles, ...newMediaFiles])
    }
  }

  // 删除媒体文件
  const removeMediaFile = (id: string) => {
    const updatedFiles = mediaFiles.filter(file => file.id !== id)
    onMediaFilesChange(updatedFiles)
  }

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 模式切换 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsUrlMode(true)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2",
            isUrlMode 
              ? "bg-blue-500 text-white" 
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          <i className="ri-link"></i>
          URL链接
        </button>
        <button
          onClick={() => setIsUrlMode(false)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2",
            !isUrlMode 
              ? "bg-blue-500 text-white" 
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          <i className="ri-upload-2-line"></i>
          本地上传
        </button>
      </div>

      {/* 错误提示 */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
        >
          {errors.map((error, index) => (
            <div key={index} className="text-red-200 text-sm flex items-center gap-2">
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          ))}
        </motion.div>
      )}

      {/* URL上传模式 */}
      {isUrlMode ? (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h4 className="text-white font-medium mb-4">通过URL添加媒体文件</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 文件类型选择 */}
            <div>
              <label className="block text-white/80 text-sm mb-2">文件类型</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as MediaFileType)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
              >
                <option value="image">图片</option>
                <option value="video">视频</option>
              </select>
            </div>

            {/* 文件标题 */}
            <div>
              <label className="block text-white/80 text-sm mb-2">文件标题 *</label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="请输入文件标题"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* URL输入 */}
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">文件URL *</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={selectedType === 'image' ? '请输入图片URL' : '请输入视频URL'}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 描述 */}
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">文件描述 (可选)</label>
            <input
              type="text"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="请输入文件描述"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
            />
          </div>

          <button
            onClick={addUrlMediaFile}
            disabled={mediaFiles.length >= STRATEGY_CONFIG.MAX_MEDIA_FILES}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <i className="ri-add-line"></i>
            添加文件
          </button>
        </div>
      ) : (
        /* 本地上传模式 */
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h4 className="text-white font-medium mb-4">上传本地文件</h4>
          
          {/* 拖拽上传区域 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
              dragOver
                ? "border-blue-400 bg-blue-500/10"
                : "border-white/20 hover:border-white/40"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-2">
              <i className="ri-upload-cloud-2-line text-4xl text-white/60"></i>
              <div className="text-white/80">
                拖拽文件到此处，或点击选择文件
              </div>
              <div className="text-white/60 text-sm">
                支持图片: jpg, png, gif, webp (最大{formatFileSize(STRATEGY_CONFIG.MAX_IMAGE_SIZE)})
                <br />
                支持视频: mp4, webm, mov, avi (最大{formatFileSize(STRATEGY_CONFIG.MAX_VIDEO_SIZE)})
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={[...STRATEGY_CONFIG.ALLOWED_IMAGE_TYPES, ...STRATEGY_CONFIG.ALLOWED_VIDEO_TYPES].join(',')}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* 文件列表 */}
      {mediaFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">
              已添加的文件 ({mediaFiles.length}/{STRATEGY_CONFIG.MAX_MEDIA_FILES})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {mediaFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-start gap-3">
                    {/* 文件预览 */}
                    <div className="flex-shrink-0">
                      {file.type === 'image' ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                          <img 
                            src={file.url} 
                            alt={file.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = '<i class="ri-image-line text-white/60 text-2xl"></i>'
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                          <i className="ri-video-line text-white/60 text-2xl"></i>
                        </div>
                      )}
                    </div>

                    {/* 文件信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium truncate">
                            {file.title}
                          </div>
                          <div className="text-white/60 text-sm">
                            {file.type === 'image' ? '图片' : '视频'}
                            {file.size && ` • ${formatFileSize(file.size)}`}
                          </div>
                          {file.description && (
                            <div className="text-white/50 text-xs mt-1 truncate">
                              {file.description}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeMediaFile(file.id)}
                          className="ml-2 p-1 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-blue-200 text-sm space-y-1">
          <div className="font-medium flex items-center gap-2 mb-2">
            <i className="ri-information-line"></i>
            使用说明
          </div>
          <div>• <strong>URL模式</strong>：适合使用已上传到图床或视频网站的文件</div>
          <div>• <strong>本地上传</strong>：仅用于预览，实际部署需要配置文件存储服务</div>
          <div>• 图片支持：JPG、PNG、GIF、WebP格式，最大10MB</div>
          <div>• 视频支持：MP4、WebM、MOV、AVI格式，最大100MB</div>
          <div>• 最多可添加{STRATEGY_CONFIG.MAX_MEDIA_FILES}个文件</div>
        </div>
      </div>
    </div>
  )
}
