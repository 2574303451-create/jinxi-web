# Legacy Free 独立合成 TEST 访问保护

本地验证基准为 `c1dff2154e8a4d7b636e0ad8aadfedfee9f1835c`。通过测试和双路补审的源码为 `74ac485485fe8a95ad6db1f169f14d008ca07f0d`。XUST 管理员确认当前为 Legacy Free，内置 Password Protection 显示需要升级。Netlify 公开文档列出了 Legacy Free 的 Edge Functions 额度。真实站点的路由、部署别名、环境变量与 CDN 行为留待获准后在新站验证。[Legacy 套餐](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/legacy-pricing-plans/)

## 访问控制和本地证据

- 发布目录 `synthetic-cloud/.generated/public` 为空。首页、路由资源、JS、CSS、图片和视频只打入服务端 Edge 包。构建拒绝链接产物，打包完成后再次核验发布目录为空。
- Edge 对所有路径先核验当前发布的部署、站点、团队、批准 SHA、有效期和唯一 HTTPS 域名，再核验访客认证。无凭据或凭据错误返回 `401`，缺配置、身份不符或异常返回 `503`，认证后未知路径返回 `404`。Edge 出错配置为 `onError: "fail"`。Edge 未执行时公开发布目录仍无受保护内容。[Edge 限制](https://docs.netlify.com/build/edge-functions/limits/) · [错误行为](https://docs.netlify.com/build/edge-functions/optional-configuration/)
- Node Function 在读数据库凭据前自行核验同一访客认证，随后按原成员 Cookie、角色、Origin、CSRF 和数据库权限处理。成功、拒绝、重定向和错误响应使用 `no-store`，业务响应保留两枚独立 Cookie。[请求处理顺序](https://docs.netlify.com/resources/troubleshooting/request-chain/)
- 本地 HTTPS 用真实打包首页中的 JS 地址先验证授权访问，再验证同地址匿名重访；还覆盖首页、图片、视频、重定向、错误、Functions 默认和自定义路径。直调解包后的业务 Function 时，匿名成员登录负载未创建会话，社区、签到、积分和运营记录数量均未变。域名别名、错误配置和异常使用模拟可信平台 Context 复现。
- Netlify Edge Bundler 14.5.2 在本机生成了 2,649,089 字节的 ESZIP。入口清单为 `/*`、无排除路径、无缓存后路由、错误策略 `fail`。Deno 1.39.0 另验证了授权页面、匿名拒绝、双 Cookie 和禁缓存响应头。Edge 浏览器验收通过 5 个流程和 5 个宽度。PostgreSQL 17 事务及权限 7/7，HTTPS 联调 13/13，单测和边界 16/16，API 14/14，安全 138/138，静态导出 3/3，TypeScript、ESLint 和普通构建均退出 0。

本机命令退出码与日志位于 `artifacts/phase4-synthetic-cloud/local/legacy-access-74ac485/`。每组日志同名 JSON 记录源码 SHA 和时间。另保留 `artifacts/phase4-synthetic-cloud/local/legacy-access-e36f25c/linked-output-pre-fix.log`，复现旧打包覆盖链接目标；补丁后验证拒绝、原目标未改写、公开目录仍为空。首轮 HTTPS 的分块大请求缺访客认证，补足夹具后恢复验证原有 `413`；与普通构建并行时触发干净工作区门禁，分开执行后通过。

## 后续获准的新站验证

1. 在 **Usage & billing** 核对 XUST 当期剩余额度及旧站用量，先确定试点次数、观察阈值和可执行的停止入口。Legacy Free 公示额度为 Edge 100 万次/月、带宽 100 GB/月和构建 300 分钟/月。首页、资产、API 和被拒绝的请求均可能产生 Edge 调用。构建额度满会停止同账户新构建，其他受计量服务额度耗尽可能暂停同账户站点。若无法保留旧站所需余量、无法及时关闭新站入口，或管理员尚未接受共享风险，试点保持暂停。[Legacy 套餐](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/legacy-pricing-plans/) · [Legacy Free 超额行为](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/billing-faq-for-legacy-plans/)
2. 单独批准后只核验全新空 Neon 项目和新 Netlify 站。数据库初始化完成并取得真实结构指纹后，服务角色保持 `NOLOGIN`。新站只连接获审分支，关闭 Split Testing、Deploy Previews 和分支部署，保持 Build Hooks 为空，停用无关插件。核对实际 Publish、Edge Functions、Functions 目录都来自合成站包。
3. 首发配置只包含获审的非密钥 `JINXI_SYNTHETIC_BUILD_APPROVAL`、`JINXI_SERVICE_APPROVAL`，以及 Edge 和 Node 共同读取的运行端 `JINXI_SYNTHETIC_ACCESS_SHA256`。由受控密码库生成独立的 32 随机字节，写作 64 位小写十六进制字符，对字符本身计算 SHA-256。平台仅保存摘要，授权访客通过 HTTPS 原生认证使用用户名 `jinxi-test` 输入口令。实际仅有 all-scope 时，先沿用管理员清单的专用变量与获审构建限制。[`Netlify.env`](https://docs.netlify.com/build/edge-functions/environment-variables/)
4. 首次受控发布只验证流量门禁，保持数据库业务角色冻结且新站无业务连接凭据。核对生产域名、部署永久链接、分支与预览域名、HTTP 到 HTTPS、首页、资源、路由、错误响应与 Functions 直达。确认匿名同地址重访无法命中受保护内容、授权请求无公开缓存、默认函数路径无业务副作用，以及平台确实识别两层门禁。这些条件通过后才单独审批业务角色和业务验收。试点前明确能停止新站及永久链接的流量。停止构建只会阻止新构建，已有部署仍可能产生 Edge 调用。路由、凭据、资源或配额异常时，停止新站流量并回退到已核验的空站，保留数据库冻结状态。[部署域名](https://docs.netlify.com/deploy/deploy-overview/) · [Edge 限制](https://docs.netlify.com/build/edge-functions/limits/)

本轮没有创建、部署或推送任何云端资源。先前获审源码和旧站保护继续作为交接基准。
