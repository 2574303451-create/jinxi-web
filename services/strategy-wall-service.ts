// 攻略墙前端服务
import { 
  Strategy, 
  StrategySubmission, 
  StrategyAction,
  StrategySearchParams,
  StrategyResponse
} from '@/types/strategy-wall';

const API_BASE = '/.netlify/functions';

// 获取攻略列表
export const getStrategies = async (params: StrategySearchParams = {}): Promise<{
  strategies: Strategy[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> => {
  try {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const response = await fetch(`${API_BASE}/strategies?${searchParams.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换数据格式
    return {
      strategies: data.strategies.map((strategy: any) => ({
        ...strategy,
        createdAt: new Date(strategy.createdAt),
        updatedAt: new Date(strategy.updatedAt),
        mediaFiles: strategy.mediaFiles || [],
        comments: (strategy.comments || []).map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp)
        }))
      })),
      pagination: data.pagination
    };
  } catch (error) {
    console.error('获取攻略列表失败:', error);
    throw error;
  }
};

// 提交新攻略
export const submitStrategy = async (submission: StrategySubmission): Promise<Strategy> => {
  try {
    const response = await fetch(`${API_BASE}/strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '提交失败');
    }
    
    return {
      ...data.strategy,
      createdAt: new Date(data.strategy.createdAt),
      updatedAt: new Date(data.strategy.updatedAt),
      mediaFiles: data.strategy.mediaFiles || []
    };
  } catch (error) {
    console.error('提交攻略失败:', error);
    throw error;
  }
};

// 执行攻略操作
export const performStrategyAction = async (action: StrategyAction): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/strategy-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '操作失败');
    }
    
    return data;
  } catch (error) {
    console.error('执行攻略操作失败:', error);
    throw error;
  }
};

// 点赞攻略
export const likeStrategy = async (strategyId: string, userId: string): Promise<{
  liked: boolean;
  likeCount: number;
  message: string;
}> => {
  return await performStrategyAction({
    strategyId,
    userId,
    type: 'like'
  });
};

// 收藏攻略
export const favoriteStrategy = async (strategyId: string, userId: string): Promise<{
  favorited: boolean;
  favoriteCount: number;
  message: string;
}> => {
  return await performStrategyAction({
    strategyId,
    userId,
    type: 'favorite'
  });
};

// 评论攻略
export const commentStrategy = async (
  strategyId: string, 
  userId: string, 
  content: string, 
  userName: string
): Promise<{
  comment: any;
  commentCount: number;
  message: string;
}> => {
  return await performStrategyAction({
    strategyId,
    userId,
    type: 'comment',
    data: { content, userName }
  });
};

// 增加浏览量
export const viewStrategy = async (strategyId: string): Promise<{ viewCount: number }> => {
  return await performStrategyAction({
    strategyId,
    userId: 'system',
    type: 'view'
  });
};

// 置顶攻略（需要管理员密码）
export const pinStrategy = async (strategyId: string, password: string): Promise<{
  isPinned: boolean;
  message: string;
}> => {
  return await performStrategyAction({
    strategyId,
    userId: 'admin',
    type: 'pin',
    password
  });
};

// 删除攻略（需要管理员密码）
export const deleteStrategy = async (strategyId: string, password: string): Promise<{
  message: string;
}> => {
  return await performStrategyAction({
    strategyId,
    userId: 'admin',
    type: 'delete',
    password
  });
};

// 格式化攻略内容（Markdown支持）
export const formatStrategyContent = (content: string): string => {
  // 简单的Markdown格式化
  return content
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mb-2 mt-4">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mb-3 mt-6">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4 mt-8">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-200">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-blue-200">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-yellow-200 text-sm">$1</code>')
    .replace(/^- (.*$)/gm, '<li class="text-white/80 mb-1">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc list-inside ml-4 mb-4">$1</ul>')
    .replace(/^\d+\. (.*$)/gm, '<li class="text-white/80 mb-1">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ol class="list-decimal list-inside ml-4 mb-4">$1</ol>')
    .replace(/\n/g, '<br>');
};

// 验证攻略投稿数据
export const validateStrategySubmission = (submission: StrategySubmission): string[] => {
  const errors: string[] = [];
  
  if (!submission.title.trim()) {
    errors.push('攻略标题不能为空');
  }
  
  if (submission.title.length > 100) {
    errors.push('攻略标题不能超过100字符');
  }
  
  if (!submission.content.trim()) {
    errors.push('攻略内容不能为空');
  }
  
  if (submission.content.length > 10000) {
    errors.push('攻略内容不能超过10000字符');
  }
  
  if (!submission.author.trim()) {
    errors.push('作者名称不能为空');
  }
  
  if (submission.difficulty < 1 || submission.difficulty > 5) {
    errors.push('难度等级必须在1-5之间');
  }
  
  if (submission.tags.length > 10) {
    errors.push('标签数量不能超过10个');
  }
  
  // 检查标签长度
  const longTags = submission.tags.filter(tag => tag.length > 20);
  if (longTags.length > 0) {
    errors.push('标签长度不能超过20字符');
  }

  // 检查多媒体文件
  if (submission.mediaFiles && submission.mediaFiles.length > 0) {
    if (submission.mediaFiles.length > 10) {
      errors.push('多媒体文件数量不能超过10个');
    }

    submission.mediaFiles.forEach((media, index) => {
      if (!media.title.trim()) {
        errors.push(`第${index + 1}个媒体文件缺少标题`);
      }
      if (!media.url.trim()) {
        errors.push(`第${index + 1}个媒体文件缺少URL`);
      }
      if (!['image', 'video'].includes(media.type)) {
        errors.push(`第${index + 1}个媒体文件类型无效`);
      }
    });
  }
  
  return errors;
};

// 搜索攻略
export const searchStrategies = async (
  keyword: string,
  filters: Partial<StrategySearchParams> = {}
): Promise<Strategy[]> => {
  const searchParams: StrategySearchParams = {
    search: keyword,
    limit: filters.limit || 20,
    ...filters
  };
  
  const result = await getStrategies(searchParams);
  return result.strategies;
};

// 获取推荐攻略
export const getRecommendedStrategies = async (limit: number = 6): Promise<Strategy[]> => {
  const result = await getStrategies({
    sortBy: 'view_count',
    sortOrder: 'DESC',
    limit
  });
  return result.strategies;
};

// 获取最新攻略
export const getLatestStrategies = async (limit: number = 6): Promise<Strategy[]> => {
  const result = await getStrategies({
    sortBy: 'created_at',
    sortOrder: 'DESC',
    limit
  });
  return result.strategies;
};

// 获取热门攻略
export const getPopularStrategies = async (limit: number = 6): Promise<Strategy[]> => {
  const result = await getStrategies({
    sortBy: 'view_count',
    sortOrder: 'DESC',
    limit
  });
  return result.strategies;
};
