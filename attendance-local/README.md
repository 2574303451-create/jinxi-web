# 第三阶段检查点3：本地合成签到与统计

基线f8175c4d22fc8b83c556a7dad943f1960ed1780e；独立分支codex/jinxi-phase3-attendance-local。本模块不接正式网站、云端TEST或积分账本。原身份、留言攻略及所有旧Functions保持原样；旧checkin入口仍冻结。

## 旧契约核对与尚待确认

- database-checkin-schema.sql/quick-checkin-setup.sql：user_id/user_name是文本，不等于新稳定UUID。checkin_date为日期，checkin_time/created_at为timestamptz；continuous_days/is_continuous/reward_points是当次缓存结果。早期仅普通索引，没有成员/每日唯一约束；缓存统计和事实有并发不一致风险。
- database-points-activity-schema.sql另有唯一(user_id,checkin_date)升级、FOR UPDATE统计锁、perform_checkin_v2和point_award。旧v2在写签到事实前先尝试积分奖励；biz_id可外传，默认checkin:user:date。历史函数/表升级是否真正执行、是否已有重复、旧统计积分与账本是否相符，均没有真实数据证据，本轮不读取或推断。
- 历史SQL使用CURRENT_DATE，未登记固定业务时区；无法由仓库证明生产历史会话时区。旧API还曾在v2函数错误后回退legacy入口，不能据此重新启用任何旧写入路径。
- 旧服务/组件传浏览器account/userId与deviceId，并显示pointAccount余额和奖励；都不是新签到身份凭证。本轮不改变这些正式组件。
- 旧前端及SQL源码均描述连续1–2天1分、3–6天2分、7天以上3分，但源码不等于历史已结算依据。奖励是否生效、版本/生效日、重复biz_id和历史映射留检查点4及受控历史验收，本轮不计算或显示到账积分。

## 本地明确规则

1. 复用member-local原Cookie、稳定UUID、会话及CSRF，先身份核验，再在账号→会话锁内重查锁定、停用、改密、版本、撤销与实际到期。不接受user_id、昵称、日期、连续天数、奖励或前端权限字段。
2. 本地新事实表attendance_lab.records的业务时区固定Asia/Shanghai；时间来自数据库，每日唯一(member_id,business_date)。日期与时间由数据库生成，运行角色无日期、时间或ID的插入/更新权限。此规则不自动解释或迁移旧记录。
3. 日期以取得账号锁后、签到SQL语句开始的可信时钟为准。同一语句内日期/时间一致；会话到期独立用实际clock_timestamp校验。默认使用真实数据库statement_timestamp；边界测试使用仅初始化管理员能写的本地合成时钟，HTTP和运行角色不能改时钟。
4. 连续天数从事实日期排序计算。今日未签但昨日有记录时，当前连续数保持截至昨日；最近一次早于昨日则当前0。中断后签到从1开始。累计、最长连续、月度计数与历史均从记录复算，无统计缓存写入口。回拨到已有未来事实之前或事实/事件不一致时报不可用，不返回假零或假成功。
5. requestId是成员绑定幂等号。同日换号重试仍返回已签；同号跨日重试只确认原记录，响应同时给原签到日期和当前今日状态，不能误记次日已签。只有用户再次发起新请求才可签到新日。
6. 每条事实只有一个不可变attendance.recorded.v1事件，记录UUID、事实ID和业务日期，状态unsettled、积分金额null。事实、唯一事件、请求回执同事务提交。事件不是积分流水，未来消费者必须以事件ID建立唯一结算回执；实际消费/结算未实现。
7. 旧结构模拟数据单独放attendance_legacy，均为合成数据，运行角色不能读写；无可信映射的旧user_id/同昵称不归属到新UUID，不补签、不补发积分、不计入新统计。
8. 页面仅本机独立演示，私有状态按成员/请求代次隔离；身份广播、focus/online失效旧内容，未知响应只保留绑定原成员的请求号，不自动重放、不持久化私人历史。

RLS中的attendance.actor是服务端核验会话后设置的事务上下文，不是第二套数据库身份认证。数据库运行凭据只能由本机适配器持有；持有该凭据的人可自行设置此上下文。该模型不宣称能抵御运行凭据被窃取，也不能直接搬到浏览器或云端TEST；未来云端适配需单独审核身份、连接与授权边界。

数据库语句时间与事务时间的区别，以及STABLE函数在同一语句使用同一快照，依据[PostgreSQL17日期时间文档](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)和[函数快照文档](https://www.postgresql.org/docs/17/xfunc-volatility.html)。实际边界仍由真实PG测试验证。

## 本地API

- POST /api/attendance：JSON仅op=checkin、requestId(UUID)，Origin与X-CSRF-Token必需；服务端取得成员，不接客户端身份/日期。
- GET /api/attendance：本人状态、统计和历史；可选month(YYYY-MM)、before(YYYY-MM-DD历史游标)、limit(1–100)。它们只能筛选本人读取，不能回填签到日期。
- 响应明确区分checkedDate、today、hasCheckedToday、outcome(checked/already_checked/replayed)、stats与history；rewardStatus始终unsettled、rewardPoints=null，不提供余额。

本轮用真实本机PostgreSQL、HTTPS、事件回归和浏览器验证，并在同轮完成独立规范/需求审查。最终命令、失败修复记录及证据在artifacts/phase3-attendance。FAQ/公告UI-DEFER-001/002继续留第四阶段；不开始积分、排行或兑换。
