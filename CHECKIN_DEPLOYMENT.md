# 签到功能部署指南

## 📋 功能概述

本次更新为今夕公会官网添加了完整的签到系统和排行榜功能：

### ✨ 新增功能
- 🎯 **每日签到**：用户可以每天签到获得积分
- 🔥 **连续签到奖励**：连续签到获得额外积分
- 🏆 **多种排行榜**：总签到、连续签到、本月签到、积分排行榜
- 📊 **个人统计**：查看个人签到历史和数据
- 🎁 **积分系统**：签到获得积分，连续签到获得更多奖励

### 🎮 积分规则
- 每日签到：获得 **1 积分**
- 连续签到 3-6 天：每天获得 **2 积分**
- 连续签到 7+ 天：每天获得 **3 积分**

## 🗄️ 数据库配置

### 第一步：执行数据库脚本

在您的 **Neon 数据库控制台** 中执行以下SQL脚本：

```sql
-- 执行 database-checkin-schema.sql 文件中的所有内容
-- 或者复制下面的完整脚本：

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

-- 4. 创建签到函数（处理签到逻辑）
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
```

## 🚀 部署步骤

### 1. 确认文件结构
确保以下文件已经创建：
```
├── components/
│   ├── checkin-widget.tsx          # 签到UI组件
│   └── leaderboard-widget.tsx      # 排行榜UI组件
├── netlify/functions/
│   ├── checkin.js                  # 签到API
│   └── leaderboard.js              # 排行榜API
├── services/
│   └── checkin-service.ts          # 前端签到服务
├── types/
│   └── checkin.ts                  # 签到类型定义
└── database-checkin-schema.sql     # 数据库脚本
```

### 2. 构建项目
```bash
npm run build
```

### 3. 部署到Netlify
```bash
netlify deploy --prod
```

## 🧪 功能测试

部署完成后，请测试以下功能：

### 签到功能
1. **首次签到**：点击签到按钮，应该显示成功并获得1积分
2. **重复签到**：同一天再次尝试签到，应该提示"今天已经签到过了"
3. **连续签到**：第二天签到，应该显示连续2天
4. **签到历史**：查看签到历史记录

### 排行榜功能
1. **总签到排行榜**：显示总签到天数最多的用户
2. **连续签到排行榜**：显示当前连续签到最多的用户
3. **本月排行榜**：显示本月签到次数最多的用户
4. **积分排行榜**：显示总积分最高的用户
5. **最长连续签到排行榜**：显示历史最长连续签到记录

### 积分系统
1. **基础积分**：每日签到获得1积分
2. **连续奖励**：连续3天以上每天获得2积分
3. **超级奖励**：连续7天以上每天获得3积分

## 📍 新增页面入口

签到功能已添加到主页面中：
- **导航栏**：添加了"签到"链接
- **位置**：在"成员列表"和"留言墙"之间
- **布局**：左侧为签到面板，右侧为排行榜

## 🎯 API端点

新增的API端点：
- `GET /.netlify/functions/checkin?userId=xxx` - 获取用户签到状态
- `POST /.netlify/functions/checkin` - 执行签到操作
- `GET /.netlify/functions/leaderboard?type=total&limit=20` - 获取排行榜

## ❓ 故障排除

### 常见问题

**1. 签到按钮无响应**
- 检查浏览器控制台是否有JavaScript错误
- 确认API函数已正确部署

**2. 排行榜显示空白**
- 确认数据库表已创建
- 检查至少有一个用户已签到

**3. 积分计算错误**
- 检查数据库函数`perform_checkin`是否正确创建
- 查看数据库日志确认函数执行

**4. 数据无法保存**
- 确认数据库连接正常
- 检查环境变量`DATABASE_URL`配置

## 🎉 完成

恭喜！您的今夕公会官网现已具备完整的签到系统：
- ✅ 每日签到功能
- ✅ 连续签到奖励
- ✅ 多维度排行榜
- ✅ 个人数据统计
- ✅ 积分激励机制

用户现在可以通过签到系统增加参与度，与其他成员在排行榜上竞争，提升公会活跃度！
