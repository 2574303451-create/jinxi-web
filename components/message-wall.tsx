"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MessageWallPost, CreatePostData } from "@/types/message-wall"
import { messageWallService } from "@/services/message-wall-service"
import { ImageUpload } from "@/components/ui/image-upload"
import { useToast } from "@/components/ui/toast"

export function MessageWall({ className }: { className?: string }) {
  const [posts, setPosts] = useState<MessageWallPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    author: '',
    content: '',
    images: [] as File[]
  })
  const toast = useToast()

  // 生成用户ID（用于点赞功能）
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('jinxi-user-id')
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('jinxi-user-id', id)
      }
      return id
    }
    return 'anonymous'
  })

  // 加载留言数据
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await messageWallService.getPosts()
        setPosts(data)
      } catch (error) {
        console.error('加载留言失败:', error)
        toast.addToast('加载留言失败', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()

    // 订阅数据变化
    const unsubscribe = messageWallService.subscribe((updatedPosts) => {
      setPosts(updatedPosts)
    })

    return unsubscribe
  }, [toast])

  // 提交新留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.author.trim() || !formData.content.trim()) {
      toast.addToast('请填写昵称和留言内容', 'error')
      return
    }

    setIsSubmitting(true)
    
    try {
      const postData: CreatePostData = {
        author: formData.author,
        content: formData.content,
        images: formData.images.length > 0 ? formData.images : undefined,
        avatar: `/placeholder-user.jpg` // 可以根据昵称生成不同头像
      }

      await messageWallService.createPost(postData)
      
      // 清空表单
      setFormData({
        author: formData.author, // 保留昵称
        content: '',
        images: []
      })
      
      toast.addToast('留言发布成功！', 'success')
    } catch (error) {
      console.error('发布失败:', error)
      toast.addToast('发布失败，请重试', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 点赞/取消点赞
  const handleLike = async (postId: string) => {
    try {
      await messageWallService.toggleLike(postId, userId)
    } catch (error) {
      console.error('点赞失败:', error)
      toast.addToast('操作失败，请重试', 'error')
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return "刚刚"
  }

  // 渲染图片
  const renderImages = (images?: string[]) => {
    if (!images || images.length === 0) return null

    return (
      <div className={cn(
        "grid gap-2 mt-3 rounded-xl overflow-hidden",
        images.length === 1 ? "grid-cols-1" : 
        images.length === 2 ? "grid-cols-2" : 
        "grid-cols-3"
      )}>
        {images.map((imageId, index) => {
          const imageData = messageWallService.getImageData(imageId)
          if (!imageData) return null

          return (
            <div key={imageId} className="relative group">
              <img
                src={imageData}
                alt={`图片 ${index + 1}`}
                className={cn(
                  "w-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform border border-white/20",
                  images.length === 1 ? "h-64" : "h-24"
                )}
                onClick={() => {
                  // 图片预览功能
                  const img = new Image()
                  img.src = imageData
                  const w = window.open("", "_blank")
                  if (w) {
                    w.document.write(`
                      <html>
                        <head><title>图片预览</title></head>
                        <body style="margin:0;padding:20px;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                          <img src="${imageData}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                        </body>
                      </html>
                    `)
                    w.document.close()
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <i className="ri-eye-line text-white text-xl"></i>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <section id="message-wall" className="py-9">
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white/70">加载留言中...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="message-wall" className="py-9">
      <div className={cn("w-full max-w-4xl mx-auto message-wall", className)}>
        <div
          className="p-6 rounded-2xl border"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
            borderColor: "rgba(255,255,255,.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
          }}
        >
          <h3
            className="mt-0 mb-6 font-bold text-[26px] leading-tight flex items-center gap-2"
            style={{
              fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
            }}
          >
            <i className="ri-chat-3-line"></i> 留言墙
          </h3>

          {/* 发布新留言 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl border bg-white/5 backdrop-blur-sm"
            style={{
              borderColor: "rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.08)",
            }}
          >
            <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <i className="ri-edit-line"></i>
              发布留言
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="你的昵称"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{ borderColor: "rgba(255,255,255,.14)" }}
              />
              
              <textarea
                placeholder="分享你的想法...（支持上传图片）"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{ borderColor: "rgba(255,255,255,.14)" }}
              />

              {/* 图片上传 */}
              <ImageUpload
                onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
                maxImages={3}
                maxSize={5}
              />

              <div className="flex justify-between items-center">
                <div className="text-xs text-white/50">
                  发布后所有访客都能看到你的留言
                </div>
                <button
                  type="submit"
                  disabled={!formData.author.trim() || !formData.content.trim() || isSubmitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      发布中...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line"></i>
                      发布留言
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* 留言列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-white flex items-center gap-2">
                <i className="ri-message-2-line"></i>
                留言列表 ({posts.length})
              </h4>
              {posts.length > 0 && (
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <i className="ri-refresh-line"></i>
                  刷新
                </button>
              )}
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <div className="text-white/60">暂无留言，来发布第一条吧！</div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <AnimatePresence>
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl border bg-white/5 backdrop-blur-sm hover:bg-white/8 transition-all duration-300"
                      style={{
                        borderColor: "rgba(255,255,255,.12)",
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {post.author.slice(-2)}
                          </div>
                          <div>
                            <div className="font-medium text-white">{post.author}</div>
                            <div className="text-xs text-white/60">{formatTime(post.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-white/90 mb-4 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </div>

                      {/* 图片展示 */}
                      {renderImages(post.images)}
                      
                      <div className="flex items-center gap-6 pt-3 border-t border-white/10">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={cn(
                            "flex items-center gap-2 transition-colors hover:scale-105",
                            post.likedBy.includes(userId)
                              ? "text-red-400 hover:text-red-300"
                              : "text-white/60 hover:text-red-400"
                          )}
                        >
                          <i className={cn(
                            post.likedBy.includes(userId) ? "ri-heart-fill" : "ri-heart-line"
                          )}></i>
                          <span>{post.likes}</span>
                        </button>
                        
                        <div className="text-white/40 text-sm flex items-center gap-4">
                          {post.images && post.images.length > 0 && (
                            <span className="flex items-center gap-1">
                              <i className="ri-image-line"></i>
                              {post.images.length} 张图片
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line"></i>
                            {formatTime(post.timestamp)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}