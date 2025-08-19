"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Strategy, STRATEGY_CONFIG, formatTimestamp } from "@/types/strategy-wall"
import { Modal } from "@/components/ui/modal"
import { MediaGallery } from "@/components/ui/media-gallery"
import * as strategyAPI from "@/services/strategy-wall-service"

interface StrategyDetailModalProps {
  strategy: Strategy | null
  isOpen: boolean
  onClose: () => void
  userId: string
  onLike: (strategy: Strategy) => void
  onFavorite: (strategy: Strategy) => void
}

export function StrategyDetailModal({ 
  strategy, 
  isOpen, 
  onClose, 
  userId, 
  onLike, 
  onFavorite 
}: StrategyDetailModalProps) {
  const [isCommenting, setIsCommenting] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserName = localStorage.getItem('jinxi-user-name')
      if (savedUserName) {
        setUserName(savedUserName)
      }
    }
  }, [])

  if (!strategy) return null

  const categoryConfig = STRATEGY_CONFIG.CATEGORIES.find(c => c.key === strategy.category)
  const difficultyConfig = STRATEGY_CONFIG.DIFFICULTIES.find(d => d.level === strategy.difficulty)
  const isLiked = userId && strategy.likes.includes(userId)
  const isFavorited = userId && strategy.favorites.includes(userId)

  const handleComment = async () => {
    if (!commentContent.trim() || !userId) return

    try {
      setIsCommenting(true)
      await strategyAPI.commentStrategy(strategy.id, userId, commentContent.trim(), userName || '匿名用户')
      setCommentContent('')
      // 这里可以添加刷新评论的逻辑，或者通过回调更新父组件状态
    } catch (error) {
      console.error('评论失败:', error)
    } finally {
      setIsCommenting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto p-6">
          {/* 头部 */}
          <div className="flex items-start gap-6 mb-8">
            {/* 封面图片 */}
            {strategy.imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={strategy.imageUrl}
                  alt={strategy.title}
                  className="w-48 h-32 object-cover rounded-lg"
                />
              </div>
            )}
            
            {/* 标题区域 */}
            <div className="flex-1">
              {/* 置顶标识 */}
              {strategy.isPinned && (
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-pushpin-fill text-yellow-400"></i>
                  <span className="text-yellow-400 text-sm font-medium">置顶攻略</span>
                </div>
              )}

              <h1 className="text-3xl font-bold text-white mb-4">{strategy.title}</h1>

              {/* 元信息 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-white/80">
                  <i className="ri-user-3-line"></i>
                  <span>{strategy.author}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <i className="ri-time-line"></i>
                  <span>{formatTimestamp(strategy.createdAt)}</span>
                </div>
              </div>

              {/* 分类和难度 */}
              <div className="flex items-center gap-3 mb-4">
                <span className={cn("px-3 py-1 rounded-lg bg-white/10 text-sm flex items-center gap-2", categoryConfig?.color)}>
                  <i className={categoryConfig?.icon}></i>
                  {categoryConfig?.label}
                </span>
                <span className={cn("px-3 py-1 rounded-lg bg-white/10 text-sm flex items-center gap-2", difficultyConfig?.color)}>
                  <i className={difficultyConfig?.icon}></i>
                  {difficultyConfig?.label}
                </span>
              </div>

              {/* 标签 */}
              {strategy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {strategy.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-200 text-sm rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 统计信息 */}
              <div className="flex items-center gap-6 text-white/60">
                <span className="flex items-center gap-1">
                  <i className="ri-eye-line"></i>
                  {strategy.viewCount} 浏览
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-heart-line"></i>
                  {strategy.likes.length} 点赞
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-star-line"></i>
                  {strategy.favorites.length} 收藏
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-chat-1-line"></i>
                  {strategy.comments.length} 评论
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => onLike(strategy)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 flex-1 justify-center",
                isLiked 
                  ? "bg-red-500 text-white" 
                  : "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-300 border border-white/20"
              )}
            >
              <i className={isLiked ? "ri-heart-fill" : "ri-heart-line"}></i>
              {isLiked ? '已点赞' : '点赞'}
            </button>
            <button
              onClick={() => onFavorite(strategy)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 flex-1 justify-center",
                isFavorited 
                  ? "bg-yellow-500 text-white" 
                  : "bg-white/10 text-white hover:bg-yellow-500/20 hover:text-yellow-300 border border-white/20"
              )}
            >
              <i className={isFavorited ? "ri-star-fill" : "ri-star-line"}></i>
              {isFavorited ? '已收藏' : '收藏'}
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: strategy.title,
                    text: strategy.content.substring(0, 100) + '...',
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all duration-200"
            >
              <i className="ri-share-line"></i>
              分享
            </button>
          </div>

          {/* 内容 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8">
            <div 
              className="prose prose-invert max-w-none text-white/80 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: strategyAPI.formatStrategyContent(strategy.content) 
              }}
            />
          </div>

          {/* 多媒体文件展示 */}
          {strategy.mediaFiles && strategy.mediaFiles.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8">
              <MediaGallery mediaFiles={strategy.mediaFiles} />
            </div>
          )}

          {/* 评论区 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <i className="ri-chat-1-line"></i>
              评论 ({strategy.comments.length})
            </h3>

            {/* 发表评论 */}
            <div className="mb-6">
              <div className="flex gap-3">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="发表您的看法..."
                  maxLength={500}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentContent.trim() || isCommenting}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors self-start"
                >
                  {isCommenting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line"></i>
                    </>
                  )}
                </button>
              </div>
              <div className="text-white/50 text-sm mt-2">
                {commentContent.length}/500
              </div>
            </div>

            {/* 评论列表 */}
            <div className="space-y-4">
              {strategy.comments.length > 0 ? (
                strategy.comments
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 p-4 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="ri-user-3-line text-blue-400"></i>
                          <span className="text-white font-medium">{comment.userName}</span>
                        </div>
                        <span className="text-white/50 text-sm">
                          {formatTimestamp(comment.timestamp)}
                        </span>
                      </div>
                      <div className="text-white/80">
                        {comment.content}
                      </div>
                    </motion.div>
                  ))
              ) : (
                <div className="text-center py-8 text-white/60">
                  <i className="ri-chat-1-line text-4xl mb-2"></i>
                  <div>暂无评论，快来发表第一个评论吧！</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
