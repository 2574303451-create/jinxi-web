// netlify/functions/messages.js
const { neon } = require('@neondatabase/serverless');

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
  
  let sql;
  try {
    sql = neon(process.env.DATABASE_URL);
    console.log('Database connection initialized');
  } catch (initError) {
    console.error('Database initialization error:', initError);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database initialization failed', details: initError.message })
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

  try {
    if (event.httpMethod === 'GET') {
      console.log('Executing GET query...');
      const rows = await sql`
        SELECT id, name, content, category, color, reactions, replies, 
               is_pinned, image_url, created_at
        FROM messages
        ORDER BY is_pinned DESC, created_at DESC
        LIMIT 100
      `;
      console.log('Query successful, rows:', rows.length);
      
      // 转换数据格式以匹配前端接口
      const formattedRows = rows.map(row => ({
        id: row.id.toString(),
        name: row.name || '匿名',
        content: row.content,
        timestamp: row.created_at,
        color: row.color || '#3b82f6',
        reactions: typeof row.reactions === 'string' ? JSON.parse(row.reactions) : (row.reactions || []),
        replies: typeof row.replies === 'string' ? JSON.parse(row.replies) : (row.replies || []),
        category: row.category || '闲聊',
        isPinned: row.is_pinned || false,
        imageUrl: row.image_url
      }));
      
      return resp(200, formattedRows, headers);
    }

    if (event.httpMethod === 'POST') {
      const { name = '匿名', content, category = '闲聊', color = '#3b82f6', imageUrl } = JSON.parse(event.body || '{}');
      
      if (!content || !content.trim()) {
        return resp(400, { error: 'empty message' }, headers);
      }

      console.log('Inserting new message:', { name, content, category, color, imageUrl });
      
      const result = await sql`
        INSERT INTO messages(name, content, category, color, image_url, reactions, replies, is_pinned)
        VALUES (${name}, ${content}, ${category}, ${color}, ${imageUrl || null}, '[]'::jsonb, '[]'::jsonb, false)
        RETURNING id, name, content, category, color, reactions, replies, is_pinned, image_url, created_at
      `;
      
      console.log('Insert successful:', result[0]);
      
      // 转换数据格式以匹配前端接口
      const formattedResult = {
        id: result[0].id.toString(),
        name: result[0].name || '匿名',
        content: result[0].content,
        timestamp: result[0].created_at,
        color: result[0].color || '#3b82f6',
        reactions: typeof result[0].reactions === 'string' ? JSON.parse(result[0].reactions) : (result[0].reactions || []),
        replies: typeof result[0].replies === 'string' ? JSON.parse(result[0].replies) : (result[0].replies || []),
        category: result[0].category || '闲聊',
        isPinned: result[0].is_pinned || false,
        imageUrl: result[0].image_url
      };
      
      return resp(201, formattedResult, headers);
    }

    return resp(405, { error: 'method not allowed' }, headers);
  } catch (e) {
    console.error('Database error:', e);
    console.error('Error stack:', e.stack);
    return resp(500, { error: e.message || String(e), stack: e.stack }, headers);
  }
};

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
