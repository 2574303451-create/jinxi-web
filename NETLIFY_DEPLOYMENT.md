# 🚀 今夕公会 - Netlify部署指南

> 历史资料，仅供代码审计。当前分支保持发布冻结。禁止照用下文的直传、生产发布和替换环境配置命令。管理员验收先走 [A8 资源核验](artifacts/b2-a-8/TEST_RESOURCES.md)。

## 快速部署（推荐）

### 1. 自动化部署脚本

我已经为你准备了完整的自动化部署脚本，一键完成所有步骤：

```bash
npm run deploy
```

这个命令会：
- ✅ 检查项目文件完整性
- ✅ 清理旧的构建文件
- ✅ 安装所有依赖
- ✅ 构建项目
- ✅ 验证构建结果
- ✅ 部署到Netlify

### 2. 预览部署（测试用）

如果想先预览效果再正式发布：

```bash
npm run build
npm run deploy:preview
```

### 3. 生产环境部署

直接部署到生产环境：

```bash
npm run build
npm run deploy:prod
```

## 手动部署步骤

如果需要手动控制每个步骤：

### 步骤1：安装Netlify CLI

```bash
npm install -g netlify-cli
```

### 步骤2：登录Netlify

```bash
netlify login
```

### 步骤3：链接站点（首次部署）

```bash
netlify link
```
或者创建新站点：
```bash
netlify init
```

### 步骤4：构建项目

```bash
npm install
npm run build
```

### 步骤5：部署

```bash
# 预览部署
netlify deploy --dir=out

# 生产部署
netlify deploy --prod --dir=out
```

## 环境变量配置

如果你的项目需要环境变量，在Netlify控制台中添加：

### 在Netlify控制台设置：
1. 进入你的站点设置
2. 选择 "Environment variables"
3. 添加需要的环境变量：

```bash
# 数据库配置（如果使用）
NEON_DATABASE_URL=your_database_url
NEON_API_KEY=your_api_key

# 其他配置
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=your_domain
```

### 本地环境变量（可选）：
创建 `.env.local` 文件：

```bash
# .env.local
NEON_DATABASE_URL=your_database_url
NEON_API_KEY=your_api_key
```

## 项目配置说明

### netlify.toml 配置
```toml
[build]
  command = "npm install && npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"
```

### Next.js 配置
```js
// next.config.mjs
const nextConfig = {
  output: 'export',          // 静态导出
  distDir: 'out',           // 输出目录
  trailingSlash: true,      // 添加尾部斜杠
  images: {
    unoptimized: true       // 禁用图片优化（静态站点）
  }
}
```

## Netlify Functions

你的项目包含以下Netlify函数：
- `checkin.js` - 签到功能
- `messages.js` - 消息墙功能
- `strategies.js` - 策略墙功能
- `leaderboard.js` - 排行榜功能
- 以及其他API函数

这些函数会自动部署到 `/.netlify/functions/` 路径。

## 部署后验证

部署成功后，访问你的网站并测试：

### 🎯 核心功能测试
- [ ] 页面正常加载
- [ ] 彩蛋系统工作正常
- [ ] 签到功能正常
- [ ] 消息墙功能正常
- [ ] 策略墙功能正常
- [ ] 排行榜显示正常

### 🎨 界面测试
- [ ] 响应式设计正常
- [ ] 动画效果正常
- [ ] 主题切换正常
- [ ] 侧边栏进度条正常

### 🔧 API测试
- [ ] 后端函数正常响应
- [ ] 数据库连接正常
- [ ] 文件上传功能正常

## 常见问题解决

### 问题1：构建失败
```bash
# 清理缓存重新构建
rm -rf .next out node_modules
npm install
npm run build
```

### 问题2：函数部署失败
检查 `netlify/functions/` 中的函数语法：
```bash
# 本地测试函数
netlify dev
```

### 问题3：环境变量问题
确保在Netlify控制台中正确设置了所有必要的环境变量。

### 问题4：域名配置
在Netlify控制台的 "Domain management" 中配置自定义域名。

## 成功部署后

🎉 **恭喜！你的今夕公会网站已经成功部署到Netlify！**

### 获取部署信息：
```bash
netlify status
```

### 查看部署历史：
```bash
netlify deploy --list
```

### 查看站点信息：
```bash
netlify sites:list
```

## 持续部署设置

### Git集成部署
1. 在Netlify控制台连接你的GitHub仓库
2. 设置构建配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `out`
3. 每次推送到main分支时会自动部署

### 本地开发环境
```bash
# 启动本地开发服务器
npm run dev

# 启动Netlify本地开发环境
npm run dev:netlify
```

---

## 📞 需要帮助？

如果在部署过程中遇到任何问题，请检查：
1. Netlify构建日志
2. 浏览器控制台错误信息
3. 项目的linter错误

祝部署顺利！🚀
