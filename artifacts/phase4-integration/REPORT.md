# 第四阶段工作包1：统一网站本地合成验收

本轮已在同一个真实网站预览中接通五组已审核业务，完成实际PostgreSQL、HTTPS、浏览器、两路独立审查与复测。验收范围仅为本机完全合成环境；正式云端业务尚未接入，没有推送、部署、PR、云端迁移或真实积分操作。最终没有已知未关闭的本轮安全阻断，等待用户验收。

## 版本来源与源码对应

- 工作树：`E:/Recovery/.jinxi-research/phase4-integration/worktree`；父目录`E:/Recovery`不是Git根目录。此前第三阶段工作树保留5c2856版本，没有覆盖原成果。
- 本地分支：`codex/jinxi-phase4-integration-local`；origin：`https://github.com/2574303451-create/jinxi-web.git`。本轮未创建远程审核分支。
- 批准基准：`5c2856bb386e6d52348d8a15a3a95e0952e177e6`。只读取证的原远程分支仍为`codex/jinxi-phase3-operations-local`；真实[基准Push CI 42478384495](https://github.com/2574303451-create/jinxi-web/actions/runs/42478384495) completed/success、head SHA为5c2856。证据[BASELINE.json](BASELINE.json)。这是基准CI，不覆盖本轮未推送实现。
- 本轮线性提交：5c2856 → `b5206ef8e8b135b1fea8ec2f9a73659e78e2790b`（集成）→ `0e5f2af5920a47a5a25eec16cc1950f942bd8a6a`（会话/字段保全）→ `72c3a8e214f3ac1e4dc68cdb5bd151a013274010`（未知结果后授权拒绝）→ `b1114363aecd84cebd4d46f1c223bbcd7d03a80e`（首次5xx等未知结果与最终交互）。最终本地证据提交在b111436之上，仅改文档和验收材料；完整最终SHA见Git HEAD及交付回复，避免把自身SHA写入同一提交的循环引用。
- 两路最终独立补审均基于b111436。最终测试源码SHA-256统一为`467006faa6dffb6837555323ca59147b3568bc2b063873b9fe7d43fc281e258b`，包含实际源文件/配置/SQL/测试，不包含文档及artifacts。最终文档提交不改变这一指纹。
- F03/F05 d43ee24、身份35ae9a6、社区f8175c4、签到891f235、积分9fde7fe和运营5c2856均为当前祖先；逐项`git merge-base --is-ancestor`退出0。完整SHA、文件清单、源码逐文件指纹及日志散列见[FINAL_PROOF.json](FINAL_PROOF.json)。

## 如何复用现有网站

独立`integration-local/site`开发工程直接导入原首页与攻略页面、共享原SiteDocument/样式；正式页面默认运行时仍为null。原导航、留言墙、攻略投稿/详情/评论与通用弹窗增加必要的可选适配，未复制五个demo。完整“入口→适配→处理器→角色→数据”对照见[integration-local/README.md](../../integration-local/README.md)。

| 原网站入口 | 本轮实际协同能力 | 可信服务端与数据 |
| --- | --- | --- |
| 原导航/登录、改密、本人信息 | 一次登录供全部业务使用；退出、改密、切号、离线和失效时清理私有状态 | 唯一member handler与原服务端会话；不新增身份系统 |
| 原留言墙、双行展播、攻略中心 | 可信作者发布、本人管理、独立审核、回复/反应、攻略草稿/投稿/阅读/评论 | 原community handler、稳定UUID、RLS、原community角色 |
| 原首页“去签到” | 服务端日期签到、本人统计、未结算事件 | 原attendance事实、`attendance.recorded.v1`，不另建事实 |
| 原“查看排行”及账户/兑换弹窗 | 同一事件唯一结算、账户/流水/排行、兑换扣减、取消一次退款 | 原points handler与账本、结算回执及受限角色；仅合成规则/虚构物品 |
| 公告、感谢、原“打开组队”入口 | 管理员草稿、独立审核发布、公开显示；感谢记录维护；可信队长/成员与容量 | 原operations handler、staff/admin权限、UUID成员关系与事务 |

原CheckinWidget/PointsRankingWidget/TeamSystem包含旧浏览器身份、奖励解释或静态数据，未重新启用这些信任路径。通过原网站入口和Modal接入经过审核的必要控件，正式默认组件行为与视觉不变。本地不渲染真实收款码，不触发真实入会通知。

所有业务在同一个新建临时PostgreSQL中初始化，复用原累计初始化器；每个handler仍使用原独立最小权限角色和连接身份保护。只有一个会话Cookie，不以昵称、localStorage ID或客户端isAdmin授权。公告/感谢公开DTO不返回私有作者UUID。

本机HTTPS网关127.0.0.1:3069与开发renderer127.0.0.1:3070分离；页面/静态代理不向renderer转发Cookie或CSRF。旧Functions兼容路径只翻译明确公开读取，旧POST仍410冻结，不联系Netlify。只接受loopback；非development或缺少显式renderer标记不能启动该开发工程。

## 本机复现

预览入口：`https://127.0.0.1:3069/`，攻略为`/guides/`。按[README的PowerShell步骤](../../integration-local/README.md#启动位置与步骤)从当前工作树启动。命令只生成并打印本次私有合成账号文件的路径，管理员/审核员/普通成员密码不写入Git。每次启动新集群和新合成数据，Ctrl+C关闭本轮服务；验收测试结束后未留下常驻预览。

Node HTTPS测试显式固定本机证书并验证证书；Edge测试仅信任本轮本机证书SPKI，没有全局关闭TLS验证、修改系统信任或使用不安全远端连接。

## 实际命令、退出码与结果

工具为Node24.22.2、PostgreSQL17.11、本机OpenSSL和Edge/Playwright，实际完整绝对命令、UTC起止时间、退出码、每次源码指纹在[test-runs.json](test-runs.json)。历史失败与最终成功均保留，不能只挑旧绿灯。下表均为最终源码对应结果，所有Node测试无跳过/取消。

| 检查 | 可复现命令（工具参数见README） | 最终结果与日志 |
| --- | --- | --- |
| 统一会话/边界纯测试 | `node scripts/integration-checks.cjs unit` | 23/23，exit0，[日志](unit-2026-11-09T02-00-22-496Z.log) |
| 同站HTTPS＋真实PG | `node scripts/integration-checks.cjs https --pg-bin ... --openssl ...` | 16/16（含父测试），exit0，[日志](https-2026-11-09T02-15-09-051Z.log) |
| 真实Edge综合流程 | `node scripts/integration-checks.cjs browser --pg-bin ... --openssl ... --playwright-module ...` | 16组业务流程＋1440/1024/768/390/320五宽度，exit0，[实际结果](browser/2026-11-09T01-59-18-371Z/results.json) |
| 身份PG | `node scripts/integration-checks.cjs regressions --pg-bin ... --openssl ...`（顺序执行下列10套） | 18/18，exit0，[日志](member-2026-11-09T02-01-47-090Z.log) |
| 社区PG及补审专项 | 同上 | 13/13＋4/4，exit0，[业务](community-2026-11-09T02-02-58-353Z.log)、[专项](community-review-2026-11-09T02-03-57-872Z.log) |
| 签到PG及补审专项 | 同上 | 14/14＋4/4，exit0，[业务](attendance-2026-11-09T02-04-33-370Z.log)、[专项](attendance-review-2026-11-09T02-05-31-183Z.log) |
| 积分PG及两套专项 | 同上 | 11/11＋9/9＋4/4，exit0，[业务](points-2026-11-09T02-06-10-824Z.log)、[撤权](points-review-2026-11-09T02-07-10-922Z.log)、[一致性](points-invariants-2026-11-09T02-08-20-398Z.log) |
| 运营PG及专项 | 同上 | 10/10＋11/11，exit0，[业务](operations-2026-11-09T02-08-58-276Z.log)、[专项](operations-review-2026-11-09T02-09-50-371Z.log) |
| F03/F05真实合成只读隔离 | `node scripts/integration-checks.cjs readonly --pg-bin ...` | 46/46，exit0，[日志](readonly-2026-11-09T02-16-05-806Z.log) |
| 旧公开API | `node scripts/integration-checks.cjs api` | 14/14，exit0，[日志](api-2026-11-09T02-05-52-234Z.log) |
| 原安全测试 | `node scripts/integration-checks.cjs security` | 138/138，exit0，[日志](security-2026-11-09T02-05-53-012Z.log) |
| 原视频策略 | `node --test artifacts/b2-a-8/video-demo/policy.test.cjs` | 6/6，exit0，[日志](video-2026-11-09T02-17-34-164Z.log) |
| 生产静态产物隔离 | 先build，再`node scripts/integration-checks.cjs export` | 2/2，exit0，[日志](export-2026-11-09T02-05-51-989Z.log) |
| 原始tsc | `node scripts/run-clean.cjs run typecheck`，实际`tsc --noEmit --incremental false` | exit0，[日志](typecheck-2026-11-09T02-05-54-976Z.log) |
| ESLint | `node scripts/run-clean.cjs run lint` | exit0，[日志](lint-2026-11-09T02-05-59-045Z.log) |
| 生产Build及CSP生成 | `node scripts/run-clean.cjs run build` | exit0，[日志](build-2026-11-09T02-05-45-498Z.log) |

旧五组业务PG合计98项，另有只读46及本轮统一HTTPS/PG16，不能与浏览器场景或纯测试混为同一种计数。基准远程CI的旧PG55没有在本轮重新完整重复；本轮针对集成实际重跑上述98＋46，不将其冒称远程执行。

### 端到端不是只看状态码

- 原留言墙写入、独立审核后公开、回复/反应和稳定作者UUID；退出旧Cookie写入401。A的私有攻略草稿、公开攻略UUID阅读及评论作者都核对实际PG行。
- 签到事实→同一事件→并发唯一结算→账户/流水/排行；真实事务失败触发器核对无部分流水或结算。未结算金额仍为null契约，不改签到事实。
- 真实兑换COMMIT后丢失响应，断网/重验/同成员重登后沿用原requestId；另有真实COMMIT后注入503及后来401的测试。严格核对同订单、一次扣减、正确余额；取消仅一条绑定退款。
- 公告管理员创建→独立审核员发布→原网站公开读取与过滤；普通成员伪造isAdmin403，草稿/过期不公开。感谢同名记录独立；组队本人管理、满员拒绝、加入/退出后成员计数相符。
- 同昵称A→B跨两个标签，实际将A旧私有响应在B登录后送达；MutationObserver核对旧草稿未重新出现，B无A订单/余额。改密旧Cookie跨四业务拒绝；锁定、停用、过期、首次改密及真实429清除私有DOM。
- 数据库锁等待期间撤权/到期后拒绝，社区长SQL跨过会话期限回滚。旧无可信归属样本不能按昵称认领；旧积分账本快照保持原状。
- 浏览器最终正常成员PG：签到事实2、唯一结算2、奖励2、退款2、仅本人草稿1，账户一致性函数通过。没有JavaScript pageErrors；故意断网/拒绝场景的网络console记录原样保留，未声称零网络错误。

浏览器场景之间只重置本次新库的限流测试夹具，原因逐项记录；最终实际429单独达到并验证，没有修改handler限流。五宽度断言为原页面无水平溢出及截图，不冒称全部交互均在五宽度逐一重复或正式UI完整验收。截图：[1440](browser/2026-11-09T01-59-18-371Z/integrated-1440.png)、[320](browser/2026-11-09T01-59-18-371Z/integrated-320.png)。

## 独立审查、真实缺陷及修复

Standards与Spec两个独立代理审查固定基准增量，分别独立跑纯测试；最后均对应b111436且无未关闭阻断。代理未自行执行PG/浏览器，不把读取主任务日志称为独立实跑。完整各轮发现及曾经不一致的结论见[INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md)。

| 真实发现 | 最小修复 | 验证证据 |
| --- | --- | --- |
| 社区SQL执行跨过绝对会话到期仍能提交 | 原community handler提交前增加7行wall-clock重验，不改权限模型 | [先失败200而非401](https-2026-11-08T12-59-52-387Z.log)；最终统一HTTPS16验证内容/回执完整回滚 |
| 响应丢失、后来401/403/429或首次5xx误丢幂等号，可能再次扣款 | 主体＋模块＋摘要绑定内存未确认回执；未知结果保持原号直到明确成功 | 保留unit22/23真实红灯；最终23/23＋真实PG回包故障＋浏览器断网兑换 |
| 延迟登录正文和当前Cookie身份错配，profile.member.id未被检查 | 成功前重新读取当前服务端身份并匹配UUID/CSRF；两种私有主体字段及世代/Cookie标记核验 | 独立纯Node复现、最终单测、跨标签旧私有响应实际晚到 |
| 公告改标题覆盖失效时间、感谢改名损失原时间秒/毫秒、队伍改名覆盖其余字段 | 回填原字段并保存；刷新中禁用旧版本提交 | 三项真实浏览器＋数据库字段保全断言 |
| 匿名重验时登录框被无关世代变化重建 | 表单按模式/可信主体/Cookie标记重建；认证中阻止重复提交 | 最终完整浏览器登录、改密、切号流程；切号清理不放松 |

开发兼容问题（独立Next路径、Tailwind解析、严格HMR代理、LayoutProps）和夹具问题也保留失败，不以关闭类型检查、修改权限或删断言解决。最后的证据提交只新增/更新文档与artifacts，业务源码不再修改。[FAILURES.md](FAILURES.md)给出失败原因、处理与复测对应。

## 修改范围、生产隔离与交付边界

修改文件分为：`integration-local/`本机网关/会话/开发工程/适配面板；`components/site-runtime.tsx`与共享`site-document.tsx`；原首页/导航/留言墙/攻略组件及公开读hook的可选接入；`community-local/handler.cjs`上述7行实际安全修复；新集成测试、runner、package脚本、ESLint覆盖与忽略项；本轮证据、UI待办状态和交接摘要。逐文件清单在FINAL_PROOF。

相对5c2856，身份/签到/积分/运营后端、SQL与角色、正式`netlify/functions`、`netlify.toml`、根Next配置、`.github`、`test-environment`、依赖锁、正式主题样式、Hero与公告弹窗均无差异。所有既有测试文件未删除或放宽。本地原`LEGACY_MEMBER_AUTH_READY=false`仍在；静态输出扫描没有本机API/3069/3070、凭据或新可写预览路由。原profile-lab/session-lab等既有静态路由仍存在，不将“无新集成写入口”夸大为“产物无任何历史实验页面”。

本轮未访问真实成员/生产数据库，没有改变main、原18PR、生产Neon、pr17-validation、TEST数据/角色/变量，未启用writer LOGIN、旧云写口或上传/支付。发布锁定/生产分支限定/无Preview/无Hook与TEST Builds stopped沿用此前用户当次证据；本轮没有变更这些设置，也没有再做基础设施审计，不能称本轮重新取得Netlify实时状态。只在本机启动测试，未进行任何发布动作。

提交前对本轮最终文件及各实施提交内容检查私钥/Token/连接串等签名，并与13份本轮生成的私有合成账号文件内容做精确比对，无命中；私有文件不入Git。扫描为签名＋已知生成值及人工范围检查，不是对未知秘密的数学证明。原始敏感摘要失败日志保存在工作树外，公开失败日志已遮蔽该行，SQLSTATE/断言和退出码保留。

原始Next/Node日志保留其终端空白，故全量暂存区diff空白检查会报告日志行末空格/末尾空行；源码和文档检查仅排除本轮原始*.log，退出0，没有格式化或改写测试输出。FINAL_PROOF同时保存实际日志字节SHA-256及Git规范化blob ID，避免将Windows换行转换误判为证据内容变化。

## 仍未打通及下次受控验收前事项

- 统一预览是仅本地开发服务；正式云身份、Cookie/Origin、角色连接、托管入口/发布策略尚未适配或授权。本轮代码没有本次远程CI，基准绿灯不能替代新代码的云端验收。
- 208真实账号映射、无可信UUID的历史内容归属、旧签到日期语义、旧积分余额/流水、规则生效日、历史订单/退款均未证明，不导入、不认领、不补算。全部当前规则及商品明确合成。
- 未建设真实在线权威心跳、游戏战绩奖励、支付、真实奖品、物流、语音、真实媒体上传/存储写权限；当前公开静态档案不等于真实业务账号或在线状态。
- 未确认写操作回执保存在当前客户端内存，整页刷新/关闭/跨设备的意图恢复、生产容量与持久化策略仍需后续受控验收；当前跨断网和同成员恢复流程已验证，不能承诺跨重启全局恰好一次。
- FAQ的UI-DEFER-001与公会动态弹窗UI-DEFER-002仍为第四阶段后续待办，正式视觉未改造。五宽度本地截图不关闭它们。

下一步先验收本工作包。之后的审核分支推送、受控云身份与权限适配、历史兼容及统一UI验收均须按原五阶段计划另行授权；本轮完成后停止，不自动执行。
