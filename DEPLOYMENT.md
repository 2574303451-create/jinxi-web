# Netlify 部署说明

## 问题修复

本项目已修复了以下Netlify部署问题：

1. **Tailwind CSS v4 兼容性问题** - 改为使用标准的 v3 语法
2. **PostCSS 配置问题** - 使用标准的 tailwindcss 和 autoprefixer 插件
3. **CSS 变量兼容性** - 使用标准的 HSL 颜色值
4. **Next.js 静态导出** - 配置为静态站点生成
5. **Netlify 配置** - 正确的构建命令和发布目录

## 本地构建测试

Node.js 24.22.2、npm 11.19.1。Windows 与 Linux 使用相同 npm 命令。
```bash
npm ci --include=dev
npm run typecheck
npm run build
```

本地静态预览
```bash
npm start
```

## 部署到 Netlify

本分支冻结发布。Git 触发的 Netlify 构建使用 `ignore = "exit 0"`，进入构建命令时运行拒绝脚本。管理员完成 TEST 资源授权后，在单独部署候选复核以下参数。

   - 构建命令: `npm ci --include=dev && npm run build`
   - 发布目录: `out`
   - Node.js 版本: 24.22.2
   - NPM 版本: 11.19.1

Functions 运行时、自动发布来源和托管 CSP 的证据在 [TEST 验收表](artifacts/b2-a-7/TEST_SIGNOFF.md) 登记。旧专项部署文档保留作历史记录。

## 构建输出

构建成功后，静态文件将输出到 `out/` 目录，包含：
- HTML 文件
- CSS 文件
- JavaScript 文件
- 静态资源

## 注意事项

- 确保所有图片和资源路径正确
- 检查字体加载是否正常
- 验证 CSS 变量是否正确应用
- 测试响应式布局在不同设备上的表现

## 故障排除

如果仍有问题，请检查：
1. Netlify 构建日志
2. 浏览器控制台错误
3. 网络请求状态
4. CSS 和 JavaScript 文件是否正确加载
