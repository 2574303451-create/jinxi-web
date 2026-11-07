# F03/F05 TEST 实施包

基线 PR #18 / `be9513f37251d08661a3f6c1d5240ed059c59f2e`。仅本地实施；真实云端未连接、未初始化、未部署。生产站点及 Neon 历史数据保持原状。

## 执行顺序

1. **只读预检**：在 Neon 控制台明确选中 `jinxi-test / production / neondb`，运行 [00-preflight.sql](sql/00-preflight.sql)。它只读目录、非敏感角色/ACL、依赖及连接聚合，不返回业务行、函数正文、连接选项或密码散列。项目/分支/endpoint 必须由控制台另行确认，SQL 不能自行证明提供方资源归属。
2. 管理员检查所有输出。未知用户对象、额外数据库、默认授权、外连、发布/订阅、业务连接或不明角色依赖未解释前，停止初始化。现有 `public` 表/视图/序列为 0 的用户证据只作为准备依据。
3. **另获远程操作授权后**，从预检中确认 cluster ID、数据库 OID 和资源 ID，填写 [approval.example.sql](sql/approval.example.sql) 的私有副本。`approval` 值改为 `synthetic-test-v1`，生成新的 environment UUID；其他字段来自审核资料，不从连接字符串截图中取值。不把 approval 字符串视为隔离证明。
4. 用户已限定授权唯一 TEST 的第二关建设；当前依照原 ADMIN_SIGNOFF.md 的管理员代执行项，运行已填参数的 `sql/cloud-bootstrap.local.sql` 全文。该本机忽略文件由 `node scripts/prepare-test-bootstrap.cjs` 离线生成，不覆盖已有文件；固定源码 SHA256 确保重用已审核的 01/02/03，只收敛外层事务为一次提交，所有失败会阻止整批提交。无需手工拼接、分多次 Run 或重跑 00。错误只结束失败事务并回传，不补权、不删未知对象、不自动重跑。原单文件及 04 保留用于审核和获批准的恢复，不直接改其内容。
5. 所有新角色初始 `NOLOGIN`。本关初始化核验通过后，由管理员私下为 reader 配置凭据并启用 LOGIN，再验证其真实身份和权限。`jinxi_test_writer` 保持 NOLOGIN 且无业务授权；管理员凭据不进入 Functions。通过 SQL 创建角色，不能拿 Neon 控制台默认高权限角色替代 reader。
6. 管理员以 reader 运行 `node scripts/verify-test-role.cjs --sql` 生成的只读证明脚本（psql 模式；参数是批准的库名、角色和环境 UUID）。保存非敏感 proof JSON，再在本机运行 `node scripts/verify-test-role.cjs --verify <proof.json> <approved-binding.json>`。这验证真实身份和直接权限；跨资源、共享变量及间接路径仍须管理员签核。

2026-11-07 实施状态：用户已通过两份结果 CSV 和明确 COMMIT 完成 Neon18.6 合成初始化。当前专用 reader 由 `prepare-test-reader.cjs` 生成的限定目标文件启用，随后 `run-test-reader-proof.cjs` 让管理员在原生 psql -W 私密提示输入该 reader 密码。后者先验证 SQL 摘要，固定 TEST 直连主机/角色和 TLS/通道绑定，剥离连接环境和 psql 启动脚本，仅执行原 ATTESTATION_SQL、实际会话检查及公共合成数量读取。它沿用同一 validateProof 在建 Netlify 站点前验证数据库部分，不需要伪造 Site ID；原 --verify 和运行时绑定门禁保持不变。文件、命令、回传及停止条件集中见原 ADMIN_SIGNOFF.md，不在此另立清单。

同日平台纠正：Console Reset password 对无初始密码的该 SQL 角色失败，改由 `setup-test-reader-password.cjs` 在用户本机隐藏输入首次密码，固定 TEST 目标、预检已定义日志风险、事务内设置既有 reader 密码及 LOGIN 并前后复核 ACL，再自动调用原只读证明。它接受 reader 尚未启用或已启用两种正常起点，不改变原一次性激活或运行时安全策略。新操作以唯一 ADMIN_SIGNOFF.md 当前项为准；不将密码粘贴到 SQL Editor/命令参数，也不使用在 Neon 不受支持的预先哈希替代。

合成数据：4 个账号/资料（普通 2、锁定 1、停用 1）、同昵称不同 member ID、留言/回复、5 篇攻略（4 published / 1 draft，含 thumbnail-only 与 null 附件）、1 公告、1 合成赞助、1 签到、2 钱包、2 流水、规则和商品。会话表初始为空。视频仅为明确标注的故意失败本站路径，公开视频有效 URL 统计为 1，不代表可播放、播放次数或生产数量。

种子账号使用不可登录标记，不包含可用密码或 PBKDF2 散列。只有本地测试在内存生成随机密码，参数化写入新一次性数据库的合成散列；明文不写文件、不输出。云端登录/会话保持关闭，不能将这些数据库结构验收写成正式登录通过。

## 权限和身份

- 2026-11-07 已审查的 Neon 空库具有 cloud_admin 在 public 授予 neon_superuser 的默认模板（表 6 项、序列 3 项，含 grant option）。初始化仅兼容这一精确组合且其所有者必须不同于当前初始化主体，不修改这些平台授权；其他默认 ACL 仍拒绝。默认权限按实际创建角色生效，不沿成员关系继承，依据 [PostgreSQL 18 默认权限](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html)。真实证据、资源 IDs、兼容修复与本机失败/通过日志统一登记在原 ADMIN_SIGNOFF.md 和 artifacts/f03-f05/results.json；这不是云端初始化授权。
- 初始化管理员只用于批准的 TEST；内容/注册表归 NOLOGIN owner 管理，独立 reader 仅 SELECT 四张公共内容表及 EXECUTE 固定、无参数的身份函数。
- 身份函数由初始化管理员拥有，固定 `search_path=pg_catalog`，返回实际 cluster ID、当前数据库/OID 和受保护的合成注册身份；reader 不获得监控或管理员角色。Neon 对此函数的实际托管权限兼容性待真实 TEST 核验，失败不得通过提升 reader 权限解决。
- reader 无角色继承、对象所有权、管理权限、私有账号读取或写入权限。新 TEST 内撤销 PUBLIC 的 schema CREATE、数据库 CONNECT/TEMP，再单独给 reader CONNECT；不修改其他数据库或项目。
- 新 `JINXI_RESOURCE_ENVIRONMENT=synthetic-test` 与 Netlify context 分开。TEST 可使用自己的 production context。资源绑定文件含 Site ID、项目/分支/endpoint、主机/库/角色、注册 UUID、指纹和获批 contexts，**不含密钥**；随源码审核，不允许用环境变量覆盖。
- `test-resource-binding.json` 当前为 pending-approval，所有真实云构建/连接默认拒绝。保留旧生产身份检查；旧 Published 没有更新。
- 构建双门禁仅允许独立 TEST Site ID、匹配的平台 CONTEXT 和批准的干净 Git 提交。生产 Site ID 永远不能作为 TEST 绑定。构建后生成非敏感 deploy proof；Functions 用平台只读 SITE_ID、证明中的 context 与 binding digest 检查。运行时 CONTEXT 若存在必须一致；缺少 proof 时拒绝，不伪造平台 CONTEXT。
- DSN 在连接工厂之前核对主机、端口、数据库、角色、TLS 和参数白名单；之后仍执行实际身份/权限证明。host 相同或分类字符串相同不构成放行。
- 数据库指纹不单独证明 Neon 分支归属；必须结合提供方 project/branch/endpoint 证据。可用 `node scripts/verify-test-role.cjs --fingerprint <cluster_id> <database_oid>` 在离线生成 neondb 指纹；输入是非秘密资源标识，不是密码散列。
- 缺失 TEST 资源声明的其他托管站点不能选择旧 production/preview 路径。旧 DATABASE_URL、Neon 自动变量或管理变量绝不作回退；发现继承的禁止变量时只检查名称/是否存在，不读取值。

官方依据：[Netlify context](https://docs.netlify.com/build/configure-builds/file-based-configuration/) · [Functions 保留变量与部署时快照](https://docs.netlify.com/build/functions/environment-variables/) · [Scope 与覆盖](https://docs.netlify.com/build/environment-variables/overview/) · [Neon SQL 最小角色](https://neon.com/docs/manage/roles)。

## Free 套餐运行方式

不要求付费 Functions-only Scope。Free 下站点可能使用 all-scope，但其中只能有独立合成 TEST reader 凭据。先证明 TEST 无任何生产 site/shared/分支/模板/插件注入；不接生产存储、不放 Neon/Netlify 管理 Token。仅构建审核过的 SHA，TEST 也关闭任意 PR 预览和其他分支构建。

构建入口拒绝旧/管理变量；实际 Next 子进程仅继承明确列出的 OS/工具链环境，不继承任何数据库值。此清理不能倒推保护此前的 npm 安装阶段，因此**凭据源头隔离、审核过的提交和锁文件**仍是必需条件。若管理员无法证明缺少生产继承，停止，不靠更换变量名称放行。新站点本身不构成隔离证明。

## 本机复现

使用 Node 24.22.2 / npm 11.19.1 和现有 lockfile：

```powershell
node scripts/run-clean.cjs ci
node scripts/check-test-foundation.cjs --pg-bin '<本机 PostgreSQL bin 绝对路径>'
```

第二条依次执行原始 tsc、ESLint、API/安全/打包、独立 PG、Next 静态构建；结果保存在 `artifacts/f03-f05/`。不读取 .env 或旧测试库 runtime 文件。

PG runner 新建随机临时目录与只监听 `127.0.0.1:55435` 的集群；端口占用或新目录初始化失败立即拒绝，不连接现有实例。临时 trust 仅用于该一次性本机实例的授权测试，不代表 Neon 密码认证通过。测试结束停止该集群，保留私有本机日志/数据用于取证；不删除、不重置原 55433 库。

安装的 Netlify zisi 打包器在临时目录生成真实 ZIP，测试从解包后的路径读取绑定/证明并进入模拟传输。该测试不上传、不登录 Netlify，也不连接 Neon。页面/头像/CSS/动效源码未变；静态构建继续导出原路由，生成原 CSP。

## 回滚

先停止独立 TEST 的新请求/构建并撤销 TEST 运行凭据，等待连接结束。另行批准后，用同一个审核资源的初始化管理员和私有 approval 执行 [04-rollback.sql](sql/04-rollback.sql)。

脚本核对真实 cluster/数据库、environment UUID、提供方 ID、initializer、登记对象 OID、列签名和 ACL；未知对象、额外依赖、结构或 ACL 漂移会拒绝。仅显式删除本次新建的 TEST 对象和角色，恢复本次修改的 PUBLIC 权限。无 CASCADE、DROP OWNED、TRUNCATE、DROP DATABASE 或分支重置；所有动作在一笔事务内。角色若已在别处产生依赖，依赖检查使整个回滚失败并保留对象供审核。

停止 TEST 与撤销 TEST 授权即可止损，不修改旧站、不轮换生产密码、不删除生产数据或 pr17-validation。

初始化主体须能管理目标数据库、创建角色并执行只读 cluster 身份函数。脚本仅将新 NOLOGIN owner 的 SET/INHERIT 授予这个私有初始化主体，并给 owner public 的 CREATE/USAGE；reader 不继承 owner。回滚同时移除 owner 的 schema 授权。另有本机非 superuser 初始化全生命周期演练，真实 Neon 权限仍以预检结果为准。

私有 approval 与初始化脚本必须在同一实际数据库连接中执行。若 Web 编辑器不能保证多次执行复用同一会话，不要分次运行后假定 GUC 仍有效；使用管理员私有的持久、非池化会话执行审核批次。没有目标参数时必须拒绝，不能删除检查。

本次管理员交付已用单批次事务与 LOCAL 参数处理上述会话问题；必须完整运行。PG18 与17 的文档核对：现有 SQL 使用的 MAINTAIN、角色 INHERIT/SET 授权在 [PG18 GRANT](https://www.postgresql.org/docs/18/sql-grant.html) 中仍受支持；[18 兼容性说明](https://www.postgresql.org/docs/18/release-18.html) 所列 MD5 凭据弃用、CSV COPY 和生成列等变化不由本批使用。未据此声称托管兼容已通过；实际版本门禁固定为已批准 180006，云端成功提交及后续 reader 证明才是运行证据。
