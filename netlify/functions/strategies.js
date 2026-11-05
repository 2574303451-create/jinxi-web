// netlify/functions/strategies.js - 攻略墙主API
const { neon } = require('@neondatabase/serverless');
const { readStrategies } = require('./_shared/strategy-read');
const { publicReadError } = require('./_shared/strategy-query');
const { publicReadDatabaseUrl } = require('./_shared/strategy-database');

exports.handler = async (event) => {
  
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

  if (event.httpMethod === 'GET') {
    try {
      return await handleGetStrategies(neon(publicReadDatabaseUrl(process.env)), event.queryStringParameters || {}, headers);
    } catch (error) {
      const result = publicReadError(error);
      return resp(result.status, result.body, { ...headers, 'Cache-Control': 'no-store' });
    }
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handleCreateStrategy(sql, body, headers);
    }

    return resp(405, { error: 'Method not allowed' }, headers);
  } catch (e) {
    console.error('Strategy API error:', e);
    return resp(500, { error: e.message || String(e) }, headers);
  }
};

// 获取攻略列表
async function handleGetStrategies(sql, params, headers) {
  const result = await readStrategies(sql, params);
  return resp(result.status, result.body, { ...headers, 'Cache-Control': 'no-store' });
}

// 创建新攻略
async function handleCreateStrategy(sql, body, headers) {
  try {
    const {
      title,
      content,
      author,
      category = 'PVE',
      difficulty = 1,
      tags = [],
      imageUrl = null,
      mediaFiles = []
    } = body;

    // 验证必填字段
    if (!title || !content || !author) {
      return resp(400, { error: '标题、内容和作者是必填项' }, headers);
    }

    // 验证字段长度
    if (title.length > 100) {
      return resp(400, { error: '标题长度不能超过100字符' }, headers);
    }

    if (content.length > 10000) {
      return resp(400, { error: '内容长度不能超过10000字符' }, headers);
    }

    if (tags.length > 10) {
      return resp(400, { error: '标签数量不能超过10个' }, headers);
    }

    // 验证难度等级
    if (difficulty < 1 || difficulty > 5) {
      return resp(400, { error: '难度等级必须在1-5之间' }, headers);
    }

    // 确保数组格式正确并清理数据
    const safeTags = Array.isArray(tags) ? tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0) : [];
    const safeMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];
    
    console.log('Creating strategy with data:', {
      title, author, category, difficulty, 
      tags: safeTags, 
      mediaFiles: safeMediaFiles,
      rawTagsType: typeof tags,
      rawTags: tags
    });

    // 测试：先查询当前所有攻略
    const beforeCount = await sql`SELECT COUNT(*) as total FROM strategies`;
    console.log('Before insert - total strategies:', beforeCount[0].total);

    // 插入新攻略 - 直接使用数组，让数据库自动处理JSON格式
    const [newStrategy] = await sql`
      INSERT INTO strategies (
        title, content, author, category, difficulty, tags, image_url, media_files
      ) VALUES (
        ${title}, ${content}, ${author}, ${category}, ${difficulty}, 
        ${safeTags}, ${imageUrl}, ${safeMediaFiles}
      ) RETURNING *
    `;

    console.log('Inserted strategy:', newStrategy);
    
    // 测试：插入后立即查询
    const afterCount = await sql`SELECT COUNT(*) as total FROM strategies`;
    console.log('After insert - total strategies:', afterCount[0].total);
    
    // 测试：直接查询刚插入的攻略
    const justInserted = await sql`SELECT * FROM strategies WHERE id = ${newStrategy.id}`;
    console.log('Just inserted strategy query:', justInserted);

    const formattedStrategy = {
      id: newStrategy.id.toString(),
      title: newStrategy.title,
      content: newStrategy.content,
      author: newStrategy.author,
      category: newStrategy.category,
      difficulty: newStrategy.difficulty,
      tags: newStrategy.tags || [],
      likes: newStrategy.likes || [],
      favorites: newStrategy.favorites || [],
      comments: newStrategy.comments || [],
      isPinned: newStrategy.is_pinned,
      imageUrl: newStrategy.image_url,
      mediaFiles: newStrategy.media_files || [],
      viewCount: newStrategy.view_count,
      status: newStrategy.status,
      createdAt: new Date(newStrategy.created_at),
      updatedAt: new Date(newStrategy.updated_at)
    };

    return resp(201, { 
      success: true, 
      strategy: formattedStrategy,
      message: '攻略发布成功！'
    }, headers);
  } catch (error) {
    console.error('Create strategy error:', error);
    throw error;
  }
}

function resp(status, data, headers) {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(data),
  };
}
