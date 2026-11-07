# 第三阶段检查点3：本地合成签到与统计验收

日期：2026-11-08（北京时间）。实现与独立代码复审候选1eae1fab0ad228b925f5bc7d28fe14e55c210ade；最终收尾提交只补验收文档与证据，其完整SHA以本文件所属提交及最终答复为准。

## A. 实际完成

已验证会话的稳定UUID签到；服务器上海业务日；数据库每日唯一；成员绑定requestId幂等；相同请求跨日只确认原日期；并发首批/重复请求不增加事实或奖励事件。本人今日、历史分页、累计、当前/最长连续、月度计数和日期均从签到事实复算。

保留原身份、CSRF、Origin与最小权限模型，锁后及提交前核验到期。普通、同昵称及审核成员的私人记录相互隔离。退出、改密、锁定、停用、首次改密未完成及过期拒写。异常、事务失败或慢操作过期无部分写入。独立本机HTTPS演示处理重试、错误、切号、广播和延迟回包；正式网站未接入。

每条新事实仅一个不可变unsettled事件，响应rewardPoints=null，无余额或到账承诺。没有point_account/point_ledger结算写入、兑换或云对象存储。旧结构合成记录隔离保存，不认领到新UUID。

## B. 版本、文件与来源

- 实际根目录E:/Recovery/.jinxi-research/phase3-attendance/worktree，分支codex/jinxi-phase3-attendance-local；origin=https://github.com/2574303451-create/jinxi-web.git。
- 实际祖先顺序：F03/F05验收13de96d7531dde3222fdf513e711447a1df3e425 → 成员身份35ae9a676813249ae2beff9845251eb57a72855c → 业务基础c769400cf09c95b0085e2e9f93f0b00d2b3767bc → 已推送社区审核f8175c4d22fc8b83c556a7dad943f1960ed1780e → 本轮实现94370f7f2c88543e387767b70303d395a320a4d7 → 到期修复1eae1fab0ad228b925f5bc7d28fe14e55c210ade → 本条所属收尾提交。旧消息中的一处c769拼写不对应Git对象，正确值由f817^核实，详见source-scope.json。
- 新增attendance-local的SQL、数据库工厂、权限证明、处理器、统计存储、HTTPS服务和独立演示；scripts/attendance-local.cjs；六个tests/attendance-local-*；package测试命令、ESLint目录、交接与本目录证据。
- 必要共享修复仅member-local/identity.cjs的会话锁后读取和实际时钟续期（5增2删）；不新增身份接口/流程。社区业务源码、原测试、正式UI、旧Functions、积分SQL、依赖lock和工作流没有变化。
- [范围、源码指纹和祖先检查](source-scope.json)。完整修改清单见final-local-verification.json的allChangedPaths；该文件是收尾提交前的关卡快照，不代替提交后的Git状态。最终完整SHA和干净状态另保存于Git外E:/Recovery/.jinxi-research/phase3-attendance/final-state.json及最终答复。仅本地提交，未推送，远程同名签到分支不存在。

上轮真实[GitHub Actions](https://github.com/2574303451-create/jinxi-web/actions/runs/42373547288)属于f8175c4d22fc8b83c556a7dad943f1960ed1780e，completed/success：API14、安全93、视频6、既有PG集成55及tsc/lint/build。它没有运行社区独立PG13/4、只读临时PG46、实际HTTPS/浏览器，也不覆盖本轮未推送的签到代码；原始登记见baseline.json。本轮没有新的远程CI结果。

## C. 实际测试与命令

完整可复现PowerShell命令见[模块README](../../attendance-local/README.md#在本机复现)。[工程命令/时间/退出码](engineering-results.json)、[真实运行命令/时间/退出码](runtime-results.json)可逐项核查。工具为现有Node24.22.2、npm11.19.1、PostgreSQL17.11、OpenSSL及本机Edge/Playwright；所有数据库均新建于本机临时目录。

| 测试 | 真实结果 | 证据 |
| --- | --- | --- |
| test:attendance-local | 14/14，0跳过 | final-attendance-pg.log |
| test:attendance-review | 4/4（3个子场景+父），0跳过 | review-locks-green.log |
| test:attendance-https | 1/1实际TLS契约，0跳过 | final-attendance-https.log |
| test:attendance-browser | 完整身份/重试/切号/延迟响应/文本XSS流程及1440/1024/768/390/320全部通过 | browser/2026-11-07T23-14-26-098Z/results.json及五张截图 |
| 原test:member-local | 18/18（含实际HTTPS），0跳过 | final-member-pg-https.log |
| 原test:community-local / review | 13/13、4/4，0跳过 | final-community-pg.log / final-community-review.log |
| 原test:community-https | 1/1实际TLS契约，0跳过 | final-community-https.log |
| 原test:test-environment | 46/46，0跳过；未受共享会话源码影响 | readonly-regression.log |
| test:api / test:security | 14/14、104/104，0跳过 | final-test-api.log / final-test-security.log |
| typecheck / lint / build | 均exit0；原始tsc --noEmit --incremental false | final-typecheck.log / final-lint.log / final-build.log |

关键断言包括：空日8请求恰一checked、1事实/1事件与正确回执数；同号/异号重复及跨日重放；闰年、世纪闰年/非闰年、月年末、上海与Honolulu连接时区、临界午夜并发；等锁时锁定/停用/安全停用/版本/撤销/到期/首次改密；同昵称UUID与审核员隔离；修改客户端日期/奖励/主体拒绝；真实SQL除零在事实之后或回执之前导致三表全回滚；事件丢失/未来事实不返回假零；运行角色不能改日期、奖励、历史或账本，ACL漂移拒绝。独立迟到专项另外证明失效会话后续重试仍401，以及慢业务SQL后最终回滚。

浏览器保留了请求已提交但响应丢失、快速双击、跨日同号确认旧日、另发新号签到新日、静默切号前重新核验、实际原身份广播登录/退出/改密、旧私有回包被丢弃、首次改密受限、恶意昵称仅作文字的真实行为；pageErrors/CSP违规/外部请求均0。没有把模拟DOM测试代替实际浏览器。

## D. 独立审查与修复

见[两轴独立审查](INDEPENDENT_REVIEW.md)。两代理分别按规范/用户验收阅读实际差异，并独立执行纯测试；真实PG/HTTPS/浏览器由主代理运行。已关闭账号锁旧快照、预核验idle续活、会话行等锁期限旧值、慢业务到期仍提交、旧按钮状态残留及320px长昵称溢出问题；未放宽权限或删减原测试。

首次失败日志、原断言和最终通过均保留。新的HTTPS测试曾错误期待Strict，已按继承Lax契约纠正；仅对失败输出中的废止合成令牌脱敏，未隐去失败或更改Cookie策略。具体失败/修复对照及脱敏哈希见独立审查与https-first-redaction.json。

## E. 兼容与隔离

原身份会话契约及社区读写在同一个新合成集群共存，已完成针对性与继承回归；原公开读取和只读TEST权限模型回归通过。原生产、TEST、pr17-validation、18PR及GitHub main未操作；没有平台设置、环境变量、云数据库、writer LOGIN、旧写入口、推送、部署或PR变更。本轮按用户要求没有重新审计旧基础设施，不能据此声称重新验收了平台实时状态。

正式首页/签到弹窗/任务积分面板/FAQ/公告、纸张设计、双行展播、攻略中心和头像均未改。UI-DEFER-001/002保留第四阶段。构建换行噪声及继承测试重生成的本机proof仅在核实内容来源后还原，不计入业务差异；实际本轮证据独立保存在本目录。

## F. 剩余限制

目前未发现尚未修复的本轮阻断性安全缺陷，测试并非对所有未来部署情景的安全证明。上海规则只用于新本地事实，不解释旧生产时区；旧文本ID/昵称与新UUID无可信映射，旧历史不迁移、不计新统计、不补奖。旧奖励1/2/3规则的实际生效日、历史重复和账本差异未读取/核验。

unsettled事件只有事实唯一性；未来结算消费者仍须使用事件ID唯一回执、可信规则与账本事务，在检查点4验收，不能称已实现积分结算。云端数据库、会话/连接适配、资源和部署保护须在另行授权范围内验收，不能直接把本机原型接TEST。actor是服务器私有事务上下文，运行凭据泄露不在其防护承诺内。

## G. 本轮停止点

代码和本地证据审查通过后可申请推送独立同名审核分支；本轮不推送、不部署、不进入检查点4。下一步唯一需批准的动作是安全推送本审核分支，执行时须先只读复核不会触发部署。代码提交、远程推送、部署和云业务恢复分别记账，不相互替代。
