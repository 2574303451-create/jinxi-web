# JINXI B2-0 · 官方资料核对与隔离边界

核对日期：2026-11-05。本文是**官方资料研究及实施建议**，不是云环境验收报告。研究按 `research` 技能的独立后台研究流程执行，只写本文；未读取 `.env`、CLI 登录配置、运行时凭据或真实成员资料，未连接任何数据库，未操作 Netlify/Neon/R2 控制面，未部署、迁移、上传或建立真实会话。

本地背景已读：`artifacts/arch-005/IDENTITY_ARCHITECTURE.md`、`artifacts/arch-005s/DATA_AND_ARCHITECTURE.md`，以及协作说明。读入时分支为 `codex/jinxi-005s-b1`，HEAD 为 `115bf854a7977a3e582a89af13459115178a1e31`；主任务负责之后的分支、代码和验收。旧架构文档中的方案不据此升级为已实现事实。

## 1. Netlify：context 是配置选择，资源授权仍须独立成立

| 官方 context | 含义与必须核对的边界 |
| --- | --- |
| `production` | 主站生产分支的部署；不能仅凭分支名字是 `main` 推定实际配置。 |
| `deploy-preview` | Pull/Merge Request 及相应预览部署；应显式获得 TEST 值。 |
| `branch-deploy` | 非生产分支部署；应显式获得 TEST 值。 |
| 指定分支 | 比一般 context 更具体；该分支的值也可能用于其 Deploy Preview，不能漏查覆盖。 |
| `dev` | Netlify Dev 本地环境；“本机运行”本身不证明不接云资源。 |
| `preview-server` | 当前官方另有此 context，默认继承 Local development 值；不应把它自动归为已验收 TEST。 |

上述定义和覆盖顺序来自 [Deploy overview](https://docs.netlify.com/deploy/deploy-overview/#deploy-contexts)、[File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/#deploy-contexts)。

**已由官方文档确认：**变量默认同值用于所有 context、所有 scope；site 值在对应 scope/context 覆盖 team/shared 值，未覆盖的 shared 值仍可能生效。具体分支值又比一般 context 更具体。因此，“预览未单独配置生产变量”不等于“预览拿不到生产变量”。当前文档把 scope 精细控制列为 Pro/Enterprise 能力，用户实际套餐、继承和敏感变量策略未知。参见 [Environment variables overview](https://docs.netlify.com/build/environment-variables/overview/)。

**Build 与 Functions 不可混同。**`netlify.toml` 中变量属于 Builds/Post processing，不会成为 Functions 运行时变量；Functions 必须从 UI/CLI/API 的正确 context 注入，且有 scope 控制时须包括 Functions。变量按部署时快照应用，改设置需要新部署，当前设置不能证明旧预览从未获得过旧值。参见 [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started/)、[Environment variables and serverless functions](https://docs.netlify.com/build/functions/environment-variables/)。

`CONTEXT` 是官方列出的构建元数据，不能假设 legacy Function 的 `process.env.CONTEXT` 自动存在；现代 Functions API 可从 `context.deploy.context` 读取部署 context。未来适配应以所用 API 实测为准，缺失/冲突时拒绝启用。参见 [Build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/#read-only-variables)、[Functions API: deploy](https://docs.netlify.com/build/functions/api/#deploy)。

**不泄露生产值的后续核验办法（本轮未执行）：**

1. 只记录站点标识别名、生产分支、部署 context/ID/提交/时间，以及变量的 **key、scope、context、site/shared 来源、secret 标记、是否存在覆盖**。由授权管理员在 UI 折叠列表及配置元数据中核对，不点击 reveal/copy/export，不保留含值截图。UI 不能在不展开值的情况下提供的字段，标为未知。
2. 同时核对 team/shared、分支专属值、全部 context 值和旧部署时间，不能只看某一个 TEST key。只检查仓库允许读取的配置键，不加载 `.env` 或账户登录文件。
3. 不用 `env:list`/`env:get` 冒充纯元数据命令：它们用于读取已解析的变量值，`--context`/`--scope` 是筛选而非脱敏。若日后确需 API，先确认服务端能否只返回元数据；仅在输出端删字段仍可能已读取秘密，本轮授权不允许这样做。参见 [Netlify CLI env command](https://cli.netlify.com/commands/env/)。
4. Secrets Controller 对非 dev 的 secret 值做 write-only/掩码，但 Netlify 上运行的代码仍可读取原值；它能减少人/工具意外暴露，不能阻止获注入的预览代码使用凭据。参见 [Secrets Controller policy](https://docs.netlify.com/build/environment-variables/secrets-controller/#environment-variable-secrets-policy)。

官方 CLI 说明：一般 env 命令默认使用 `dev` 和 all-context 值，而 `netlify build` 默认 context 是 `production`；Netlify Dev 还可下载云变量并读取本机 `.env`。所以本轮不运行这些命令来“验证离线安全”。参见 [Get started with CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/)、[Build locally](https://docs.netlify.com/build/configure-builds/environment-variables/#build-locally)。

**B2-0 建议：**本轮入口只允许显式的 synthetic-local 配置、loopback 地址和已登记的本地测试目标；生产、未知、空值或矛盾配置均停止。未来 TEST/prod 使用不同受限凭据，生产凭据不得存在于 all-context、dev、preview 或其 shared fallback 中。代码中的 context 判断只防误配置；对任意可改预览代码的隔离须由数据库/对象存储的授权拒绝来保证。

## 2. PostgreSQL/Neon：数据库目标、role、credential 是三件事

Postgres role 定义对象所有权和权限，LOGIN 允许连接，密码是认证材料；应用成员账号则是另一层业务身份。换密码、换 role、换变量名均不会创建独立数据库。普通 Postgres 的 role 是 cluster 级共享；schema 是数据库内命名空间，并非独立数据目标。参见 [Database roles](https://www.postgresql.org/docs/current/database-roles.html)、[Role attributes](https://www.postgresql.org/docs/current/role-attributes.html)、[Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)。

Neon 连接由 branch、compute、database、role 选择构成，host 含 compute endpoint ID；`-pooler` 仅表示池化连接。不同 endpoint 也可能是同一 branch 的主计算与只读副本，并读取同一数据源。**不同 DSN 字符串或不同 host 不能独立证明 TEST 数据隔离。**参见 [Connect from any application](https://neon.com/docs/connect/connect-from-any-app)、[Neon Read Replicas](https://neon.com/docs/introduction/read-replicas)。

Neon branch 的写入与父分支独立，但默认带入父分支既有数据，且会复制当时已有的 roles；不能把从生产派生的 branch 自动称为“仅合成数据、独立凭据”。这轮禁止实际创建云 branch。参见 [Branching](https://neon.com/docs/introduction/branching)、[Manage roles](https://neon.com/docs/manage/roles)。

**未来数据库身份核验建议（本轮未连接）：**

- 云端受控记录 `project_id + branch_id + endpoint_id/compute类型 + database` 的映射；密码、完整 DSN 不入日志或验收包。不同 compute 不应误当不同 branch。
- 本地记录新建测试 cluster 的绝对目录、loopback host、端口、数据库名、启动方式及应用实际使用 role；允许只在合成库读 `current_database()`、`session_user`、`current_user`、`server_version_num`、必要的地址/端口和对象权限。相关函数见 [System information functions](https://www.postgresql.org/docs/current/functions-info.html)。
- `current_database()`、OID、IP 或服务器版本各自都不构成全球唯一身份。需结合已知启动实例/控制面映射；不能仅做 `database_name` 含 `test` 的检查。本报告所谓独立“物理身份”指明确独立的数据目标证据，不声称 SaaS 提供专属物理硬件。
- 合成库可设置本地环境标记并校验，但标记可被数据库写者修改，只是误连保护。真实 TEST 仍需控制面确认、无生产数据、独立凭据及权限证据；离线研究无法证明这些条件已成立。

### 最小权限设计与证明范围

Neon 官方特别说明：Console/API/CLI 创建的 roles 默认获得 `neon_superuser`；受限 runtime role 应经 SQL 创建并明确授权，不能只起名 `app_readonly`。`neon_superuser` 可继承广泛读写/管理权限，某些项目还具有 RLS 绕过能力。参见 [Manage roles](https://neon.com/docs/manage/roles)、[Manage database access](https://neon.com/docs/manage/database-access)。

建议区分 owner/migration 与 runtime：owner 持有对象且不进入应用运行环境；runtime 仅获所需库 CONNECT、schema USAGE、指定列/表/sequence/function 权限，无 SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS、对象所有权或可切换到管理角色的 membership。不要只检查 `rolsuper=false`；还要检查继承、SET ROLE 路径、PUBLIC、函数 EXECUTE、schema CREATE 和未来对象授权。官方权限与 default privileges 说明见 [Privileges](https://www.postgresql.org/docs/current/ddl-priv.html)、[ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)。这是设计建议，尚未针对实际 Neon 权限验证。

未来核验只投影 `pg_roles` 必要非秘密字段与有效 privilege/membership 布尔值，避免读取 `pg_authid`/密码。`pg_roles` 官方就是屏蔽密码的可读视图，见 [pg_roles](https://www.postgresql.org/docs/current/view-pg-roles.html)。本地合成库应以真正 runtime 连接运行“允许操作成功 / DDL、跨 schema、未授权列、提权失败”的正反测试，而非只审 SQL 文本；该结果只能证明本地 role 模型。

**RLS 限制：**启用后无匹配 policy 为默认拒绝，但 owner 通常绕过；FORCE RLS 可约束 owner，不能约束 superuser/BYPASSRLS。TRUNCATE 等整表操作不受 RLS 管理。见 [Row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)。一个共享 runtime role 的 `current_user` 不是每名成员；若未来依赖会话上下文驱动 RLS，须由可信服务端在同一事务绑定身份并隔离连接复用，不能让客户端自报上下文。RLS 是表内授权，不能替代 TEST/prod 资源和凭据隔离；本轮不把它列为已完成防线。

## 3. 服务器会话：官方原则与本项目提案

OWASP 建议优先使用维护中的框架会话功能；自行生成的 reference token 须由 CSPRNG 提供至少 128-bit 熵，语义/权限留在服务器。官方现已明确讨论将随机 token/verifier 单向摘要入库：高熵 token 可使用快速 SHA-256，摘要不能反过来作为可接受的 bearer token；它只减少只读数据库泄漏后的重放风险，不能抵抗 Cookie 被盗或应用完全失陷。参见 [Session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#server-side-session-token-storage)。

**B2-0 提案：**合成账号用 32-byte 随机不透明 token，严格规范编码；仅将其完整 SHA-256 摘要及稳定内部成员 ID、scope、auth_version、创建/过期/撤销时间入库。只接受 Cookie 中原 token，经摘要查找；不接受摘要、memberId、账号、URL token 或 localStorage 当凭证。密码应使用单独的密码哈希方案，不能因随机 session token 可快哈希而把密码也改成 SHA-256。token 原文不写测试报告、日志或持久浏览器存储。token 长度和表字段属于本项目方案，不是本轮生产事实。

| 控制 | 官方依据与 B2-0 建议 |
| --- | --- |
| Cookie | 生产拟用 `__Host-jinxi_session=<token>; Path=/; Secure; HttpOnly; SameSite=Lax`，不设 Domain。Secure 限 HTTPS 传输，HttpOnly 禁 JS 直接读取但仍随 fetch 发送；Lax 仍允许部分顶层安全导航，并非完整 CSRF 防护。`__Host-` 在支持浏览器中要求 Secure、Path=/、无 Domain。见 [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)。本地原型用独立名称并实际验证浏览器行为，不能把响应字符串检查当成浏览器验证。 |
| 本地隔离 | Cookie 不按端口隔离，同 localhost 不同端口不是互不信任服务的凭据边界。原型只用合成账号、独立浏览器上下文和独立名称；本地 Secure 例外也不能证明生产 TLS 传输。见 [RFC 6265 §8.5](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5)。 |
| 首次强制改密 | 建议服务器签发短期 `reset_only` 会话，普通受保护动作一律拒绝，仅允许最小 me/CSRF、改密和退出；不能只让前端弹改密框。成功后原子更新密码、清 flag、提升 auth_version、撤销全部旧会话，并要求重新登录。受限 reset 会话和重置后会话失效可参照 [Forgot password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)。将其用于“初始密码强制改密”是本项目的适配提案。 |
| 退出、改密、锁定、停用 | 退出在服务器撤销本会话并清 Cookie；改密撤销旧会话；锁定/停用后每次请求读取权威状态并拒绝旧 token。用 auth_version 及撤销状态统一控制，不只删客户端 Cookie。OWASP 要求退出/超时在服务器失效；每请求授权与默认拒绝见 [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)。锁定/停用事务同时提版本和撤销、敏感写与账号状态变更的并发规则属于项目实现要求，须本地并发测试。 |
| 到期与轮换 | 每次验证空闲/绝对期限，登录、重新认证及权限变化签新 token，旧 token 不再接受；首版可选择改密后一律重登。空闲 30 分钟、绝对 7 天只是沿用架构稿的待验收参数，非官方统一阈值。服务器超时与轮换原则见 [Session expiration](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration)。 |

**CSRF/Origin 提案：**对写请求验证明确允许的完整 Origin（scheme/host/port），不能子串匹配，也不能信任客户端随意传入的 Host/X-Forwarded-Host 来扩大列表；缺失或 `null` 不视为同源。再用与该会话绑定的独立 CSRF token 和自定义请求头，并在服务器验证；GET 不改变业务状态。登录亦须防 login CSRF。SameSite 只作纵深防御，CORS 凭据响应不能使用 `Access-Control-Allow-Origin: *`。见 [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。本轮可以采用比通用兼容策略更严格的“缺 Origin 即拒绝”本地策略，但须如实记录，不声称官方要求一律如此。

**限流提案：**按账号及可信来源 IP 组合限制登录/改密/会话写请求，使用持久、原子的计数/窗口，不能把单 Function 内存当分布式证明。账号失败计数、观察窗口、递增延迟与防止恶意锁号的权衡见 [OWASP Authentication: login throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling)。沿用“5 次/15 分钟”等阈值只可作为待调参数；新登录、锁定、停用返回不能枚举账户。真实代理 IP 信任链、跨实例限流和流量容量仍待环境验收。

**日志与缓存：**只留必要动作/时间/结果及合成主体别名，不记原 token、Cookie、CSRF、密码、连接串或环境值。见 [OWASP Logging: data to exclude](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude)。`me`/认证响应设 `Cache-Control: no-store` 属本项目隐私设计，测试须验证错误路径同样处理。会话原型通过不能解决既有积分接口的客户端身份/价格/奖励信任风险。

## 4. 头像存储隔离：只做方案准备

| 方案 | 官方事实 | 对 TEST/prod 的结论 |
| --- | --- | --- |
| Netlify Blobs `getStore` | site-wide，跨部署持久且所有 context 可用；SDK 在 Functions/Edge/Build Plugins 自动取得配置。官方直接提醒 branch deploy 可能删除 published deploy 依赖的数据。 | 不同 store 名/环境前缀可防误用，不能证明资源级拒绝生产访问。 |
| `getDeployStore` | namespace 跟特定 deploy；随 deploy 生命周期清理，与回滚关联。 | 部署命名空间不是长期生产头像的唯一持久库，也不能凭名称证明独立授权。 |
| Netlify Dev 默认本地 Blobs | 官方说明默认 sandbox local store。 | 默认本地模拟不能证明同站点云预览隔离，更不允许显式引入真实 PAT 绕过本轮边界。 |

表中事实均见 [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)。**推论：**本轮查到的公开合同没有提供足以确认“同 site TEST 代码拿到的能力无法访问生产 store”的证据；不能把未证实的细粒度 ACL 认定存在，也不作超范围探测。

**候选替代：**保持现有 Netlify 站点，未来对接独立 TEST/prod S3 风格 bucket，TEST 凭据仅授权 TEST bucket。R2 官方支持将 Object Read / Object Read & Write token 限定至指定 buckets，Admin token 权限更大；AWS S3 的 IAM/bucket policy 也可按 principal/action/resource 授权。见 [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/)、[How S3 works with IAM](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html)。**S3 兼容 API 这个标签本身不保证权限隔离**；须核对实际服务、策略、公开访问及当前凭据范围。

未来如获授权，需以非敏感测试对象验证 TEST 凭据对生产目标的列举/读/写/删均被存储服务拒绝，同时验证 TEST 目标所需动作成功；只测 SDK 根据 context 选对 bucket 不够。本轮不创建 bucket/token，不读或上传任何真实对象，不把头像上传、重编码、缓存删除或孤儿清理列为完成。

## 5. 本轮可交付的证明与停止边界

| 项目 | 本轮研究能说明 | 仍不能说明 |
| --- | --- | --- |
| Netlify 环境隔离 | 官方 context/scopes/覆盖规则及安全核对字段 | 当前站点/套餐/shared/旧部署的实际秘密可达性 |
| 独立 TEST 数据库 | 独立目标与受限 role 的证据要求 | 实际 Neon project/branch/database、生产权限和 TEST 凭据已隔离 |
| 本地 PG/会话 | 可用合成账号验证 SQL、摘要会话、首次改密、撤销和错误拒绝模型 | 云端角色、真实成员会话、浏览器/代理/多实例全链路已安全 |
| 对象存储 | Blobs 的共享边界与独立 bucket 的授权设计 | 真实 bucket 已存在、策略已生效或生产对象不可达 |

主任务若完成合成本地实验，需另记实际版本、命令、通过/失败及限制。生产迁移、真实成员登录、头像上传、在线心跳、生产发布和积分 P0 处理均不因本文被默认为已授权或已完成。

## 6. CI 与 lint 依赖补充核对

2026-11-05 追加。仅查询官方文档、公开 npm registry、官方 Action Git refs/API 及对应 commit 的公开文件；研究端未安装依赖、运行 CI、发布 workflow 或修改业务代码。

### 当前兼容组合

| 固定候选版本 | registry 的 Node engines / peer 要求 | 对本项目指定版本的判断 |
| --- | --- | --- |
| `eslint@10.14.0` | Node `^20.19.0 \|\| ^22.13.0 \|\| >=24` | Node `20.20.2` 满足。来源：[版本元数据](https://registry.npmjs.org/eslint/10.14.0)。 |
| `typescript-eslint@8.72.1` | Node `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0`；ESLint `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`；TypeScript `>=4.8.4 <6.1.0` | Node `20.20.2`、ESLint `10.14.0`、TS `5.9.2` 均满足。该包依赖同版本 parser/plugin；来源：[版本元数据](https://registry.npmjs.org/typescript-eslint/8.72.1)。 |
| `@eslint/js@10.0.1`（若使用其 config） | 同 ESLint 10 的 Node engines；peer ESLint `^10.0.0` | 与上述组合兼容。来源：[registry 元数据](https://registry.npmjs.org/@eslint%2fjs/10.0.1)。 |
| `typescript@5.9.2` | Node `>=14.17` | 满足指定 Node。来源：[版本元数据](https://registry.npmjs.org/typescript/5.9.2)。 |

以上是明确 engines/peers 的静态交集，**不是本仓库安装/运行测试通过的声明**。官方文档也给出 ESLint 10 的 Node 下限及 typescript-eslint 支持范围，见 [ESLint prerequisites](https://eslint.org/docs/latest/use/getting-started#prerequisites)、[typescript-eslint dependency versions](https://typescript-eslint.io/users/dependency-versions/)。候选版本应精确锁定并提交 lockfile，由主任务用 clean install 和实际 lint 验证；本研究没有代为执行。

当前 ESLint 官方把 10.x 列为 Current，9.x 自 2026-08-06、8.x 自 2024-10-05 已 EOL，见 [ESLint version support](https://eslint.org/version-support/)。`eslint-config-next@14.2.16` 的 registry peer 仍是 ESLint `^7.23.0 || ^8.0.0`，与 ESLint 10 不匹配，见 [该配置版本元数据](https://registry.npmjs.org/eslint-config-next/14.2.16)。因此不为恢复旧 `next lint` 引入 ESLint 8/Next 14 配置，也不通过强制忽略 peer 冲突拼接。

**配置建议：**直接用 ESLint CLI 和 `eslint.config.mjs` flat config，显式配置 JS/CJS/TS/TSX 范围、parser、运行环境及生成物忽略；官方接入示例见 [ESLint configuration files](https://eslint.org/docs/latest/use/configure/configuration-files)、[typescript-eslint quickstart](https://typescript-eslint.io/getting-started/)。可选择项目自定的小范围 correctness 规则，并明确加入禁止动态代码执行的 [`no-eval`](https://eslint.org/docs/latest/rules/no-eval)、[`no-new-func`](https://eslint.org/docs/latest/rules/no-new-func)，以及重复键/不可达分支/不安全 finally 等检查；规则选择属于实施决定，不能称为官方完整推荐集或安全审计。

只有配置了所需 type information 才能声称运行 type-aware lint，见 [typescript-eslint shared configs](https://typescript-eslint.io/users/configs/)。独立 `tsc` 仍是单独检查；该聚焦 lint 不覆盖完整 Next、React Hooks、a11y、跨账号授权、CSRF 或依赖漏洞检查。CI 应如实报告具体规则/文件范围及命令结果，不能将“lint 通过”扩展为这些未启用项目已通过。

### 官方 Actions 的不可变引用

下列 SHA 经官方仓库 `git ls-remote` 与 GitHub Git-ref API 双重核对，API 返回 object type 为 `commit`；又读取了该 SHA 下的 `action.yml` 和 README，非凭记忆填写。

| Action | 核对版本与完整 commit SHA | 官方证据 |
| --- | --- | --- |
| `actions/checkout` | `v6.1.0` → `d23441a48e516b6c34aea4fa41551a30e30af803` | [Git ref](https://api.github.com/repos/actions/checkout/git/ref/tags/v6.1.0)、[固定 action.yml](https://github.com/actions/checkout/blob/d23441a48e516b6c34aea4fa41551a30e30af803/action.yml)、[固定 README](https://github.com/actions/checkout/blob/d23441a48e516b6c34aea4fa41551a30e30af803/README.md)。 |
| `actions/setup-node` | `v6.5.0` → `249970729cb0ef3589644e2896645e5dc5ba9c38` | [Git ref](https://api.github.com/repos/actions/setup-node/git/ref/tags/v6.5.0)、[固定 action.yml](https://github.com/actions/setup-node/blob/249970729cb0ef3589644e2896645e5dc5ba9c38/action.yml)、[固定 README](https://github.com/actions/setup-node/blob/249970729cb0ef3589644e2896645e5dc5ba9c38/README.md)。 |

这两个 Action 自身运行于 **Node 24**，所需 runner 至少 `2.327.1`；它们的运行引擎与项目安装的 Node 不同，`setup-node` 仍可显式指定项目 `node-version: '20.20.2'`。checkout 的容器内认证 Git 场景另要求 runner `2.329.0`，普通无持久凭据检查不依赖该场景。建议用完整 SHA，并标注对应版本、`permissions: contents: read`、checkout `persist-credentials: false`；不向本轮检查注入生产/Netlify/Neon 凭据。完整 SHA 固定与最小权限原则参见 [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use)。本轮未在托管或自建 runner 实际执行上述引用。

### Next/Node 生命周期是独立生产门槛

**Next `14.2.16` 不应作为生产安全基线。**当前官方支持表将 14.x 列为 Unsupported，16.x 为 Active LTS、15.x 为 Maintenance LTS（已延长至 2027-01-31），见 [Next.js support policy](https://nextjs.org/support-policy)。2025-12 的 App Router RSC DoS 公告已要求 14.x 至少升级到 `14.2.35`，见 [2025-12-11 security update](https://nextjs.org/blog/security-update-2025-12-11)；这只是该次公告的修复线，不能据此断言 14.2.35 在今天仍获支持或解决全部问题。

最新核到的 2026-11-03 官方安全发布给出的受支持修复版本是 `16.4.5` / `15.5.29`，见 [November 2026 security release](https://nextjs.org/blog/november-2026-security-release)。漏洞适用性取决于具体部署方式和使用的功能；旧架构稿的静态导出配置不能证明线上运行路径，也不能据版本号就声称本站存在某个可利用 RCE。Next 14 stable 也不能误套用 2025 React2Shell RCE 影响范围，官方对此明确区分，见 [CVE-2025-66478 advisory](https://nextjs.org/blog/CVE-2025-66478)。

Node `20.x` 当前也已在官方发布表列为 EOL，见 [Node.js releases](https://nodejs.org/en/about/previous-releases)。它满足 lint 工具的 engines 并不表示它仍是获得安全维护的生产运行时。B2 本地/CI 可按要求用 `20.20.2` 保持可复现，但生产启用前仍须独立规划受支持 Next/React/Node 组合、Netlify 适配、构建/页面回归及当前依赖安全核验；本次聚焦 CI/lint 和会话原型不会顺带完成或宣称解除这一升级门槛。

### 脱敏报告 artifact 引用补核

2026-11-05 核到官方 latest release 为 **`actions/upload-artifact@v7.0.2`**，完整 commit **`cf430e030ddbb5b0abf93d22962f4752f3646cd9`**。官方 `git ls-remote` 与 [Git-ref API](https://api.github.com/repos/actions/upload-artifact/git/ref/tags/v7.0.2) 的 commit object 一致，另见 [官方发布页](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)。该 commit 的 [`action.yml`](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/action.yml) 为 `runs.using: node24`，[`package.json`](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/package.json) 要求 Node `>=24`。runner 需支持 Node24；上游 Node24 切换公告给出的最低版本为 **`2.327.1`**，见 [v6 runtime 公告](https://github.com/actions/upload-artifact/releases/tag/v6.0.0)，未发现 v7 提高该下限的额外要求。Action runtime 与项目 Node20/Node24 测试矩阵分别配置。

本任务建议仅 allowlist 已脱敏 test/tsc 等报告的具体路径，显式保持 `include-hidden-files: false`，设置短期 retention。默认排除隐藏文件不代替内容脱敏；禁止上传整个工作区、TEMP/runtime、数据库目录、`.env`、凭据或原始 Cookie/token 日志。输入及默认行为见 [固定 README](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/README.md)。此候选针对 github.com；该 README 明确 v4+ 不支持 GHES。本研究没有执行上传、CI 发布或读取任何待上传报告内容。
