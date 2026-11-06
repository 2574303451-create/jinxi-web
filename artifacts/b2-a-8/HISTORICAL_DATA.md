# 历史数据资产清单

范围为 PR #17 的 `9f53e1428d29a56f459e9c29ce79e0969ef1294e`，旧读写参考 B1 的 `115bf854a7977a3e582a89af13459115178a1e31` 及已删除的历史函数。下表的表名、主键和外键来自源码或草案。所有真实库的表存在性、约束、行数和部署归属仍待管理员核验。仓库中的 SQL 示例、静态 208 份公会档案和 `b2_lab` 夹具各自独立。

## 数据表与迁移责任

| 源码资产 | 旧业务与源码键 | 真实数据类别与位置待核验 | 新版对应与迁移／回滚边界 |
| --- | --- | --- | --- |
| `guild_member_profiles` | 登录、成员档案及签到署名。`employee_no` 文本 PK，`archive_member_id` 是可空字段，旧 DDL 无稳定 UUID | 真实成员资料、工号、角色、停用状态。核对库、schema、档案映射、停用字段和授权 | 保留原行、活跃状态与工号私有性。旁表增加经核实的稳定身份映射。回退读旧档案 |
| `guild_member_accounts` | 登录、改密、签到及积分主体。`id` PK，`login_account` 和 `employee_no` 各唯一，后者 FK 到档案，更新级联、删除限制 | 真实账号、密码散列、首登标记、锁定状态、时间戳。核对实际键及账号映射，只提交格式与计数汇总 | `b2_lab` 同名表是合成样本。`member_account_security_v2`、`member_sessions_v2`、`member_session_limits_v2` 是未执行草案。关闭新会话可回到只读，旧账号行无须回写 |
| `messages` | 留言、回复、反应、置顶和展播。`id` PK，回复与反应在 JSONB，旧 DDL 无成员 FK | 真实留言、历史署名、嵌套记录、图像引用。核对匿名和成员来源及存储附件归属 | 继续读原表。作者绑定另建可信关系，只应用于有证据的记录和新提交。回退原投影，保留所有 JSONB |
| `strategies` | 攻略、附件、评论、点赞、收藏、置顶和浏览。`id` PK，`comments`、`likes`、`favorites`、`media_files` 为 JSONB，无成员 FK | 真实公开及非公开攻略、历史作者和媒体元数据。核对全部状态、约束、JSONB 形状、外部媒体与文件归属 | 保留原 ID、URL、状态及嵌套历史。B1 继续读原表。双模式只增可选字段；回退解释层，保留原始附件 |
| `checkin_records` | 每次签到与奖励。`id` PK。早期 `user_id, checkin_date` 普通索引，积分版 DDL 声明唯一。无成员 FK | 真实用户标识、日期、连签及奖励。核对变体、重复、日期时区及是否有未映射身份 | 签到事件原样归档，映射放旁表；回退为旧历史读取，保留原时间及奖励 |
| `user_checkin_stats` | 签到统计和旧排行榜。`id` PK、`user_id` 唯一。无成员 FK | 真实署名、总签到和历史积分摘要。核对实际计数和积分系统口径 | 保留原汇总并与签到明细核对差异。回退原投影，现有值继续可审计 |
| `checkin_reward_rules` | 签到活动设计 SQL。`id` PK，`rule_name` 唯一 | 规则与历史版本；仓库有草案和示例。实库使用待证 | 整体归档规则与有效期，未来按版本读取，回退旧规则指针 |
| `checkin_makeup_cards` | 补签卡设计，`user_id` PK，无成员 FK | 可能的真实标识和补签卡余额；启用情况待证 | 保留余额，后续使用批准身份映射；回退不再变更新卡余额 |
| `checkin_makeup_records` | 补签设计。`id` PK，`user_id, target_date` 唯一，无成员 FK | 可能的真实补签、卡或积分消费 | 保留原日期和消费类型，与账本核对，回退旧历史投影 |
| 每日任务 | `services/daily-task-service.ts` 与旧组件使用浏览器 `jinxi-tasks-*`、`jinxi-task-stats-*`，旧服务曾向 `points` 上报 | 本机进度与历史，及可能存在于数据库账本的上报事件。源码没有独立任务表证据 | 浏览器历史保留，可信任务规则单独实现。按业务事件去重，旧本机值仅作参考 |
| `point_account` | `points`、`points-board` 和积分过程。`user_id` 文本 PK，无成员 FK | 真实积分余额、赚取和消费总额、状态 | `b2_lab.point_account` 是合成样本。冻结窗口对账后建立经批准的映射或余额切点，回退保留旧账本和新增收据 |
| `point_ledger` | `point_award`、`point_spend` 等流水。`id` PK、`biz_id` 唯一，`user_id` 逻辑关联 | 真实积分交易、前后余额、规则及扩展 JSONB | 保留流水 ID、事件顺序和业务键，不重新结算旧交易。按确认规则迁移新写能力 |
| `point_rule` | 积分规则与历史版本。`id` PK，`rule_code, version` 唯一 | 发放规则、上限和状态，可能影响交易解释 | 合成 `point_rule` 与 `point_catalog` 结构不同。保留规则版本，回退原规则读取 |
| `point_redeem_order` | 兑换订单。`id` PK、`order_no` 唯一，`user_id` 逻辑关联 | 真实订单、积分成本、状态及扩展字段。核对待处理订单和外部履约 | 保留状态及订单号，与流水及独立收据对账，切换失败暂停写入后处理未确认订单 |
| `risk_event_log` | `point_log_risk` 与规则判断。`id` PK，`user_id`、`biz_id` 逻辑关联 | 可能含真实成员及风险事件。核对保留期与私有 ACL | 作为限制访问的历史审计保留，禁入公开 TEST 和 CI |
| `announcements` | 旧公告管理和前端渲染。`id` PK，无成员 FK | 真实富文本、署名、时间，核对 HTML 内媒体 | 保留原字节作为档案，继续安全渲染投影；保留原行，回退只读展示 |
| `guild_sponsorship_entries` | 赞助展示和旧登记。`id` PK，仓库 DDL 字段为署名及时间 | 可能是真实赞助记录。数据库结构没有金额字段，财务凭证归属另核 | 保留条目和时间，分离公开显示与真实凭证；回退旧列表 |
| 浏览器和对象存储 | 组队、游戏数据及部分草稿为本地浏览器；头像实验为本机存储。留言／攻略／公告含媒体引用 | 实际旧站点仍可能有独立存储、EmailJS 招募或服务外数据。备份按所有者分别核对 | 数据库 dump 只覆盖数据库内容。媒体对象及存储版本独立保全，历史署名不按同名认领 |

积分版 `database-points-activity-schema.sql` 对已有重复签到数据可能保留普通索引，需从实库确认约束。旧签到汇总的 `total_points` 与积分账户 `balance` 各有来源。先记录差异、原因和裁决，避免将同一次签到奖励重复折算。序列、视图、扩展、外表、触发器、RLS、权限和函数属于结构资产。映射完备前暂缓身份及金额变更。

## 源码追溯

| 资料 | 审查结论 |
| --- | --- |
| `database-schema.sql`、`complete-database-setup.sql`、`database-strategy-schema.sql`、`database-strategy-clean.sql` | 基础 DDL 与示例写入同文件。留作结构比对，禁止整份重放 |
| `database-member-auth-schema.sql`、`database-b2-member-session-draft.sql` | 前者含触发器替换。后者依赖 `__APPROVED_SCHEMA__` 与实库尚未确认的 `profiles.member_id`，不应直接执行 |
| `database-checkin-schema.sql`、`quick-checkin-setup.sql`、`database-checkin-activity-design.sql`、`database-points-activity-schema.sql` | 新旧约束、规则种子、函数替换与奖励操作混合，真实库采用版本待核 |
| `database-announcements-schema.sql`、`database-guild-sponsorship-schema.sql` | 公告和赞助候选 DDL。旧函数曾含运行时建表，公告旧路径还可能清理过期数据，历史运行版本待核 |
| `database-media-files-migration.sql`、`database-strategy-migration-simple.sql` | 包含加列、索引与更新。现阶段保留原 `media_files` 和历史缺失形态 |
| `database-diagnosis.sql`、`quick-update-name.sql`、`update-anonymous-to-zhishou.sql` | 旧诊断可能输出行级数据，两份改名脚本会修改签到历史。均保留作历史审阅 |
| `artifacts/005s-b1/VIDEO_AGGREGATE.sql`、`tests/support/*fixtures.cjs`、`scripts/ci-postgres.cjs` | 前者为 B1 统计参考。后两者生成或重置专用合成库，仓库示例无真实生产证据 |

在 B1 源码，`messages`、`message-actions`、`strategies`、`strategy-actions`、`announcements`、`sponsorship`、`auth-login`、`auth-change-password`、`checkin`、`leaderboard`、`points`、`points-board` 均曾读取 `DATABASE_URL`。旧 `messages-pg`、`simple-strategies`、`db-test`、`debug-reply`、`check-name-update`、`leaderboard-fixed` 和 `leaderboard-original` 只作历史追踪。需由 Netlify 管理员提供最后实际发布的 SHA 与 Functions 名单，才能把这些路径映射到当时的部署。 [B1 Functions](https://github.com/2574303451-create/jinxi-web/tree/115bf854a7977a3e582a89af13459115178a1e31/netlify/functions) · [当前策略](../../netlify/functions/_shared/function-security.js)

当前候选只开放有边界的公开读取，旧身份、留言／攻略动作、签到积分与私有排行入口闭锁。云读取需校验分类、库指纹、运行角色及有效权限。历史 Netlify 部署可能仍运行旧代码，不能由候选状态推定生产写入已暂停。 [资源核验](TEST_RESOURCES.md) · [增量迁移门槛](INCREMENTAL_MIGRATION.md)
