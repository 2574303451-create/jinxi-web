# 保留的开发失败与修正

2026-11-07 用户截图 cff1fe45 显示私密设置工具两次在管理员输入后返回同一 TEST_READER_PASSWORD_SETUP_UNAVAILABLE，尚未出现 reader 新密码提示。旧顶层处理丢失了认证/预检阶段，不能据此认定密码错误。先保留4项失败复现（password-diagnostic-before-fix.log，0 pass/4 fail），再最小修复固定阶段/错误码白名单，避免按熟悉前缀输出任意异常文本；同一工具新增 --diagnose，强制只读预检并回滚，不进入新密码、角色写入、回执或 reader proof。9d6c496 源码安全单测59/59（诊断11项）、本机PG17.11回归17/17及相关ESLint通过，日志 password-diagnostic-security.log / password-diagnostic-postgres.log / password-diagnostic-lint.log。一次独立TEST TLS-only探测验证证书成功，未发送PostgreSQL Startup/认证/SQL；该事实与本机合成用例均不能替代实际云端认证。真实根因仍等用户回传只读诊断结果，原初始化验收继续有效。

2026-11-07 真实平台失败（用户报告，非本机用例）：Neon Console 为无初始密码的 SQL reader 执行 Reset password 返回 cannot update password for role without password。先前管理员清单忽略首次密码限制，已在同一清单更正，未要求重建或提升角色。替代方案为管理员本机隐藏输入、固定 TEST/角色、绑定参数/事务内值和日志拒绝检查；只设置既有 reader PASSWORD/LOGIN，前后复核有效权限，再运行原 reader 证明。本机最终16/16（reader-password-setup-final.log）含真实 SCRAM 认证、无密码回显、日志拒绝及漂移回滚；原15项中间通过日志仍保留。尚未得到该替代方案的 Neon18.6 成功回执，不宣称云端问题已解决。

2026-11-07 reader 辅助文件首轮 12 个报告测试为 7 pass / 5 fail（含父项及后续事务失败的连带失败），原输出 reader-before-fix.log。PL/pgSQL RECORD 名 p 与原 ATTESTATION_SQL 的内部 pg_proc 别名 p 冲突，在赋值前被解析为未赋值记录。仅将包装器记录名改为 checked_proof，原 ATTESTATION_SQL、validateProof 与权限断言保持不变；测试清理改为 finally ROLLBACK 并恢复攻击夹具授权，避免一个断言失败污染后续场景。复测12/12（reader-review.log），有效列写权限/角色继承拒绝、只启用 reader、管理员不能冒用实际会话、实际本机 reader 连接及原回滚均通过。本机 trust 连接只验证代码与角色权限，不替代真实 Neon TLS/密码认证。

2026-11-07 第二关管理员整批文件：首轮 9 个报告测试中 7 pass / 2 fail（包含父项），仅末项回滚原始 ACL 编码比较失败，原输出见 bootstrap-before-fix.log。原 04 正确恢复了授权，但 PostgreSQL 将 database datacl 的 NULL（隐式默认权限）物化为显式默认 ACL。最终回滚比较改为逐项核对展开后的 grantor、grantee、privilege_type、is_grantable，仍精确比较平台默认 ACL；故障撤销用例继续严格比较原始 ACL，不允许实际变化。没有修改 01/02/03/04 或删去权限断言。复测 9/9，含错误 cluster/OID/主体/版本、未知对象、种子后故障整批撤销、非 superuser 正常提交、重复拒绝及原回滚兼容，日志 bootstrap-review.log。所有 SQL 测试仅在新建本机 PG17.11，不能代替 Neon18.6 云端结果。

2026-11-07 用户预检结果复核：真实 Neon 空业务库仍有 9 条 cloud_admin → neon_superuser 的 public 默认 ACL。原初始化将任何默认 ACL 当作未知对象，本机复现失败 `TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED`，原输出保留为 neon-default-acl-before-fix.log。仅兼容已解释的精确平台模板，不移除平台授权。修复提交 316ae73c9de885ad4ec08c7a70c5a3cd0650d374；专测 11/11（neon-default-acl-review.log），原空库全流程 46/46（neon-default-acl-baseline.log）。未知受让者、全局默认授权、初始化主体默认授权、grantability 或权限集合变化仍拒绝；reader 继承管理角色仍拒绝，回滚保留平台模板和角色。本机 PG17.11 演练与用户 Neon18.6 只读证据分别记录，未在云端执行初始化或补权。

2026-11-07 关卡 1 独立复核：原成员关系结果缺逐项 inherit_option/set_option，无法区分角色默认继承属性相同但具体授权不同的情况。先用本机 PG17 复现缺列断言失败（preflight-before-fix.log），只补原查询的两个字段后预检专测通过（preflight-review.log）。该次不重跑全项目、不创建新的管理员清单或验收关卡；原完整测试结果保持历史受测 SHA。

1. 最初纯内存连接故障用例得到 undefined 而非 503：测试处理器没有真正调用懒连接，因而根本未触发故障。修正为先调用 requestDatabase().query，再断言业务计数为 0 和响应无凭据；没有改变服务端的 503 条件。
2. 首轮 PG 37 项报告（35 pass / 2 fail，包含失败父项）：统计接口被错误附带 summary/feed/limit 查询参数，按契约返回 400。完整输出见 [postgres-first.log](failures/postgres-first.log)。修正调用方仅向 strategies 传筛选，统计接口保持拒绝所有参数。
3. Windows 下真实打包测试首次 import 使用 E: 绝对路径，ESM loader 报 ERR_UNSUPPORTED_ESM_URL_SCHEME。使用 node:url 的 pathToFileURL 导入已安装包；未改变任何打包或运行时断言。
4. 首次完整检查在 ESLint 退出 1：[lint-first.log](failures/lint-first.log)。ZIP 读取 Promise executor 的箭头隐式返回触发 no-promise-executor-return；改为无返回值的块函数，没有关闭规则。

最终结果见 results.json 和最终日志。上述失败保留，不把早期失败计为最终通过，也不把合成测试说成云端验收。

预交付契约复核另外修正了两项先前未覆盖的问题：钱包/流水插入默认值与既有 session SQL 不一致；非 superuser 初始化主体需要显式管理新 NOLOGIN owner 的 SET/INHERIT，以及 owner 的 public CREATE/USAGE。已补齐限定授权和对应回滚，并新增实际 SQL 用例；非 superuser DB-owner + CREATEROLE + 已授予的 pg_control_system EXECUTE 权限下，完整初始化/种子/核验/回滚通过。这是本机能力演练，不能代替真实 Neon 管理角色验收。
