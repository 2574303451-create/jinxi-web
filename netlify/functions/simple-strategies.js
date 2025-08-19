// 简化版攻略查询函数，用于调试
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Simple strategies query...');
    
    // 最简单的查询，不带任何条件
    const allStrategies = await sql`
      SELECT id, title, content, author, category, difficulty, 
             status, created_at
      FROM strategies
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('Query result:', allStrategies);
    console.log('Count:', allStrategies.length);
    
    // 只查询published状态的
    const publishedStrategies = await sql`
      SELECT id, title, author, status, created_at
      FROM strategies
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('Published strategies:', publishedStrategies);
    console.log('Published count:', publishedStrategies.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allStrategies: allStrategies,
        publishedStrategies: publishedStrategies,
        counts: {
          all: allStrategies.length,
          published: publishedStrategies.length
        }
      })
    };

  } catch (error) {
    console.error('Simple query error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
