# C1：既有合成项目的只读核验与初始化兼容

## 目标与基线

基于 C0 已验收提交 `072f492b672c9ebd36b1f6d0c822fb9ab62b3276`，核对用户指定账号下既有合成项目的实际默认库，而不是重复创建项目。控制台目录查询只使用 `BEGIN READ ONLY`、系统目录 SELECT 和 `ROLLBACK`，不读取业务行。

现场发现默认表 ACL 属于 `cloud_admin`、作用于 `public`，仅向 `neon_superuser` 授予 DELETE、INSERT、MAINTAIN、SELECT、TRUNCATE、UPDATE，六项均带 grant option；序列为 SELECT、UPDATE、USAGE，三项均带 grant option。原检查只允许八项表模板，多出的两项为 REFERENCES、TRIGGER，因此会把现场空库拒绝为 `SYNTHETIC_DATABASE_NOT_EMPTY`。

实际项目标识、SQL 和完整脱敏结果仅保存在相邻本地证据目录：`../business-commit-remote/C1_CATALOG_RESULT.json`、`C1_POLICY_RESULT.json`、`C1_BOOTSTRAP_INSPECT.sql`，不随源码提交。库存中未发现自定义 schema、public 关系/函数/类型、额外扩展、外部服务、事件触发器、发布/订阅或 `jinxi_` 角色。

## 本地修复范围与验收

1. 仅增加对现场六项表模板的精确兼容，继续接受原八项模板。保持 creator 为 `cloud_admin` 且非当前初始化主体、schema 为 `public`、受让者为 `neon_superuser`、所有 grant option 为 true；序列三项模板保持原样。不接受任意子集、额外受让者、部分模板或无 grant option 的变化。
2. 用真实一次性 PostgreSQL 17 先复现六项模板被拒绝，再验证修复后的空库检查、事务初始化、结构校验、合成种子、角色权限和回滚生命周期。PUBLIC 额外授权、七项表模板和缺失 grant option 必须在 DDL 前拒绝，保持库和业务角色未创建。
3. 保留非空库、并发连接、身份、TLS、结构指纹和授权期限门禁，以及默认关闭的管理/业务批准。按本轮差异做 Standards / Spec 审查，必要工程检查及匹配最终 SHA 的独立审核分支 CI；未受影响的 C0 证据可复用。

## 数据与下一阶段边界

云端只执行上述只读目录检查，未改数据库名称、对象、角色、口令、日志或计费设置；查询会唤醒既有计算节点，随后使用原有闲置暂停设置。本地测试仅操作一次性合成库。生产、旧 TEST、main 和真实数据受保护。

现场 SQL Editor 连接返回 `pg_stat_ssl.ssl=false`，不能代替 Node `pg` 的原生直连 TLS/SNI、服务端地址和身份验收。用户明确当前没有本地私有管理员凭据文件，直连验证保留待接入；不提取控制台口令、不在聊天收集密码/Token/连接串，也不放宽 TLS 检查。

现场 `log_parameter_max_length=-1`，不符合现有角色密码配置门禁要求的 0；角色启用继续拒绝。SQL Editor 的其余日志查询结果不等同于未来私有直连会话的最终日志策略批准。本次不修改这些门禁或云端设置。

后续先接入该专用项目的私有管理连接，完成原生只读验证，再对现有默认库命名、初始化主体和固定目标库 `jinxi_synthetic_write_v1` 提出精确准备方案。数据库准备、结构初始化、合成种子、角色启用、Netlify 新站及业务发布分别按实际目标授权。C1 兼容修复和 CI 通过不等同于这些云端写入已获批准。
