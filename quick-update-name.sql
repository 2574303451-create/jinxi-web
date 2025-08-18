-- 🎯 快速更新：将匿名用户改名为"执手问年华"
-- 请在 Neon 数据库的 SQL Editor 中执行以下代码：

-- 更新用户签到统计表
UPDATE user_checkin_stats 
SET user_name = '执手问年华'
WHERE user_name IN ('匿名', '匿名用户', 'Anonymous', '') OR user_name IS NULL;

-- 更新签到记录表  
UPDATE checkin_records 
SET user_name = '执手问年华'
WHERE user_name IN ('匿名', '匿名用户', 'Anonymous', '') OR user_name IS NULL;

-- 查看更新结果
SELECT user_name, total_checkins, total_points FROM user_checkin_stats WHERE user_name = '执手问年华';
