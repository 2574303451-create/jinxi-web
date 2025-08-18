-- 数据库诊断脚本
-- 在 Neon SQL Editor 中执行此脚本来检查数据库状态

-- 1. 检查是否存在留言墙表
SELECT 'Checking for message wall table...' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- 2. 检查留言墙数据
SELECT 'Checking message wall data...' as status;
SELECT COUNT(*) as message_count FROM messages;

-- 3. 显示最近几条留言（如果存在）
SELECT 'Recent messages:' as status;
SELECT id, name, content, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. 检查是否存在签到表
SELECT 'Checking for checkin tables...' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('checkin_records', 'user_checkin_stats');

-- 5. 列出所有表
SELECT 'All tables in database:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
