"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"
import { StrategySubmission, StrategyCategory, STRATEGY_CONFIG, MediaFile } from "../types/strategy-wall"
import { Modal } from "./ui/modal"
import { MediaUpload } from "./ui/media-upload"
import * as strategyAPI from "../services/strategy-wall-service"

interface StrategySubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (submission: StrategySubmission) => Promise<void>
}

export function StrategySubmissionModal({ isOpen, onClose, onSubmit }: StrategySubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<StrategySubmission>({
    title: '',
    content: '',
    author: '',
    category: STRATEGY_CONFIG.DEFAULT_CATEGORY,
    difficulty: STRATEGY_CONFIG.DEFAULT_DIFFICULTY,
    tags: [],
    imageUrl: undefined,
    mediaFiles: []
  })
  
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [previewMode, setPreviewMode] = useState(false)

  // 初始化作者名称（从签到系统获取，锁定使用）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserName = localStorage.getItem('jinxi-user-name')
      if (savedUserName) {
        setFormData(prev => ({ ...prev, author: savedUserName }))
      }
    }
  }, [isOpen])

  const handleInputChange = (field: keyof StrategySubmission, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除相关错误
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim()) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async () => {
    // 特殊验证：检查是否有作者昵称
    if (!formData.author) {
      setErrors(['请先在签到功能中设置您的账号昵称'])
      return
    }

    // 验证表单数据
    const validationErrors = strategyAPI.validateStrategySubmission(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setIsSubmitting(true)
      setErrors([])
      
      // 保存作者名称到本地存储
      if (formData.author && typeof window !== 'undefined') {
        localStorage.setItem('jinxi-user-name', formData.author)
      }
      
      await onSubmit(formData)
      
      // 重置表单
      setFormData({
        title: '',
        content: '',
        author: formData.author, // 保留作者名称
        category: STRATEGY_CONFIG.DEFAULT_CATEGORY,
        difficulty: STRATEGY_CONFIG.DEFAULT_DIFFICULTY,
        tags: [],
        imageUrl: undefined,
        mediaFiles: []
      })
      setPreviewMode(false)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '提交失败，请重试'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-4 lg:p-8 min-h-[700px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <i className="ri-edit-line text-blue-400 text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">投稿攻略</h2>
              <p className="text-white/60 text-sm">分享您的游戏心得和技巧</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 backdrop-blur-sm border",
                previewMode 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400/50 shadow-lg shadow-cyan-500/25" 
                  : "bg-white/20 text-white/90 border-white/30 hover:bg-white/30 hover:scale-105"
              )}
            >
              <i className={previewMode ? "ri-edit-2-line" : "ri-eye-line"}></i>
              {previewMode ? "编辑" : "预览"}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            {errors.map((error, index) => (
              <div key={index} className="text-red-200 text-sm flex items-center gap-2">
                <i className="ri-error-warning-line"></i>
                {error}
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* 表单区域 */}
          <div className="space-y-4 lg:space-y-6">
            {/* 基本信息 */}
            <div>
              <label className="block text-white font-bold mb-3 text-sm">
                <i className="ri-edit-2-line mr-2 text-green-400"></i>
                攻略标题 <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="请输入一个吸引人的攻略标题..."
                maxLength={100}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium placeholder-white/70 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 hover:bg-white/25 transition-all duration-200"
              />
              <div className="text-white/60 text-sm mt-2 flex items-center justify-between">
                <span>💡 清晰的标题有助于其他玩家快速找到需要的攻略</span>
                <span className="font-medium">{formData.title.length}/100</span>
              </div>
            </div>

            {/* 作者 */}
            <div>
              <label className="block text-white font-medium mb-2">
                投稿昵称 <span className="text-red-400">*</span>
              </label>
              {formData.author ? (
                <div className="relative">
                  <input
                    type="text"
                    value={formData.author}
                    readOnly
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-80"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <i className="ri-lock-line text-white/60"></i>
                  </div>
                </div>
              ) : (
                <div className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200">
                  请先在签到功能中设置您的账号昵称
                </div>
              )}
              <div className="text-white/50 text-sm mt-1 flex items-center gap-2">
                <i className="ri-information-line"></i>
                {formData.author ? (
                  '昵称来自签到系统，确保身份一致性'
                ) : (
                  '请点击页面上方"签到"按钮设置您的昵称后再投稿'
                )}
              </div>
            </div>

            {/* 分类和难度 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <label className="block text-white font-bold mb-3 text-sm">
                  <i className="ri-folder-3-line mr-2 text-blue-400"></i>
                  攻略分类
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value as StrategyCategory)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 hover:bg-white/25 transition-all duration-200 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    {STRATEGY_CONFIG.CATEGORIES.map(category => (
                      <option 
                        key={category.key} 
                        value={category.key}
                        className="bg-slate-800 text-white font-medium py-2"
                      >
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                </div>
              </div>

              <div>
                <label className="block text-white font-bold mb-3 text-sm">
                  <i className="ri-star-line mr-2 text-yellow-400"></i>
                  难度等级
                </label>
                <div className="relative">
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 hover:bg-white/25 transition-all duration-200 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    {STRATEGY_CONFIG.DIFFICULTIES.map(diff => (
                      <option 
                        key={diff.level} 
                        value={diff.level}
                        className="bg-slate-800 text-white font-medium py-2"
                      >
                        ★{Array(diff.level).fill('').map(() => '★').join('')} {diff.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-white font-bold mb-3 text-sm">
                <i className="ri-price-tag-3-line mr-2 text-purple-400"></i>
                攻略标签 ({formData.tags.length}/10)
              </label>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入标签并回车..."
                  maxLength={20}
                  className="w-full sm:flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium placeholder-white/70 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 hover:bg-white/25 transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || formData.tags.includes(newTag.trim()) || formData.tags.length >= 10}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <i className="ri-add-line"></i>
                  添加
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm border border-purple-400/30 text-purple-200 rounded-full text-sm font-medium flex items-center gap-2 hover:from-purple-500/40 hover:to-pink-500/40 transition-all duration-200"
                    >
                      <i className="ri-hashtag"></i>
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-300 transition-colors p-1 hover:bg-white/10 rounded-full"
                        title="删除标签"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 多媒体文件上传 */}
            <div>
              <label className="block text-white font-bold mb-3 text-sm">
                <i className="ri-camera-line mr-2 text-orange-400"></i>
                多媒体文件 (可选)
              </label>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <MediaUpload
                  mediaFiles={formData.mediaFiles}
                  onMediaFilesChange={(files) => handleInputChange('mediaFiles', files)}
                />
              </div>
            </div>

            {/* 图片URL (向后兼容) */}
            <div>
              <label className="block text-white font-bold mb-3 text-sm">
                <i className="ri-image-line mr-2 text-pink-400"></i>
                封面图片链接 (可选)
              </label>
              <input
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => handleInputChange('imageUrl', e.target.value || undefined)}
                placeholder="请输入图片URL地址..."
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium placeholder-white/70 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 hover:bg-white/25 transition-all duration-200"
              />
              <div className="text-white/60 text-sm mt-2 flex items-center gap-2">
                <i className="ri-lightbulb-line text-yellow-400"></i>
                如果已上传多媒体文件，可忽略此字段
              </div>
            </div>
          </div>

          {/* 内容编辑/预览区域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold text-sm flex items-center">
                <i className="ri-article-line mr-2 text-cyan-400"></i>
                攻略内容 <span className="text-red-400 ml-1">*</span>
              </label>
              <span className="text-white/60 text-sm font-medium">
                {formData.content.length}/10000
              </span>
            </div>

            {previewMode ? (
              <div className="h-[350px] lg:h-[400px] p-4 lg:p-6 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl overflow-y-auto">
                <div 
                  className="text-white/90 prose prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: strategyAPI.formatStrategyContent(formData.content) 
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="请输入攻略内容...&#10;&#10;💡 支持Markdown格式：&#10;# 一级标题&#10;## 二级标题&#10;**粗体** *斜体*&#10;- 列表项&#10;1. 数字列表&#10;&#10;🎯 小贴士：&#10;- 结构化内容更易阅读&#10;- 添加具体操作步骤&#10;- 配图说明效果更佳"
                  maxLength={10000}
                  className="w-full h-[350px] lg:h-[400px] px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium placeholder-white/70 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 hover:bg-white/25 transition-all duration-200 resize-none leading-relaxed text-sm lg:text-base"
                />
                <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
              </div>
            )}
            
            <div className="text-white/60 text-sm">
              <div className="flex items-center gap-1 mb-1">
                <i className="ri-markdown-line"></i>
                支持Markdown格式
              </div>
              <div className="text-xs space-y-1 pl-5">
                <div># 一级标题  ## 二级标题  ### 三级标题</div>
                <div>**粗体**  *斜体*  `代码`</div>
                <div>- 无序列表  1. 有序列表</div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 lg:gap-4 mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-white/20">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 lg:px-8 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-105 flex items-center justify-center gap-2"
          >
            <i className="ri-close-line"></i>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.author}
            className={cn(
              "w-full sm:w-auto px-8 lg:px-10 py-3 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2",
              !formData.author 
                ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed"
                : isSubmitting
                ? "bg-gradient-to-r from-blue-600 to-purple-700 text-white"
                : "bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white hover:scale-105 shadow-lg hover:shadow-xl"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                提交中...
              </>
            ) : !formData.author ? (
              <>
                <i className="ri-lock-line"></i>
                需设置昵称
              </>
            ) : (
              <>
                <i className="ri-send-plane-2-line"></i>
                🚀 发布攻略
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
