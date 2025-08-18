-- 完整数据库设置脚本
-- 此脚本将确保留言墙功能正常，并添加签到功能
-- 在 Neon SQL Editor 中执行

-- =====================================
-- 第一部分：确保留言墙表存在并有数据
-- =====================================

-- 1. 创建留言墙表（如果不存在）
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT '匿名',
  content TEXT NOT NULL,
  category TEXT DEFAULT '闲聊',
  color TEXT DEFAULT '#3b82f6',
  reactions JSONB DEFAULT '[]'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建留言墙索引
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(is_pinned DESC, created_at DESC);

-- 3. 插入示例留言数据（如果表为空）
INSERT INTO messages (name, content, category, color) 
SELECT '今夕_执手', '欢迎大家来到今夕公会留言墙！🎉', '公告', '#d69e2e'
WHERE NOT EXISTS (SELECT 1 FROM messages);

INSERT INTO messages (name, content, category, color) 
SELECT '今夕_淡意', '新人记得看群公告哦~', '提醒', '#3182ce'
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE name = '今夕_淡意');

INSERT INTO messages (name, content, category, color) 
SELECT '匿名', '公会氛围真不错！', '闲聊', '#10b981'
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE content = '公会氛围真不错！');

-- =====================================
-- 第二部分：添加签到功能表
-- =====================================

-- 4. 创建签到记录表
CREATE TABLE IF NOT EXISTS checkin_records (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  checkin_time TIMESTAMPTZ DEFAULT NOW(),
  reward_points INTEGER DEFAULT 1,
  is_continuous BOOLEAN DEFAULT FALSE,
  continuous_days INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建用户签到统计表
CREATE TABLE IF NOT EXISTS user_checkin_stats (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  total_checkins INTEGER DEFAULT 0,
  continuous_checkins INTEGER DEFAULT 0,
  max_continuous INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  last_checkin_date DATE,
  first_checkin_date DATE,
  this_month_checkins INTEGER DEFAULT 0,
  this_year_checkins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建签到相关索引
CREATE INDEX IF NOT EXISTS idx_checkin_records_user_date ON checkin_records(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkin_records_date ON checkin_records(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total ON user_checkin_stats(total_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_continuous ON user_checkin_stats(continuous_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_monthly ON user_checkin_stats(this_month_checkins DESC);

-- 7. 创建签到处理函数
CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id TEXT,
  p_user_name TEXT
) RETURNS JSON AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  existing_checkin checkin_records%ROWTYPE;
  user_stats user_checkin_stats%ROWTYPE;
  new_continuous INTEGER := 1;
  reward_points INTEGER := 1;
  result JSON;
BEGIN
  -- 检查今天是否已经签到
  SELECT * INTO existing_checkin 
  FROM checkin_records 
  WHERE user_id = p_user_id AND checkin_date = today_date;
  
  IF FOUND THEN
    result := json_build_object(
      'success', false,
      'message', '今天已经签到过了！',
      'already_checked', true
    );
    RETURN result;
  END IF;
  
  -- 获取或创建用户统计信息
  SELECT * INTO user_stats 
  FROM user_checkin_stats 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- 首次签到
    INSERT INTO user_checkin_stats (
      user_id, user_name, total_checkins, continuous_checkins, 
      max_continuous, total_points, last_checkin_date, first_checkin_date,
      this_month_checkins, this_year_checkins
    ) VALUES (
      p_user_id, p_user_name, 1, 1, 1, reward_points, 
      today_date, today_date, 1, 1
    );
    new_continuous := 1;
  ELSE
    -- 计算连续签到
    IF user_stats.last_checkin_date = yesterday_date THEN
      new_continuous := user_stats.continuous_checkins + 1;
      IF new_continuous >= 7 THEN
        reward_points := 3;
      ELSIF new_continuous >= 3 THEN
        reward_points := 2;
      END IF;
    ELSE
      new_continuous := 1;
      reward_points := 1;
    END IF;
    
    -- 更新统计
    UPDATE user_checkin_stats SET
      user_name = p_user_name,
      total_checkins = total_checkins + 1,
      continuous_checkins = new_continuous,
      max_continuous = GREATEST(max_continuous, new_continuous),
      total_points = total_points + reward_points,
      last_checkin_date = today_date,
      this_month_checkins = CASE 
        WHEN EXTRACT(MONTH FROM last_checkin_date) = EXTRACT(MONTH FROM today_date) 
        AND EXTRACT(YEAR FROM last_checkin_date) = EXTRACT(YEAR FROM today_date)
        THEN this_month_checkins + 1 
        ELSE 1 
      END,
      this_year_checkins = CASE 
        WHEN EXTRACT(YEAR FROM last_checkin_date) = EXTRACT(YEAR FROM today_date)
        THEN this_year_checkins + 1 
        ELSE 1 
      END,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- 插入签到记录
  INSERT INTO checkin_records (
    user_id, user_name, checkin_date, reward_points, 
    is_continuous, continuous_days
  ) VALUES (
    p_user_id, p_user_name, today_date, reward_points,
    new_continuous > 1, new_continuous
  );
  
  result := json_build_object(
    'success', true,
    'message', '签到成功！',
    'reward_points', reward_points,
    'continuous_days', new_continuous,
    'already_checked', false
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 第三部分：验证设置结果
-- =====================================

-- 8. 显示设置结果
SELECT '✅ Database setup completed!' as status;

-- 检查留言墙
SELECT 'Message wall table:' as check_type, COUNT(*) as record_count FROM messages;

-- 检查签到表
SELECT 'Checkin records table:' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkin_records') 
            THEN 'Created' ELSE 'Not found' END as status;

SELECT 'User stats table:' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_checkin_stats') 
            THEN 'Created' ELSE 'Not found' END as status;

SELECT 'Checkin function:' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'perform_checkin') 
            THEN 'Created' ELSE 'Not found' END as status;

-- 显示所有表
SELECT 'All tables:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
