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

    console.log('=== Strategy Query Params ===');
    console.log('Params:', params);
    console.log('============================');

    // 简化查询逻辑，先获取所有数据再在应用层过滤
    const allStrategies = await sql`
      SELECT id, title, content, author, category, difficulty, tags,
             likes, favorites, comments, is_pinned, image_url, media_files,
             view_count, status, created_at, updated_at
      FROM strategies
      ORDER BY is_pinned DESC, created_at DESC
    `;

    console.log(`Found ${allStrategies.length} total strategies in database`);

    // 在应用层进行过滤
    let filteredStrategies = allStrategies;

    // 状态过滤
    if (status && status.trim() && status !== 'all' && status !== '') {
      filteredStrategies = filteredStrategies.filter(s => s.status === status.trim());
      console.log(`After status filter (${status}): ${filteredStrategies.length}`);
    }

    // 分类过滤
    if (category && category !== 'all' && category.trim()) {
      filteredStrategies = filteredStrategies.filter(s => s.category === category.trim());
      console.log(`After category filter (${category}): ${filteredStrategies.length}`);
    }

    // 难度过滤
    if (difficulty && difficulty !== 'all' && difficulty.toString().trim()) {
      const difficultyInt = parseInt(difficulty);
      if (!isNaN(difficultyInt)) {
        filteredStrategies = filteredStrategies.filter(s => s.difficulty === difficultyInt);
        console.log(`After difficulty filter (${difficultyInt}): ${filteredStrategies.length}`);
      }
    }

    // 搜索过滤
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredStrategies = filteredStrategies.filter(s => 
        s.title.toLowerCase().includes(searchTerm) || 
        s.content.toLowerCase().includes(searchTerm)
      );
      console.log(`After search filter (${searchTerm}): ${filteredStrategies.length}`);
    }

    // 分页处理
    const total = filteredStrategies.length;
    const limitInt = parseInt(limit);
    const offsetInt = parseInt(offset);
    const paginatedStrategies = filteredStrategies.slice(offsetInt, offsetInt + limitInt);

    console.log(`Pagination: offset=${offsetInt}, limit=${limitInt}, total=${total}`);
    console.log(`Returning ${paginatedStrategies.length} strategies`);

    // 格式化数据
    const formattedStrategies = paginatedStrategies.map(strategy => ({
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
        total: total,
        limit: limitInt,
        offset: offsetInt,
        hasMore: offsetInt + limitInt < total
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
