-- 签到系统数据库表结构
-- 执行此SQL来添加签到功能到现有数据库

-- 1. 签到记录表
CREATE TABLE IF NOT EXISTS checkin_records (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,           -- 用户标识符
  user_name TEXT NOT NULL,         -- 用户昵称
  checkin_date DATE NOT NULL,      -- 签到日期（只记录日期，不含时间）
  checkin_time TIMESTAMPTZ DEFAULT NOW(), -- 签到具体时间
  reward_points INTEGER DEFAULT 1, -- 签到奖励积分
  is_continuous BOOLEAN DEFAULT FALSE, -- 是否为连续签到
  continuous_days INTEGER DEFAULT 1,   -- 当次连续签到天数
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 用户签到统计表
CREATE TABLE IF NOT EXISTS user_checkin_stats (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,    -- 用户标识符
  user_name TEXT NOT NULL,         -- 用户昵称
  total_checkins INTEGER DEFAULT 0, -- 总签到天数
  continuous_checkins INTEGER DEFAULT 0, -- 当前连续签到天数
  max_continuous INTEGER DEFAULT 0, -- 最长连续签到记录
  total_points INTEGER DEFAULT 0,   -- 总积分
  last_checkin_date DATE,          -- 最后签到日期
  first_checkin_date DATE,         -- 首次签到日期
  this_month_checkins INTEGER DEFAULT 0, -- 本月签到次数
  this_year_checkins INTEGER DEFAULT 0,  -- 今年签到次数
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_checkin_records_user_date ON checkin_records(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkin_records_date ON checkin_records(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total ON user_checkin_stats(total_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_continuous ON user_checkin_stats(continuous_checkins DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_monthly ON user_checkin_stats(this_month_checkins DESC);

-- 4. 创建或替换签到函数（处理签到逻辑）
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
    -- 已经签到过了
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
    -- 首次签到，创建统计记录
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
    -- 计算连续签到天数
    IF user_stats.last_checkin_date = yesterday_date THEN
      -- 连续签到
      new_continuous := user_stats.continuous_checkins + 1;
      -- 连续签到奖励（3天以上每天+1积分，7天以上每天+2积分）
      IF new_continuous >= 7 THEN
        reward_points := 3;
      ELSIF new_continuous >= 3 THEN
        reward_points := 2;
      END IF;
    ELSE
      -- 不连续，重新开始
      new_continuous := 1;
      reward_points := 1;
    END IF;
    
    -- 更新统计信息
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

-- 5. 插入一些示例数据（可选）
-- 注意：在生产环境中请谨慎使用
/*
INSERT INTO user_checkin_stats (user_id, user_name, total_checkins, continuous_checkins, max_continuous, total_points, last_checkin_date, first_checkin_date, this_month_checkins, this_year_checkins) VALUES
  ('demo_user_1', '今夕_执手', 15, 3, 7, 25, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '20 days', 8, 15),
  ('demo_user_2', '今夕_淡意', 22, 1, 10, 45, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '30 days', 12, 22),
  ('demo_user_3', '今夕_星辰', 8, 2, 5, 12, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '10 days', 5, 8)
ON CONFLICT (user_id) DO NOTHING;
*/
