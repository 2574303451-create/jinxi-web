"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MediaFile } from "@/types/strategy-wall"
import { Modal } from "@/components/ui/modal"

interface MediaGalleryProps {
  mediaFiles: MediaFile[]
  className?: string
}

export function MediaGallery({ mediaFiles, className }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!mediaFiles || mediaFiles.length === 0) {
    return null
  }

  const handleMediaClick = (media: MediaFile) => {
    setSelectedMedia(media)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedMedia(null)
  }

  const images = mediaFiles.filter(file => file.type === 'image')
  const videos = mediaFiles.filter(file => file.type === 'video')

  return (
    <div className={cn("space-y-6", className)}>
      {/* 图片展示 */}
      {images.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-image-line text-blue-400"></i>
            相关图片 ({images.length})
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group cursor-pointer"
                onClick={() => handleMediaClick(image)}
              >
                <div className="relative rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200">
                  <div className="aspect-video relative">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-white/5">
                              <i class="ri-image-line text-white/40 text-4xl"></i>
                            </div>
                          `
                        }
                      }}
                    />
                    
                    {/* 悬停遮罩 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <i className="ri-zoom-in-line text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
                    </div>
                  </div>
                  
                  {/* 标题 */}
                  <div className="p-3">
                    <div className="font-medium text-white text-sm truncate">
                      {image.title}
                    </div>
                    {image.description && (
                      <div className="text-white/60 text-xs mt-1 truncate">
                        {image.description}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 视频展示 */}
      {videos.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-video-line text-green-400"></i>
            相关视频 ({videos.length})
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-200"
              >
                <div className="aspect-video rounded-lg overflow-hidden bg-black mb-3">
                  <video
                    src={video.url}
                    poster={video.thumbnail}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                  >
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <i className="ri-video-line text-white/40 text-4xl"></i>
                    </div>
                  </video>
                </div>
                
                <div>
                  <div className="font-medium text-white mb-1">
                    {video.title}
                  </div>
                  {video.description && (
                    <div className="text-white/70 text-sm mb-2">
                      {video.description}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-white/50 text-sm">
                    {video.duration && (
                      <span className="flex items-center gap-1">
                        <i className="ri-time-line"></i>
                        {video.duration}
                      </span>
                    )}
                    <button
                      onClick={() => handleMediaClick(video)}
                      className="flex items-center gap-1 hover:text-green-400 transition-colors"
                    >
                      <i className="ri-fullscreen-line"></i>
                      全屏播放
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 媒体预览弹窗 */}
      <Modal isOpen={isModalOpen} onClose={closeModal} size="large">
        {selectedMedia && (
          <div className="bg-black/90 p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedMedia.title}</h3>
                {selectedMedia.description && (
                  <p className="text-white/70 mt-1">{selectedMedia.description}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="flex justify-center">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  poster={selectedMedia.thumbnail}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-lg"
                >
                  您的浏览器不支持视频播放。
                </video>
              )}
            </div>

            {selectedMedia.type === 'video' && selectedMedia.duration && (
              <div className="text-center mt-4 text-white/60">
                <i className="ri-time-line mr-1"></i>
                时长: {selectedMedia.duration}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
