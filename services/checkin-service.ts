// 签到系统前端服务
import { 
  CheckinResult, 
  CheckinStatus, 
  CheckinRecord, 
  UserCheckinStats,
  Leaderboard 
} from '@/types/checkin';

const API_BASE = '/.netlify/functions';

// 获取签到状态
export const getCheckinStatus = async (userId: string): Promise<CheckinStatus> => {
  try {
    const response = await fetch(`${API_BASE}/checkin?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      hasCheckedToday: data.hasCheckedToday,
      userStats: data.userStats ? {
        ...data.userStats,
        updatedAt: new Date(data.userStats.updatedAt)
      } : null,
      todayRecord: data.todayRecord ? {
        ...data.todayRecord,
        checkinTime: new Date(data.todayRecord.checkinTime),
        createdAt: new Date(data.todayRecord.createdAt)
      } : null
    };
  } catch (error) {
    console.error('获取签到状态失败:', error);
    throw error;
  }
};

// 执行签到
export const performCheckin = async (userId: string, userName: string): Promise<CheckinResult> => {
  try {
    const response = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userName,
        action: 'checkin'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('签到失败:', error);
    throw error;
  }
};

// 获取签到历史
export const getCheckinHistory = async (userId: string, limit: number = 30): Promise<CheckinRecord[]> => {
  try {
    const response = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        action: 'history',
        limit
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.records.map((record: any) => ({
      ...record,
      checkinTime: new Date(record.checkinTime),
      createdAt: new Date(record.createdAt)
    }));
  } catch (error) {
    console.error('获取签到历史失败:', error);
    throw error;
  }
};

// 获取排行榜
export const getLeaderboard = async (
  type: 'total' | 'continuous' | 'monthly' | 'yearly' | 'points' | 'max_continuous' = 'total',
  limit: number = 50
): Promise<Leaderboard> => {
  try {
    const response = await fetch(
      `${API_BASE}/leaderboard?type=${type}&limit=${limit}`,
      {
        method: 'GET',
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      ...data,
      updatedAt: new Date(data.updatedAt)
    };
  } catch (error) {
    console.error('获取排行榜失败:', error);
    throw error;
  }
};

// 获取所有排行榜数据
export const getAllLeaderboards = async (limit: number = 50) => {
  try {
    const [total, continuous, monthly, points, maxContinuous] = await Promise.all([
      getLeaderboard('total', limit),
      getLeaderboard('continuous', limit),
      getLeaderboard('monthly', limit),
      getLeaderboard('points', limit),
      getLeaderboard('max_continuous', limit)
    ]);

    return {
      total,
      continuous,
      monthly,
      points,
      maxContinuous
    };
  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    throw error;
  }
};

// 格式化签到天数
export const formatCheckinDays = (days: number): string => {
  if (days === 0) return '未签到';
  if (days === 1) return '1天';
  return `${days}天`;
};

// 格式化连续签到
export const formatContinuousDays = (days: number): string => {
  if (days === 0) return '未连续';
  if (days === 1) return '1天';
  return `连续${days}天`;
};

// 计算签到奖励积分
export const calculateRewardPoints = (continuousDays: number): number => {
  if (continuousDays >= 7) return 3;
  if (continuousDays >= 3) return 2;
  return 1;
};

// 获取签到鼓励文案
export const getCheckinMessage = (continuousDays: number): string => {
  if (continuousDays === 1) return '签到成功！新的开始！';
  if (continuousDays < 3) return `签到成功！连续${continuousDays}天`;
  if (continuousDays < 7) return `签到成功！连续${continuousDays}天，保持下去！`;
  if (continuousDays < 15) return `签到成功！连续${continuousDays}天，你真棒！`;
  if (continuousDays < 30) return `签到成功！连续${continuousDays}天，太厉害了！`;
  return `签到成功！连续${continuousDays}天，签到大师！`;
};
