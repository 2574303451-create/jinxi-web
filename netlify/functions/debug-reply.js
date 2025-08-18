// netlify/functions/debug-reply.js - 调试回复功能
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  // 设置 CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { messageId, data } = JSON.parse(event.body || '{}');
    
    console.log('Debug - Received data:', { messageId, data });
    console.log('Debug - messageId type:', typeof messageId);
    
    // 检查留言是否存在
    console.log('Debug - Querying message with ID:', messageId);
    const messages = await sql`SELECT id, replies FROM messages WHERE id = ${messageId}`;
    console.log('Debug - Query result:', messages);
    
    if (messages.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'message not found',
          messageId,
          debug: 'No message found with this ID'
        })
      };
    }
    
    const message = messages[0];
    console.log('Debug - Found message:', message);
    
    // 解析现有回复
    let replies = [];
    try {
      replies = JSON.parse(message.replies || '[]');
      console.log('Debug - Existing replies:', replies);
    } catch (parseError) {
      console.error('Debug - JSON parse error:', parseError);
      replies = [];
    }
    
    // 创建新回复
    const newReply = {
      id: Date.now().toString(),
      name: data.name || '匿名',
      content: data.content,
      color: data.color || '#3b82f6',
      timestamp: new Date().toISOString()
    };
    
    console.log('Debug - New reply:', newReply);
    
    replies.push(newReply);
    
    // 更新数据库
    console.log('Debug - Updating database with replies:', replies);
    const updateResult = await sql`
      UPDATE messages 
      SET replies = ${JSON.stringify(replies)} 
      WHERE id = ${messageId}
      RETURNING id, replies
    `;
    
    console.log('Debug - Update result:', updateResult);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        newReply,
        totalReplies: replies.length,
        debug: 'Reply added successfully'
      })
    };
    
  } catch (error) {
    console.error('Debug - Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        debug: 'Internal server error'
      })
    };
  }
};
