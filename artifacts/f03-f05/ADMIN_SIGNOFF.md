# 管理员一次性清单与审批边界

## 已登记，结束旧站基础调查

来源为用户控制台核查，非本轮云操作：生产 Published `69a92f4f7be620c834490be1` 已锁定；main；Branch Deploys 仅生产分支；Deploy Previews 为 Don't deploy pull requests 且已保存。旧站 12 Functions、历史数据、快照和 pr17-validation 保持原状。本轮不重新调查或更改这些设置。

用户已在独立 `jinxi-test / production / neondb` 两次执行只读 SQL：public 基础表 0；用户 schema public，表/视图/序列各 0。这是合成初始化准备依据，不是全库脱敏或权限验收。本轮先补只读目录证据，不复制生产记录。

## 第一关：只读资料，已集中审查

2026-11-07 状态：**第一关通过；第二关的云端合成初始化已通过用户 CSV 与明确 COMMIT 证据验收，实际 reader 连接/权限待执行；第三关未执行。** 第一关用户回传 8 份 CSV、2 张 SQL Editor 截图，并补齐 project/branch/endpoint IDs。截图中的 17 个 SELECT 对应 8 个非空结果、9 个空结果，未见执行错误，末项 ROLLBACK 可见。证据来自用户控制台操作，本机没有连接 Neon。此前两次空表/视图/序列检查不重复执行。

`00-preflight.sql` 保持已审查版本，只有只读目录查询及事务设置，不返回凭据或业务行。成员关系逐项 INHERIT/SET 标志均有值；复核记录及原 SQL 专测见 results.json 的 gate1Review。**未知对象不清除，权限报错不跳过；第一关不授权远程 DDL/DML。**

下表是第一关预检快照，不代表初始化后的当前对象或角色数量。

| 资料 | 已核查结果 / 后续负责动作 |
| --- | --- |
| TEST 项目 | jinxi-test；用户确认 Project ID 为 restless-salad-74668264 |
| 分支 / endpoint | production；br-red-pond-bdtrjpmy；ep-dry-queen-bd6q46s6，用户文字确认 |
| 数据库 / PG | neondb；server_version_num=180006，即 PostgreSQL 18.6 |
| cluster ID / 数据库 OID / 初始化主体 | 7704950029723409949 / 16397 / neondb_owner |
| 创建来源及当前数据分类 | 沿用用户新建独立项目证据；此次所查 neondb 无用户业务对象，未见待处理业务数据。没有认证其他数据库内容或整个组织的历史来源 |
| 数据库、对象、扩展和连接 | neondb 与维护库 postgres；用户 schema 仅 public；无用户关系、函数、触发器、类型、外连、订阅、事件触发器、发布或其他连接；仅标准 plpgsql 扩展 |
| 默认 ACL 与 public 权限 | 9 条展开授权，均为 cloud_admin 在 public 的模板授予 neon_superuser；表 6 项、序列 3 项，可再授权。PUBLIC 仅 schema USAGE，无 CREATE；pg_database_owner 有 USAGE/CREATE |
| 角色及继承 | 21 个角色、12 条成员关系；平台角色、PG 内置角色及保留 token_roles 已解释。neondb_owner 具有管理权限且继承 neon_superuser，只能用于初始化，绝不能作为网站 reader；尚无 jinxi_test_* 角色 |
| 独立 TEST 站点、Site ID/Team、套餐额度 | 尚未建设/核实；属于第二关授权后的建站前检查，不作为要求重跑第一关的理由 |

真实结果发现一个必要兼容修复：原 01 初始化脚本拒绝任何 pg_default_acl，会错误阻止上述已解释的 Neon 平台模板。现在仅识别 cloud_admin（必须不同于当前初始化主体）、public、指定对象类型、精确权限/受让者/可再授权组合；不删除或修改平台 ACL。未知、全局、当前初始化主体的默认授权或权限集合变化仍拒绝。reader 的实际权限、无角色继承等检查不变。

受测实现提交 `316ae73c9de885ad4ec08c7a70c5a3cd0650d374`：兼容/攻击/回滚专测 11/11，原空库完整生命周期 46/46；针对变更脚本的 ESLint 退出 0。失败复现、通过日志及原始证据指纹登记在 results.json 和 FAILURES.md。测试运行于全新本机 PostgreSQL 17.11，不代表 Neon 18.6 的初始化或实际运行角色权限已验收；后者仍属于第二、三关。

不提供密码、完整连接串、账号行、散列、Token、SQL 活动正文或连接选项。不要执行 env:list/env 导出，也不要先读取原始值再截断。无需再提供旧站基础设置截图。

此次结果及资源 IDs 已齐，不再要求补跑同一预检或重复截图。若批准建设前目标身份或结构实际变化，停止对应动作并核对差异；SQL 失败只做 ROLLBACK，不跳过失败项或自行补权。SQL 不能认证 Neon project/branch，已结合上述用户控制台与文字证据确认提供方身份。

## 第二关：集中批准云建设（已授权，执行中）

第一关已通过。用户已通过本会话《F03/F05 第二关正式授权与云端 TEST 建设执行指令》批准以下限定资源及动作，随后两次明确继续。**授权已取得，不再重复申请；执行前置条件仍须满足。** 不用泛化的 approved 标记替代实际资源和权限证明：

- 仅在上述 project restless-salad-74668264、branch br-red-pond-bdtrjpmy、endpoint ep-dry-queen-bd6q46s6、neondb 执行 01/02/03、创建 TEST 专属角色和凭据；writer 保持 NOLOGIN。不得连接 jinxi-web / production 或 pr17-validation。
- 创建/复用一个独立 `jinxi-web-test` 站点（名称以可用为准），不新增付费规格、项目或存储。创建前确认免费额度与超额行为，遇付费要求停止。
- 将本机审核实现推送到一个 TEST 专用分支，不创建第 19 个 PR，不改原 18 PR/base/main。必要性：Netlify Git 构建必须能够取得本机实现；旧站 main-only + 预览关闭，因此该分支不得触发旧站部署。
- 私下配置 TEST 环境变量，执行一次指定 SHA 的 TEST 部署和只读/拒绝验收。允许的数据范围全部为合成数据；不恢复真实成员、积分或旧写入。
- 业务、SQL 和运行时权限基础为已受测提交 316ae73c9de885ad4ec08c7a70c5a3cd0650d374；8ce78a9 提供本机受测的管理员整批包装，aa398b506271e9fcbd55b610e981c92cfc6973f1 提供 reader 辅助操作与原生客户端证明。辅助工具对应已授权步骤，不改变业务或线上安全门禁。建站后只将该批准资源、实际 TEST Site ID、注册 UUID/身份指纹填入既有绑定文件；检查差异并记录最终完整 SHA 后才推送、部署。其他功能改动不在本关授权内。
- 失败仅停止 TEST、撤销 TEST 角色凭据、按批准脚本回滚 TEST 对象。

批准人：用户，本会话附件授权及继续指令；资源为以上唯一 TEST 目标，独立站点名 jinxi-web-test（可用性待核实）；有效窗口：本次建设及验收；费用上限：0，不升级套餐、不接受付费附加项；实施与 TEST 回滚：Codex 在此次授权范围内执行，需控制台权限的私密凭据操作由管理员完成。

### 已完成：初始化与云端提交

用户已补齐 09-13-46 两份 CSV 和 `codex-clipboard-0ff9d7d1-eab5-4476-8546-3405640610b6.png`。CSV 各一行：67 数量为 synthetic-test-v1 / 5 篇攻略 / 2 条留言 / 4 个合成账号 / 0 会话；68 的项目、分支、endpoint、注册 UUID、cluster/OID、初始化主体、PG180006 和 seed_version=1 与批准值逐项一致，三角色 can_login 及五项管理能力标志均 false。截图明确选中 **69 COMMIT** 并显示 Statement executed successfully。现签核该初始化步骤通过，角色实际认证和托管隔离另行验收。

原先截图中 COMMIT 不可见的证据缺口已关闭，不再索要这三项，不重跑初始化。历史截断提示只影响 Neon 保存查询的长度，本地原稿与摘要保留；不得依赖截断历史重新执行。原 CSV/截图留在用户本机，文件名及 SHA256 登记在 results.json。

### 当前管理员执行项：只读定位设置工具的实际失败阶段

最新用户截图显示两次输入 TEST 管理员密码后均返回 TEST_READER_PASSWORD_SETUP_UNAVAILABLE，尚未进入新 reader 密码提示；这两次没有进入密码设置阶段，不能据此断言管理员密码错误。已修复工具丢失失败阶段的问题，先运行同一工具的只读诊断模式，不重跑初始化或变更角色。

同一固定 Node/干净环境对批准 TEST 主机的 TLS-only 检查已返回 TLS_VERIFIED：只发送 PostgreSQL SSLRequest 并验证证书，未发送 Startup、用户名、密码或 SQL。这证明该次证书握手成功，不证明管理员认证、数据库身份或 reader 权限通过。

真实平台问题：用户在控制台为 SQL 创建、无初始密码的角色执行 Reset password，收到 cannot update password for role without password。先前建议此入口未考虑这个限制，现予纠正，不再重复该操作。Neon 官方说明 SQL 设置密码需由服务器接收明文后加密保存，不支持预先哈希；psql 的反斜线 password 命令会在客户端加密，不能直接当作此平台的通用替代。依据：[Neon 角色](https://neon.com/docs/manage/roles)、[psql password](https://www.postgresql.org/docs/18/app-psql.html)。

已取得的状态仍有效：初始化数量及 COMMIT 已通过，09-52-30 状态 CSV 显示三个角色均 NOLOGIN、五项管理标志及成员角色均 false，reader/writer NOINHERIT。若此后已经单独启用 reader，新工具也允许其 LOGIN 已为 true，但不放宽任何资源、注册、结构或有效权限检查。原一次性激活脚本和原 validateProof 均未修改。

**唯一当前操作：在你本机 PowerShell 运行以下诊断命令。** 只在隐藏提示处输入当前 TEST neondb_owner 密码。不要在控制台重置密码，不将密码写进 SQL Editor、文件、命令参数或聊天，不重新初始化。

```powershell
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'E:/Recovery/.jinxi-research/f03-f05/worktree/scripts/setup-test-reader-password.cjs' --diagnose
```

本模式只有一次管理员隐藏输入；连接后强制 BEGIN READ ONLY，复用既有目标/结构/有效权限及日志预检，最终 ROLLBACK。不会询问新 reader 密码、执行密码设置、生成设置回执或启动 reader 证明。将最后一行 JSON 集中回传即可：只有固定 stage、reason、SQLSTATE/网络错误码；日志策略失败时只列固定检查名称，不输出实际配置值、底层异常、SQL、参数或凭据。成功标志 READ_ONLY_PREFLIGHT_PASSED 也仅表示该预检成功，不是 reader 或第三关通过。

以下是故障解决后正常模式的既定步骤，当前不执行，也不新增关卡。届时去掉 --diagnose，准备并私下保存新 reader 专用随机密码：32至128位可见英文字符，大小写/数字/符号至少3类。不要使用连接串、管理员密码或文档示例密码；输入顺序：

1. 已经重置过的 TEST neondb_owner 管理员密码，仅用于本次获准的角色管理；程序不会再次重置它。
2. 你准备好的新 jinxi_test_reader 密码。
3. 再次确认同一个新 reader 密码。
4. 设置提交后自动进入原生 psql 验证，此时输入刚设置的 reader 密码。

工具固定连接批准的 TEST 直连 hostname/5432/neondb/neondb_owner，干净子进程剥离连接和调试环境，TLS 校验证书，开启 SCRAM 通道绑定支持。先只做目标、角色和所查日志配置核验；日志条件未知或不安全就在提交新密码前停止，不自行关闭日志。通过后在同一 PostgreSQL 事务内用绑定参数和事务内临时值传递密码，固定只设置 jinxi_test_reader 的密码与 LOGIN，强制该次存储使用 SCRAM-SHA-256；提交前再次检查有效权限，漂移则回滚。密码不进入提交 SQL 的文本、客户端文件、输出或命令参数；异常不回显参数或底层异常文本。所查 PostgreSQL 日志/统计/审计设置的拒绝条件有明确代码，不能据此声称已审计不可见的提供方全部内部遥测。

若 TEST_PASSWORD_LOGGING_POLICY_UNPROVEN、目标/权限不符、密码格式/确认不符、连接失败或提交不明确，停止并只回传错误码。不要放宽检查、修改服务器日志来过关、改用管理员执行 reader 证明或自动重试。若显示 TEST_READER_PASSWORD_SET_BUT_PROOF_PENDING，说明设置步骤已提交，之后只继续原只读证明，不重复设置以免再次轮换。

成功时生成两份被 Git 忽略的非秘密回执：cloud-reader.provisioning.local.json 只含角色标志和目标；cloud-reader.proof.local.json 含原 validateProof 校验后的实际 reader 会话/ACL 及公共合成读取 5/2/1/1。回传后者即可，不发送密码。若已存在成功设置或证明回执，工具在再次连接前拒绝覆盖。

当前受测源码 9d6c496eb21085bbde59f2e3cbaa1ef43ac0bca3：安全单测59/59，其中诊断专测11项；本机PG17.11回归17/17，包含服务器实际只读状态、角色保持不变和原密码设置/有效权限/回滚用例；相关ESLint退出0。非交互调用在网络前拒绝。日志 password-diagnostic-security.log / password-diagnostic-postgres.log / password-diagnostic-lint.log；修复前4项失败保留在 password-diagnostic-before-fix.log。原 eb90bda 的16项和更早15项日志仍保留。**最新 Neon18.6 认证/预检故障尚未定位；未完成 reader 实际认证及云端权限验收，Netlify TEST 尚未建设。**

先前聊天中的 TEST 管理员凭据未被使用或写入文件，用户已确认仅重置 jinxi-test 的 neondb_owner。此确认继续沿用，不再轮换它；工具仅由管理员本机私密输入当前密码。旧站、真实数据、生产角色、18个原PR和 Netlify 生产设置均不操作。该修复仍属于原第二关的凭据配置，不新增关卡；实际 reader 证明通过后才继续独立 TEST 建站。

### 初始化执行说明（已运行，保留复核，不重复执行）

Windows Computer Use 两次因无法可靠识别当前浏览器 URL 而停止，未输入或运行云端 SQL。该工具故障不代表资源授权缺失；按用户已批准的管理员代执行路径推进，不再重复同一浏览器重试。

在本机运行 `node scripts/prepare-test-bootstrap.cjs`，离线生成已填参数的 `test-environment/sql/cloud-bootstrap.local.sql`。文件已由本轮执行生成，不需要管理员运行生成命令或自行拼接 SQL。它不联网、不读取 .env、不接受连接字符串；固定核对已审核 01/02/03 的 SHA256，不覆盖已生成文件。生成文件被 Git 忽略，摘要记录于原 results.json；原 01/02/03/04 均未改变。

本文件仅将 01/02/03 的外层事务改为一个共同事务，保留原检查、DDL、权限、种子与核验语句。首个写入前核对 cluster、数据库 OID、neondb_owner、同一主体及 PG 180006；批准参数使用事务内 LOCAL 设置，无需多个 Run 复用会话。任一错误使整批事务失败，不能先提交结构、后留下失败种子；不会自动清除未知对象或提升 reader 权限。

本机交付：生成文件 SHA256 `b3137364c865ae45f379ebbacd687c00ef613bcbe28e458234eb72a91d199419`；注册 UUID `0fdb5a68-436e-4a80-b01d-5b0207637eac`（非秘密身份标识）。整批脚本/生成器受测源码与提交 `8ce78a9f8a815159d8642dc3fc984c3e255aa0f4` 一致；当时 PG17.11 专测 9/9、ESLint 退出 0，日志 bootstrap-review.log。失败保留于 bootstrap-before-fix.log / FAILURES.md。现在 PostgreSQL18.6 初始化及合成数据已由上述真实回执验收，实际 reader 认证及托管权限仍待验证。

**已交付的执行步骤，仅作复核存档：** Neon 选中 `jinxi-test / production / neondb`，确认仍是以上获批项目/分支/endpoint、初始化角色为 neondb_owner；打开本地 `cloud-bootstrap.local.sql`，完整复制到 SQL Editor，清除选区后一次 Run 全文。用户已回传本次运行截图，当前不要重复该步骤。

- 预期原核验结果：fixture=synthetic-test-v1，strategies=5，messages=2，synthetic_accounts=4，cloud_sessions=0。
- 最后资源回执应为 READY_TO_COMMIT、seed_version=1，资源 IDs 与本表一致；三角色 can_login/superuser/create_db/create_role/replication/bypass_rls 均为 false。**回执仍在事务内，必须同时看到无错误及最终 COMMIT 才算初始化成功。**
- 将上述两张结果表和最终 COMMIT 状态集中回传（CSV 或清晰截图均可）。允许分享资源/角色元数据与合成记录数量；不要分享账号行、密码、连接字符串或散列。
- 任一错误、版本/目标不符、未知对象或异常权限：停止，只在必要时执行 `ROLLBACK;` 结束失败事务，回传错误文本；不要重复运行、修改参数、补权或删除对象。网络中断或提交结果不明确也停止，不自动重跑。

该初始化步骤已完成，不等于 reader 真实认证或云端隔离通过。继续上方当前 reader 操作项，再进入独立 Netlify 建站；不新增关卡。

## 批准后的操作位置与配置

1. **Neon TEST**：初始化已完成，不再执行 approval + 01/02/03；按上方当前项启用并验证 reader。不能运行历史 schema、旧导入器、本机 TRUNCATE 夹具。仅通过实际权限验证的 reader 凭据可私下进入 TEST 站点。
2. **Netlify → Add new project / 已有 TEST 项目**：使用明确批准的 TEST 分支作为该站点的 Production branch。Context 合法为 production，资源分类仍 synthetic-test；只部署这个分支，关闭任意 PR 预览。创建步骤不得复制旧站配置、连接生产数据库集成或导入旧 .env。
3. **TEST Project configuration → Environment variables** 与 **Team settings → Environment variables**：核查 site/shared/分支来源、模板、Extensions、Build Plugins。确认不提供生产数据库、管理凭据、存储或外连能力。无法排除共享来源就停止，不修改生产共享变量来迁就 TEST。
4. 仅在第二关集中授权内，将真实非秘密 Site ID、TEST 资源 IDs、cluster/DB 指纹、reader 和 contexts 填入源码 `netlify/functions/_shared/test-resource-binding.json`；核查差异后改为 approved、生成本地提交并登记最终 SHA，再推送批准的 TEST 分支。不得在运行环境用 JSON 变量替换该审核文件，或将授权扩展到其他源码变更。
5. **TEST Build & deploy**：Build `node scripts/build-test.cjs`，Publish `out`，Functions `netlify/functions`。以仓库 TOML 为准。Node 24.22.2 / npm 11.19.1；ignore 门禁只允许匹配站点、真实 context、干净的指定提交。未配置时首次构建跳过属于预期。默认部署/导入别名仍阻断。
6. **TEST Environment variables**：创建下表。优先 Functions-only；Free 无细分 Scope 时允许 TEST 专用 all-scope，必须先证明所有构建只得到合成 reader 凭据。Next 子进程还会剥离数据库变量。源码包含未审核变更、锁文件变化、commit 不符、共享生产变量或付费要求时停止。

| key | 配置类型与用途 |
| --- | --- |
| JINXI_RESOURCE_ENVIRONMENT | 非秘密字符串 synthetic-test |
| JINXI_RUNTIME_CONTEXT | 非秘密字符串 production，须与真实部署匹配 |
| JINXI_CLOUD_ISOLATION_APPROVAL | 管理员完成签核后记录 approved；不是资源证明 |
| JINXI_TEST_APPROVED_COMMIT | 非秘密、完整 40 位获批提交 SHA |
| JINXI_TEST_READ_DATABASE_URL | 管理员私下输入的专用 reader 连接；只允许审核的 TEST endpoint/neondb/reader 与 TLS 参数 |

不要自行设置/伪造 Netlify 保留 SITE_ID/CONTEXT；它们由平台产生。不要创建旧 DATABASE_URL、NETLIFY_DATABASE_URL、NETLIFY_DATABASE_URL_UNPOOLED、ADMIN_PASSWORD、PG 连接环境、JINXI_PRODUCTION/PREVIEW/LOCAL/SESSION 前缀或管理 Token；代码检查这些名称存在即拒绝，不读取值。

## 云端验收，当前未执行

登记 Site/Deploy ID、完整 SHA、真实 Build/Functions Node、绑定文件 digest、角色证明和采集时间。用 reader 的只读 proof 在本地 verifier 校验；公开合成内容正常，错误上下文/站点/目标/角色在传输前拒绝，实际 TEST 身份或超权失败不执行业务查询，旧写保持关闭。

负向生产目标只用虚构 metadata/模拟传输，禁止试连生产。TEST principal 对 PROD 的隔离来自独立凭据签发归属、生产管理员已有授权清单/控制面证据及无外连通道；缺少证据就标 F05 未完成，不以实际生产试错补证。无独立网络出口拒绝证据时不宣称生产地址在网络层不可达。

HTTP/角色证明与实际对应部署一起签核；变量是部署快照，改配置不清除历史部署。停止 TEST 时撤销 TEST 运行凭据并处理旧 TEST 部署，不能只删除变量。旧生产锁定基线沿用用户证据，不借验收之名修改旧站或查询生产行。
