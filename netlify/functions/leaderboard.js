// netlify/functions/leaderboard-fixed.js - 修复重复用户名问题的排行榜
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

  if (event.httpMethod !== 'GET') {
    return resp(405, { error: 'Method not allowed' }, headers);
  }

  try {
    const { type = 'total', limit = 15 } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 100);
    const [{ point_account_table }] = await sql`
      SELECT to_regclass('public.point_account') AS point_account_table
    `;
    const hasPointAccount = !!point_account_table;
    
    let query;
    let title;

    switch (type) {
      case 'total':
        title = '总签到排行榜';
        query = sql`
          WITH ranked_users AS (
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date,
                   ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY total_checkins DESC, total_points DESC) as rn
            FROM user_checkin_stats 
            WHERE total_checkins > 0
          )
          SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date
          FROM ranked_users 
          WHERE rn = 1
          ORDER BY total_checkins DESC, max_continuous DESC, total_points DESC
          LIMIT ${parsedLimit}
        `;
        break;

      case 'continuous':
        title = '连续签到排行榜';
        query = sql`
          WITH ranked_users AS (
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date,
                   ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY continuous_checkins DESC, total_checkins DESC) as rn
            FROM user_checkin_stats 
            WHERE continuous_checkins > 0
          )
          SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date
          FROM ranked_users 
          WHERE rn = 1
          ORDER BY continuous_checkins DESC, total_checkins DESC, total_points DESC
          LIMIT ${parsedLimit}
        `;
        break;

      case 'monthly':
        title = '本月签到排行榜';
        query = sql`
          WITH ranked_users AS (
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, this_month_checkins, last_checkin_date,
                   ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY this_month_checkins DESC, continuous_checkins DESC) as rn
            FROM user_checkin_stats 
            WHERE this_month_checkins > 0
          )
          SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, this_month_checkins, last_checkin_date
          FROM ranked_users 
          WHERE rn = 1
          ORDER BY this_month_checkins DESC, continuous_checkins DESC, total_points DESC
          LIMIT ${parsedLimit}
        `;
        break;

      case 'yearly':
        title = '今年签到排行榜';
        query = sql`
          WITH ranked_users AS (
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, this_year_checkins, last_checkin_date,
                   ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY this_year_checkins DESC, continuous_checkins DESC) as rn
            FROM user_checkin_stats 
            WHERE this_year_checkins > 0
          )
          SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, this_year_checkins, last_checkin_date
          FROM ranked_users 
          WHERE rn = 1
          ORDER BY this_year_checkins DESC, continuous_checkins DESC, total_points DESC
          LIMIT ${parsedLimit}
        `;
        break;

      case 'points':
        title = '积分排行榜';
        if (hasPointAccount) {
          query = sql`
            SELECT
              pa.user_id,
              COALESCE(p.nickname, p.display_name, pa.user_id) AS user_name,
              COALESCE(ucs.total_checkins, 0) AS total_checkins,
              COALESCE(ucs.continuous_checkins, 0) AS continuous_checkins,
              COALESCE(ucs.max_continuous, 0) AS max_continuous,
              pa.balance AS total_points
            FROM point_account pa
            LEFT JOIN guild_member_accounts a
              ON a.login_account = pa.user_id
            LEFT JOIN guild_member_profiles p
              ON p.employee_no = a.employee_no
            LEFT JOIN user_checkin_stats ucs
              ON ucs.user_id = pa.user_id
            WHERE pa.balance > 0
            ORDER BY pa.balance DESC, COALESCE(ucs.total_checkins, 0) DESC
            LIMIT ${parsedLimit}
          `;
        } else {
          // compatibility fallback before points schema migration
          query = sql`
            WITH ranked_users AS (
              SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date,
                     ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY total_points DESC, total_checkins DESC) as rn
              FROM user_checkin_stats 
              WHERE total_points > 0
            )
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date
            FROM ranked_users 
            WHERE rn = 1
            ORDER BY total_points DESC, total_checkins DESC, max_continuous DESC
            LIMIT ${parsedLimit}
          `;
        }
        break;

      case 'max_continuous':
        title = '最长连续排行榜';
        query = sql`
          WITH ranked_users AS (
            SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date,
                   ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY max_continuous DESC, total_checkins DESC) as rn
            FROM user_checkin_stats 
            WHERE max_continuous > 0
          )
          SELECT user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date
          FROM ranked_users 
          WHERE rn = 1
          ORDER BY max_continuous DESC, total_checkins DESC, total_points DESC
          LIMIT ${parsedLimit}
        `;
        break;

      default:
        return resp(400, { error: 'Invalid leaderboard type' }, headers);
    }

    const results = await query;
    
    const entries = results.map((user, index) => {
      let value;
      let label;
      
      switch (type) {
        case 'total':
          value = parseInt(user.total_checkins);
          label = `${value}天`;
          break;
        case 'continuous':
          value = parseInt(user.continuous_checkins);
          label = `连续${value}天`;
          break;
        case 'monthly':
          value = parseInt(user.this_month_checkins || 0);
          label = `本月${value}天`;
          break;
        case 'yearly':
          value = parseInt(user.this_year_checkins || 0);
          label = `今年${value}天`;
          break;
        case 'points':
          value = parseInt(user.total_points);
          label = `${value}积分`;
          break;
        case 'max_continuous':
          value = parseInt(user.max_continuous);
          label = `最长${value}天`;
          break;
        default:
          value = 0;
          label = '0';
      }

      return {
        rank: index + 1,
        userId: user.user_id ? String(user.user_id) : `merged_${user.user_name}`, // 使用合并后的虚拟ID
        userName: user.user_name,
        value: value,
        label: label,
        totalCheckins: parseInt(user.total_checkins) || 0,
        continuousCheckins: parseInt(user.continuous_checkins) || 0,
        maxContinuous: parseInt(user.max_continuous) || 0,
        totalPoints: parseInt(user.total_points) || 0
      };
    });

    return resp(200, {
      type,
      title,
      entries,
      updatedAt: new Date(),
      totalEntries: entries.length,
      note: '已合并相同用户名的数据'
    }, headers);

  } catch (e) {
    console.error('Leaderboard API error:', e);
    return resp(500, { error: e.message || String(e) }, headers);
  }
}

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
