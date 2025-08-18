-- 更新匿名用户名称为"执手问年华"
-- 执行时间：根据需要运行

-- 1. 更新用户签到统计表中的匿名用户
UPDATE user_checkin_stats 
SET user_name = '执手问年华'
WHERE user_name IN ('匿名', '匿名用户', 'Anonymous', '') OR user_name IS NULL;

-- 2. 更新签到记录表中的匿名用户
UPDATE checkin_records 
SET user_name = '执手问年华'
WHERE user_name IN ('匿名', '匿名用户', 'Anonymous', '') OR user_name IS NULL;

-- 3. 查看更新后的统计数据（可选）
SELECT 
    user_name,
    total_checkins,
    continuous_checkins,
    max_continuous,
    total_points,
    last_checkin_date
FROM user_checkin_stats 
WHERE user_name = '执手问年华'
ORDER BY total_points DESC;

-- 4. 查看更新后的记录数据（可选，显示最近10条）
SELECT 
    user_name,
    checkin_date,
    reward_points,
    continuous_days,
    created_at
FROM checkin_records 
WHERE user_name = '执手问年华'
ORDER BY created_at DESC
LIMIT 10;
