# F03/F05 本地实施与安全验收交付

> **2026-11-07最终云端更新**：第二关建设完成，第三关在获批合成只读范围通过。接受源SHA **13de96d7531dde3222fdf513e711447a1df3e425**，实际Deploy **6aeebe4ceae178c10e4199e8**，https://jinxi-web-test.netlify.app 。[该SHA真实CI成功](https://github.com/2574303451-create/jinxi-web/actions/runs/42344725850)，托管HTTP31项和1440/390/320px浏览器检查全部通过。Build Node24.22.2/npm11.19.1，14个Functions元数据nodejs24.x。Linux npm及Netlify注入引起的水合兼容错误已修复；原失败未删除。实际错误Context部署被拒绝，恢复正确配置后重建通过。TEST后续构建暂停，PR预览关闭；无新PR、合并、生产操作或付费升级。详细范围、模拟/本机/真实云端证据与回退统一见[ADMIN_SIGNOFF.md](ADMIN_SIGNOFF.md)和results.json的gate3Execution。当前没有管理员待办，本轮停止；真实成员和旧业务仍未恢复。下方保留本地初交快照，不再执行其已完成的预检/授权步骤。

## A. 实际完成

远端基线 PR #18 / `be9513f37251d08661a3f6c1d5240ed059c59f2e`；开始时只读核实 open/draft/unmerged，base 为 PR #17 分支，main 仍 `2ce600a79955cd5e5a7bd798f266f8e17b0c283e`。

新本地工作树 `E:/Recovery/.jinxi-research/f03-f05/worktree`，分支 `codex/jinxi-f03-f05-test-foundation`。实现提交 `d5d6e6bc6a8edad2d2a2613d27255094873b18c9`；报告范围措辞更正 `4ef1966146643a6ea6525c529b5364ae4cdea28e`；默认值契约修复 `0d8e74162d8230d0628e314d82a385c84e889928`；非 superuser 初始化修复及最终受测 HEAD `297834e167f36c24f7e31d31d074f439bcef52f2`。后续证据提交不改变功能代码。没有 push、新 PR、合并或部署。

| 文件组 | 实际作用 |
| --- | --- |
| `netlify/functions/_shared/test-resource.js`、`test-resource-binding.json` | 审核绑定、平台 Site ID、构建证明、目标/角色/TLS/参数检查；默认 pending-approval |
| `function-security.js` | 接入独立资源环境；保留动态 cluster/数据库指纹、角色与权限证明；新 TEST 还核对 session_user 和 TEMP 权限 |
| `scripts/test-build-gate.cjs`、`build-test.cjs`、`run-clean.cjs`、`netlify.toml` | 仅获批 TEST Site/commit/context 能构建；Next 子进程剥离数据库变量；生成并打包非秘密 proof |
| `test-environment/sql/` | 只读预检、不可默认授权的 metadata 模板、原子初始化、单次种子、结构/数据核验、限定回滚 |
| `test-disposable-postgres.cjs`、`check-test-foundation.cjs`、`verify-test-role.cjs` | 新一次性本机 PG、完整可复现检查与离线角色证明 |
| 新 TEST/打包/PG 测试及两个既有测试 helper/冻结测试 | 正反配置、真实 ACL、实际 Functions、生成包路径与生产冻结验证；未关闭任何测试规则 |
| `.gitignore`、`package.json` | 忽略生成 proof/私有 approval，接入新安全测试及独立 PG 命令；未新增依赖或修改 lockfile |

app/components/hooks/lib/services/public 与基线无 Git 内容差异；原首页、头像框、双行展播、208 静态公开档案、/guides/ 和在线—保护。208 静态档案不等于 TEST 的 4 个合成账号，也不等于真实有效/在线账号。

## B. SQL 与合成数据

执行说明：[实施包](../../test-environment/README.md)。先 00 只读预检，管理员审核并另获云授权后，同一会话私有 approval → 01 → 02 → 03。回滚用 04，必须核对注册身份、实际 cluster/DB、initializer、对象 OID、列签名与 ACL；漂移和依赖使整个事务拒绝。未复用历史示例 INSERT、旧导入器或会清库的本机 seed。

4 个账号/资料包含普通、锁定、停用及同昵称不同 member ID；不存在账号不造一行。种子密码为不可登录标记。另有留言/回复、公告、攻略/媒体、合成赞助、签到、积分余额/流水/规则/商品，会话表为空。全部来源为本次合成定义。

本机初始化、重复拒绝、未知表/域保护、数据约束、读/写/DDL/TEMP/角色切换/私有数据/函数拒绝、表列/视图/序列/definer/所有权/继承超权、结构漂移与完整回滚已在新 PostgreSQL 17.11 实例验证。未改原 55433 实例；新 55435 集群结束后停止。

## C. Netlify / 数据库隔离

Netlify context 与资源环境分开：独立 TEST 在 production context 中使用 synthetic-test，不能进入旧 production 数据路径。SITE_ID 必须匹配审核 binding；保留的生产 Site ID 禁止用于 TEST。

Build 检查真实 CONTEXT 与批准 SHA/干净工作树；成功后生成带 Site/context/commit/binding digest 的包内证明。Functions 不要求平台在运行时提供 CONTEXT，但要求证明；若运行时 CONTEXT 存在必须一致，不伪造系统变量。

连接前核对批准 endpoint 主机、端口、数据库、reader 与 TLS/参数白名单；继承旧/管理/PG 连接变量时只查键存在即拒绝。连接后使用只读事务核对实际 cluster/database/role/注册分类/指纹和有效 ACL。模拟生产目标与角色在连接工厂调用前拒绝；实际 TEST 身份或超权失败在业务查询前拒绝。

Free 不强制升级套餐：可使用只含专用合成 reader 的站点级 all-scope，前提是管理员证明没有生产共享/模板/插件注入，且只构建审核提交。Next 构建子进程不继承数据库变量，但此措施不倒推保护依赖安装；源头隔离仍为必填。生产资源网络不可达未作测试或声称。

## D. 实际测试

受测 HEAD：`297834e167f36c24f7e31d31d074f439bcef52f2`；Windows/PowerShell，Node 24.22.2、npm 11.19.1、独立 PostgreSQL 17.11。本地 `npm ci` 已成功安装 1539 包。统一命令：

```powershell
node scripts/check-test-foundation.cjs --pg-bin '<PostgreSQL bin 绝对路径>'
```

| 检查 | 结果 / 退出码 |
| --- | --- |
| 原始 tsc --noEmit --incremental false | 0 |
| ESLint（保留原规则） | 0 |
| API | 14 / 14；0 |
| 安全、模拟配置、真实 Netlify ZIP/运行时路径 | 48 / 48；0 |
| 一次性 PG 实际 SQL/ACL/Functions/回滚 | 46 / 46；0 |
| Next 静态构建与 CSP | 0；原路由导出，7 页 / 8 哈希 |

[机器结果](results.json) · [API/安全日志](unit-api-security.log) · [PG 日志](disposable-postgres.log) · [构建日志](static-build.log) · [保留失败与修正](FAILURES.md)。日志中的本机用户目录做脱敏，命令 PG_BIN 用占位符；未隐去失败条件或放宽断言。

没有真实云端验收、Neon 密码认证或新 GitHub CI 结果。旧 PR #18 的 CI 不能冒充本次 HEAD；新安全测试已接入 npm test，推送后才会由现有工作流执行。新 46 项 PG 使用独立 runner，本轮仅在本机运行。数据库传输范围不是测量得到的云连接计数。

## E. 管理员清单

[一次性填写与授权清单](ADMIN_SIGNOFF.md)。先在指定 TEST 运行 00 并返回非敏感 metadata；其后集中审批远程 SQL/角色/凭据、独立免费 TEST 站点、TEST 分支 push（无需新 PR）、变量及部署。新 Site ID 与真实资源元数据进入审核 binding 后还需重新提交和核验，不能仅设置 approved 字符串上线。

旧生产保护采用用户控制台证据，不再重复调查。新 TEST 无密钥值回传要求，不连接 pr17-validation，不通过生产写入或试登录证明拒绝。

## F. 进度与停止点

| 状态 | 项目 |
| --- | --- |
| 已实现、本地已验证 | SQL、合成夹具、最小角色（含非 superuser 初始化全流程）、绑定/连接守卫、构建门禁、打包和负向自动验收、回滚 |
| 已准备 | Neon 只读补查 SQL、Netlify Free 配置流程、集中审批表 |
| 云端待授权 | TEST DDL/DML、真实角色/凭据、建站、TEST 分支 push、变量、部署 |
| 未通过云端签核 | F03/F05 真实继承、提供方资源映射、Neon 权限/身份函数兼容、实际托管运行；尚缺证据，不是假称本地失败 |
| 尚未开始 | 云端部署验收；真实成员登录、生产头像、心跳及名单 API |

唯一下一步：在 `jinxi-test / production / neondb` 执行 00-preflight.sql，并连同控制台 project/branch/endpoint IDs 返回脱敏结果；通过后再集中授权云建设。
