// netlify/functions/strategy-actions.js - 攻略操作API
const { neon } = require('@neondatabase/serverless');

// 管理密码（从环境变量获取）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'defaultTempPassword123!';

// 验证管理员密码
function verifyAdminPassword(password) {
  if (!password) return false;
  // 添加密码哈希验证
  const crypto = require('crypto');
  const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
  const hashedAdmin = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
  return hashedInput === hashedAdmin;
}

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

  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' }, headers);
  }

  try {
    const { action, strategyId, userId, data, password } = JSON.parse(event.body || '{}');
    
    if (!strategyId || !action) {
      return resp(400, { error: '攻略ID和操作类型是必填项' }, headers);
    }

    // 检查攻略是否存在
    const [strategy] = await sql`
      SELECT * FROM strategies WHERE id = ${parseInt(strategyId, 10)}
    `;

    if (!strategy) {
      return resp(404, { error: '攻略不存在' }, headers);
    }

    let result;
    switch (action) {
      case 'like':
        result = await handleLike(sql, strategyId, userId);
        break;
      case 'favorite':
        result = await handleFavorite(sql, strategyId, userId);
        break;
      case 'comment':
        result = await handleComment(sql, strategyId, userId, data);
        break;
      case 'view':
        result = await handleView(sql, strategyId);
        break;
      case 'pin':
        if (!verifyAdminPassword(password)) {
          return resp(401, { error: '管理员密码错误' }, headers);
        }
        result = await handlePin(sql, strategyId);
        break;
      case 'delete':
        if (!verifyAdminPassword(password)) {
          return resp(401, { error: '管理员密码错误' }, headers);
        }
        result = await handleDelete(sql, strategyId);
        break;
      default:
        return resp(400, { error: '不支持的操作类型' }, headers);
    }

    return resp(200, result, headers);
  } catch (e) {
    console.error('Strategy action error:', e);
    return resp(500, { error: e.message || String(e) }, headers);
  }
};

// 点赞操作
async function handleLike(sql, strategyId, userId) {
  if (!userId) {
    throw new Error('用户ID是必填项');
  }

  const [strategy] = await sql`
    SELECT likes FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  const likes = strategy.likes || [];
  const hasLiked = likes.includes(userId);
  
  let updatedLikes;
  let message;
  
  if (hasLiked) {
    // 取消点赞
    updatedLikes = likes.filter(id => id !== userId);
    message = '取消点赞成功';
  } else {
    // 添加点赞
    updatedLikes = [...likes, userId];
    message = '点赞成功';
  }

  await sql`
    UPDATE strategies 
    SET likes = ${JSON.stringify(updatedLikes)}
    WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    message,
    liked: !hasLiked,
    likeCount: updatedLikes.length
  };
}

// 收藏操作
async function handleFavorite(sql, strategyId, userId) {
  if (!userId) {
    throw new Error('用户ID是必填项');
  }

  const [strategy] = await sql`
    SELECT favorites FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  const favorites = strategy.favorites || [];
  const hasFavorited = favorites.includes(userId);
  
  let updatedFavorites;
  let message;
  
  if (hasFavorited) {
    // 取消收藏
    updatedFavorites = favorites.filter(id => id !== userId);
    message = '取消收藏成功';
  } else {
    // 添加收藏
    updatedFavorites = [...favorites, userId];
    message = '收藏成功';
  }

  await sql`
    UPDATE strategies 
    SET favorites = ${JSON.stringify(updatedFavorites)}
    WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    message,
    favorited: !hasFavorited,
    favoriteCount: updatedFavorites.length
  };
}

// 评论操作
async function handleComment(sql, strategyId, userId, commentData) {
  if (!userId || !commentData || !commentData.content) {
    throw new Error('用户ID和评论内容是必填项');
  }

  const { content, userName } = commentData;
  
  if (content.length > 500) {
    throw new Error('评论长度不能超过500字符');
  }

  const [strategy] = await sql`
    SELECT comments FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  const comments = strategy.comments || [];
  const newComment = {
    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName: userName || '匿名用户',
    content,
    timestamp: new Date().toISOString()
  };

  const updatedComments = [...comments, newComment];

  await sql`
    UPDATE strategies 
    SET comments = ${JSON.stringify(updatedComments)}
    WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    message: '评论发布成功',
    comment: newComment,
    commentCount: updatedComments.length
  };
}

// 浏览量增加
async function handleView(sql, strategyId) {
  await sql`
    UPDATE strategies 
    SET view_count = view_count + 1
    WHERE id = ${parseInt(strategyId, 10)}
  `;

  const [strategy] = await sql`
    SELECT view_count FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    viewCount: strategy.view_count
  };
}

// 置顶操作
async function handlePin(sql, strategyId) {
  const [strategy] = await sql`
    SELECT is_pinned FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  const newPinnedState = !strategy.is_pinned;

  await sql`
    UPDATE strategies 
    SET is_pinned = ${newPinnedState}
    WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    message: newPinnedState ? '攻略置顶成功' : '取消置顶成功',
    isPinned: newPinnedState
  };
}

// 删除操作
async function handleDelete(sql, strategyId) {
  await sql`
    DELETE FROM strategies WHERE id = ${parseInt(strategyId, 10)}
  `;

  return {
    success: true,
    message: '攻略删除成功'
  };
}

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
