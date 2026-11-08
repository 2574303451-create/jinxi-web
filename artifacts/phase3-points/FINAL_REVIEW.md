# 第三阶段检查点4：本地合成积分验收

2026-11-08（北京时间）。结论仅适用于本机合成环境：积分业务已运行并完成同轮独立审查、修复及复测。未接入正式网站或云TEST，未推送、部署、迁移、创建/合并PR、改变真实积分或兑换真实奖品。检查点5未开始。

## A. 实际功能

- 稳定成员UUID的零初始账户；余额、毛获得、净获得、毛消费、净消费、退款及冲正分列。流水沿用direction=1/2与正point_delta，具有唯一业务ID、前后余额、来源关联及连续序号；API大整数是十进制字符串。
- 只读取既有attendance.recorded.v1，以event_id唯一独立回执结算。原签到事实/事件保持只读，源事件仍unsettled/金额null。规则版本、时间窗、冲突拒绝、每成员同code跨版本每日/总毛奖励限制、历史结算不可自动重算均已实现。
- 普通成员不能改规则或人工加分；可信服务端admin可创建新规则版本、启停规则/合成目录、处理订单和冲正原奖励。没有恢复ADMIN_PASSWORD或旧云端写接口。
- 余额榜与净获得榜指标分开，默认不公开，主动列入后仅随机公开别名/指标；稳定同分排序、快照分页、锁定/停用/首次改密未完成不展示。
- 固定合成价格与库存、兑换条件、本人订单、pending/fulfilled/failed/cancelled约束。原订单扣减、库存移动、流水/账户/请求回执同事务；本人取消或admin失败仅退原额、恢复原库存一次。冲正绑定原奖励、只执行一次且不得产生负余额。
- 复用原服务端会话/CSRF/Origin、数据库身份与ACL守卫。账号→会话→全局业务互斥→金融资源固定顺序；锁后、延迟约束完成后、提交前重验身份/权限。新本机页面隔离私有状态及原请求重试，不自动重复扣减。

## B. 版本、改动与来源

实际根目录：E:/Recovery/.jinxi-research/phase3-points/worktree；分支codex/jinxi-phase3-points-local；origin=https://github.com/2574303451-create/jinxi-web.git。

已验证祖先：35ae9a676813249ae2beff9845251eb57a72855c → f8175c4d22fc8b83c556a7dad943f1960ed1780e → 891f2356cdbc4e8cb9fb88b74d7c045171c3b94e → 636bd6360a6b5e9cfda6dc20b6b70585102f04e8（实现）→ 513678f552e5acd6b636bb4d184a6959fbbce982（数据库/第一轮私有状态修复）→ 61a8483ff529819c1bf894e24e48a9d1da1f23bd（最终业务修复及双人复审）。本报告所属最终收尾提交仅追加文档/证据，完整最终SHA以git rev-parse HEAD及最终答复为准，避免在提交中自引用自身SHA。

改动：points-local内15个模块/说明文件（SQL、数据库/证明、协议/业务、规则、兑换、排行、HTTPS、独立demo）；9个tests/points-local*测试及支持文件；scripts/points-local.cjs；package.json的脚本/测试入口；eslint.config.mjs的本地CJS覆盖；CODEX_HANDOFF及本目录验收证据。完整文件/源码LF指纹见final-scan.json。

源文件保护核对：身份/社区/签到、app/components/services/types/styles/public、旧Functions、旧积分SQL、netlify.toml、.github、test-environment、锁文件和UI_AUDIT均无差异。成员测试生成的新数据库证明另存本目录member-regression-database-proof.json，原历史证明恢复相同Git内容。构建生成的guild-home-facts保持原blob，没有把生成噪音提交。

基准远程HEAD实际只读核对仍为891f235；远程points分支不存在，本轮没有推送。基准真实[GitHub Actions](https://github.com/2574303451-create/jinxi-web/actions/runs/42425922538)对应完整SHA891f2356cdbc4e8cb9fb88b74d7c045171c3b94e，completed/success，覆盖API14、安全104、视频6、原PG集成55、TypeScript/ESLint/Build；不覆盖本轮积分，亦不覆盖原专用身份/社区/签到PG与实际TLS/浏览器。未将它当作检查点4远程CI通过。详见baseline.json。

## C. 实测结果与可复现命令

Node24.22.2/npm11.19.1、PostgreSQL17.11、现有OpenSSL、Playwright驱动本机Edge。每个PG套件创建独立临时合成库，仅loopback55436；TLS3069；原只读模型55435；串行运行并在结束停止服务。密码/私钥/数据库文件不进Git。TAP计数含父测试，不能将11/11解释为11个独立业务场景。

| 项目 | 实际结果 | 证据 |
|---|---|---|
| 积分业务PG | 11/11 | points-postgres-final.log |
| 故障/撤权/锁等待PG | 9/9 | points-review-final.log |
| 缺mutex、延迟约束到期、共享集群共存PG | 4/4 | invariants-green.log |
| 积分真实HTTPS | 1/1 | points-https-marker.log |
| 页面/连接边界纯测试 | 16/16 | epoch-ui-final.log |
| 实际Edge完整业务、XSS、键盘、五宽度 | 通过；1440/1024/768/390/320及admin320 | browser/2026-11-08T04-45-15-360Z/results.json及截图 |
| 关闭广播的第一/最后回包、已显示内容静默切号 | 三组全部exit0，serverCookieIsB=true且stalePrivateVisible=false | epoch-browser-runs.json及其三个session-browser/results.json |
| 原身份PG/HTTPS | 18/18 | member-regression-final.log |
| 原社区PG/专项/HTTPS | 13/13、4/4、1/1 | community-regression、community-review-regression、community-https-regression.log |
| 原签到PG/到期专项/HTTPS | 14/14、4/4、1/1 | attendance-regression、attendance-review-regression、attendance-https-regression.log |
| 合成只读TEST模型/公开API实库回归 | 46/46 | readonly-regression.log |
| API / 安全 | 14/14、120/120 | final-engineering-test-api/test-security.log |
| 原始tsc / ESLint / Build | 全部exit0 | final-engineering.json及对应日志 |

以上最终TAP均fail/cancelled/skipped/todo=0。RESULTS.json从实际日志和浏览器结果严格校验后汇总，不通过旧日志数量推断。final-local-runs.json记录数据库修复后的首轮完整积分测试；中断后重启的继承回归及新TLS/浏览器由final-resume-runs.json记录；最终公开epoch三模式由epoch-browser-runs.json记录。没有删除或削弱原断言。浏览器仅在功能与隐私两个独立场景间清空一次合成限流夹具，未改真实限流规则、金融记录或旧限流断言，原身份18/18另验证限流仍生效。

在上述根目录使用points-local/README.md中的现有工具变量及积分命令复现。继承回归的实际命令如下（全部串行；scripts/run-clean.cjs剥离继承的云端密钥环境）：

```powershell
& $nodeBin scripts/run-clean.cjs run test:member-local -- --pg-bin $pgBin --openssl $tlsBin
& $nodeBin scripts/run-clean.cjs run test:community-local -- --pg-bin $pgBin
& $nodeBin scripts/run-clean.cjs run test:community-review -- --pg-bin $pgBin
& $nodeBin scripts/run-clean.cjs run test:community-https -- --pg-bin $pgBin --openssl $tlsBin
& $nodeBin scripts/run-clean.cjs run test:attendance-local -- --pg-bin $pgBin
& $nodeBin scripts/run-clean.cjs run test:attendance-review -- --pg-bin $pgBin
& $nodeBin scripts/run-clean.cjs run test:attendance-https -- --pg-bin $pgBin --openssl $tlsBin
& $nodeBin scripts/run-clean.cjs run test:test-environment -- --pg-bin $pgBin
```

## D. 独立发现、修复与复测

两名独立代理分别审查Standards与Spec，最终61a8483均无未闭合发现，各自实际运行纯测试16/16。主代理运行真实PG/TLS/Edge；独立代理阅读其源码/断言和红绿证据，未独立重跑这些端口测试，职责不混淆。

真实修复包括：排行外层本人UUID泄露；缺失互斥行未拒绝；COMMIT延迟约束跨过会话期限仍提交；无广播静默切号显示旧私有数据。最后一项又实测确认“多读一次”只后移窗口，遂在新本机适配器增加无身份/令牌/权限的公开失效nonce，读取和失败响应不回写，绘制前后同步比对及清空已显示内容，原服务端授权完全保留。详见INDEPENDENT_REVIEW.md与保留的RED日志/失败截图，未靠放宽权限通过。

## E. 兼容和现有保护

同一个真实合成集群中，旧身份profile、社区创建/本人读取、原签到重复请求及积分同时可用；旧签到事实及源未结算事件不被积分结算改写。原成员/社区/签到/只读模型完整回归通过。旧原型积分/历史模拟表快照保持不变，新运行角色不能读取旧历史样本、改签到事实或授予角色。

旧Netlify写入口及部署门禁源码未变，没有云资源或PR写操作；生产Published锁定、Deploy Previews关闭及TEST冻结配置均未由本轮改动。按本轮范围未重新审计18个PR或连接生产/TEST平台，本结论不能替代下一次推送前的实时发布门禁核验。正式UI未改，UI-DEFER-001/002继续第四阶段。

## F. 尚待确认及限制

旧文本ID对应稳定UUID、真实规则生效时间、历史余额/方向与流水一致性、历史消费/兑换/退款、重复发奖风险均未证明；不按昵称认领、不迁移、不补奖、不纠正原历史。合成1/2/3规则、净获得榜、每成员跨版本毛奖励限额、虚构商品及取消/冲正政策只是登记的测试假设，不能当作真实生效政策。

云端适配、正式UI接入、最小云端角色、真实授权政策和受控历史迁移未实施。全局互斥是本地一致性取舍，未做云端性能验收。500ms显示清理会受后台节流影响，focus会先清空重验；服务端始终独立验证会话和权限。没有声称消除所有可能缺陷；本轮未发现未修复的已复现安全缺陷。

## G. 下一步与回滚

代码与本地证据具备申请推送同名独立审核分支的条件。唯一下一步是用户单独授权安全推送，并在执行前实时确认云端部署门禁；不包含部署、迁移、合并或检查点5。本轮保留本地提交后停止。

本轮没有生产或TEST写入需回滚。若需撤销本地实现，可从891f235建立另一本地工作树检查，保留现有提交；不reset/重写历史、不执行云数据库SQL。关闭手工演示时按Ctrl+C即可停本机服务/临时数据库，原始数据不会被本轮自动删除。
