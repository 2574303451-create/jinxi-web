// netlify/functions/message-actions.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  // 设置 CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS'
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
    const { messageId, action, data, password } = JSON.parse(event.body || '{}');

    if (!messageId || !action) {
      return resp(400, { error: 'messageId and action are required' }, headers);
    }

    // 验证管理密码（用于删除和置顶操作）
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'defaultTempPassword123!';
    const verifyAdminPassword = (inputPassword) => {
      // 添加密码哈希验证（简化版本）
      const crypto = require('crypto');
      const hashedInput = crypto.createHash('sha256').update(inputPassword).digest('hex');
      const hashedAdmin = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
      return hashedInput === hashedAdmin;
    };

    if (action === 'reply') {
      const { name, content, color } = data;
      
      console.log('Reply action - messageId:', messageId, 'type:', typeof messageId);
      console.log('Reply action - data:', data);
      
      if (!content || !content.trim()) {
        return resp(400, { error: 'reply content is required' }, headers);
      }

      // 确保 messageId 是数字类型
      const numericMessageId = parseInt(messageId, 10);
      if (isNaN(numericMessageId)) {
        console.error('Invalid messageId:', messageId);
        return resp(400, { error: 'invalid messageId format' }, headers);
      }

      try {
        // 获取当前回复
        const messages = await sql`SELECT id, replies FROM messages WHERE id = ${numericMessageId}`;
        console.log('Query result for messageId', numericMessageId, ':', messages);
        
        if (!messages || messages.length === 0) {
          return resp(404, { error: 'message not found', messageId: numericMessageId }, headers);
        }

        const message = messages[0];
        
        // 安全地解析现有回复
        let replies = [];
        try {
          replies = message.replies ? JSON.parse(message.replies) : [];
        } catch (parseError) {
          console.warn('Failed to parse existing replies, using empty array:', parseError);
          replies = [];
        }

        const newReply = {
          id: Date.now().toString(),
          name: name || '匿名',
          content: content.trim(),
          color: color || '#3b82f6',
          timestamp: new Date().toISOString()
        };
        
        console.log('Creating new reply:', newReply);
        
        replies.push(newReply);

        // 更新数据库
        const updateResult = await sql`
          UPDATE messages 
          SET replies = ${JSON.stringify(replies)} 
          WHERE id = ${numericMessageId}
          RETURNING id
        `;
        
        console.log('Update result:', updateResult);
        
        if (updateResult.length === 0) {
          return resp(500, { error: 'failed to update message' }, headers);
        }
        
        return resp(200, newReply, headers);
        
      } catch (dbError) {
        console.error('Database error in reply action:', dbError);
        return resp(500, { error: 'database error', details: dbError.message }, headers);
      }
    }

    if (action === 'reaction') {
      const { type, userName } = data;
      console.log('处理表情反应:', { messageId, type, userName });
      
      if (!type || !userName) {
        return resp(400, { error: 'reaction type and userName are required' }, headers);
      }

      // 获取当前反应
      const [message] = await sql`SELECT reactions FROM messages WHERE id = ${messageId}`;
      if (!message) {
        console.log('留言不存在:', messageId);
        return resp(404, { error: 'message not found' }, headers);
      }

      console.log('数据库中的reactions字段:', message.reactions, typeof message.reactions);
      
      let reactions;
      try {
        // 处理不同的数据格式
        if (typeof message.reactions === 'string') {
          reactions = JSON.parse(message.reactions || '[]');
        } else if (Array.isArray(message.reactions)) {
          reactions = message.reactions;
        } else {
          reactions = [];
        }
      } catch (parseError) {
        console.error('JSON解析错误:', parseError, 'reactions数据:', message.reactions);
        reactions = [];
      }
      
      console.log('解析后的reactions:', reactions);
      
      let reaction = reactions.find(r => r.type === type);

      if (!reaction) {
        reaction = { type, count: 0, users: [] };
        reactions.push(reaction);
      }

      // 切换用户的反应状态
      const userIndex = reaction.users.indexOf(userName);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        reaction.count--;
        if (reaction.count === 0) {
          const reactionIndex = reactions.indexOf(reaction);
          reactions.splice(reactionIndex, 1);
        }
      } else {
        reaction.users.push(userName);
        reaction.count++;
      }

      console.log('更新后的reactions:', reactions);
      
      await sql`UPDATE messages SET reactions = ${JSON.stringify(reactions)} WHERE id = ${messageId}`;
      return resp(200, reactions, headers);
    }

    if (action === 'pin') {
      // 验证管理密码
      if (!password || !verifyAdminPassword(password)) {
        return resp(401, { error: '需要管理员权限，密码错误' }, headers);
      }

      const [message] = await sql`SELECT is_pinned FROM messages WHERE id = ${messageId}`;
      if (!message) {
        return resp(404, { error: 'message not found' }, headers);
      }

      const newPinnedState = !message.is_pinned;
      await sql`UPDATE messages SET is_pinned = ${newPinnedState} WHERE id = ${messageId}`;
      return resp(200, { pinned: newPinnedState }, headers);
    }

    if (action === 'delete') {
      // 验证管理密码
      if (!password || !verifyAdminPassword(password)) {
        return resp(401, { error: '需要管理员权限，密码错误' }, headers);
      }

      await sql`DELETE FROM messages WHERE id = ${messageId}`;
      return resp(200, { deleted: true }, headers);
    }

    return resp(400, { error: 'invalid action' }, headers);
  } catch (e) {
    console.error('Database error:', e);
    return resp(500, { error: e.message || String(e) }, headers);
  }
};

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
