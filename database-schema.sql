-- 创建留言墙数据表
-- 请在 Neon 控制台执行此 SQL

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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(is_pinned DESC, created_at DESC);

-- 插入一些示例数据（可选）
INSERT INTO messages (name, content, category, color) VALUES
  ('今夕_执手', '欢迎大家来到今夕公会留言墙！', '公告', '#d69e2e'),
  ('今夕_淡意', '新人记得看群公告哦~', '提醒', '#3182ce'),
  ('匿名', '公会氛围真不错！', '闲聊', '#10b981')
ON CONFLICT DO NOTHING;
