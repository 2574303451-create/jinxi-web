"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"
import { getUserId } from "../lib/user-utils"
import { Message, Reply, Reaction } from "../types/message-wall"
import * as backendAPI from "../services/message-wall-backend"
import { ImageUpload } from "./ui/image-upload"
import { AdminPasswordDialog } from "./ui/admin-password-dialog"
import { OptimizedImage } from "./ui/optimized-image"
import { Icon, RefreshIcon, SendIcon, CloseIcon } from "./ui/icons"
import { updateTaskProgress } from "../services/daily-task-service"

// 使用memo优化组件渲染性能
export const MessageWall = memo(function MessageWall({
  className,
  loggedInAccount = "",
  loggedInNickname = "",
}: {
  className?: string
  loggedInAccount?: string
  loggedInNickname?: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '闲聊',
    color: '#3b82f6',
    imageUrl: null as string | null
  })
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  // 密码验证相关状态
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'pin' | 'delete'
    messageId: string
  } | null>(null)

  // 使用共享的用户ID工具
  const [userId, setUserId] = useState('anonymous')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(getUserId())
    }
  }, [])

  const effectiveLoggedInName = useMemo(() => {
    if (!loggedInAccount) return ""
    const nickname = String(loggedInNickname || "").trim()
    return nickname || loggedInAccount
  }, [loggedInAccount, loggedInNickname])

  useEffect(() => {
    if (!loggedInAccount) return
    setFormData((prev) => ({ ...prev, name: effectiveLoggedInName }))
  }, [loggedInAccount, effectiveLoggedInName])

  // 加载留言数据 - 使用useCallback优化
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError("")
      const data = await backendAPI.getMessages()
      setMessages(data)
    } catch (error) {
      console.error('加载留言失败:', error)
      setLoadError("留言暂时加载失败，请重试。")
      // 这里可以添加 toast 通知
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMessages()
  }, [])

  // 提交新留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.content.trim()) {
      alert('请填写留言内容')
      return
    }

    setIsSubmitting(true)

    try {
      await backendAPI.addMessage({
        name: formData.name || '匿名',
        content: formData.content,
        category: formData.category,
        color: formData.color,
        imageUrl: formData.imageUrl || undefined
      })

      // 更新每日任务进度
      updateTaskProgress('daily-message', 1)

      // 清空表单
      setFormData({
        name: formData.name, // 保留昵称
        content: '',
        category: '闲聊',
        color: '#3b82f6',
        imageUrl: null
      })

      // 立即刷新数据
      await loadMessages()
    } catch (error) {
      console.error('发布失败:', error)
      alert('发布失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 添加回复
  const handleReply = async (messageId: string) => {
    if (!replyContent.trim()) {
      alert('请填写回复内容')
      return
    }

    try {
      console.log('Attempting to add reply to messageId:', messageId, 'with content:', replyContent)
      
      const result = await backendAPI.addReply(messageId, {
        name: formData.name || '匿名',
        content: replyContent,
        color: formData.color
      })
      
      console.log('Reply added successfully:', result)
      
      setReplyContent('')
      setReplyingTo(null)
      await loadMessages()
    } catch (error) {
      console.error('回复失败 - 详细错误:', error)
      
      let errorMessage = '回复失败，请重试'
      
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        
        // 尝试解析具体的错误信息
        if (error.message.includes('404')) {
          errorMessage = '留言不存在，请刷新页面后重试'
        } else if (error.message.includes('400')) {
          errorMessage = '回复内容格式不正确'
        } else if (error.message.includes('500')) {
          errorMessage = '服务器错误，请稍后重试'
        }
      }
      
      alert(errorMessage)
    }
  }

  // 切换反应
  const handleReaction = async (messageId: string, reactionType: string) => {
    console.log('表情反应点击:', { messageId, reactionType, userId })
    try {
      const result = await backendAPI.toggleReaction(messageId, reactionType, userId)
      console.log('表情反应API结果:', result)
      await loadMessages()
    } catch (error) {
      console.error('反应失败:', error)
      alert(`表情反应失败: ${error.message}`)
    }
  }

  // 验证管理密码 - 现在在后端验证
  const verifyAdminPassword = (password: string): boolean => {
    // 前端不再验证密码，所有验证都在后端进行
    return password && password.trim().length > 0
  }

  // 处理管理密码验证
  const handleAdminAction = async (password: string) => {
    if (!verifyAdminPassword(password)) {
      throw new Error('请输入有效密码')
    }

    if (!pendingAction) return

    try {
      if (pendingAction.type === 'pin') {
        await backendAPI.togglePin(pendingAction.messageId, password)
      } else if (pendingAction.type === 'delete') {
        await backendAPI.deleteMessage(pendingAction.messageId, password)
      }
      await loadMessages()
    } catch (error) {
      console.error('操作失败:', error)
      throw error
    } finally {
      setPendingAction(null)
    }
  }

  // 切换置顶（需要密码验证）
  const handlePin = async (messageId: string) => {
    setPendingAction({ type: 'pin', messageId })
    setAdminDialogOpen(true)
  }

  // 删除留言（需要密码验证）
  const handleDelete = async (messageId: string) => {
    if (!confirm('确定要删除这条留言吗？')) return
    
    setPendingAction({ type: 'delete', messageId })
    setAdminDialogOpen(true)
  }

  // 格式化时间
  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return "刚刚"
  }

  // 打开图片模态框
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setImageModalOpen(true)
  }

  // 过滤消息 - 使用useMemo优化
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      if (activeFilter === 'all') return true
      return message.category === activeFilter
    })
  }, [messages, activeFilter])

  // 使用useMemo优化常量数组
  const reactions = useMemo(() => ['👍', '❤️', '😂', '😮', '😢', '😡'], [])
  
  // 使用useMemo优化分类数组
  const categories = useMemo(() => [
    { value: 'all', label: '全部', icon: 'ri-list-check' },
    { value: '闲聊', label: '闲聊', icon: 'ri-chat-3-line' },
    { value: '公告', label: '公告', icon: 'ri-megaphone-line' },
    { value: '提醒', label: '提醒', icon: 'ri-alarm-line' },
    { value: '求助', label: '求助', icon: 'ri-question-line' }
  ], [])

  if (isLoading) {
    return (
      <section id="message-wall" className="py-9">
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white loading"></div>
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
          <div className="flex items-center justify-between mb-6">
        <h3
              className="mt-0 font-bold text-[26px] leading-tight flex items-center gap-2"
          style={{
            fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
          }}
        >
          <i className="ri-chat-3-line"></i> 留言墙
        </h3>

            {/* 手动刷新按钮 */}
            <button
              onClick={loadMessages}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover-effect",
                "bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="刷新留言"
            >
<RefreshIcon className={cn(isLoading && "animate-spin")} size={16} />
              {isLoading ? "刷新中..." : "刷新"}
            </button>
          </div>

{loadError && <div role="alert" className="night-error">{loadError}<button onClick={() => loadMessages()}>重试</button></div>}
          {/* 分类筛选 */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setActiveFilter(category.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover-effect",
                  activeFilter === category.value
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                )}
              >
{category.value === 'all' ? '📋' : 
                 category.value === '闲聊' ? '💬' :
                 category.value === '公告' ? '📢' :
                 category.value === '提醒' ? '⏰' :
                 category.value === '求助' ? '❓' : '📋'}
                {category.label}
              </button>
            ))}
          </div>

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
✏️
              发布留言
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {loggedInAccount && (
                <div className="text-sm text-emerald-200/90 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                  当前已登录身份：{effectiveLoggedInName}（账号：{loggedInAccount}）
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
                  placeholder={loggedInAccount ? "已绑定登录昵称（不可编辑）" : "你的昵称（可选）"}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  readOnly={!!loggedInAccount}
                />
                
            <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="闲聊">闲聊</option>
                  <option value="公告">公告</option>
                  <option value="提醒">提醒</option>
                  <option value="求助">求助</option>
            </select>
          </div>
              
            <textarea
                placeholder="分享你的想法...（支持上传图片）"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />

              {/* 图片上传 */}
              <ImageUpload
                onImageUpload={(base64Image) => setFormData(prev => ({ ...prev, imageUrl: base64Image }))}
                currentImage={formData.imageUrl}
                label="上传图片（可选）"
                maxSizeMB={2}
              />

              <div className="flex justify-between items-center">
                <div className="text-xs text-white/50">
                  发布后所有访客都能看到你的留言
                </div>
            <button
                  type="submit"
                  disabled={!formData.content.trim() || isSubmitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 flex items-center gap-2 hover-effect"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      发布中...
                    </>
                  ) : (
                    <>
<SendIcon size={16} />
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
💬
                留言列表 ({filteredMessages.length})
              </h4>
              {filteredMessages.length > 0 && (
                <button
                  onClick={loadMessages}
                  className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors hover-effect"
                >
<RefreshIcon size={14} />
                  刷新
                </button>
              )}
        </div>

            {filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <div className="text-white/60">
                  {loadError ? '留言尚未加载，请使用上方重试。' : activeFilter === 'all' ? '暂无留言，来发布第一条吧！' : `暂无${activeFilter}类型的留言`}
                </div>
              </div>
            ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          <AnimatePresence>
                  {filteredMessages.map((message, index) => (
              <motion.div
                key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-6 rounded-2xl border bg-white/5 backdrop-blur-sm hover:bg-white/8 transition-all duration-300",
                        message.isPinned && "ring-2 ring-yellow-500/50 bg-yellow-500/5"
                      )}
                style={{
                        borderColor: "rgba(255,255,255,.12)",
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: message.color }}
                          >
                            {message.name.slice(-2)}
                  </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{message.name}</span>
                      <span
                                className="px-2 py-1 text-xs rounded-full text-white"
                                style={{ backgroundColor: message.color + '40' }}
                              >
                                {message.category}
                      </span>
                              {message.isPinned && (
                                <i className="ri-pushpin-fill text-yellow-400 text-sm"></i>
                              )}
                            </div>
                            <div className="text-xs text-white/60">{formatTime(message.timestamp)}</div>
                          </div>
                    </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePin(message.id)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-yellow-500/20 text-white/80 hover:text-yellow-400 transition-all duration-200 hover-effect"
                            title={message.isPinned ? "取消置顶" : "置顶"}
                          >
                            <i className={message.isPinned ? "ri-pushpin-fill" : "ri-pushpin-line"}></i>
                          </button>
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-all duration-200 hover-effect"
                            title="删除"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                </div>

                      <div className="text-white/90 mb-4 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>

                      {/* 图片展示 - 使用优化的图片组件 */}
                      {message.imageUrl && (
                        <div className="mb-4">
                          <OptimizedImage
                            src={message.imageUrl}
                            alt="Attached image"
                            width={400}
                            height={300}
                            className="max-w-full h-auto rounded-lg cursor-pointer hover:scale-105 transition-transform border border-white/20 hover-effect"
                            onClick={() => openImageModal(message.imageUrl!)}
                            loading="lazy"
                            quality={75}
                            sizes="(max-width: 768px) 100vw, 400px"
                          />
                        </div>
                      )}

                      {/* 反应按钮 */}
                <div className="flex items-center gap-2 mb-3">
                    {reactions.map((reaction) => {
                          const reactionData = message.reactions.find(r => r.type === reaction)
                          const isActive = reactionData?.users.includes(userId)
                          
                      return (
                        <button
                          key={reaction}
                              onClick={() => handleReaction(message.id, reaction)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all hover-effect",
                                isActive 
                                  ? "bg-blue-500/30 text-blue-300" 
                                  : "bg-white/10 text-white/60 hover:bg-white/20"
                              )}
                            >
                              <span>{reaction}</span>
                              {reactionData && reactionData.count > 0 && (
                                <span className="text-xs">{reactionData.count}</span>
                              )}
                        </button>
                      )
                    })}
                  </div>

                      {/* 回复功能 */}
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                            className="text-white/60 hover:text-white flex items-center gap-1 text-sm transition-colors hover-effect"
                    >
                            ↩️
                            回复
                    </button>
                          {message.replies.length > 0 && (
                            <span className="text-white/40 text-sm">
                              {message.replies.length} 条回复
                            </span>
                          )}
                        </div>

                        {/* 回复输入框 */}
                        {replyingTo === message.id && (
                          <div className="mb-3 flex gap-2">
                            <input
                              type="text"
                              placeholder="写下你的回复..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                    <button
                              onClick={() => handleReply(message.id)}
                              disabled={!replyContent.trim()}
                              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white text-sm transition-all hover-effect"
                            >
                              发送
                    </button>
                  </div>
                        )}

                        {/* 回复列表 */}
                {message.replies.length > 0 && (
                          <div className="space-y-2">
                    {message.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-2 p-3 bg-white/5 rounded-lg">
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ backgroundColor: reply.color }}
                                >
                                  {reply.name.slice(-1)}
                        </div>
                                <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white text-sm font-medium">{reply.name}</span>
                                    <span className="text-white/40 text-xs">{formatTime(reply.timestamp)}</span>
                                  </div>
                                  <div className="text-white/80 text-sm">{reply.content}</div>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* 图片模态框 */}
      {imageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <OptimizedImage
              src={selectedImage}
              alt="预览"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
              quality={85}
              sizes="(max-width: 768px) 100vw, 800px"
              priority={true}
            />
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors hover-effect"
            >
<CloseIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 管理密码验证对话框 */}
      <AdminPasswordDialog
        isOpen={adminDialogOpen}
        onClose={() => {
          setAdminDialogOpen(false)
          setPendingAction(null)
        }}
        onConfirm={handleAdminAction}
        title={pendingAction?.type === 'pin' ? '置顶留言' : '删除留言'}
        description={
          pendingAction?.type === 'pin' 
            ? '此操作需要管理员权限，请输入管理密码来置顶或取消置顶此留言。' 
            : '此操作需要管理员权限，请输入管理密码来删除此留言。'
        }
      />
    </section>
  )
})

// 设置组件显示名称
MessageWall.displayName = 'MessageWall'
