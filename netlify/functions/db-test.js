// 简单的数据库测试函数
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
    console.log('=== DB Test Debug ===');
    
    // 1. 测试基本连接
    const basicTest = await sql`SELECT NOW() as current_time`;
    console.log('Basic connection test:', basicTest);
    
    // 2. 检查表是否存在
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'strategies'
      ) as exists
    `;
    console.log('Table exists:', tableExists);
    
    // 3. 获取表结构
    const tableSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'strategies'
      ORDER BY ordinal_position
    `;
    console.log('Table schema:', tableSchema);
    
    // 4. 统计总记录数
    const totalCount = await sql`SELECT COUNT(*) as total FROM strategies`;
    console.log('Total records:', totalCount);
    
    // 5. 获取最新的5条记录（如果有的话）
    const latestRecords = await sql`
      SELECT id, title, author, status, created_at 
      FROM strategies 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    console.log('Latest records:', latestRecords);
    
    // 6. 测试不同的查询方式
    const allPublished = await sql`
      SELECT COUNT(*) as count 
      FROM strategies 
      WHERE status = 'published'
    `;
    console.log('Published count:', allPublished);
    
    const allRecords = await sql`
      SELECT COUNT(*) as count 
      FROM strategies
    `;
    console.log('All records count:', allRecords);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: {
          connectionTest: basicTest,
          tableExists: tableExists[0].exists,
          tableSchema: tableSchema,
          totalCount: totalCount[0].total,
          latestRecords: latestRecords,
          publishedCount: allPublished[0].count,
          allRecordsCount: allRecords[0].count
        }
      })
    };

  } catch (error) {
    console.error('DB Test error:', error);
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
