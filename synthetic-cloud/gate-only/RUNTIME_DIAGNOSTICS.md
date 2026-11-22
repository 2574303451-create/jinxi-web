# Gate-only 503 运行时诊断候选

## 目标与证据

现有已发布 Gate-only SHA 为 `134b572f69a27b155dfeaab514457047f7f41297`，现场部署 `6b02d23c86e921d92d2a3191`。2026-11-22 19:33 北京时间，匿名首页实际为 503 / `TEST_ACCESS_UNAVAILABLE`，预期为 401，测试后站点已 Disabled。该次单次发布许可已使用。

2026-11-22 20:14 北京时间，通过 Netlify 官方 CLI 使用的只读日志接口读取目标 site/deploy 的 19:29—19:34 时间窗，HTTP 200、完整分页、日志 0 条。日志权限已实际可用；原函数未输出拒绝分支，所以仍不能从该 503 确定根因。控制面变量相符不能作为 Edge 调用内变量及 Context 相符的证据。

本地脱敏现场材料位于业务工作树相邻的 `business-commit-remote/gate-authorized-134b572-20261122/`，日志读取记录位于 `business-commit-remote/gate-followup-20261122/edge-logs.json`，均不上传。只读日志 API 与分页方式依据 [Netlify CLI log-api.ts](https://github.com/netlify/cli/blob/main/src/commands/logs/log-api.ts)；本次查阅文件的 blob SHA 为 `9668c55c8e7fc6976163b6ad4ad55518bcd681d1`。

## 唯一改动范围

这是诊断候选，不是已验证的 503 修复。`manual-runtime.mjs` 保留原有账户、站点、origin、production/published、deploy ID、批准 SHA、期限和口令摘要检查；所有拒绝仍返回原有私有 503。

仅在原本返回 503 的分支输出服务端 `JINXI_GATE_REFUSAL` 日志，字段为固定版本、枚举原因、枚举执行阶段和布尔检查结果：

- `context`：账户、站点、站点 origin、请求 origin、deploy context、published、deploy ID 是否匹配。
- `approval`：批准版本是否匹配。
- `expiry`：期限是否有效、尚未到期、未超出编译上限。
- `access-config`：口令摘要格式是否有效。
- `exception`：发生异常的固定执行阶段，不输出异常消息或堆栈。

没有原始值、URL、Cookie、Authorization、口令、摘要、DSN、成员数据或运行时身份值。普通匿名/错误口令 401、正确口令 200、禁用路径 404 和方法 405 不增加诊断日志。日志失败不影响原有失败关闭行为。HTTP 响应中不增加诊断信息，不增加诊断路由或环境变量。

## 本地验收

1. 缺少日志的基准先运行新诊断用例，应失败；增加诊断后通过。
2. Context 拒绝、变量拒绝、读取异常、GET/HEAD、日志写入异常均继续 503，且日志仅为上述有限字段。
3. 正常 200/401/404/405 行为与缓存头保持原值，普通凭据拒绝没有诊断事件。
4. 固定 CLI collector 及既有 gate/access 测试通过；工程类型、lint、语法和构建通过。
5. Standards/Spec 独立增量审查，固定基准为已审核 Gate-only SHA `134b572f…`。

## 下一次现场执行的边界

本候选未发布，须先取得对应 SHA 的新单次发布批准。沿用 `MANUAL-PILOT.md` 的隔离暂存、固定 CLI 23.15.1、零公开业务文件、零 Node Functions、一个 Edge 及结束禁用要求。站点保持 Disabled；不得修改生产、旧 TEST、Git 绑定、业务数据库或付费设置。

获批后只发布一次。在首个异常状态出现时立即禁用站点，再通过已经验证可读的日志接口读取同一 site/deploy 和窄时间窗，以日志中具体失败布尔项决定后续最小修复。没有现场日志前不得删减绑定条件、改用客户端头证明身份或假定已修复。新一次发布结束即用完许可。
