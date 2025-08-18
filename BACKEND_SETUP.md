# 后端数据库设置指南

## 第一步：数据库设置（已完成）
您已经完成了 Netlify DB 的初始化。

## 第二步：创建数据表
请在您的 Neon 控制台执行以下 SQL：

```sql
-- 创建留言墙数据表
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
```

## 第三步：配置环境变量

### 本地开发
1. 在项目根目录创建 `.env` 文件
2. 添加数据库连接串：
```
DATABASE_URL=你的Neon连接串
```

### 生产环境（Netlify）
在 Netlify 项目设置中添加环境变量：
- 变量名：`DATABASE_URL`
- 变量值：你的 Neon 连接串

或使用 CLI：
```bash
netlify env:set DATABASE_URL "你的连接串"
```

## 第四步：本地测试
```bash
# 安装 Netlify CLI（如未安装）
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 本地开发（会同时启动站点和函数）
netlify dev
```

## 第五步：部署
```bash
# 构建并部署
npm run build
netlify deploy --prod
```

## API 端点
部署后可用的 API：
- `GET /.netlify/functions/messages` - 获取所有留言
- `POST /.netlify/functions/messages` - 创建新留言
- `POST /.netlify/functions/message-actions` - 处理回复、反应、置顶、删除等操作

## 数据结构
留言表字段说明：
- `id`: 自增主键
- `name`: 用户昵称
- `content`: 留言内容
- `category`: 分类（闲聊、公告、提醒、求助）
- `color`: 用户颜色
- `reactions`: JSON 格式的反应数据
- `replies`: JSON 格式的回复数据
- `is_pinned`: 是否置顶
- `image_url`: 图片 URL（Base64 或外链）
- `created_at`: 创建时间

## 注意事项
1. 确保 Neon 数据库已完成 "Claim" 操作
2. 环境变量必须正确配置
3. 本地测试时使用 `netlify dev` 而不是 `npm run dev`
4. 图片以 Base64 格式存储，注意大小限制
5. 每4秒自动刷新数据，实现准实时更新
