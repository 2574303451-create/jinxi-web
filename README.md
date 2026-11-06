# 今夕公会官网

弹弹堂-今夕公会官方网站

## 🚀 快速开始

### 本地开发
```bash
npm ci --include=dev
npm run dev
```

### 构建项目
```bash
npm run build
```

构建完成后，静态文件将输出到 `out/` 目录。

本分支验证 Node.js 24.22.2 LTS、npm 11.19.1、Next.js 16.4.5 和 React 19.3.1。先执行 `npm run typecheck`、`npm test` 和 `npm run lint`。构建也校验类型。

`npm start` 用 Node 在 127.0.0.1:3000 预览静态产物并读取生成的 CSP，可用 `npm start -- 3064` 指定端口。Functions 使用授权的独立测试环境。兼容入口 `npm run export` 调用同一静态构建。 [运行时验收](artifacts/b2-a-6/DELIVERY.md)

## 🌐 Netlify 部署

### 自动部署
当前集成分支在 GitHub 审核和本机运行。Netlify Git 构建跳过，发布命令与旧账号导入入口返回拒绝。云 TEST 资源由管理员完成核验和授权后，另建部署候选。已审核的托管构建参数如下。

   - 构建命令: `npm ci --include=dev && npm run build`
   - 发布目录: `out`
   - Node.js 版本: 24.22.2
   - NPM 版本: 11.19.1

管理员填写实际站点、Functions 运行时、隔离及托管 CSP 证据。 [TEST 验收表](artifacts/b2-a-7/TEST_SIGNOFF.md)

## 🔧 问题修复

本项目已修复了以下 Netlify 部署问题：

1. **Tailwind CSS 兼容性** - 使用标准 v3 语法
2. **PostCSS 配置** - 标准 tailwindcss 和 autoprefixer 插件
3. **CSS 变量** - 使用标准 HSL 颜色值
4. **Next.js 静态导出** - 配置为静态站点生成
5. **字体加载** - 优化字体加载和回退

## 📁 项目结构

```
jinxi-web/
├── app/                 # Next.js 应用目录
├── components/          # React 组件
├── lib/                 # 工具函数
├── public/              # 静态资源
├── styles/              # 样式文件
├── out/                 # 构建输出目录
└── netlify.toml        # Netlify 配置
```

## 🎨 技术栈

- **框架**: Next.js 16.4.5、React 19.3.1
- **样式**: Tailwind CSS
- **组件**: Radix UI
- **动画**: Framer Motion
- **字体**: Geist Sans/Mono

## 📱 特性

- 响应式设计
- 深色/浅色主题
- 现代化 UI 组件
- 流畅动画效果
- 静态站点生成

## 🚨 注意事项

- 确保所有图片和资源路径正确
- 检查字体加载是否正常
- 验证 CSS 变量是否正确应用
- 测试响应式布局在不同设备上的表现

## 📞 支持

如果遇到问题，请检查：
1. Netlify 构建日志
2. 浏览器控制台错误
3. 网络请求状态
4. CSS 和 JavaScript 文件是否正确加载

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)
