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
