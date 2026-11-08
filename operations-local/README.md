# 检查点5：本机合成公告、赞助及已有业务

基准9fde7fec87fc145cb51638114fe4eb2de1717b39，分支codex/jinxi-phase3-operations-local，根目录E:/Recovery/.jinxi-research/phase3-operations/worktree。仅本机合成PostgreSQL17；复用前四检查点的UUID/会话与受控临时数据库，不改原模块或正式UI。没有云端迁移、推送、部署、真实收款或历史数据导入。

## 已核对的业务契约

| 入口 | 真实来源与本轮边界 |
|---|---|
| 公告 | announcements.js只读id/title/content_html/author/created_at/updated_at，旧表无审核或可信作者UUID。CyberAnnouncement中编辑只是本机草稿，不能等同正式发布；AnnouncementService把author固定显示为执手，不能据此授权。本轮在新合成表扩展状态、版本、UUID、审核、撤回、失效、软删除及修订审计，原公开云读入口不改。 |
| 赞助 | guild_sponsorship_entries只有id/sponsor_name/sponsor_time/created_at；组件公开姓名/上海时间，旧登记关闭。没有金额/付款/财务模型，本轮只维护合成感谢记录，不添加支付或账本，不按姓名对应成员。 |
| 组队 | team-service.ts/types/team.ts仅localStorage，预置队伍/战绩/等级/战力为静态样本；applyToTeam自动批准并限制本人同时一队，队长不能直接退出，转让入口没有可信实现。必要本机UUID创建/加入/退出/本人管理沿用这些已知规则；不恢复虚构战绩、战队积分、奖励或未验证的等级条件。 |
| 在线 | guild-facts.tsx明示“尚未接入”，定义为登录且停留本站，但没有可信心跳契约。会话有效不等于在线。本轮不建立第二套在线系统、不返回假人数，记录待建设条件。 |
| 媒体 | 旧公告浏览器DOMPurify、攻略URL词法规则及允许来源、preload=none/主动播放/失败降级都存在。新本机合成引用仅允许夹具；不新增上传/对象存储权限，不修改Hero与原策略。 |
| 其他入口 | daily-task-service与game-data-service包含浏览器进度、手工/静态统计，缺可信游戏数据与奖励规则；不自动接真实积分，不生成真实游戏战绩。头像/媒体上传旧写入口继续冻结，FAQ/公告UI-DEFER-001/002仍第四阶段。 |

## 合成实施约束

公告管理沿用community_lab.member_roles的admin/reviewer作为本轮合成授权人员，不信任页面标志；审核沿用社区不自审原则。作者或admin管理草稿，独立审核员发布；发布内容先撤回再修订。版本冲突409；相同本人requestId+摘要返回原结果，不重复写修订；更换内容重用requestId拒绝。所有时间由服务器记录，失效时间为受控的管理字段；到期内容从公开读取排除，保留历史版本，不靠后台虚构发布任务。

赞助仅姓名/时间的独立记录UUID，记录人/修改人是可信管理UUID，不代表捐赠者归属。未确认真实历史不自动迁移、认领或更改。组队容量计入队长、一人同一时刻最多一队；不按昵称认领，客户端等级/战力不作为可验证资格。未实现的业务和未来真实政策逐项登记，不标为完成。

服务器富文本过滤使用新增且锁定的sanitize-html2.18.1；浏览器仍复用已有DOMPurify，禁用脚本/样式/外来命名空间/表单/iframe和非夹具图片。来源：[官方服务端过滤说明](https://github.com/apostrophecms/apostrophe/blob/main/packages/sanitize-html/README.md)、[2.18.1变更记录](https://github.com/apostrophecms/apostrophe/blob/main/packages/sanitize-html/CHANGELOG.md)。新工作树使用独立node_modules，不改前四个工作树的依赖目录；原锁定包版本需核对不变。

所有新增SQL均需新建loopback55436、固定数据库名、环境指纹及显式本机合成批准；新运行角色不能修改前四模块。HTTPS3069沿用原身份和已验收公开失效标记，不创建新登录体系。原模块和只读TEST回归、失败证据及本轮独立审查存于artifacts/phase3-operations。

## 本机运行和复测

在PowerShell进入本工作树。Node24.22.2、PostgreSQL17.11及OpenSSL须使用已核验的绝对路径；原始模块的固定端口55436和3069不能同时启动多套。下面命令仅创建新的临时合成数据库，绝不加载.env或DSN：

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase3-operations/worktree'
$nodeExe='E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe'
$pgBin='E:/Recovery/.jinxi-research/identity-review-tools/postgresql-17.11/pgsql/bin'
$sslExe='D:/Program Files/Git/usr/bin/openssl.exe'
& $nodeExe scripts/run-clean.cjs run operations:local -- --pg-bin $pgBin --openssl $sslExe
```

终端显示独立临时凭据文件的位置，只有本机用户读取该文件；不得提交或传到云端。浏览器打开https://127.0.0.1:3069/，使用文件里的虚构账号；本机自签名证书仅用于本机演示。从该页进入/operations。每次启动都是新的合成环境，开始时列表为空。管理员保存公告草稿并提交，由另一个合成审核员审核发布；赞助维护只对合成管理员可见；普通成员可以创建/加入/退出自己的队伍。Ctrl+C停止服务和数据库。启动不接入正式网站，也不复制真实数据。

```powershell
& $nodeExe tests/operations-local-postgres.test.cjs --pg-bin $pgBin
& $nodeExe tests/operations-local-review-postgres.test.cjs --pg-bin $pgBin
& $nodeExe tests/operations-local-https.test.cjs --pg-bin $pgBin --openssl $sslExe
& $nodeExe tests/operations-local-browser.cjs --pg-bin $pgBin --openssl $sslExe --playwright-module 'E:/Recovery/.jinxi-research/identity-review-tools/browser/node_modules/playwright'
& $nodeExe tests/operations-local-rate-browser.cjs --pg-bin $pgBin --openssl $sslExe --playwright-module 'E:/Recovery/.jinxi-research/identity-review-tools/browser/node_modules/playwright'
& $nodeExe artifacts/phase3-operations/run-pg-regressions.cjs --pg-bin $pgBin --openssl $sslExe
& $nodeExe scripts/test-disposable-postgres.cjs --pg-bin $pgBin
& $nodeExe scripts/run-clean.cjs run test:api
& $nodeExe scripts/run-clean.cjs run test:security
& $nodeExe scripts/run-clean.cjs run typecheck
& $nodeExe scripts/run-clean.cjs run lint
& $nodeExe scripts/run-clean.cjs run build
```

浏览器综合业务场景与首次改密场景之间只重置新建数据库的限流夹具一次，不修改身份限流规则、账号、会话或业务数据。另有真实429定向场景，确认限流后页面清除私有内容；只在该合成场景恢复被指定的测试限流桶再验证首次改密拒绝。浏览器账号切换的500ms公开标记轮询受浏览器后台调度影响，不能承诺已显示文字被即时远程擦除；所有重新读取/写入由服务器核验，旧回包及未重验命令不能跨账号。内存草稿仅按本人UUID和当时授权绑定，页面关闭即失去，不写localStorage。

## 尚待第四阶段受控验收

- 本轮admin/reviewer、非最后编辑者审核、容量含队长/上限50是明确登记的合成政策。实际发布人员名单、授权变更流程、审核制度、历史时区和发布规则须另行确认，不将合成政策套到历史公告。
- 旧公告author字符串、历史赞助姓名、localStorage队伍ID不能证明UUID所有权。合成旧结构样本保留在新operations_legacy并禁止运行角色访问；不自动归属、改写、去重或迁移。赞助管理者UUID只表示记录人，不等于感谢对象。
- 在线缺可信心跳/活跃期限/隐私规则；战绩、等级战力、任务奖励、队长转让和解散缺真实服务端契约，继续待验。成员登记数量绝不显示为实时在线。
- 媒体仅本机固定合成引用与故意失效夹具；实际外部资源可用性、授权来源、清理/上传/存储策略未建立，没有云上传能力。
- 本机全局互斥与全量授权快照分页适合此次验证，正式规模需专项容量与查询方案验收。没有云端权限或迁移批准，不可直接部署此原型。
- 正式FAQ和公告弹窗不改；UI-DEFER-001/002保留第四阶段。本轮最终结果和失败复现看artifacts/phase3-operations/FINAL_REVIEW.md。
