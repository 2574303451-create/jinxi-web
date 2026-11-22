# Gate-only 站点 URL 元数据兼容修正

## 实际失败与修正目标

2026-11-22 20:31 北京时间，获准的单次诊断发布 SHA `f85b2c949aa2ccddddc3938ce496faacd4e5319b` 对应真实部署 `6b02e09ad05f07ad09134df1`，platform ready/production，1 个 Edge、0 个 Node Functions。匿名首页仍为 503，随后站点被禁用，双 URL 的匿名/正确口令请求均为 404。

关闭后通过只读日志接口取得 3 条 `JINXI_GATE_REFUSAL`。正常主域名请求的 account/site/requestOrigin/deployContext/published/deployId 均为 true，只有 siteOrigin 为 false。另一个非批准 origin 的调用同时为 requestOrigin=false，保持拒绝。

20:33 的站点控制面只读结果确认：`url` 是 `http://jinxi-synthetic-gate-test.netlify.app`，`ssl_url` 是 `https://jinxi-synthetic-gate-test.netlify.app`，没有凭据、额外端口、路径、query 或 fragment，站点仍 Disabled。这证明现有严格 HTTPS 字符串比较不兼容平台的合法 HTTP 站点元数据表示；运行时日志没有输出原始 URL，因此这里只将 HTTP 元数据表示作为由控制面与失败布尔项支持的解释，不伪称取得了完整运行时原值。

本修正只补齐这一表示兼容性，仍需新一次现场验证才能确认 401/200 链路已通过。

## 精确范围与安全边界

`manual-runtime.mjs` 的 siteOrigin 检查只允许该已批准主机的两个**完整精确字符串**：原 HTTPS 元数据值，以及控制面实际提供的 HTTP 元数据值。没有通用 URL 归一化，没有仅按 hostname 放行，也没有接受未知自定义域名、部署别名、用户名、端口、路径、query 或 fragment。

实际请求 origin 仍必须等于原批准 HTTPS origin；HTTP 请求和伪造 Host/Forwarded/Netlify 类客户端头不能使用这个元数据兼容分支。账户、站点 UUID、production、published、deploy ID、批准 SHA、期限、口令摘要以及业务路由限制全部保留。既有脱敏服务端诊断保留，HTTP 不返回诊断信息。

范围仅为 Gate-only `manual-runtime.mjs`、针对性测试、CI 测试入口和本说明。没有更改 Netlify 站点 TLS/force_ssl/域名设置，没有改业务部署适配器、数据库、角色或正式 UI。未来合成业务适配器是否存在相同平台表示差异，留在对应云端验收范围，不在本次扩大修改。

## 本地验收与现场边界

- 先在未修正实现上复现合法 HTTP 元数据导致匿名 503，而预期为 401；再以最小实现使该测试通过。
- 合法 HTTP 元数据 + 批准 HTTPS 请求：匿名/错误口令 401，正确口令 200 固定内容；普通路径仍无诊断事件。
- HTTP 请求、部署别名、其他站点、伪造头、元数据装饰及其他身份不匹配均仍拒绝；业务 API 仍没有业务响应。
- 复用既有 Gate/诊断/collector 测试，并完成受影响工程检查和 Standards/Spec 增量审查。

上一单次诊断发布许可已使用，本修正没有发布授权。新候选必须获得针对确定 SHA 的单次批准后才可发布；沿用 `MANUAL-PILOT.md` 的零公开业务文件、零 Node Functions、一个 Edge、固定 CLI、一次发布、异常/结束立即禁用和只读日志核查要求。
