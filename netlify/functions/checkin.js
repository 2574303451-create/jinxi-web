// netlify/functions/checkin.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  // 设置 CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
    if (event.httpMethod === 'GET') {
      // 获取签到状态
      const { userId } = event.queryStringParameters || {};
      
      if (!userId) {
        return resp(400, { error: 'userId is required' }, headers);
      }

      // 获取用户今天的签到记录
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const [todayRecord] = await sql`
        SELECT * FROM checkin_records 
        WHERE user_id = ${userId} AND checkin_date = ${today}
      `;

      // 获取用户统计信息
      const [userStats] = await sql`
        SELECT * FROM user_checkin_stats 
        WHERE user_id = ${userId}
      `;

      return resp(200, {
        hasCheckedToday: !!todayRecord,
        userStats: userStats ? formatUserStats(userStats) : null,
        todayRecord: todayRecord ? formatCheckinRecord(todayRecord) : null
      }, headers);
    }

    if (event.httpMethod === 'POST') {
      // 执行签到
      const { userId, userName, action } = JSON.parse(event.body || '{}');
      
      if (!userId || !userName) {
        return resp(400, { error: 'userId and userName are required' }, headers);
      }

      if (action === 'checkin') {
        // 执行签到
        const [result] = await sql`SELECT perform_checkin(${userId}, ${userName})`;
        const checkinResult = result.perform_checkin;
        
        return resp(200, checkinResult, headers);
      }

      if (action === 'history') {
        // 获取签到历史
        const { limit = 30 } = JSON.parse(event.body);
        
        const records = await sql`
          SELECT * FROM checkin_records 
          WHERE user_id = ${userId} 
          ORDER BY checkin_date DESC 
          LIMIT ${limit}
        `;
        
        return resp(200, {
          records: records.map(formatCheckinRecord)
        }, headers);
      }

      return resp(400, { error: 'invalid action' }, headers);
    }

    return resp(405, { error: 'Method not allowed' }, headers);
  } catch (e) {
    console.error('Checkin API error:', e);
    return resp(500, { error: e.message || String(e) }, headers);
  }
};

// 格式化用户统计数据
function formatUserStats(stats) {
  return {
    id: stats.id.toString(),
    userId: stats.user_id,
    userName: stats.user_name,
    totalCheckins: stats.total_checkins || 0,
    continuousCheckins: stats.continuous_checkins || 0,
    maxContinuous: stats.max_continuous || 0,
    totalPoints: stats.total_points || 0,
    lastCheckinDate: stats.last_checkin_date,
    firstCheckinDate: stats.first_checkin_date,
    thisMonthCheckins: stats.this_month_checkins || 0,
    thisYearCheckins: stats.this_year_checkins || 0,
    updatedAt: new Date(stats.updated_at)
  };
}

// 格式化签到记录数据
function formatCheckinRecord(record) {
  return {
    id: record.id.toString(),
    userId: record.user_id,
    userName: record.user_name,
    checkinDate: record.checkin_date,
    checkinTime: new Date(record.checkin_time),
    rewardPoints: record.reward_points || 1,
    isContinuous: record.is_continuous || false,
    continuousDays: record.continuous_days || 1,
    createdAt: new Date(record.created_at)
  };
}

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
