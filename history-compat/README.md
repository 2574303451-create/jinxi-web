# 合成历史兼容核验与回滚预演

本工具只读取明确标记的合成JSON，没有数据库读取、DSN、网络、apply或真实导出选项。`fixture.cjs`生成208个虚构档案/账号（编号SYN、bigint以字符串保存），不读取仓库真实成员清单。数据文件与独立映射文件分别提供；标记是输入范围约定，不是对真实资料合法性的证明，管理员不得把真实数据改标签后输入。

`node scripts/history-compat.cjs --synthetic <synthetic.json> --bindings <synthetic-bindings.json>`输出结构化报告；只读原输入。已有schema来源：database-member-auth-schema.sql、database-schema.sql、database-strategy-schema.sql、database-checkin-schema.sql、database-points-activity-schema.sql、database-announcements-schema.sql、database-guild-sponsorship-schema.sql及五组已审模型。

| 旧契约 | 可信兼容条件 | 否则 |
| --- | --- | --- |
| profiles.employee_no、accounts bigint id | 唯一员工号、账号、独立核准anchor与UUID逐项对应；保留前导零/大整数语义 | 重号/重复UUID为歧义，缺档案/账号或证据无法映射 |
| 留言name、攻略author | 另有逐记录归属证明；昵称和浏览器user_id从不构成证明 | 保持孤立历史只读，不反向认领 |
| checkin_date/time、continuous_days、is_continuous、reward_points | 日期/格式/唯一性可核验；旧时区、连续与奖励规则须另证 | 隔离非法/重复记录；不补天、不补发或改变旧日期 |
| point_account、ledger | 显式可信用户映射与期初锚点；方向1/2配正delta、逐笔余额链和当前余额一致 | 不采用旧余额初始化新账户，不去重/删除历史流水 |
| point_rule | code/version唯一、生效起止有证据，历史流水明确规则版本 | 规则/生效日未证，不推定1/2/3分普遍有效 |
| redeem orders、refund/reversal | 订单、扣减、原业务编号、金额、主体与退款/冲正一一对账 | 重复、无原流水或状态冲突隔离待核实 |
| 公告/感谢 | 旧字段格式、安全内容及来源/发布审计重新核验；同名感谢是独立记录 | 保留，不当作新管理员已签发的正式公告或真实收款 |

旧版 `perform_checkin_v2` 在奖励流水写入原用户 ID、`daily_behavior/checkin`、签到日和连续天数。核验要求同一原用户及签到日只有一笔签到和一笔正向奖励，且流水金额、余额变动和连续天数一致。签到编号须符合正向 SERIAL 范围，连续天数和奖励须符合 PostgreSQL INTEGER 范围。多个旧用户 ID 归属于同一可信成员时，用于发现同日冲突。缺少任一侧只说明本次快照缺乏证据。签到日时区和生效规则仍需单独核实。报告只输出待复核项，签到、积分和补发均不生成迁移候选。

“trusted”只代表在本次**独立合成证据**下的主体映射可信，不代表真实208账号已验收或全部关联业务可以迁移。报告另外列出歧义/无法映射与业务对账发现；候选目前只含已证明内容的源ID/UUID，不复制正文或财务余额。所有原数据保留，无自动修正。

SQL SERIAL的安全整数源ID无损转成十进制字符串；不安全数字或不支持标识被隔离，不能替换成临时行号后当作迁移候选。UUID先按PostgreSQL语义转小写再判重。同一UUID对应多个旧积分user_id时，分别保留原账本并报告别名对账风险，同日奖励按可信UUID查重；不擅自合并余额。嵌套密码/Token/连接凭据字段也拒绝输入。

当来源记录或归属证据的数字 ID 超出 JavaScript 安全整数范围时，同类记录中舍入到同一值的精确文本 ID 也隔离。核对原始精确 ID 后才能重新判断归属。

旧版 `point_create_redeem_order` 将 `order_no` 作为扣减流水的 `biz_id`，商品编号写入 `ext_json.item_code`。核验同时检查兑换类型、主体、金额、商品、流水方向及固定消费代码。退款必须对应原扣减的业务编号，顺序、主体、金额和方向必须一致。冲突提示、重复流水、孤立扣减及缺少退款依据的关闭订单保留待人工对账。关联冲正的依据需单独核实。报告不生成积分、订单或退款迁移候选。

累计获得与支出分别按旧版入账和扣减 SQL 的方向累计，用十进制字符串保存期初 `openingBalance`、`openingTotalEarned`、`openingTotalSpent`，用 BigInt 核对余额链和两项累计值。期初三项应来自同一份独立快照。同一登录档案存在多个已知旧积分标识时，即使当前只提供了其中一个账户，也不能共用成员级期初值。缺失或相互矛盾的期初数据、重复账号或流水、缺账户的流水，以及退款或冲正采用的计数规则，均保留待核实，不能把缺失值补成零。

`rehearse.cjs`只接受原freshOperations创建的本机指纹/地址/数据库身份，先验证环境，再在临时表中暂存候选/隔离记录，强制ROLLBACK；前后对比旧业务/财务快照。它不向正式成员表或积分表写入。`migration-readonly.sql`只有READ ONLY事务/提示/ROLLBACK，不能执行真实迁移。

未来真实兼容必须另授权只读资料范围、可信账号映射证据、数据最小化与保存期限；先冻结核验快照，逐项人工签收歧义、时区、规则、生效日、余额/流水与订单状态。未来迁移应有独立批准脚本、前后校验与逆向映射、数据备份和停止条件；回滚保留原记录与审计，不通过删除交易/补分掩盖差异。本轮没有生产读取或迁移授权。
