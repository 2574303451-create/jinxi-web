// netlify/functions/messages-pg.js
const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('Function started, method:', event.httpMethod);
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'DATABASE_URL not configured' })
    };
  }

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

  let client;
  try {
    // 创建数据库连接
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    console.log('Database connected');

    if (event.httpMethod === 'GET') {
      console.log('Executing GET query...');
      const result = await client.query(`
        SELECT id, name, content, category, color, reactions, replies, 
               is_pinned, image_url, created_at
        FROM messages
        ORDER BY is_pinned DESC, created_at DESC
        LIMIT 100
      `);
      console.log('Query successful, rows:', result.rows.length);
      return resp(200, result.rows, headers);
    }

    if (event.httpMethod === 'POST') {
      const { name = '匿名', content, category = '闲聊', color = '#3b82f6', imageUrl } = JSON.parse(event.body || '{}');
      
      if (!content || !content.trim()) {
        return resp(400, { error: 'empty message' }, headers);
      }

      console.log('Executing POST query...');
      const result = await client.query(`
        INSERT INTO messages(name, content, category, color, image_url, reactions, replies, is_pinned)
        VALUES ($1, $2, $3, $4, $5, '[]', '[]', false)
        RETURNING id, name, content, category, color, reactions, replies, is_pinned, image_url, created_at
      `, [name, content, category, color, imageUrl || null]);
      
      console.log('Insert successful');
      return resp(201, result.rows[0], headers);
    }

    return resp(405, { error: 'method not allowed' }, headers);
  } catch (e) {
    console.error('Database error:', e);
    console.error('Error stack:', e.stack);
    return resp(500, { error: e.message || String(e), details: e.stack }, headers);
  } finally {
    if (client) {
      try {
        await client.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
