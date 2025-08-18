-- 快速签到功能数据库设置
-- 在 Neon SQL Editor 中执行此脚本

-- 1. 签到记录表
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

-- 2. 用户签到统计表
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

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_checkin_records_user_date ON checkin_records(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkin_records_date ON checkin_records(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total ON user_checkin_stats(total_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_continuous ON user_checkin_stats(continuous_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_monthly ON user_checkin_stats(this_month_checkins DESC);

-- 4. 签到处理函数
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
  
  -- 返回结果
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

-- 5. 验证创建成功
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('checkin_records', 'user_checkin_stats');

SELECT 'Function created successfully!' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'perform_checkin';
