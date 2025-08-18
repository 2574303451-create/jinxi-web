// 混合后端服务：本地存储 + 云端同步
import { Message, Reply, Reaction } from '../types/message-wall';

const STORAGE_KEY = "guild-messages";
const SYNC_KEY = "guild-messages-sync";
const SYNC_INTERVAL = 30000; // 30秒同步一次

// 简单的云端存储服务（使用 JSONBin 或类似服务）
const CLOUD_STORAGE_URL = 'https://api.jsonbin.io/v3/b/YOUR_BIN_ID'; // 需要替换为实际的bin ID

// 本地存储操作
const getLocalMessages = (): Message[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const messages = JSON.parse(stored);
    return messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
      replies: msg.replies.map((reply: any) => ({
        ...reply,
        timestamp: new Date(reply.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Error loading local messages:', error);
    return [];
  }
};

const saveLocalMessages = (messages: Message[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    localStorage.setItem(SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving local messages:', error);
  }
};

// 云端同步（可选，如果有可用的云端存储）
const syncWithCloud = async (messages: Message[]): Promise<void> => {
  // 这里可以实现与云端的同步逻辑
  // 由于API函数有问题，暂时跳过
  console.log('Cloud sync skipped - using local storage only');
};

// 获取所有留言
export const getMessages = async (): Promise<Message[]> => {
  const messages = getLocalMessages();
  
  // 如果没有消息，添加一些默认消息
  if (messages.length === 0) {
    const defaultMessages: Message[] = [
      {
        id: '1',
        name: '今夕_执手',
        content: '欢迎大家来到今夕公会留言墙！🎉\n\n这里是我们公会成员交流的地方，大家可以：\n- 发布公告和重要通知\n- 分享游戏心得和攻略\n- 闲聊日常生活\n- 寻求帮助和建议\n\n让我们一起建设更好的公会氛围！',
        timestamp: new Date(Date.now() - 3600000),
        color: '#d69e2e',
        reactions: [{ type: '👍', count: 5, users: ['user1', 'user2', 'user3', 'user4', 'user5'] }],
        replies: [],
        category: '公告',
        isPinned: true
      },
      {
        id: '2',
        name: '今夕_淡意',
        content: '新人记得看群公告哦~\n\n特别提醒：\n✅ 每日签到不要忘记\n✅ 公会活动积极参与\n✅ 遇到问题及时求助\n\n大家互相帮助，共同进步！',
        timestamp: new Date(Date.now() - 1800000),
        color: '#3182ce',
        reactions: [{ type: '❤️', count: 3, users: ['user1', 'user2', 'user3'] }],
        replies: [
          {
            id: 'reply1',
            name: '萌新小白',
            content: '谢谢提醒！已经看完公告了~',
            timestamp: new Date(Date.now() - 1500000),
            color: '#10b981'
          }
        ],
        category: '提醒',
        isPinned: false
      },
      {
        id: '3',
        name: '今夕_恐龙',
        content: '最新战术分析已更新！\n\n本周重点：\n🎯 阵容搭配优化\n🎯 地图控制要点\n🎯 团队配合训练\n\n有疑问的小伙伴可以私聊我~',
        timestamp: new Date(Date.now() - 900000),
        color: '#805ad5',
        reactions: [
          { type: '👍', count: 8, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8'] },
          { type: '🔥', count: 2, users: ['user9', 'user10'] }
        ],
        replies: [],
        category: '公告',
        isPinned: false
      },
      {
        id: '4',
        name: '匿名',
        content: '公会氛围真不错！👍\n\n刚加入就感受到了大家的热情，期待和大家一起游戏！',
        timestamp: new Date(Date.now() - 600000),
        color: '#10b981',
        reactions: [{ type: '😊', count: 4, users: ['user1', 'user2', 'user3', 'user4'] }],
        replies: [
          {
            id: 'reply2',
            name: '今夕_啵咕',
            content: '欢迎新成员！有什么需要帮助的随时找我们~',
            timestamp: new Date(Date.now() - 500000),
            color: '#e53e3e'
          }
        ],
        category: '闲聊',
        isPinned: false
      },
      {
        id: '5',
        name: '今夕_啵咕',
        content: '周末公会活动报名开始啦！🎮\n\n时间：本周六晚8点\n内容：团队竞技赛\n奖励：丰厚积分+专属称号\n\n想参加的小伙伴快来报名！',
        timestamp: new Date(Date.now() - 300000),
        color: '#e53e3e',
        reactions: [
          { type: '🎮', count: 12, users: Array.from({length: 12}, (_, i) => `user${i+1}`) },
          { type: '🏆', count: 6, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'] }
        ],
        replies: [
          {
            id: 'reply3',
            name: '游戏达人',
            content: '我要报名！什么时候截止？',
            timestamp: new Date(Date.now() - 250000),
            color: '#3b82f6'
          },
          {
            id: 'reply4',
            name: '今夕_啵咕',
            content: '周五晚上12点截止报名，记得提前哦~',
            timestamp: new Date(Date.now() - 200000),
            color: '#e53e3e'
          }
        ],
        category: '公告',
        isPinned: false
      }
    ];
    
    saveLocalMessages(defaultMessages);
    return defaultMessages;
  }
  
  return messages;
};

// 添加新留言
export const addMessage = async (message: {
  name: string;
  content: string;
  category: string;
  color: string;
  imageUrl?: string;
}): Promise<Message> => {
  const messages = await getMessages();
  
  const newMessage: Message = {
    id: Date.now().toString(),
    name: message.name || '匿名',
    content: message.content,
    timestamp: new Date(),
    color: message.color,
    reactions: [],
    replies: [],
    category: message.category,
    isPinned: false,
    imageUrl: message.imageUrl
  };
  
  messages.unshift(newMessage); // 添加到开头
  saveLocalMessages(messages);
  
  // 尝试同步到云端
  try {
    await syncWithCloud(messages);
  } catch (error) {
    console.log('Cloud sync failed, using local storage only');
  }
  
  return newMessage;
};

// 添加回复
export const addReply = async (messageId: string, reply: {
  name: string;
  content: string;
  color: string;
}): Promise<Reply> => {
  const messages = await getMessages();
  const message = messages.find(m => m.id === messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  const newReply: Reply = {
    id: Date.now().toString(),
    name: reply.name || '匿名',
    content: reply.content,
    timestamp: new Date(),
    color: reply.color
  };
  
  message.replies.push(newReply);
  saveLocalMessages(messages);
  
  return newReply;
};

// 切换反应
export const toggleReaction = async (messageId: string, reactionType: string, userName: string): Promise<Reaction[]> => {
  const messages = await getMessages();
  const message = messages.find(m => m.id === messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  let reaction = message.reactions.find(r => r.type === reactionType);
  
  if (!reaction) {
    reaction = { type: reactionType, count: 0, users: [] };
    message.reactions.push(reaction);
  }
  
  const userIndex = reaction.users.indexOf(userName);
  if (userIndex > -1) {
    reaction.users.splice(userIndex, 1);
    reaction.count--;
    if (reaction.count === 0) {
      const reactionIndex = message.reactions.indexOf(reaction);
      message.reactions.splice(reactionIndex, 1);
    }
  } else {
    reaction.users.push(userName);
    reaction.count++;
  }
  
  saveLocalMessages(messages);
  return message.reactions;
};

// 切换置顶
export const togglePin = async (messageId: string): Promise<boolean> => {
  const messages = await getMessages();
  const message = messages.find(m => m.id === messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  message.isPinned = !message.isPinned;
  saveLocalMessages(messages);
  
  return message.isPinned;
};

// 删除留言
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  const messages = await getMessages();
  const index = messages.findIndex(m => m.id === messageId);
  
  if (index === -1) {
    throw new Error('Message not found');
  }
  
  messages.splice(index, 1);
  saveLocalMessages(messages);
  
  return true;
};
