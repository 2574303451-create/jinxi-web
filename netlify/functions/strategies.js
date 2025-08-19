// netlify/functions/strategies.js - 攻略墙主API
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
      return await handleGetStrategies(sql, event.queryStringParameters || {}, headers);
    }

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
  try {
    const {
      category = '',
      difficulty = '',
      search = '',
      limit = '12',
      offset = '0',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      status = 'published'
    } = params;

    let whereConditions = ['status = $1'];
    let queryParams = [status];
    let paramCount = 1;

    // 分类过滤
    if (category && category !== 'all') {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    // 难度过滤
    if (difficulty && difficulty !== 'all') {
      paramCount++;
      whereConditions.push(`difficulty = $${paramCount}`);
      queryParams.push(parseInt(difficulty));
    }

    // 搜索过滤
    if (search) {
      paramCount++;
      whereConditions.push(`(title ILIKE $${paramCount} OR content ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 构建排序子句
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // 置顶优先排序
    const orderClause = `ORDER BY is_pinned DESC, ${sortField} ${sortDirection}`;

    // 主查询
    const strategiesQuery = `
      SELECT id, title, content, author, category, difficulty, tags,
             likes, favorites, comments, is_pinned, image_url, media_files,
             view_count, status, created_at, updated_at
      FROM strategies
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const strategies = await sql.unsafe(strategiesQuery, queryParams);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM strategies
      ${whereClause}
    `;
    
    const [{ total }] = await sql.unsafe(countQuery, queryParams.slice(0, -2));

    // 格式化数据
    const formattedStrategies = strategies.map(strategy => ({
      id: strategy.id.toString(),
      title: strategy.title,
      content: strategy.content,
      author: strategy.author,
      category: strategy.category,
      difficulty: strategy.difficulty,
      tags: strategy.tags || [],
      likes: strategy.likes || [],
      favorites: strategy.favorites || [],
      comments: strategy.comments || [],
      isPinned: strategy.is_pinned,
      imageUrl: strategy.image_url,
      mediaFiles: strategy.media_files || [],
      viewCount: strategy.view_count,
      status: strategy.status,
      createdAt: new Date(strategy.created_at),
      updatedAt: new Date(strategy.updated_at)
    }));

    return resp(200, {
      strategies: formattedStrategies,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(total)
      }
    }, headers);
  } catch (error) {
    console.error('Get strategies error:', error);
    throw error;
  }
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

    // 确保数组格式正确
    const safeTags = Array.isArray(tags) ? tags : [];
    const safeMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];
    
    console.log('Creating strategy with data:', {
      title, author, category, difficulty, 
      tags: safeTags, 
      mediaFiles: safeMediaFiles
    });

    // 插入新攻略
    const [newStrategy] = await sql`
      INSERT INTO strategies (
        title, content, author, category, difficulty, tags, image_url, media_files
      ) VALUES (
        ${title}, ${content}, ${author}, ${category}, ${difficulty}, 
        ${JSON.stringify(safeTags)}, ${imageUrl}, ${JSON.stringify(safeMediaFiles)}
      ) RETURNING *
    `;

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
