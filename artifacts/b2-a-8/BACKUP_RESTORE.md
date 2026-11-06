# 今夕历史数据备份、恢复和切换方案

适用任务为 JINXI-B2-A-8。依据用户提供的控制台信息，`jinxi-web` 是旧生产候选，位于新加坡，显示 PostgreSQL 17、约 33 MB 的项目存储和两个分支，其中一个显示为 production。Netlify 当前在线版本与该分支及数据库的对应关系待核验。`jinxi-test` 位于俄亥俄，只用于合成数据。`snowy-bar-74188325` 的用途待识别，排除在本方案的操作范围外。

本阶段交付方案。后续按授权依次进行源库识别和只读导出、私有恢复演练、正式切换。优先把逻辑归档保存在已有的私有加密存储，并用本机隔离的 PostgreSQL 17 演练。这个流程可以节省额外云端项目和长期运行实例的费用。Neon 项目存储、备份输出大小和传输量口径各异，归档体积、源端计算用量及停写时长按演练实测。Neon 自带的时间点恢复用于已配置历史窗口内的事故恢复，独立归档按本方案的保留期存放。 [Neon 用量与计费](https://neon.com/docs/introduction/plans) · [Neon 历史窗口](https://neon.com/docs/postgres/backup-restore/history-window)

## 1. 确认来源和备份角色

1. 由有权的站点维护人在私下核对**当前在线部署**使用的 Netlify 站点、部署 ID、运行上下文和数据库配置。仅核对主机或 Endpoint ID、数据库名及角色，并与 Neon 项目、分支及 Compute 对照。生产环境变量按实际部署版本及 Functions 作用域核验，包含各连接入口和可能的回退配置。对应不上就停在识别阶段。共享证据只写脱敏标识、结论及核对时间。 [Netlify 运行上下文与变量](https://docs.netlify.com/build/environment-variables/overview/) · [Netlify Functions 变量](https://docs.netlify.com/build/functions/environment-variables/)
2. 为每个已确认承载历史数据的数据库使用单独的源连接和归档。使用 PostgreSQL 17 的 `psql`、`pg_dump` 和 `pg_restore`，执行前核对各工具版本。源端使用该分支的 direct 连接和 `sslmode=verify-full`，并配置客户端认可的 CA。命令只引用私有 libpq 服务别名，密码由授权人员在客户端提示时输入。连接参数、密钥和日志都留在受限位置。 [Neon 导出与恢复](https://neon.com/docs/import/migrate-from-postgres) · [Neon TLS 配置](https://neon.com/docs/connect/connect-securely) · [PostgreSQL 连接服务文件](https://www.postgresql.org/docs/17/libpq-pgservice.html)
3. 优先使用已有且已获准的专用备份角色。核验有效 `CONNECT`、各业务 schema 的 `USAGE`、全表及序列的 `SELECT`，以及实际存在的每个 PostgreSQL 大对象的读取权限。检查成员关系、对象所有权、`PUBLIC` 授权、可调用的写入型 `SECURITY DEFINER` 及其他写权限。序列使用 `SELECT`，`USAGE` 也允许推进序列。Neon Console 默认创建的角色拥有管理权限。若现有角色覆盖不足，由维护人另行审批所需范围和授权期限。 [Neon 角色管理](https://neon.com/docs/manage/roles) · [PostgreSQL 对象权限](https://www.postgresql.org/docs/17/ddl-priv.html) · [序列函数权限](https://www.postgresql.org/docs/17/functions-sequence.html) · [大对象权限](https://www.postgresql.org/docs/17/lo-implementation.html)
4. 对启用行级安全的表，用同一角色核对 RLS 是否生效，例如 `row_security_active`。通用 `pg_read_all_data` 提供表、视图和序列的读取，RLS 仍按角色实际权限执行。表所有者通常绕过 RLS，`FORCE ROW LEVEL SECURITY` 是例外。全量导出保留 `pg_dump` 的 `row_security=off` 默认行为，RLS 会过滤结果时操作报错。遇到读权限、RLS、所有权或大对象读取缺口，停止导出，待维护人核实存在获批的完整读取路径后再重试。 [PostgreSQL 预定义角色](https://www.postgresql.org/docs/17/predefined-roles.html) · [行级安全与备份](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) · [有效权限检查函数](https://www.postgresql.org/docs/17/functions-info.html) · [pg_dump 选项](https://www.postgresql.org/docs/17/app-pgdump.html)

## 2. 生成归档和同一快照的核验基线

1. 在负载低的时间段按库导出完整的 custom 归档。默认范围包括业务 schema、数据、索引、约束、函数、触发器、访问控制列表（ACL）、序列值和库内大对象。保留原始归档中的对象定义、所有权和 ACL，恢复时再处理角色映射。盘点扩展版本和配置数据、外部表的数据来源、外部存储引用及定时任务。外部表内容要另行确认，数据库里的媒体链接也需要单独核实其指向的资产和保留方式。逻辑备份覆盖快照时可见的数据，当前源中已经缺失的历史数据需从另有授权的既有归档或可达的 Neon 历史时间点核验。 [pg_dump 格式、对象范围及外部表](https://www.postgresql.org/docs/17/app-pgdump.html) · [PostgreSQL 扩展配置数据](https://www.postgresql.org/docs/17/extend-extensions.html) · [Neon 历史窗口](https://neon.com/docs/postgres/backup-restore/history-window)
2. 会话 A 通过同一源直连开启 `REPEATABLE READ READ ONLY` 事务，导出快照并记录 UTC 时间。保持事务开启，在其中运行经审核的目录查询、`COUNT(*)` 和业务汇总。会话 B 连接同一库，`pg_dump --snapshot` 使用该快照。两边完成后结束会话 A 的事务。快照失效、锁等待超限、导出失败或核验查询出错时，归档和基线作为同一组重新取得。普通并发写入可以继续，演练避开 DDL，避免长时间持有快照。 [PostgreSQL 快照同步](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION) · [事务模式](https://www.postgresql.org/docs/17/sql-set-transaction.html) · [pg_dump 并发与锁选项](https://www.postgresql.org/docs/17/app-pgdump.html)

   以下模板仅在源端授权和连接核对完成后由维护人填写。连接别名指向已核对的私有 `PGSERVICEFILE`，使用干净的客户端环境。会话 A 打开方式如下。

   ```powershell
   throw '方案模板。完成源库识别和只读导出授权后由维护人填写'
   psql -X -W --set=ON_ERROR_STOP=1 --dbname='service=<源直连备份服务别名>'
   ```

   在会话 A 运行以下 SQL，随后在同一事务中完成清单和核验基线查询。会话 B 退出且基线完成后运行 `COMMIT`。

   ```sql
   BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
   SET LOCAL row_security = off;
   SET LOCAL TIME ZONE 'UTC';
   SELECT pg_catalog.pg_export_snapshot() AS snapshot_id,
          pg_catalog.statement_timestamp() AS snapshot_time_utc;
   ```

   会话 B 使用新文件路径，下面是导出、归档目录（TOC）检查和计算摘要的命令。stderr 和目录清单按与归档相同的权限存放。

   ```powershell
   throw '方案模板。完成源库识别和只读导出授权后由维护人填写'
   $archivePath = '<私有加密工作目录中的新归档路径.dump.partial>'
   $tocPath = '<私有工作目录中的新 TOC 路径>'
   if ((Test-Path -LiteralPath $archivePath) -or (Test-Path -LiteralPath $tocPath)) { throw '目标文件已存在。保留原文件并改用新路径' }
   pg_dump -W --format=custom --lock-wait-timeout='<批准的锁等待上限>' --snapshot='<会话 A 的快照标识>' --dbname='service=<源直连备份服务别名>' --file="$archivePath"
   if ($LASTEXITCODE -ne 0) { throw '导出失败。停止验收此归档' }
   pg_restore --list --file="$tocPath" "$archivePath"
   if ($LASTEXITCODE -ne 0) { throw '归档目录读取失败。停止验收此归档' }
   Get-FileHash -Algorithm SHA256 -LiteralPath "$archivePath"
   ```

3. 检查退出码、所有警告和目录条目。确认归档中的关键 schema、数据条目、序列设置和大对象条目与盘点一致，再将临时文件标为已导出。清单记录备份编号、脱敏来源、库名、UTC 快照时间、工具版本、文件大小、SHA-256、权限和扩展依赖以及核验状态。序列不遵循普通表的 MVCC 快照，活跃期记录的序列值仅作参考，最终停写后核对 `last_value`、`is_called`、增量和归属，避免为验证调用 `nextval`。 [pg_restore 目录与选项](https://www.postgresql.org/docs/17/app-pgrestore.html) · [PostgreSQL 序列函数](https://www.postgresql.org/docs/17/functions-sequence.html) · [序列元数据](https://www.postgresql.org/docs/17/view-pg-sequences.html) · [PowerShell SHA-256](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-7.5)
4. 在受限加密卷写入归档、私有清单及日志。使用访问受控、具备完整性校验的加密包，另存一份于独立的私有介质或已批准的私有存储。密钥单独保管，并在演练中验证第二份可以解密。将加密包的摘要存到独立受控清单，复制后及恢复前核对摘要，解密后再核对原始归档。所有真实数据、日志和密钥留在仓库、聊天、CI、预览与 TEST 之外。初始包和切换包至少保留至验收及约定回退窗口结束。若需持续备份，可从每日导出一次、保留最近七份通过文件检查的日备起步，按可接受丢失时间、存储和保留要求审批调整，并定期抽取独立副本复测恢复。只有实际恢复并通过核验的归档才标为可恢复。 [NIST 存储隔离、加密与恢复验证](https://csrc.nist.gov/pubs/sp/800/209/final) · [PowerShell 文件摘要](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-7.5)

## 3. 恢复到私有空库

1. 在用户批准的本机隔离 PostgreSQL 17 实例建立独立空库，用 `template0` 并核对源端编码、排序规则及其 provider、数据库级时区等配置。目标允许清单记录实例、数据库名和恢复角色，连接前核对目标标识和数据为空。仅授权人员可以访问，阻断外联和任何连接真实服务的作业。若正式目标另行获准设在云端，同样核对目标直连和 TLS。先审阅归档的 TOC 和通过 `pg_restore --schema-only --file` 生成到私有目录的 schema SQL，关注函数、触发器、外部表、订阅及扩展。导入归档会执行其中的数据库代码。 [PostgreSQL 空库模板](https://www.postgresql.org/docs/17/manage-ag-templatedbs.html) · [pg_restore 安全说明](https://www.postgresql.org/docs/17/app-pgrestore.html) · [Neon TLS 配置](https://neon.com/docs/connect/connect-securely)
2. 单库归档缺少集群级角色、成员关系、表空间及配置参数授权。恢复前用私有清单盘点这些依赖及数据库级 ACL、配置、登录角色的默认配置和应用环境配置。通过批准的角色映射重建依赖，平台管理角色和登录凭据由维护人单独处理。普通恢复应直接连已准备好的空库。Neon 文档将 `pg_dumpall`、`pg_dump --create` 和依赖本地文件系统的特性列为限制。 [PostgreSQL 全局对象](https://www.postgresql.org/docs/17/app-pg-dumpall.html) · [pg_restore 数据库级配置](https://www.postgresql.org/docs/17/app-pgrestore.html) · [Neon 迁入限制](https://neon.com/docs/import/migrate-from-postgres#data-migration-notes)
3. 比对扩展名称、版本、schema、所需库及预加载配置，先让目标具备相应扩展文件和权限。扩展成员的定义通常由 `CREATE EXTENSION` 在目标重建，扩展自身配置表需查对应扩展的导出规则。源端若盘点到大对象，保留原始归档并在兼容 PG17 中核验内容、OID 引用和授权。Neon 迁入文档把 large objects 列为限制，目标若仍为 Neon，大对象和任何必需扩展必须在批准的私有目标验证兼容后才进入切换。 [PostgreSQL 扩展恢复机制](https://www.postgresql.org/docs/17/extend-extensions.html) · [Neon 扩展支持](https://neon.com/docs/extensions/pg-extensions) · [Neon 迁入限制](https://neon.com/docs/import/migrate-from-postgres#data-migration-notes)
4. 能在目标安全重建原角色时，优先验证原所有权和 ACL。需要角色映射时，先审核受影响的对象、角色和授权，可在恢复端使用 `--no-owner --no-acl` 让指定对象所有者创建对象，再按清单重建 schema、表、序列、函数、默认 ACL 和数据库权限。RLS 策略中写明的角色仍须在恢复前存在或在经审核的恢复定义中映射。逐一校验 `SECURITY DEFINER` 的实际所有者、`search_path` 和 `PUBLIC EXECUTE`。应用连接保持关闭，直到权限验证通过。 [pg_restore 所有权与 ACL 选项](https://www.postgresql.org/docs/17/app-pgrestore.html) · [PostgreSQL 行级策略](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) · [SECURITY DEFINER 安全说明](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
5. 串行恢复使用 `--single-transaction --exit-on-error`，全程指向已验明的空库。还原失败就停止，核验目标状态，修复依赖后用新空库重试。成功后按目标实际用途运行 `ANALYZE` 并验证有效角色。保留原归档，任何兼容调整都以单独的审批记录保留。以下命令以保持原 ACL 和所有权为前提。 [pg_restore 单事务与错误处理](https://www.postgresql.org/docs/17/app-pgrestore.html) · [pg_dump 恢复后统计信息](https://www.postgresql.org/docs/17/app-pgdump.html)

   ```powershell
   throw '方案模板。仅在私有空库、恢复授权和摘要核对通过后由维护人填写'
   pg_restore -W --single-transaction --exit-on-error --dbname='service=<已核对的私有空库恢复服务别名>' '<私有目录中经摘要验证的归档>'
   if ($LASTEXITCODE -ne 0) { throw '恢复失败。保持应用连接关闭' }
   ```

## 4. 核验历史数据和应用角色

先对恢复后的原样库运行与源同快照基线相同的核验，再在隔离副本验证经批准的应用兼容调整。下表的表名来自仓库 schema，最终清单以获准查询的真实目录为准。源端只查询批准的目录、业务表和聚合，验收记录仅保存汇总、脱敏结果和通过状态。 [PostgreSQL 精确计数与聚合](https://www.postgresql.org/docs/17/functions-aggregate.html) · [PostgreSQL 约束](https://www.postgresql.org/docs/17/ddl-constraints.html)

| 范围 | 最低验收项 |
| --- | --- |
| 全库结构及行 | 按实际 schema 列表核对表、分区、索引、主外键、约束验证状态、触发器、函数、策略和扩展。每张业务表核对精确行数，分区逐个叶子计数以避免重复。关键表按主键和明确的排序及规范化规则对照逐行摘要，或在私下执行等价比对。记录缺键、重复键、孤儿引用及预存异常。 |
| 成员和账号 | 对照账号与档案绑定、启用和锁定状态、首次改密状态与凭据字段完整性。真实账号、密码哈希及盐值留在私有范围。生产会话是否继承须单独核对。 [账号与档案 schema](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/database-member-auth-schema.sql) |
| 签到 | 对照历史签到行数、用户和日期键、最早和最近日期、按日期及成员汇总，检查签到统计对同一快照是否一致。 [签到 schema](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/database-checkin-schema.sql) |
| 积分与兑换 | 对照每人余额、累计收入和支出，核对账本流水及订单行数、业务键、各类别金额和订单状态汇总。用已核实的期初余额和现行口径对账，记录既有异常。 [积分 schema](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/database-points-activity-schema.sql) |
| 内容和资产 | 对照留言、攻略、公告、赞助及其历史状态，抽查媒体引用或另行归档的数据，核验恢复后内容的标识及可见性。 [站点数据流](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/WEB_EXPLORATION.md) · [攻略 schema](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/database-strategy-schema.sql) |
| 运行身份 | 以目标实际应用角色验证可见行、可用功能、RLS 及应拒绝的访问。写入流程用隔离副本及合成账号演练。若后续部署采用 A7 的运行身份校验，按目标重新核对环境标识、数据库指纹、上下文和允许权限。 [站点身份校验](https://github.com/2574303451-create/jinxi-web/blob/9f53e1428d29a56f459e9c29ce79e0969ef1294e/netlify/functions/_shared/function-security.js#L12-L29) |

验收以零未解释差异为门槛。文件摘要核验、导出与恢复的零错误、权限映射、各业务核验项及演练时间都纳入同一记录。序列在最终停写版核对，检查实际增量方向、范围、缓存及已用主键，确认开放写入后可安全取号。 [PostgreSQL 序列状态](https://www.postgresql.org/docs/17/functions-sequence.html) · [序列元数据](https://www.postgresql.org/docs/17/view-pg-sequences.html)

## 5. 选择切换窗口和回退边界

先评估保留原库并使用获批增量迁移。生产站点指向既有数据库时，优先在明确角色和恢复点下添加独立表或视图。仅在另行批准更换数据库目标时执行以下换库步骤。新建的合成 TEST 与未知旧项目均不作为生产目标。

**首选停写后重新全量导出。** 先由用户批准生产目标、最大维护时长、负责人与回退窗口。根据实测确定窗口，旧库保持可供回退。基线演练包用于证明恢复可行性，正式切换使用停写后的独立最终包。 [pg_dump 快照语义](https://www.postgresql.org/docs/17/app-pgdump.html) · [Neon 切换连接和应用测试](https://neon.com/docs/import/migrate-from-postgres#post-migration-steps)

1. 冻结 schema 变更，暂停旧站点全部写入入口、定时任务、导入、后台同步及直连写入角色。旧部署和其他可调用地址的写入路径都纳入核对。在审批范围内用访问控制落实停写，由有权人员确认在途写事务、已建立的写连接和队列已经排空。保留获准的只读访问及目标端隔离恢复所需权限。
2. 停写后取最终快照、基线和稳定序列状态，重新导出到独立归档并恢复至获批的空目标。完成最终对账、角色与序列核验、连接指纹和只读冒烟检查。超出维护窗口、归档或恢复失败、发现未解释差异时停止切换。
3. 仍保持业务写入口关闭。按生产站点实际生效的配置切换连接和关联的运行策略，记录候选部署 ID，并在新部署中验证真实目标和只读业务表现。Netlify Functions 环境变量改动需新部署才能生效。新端仅开放已获批且验收通过的写入入口，旧端保持写入隔离。记录首次新端写入时间与切换结果。 [Netlify Functions 变量生效方式](https://docs.netlify.com/build/functions/environment-variables/) · [Netlify 部署管理](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)

**在无法接受演练得出的停写时长时评估 CDC。** 把初始表同步和后续逻辑复制纳入同一设计，例如目标建好 schema 后从空表用订阅的初始复制接上增量。先验证各表 replica identity、订阅覆盖及目标运行条件。切换时仍排空旧端写入，用经批准的终点标记验证最后的已提交变更已在目标应用，并检查复制错误及最终对账。DDL、序列、大对象和其他不受支持的对象需要单独同步或处理。Neon 若尚未启用逻辑复制，启用会改动项目设置并重启 Compute，按官方文档该设置不可逆。持续订阅也会保持 Compute 活跃。只有另行批准并完成演练后采用。 [Neon 项目间逻辑复制](https://neon.com/docs/guides/logical-replication-neon-to-neon) · [PostgreSQL replica identity](https://www.postgresql.org/docs/17/logical-replication-publication.html) · [逻辑复制限制](https://www.postgresql.org/docs/17/logical-replication-restrictions.html) · [订阅监控](https://www.postgresql.org/docs/17/logical-replication-monitoring.html)

| 发现故障的时间 | 回退动作 |
| --- | --- |
| 新目标首次业务写入前 | 维持新端写入隔离，核对旧部署及旧连接配置，恢复旧端接入并验证旧库身份、只读功能和唯一写入方后，恢复旧端写入。 |
| 新目标已发生业务写入 | 先同时封住双方写入，保存新端最新归档，盘点新端新增、修改和删除及已提交事务。验证经批准的增量回放与对账后再回旧端，或在新端修复后继续。以可核验的方式保留新写入和审计链后再开放唯一写入方。 |

回退记录包含生效的站点部署、数据库目标、停写时间、最后成功的核验结果及是否已经接受新写入。按约定窗口保留旧数据和最终归档，结束后由有权人员核对保留需求与回退状态。 [Netlify 部署回退](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
