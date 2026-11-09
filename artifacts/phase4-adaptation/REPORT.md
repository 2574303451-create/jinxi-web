# 第四阶段工作包2：本地完成报告

收尾日期2026-11-10，Asia/Shanghai。仅本地合成开发、测试和提交；没有推送、PR、部署、云变量/角色变更、生产读取、真实资料导入、历史迁移或实际积分结算。这里的通过不代表云端业务已恢复。

## A. 来源、版本与范围

实际根目录`E:/Recovery/.jinxi-research/phase4-adaptation/worktree`，分支`codex/jinxi-phase4-adaptation-local`，origin为`https://github.com/2574303451-create/jinxi-web.git`。`E:/Recovery`只是共同父目录。原phase4-integration工作树及五个第三阶段工作树保留，未重写其历史。

继承链：F03/F05 d43ee24 → 成员35ae9a6 → 社区f8175c4 → 签到891f235 → 积分9fde7fe → 运营5c2856b → **42722d553849eb98faf171f794a3aeee54440b2c**（唯一开发基准）→ 本轮实现/修复线性提交 → **66fcbb13e54163a15537c803fd506729905866d6**（最终两路受审源码）。后续仅本地证据和交接提交，完整最终HEAD以交付回复及Git为准。FINAL_STATE.json记录全部完整基准SHA及祖先/源码对应，不用缩写代替实际版本验证。

最终代码SHA256为`d2ad3da07965cb825a650f9cf1f6f584d72078c9869fb8b0fbe1b39683d37ec5`；sourceManifest列出实际文件哈希。最终新增专项、浏览器、HTTPS、API、安全、构建、静态产物均对应该指纹。五组旧PG98和只读46在较早完整树运行，最终代码对照证明其模块、受限角色/共享守卫/原测试相关文件未再变化，详见regressionSourceEquivalence，不伪称所有测试运行在相同完整树指纹。

代码文件集中于service-adapter、history-compat、integration-local恢复及其本机UI、四个原业务处理器的本人回执GET适配、五个资源证明的受控目标适配、package/ESLint和新增测试。**app/components/services、旧netlify、.github、netlify.toml、next配置、package-lock、test-environment均无差异**，原五组SQL模型及权限未放宽。正式UI和UI-DEFER-001/002不改。

## B. 云端适配实际完成及限制

- service-adapter/cloud.cjs实现Netlify Fetch桥、精确服务路由、64KiB流式上限、可信Context地址、Cookie数组、Origin/CSRF及private/no-store缓存头；统一复用一个成员处理器和其余四组原处理器。本机网关也使用同一组合，没有第二套身份、签到事实或积分账本。
- 默认approval.disabled.json为false，且没有在netlify/functions注册新入口或增加重写/部署脚本。生产构建不能公开导出恢复代码或云配置能力。
- 未来须代码审查批准专用manifest和服务端secrets：绑定独立TEST的siteId/origin、commit、有效期、Neon host/database、环境UUID/物理指纹/服务地址；旧生产站和现有只读TEST明确拒绝。客户端参数或普通settings副本没有注册能力。
- 五个独立角色使用验证证书的TLS连接，不使用DSN、管理员、SET ROLE或不安全回退。启动前分别只读验证原权限证明，每次请求仍核对资源/RLS/精确列权限、会话及锁等待后身份，异常回滚/关闭连接和净化错误。

最小权限矩阵及精确禁用条件见[service-adapter/README.md](../../service-adapter/README.md)。角色分别为jinxi_member_session、jinxi_community_app、jinxi_attendance_app、jinxi_points_app、jinxi_operations_app；会话必要列/本人或公开内容/事实只插入/积分来源与账本约束/原staff与队长授权仍分开。没有云端角色创建或LOGIN变更。

**未实测真实Netlify Context、Neon TLS/地址/schema/角色连接，未构建可部署的云端包装器。** 原本机SQL含synthetic-local及保护条件，不能复制到Neon执行；未来专用TEST的schema、角色和明确静态构建绑定仍须单独批准、审查及现场验收。这是安全适配准备代码，不是本轮云资源已接通。

## C. 未确认操作恢复

真实统一网站在发送前以IndexedDB原子事务保存actor UUID、模块/操作、请求摘要及原requestId等最小元数据。不存正文、密码、Cookie/CSRF、金额或服务器响应。服务端查询在原授权/RLS/锁及最终会话重验范围内，只返回当前本人请求的committed/unresolved，不返回原私有载荷；没有回执不推定失败。

实际故障注入发生在**数据库事务已成功之后**才丢弃响应。跨完整刷新、同一浏览器配置关闭重开、同成员重新登录、离线再连和两标签原子claim均复用原号。签到按服务端可信today区分每天的意图，POST不接受客户端日期。已提交结果不能由客户端confirmed标志伪造；其他成员查询原号只得到unresolved，不获得原主体或载荷。

首次确定4xx拒绝与结果未知区分；后续401/403/429不能把未知降为失败。未知7天后冻结自动重试，保留标识；512条容量满安全拒绝。分页每页16条，17条以后仍可核对。用户明确允许新意图或清理30天前已确认标识前，服务端必须再次确认；不会自动清除未知记录。列举的目标状态操作先解决同类未知结果，再允许新状态；同值未知重试即使存在更早confirmed也保持原号。

浏览器恢复最终数据库：1订单、1扣减、1关联退款、余额4；原统一网站回归最终2签到事实、2结算、2奖励、2退款、1本人私有草稿，账本约束成立。恢复不是页面自报成功。

保证限于同一持久存储正常保留。手动清空网站数据、跨设备、隐私模式、设备损坏或恶意篡改不保证恢复；必须先服务端对账，不能盲重做。同源脚本/本机用户可以查看UUID与摘要等元数据，不把它当登录凭据或保密保险箱。完整期限、容量、清理及隐私见[RECOVERY.md](../../integration-local/RECOVERY.md)。

## D. 历史兼容与合成预演

history-compat/fixture.cjs独立生成208个SYN档案和映射；未读取真实208资料。离线检查器没有DSN、网络或apply选项，只接受单独的合成数据和合成证据输入，报告trusted/ambiguous/unmapped与独立业务风险，不根据昵称认领作者。

核验覆盖bigint/employee_no/UUID、重员工号/重UUID/缺映射/同名不同人、数值SERIAL无损ID、孤立作者、非法日期/连续/奖励、方向1/2配正point_delta、余额链与期初锚点、重复业务号/同日奖励、多旧财务别名、规则版本/生效日、订单扣减/退款/冲正关联和重复，以及公告/赞助来源未证。

实际CLI正常退出0，208合成主体可信映射、1有独立归属证据的攻略候选、1无作者证据的留言隔离；原输入不变。缺合成标记的CLI输入退出1且无资料输出。详见history-cli.json；不是说真实208账号可信。真实本机PG将候选与隔离项放入TEMP表后强制ROLLBACK，前后既有业务/财务快照完全一致；错误指纹在读快照前拒绝。

这些候选只含源ID和UUID，**不复制内容或财务余额，不提供可直接写真实表的迁移脚本**。旧昵称、user_id、旧余额、旧1/2/3分代码均不构成真实归属/规则生效证据；无法证明的数据保留待人工核实。映射矩阵、未来资料授权/备份/逆向映射/停止与回滚条件见[history-compat/README.md](../../history-compat/README.md)。

## E. 命令、结果与覆盖

工具实际路径和启动方法见[integration-local/README.md](../../integration-local/README.md)。所有命令、退出码、UTC时间、sourceSha256、fail/skipped/cancelled及原始日志见[test-runs.json](test-runs.json)；FINAL_STATE.json只选每组最新结果，并保留早期失败。

| 检查 | 实际最终结果 |
|---|---|
| 新云门禁/恢复/历史纯测试 | 30/30，exit0 |
| 原统一会话/边界 | 23/23，exit0 |
| 新恢复真实PostgreSQL + pin证书HTTPS | 12/12，exit0 |
| 统一网站原HTTPS端到端 | 16/16，exit0 |
| 原五组真实PG | 98/98（18+13+4+14+4+11+9+4+10+11），exit0 |
| 合成只读隔离 | 46/46，exit0 |
| 新恢复真实Edge浏览器 | 16组流程，5宽度，exit0，无pageerror |
| 原统一网站真实Edge回归 | 16组流程，5宽度，exit0，无pageerror；2次明确新意图确认 |
| API / 安全 / 视频策略 | 14/14、138/138、6/6，exit0 |
| 静态产物 | 原2+新1，共3/3，exit0 |
| 原始tsc / ESLint / Build | 均exit0，不关闭检查 |
| 两路独立审查 | 各53/53纯测试、增量diff检查0；无未闭合源码阻断 |

```powershell
& $nodeExe scripts/adaptation-checks.cjs unit,base-unit,typecheck,lint
& $nodeExe scripts/adaptation-checks.cjs browser,pg,base-browser,base-https --pg-bin $pgBin --openssl $sslExe --playwright-module $playwrightModule
& $nodeExe scripts/adaptation-checks.cjs regressions,readonly --pg-bin $pgBin --openssl $sslExe
& $nodeExe scripts/adaptation-checks.cjs build,export,api,security
& $nodeExe --test artifacts/b2-a-8/video-demo/policy.test.cjs
```

“5宽度”指1440/1024/768/390/320的原网站视口/水平溢出断言及当时截图，不冒充全站或所有弹窗的最终UI验收。HTTPS为独立本机证书pin；未关闭远端TLS验证。

[原基准CI 42551463034](https://github.com/2574303451-create/jinxi-web/actions/runs/42551463034)是42722d5的实际push成功，API14/安全138/视频6/原PG55及工程检查；读取既有验收记录复制为BASE_ACCEPTANCE.json。它**不覆盖本轮未推送的云适配、持久化恢复或历史预演**。本轮没有新远程CI，也不修改工作流制造结果。

## F. 独立审查、修复和安全边界

两路初审和增量补审发现并关闭11项具体问题，包括等待持久化后的切号泄漏、UUID大小写、错误预演资源先读数据、回执分页/期限/容量、旧ID和财务别名，以及目标状态交错和同值原号。每项源头、修复提交及真实RED见[INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md)和[FAILURES.md](FAILURES.md)。测试夹具错误也保留，未放宽权限或删原断言。

最终两路锁定66fcbb1；后续仅交接/证据资料。源码对照、敏感文件/凭据签名扫描与保护路径对照见FINAL_STATE.json；另对当前仍可用的2个本次临时合成账号文件、16个私密密码值进行提交候选全文件字节比对，0命中，见CREDENTIAL_SCAN.json，不记录密码本身。扫描不等于绝对保密证明，另有实际完整diff和两路审查。私有账号文件、开发私钥和浏览器profile均在Git外。

原始日志保留诊断内容和换行，不为消除空白提示而重写；Git文本归一化可能改变换行字节。EVIDENCE_MANIFEST.json记录工作文件SHA256和进入Git的blob ID，排除自身以避免循环校验。构建仅有既有Browserslist数据陈旧提示，退出0；本轮没有升级依赖。

生产/TEST保护继承此前用户当次控制台及既有验收：旧Published Locked、main-only、无分支部署/PR Preview/Build Hook，TEST Builds stopped。**本轮未重新在线读取或改变这些平台设置**，没有任何部署操作；本地提交的发布门禁/旧写接口/资源绑定与基准逐文件无差异。main及前五组审核基准本地ref保持原SHA，不重新审计18PR，更没有修改它们。正式LEGACY_MEMBER_AUTH_READY=false仍保留。

## G. 仍需确认

真实208账号与员工号/UUID凭据、无作者历史内容、旧时区及连续/奖励政策、真实积分规则生效日、期初/余额/流水与累计指标定义、重复奖/财务别名、历史订单/退款/冲正状态、旧公告发布政策和赞助来源均未获得真实核验授权。在线人数、战绩奖励、支付及媒体上传仍待验；UI-DEFER-001/002仍未处理。

未来TEST必须有另行批准的独立资源身份、专用角色/密钥、schema建立与回滚方案、可信Netlify Context、TLS连通及真实权限证明、静态构建与Functions显式绑定、真实持久化恢复/清理/对账容量验收。现有只读TEST不能为方便验证而改成可写。没有这些现场条件，不放行云端写入。

## H. 停止点

工作包2的本地代码、自动化、两路独立审查、修复及复测完成，可供本地验收和后续审核分支推送审批。下一步先验收本交付；若需要远程审核，应单独授权推送当前同名独立分支。任何新云端资源、角色/变量、包装器部署、真实资料读取或迁移均需另外明确授权，本地通过不涵盖它们。

本轮停止，不自动推送、不部署、不迁移、不进入正式上线，五阶段顺序不变。
