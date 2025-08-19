-- 攻略墙多媒体迁移脚本（简化版本）
-- 请在 Neon 控制台执行此 SQL

-- 检查并添加 media_files 字段
DO $$
BEGIN
  -- 检查 media_files 字段是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategies' AND column_name = 'media_files'
  ) THEN
    -- 添加 media_files 字段
    ALTER TABLE strategies ADD COLUMN media_files JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added media_files column to strategies table';
  ELSE
    RAISE NOTICE 'media_files column already exists';
  END IF;

  -- 检查并创建索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'strategies' AND indexname = 'idx_strategies_media_files'
  ) THEN
    CREATE INDEX idx_strategies_media_files ON strategies USING GIN(media_files);
    RAISE NOTICE 'Created media_files index';
  ELSE
    RAISE NOTICE 'media_files index already exists';
  END IF;
END $$;

-- 初始化现有记录的 media_files 字段
UPDATE strategies 
SET media_files = '[]'::jsonb 
WHERE media_files IS NULL;

-- 验证结果
SELECT 
  'Migration completed successfully!' as result,
  COUNT(*) as total_strategies,
  COUNT(CASE WHEN media_files IS NOT NULL THEN 1 END) as with_media_files_field,
  COUNT(CASE WHEN jsonb_array_length(media_files) > 0 THEN 1 END) as with_media_files_data
FROM strategies;
