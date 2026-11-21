# 独立合成 TEST 管理员清单

本轮交付的是准备和演练。以下步骤用于后续单独批准后的新站。当前无需在控制台点击或提供凭据。

以下清单适用于支持原生私有访问的套餐。XUST 的 Legacy Free 合成站首次配置、凭据和发布顺序以 [Legacy Free 访问保护补充清单](LEGACY_ACCESS.md) 第 2–4 项为准。专用资源与数据库安全步骤沿用本文。

## 先核对资源和成本

| 项目 | 最小需求 | 现场停止条件 |
| --- | --- | --- |
| Netlify | 一个新的私有合成站。团队可在合成测试时实际控制可见性。自带 `netlify.app` HTTPS 域名，定向到单独审核分支 | 目标名称或 UUID 是旧 `jinxi-web`、只读 `jinxi-web-test`，或配额有可能牵连这两个站 |
| Neon | 一个全新独立项目、一个空的根分支、一个直连 compute，PostgreSQL 17，业务库 `jinxi_synthetic_write_v1`，五个专用角色 | 目标属于生产、`pr17-validation` 或旧只读 TEST，来自它们的克隆，或者已有未知库、对象和真实记录 |
| 计算和访问 | 先选可用的最小规格，建议从 0.25 CU 和闲置暂停开始。使用数据库 owner/CREATEROLE 的私有初始化主体 | 连接数、冷启动、证书、地址、管理权限或日志策略无法证实 |
| 授权 | 完整审核 SHA、精确 Netlify site/team 和分支、新 Neon project/branch/endpoint、环境 UUID、库与结构指纹、短期有效期 | 缺少任一标识，当前资源身份与清单不一致，或批准已过期 |

需要新 Netlify 站点，因为两个既有站点的发布和资源边界保持原状。采用单独 Neon 项目可隔离分支、角色、凭据与维护操作。在完全空白、专用且独立获批的另一项目内使用一条专用分支也是可能方案。由生产或旧 TEST 派生分支不符合本轮目标。

价格资料于 **2026-11-15** 按公开官方文档核对。Netlify credit-based Free 标示 300 credits/月并设硬上限。已发布 production deploy 15 credits，Functions 10 credits/GB-hour，网页带宽 20 credits/GB，请求 2 credits/万次。这里的新站 production 指合成站自身的正式入口。用 1 次发布、1 GB-hour Functions、0.2 GB 出站和 2,000 请求估算约 29.4 credits。它是用量示例，实际额度和同团队其他站点用量须在 **Team settings → Usage & billing** 核对。预算上限耗尽可能影响同团队站点，不能将新站等同于配额隔离。只有团队预算已确认，或另有获准的独立团队配额，才继续。[Netlify 计费](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)

Neon Free 当前列出每项目 100 CU-hours/月、1 GB PostgreSQL 存储、5 GB/月出站，约 5 分钟闲置后暂停。0.25 CU 运行 4 小时相当于 1 CU-hour。用量来自当前组织套餐、所有项目配额、存储、出站和 compute，控制台的组织账单是执行依据。不要开启自动充值、加机器、额外副本或定时保活。计划内额度不足先停，另行批准才处理套餐变更。[Neon 套餐与限额](https://neon.com/docs/introduction/plans)

## 用户后续操作顺序

1. **同意本地提交和预算。** 核对 [本地验收报告](../artifacts/phase4-synthetic-cloud/REPORT.md)。下一次可先授权向 GitHub 推送同名独立审核分支，前提是重新核对 remote、干净工作区、完整 SHA、旧站门禁和 CI 无发布动作。资源开通和部署另签。不要使用旧 GitHub PR 或更改 main。
2. **批准后建立新 Neon 项目。** 在 [Neon 控制台](https://console.neon.tech/) 的 **Projects → New Project** 选择空项目、合适区域、PostgreSQL 17 和最小规格。核对 **Branches → Compute** 的 project ID、branch ID、endpoint ID、直连主机名。核对 **Databases**。只允许目标业务库和 PostgreSQL 自带库，默认 `neondb` 须由新空项目的管理员先确认合规的初始命名或改名方案。用空分支和生成的合成种子开始。核验五个服务角色在本项目任何其他可连接库的 CONNECT，包括维护库和模板库。任何数据库或角色身份不符即停止。
3. **先只读，再申请初始化。** Codex 准备与项目、分支和端点对应的批准记录、执行脚本和验收输出。管理员只对已经核准的新站新项目输入私有管理凭据。在新 Neon 项目的 **SQL Editor** 核对选中分支和数据库，运行 [只读元数据 SQL](database/metadata.sql) 或在管理员私有终端使用 `admin.cjs` 的 `inspect`。核对版本、实际 TLS、地址、非超级用户初始化身份、`pg_control_system()` 权限、数据库物理指纹及空库库存。通过才提交 [默认关闭的管理批准](database/admin-approval.disabled.json) 对应的非密钥目标，经审查后给新资源启用。不得利用 SQL 伪造 project/branch/endpoint，提供方元数据在控制台另核实。
4. **获准后只初始化新库。** Codex 以 `initialize` 执行单事务初始化，回报可复核的 schema 指纹和 `NOLOGIN` 角色。确认指纹和实际列级 ACL/RLS 后，另用 `seed` 生成 7 个虚构账号。测试成员与管理员、审核员密码独立保存在受控密码库。新角色登录与数据库凭据配置留到授权后执行。在激活前查核目标的数据库日志参数。无法证明语句、参数、错误和审计记录不暴露密码时，停止。需 Neon 管理员确认日志和 SCRAM，不能降级到普通 DSN 或管理员账号。[Neon 角色管理](https://neon.com/docs/manage/roles)
5. **获准后配置新 Netlify 站。** 在 [Netlify 控制台](https://app.netlify.com/) 使用 **Projects → Add new project**。先建立无业务的私有站，核实站点和团队 ID。保持新站构建停止，连接审核分支后核对 **Project configuration → Developer settings → Continuous deployment**。Base 为空，Package directory 为 `synthetic-cloud`，选择专用审核分支为新站的 production branch；只构建该分支，关闭 Deploy Previews，Build hooks 空。检查有效配置指向本目录，构建采用 `node ./synthetic-cloud/build.cjs`，发布目录和 Functions 目录与文件一致。依赖安装包括 devDependencies，静态站禁用 Next 适配器自动接管。意外出现旧 Functions、额外插件或其他站点 ID 就停止。[项目创建](https://docs.netlify.com/manage/projects/add-new-project/) · [分包配置](https://docs.netlify.com/build/configure-builds/monorepos/)
6. **仅向新站填入专用配置。** 在新站 **Project configuration → Environment variables**。`JINXI_SYNTHETIC_BUILD_APPROVAL` 放经复核的非密钥 JSON，`JINXI_SERVICE_APPROVAL` 放对应完整 SHA。五个 `JINXI_SYNTHETIC_DB_{MEMBER,COMMUNITY,ATTENDANCE,POINTS,OPERATIONS}` 及 `JINXI_SYNTHETIC_{CSRF_KEY,RATE_KEY}` 由密码库提供七个独立随机值。Secrets 优先使用仅 Functions 作用域及精确 production 值。若实际套餐只有 all-scope，必须先证明只存在这个新合成站点的密钥、无共享/模板/插件旧凭据，且锁定仓库与提交和 npm 依赖。all-scope 会让 npm 安装等平台构建步骤获得变量，清洁子进程无法撤回该可见性。管理员若不接受这项暴露或无法证明隔离，停下，不自动升级。绝不加入管理角色、生产凭据、共享 DSN、Netlify/Neon 管理 Token。[变量作用域](https://docs.netlify.com/build/environment-variables/overview/)
7. **部署及测试需单独批准。** 仅新站开启获准的一次构建，核对日志中的 commit、站点、deploy、函数数及权限。站点保持 Private，检查匿名访问实际受限。首次真实测试包括 Function Context 形状、路由和双 Cookie、Node 24 运行时、Neon 直连 TLS/SNI、冷启动地址、实际 ACL/指纹、每角色身份、调用/撤权、五组业务及回执。若缺一项，停止业务验收。在新合成站使用相同规则：下单即扣分，待处理由会员联系公会管理员，人工核验开通后确认，无法履约只退一次。测试只模拟处理状态。

团队账户只能在确有可用配额和私有访问模式时批准。公开 Netlify 文档记载 Credit Free/Personal 私有生产站可能只有 Team Owner 可访问，不能假定任意成员能被邀请。若实际账户不能按计划限制访问，改由管理员本人验收，或先停下确认可行范围。[Netlify 项目可见性](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/)

## 管理工具输入和止损

`database/admin.cjs` 从标准输入读取 JSON。在受控终端由密码库或本机受限程序注入，不把密码放进命令行、Git、日志或聊天。字段是 `action`、`target`、`password`、`expectedSchema`（初始化后使用）、`fixturePasswords`（seed）、`rolePasswords`（activate）。`target` 只有 projectId、branchId、endpointId、host、database、environmentId、fingerprint、serverAddresses、initializer。`inspect` 可省略 fingerprint 只读取得值。数据库指纹等于 cluster_id、database_oid、database_name 以 NUL 连接后的 SHA-256。生成七个 seed 密码时用 normal、same、reviewer、admin、first、locked、disabled，角色密码使用权限表中的固定角色名。使用密码库生成互异的 32 随机字节十六进制值。批准文件必须在后续提交绑定完整目标及有效期，`seed/activate/verify/rollback-empty` 还要求明确批准 schemaFingerprint。秘密留在运行端，管理输出只报状态和合成账号名。

发生故障时先在 **新站** 停止构建和新请求，撤回发布到已批准的无写入版本。仅在新 Neon 项目冻结五个角色并轮换或清除本次凭据。冻结保留原批准目标的检查，原批准过期后仍可执行 `freeze`。NOLOGIN 阻止新连接。命令返回的 `remainingRoleSessions` 是冻结提交后，当前库内五个业务角色连接数的快照，包含空闲连接。大于零时等待现有连接退出；`null` 表示未取得计数，需在新库查看 `pg_stat_activity`。必要时由管理员单独批准终止此新库中这五个角色的具体会话。检查新请求拒绝、旧会话不可继续使用，留存合成回执和账本便于对账。已含业务行时保留新库。`rollback-empty` 只适用于已冻结、结构一致、无活动连接与业务行且持有有效批准的初始化模型，依赖检查失败会事务回滚。空库 PUBLIC 权限保持关闭以便重新核验。

本地只实测临时 PostgreSQL、独立静态导出、解包 Function、HTTPS 和 Edge。真实 Netlify 构建变量、路由及 Context、Neon 账号与权限、默认 ACL、证书、地址及实际账单仍由新资源验收确定。
