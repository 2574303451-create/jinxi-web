"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"
import { getUserId } from "../lib/user-utils"
import { Strategy, StrategyCategory, STRATEGY_CONFIG } from "../types/strategy-wall"
import * as strategyAPI from "../services/strategy-wall-service"
import { Modal } from "./ui/modal"
import { AdminPasswordDialog } from "./ui/admin-password-dialog"
import { StrategySubmissionModal } from "./strategy-submission-modal"
import { StrategyDetailModal } from "./strategy-detail-modal"
import {
  CloseIcon,
  BookIcon,
  AddIcon,
  SearchIcon,
  PinIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
  EyeIcon,
  HeartIcon,
  StarIcon,
  DeleteIcon
} from "./ui/icons"

interface StrategyWallProps {
  isOpen: boolean
  onClose: () => void
}

export function StrategyWall({ isOpen, onClose }: StrategyWallProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<StrategyCategory | 'all'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'view_count' | 'likes'>('created_at')
  const [userId, setUserId] = useState('')

  // 弹窗状态
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'pin' | 'delete'
    strategyId: string
  } | null>(null)

  // 分页状态
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const PAGE_SIZE = 12

  // 使用共享的用户ID工具
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(getUserId())
    }
  }, [])

  // 加载攻略数据
  const loadStrategies = async (reset = false) => {
    try {
      setIsLoading(true)
      setLoadError("")
      const offset = reset ? 0 : currentPage * PAGE_SIZE
      
      const result = await strategyAPI.getStrategies({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
        search: searchKeyword || undefined,
        sortBy,
        sortOrder: 'DESC',
        limit: PAGE_SIZE,
        offset
      })

      if (reset) {
        setStrategies(result.strategies)
        setCurrentPage(0)
      } else {
        setStrategies(prev => [...prev, ...result.strategies])
      }
      
      setHasMore(result.pagination.hasMore)
    } catch (error) {
      console.error('加载攻略失败:', error)
      setLoadError("攻略暂时加载失败，请重试。")
    } finally {
      setIsLoading(false)
    }
  }

  // 首次加载
  useEffect(() => {
    if (isOpen) {
      loadStrategies(true)
    }
  }, [isOpen, selectedCategory, selectedDifficulty, searchKeyword, sortBy])

  // 加载更多
  const loadMore = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    if (currentPage > 0) {
      loadStrategies(false)
    }
  }, [currentPage])

  // 处理点赞
  const handleLike = async (strategy: Strategy) => {
    if (!userId) return
    
    try {
      const result = await strategyAPI.likeStrategy(strategy.id, userId)
      
      // 更新本地状态
      setStrategies(prev => prev.map(s => 
        s.id === strategy.id 
          ? {
              ...s,
              likes: result.liked 
                ? [...s.likes, userId]
                : s.likes.filter(id => id !== userId)
            }
          : s
      ))
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 处理收藏
  const handleFavorite = async (strategy: Strategy) => {
    if (!userId) return
    
    try {
      const result = await strategyAPI.favoriteStrategy(strategy.id, userId)
      
      // 更新本地状态
      setStrategies(prev => prev.map(s => 
        s.id === strategy.id 
          ? {
              ...s,
              favorites: result.favorited 
                ? [...s.favorites, userId]
                : s.favorites.filter(id => id !== userId)
            }
          : s
      ))
    } catch (error) {
      console.error('收藏失败:', error)
    }
  }

  // 处理查看详情
  const handleViewDetail = async (strategy: Strategy) => {
    try {
      // 增加浏览量
      await strategyAPI.viewStrategy(strategy.id)
      
      setSelectedStrategy(strategy)
      setIsDetailOpen(true)
    } catch (error) {
      console.error('查看详情失败:', error)
    }
  }

  // 处理管理操作
  const handleAdminAction = async (password: string) => {
    if (!pendingAction) return

    try {
      if (pendingAction.type === 'pin') {
        await strategyAPI.pinStrategy(pendingAction.strategyId, password)
      } else if (pendingAction.type === 'delete') {
        await strategyAPI.deleteStrategy(pendingAction.strategyId, password)
      }

      // 重新加载数据
      loadStrategies(true)
      setAdminDialogOpen(false)
      setPendingAction(null)
    } catch (error) {
      throw error // 让密码对话框处理错误
    }
  }

  // 处理置顶
  const handlePin = (strategyId: string) => {
    setPendingAction({ type: 'pin', strategyId })
    setAdminDialogOpen(true)
  }

  // 处理删除
  const handleDelete = (strategyId: string) => {
    setPendingAction({ type: 'delete', strategyId })
    setAdminDialogOpen(true)
  }

  const getDifficultyConfig = (level: number) => {
    return STRATEGY_CONFIG.DIFFICULTIES.find(d => d.level === level)
  }

  const getCategoryConfig = (category: StrategyCategory) => {
    return STRATEGY_CONFIG.CATEGORIES.find(c => c.key === category)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="分享经验，一起变强" size="xl">
        <div 
          className="strategy-content relative"
          style={{ 
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.85)), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="%234f46e5" stop-opacity="0.3"/><stop offset="100%" stop-color="%231e40af" stop-opacity="0.1"/></radialGradient></defs><rect width="1000" height="1000" fill="url(%23a)"/><circle cx="200" cy="200" r="100" fill="%236366f1" fill-opacity="0.1"/><circle cx="800" cy="300" r="150" fill="%238b5cf6" fill-opacity="0.08"/><circle cx="300" cy="800" r="120" fill="%2306b6d4" fill-opacity="0.12"/><circle cx="700" cy="700" r="80" fill="%2310b981" fill-opacity="0.1"/></svg>')` 
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-3 bg-black/30 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-black/50 transition-all duration-200 hover:scale-110"
            title="关闭攻略墙"
          >
<CloseIcon className="text-xl" />
          </button>

          {/* 内容区域 */}
          <div className="p-2 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {/* 头部 */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
<BookIcon className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">📖 攻略墙</h1>
                    <p className="text-white/80 text-lg">分享游戏心得，共同进步 ✨</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsSubmissionOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
                >
<AddIcon className="text-lg" />
                  📝 投稿攻略
                </button>
              </div>

              {/* 筛选栏 */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* 搜索框 */}
                  <div className="relative">
<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-lg" />
                    <input
                      type="text"
                      placeholder="搜索攻略标题和内容..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 hover:bg-white/20 transition-all duration-200"
                    />
                  </div>

                  {/* 分类筛选 */}
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as StrategyCategory | 'all')}
                      className="w-full px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 hover:bg-white/20 transition-all duration-200 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px 16px'
                    }}
                  >
                      <option value="all" className="bg-slate-800 text-white">📚 所有分类</option>
                      {STRATEGY_CONFIG.CATEGORIES.map(category => (
                        <option 
                          key={category.key} 
                          value={category.key}
                          className="bg-slate-800 text-white"
                        >
                          {category.label}
                        </option>
                      ))}
                  </select>
                    <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  </div>

                  {/* 难度筛选 */}
                  <div className="relative">
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 hover:bg-white/20 transition-all duration-200 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px 16px'
                    }}
                  >
                      <option value="all" className="bg-slate-800 text-white">⭐ 所有难度</option>
                      {STRATEGY_CONFIG.DIFFICULTIES.map(diff => (
                        <option 
                          key={diff.level} 
                          value={diff.level}
                          className="bg-slate-800 text-white"
                        >
                          {'★'.repeat(diff.level)} {diff.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  </div>

                  {/* 排序方式 */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'created_at' | 'view_count' | 'likes')}
                      className="w-full px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 hover:bg-white/20 transition-all duration-200 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px 16px'
                    }}
                    >
                      <option value="created_at" className="bg-slate-800 text-white">🕒 最新发布</option>
                      <option value="view_count" className="bg-slate-800 text-white">👁️ 最多浏览</option>
                      <option value="likes" className="bg-slate-800 text-white">❤️ 最多点赞</option>
                    </select>
                    <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  </div>
                </div>
              </div>

{loadError && <div role="alert" className="night-error">{loadError}<button onClick={() => loadStrategies(true)}>重试</button></div>}
            {/* 攻略列表 */}
            {isLoading && strategies.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-white/70">加载中...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <AnimatePresence>
                    {strategies.map((strategy) => {
                      const categoryConfig = getCategoryConfig(strategy.category)
                      const difficultyConfig = getDifficultyConfig(strategy.difficulty)
                      const isLiked = userId && strategy.likes.includes(userId)
                      const isFavorited = userId && strategy.favorites.includes(userId)

                      return (
                        <motion.div
                          key={strategy.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 lg:p-8 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-xl"
                          onClick={() => handleViewDetail(strategy)}
                        >
                          {/* 置顶标识 */}
                          {strategy.isPinned && (
                            <div className="flex items-center gap-1 mb-3">
<PinIcon className="text-yellow-400" filled={true} />
                              <span className="text-yellow-400 text-sm">置顶</span>
                            </div>
                          )}

                          {/* 标题 */}
                          <h3 className="text-xl font-bold text-white mb-4 leading-relaxed group-hover:text-blue-200 transition-colors line-clamp-2">
                            {strategy.title}
                          </h3>

                          {/* 内容预览 */}
                          <p className="text-white/70 text-sm mb-4 line-clamp-3">
                            {strategy.content.replace(/[#*`]/g, '').substring(0, 120)}...
                          </p>

                          {/* 多媒体文件预览 */}
                          {strategy.mediaFiles && strategy.mediaFiles.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
<FileIcon />
                                <span>
                                  {strategy.mediaFiles.filter(f => f.type === 'image').length > 0 && 
                                    `${strategy.mediaFiles.filter(f => f.type === 'image').length}张图片`}
                                  {strategy.mediaFiles.filter(f => f.type === 'image').length > 0 && 
                                   strategy.mediaFiles.filter(f => f.type === 'video').length > 0 && ' • '}
                                  {strategy.mediaFiles.filter(f => f.type === 'video').length > 0 && 
                                    `${strategy.mediaFiles.filter(f => f.type === 'video').length}个视频`}
                                </span>
                              </div>
                              <div className="flex gap-2 overflow-x-auto">
                                {strategy.mediaFiles.slice(0, 3).map((media) => (
                                  <div key={media.id} className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/10 border border-white/20">
                                    {media.type === 'image' ? (
                                      <img 
                                        src={media.url} 
                                        alt={media.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          const parent = target.parentElement
                                          if (parent) {
                                            parent.innerHTML = '<div class="text-white/40 text-sm flex items-center justify-center w-full h-full">🖼️</div>'
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
<VideoIcon className="text-white/60" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {strategy.mediaFiles.length > 3 && (
                                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white/60 text-xs">
                                    +{strategy.mediaFiles.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 分类和难度 */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className={cn("px-2 py-1 rounded-lg bg-white/10 text-xs flex items-center gap-1", categoryConfig?.color)}>
                              <i className={categoryConfig?.icon}></i>
                              {categoryConfig?.label}
                            </span>
                            <span className={cn("px-2 py-1 rounded-lg bg-white/10 text-xs flex items-center gap-1", difficultyConfig?.color)}>
                              <i className={difficultyConfig?.icon}></i>
                              {difficultyConfig?.label}
                            </span>
                          </div>

                          {/* 标签 */}
                          {strategy.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {strategy.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded">
                                  #{tag}
                                </span>
                              ))}
                              {strategy.tags.length > 3 && (
                                <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                                  +{strategy.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 底部信息 */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3 text-white/60">
                              <span className="flex items-center gap-1">
<EyeIcon />
                                {strategy.viewCount}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLike(strategy)
                                }}
                                className={cn(
                                  "flex items-center gap-1 hover:text-red-400 transition-colors",
                                  isLiked ? "text-red-400" : ""
                                )}
                              >
<HeartIcon filled={isLiked} />
                                {strategy.likes.length}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFavorite(strategy)
                                }}
                                className={cn(
                                  "flex items-center gap-1 hover:text-yellow-400 transition-colors",
                                  isFavorited ? "text-yellow-400" : ""
                                )}
                              >
<StarIcon filled={isFavorited} />
                                {strategy.favorites.length}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/60">{strategy.author}</span>
                              {/* 管理按钮 */}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePin(strategy.id)
                                  }}
                                  className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-yellow-400 transition-colors"
                                  title={strategy.isPinned ? "取消置顶" : "置顶"}
                                >
<PinIcon className="text-sm" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(strategy.id)
                                  }}
                                  className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                                  title="删除"
                                >
<DeleteIcon className="text-sm" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* 加载更多 */}
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all duration-200 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          加载中...
                        </>
                      ) : (
                        '加载更多'
                      )}
                    </button>
                  </div>
                )}

                {/* 暂无数据 */}
                {strategies.length === 0 && !isLoading && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📚</div>
                    <div className="text-white/60">
                      {searchKeyword ? '没有找到相关攻略' : '暂无攻略，快来投稿第一个攻略吧！'}
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </Modal>

      {/* 投稿弹窗 */}
      <StrategySubmissionModal
        isOpen={isSubmissionOpen}
        onClose={() => setIsSubmissionOpen(false)}
        onSubmit={async (submission: any) => {
          await strategyAPI.submitStrategy(submission)
          loadStrategies(true)
          setIsSubmissionOpen(false)
        }}
      />

      {/* 详情弹窗 */}
      <StrategyDetailModal
        strategy={selectedStrategy}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        userId={userId}
        onLike={handleLike}
        onFavorite={handleFavorite}
      />

      {/* 管理员密码确认 */}
      <AdminPasswordDialog
        isOpen={adminDialogOpen}
        onClose={() => {
          setAdminDialogOpen(false)
          setPendingAction(null)
        }}
        onConfirm={handleAdminAction}
        title={pendingAction?.type === 'pin' ? '置顶攻略' : '删除攻略'}
        description={
          pendingAction?.type === 'pin' 
            ? '请输入管理员密码来置顶此攻略：'
            : '请输入管理员密码来删除此攻略：'
        }
      />
    </>
  )
}
