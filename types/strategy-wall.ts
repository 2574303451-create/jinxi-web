// 攻略墙类型定义

// 媒体文件类型
export type MediaFileType = 'image' | 'video';

// 媒体文件接口
export interface MediaFile {
  id: string;
  type: MediaFileType;
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  duration?: string; // 仅视频文件，格式如 "05:32"
  size?: number; // 文件大小（字节）
  uploadedAt?: Date;
}

// 攻略评论
export interface StrategyComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

// 攻略实体
export interface Strategy {
  id: string;
  title: string;
  content: string;
  author: string;
  category: StrategyCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  likes: string[]; // 点赞用户ID列表
  favorites: string[]; // 收藏用户ID列表
  comments: StrategyComment[];
  isPinned: boolean;
  imageUrl?: string; // 向后兼容的封面图片字段
  mediaFiles: MediaFile[]; // 多媒体文件列表
  viewCount: number;
  status: StrategyStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 攻略分类
export type StrategyCategory = 
  | 'PVP'
  | 'PVE' 
  | '新手向/老玩家回归'
  | '装备'
  | '战力系统'
  | '副本'
  | '活动'
  | '其他';

// 攻略状态
export type StrategyStatus = 'published' | 'draft' | 'archived';

// 攻略难度配置
export interface DifficultyConfig {
  level: number;
  label: string;
  color: string;
  icon: string;
}

// 攻略分类配置
export interface CategoryConfig {
  key: StrategyCategory;
  label: string;
  color: string;
  icon: string;
  description: string;
}

// 攻略投稿表单数据
export interface StrategySubmission {
  title: string;
  content: string;
  author: string;
  category: StrategyCategory;
  difficulty: number;
  tags: string[];
  imageUrl?: string; // 向后兼容的封面图片
  mediaFiles: MediaFile[]; // 多媒体文件列表
}

// 攻略操作参数
export interface StrategyAction {
  strategyId: string;
  userId: string;
  action: 'like' | 'favorite' | 'comment' | 'pin' | 'delete' | 'view';
  data?: any;
  password?: string; // 仅用于pin和delete操作
}

// 攻略统计
export interface StrategyStats {
  total: number;
  published: number;
  pinned: number;
  byCategory: Record<StrategyCategory, number>;
  byDifficulty: Record<number, number>;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

// API响应格式
export interface StrategyResponse {
  success: boolean;
  data?: Strategy | Strategy[];
  error?: string;
  message?: string;
}

// 攻略搜索参数
export interface StrategySearchParams {
  category?: StrategyCategory;
  difficulty?: number;
  tags?: string[];
  search?: string; // 搜索关键词
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'view_count' | 'likes' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
  status?: StrategyStatus;
}

// 攻略墙配置
export const STRATEGY_CONFIG = {
  // 难度等级配置
  DIFFICULTIES: [
    { level: 1, label: '入门', color: 'text-green-400', icon: 'ri-seedling-line' },
    { level: 2, label: '初级', color: 'text-blue-400', icon: 'ri-book-2-line' },
    { level: 3, label: '中级', color: 'text-yellow-400', icon: 'ri-award-line' },
    { level: 4, label: '高级', color: 'text-orange-400', icon: 'ri-fire-line' },
    { level: 5, label: '专家', color: 'text-red-400', icon: 'ri-vip-crown-line' }
  ] as DifficultyConfig[],

  // 分类配置
  CATEGORIES: [
    { 
      key: 'PVP', 
      label: 'PVP对战', 
      color: 'text-red-400', 
      icon: 'ri-sword-line',
      description: '玩家对战技巧与策略'
    },
    { 
      key: 'PVE', 
      label: 'PVE副本', 
      color: 'text-blue-400', 
      icon: 'ri-shield-line',
      description: '副本攻略与Boss打法'
    },
    { 
      key: '新手向/老玩家回归', 
      label: '新手向/老玩家回归', 
      color: 'text-green-400', 
      icon: 'ri-seedling-line',
      description: '新手入门指南与老玩家回归攻略'
    },
    { 
      key: '装备', 
      label: '装备指南', 
      color: 'text-purple-400', 
      icon: 'ri-shield-keyhole-line',
      description: '装备选择与搭配'
    },
    { 
      key: '战力系统', 
      label: '战力系统', 
      color: 'text-cyan-400', 
      icon: 'ri-sword-fill',
      description: '战力提升与系统攻略'
    },
    { 
      key: '副本', 
      label: '副本攻略', 
      color: 'text-indigo-400', 
      icon: 'ri-building-line',
      description: '各类副本通关攻略'
    },
    { 
      key: '活动', 
      label: '活动攻略', 
      color: 'text-pink-400', 
      icon: 'ri-calendar-event-line',
      description: '限时活动攻略'
    },
    { 
      key: '其他', 
      label: '其他', 
      color: 'text-gray-400', 
      icon: 'ri-more-line',
      description: '其他类型攻略'
    }
  ] as CategoryConfig[],

  // 默认配置
  DEFAULT_CATEGORY: 'PVE' as StrategyCategory,
  DEFAULT_DIFFICULTY: 1,
  MAX_TITLE_LENGTH: 100,
  MAX_CONTENT_LENGTH: 10000,
  MAX_TAG_COUNT: 10,
  MAX_TAG_LENGTH: 20,
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,

  // 多媒体文件配置
  MAX_MEDIA_FILES: 10, // 最大文件数量
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
  
  // 支持的文件扩展名
  IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  VIDEO_EXTENSIONS: ['.mp4', '.webm', '.mov', '.avi']
};

// 辅助函数
export const getDifficultyConfig = (level: number): DifficultyConfig | undefined => {
  return STRATEGY_CONFIG.DIFFICULTIES.find(d => d.level === level);
};

export const getCategoryConfig = (category: StrategyCategory): CategoryConfig | undefined => {
  return STRATEGY_CONFIG.CATEGORIES.find(c => c.key === category);
};

export const formatViewCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 10000) return (count / 1000).toFixed(1) + 'k';
  return (count / 10000).toFixed(1) + 'w';
};

export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
};

// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 验证文件类型
export const isValidFileType = (file: File, type: 'image' | 'video'): boolean => {
  if (type === 'image') {
    return STRATEGY_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
  } else {
    return STRATEGY_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type);
  }
};

// 验证文件大小
export const isValidFileSize = (file: File, type: 'image' | 'video'): boolean => {
  if (type === 'image') {
    return file.size <= STRATEGY_CONFIG.MAX_IMAGE_SIZE;
  } else {
    return file.size <= STRATEGY_CONFIG.MAX_VIDEO_SIZE;
  }
};

// 生成媒体文件ID
export const generateMediaFileId = (type: 'image' | 'video'): string => {
  const prefix = type === 'image' ? 'img' : 'vid';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `${prefix}_${timestamp}_${random}`;
};

// 获取文件扩展名
export const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

// 检查是否为图片文件
export const isImageFile = (file: File): boolean => {
  return STRATEGY_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
};

// 检查是否为视频文件
export const isVideoFile = (file: File): boolean => {
  return STRATEGY_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type);
};
