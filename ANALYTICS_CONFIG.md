# 网站统计配置说明

## 百度统计配置

本项目已集成百度统计功能，可以追踪网站访问量、用户行为等数据。

### 配置步骤

1. **注册百度统计账号**
   - 访问 [百度统计](https://tongji.baidu.com/)
   - 注册或登录账号
   - 添加您的网站

2. **获取统计代码**
   - 在百度统计控制台中，获取类似以下格式的统计代码：
   ```html
   <script>
   var _hmt = _hmt || [];
   (function() {
     var hm = document.createElement("script");
     hm.src = "https://hm.baidu.com/hm.js?您的站点ID";
     var s = document.getElementsByTagName("script")[0]; 
     s.parentNode.insertBefore(hm, s);
   })();
   </script>
   ```

3. **配置环境变量**
   创建 `.env.local` 文件（或在 Netlify 环境变量中配置）：
   ```env
   NEXT_PUBLIC_BAIDU_ANALYTICS_ID=您的站点ID
   ```

4. **Netlify 部署配置**
   在 Netlify 控制台的 Site settings > Environment variables 中添加：
   - Key: `NEXT_PUBLIC_BAIDU_ANALYTICS_ID`
   - Value: 您的百度统计站点ID

### 功能特性

- ✅ 自动追踪页面浏览量
- ✅ 追踪用户互动事件（按钮点击、表单提交等）
- ✅ 访问量显示组件
- ✅ 本地访问统计（离线时也能工作）
- ✅ 生产环境自动启用，开发环境禁用

### 追踪的事件

- 页面访问
- 加入公会按钮点击
- 表单提交成功
- 其他用户互动

### 访问量显示

在页面底部会显示：
- 网站总访问量
- 当前在线用户数（模拟）

### 隐私说明

- 统计数据仅用于网站优化
- 不收集个人敏感信息
- 符合相关隐私法规
