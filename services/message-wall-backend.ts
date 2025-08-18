// 真实后端 API 服务
import { Message, Reply, Reaction } from '../types/message-wall';

// 使用真实后端API连接Neon数据库
const USE_LOCAL_STORAGE = false;
const API_BASE = '/.netlify/functions';

// 获取所有留言
export const getMessages = async (): Promise<Message[]> => {
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换数据格式以匹配前端接口
    return data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name || '匿名',
      content: item.content,
      timestamp: new Date(item.timestamp),
      color: item.color || '#3b82f6',
      reactions: item.reactions || [],
      replies: (item.replies || []).map((reply: any) => ({
        ...reply,
        timestamp: new Date(reply.timestamp)
      })),
      category: item.category || '闲聊',
      isPinned: item.isPinned || false,
      imageUrl: item.imageUrl
    }));
  } catch (error) {
    console.error('获取留言失败:', error);
    throw error;
  }
};

// 添加新留言
export const addMessage = async (message: {
  name: string;
  content: string;
  category: string;
  color: string;
  imageUrl?: string;
}): Promise<Message> => {
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: message.name,
        content: message.content,
        category: message.category,
        color: message.color,
        imageUrl: message.imageUrl
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id.toString(),
      name: data.name || '匿名',
      content: data.content,
      timestamp: new Date(data.timestamp),
      color: data.color || '#3b82f6',
      reactions: data.reactions || [],
      replies: data.replies || [],
      category: data.category || '闲聊',
      isPinned: data.isPinned || false,
      imageUrl: data.imageUrl
    };
  } catch (error) {
    console.error('添加留言失败:', error);
    throw error;
  }
};

// 添加回复
export const addReply = async (messageId: string, reply: {
  name: string;
  content: string;
  color: string;
}): Promise<Reply> => {
  try {
    const response = await fetch(`${API_BASE}/message-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        action: 'reply',
        data: reply
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  } catch (error) {
    console.error('添加回复失败:', error);
    throw error;
  }
};

// 切换反应
export const toggleReaction = async (messageId: string, reactionType: string, userName: string): Promise<Reaction[]> => {
  console.log('发送表情反应请求:', { messageId, reactionType, userName });
  try {
    const response = await fetch(`${API_BASE}/message-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        action: 'reaction',
        data: { type: reactionType, userName }
      })
    });
    
    console.log('表情反应API响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('表情反应API错误响应:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('表情反应API成功响应:', result);
    return result;
  } catch (error) {
    console.error('切换反应失败:', error);
    throw error;
  }
};

// 切换置顶
export const togglePin = async (messageId: string, password?: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/message-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        action: 'pin',
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.pinned;
  } catch (error) {
    console.error('切换置顶失败:', error);
    throw error;
  }
};

// 删除留言
export const deleteMessage = async (messageId: string, password?: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/message-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        action: 'delete',
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('删除留言失败:', error);
    throw error;
  }
};
