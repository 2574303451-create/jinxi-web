# 管理员一次性清单与审批边界

## 已登记，结束旧站基础调查

来源为用户控制台核查，非本轮云操作：生产 Published `69a92f4f7be620c834490be1` 已锁定；main；Branch Deploys 仅生产分支；Deploy Previews 为 Don't deploy pull requests 且已保存。旧站 12 Functions、历史数据、快照和 pr17-validation 保持原状。本轮不重新调查或更改这些设置。

用户已在独立 `jinxi-test / production / neondb` 两次执行只读 SQL：public 基础表 0；用户 schema public，表/视图/序列各 0。这是合成初始化准备依据，不是全库脱敏或权限验收。本轮先补只读目录证据，不复制生产记录。

## 第一关：只读资料，一次回传

在 Neon 明确选中上述 TEST 目标，运行 `test-environment/sql/00-preflight.sql`。提交脱敏结果和以下元数据。**未知对象不清除，权限报错不跳过；本轮不授权远程 DDL/DML。**

| 资料 | 管理员填写 |
| --- | --- |
| TEST 项目/分支/endpoint ID、数据库名、PG 版本 | ___ |
| 项目/分支创建来源；是否做过导入、恢复、克隆 | ___ |
| 当前 cluster ID、数据库 OID、初始化主体 | ___ |
| 其他数据库、用户对象、扩展、默认 ACL、角色继承、外连及连接聚合的解释 | ___ |
| 数据分类：空/全部合成/来源不明；未知项处理决定 | ___ |
| 独立 TEST 站点是否已有、Site ID/所属 Team、套餐/额度/超额规则 | ___ |

不提供密码、完整连接串、账号行、散列、Token、SQL 活动正文或连接选项。不要执行 env:list/env 导出，也不要先读取原始值再截断。无需再提供旧站基础设置截图。

## 第二关：集中批准云建设（当前待授权）

只读资料通过后，一次批准以下明确范围；填实际资源与窗口，不用泛化的 approved 标记替代：

- 在已核验 `jinxi-test / production / neondb` 执行 01/02/03、创建 TEST 专属角色和凭据；writer 保持 NOLOGIN。不得连接 jinxi-web / production 或 pr17-validation。
- 创建/复用一个独立 `jinxi-web-test` 站点（名称以可用为准），不新增付费规格、项目或存储。创建前确认免费额度与超额行为，遇付费要求停止。
- 将本机审核实现推送到一个 TEST 专用分支，不创建第 19 个 PR，不改原 18 PR/base/main。必要性：Netlify Git 构建必须能够取得本机实现；旧站 main-only + 预览关闭，因此该分支不得触发旧站部署。
- 私下配置 TEST 环境变量，执行一次指定 SHA 的 TEST 部署和只读/拒绝验收。允许的数据范围全部为合成数据；不恢复真实成员、积分或旧写入。
- 失败仅停止 TEST、撤销 TEST 角色凭据、按批准脚本回滚 TEST 对象。

批准人 ___；资源/分支/站点 ___；允许动作 ___；候选 SHA ___；有效窗口 ___；费用上限（不自动付费）___；回滚负责人 ___。

## 批准后的操作位置与配置

1. **Neon TEST → SQL Editor**：确认资源再执行私有 approval + 01/02/03。01 会拒绝重复或未知对象。不能运行历史 schema、旧导入器、本机 TRUNCATE 夹具。**TEST → Roles**：为通过 SQL 创建的 reader 私下配置密码，并用审核 SQL 启用 LOGIN；不要用默认 Add role 创建高权 reader。仅 reader 凭据进入 TEST 站点。
2. **Netlify → Add new project / 已有 TEST 项目**：使用明确批准的 TEST 分支作为该站点的 Production branch。Context 合法为 production，资源分类仍 synthetic-test；只部署这个分支，关闭任意 PR 预览。创建步骤不得复制旧站配置、连接生产数据库集成或导入旧 .env。
3. **TEST Project configuration → Environment variables** 与 **Team settings → Environment variables**：核查 site/shared/分支来源、模板、Extensions、Build Plugins。确认不提供生产数据库、管理凭据、存储或外连能力。无法排除共享来源就停止，不修改生产共享变量来迁就 TEST。
4. 建站后将真实非秘密 Site ID、TEST 资源 IDs、cluster/DB 指纹、reader 和 contexts 填入源码 `netlify/functions/_shared/test-resource-binding.json`；经审核改为 approved 并生成新本地提交，再获批推送 TEST 分支。不得在运行环境用 JSON 变量替换该审核文件。
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
