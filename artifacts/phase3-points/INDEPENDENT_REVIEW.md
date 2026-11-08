# 检查点4独立安全审查与修复证据

固定整体基准：891f2356cdbc4e8cb9fb88b74d7c045171c3b94e。首次实现候选636bd6360a6b5e9cfda6dc20b6b70585102f04e8；第一轮修复513678f552e5acd6b636bb4d184a6959fbbce982；最终业务复审候选61a8483ff529819c1bf894e24e48a9d1da1f23bd。最终收尾仅补文档和验收证据，完整最终HEAD由本报告所属收尾提交及最终答复确定，不自引用SHA。

## Standards

独立代理points_standards_review按仓库CODEX_HANDOFF中信任边界、最小权限、冻结、最小修改和测试要求检查新模块及整体差异。最终复审结论：61a8483无未解决的已证实硬违规、无新增阻断问题。

- handler.cjs:27实际检查mutex行数量，缺行拒绝服务；:44先SET CONSTRAINTS ALL IMMEDIATE，完成延迟金融约束后重查真实会话及必要管理员权限再提交。
- server.cjs:28仅随原身份Set-Cookie追加公开随机失效标记，未参与服务端授权；原Secure/HttpOnly/SameSite=Lax会话Cookie保留。身份/社区/签到源文件、正式UI、旧Functions及云配置未改。
- demo.js:51同步绘制前后比较标记，缺失拒绘；:18/:68清空已显示内容。500ms检查受后台节流影响，是已登记显示时效局限，不影响服务端权限。
- 独立实际执行纯边界/UI测试16/16，通过；未启动PG/HTTPS/浏览器。PG/Edge红绿日志及真实断言由该代理阅读核查，不能称为它独立执行了这些端口测试。

## Spec

独立代理points_spec_review按ACCEPTANCE.md中的本轮用户要求检查结算唯一性、规则版本/限制、来源约束、订单/退款/冲正、排行隐私、原模块及部署边界。最终复审结论：61a8483无未闭合Spec发现。

- 原静默切号问题已闭合：demo.js:50最终读取可信私有快照并核对UUID，:51比较失效标记；:44缺标记拒绘；:18/:68清除已显示旧数据且不发金融请求。
- 最终私有请求本身被延迟也有真实Edge红证据；仅增加第二次请求不作为最终安全修复。公开标记不含身份/令牌/权限，不充当第二套身份认证。
- handler缺mutex拒绝、先执行延迟约束再授权的顺序，没有放宽结算、额度或退款规则。
- 独立纯边界/UI16/16通过，原断言保留；读过主代理PG4/4与Edge红绿证据，但未独立重跑端口测试、未编辑文件。

## 已复现问题与最小修复

| 发现 | 原失败及修复 | 复测证据 |
|---|---|---|
| 排行响应外层携带本人私有UUID | ranking-first.log的隐私断言失败；board响应省去memberId，榜单仅随机公开别名/指标 | ranking-privacy-fixed.log及points-postgres-final.log，原隐私断言保留 |
| 缺失全局互斥行仍能操作（本地异常检查发现） | mutex-red.log及deferred-and-mutex-red.log：200!=503；检查rowCount严格为1 | invariants-green.log，4/4，完整金融快照不变 |
| 延迟约束在COMMIT时跨过会话期限（Standards发现） | 真实延迟约束触发器pg_sleep(1.1)，会话期限900ms，原200!=401；显式提前执行全部约束，再最终授权 | deferred-and-mutex-red.log → invariants-green.log，401且账户/流水/回执/订单/库存全回滚 |
| 无广播静默切号后绘制旧A数据（Spec发现） | VM及真实Edge持有A已完成私有响应，API登录B，原stalePrivateVisible=true；先补最终可信快照重验 | silent-switch-ui-red.log、silent-switch-browser-red.log；第一轮绿色并不能覆盖最后回包延迟 |
| 最后重读本身仍可被延迟（Standards复审发现） | final-private-ui-red.log和final-private-browser-red.log再现；仅新本机适配器添加公开epoch，绘制前后比较，缺标记拒绘，500ms清空已显示数据 | epoch-ui-final.log16/16；最终三组实际浏览器命令/结果见epoch-browser-runs.json及对应session-browser结果 |

idle-marker-ui-red.log保留“已显示内容静默切号仍不清空”的失败；epoch-ui-final.log保留修复后相同断言。marker-fixture-first.log是测试装置在load开始后才删除标记导致的用例时序错误；改为初始化前缺标记，断言未放宽。早期tracer/rules/redeem/https/ui的RED包括尚无模块/尚无操作的测试先行失败和一处SQL CASE括号语法错误；不把这些当作新增安全缺陷，也不计入最终通过数。

## 执行与证据界限

主代理实际执行独立临时合成PG17.11、TLS、Edge、事务故障和并发测试；两名独立审查代理仅运行无端口纯测试并检查源码/断言/红绿证据。中途两名复审代理曾因服务额度停止，本轮稍后已重新完成61a8483复审，未用中断结果冒充通过。

最终复现命令、每项真实退出码及继承回归结果见FINAL_REVIEW.md、final-local-runs.json、final-resume-runs.json、epoch-browser-runs.json和final-engineering.json。启动后中断且无通过摘要的member-regression.log不计验收，完整重跑使用member-regression-final.log。没有删除、跳过或放宽原测试，没有修改生产/TEST资源，没有推送或云端CI结果可用于本次本地提交。
