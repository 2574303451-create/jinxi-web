// netlify/functions/check-name-update.js - 检查用户名更新结果
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  // 设置 CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // 查询所有用户统计
    const userStats = await sql`
      SELECT user_name, total_checkins, continuous_checkins, total_points, last_checkin_date
      FROM user_checkin_stats 
      ORDER BY total_points DESC
    `;

    // 查询最近的签到记录
    const recentRecords = await sql`
      SELECT user_name, checkin_date, reward_points, created_at
      FROM checkin_records 
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userStats: userStats.map(stat => ({
          userName: stat.user_name,
          totalCheckins: stat.total_checkins,
          continuousCheckins: stat.continuous_checkins,
          totalPoints: stat.total_points,
          lastCheckinDate: stat.last_checkin_date
        })),
        recentRecords: recentRecords.map(record => ({
          userName: record.user_name,
          checkinDate: record.checkin_date,
          rewardPoints: record.reward_points,
          createdAt: record.created_at
        })),
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('检查用户名更新失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
