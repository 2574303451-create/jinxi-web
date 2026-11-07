# 保留的开发失败与修正

2026-11-07 用户预检结果复核：真实 Neon 空业务库仍有 9 条 cloud_admin → neon_superuser 的 public 默认 ACL。原初始化将任何默认 ACL 当作未知对象，本机复现失败 `TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED`，原输出保留为 neon-default-acl-before-fix.log。仅兼容已解释的精确平台模板，不移除平台授权。修复提交 316ae73c9de885ad4ec08c7a70c5a3cd0650d374；专测 11/11（neon-default-acl-review.log），原空库全流程 46/46（neon-default-acl-baseline.log）。未知受让者、全局默认授权、初始化主体默认授权、grantability 或权限集合变化仍拒绝；reader 继承管理角色仍拒绝，回滚保留平台模板和角色。本机 PG17.11 演练与用户 Neon18.6 只读证据分别记录，未在云端执行初始化或补权。

2026-11-07 关卡 1 独立复核：原成员关系结果缺逐项 inherit_option/set_option，无法区分角色默认继承属性相同但具体授权不同的情况。先用本机 PG17 复现缺列断言失败（preflight-before-fix.log），只补原查询的两个字段后预检专测通过（preflight-review.log）。该次不重跑全项目、不创建新的管理员清单或验收关卡；原完整测试结果保持历史受测 SHA。

1. 最初纯内存连接故障用例得到 undefined 而非 503：测试处理器没有真正调用懒连接，因而根本未触发故障。修正为先调用 requestDatabase().query，再断言业务计数为 0 和响应无凭据；没有改变服务端的 503 条件。
2. 首轮 PG 37 项报告（35 pass / 2 fail，包含失败父项）：统计接口被错误附带 summary/feed/limit 查询参数，按契约返回 400。完整输出见 [postgres-first.log](failures/postgres-first.log)。修正调用方仅向 strategies 传筛选，统计接口保持拒绝所有参数。
3. Windows 下真实打包测试首次 import 使用 E: 绝对路径，ESM loader 报 ERR_UNSUPPORTED_ESM_URL_SCHEME。使用 node:url 的 pathToFileURL 导入已安装包；未改变任何打包或运行时断言。
4. 首次完整检查在 ESLint 退出 1：[lint-first.log](failures/lint-first.log)。ZIP 读取 Promise executor 的箭头隐式返回触发 no-promise-executor-return；改为无返回值的块函数，没有关闭规则。

最终结果见 results.json 和最终日志。上述失败保留，不把早期失败计为最终通过，也不把合成测试说成云端验收。

预交付契约复核另外修正了两项先前未覆盖的问题：钱包/流水插入默认值与既有 session SQL 不一致；非 superuser 初始化主体需要显式管理新 NOLOGIN owner 的 SET/INHERIT，以及 owner 的 public CREATE/USAGE。已补齐限定授权和对应回滚，并新增实际 SQL 用例；非 superuser DB-owner + CREATEROLE + 已授予的 pg_control_system EXECUTE 权限下，完整初始化/种子/核验/回滚通过。这是本机能力演练，不能代替真实 Neon 管理角色验收。
