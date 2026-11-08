# 检查点5未闭合事项最终收尾

本轮只补审初轮之后的差异、补测与恢复只读取证，没有业务开发或生产/TEST操作。工作树E:/Recovery/.jinxi-research/phase3-operations/worktree；origin为https://github.com/2574303451-create/jinxi-web.git；分支codex/jinxi-phase3-operations-local。

## A. 版本与范围

开始时HEAD与用户指定4aa491dea5f77cd2b0c03fcf57ac34a38448e520一致且工作区干净。已核实积分基准9fde7fec87fc145cb51638114fe4eb2de1717b39和初轮独立审查源码25d6938a6bf42603ecad88428c970c11e5519c21均为其祖先。本轮受审、受测业务与原测试源码均固定4aa；本轮最终提交只增加取证材料、已补审的两份取证驱动和交接索引，最终完整SHA以本文件所属Git提交及最终答复为准。source-proof.json证明业务和原测试文件与4aa无差异，独立补审与实际源码对应，不冒称证据提交本身已重新执行集成测试。

## B. 初轮之后全部差异

准确79个文件，详见delta-inventory.json（每项路径、类别、前后Git blob及3个提交）：

| 类别 | 文件/内容 |
|---|---|
| 正式网站业务/服务端/SQL/权限/依赖配置 | 0处后续变更 |
| 独立本机错误提示 | operations-local/demo.js仅增加readable(429)文字分支，没有改请求、重试、授权、输入或限流 |
| 测试夹具/断言（3个文件） | browser.cjs增加应用完成等待，在独立首次改密场景前重置新合成库的限流夹具；rate-browser.cjs新增真实120上限→429→只恢复指定合成桶hits=1→首次改密403及回执0；ui.test.cjs新增429清除私有数据、不POST断言 |
| 取证辅助程序（4个CJS） | collect-results、probe-first、run-pg-regressions、scan-candidate，均经本轮独立只读补审，不是正式业务入口 |
| 文档（5个文件） | 模块README、交接索引及历史验收/审查/交接前缀 |
| 历史证据（66个文件） | 实际执行日志、JSON、截图、依赖/历史保护证明；保留RED和受限记录，不把它们算本轮新执行 |

主代理AST多重集合核对：原browser的40处assert表达式全部保留；原UI测试38处全部保留，新增后43处。它只是静态补充证据，实际行为仍以集成/浏览器断言为准。本轮没有修改以上业务/原测试；新增run-tests.cjs、check-remote.cjs两取证驱动也由两位独立审查者附加核验，最终Git blob列于source-proof.json。

## C. 两路独立补审

本轮Standards与Spec均已实际完成，精确候选4aa491dea5f77cd2b0c03fcf57ac34a38448e520；均0阻断、0新增明确缺陷。两位各自独立执行边界/HTML/页面事件18/18、退出0、无跳过；Spec还报告8个相关CJS的语法检查通过。原始回复整理于INDEPENDENT_REVIEW.md，明确与主代理集成测试区分。此前额度阻断只作为历史保留，本轮没有使用它冒充新的审查，也未购买服务。

429只影响错误文字：没有删除/绕过原限流、身份、Origin/CSRF、角色、输入或事务校验。综合测试只在独立合成场景间清理限流夹具；真实429专项只恢复指定合成桶且不改账号、会话、角色、公告、赞助、团队或积分数据。没有削弱、删除或跳过原有关键断言。

旧collect-results是历史快照汇总器，会覆盖其固定结构的旧RESULTS.json，不能用来重建4aa后添的TLS字段。本轮未调用它，全部新证据独立保存在本目录，旧日志/旧汇总保留原义；此注意项不构成业务阻断。

## D. 补充测试

完整可复制的二进制路径、逐项命令、起止UTC、被测SHA和真实退出码见test-runs.json；原始stdout/stderr为同名log。以下所有本轮命令退出码均为0：

| 命令主体（node后参数；工具路径见JSON） | 实际结果 |
|---|---|
| --test tests/operations-local-boundary.test.cjs tests/operations-local-html.test.cjs tests/operations-local-ui.test.cjs | 18/18，无失败/取消/跳过 |
| tests/operations-local-postgres.test.cjs --pg-bin … | 10/10；实际公告/赞助/组队数据、并发唯一、修订数、原四模块同库可调用及记录不被新业务改变 |
| tests/operations-local-review-postgres.test.cjs --pg-bin … | 11/11；实际撤权、退出、改密、锁/会话等待、到期、真实SQL错误、完整快照回滚和原nonce安全重试 |
| tests/operations-local-https.test.cjs --pg-bin … --openssl … | 1/1；本机TLS、Cookie/Origin/CSRF、状态/权限与旧云写路由关闭 |
| tests/operations-local-rate-browser.cjs --pg-bin … --openssl … --playwright-module … | 真实RATE_LIMITED、私有界面清理、指定合成桶恢复及首次改密仍拒绝，passed=true；rate-browser-result.json |
| tests/operations-local-browser.cjs 同工具参数 | passed=true；公告、赞助幂等、组队、媒体、最终旧回包、闲置切号、降权、首次改密与锁定；1440/1024/768/390/320均通过，pageErrors/CSP/externalRequests均0；../browser/2026-11-08T11-03-51-818Z/results.json |
| scripts/test-disposable-postgres.cjs --pg-bin … | 只读TEST模型46/46；新建本机55435夹具，不是云端TEST操作 |
| scripts/run-clean.cjs run test:api / test:security | API14/14、安全138/138，无跳过 |
| scripts/run-clean.cjs run typecheck / lint | 原始tsc和ESLint退出0 |

Node计数包括父测试，不重复累计为业务数量。没有把本机通过报成远程CI通过。原四模块完整专用PG及Build本轮没有重复执行：它们已有上一轮有效证据，相关源码/依赖/构建配置不变；本轮实际做了checkpoint5同库共存、只读/API/安全和受影响的针对性回归。

run-tests驱动固定受测HEAD为4aa，故在证据提交后复现时可直接使用test-runs.json逐项原命令，不要把固定HEAD断言当业务失败。旧rate结果在专项执行后按原字节恢复，新结果另存本目录。HTTPS套件显式信任本机生成CA证书；浏览器沿用原合成本机自签夹具设置，仅作本机交互/XSS证据，不能充当外网证书校验结果。外网GitHub重试全程sslVerify=true。

## E. TLS分类与是否阻断

- 目标只有GitHub HTTPS Git refs，TCP443；不是Netlify、Neon、生产或TEST服务。动作仅ls-remote，无推送或平台配置修改。
- 原默认Schannel错误为握手接收失败；原临时OpenSSL错误为unexpected EOF while reading。分类为TLS握手/读取中断，发生在取得有效Git refs之前；没有具体证书校验失败信息。不能仅凭摘要证明对端、中间链路、代理或证书的唯一根因，不能把推断写成确诊。
- 旧两次失败没有保存精确UTC，按已记录执行顺序，只能界定在6c09351提交之后、4aa提交之前，即2026-11-08 17:59:32至18:00:50（上海时间；UTC09:59:32至10:00:50）。这是提交时间界定窗口，不伪造请求精确时间。此前成功远端与CI来源见旧baseline/base-ci-jobs，仍有追溯价值。
- 本轮在2026-11-08T11:00:01.855Z至11:00:05.175Z，用默认Schannel且显式sslVerify=true重试，退出0，积分分支实际为9fde7fec87fc145cb51638114fe4eb2de1717b39，operations远程分支仍不存在。第一次成功即停止，没有执行第二次，没有关闭证书验证、改全局配置或退回HTTP。remote-read.json与tls-analysis.json保留完整可公开取证。
- 本轮默认Schannel在严格证书校验下恢复，支持临时对端/链路问题的可能性，但旧请求环境变量未记录，不能排除客户端环境差异或证明唯一根因。重试使用清洁子进程环境，没有改全局配置；client-config-presence.json只记录相关配置/变量是否存在，不打印值。GitHub远端读取不是本机合成PG/HTTPS/浏览器的前置依赖，旧失败不能否定这些真实结果；实际推送前远端一致性和部署保护门禁则是强制项。本轮只读障碍已恢复，不等于已经完成未来推送时的全部云发布门禁。

## F. 最终业务边界与保护

已验收的是本机合成公告状态/审核、赞助感谢记录、必要UUID组队、媒体安全和异常处理。未授权私有管理读不返回作者UUID；授权管理员/审核员按既有权限保留必要的管理归属字段，不把合法管理身份信息等同于公开或越权泄露。赞助仅授权角色维护，成员/队长按本人UUID约束；锁等待、失效、切号、回滚、429和XSS的实际断言保持并通过。

在线人数、真实战绩奖励、支付、真实媒体上传及历史归属继续待验，没有新增实现或计作真实业务。FAQ/公告UI-DEFER-001/002不改。前四模块、正式UI、旧Functions、Netlify及TEST保护代码与基准均不变；没有访问云数据库、迁移、发布、环境变量/角色/Preview设置、PR、main或原18PR写操作。远程CI只保留积分基准的既有记录，当前未推送模块没有新远程CI。

## G. 结论与停止点

此前最终小增量的两路独立补审缺口已补齐；本轮受影响测试全过；TLS只读访问已恢复；没有未关闭的本地验收强制阻断，也没有需要修复的实际业务缺陷。满足进入独立审核分支安全推送授权环节的本地条件。本轮不推送；取得单独授权后，仍须按当时remote/HEAD和Netlify生产锁定、Preview关闭、TEST冻结等强制门禁核验，再决定是否推送。本轮保存本地证据提交后停止，不进入第四阶段。
