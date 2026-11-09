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

“trusted”只代表在本次**独立合成证据**下的主体映射可信，不代表真实208账号已验收或全部关联业务可以迁移。报告另外列出歧义/无法映射与业务对账发现；候选目前只含已证明内容的源ID/UUID，不复制正文或财务余额。所有原数据保留，无自动修正。

SQL SERIAL的安全整数源ID无损转成十进制字符串；不安全数字或不支持标识被隔离，不能替换成临时行号后当作迁移候选。UUID先按PostgreSQL语义转小写再判重。同一UUID对应多个旧积分user_id时，分别保留原账本并报告别名对账风险，同日奖励按可信UUID查重；不擅自合并余额。嵌套密码/Token/连接凭据字段也拒绝输入。

`rehearse.cjs`只接受原freshOperations创建的本机指纹/地址/数据库身份，先验证环境，再在临时表中暂存候选/隔离记录，强制ROLLBACK；前后对比旧业务/财务快照。它不向正式成员表或积分表写入。`migration-readonly.sql`只有READ ONLY事务/提示/ROLLBACK，不能执行真实迁移。

未来真实兼容必须另授权只读资料范围、可信账号映射证据、数据最小化与保存期限；先冻结核验快照，逐项人工签收歧义、时区、规则、生效日、余额/流水与订单状态。未来迁移应有独立批准脚本、前后校验与逆向映射、数据备份和停止条件；回滚保留原记录与审计，不通过删除交易/补分掩盖差异。本轮没有生产读取或迁移授权。
