# Neon 严格启动能力研究

核对日期：2026-11-23。分支 `codex/jinxi-phase4-strict-cloud-readiness`，源码基线 `a230bfd1166a3623e988c35c7e0c771131a21a9e`。依据 `database/guard.cjs`、`database/initialize.cjs`、`BOOTSTRAP_PREFLIGHT.md` 及本地 `../business-commit-remote/C2-native-result.json`、`C3-api-readonly.json`。目标是保留五个应用角色只能 CONNECT 业务库的合同；本轮仅修改研究与交接文档，补充只读元数据核查及一次未成功的事务内日志收紧尝试，无持久云端变更、凭据访问或外部消息。C2 已解决凭据接入，不需用户准备凭据文件。

**结论：当前目标不能通过现有严格合同，尚无已证实的 Neon 托管修复路径。** 这不是“Neon 全平台永远不可能”的结论。公开 API、源码和当前身份能力只能确定以下边界；不据缺少文档推定未公开能力不存在。

## 已证实的现场事实

- 原生 Node `pg` 连接为 TLS 1.3，CA 和主机名验证通过；同一连接后端 `pg_stat_ssl.ssl=false`。另行只读核验得到服务端 `ssl=off`。两种观察不可互相替代。
- PostgreSQL 17.12；当前 owner 非超级用户、具有 CREATEROLE。`postgres`、`template1` 可连接，由 `cloud_admin` 所有，PUBLIC CONNECT 为 true；当前主体无 CONNECT grant option，也无 owner 有效权限。未执行任何 GRANT/REVOKE 或 owner 修改探测。
- 六项 Neon 默认表授权库存检查已通过；日志安全子集通过，但 `log_parameter_max_length=-1`，不满足激活要求 0。主任务在只读事务内尝试更严格的 `SET LOCAL ...='0'`，实际收到 `42501`；重新只读查询仍为 -1。该瞬态尝试没有持久配置或数据写入，证据由主任务本地保存。

## CONNECT 隔离：没有已证实的特权补救

PostgreSQL 将 PUBLIC 授权赋予每个角色；单独撤销应用角色的 CONNECT 不能消除 PUBLIC 来源。普通撤权受 owner／grant option 权限约束。[PostgreSQL 权限](https://www.postgresql.org/docs/17/ddl-priv.html)、[REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html)

Neon 明确不向用户开放真正的超级用户；`neon_superuser` 的已列权限不能等同于 `cloud_admin`。[Neon 角色](https://neon.com/docs/manage/roles#the-neon_superuser-role) 当前公开 DDL hook 对事件触发器有专门提权，所查普通 GRANT/REVOKE 路径未见相同提升；这是公开实现的观察，不能证明部署版本及全部 hook 均相同。[固定源码快照](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/pgxn/neon/neon_ddl_handler.c#L1263-L1355)

Update database API 只公开 `name`、`owner_name`，无 ACL 字段；维护库名称被保留。主任务对当前目标的数据库 GET 查询中，两库均返回 404，尽管系统目录存在，因而不能推定 owner API 可操作它们。未尝试 PATCH。[API 请求定义](https://neon.com/docs/reference/api/branches/update-project-branch-database.md)、[保留库名](https://neon.com/docs/manage/databases#reserved-database-names)

## TLS 与日志：分别补证

`pg_stat_ssl` 只描述 PostgreSQL 后端所接连接。Neon 公共 proxy 源码分别处理客户端 TLS 和 compute 侧连接，后者支持不使用 TLS；因此客户端加密与后端 false 可以同时成立。源码不能代替此目标内部传输的提供方保证。[PostgreSQL 视图](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW)、[客户端握手](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/proxy/src/pglb/handshake.rs)、[compute TLS](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/proxy/src/compute/tls.rs)

现合同继续要求后端 true 时，此目标必须拒绝。若未来采用代理拓扑，须单独审核实际连接的客户端 TLS 证明设计，强制证书链、目标主机名及加密校验，并保留资源身份与严格 CONNECT 隔离；不能只删除后端检查或把 false 改写为 true。Neon 推荐完整证书与主机名验证。[安全连接](https://neon.com/docs/connect/connect-securely)

PostgreSQL 将 `log_parameter_max_length` 设为仅超级用户或获 SET 权限者可改；0 禁止非错误语句日志中的绑定参数，-1 允许完整参数。[日志定义](https://www.postgresql.org/docs/17/runtime-config-logging.html#GUC-LOG-PARAMETER-MAX-LENGTH) 当前主体已实测不能设 0。Neon endpoint API 虽有泛型 `settings.pg_settings`，兼容性文档仅明确承诺 `log_min_duration_statement` 是逐 compute 配置例外，不能据此承诺此参数可写。Scale 可询问支持团队，但文档同时说明平台限制可能使请求不可支持；升级不是已证实解决办法。[endpoint API](https://neon.com/docs/reference/api/endpoints/update-project-endpoint.md)、[参数边界](https://neon.com/docs/reference/compatibility#postgres-parameter-settings)

## 保持严格合同的继续条件

可行路线目前仅为条件式：取得提供方可复核、受支持的维护库 ACL 管理机制、后端 TLS true 路径及安全日志 0 能力，再另行批准精确变更。若改用客户端 TLS 证明，先完成设计审核；它不能解决 CONNECT 或日志阻断。后续须验证五角色对所有其他 `datallowconn` 库均无 CONNECT，目标库身份／空库检查通过，日志完整策略在提交密码前满足，并验证暂停恢复／维护后仍成立。当前没有授权执行这些变更。

任一能力无受支持证据、需要隔离例外、需要新资源／付费变更，或日志与 TLS 无法满足，均停止初始化、口令配置、角色启用和部署。Free 当前只有社区与 AI 帮助，两者均非正式支持渠道；Launch 工单仅账单，Scale 才覆盖技术问题。这限制取证渠道，不证明付费后获得所需权限。本次未联系任何渠道。[官方支持范围](https://neon.com/docs/introduction/support)

## 后续执行清单

| 顺序 | 必须取得的结果 | 验收及停止点 |
| --- | --- | --- |
| 1. 能力补证 | 提供方列明三项能力的支持范围、前提、操作接口及维护后的保证 | 只获得泛型 API 字段、AI 推测或“升级后试试”不能通过；任一项不支持即停止当前目标初始化 |
| 2. 准备精确变更 | 绑定现有专用目标，列出 ACL／TLS／日志的具体 SQL 或 API、数据影响、回退、验收和有效期 | 当前尚无可批准执行的云端写入清单；未经目标明确的批准不执行 |
| 3. 原生复核与初始化 | 同一管理连接先证明目标、空库、三项安全条件，再初始化；密码提交前再次检查完整日志策略 | 身份、指纹、对象库存或任何门禁不符即拒绝；不以本地测试代替现场证据 |
| 4. 五角色隔离验收 | 五角色对业务库拥有精确权限，对所有其他可连接库均无 CONNECT，并验证恢复后的状态 | 完成前不配置业务站秘密变量、不发布业务站 |

若提供方无法满足，下一路线是评估可管理维护库 ACL、服务端 TLS 和安全日志的 PostgreSQL 环境；这只是后备方向，未选定资源或预算。当前 `binding.cjs` 明确限制 Neon 主机及资源标识；更换提供方必须先设计和审核新身份合同，不能直接替换主机、伪造 Neon ID 或绕过现有校验。

以下问询稿已准备，**尚未发送**，不含实际账号、项目、主机或秘密。发送渠道、接收方及内容需用户明确指令；Free 的社区渠道回复只能提供线索，最终仍需可验证的受支持方案。

> 我们在独立 PostgreSQL 17 合成环境中需要同时满足以下条件，请确认 Neon 是否有受支持的配置路径，以及适用计划、权限前提和具体接口：
>
> 1. SQL 创建的应用角色不能 CONNECT 任何其他可连接数据库，含 `postgres`、`template1`。当前它们由 `cloud_admin` 所有且向 PUBLIC 授予 CONNECT，项目 owner 没有相关 grant option。是否存在受支持的控制机制，使这些应用角色的 `has_database_privilege(...,'CONNECT')` 均为 false？
> 2. 客户端原生连接已通过 CA、主机名和 TLS 校验，但后端 `pg_stat_ssl.ssl=false`、`ssl=off`。是否有受支持连接／配置路径使该后端连接可验证为 TLS true？我们不会将客户端 TLS 通过直接记作后端 TLS 通过。
> 3. 角色口令设置前，管理会话必须验证 `log_parameter_max_length=0` 及完整安全日志策略。当前值为 -1，`SET LOCAL ...=0` 返回 42501。如何受支持地设定并确保计算节点恢复后仍满足？泛型 `settings.pg_settings` 是否明确支持此参数？
>
> 请分别给出受支持、不可支持或需要进一步确认的结论；我们不会因付费计划名称而假定这些能力存在，也不会在确认前执行权限／日志修改。

本轮完成条件是：当前身份能力有现场证据、公开主张可追溯、三项阻断与继续条件明确、交接不再把凭据标为待接入，且执行源码及默认关闭的批准不变。它不代表云端业务闭环已完成。源码未改，复用 C1 同源码 SHA 的既有类型、语法、构建和端到端检查；文档检查与后续新 SHA 的 CI 状态分别记录。
