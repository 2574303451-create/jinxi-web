-- 攻略墙多媒体文件数据库迁移脚本
-- 为现有的strategies表添加media_files字段

-- 检查media_files字段是否已存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategies' AND column_name = 'media_files'
  ) THEN
    -- 添加media_files字段
    ALTER TABLE strategies ADD COLUMN media_files JSONB DEFAULT '[]'::jsonb;
    
    -- 添加索引以提高查询性能
    CREATE INDEX IF NOT EXISTS idx_strategies_media_files ON strategies USING GIN(media_files);
    
    RAISE NOTICE 'Successfully added media_files column to strategies table';
  ELSE
    RAISE NOTICE 'media_files column already exists in strategies table';
  END IF;
END $$;

-- 为现有记录初始化空的media_files数组（如果需要的话）
UPDATE strategies 
SET media_files = '[]'::jsonb 
WHERE media_files IS NULL;

-- 验证更新
SELECT 
  COUNT(*) as total_strategies,
  COUNT(CASE WHEN media_files IS NOT NULL THEN 1 END) as with_media_files_field,
  COUNT(CASE WHEN jsonb_array_length(media_files) > 0 THEN 1 END) as with_media_files_data
FROM strategies;

RAISE NOTICE 'Media files migration completed successfully';
