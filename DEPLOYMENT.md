# Netlify 部署说明

## 问题修复

本项目已修复了以下Netlify部署问题：

1. **Tailwind CSS v4 兼容性问题** - 改为使用标准的 v3 语法
2. **PostCSS 配置问题** - 使用标准的 tailwindcss 和 autoprefixer 插件
3. **CSS 变量兼容性** - 使用标准的 HSL 颜色值
4. **Next.js 静态导出** - 配置为静态站点生成
5. **Netlify 配置** - 正确的构建命令和发布目录

## 本地构建测试

### Windows
```bash
build.bat
```

### Linux/Mac
```bash
chmod +x build.sh
./build.sh
```

## 部署到 Netlify

1. 将代码推送到 Git 仓库
2. 在 Netlify 中连接仓库
3. 构建设置：
   - 构建命令: `npm run build`
   - 发布目录: `out`
   - Node.js 版本: 18
   - NPM 版本: 9

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
