# 检查点4：仅本机合成积分、排行与兑换

基线891f2356cdbc4e8cb9fb88b74d7c045171c3b94e；分支codex/jinxi-phase3-points-local。本模块仅新建临时合成PostgreSQL资源，不接云TEST/生产，不改旧Functions、身份/社区/签到源码及正式UI，不发放真实积分或奖品。

## 旧契约与历史边界

database-points-activity-schema.sql中的point_account以文本user_id关联，balance/total_earned/total_spent为bigint；point_ledger的direction=1/2配合正值point_delta，biz_id全局唯一，记录前后余额。point_rule按(rule_code,version)唯一，含启停、生效区间、每日/总限额与冷却；旧award允许requested_delta覆盖规则且无规则时落manual。旧redeem直接用客户端point_cost，pending/success/failed/cancelled，源码没有可信库存或完整退款链。这些旧写入路径不得恢复。

历史points-board按direction=1累计活动获得排序，leaderboard的points按余额（缺表时回退旧签到缓存），二者并非同一指标，旧代码还曾按昵称合并签到排名。本轮保留原表/源码；真实余额、历史规则生效、消费/退款合法性及文本ID对应UUID均未验证，不能按昵称认领、补奖或导入。

## 本地明确的合成规则

- 新账户始终0起步，只绑定既有稳定成员UUID。沿用direction=1/2和正值point_delta；kind另区分award/redeem/refund/reversal。获得与消费记毛额，退款和冲正分列；balance=earned+refunds-spent-reversed；净获得=earned-reversed，净消费=spent-refunds。API大整数使用十进制字符串，余额及各累计值上限9万亿，单项奖励/单价上限100万。
- 只消费既有attendance.recorded.v1；签到事实/事件/运行角色不改，只给新的本地角色必要只读/外键权限。独立settlements以event_id唯一关联实际UUID/日期、不可变规则版本和唯一奖励流水。源事件仍unsettled/金额null，结算以新回执为准；重复事件不发第二次，冲正也不恢复领取资格。
- 规则须以SYNTHETIC.开头，经济字段不可原地修改，修改需新版本；只有可信community_lab.member_roles中的admin可创建或启停。合成1/2/3连续奖励仅作样本。结算时规则须在服务器当前业务时间及事实时间均生效；多个适用规则拒绝，不自动挑版本。每日/总限额为**每成员、同rule_code跨版本的累计毛奖励**，每日按事实业务日；退款/冲正不重置额度。这不是已确认的真实奖励政策。
- 全部金融操作在账号→会话→本地业务互斥行→账户/商品锁的固定顺序下执行；锁后和提交前重查真实会话期限及账号状态。互斥行是本地合成环境的一致性取舍，不宣称云端高吞吐能力。事实、流水、账户、订单、库存移动、幂等回执同事务；拒绝审计不保留部分金融写入。
- 流水追加不可改，退款只能绑定原订单及原扣减，冲正仅可信admin撤销原奖励，金额取原流水且最多一次；余额不足不能强行冲成负数。订单pending可本人取消或管理员失败并原额退款/归还库存；管理员仅将pending标记为虚构完成fulfilled。所有终态不可任意重开，fulfilled不允许成员取消。商品固定虚构，不关联物流、付款或外部系统。
- 排行仅登录成员读取，明确分为balance余额榜与earned净获得榜；默认不展示，成员主动选择列入。只展示随机公开别名及当前指标，不返回昵称、真实账号、员工号、成员UUID或私人流水。锁定/停用/首次改密未完成不展示。同分按稳定公开ID排序，分页带快照摘要，变化则拒绝旧游标。
- 复用既有私有服务器凭据、会话/CSRF/Origin、最小ACL、实际数据库指纹和loopback守卫。points.actor是经过服务端核验后设置的事务上下文，不是独立数据库身份认证；运行凭据不能交浏览器。旧历史模拟仅在points_legacy，运行角色无权限，不参与新余额/排名。

本轮实际结果、失败复现、独立审查与命令将保存在artifacts/phase3-points；所有私钥、运行密码和临时数据库保持Git外。FAQ/公告UI-DEFER-001/002仍留第四阶段，不开始检查点5。
