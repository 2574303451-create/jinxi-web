# 完整部署指南

## 🎯 总览
您的今夕公会官网现已集成真正的后端数据库！所有访客将看到相同的留言墙内容。

## 📋 当前状态
✅ Netlify DB 已初始化（您已完成）  
✅ Neon Serverless 驱动已安装  
✅ API 函数已创建  
✅ 前端已更新使用真实 API  
⏳ 需要执行数据库表创建  
⏳ 需要配置环境变量  

## 🗄️ 第一步：创建数据库表

1. 登录您的 **Neon 控制台**
2. 选择 Netlify 为您创建的数据库
3. 在 SQL Editor 中执行以下 SQL：

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
  ('今夕_执手', '欢迎大家来到今夕公会留言墙！🎉', '公告', '#d69e2e'),
  ('今夕_淡意', '新人记得看群公告哦~', '提醒', '#3182ce'),
  ('匿名', '公会氛围真不错！', '闲聊', '#10b981')
ON CONFLICT DO NOTHING;
```

## ⚙️ 第二步：配置环境变量

### 在 Netlify 控制台配置：
1. 进入您的 Netlify 项目
2. 点击 **Site settings** → **Environment variables**
3. 添加变量：
   - **Key**: `DATABASE_URL`
   - **Value**: 您的 Neon 连接串（从 Neon 控制台获取）

### 或使用 CLI：
```bash
netlify env:set DATABASE_URL "postgresql://username:password@hostname:5432/database"
```

## 🧪 第三步：本地测试（可选）

1. 创建本地环境变量文件：
```bash
# 将 env-template.txt 重命名为 .env 并填入真实连接串
cp env-template.txt .env
# 编辑 .env 文件，填入您的数据库连接串
```

2. 本地测试：
```bash
# 安装 Netlify CLI（如未安装）
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 启动本地开发环境（包含函数）
npm run dev:netlify
```

3. 测试 API（可选）：
```bash
# 在另一个终端运行
npm run test:api
```

## 🚀 第四步：部署到生产环境

```bash
# 构建项目
npm run build

# 部署到 Netlify
netlify deploy --prod
```

## 🎉 完成！

部署成功后，您的留言墙将具备以下功能：

### ✨ 核心功能
- 📝 **发布留言**：支持昵称、分类、图片上传
- 💬 **实时回复**：每条留言都可以回复
- 😊 **表情反应**：6种表情反应（👍❤️😂😮😢😡）
- 📌 **置顶功能**：重要留言可置顶显示
- 🗂️ **分类筛选**：闲聊、公告、提醒、求助
- 🖼️ **图片支持**：Base64格式存储，支持预览
- ⏰ **准实时更新**：每4秒自动刷新

### 🔄 数据同步
- 所有访客看到相同内容
- 数据永久存储在 PostgreSQL
- 支持高并发访问
- 自动备份和恢复

## 🛠️ API 端点

部署后可用的 API：
- `GET /.netlify/functions/messages` - 获取所有留言
- `POST /.netlify/functions/messages` - 创建新留言  
- `POST /.netlify/functions/message-actions` - 回复/反应/置顶/删除

## ❓ 故障排除

### 常见问题：

**1. 环境变量未设置**
- 错误：`process.env.DATABASE_URL is undefined`
- 解决：检查 Netlify 环境变量配置

**2. 数据库连接失败**
- 错误：`connection refused` 或 `authentication failed`
- 解决：验证连接串格式和权限

**3. 表不存在**
- 错误：`relation "messages" does not exist`
- 解决：执行第一步的 SQL 创建表

**4. 本地开发问题**
- 使用 `netlify dev` 而不是 `npm run dev`
- 确保本地 `.env` 文件存在且正确

## 📞 技术支持

如遇问题，请检查：
1. Neon 数据库状态
2. Netlify 部署日志
3. 浏览器控制台错误
4. 环境变量配置

---

🎊 **恭喜！您的今夕公会官网现已具备完整的后端功能！**
