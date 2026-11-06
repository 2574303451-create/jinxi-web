# E · 真实成员可信会话接入计划与合成迁移演练

**不批准生产会话或迁移。**唯一授权TEST是本机127.0.0.1:55433专用合成库。本轮检查其catalog/约束和聚合格式，未查真实成员、原始hash/密码或凭据。`authorized-test-catalog.json`记录：public中没有guild_member_accounts/profiles；b2_lab两表各2行、映射2、synthetic来源，合成hash均pbkdf2_sha256/600000。真实授权成员TEST、迁移历史、数据量及备份机制均未提供，不能推断生产结构等同于b2_lab。

## 获得真实TEST授权后的前置核验

先获不含值的资源/角色隔离证据；只读导出表/列/类型/default、PK/FK/UNIQUE/CHECK/索引、触发器/函数/owner/ACL/RLS、迁移版本及备份/恢复演练元数据。仅输出聚合账号数/档案数/映射缺失或重复数/有效状态数、hash算法与迭代分布，不取账号名单、工号、密码hash或真实会话。

核实accounts.id实际类型和唯一性，accounts.employee_no到profiles的关系是否一对一，member_id是否已有可信UUID及不可变约束，锁定/停用状态的权威字段和更新路径。昵称绝不作为映射依据；208份仓库档案不是数据库真实账号数量。存在断链/重复/来源不明时停止迁移，不能自动给同名历史留言认领身份。

密码只兼容已确认且有界的格式；当前合成200k旧导入格式/600k新格式验证成功，不代表真实hash分布已验。不为兼容放开明文/MD5或无界PBKDF2；不兼容账号用获批的安全重置流程，统一外部错误，首次强制改密期间仅me/改密/退出。新密码策略、失效期限、NAT限流阈值仍须产品/安全确认。

## 可审核SQL草案与演练

根目录database-b2-member-session-draft.sql不是历史schema。它有无条件DRAFT_NOT_APPROVED guard及不可用schema占位符，不能直接执行；无示例成员/密码INSERT、生产GRANT或自动回填。草案新建account security、session和HMAC限流表，不盲改旧表。假设bigint账号PK及既有可信UUID；若真实TEST不同，必须修订后再审。

session使用随机token的32字节摘要UNIQUE、32字节CSRF摘要、csrf_key_id、account FK、auth_version、绝对/空闲过期、撤销与有界清理索引；检查时间关系和摘要长度。account security将内部账号与稳定member UUID唯一关联。不要公开account/employee_no/session UUID或活动精确时间。

`tests/member-migration-postgres.test.cjs`只从同一草案提取标记DDL，在已核本机合成实例中将占位符固定替换b2_lab、SET LOCAL ROLE NOLOGIN owner，先拒绝任何同名既有表，再演练两份合成映射、摘要/唯一/FK/过期约束。整个事务最后ROLLBACK，6项通过并检查三张拟建表不存在。未迁移真实TEST或生产，未执行历史示例INSERT。这证明草案在合成假设下可运行，不证明真实结构兼容。

## 正式实现和发布步骤

1. 管理员提供并验证可恢复备份/PITR窗口、迁移版本及回滚责任人；在独立TEST复制**脱敏结构和合成数据**演练，不把真实账号放CI。
2. additive迁移：审核后建立新表/索引、审定稳定身份映射；大表锁时间、索引策略及回填批次按实际规模EXPLAIN/锁等待测试。映射校验数量和checksum，不写昵称匹配脚本。
3. 新只读会话恢复API和写认证适配先只在TEST启用。正式Netlify适配器核实context.ip可信链，精确Origin、JSON/大小、CSRF、HttpOnly/Secure/SameSite Cookie；禁止XFF降级伪装来源。缺配置/权限/状态必须拒绝。
4. 每次受保护操作从会话解析member UUID，检查成员状态、锁定、auth_version、撤销及过期。改密/锁定/停用的全部真实写路径均需事务化撤销（不只新API）；旧Cookie在解锁/重新启用后不可复活。会话最多设备/空闲/绝对期限先做NAT、多设备、多标签与超时测试，再定产品值。
5. 各旧业务按RESTORATION_MATRIX独立恢复；服务器验证奖励事实、读取价格、唯一流水与事务，保存并查询订单收据。页面刷新/离开后仍可恢复未确认兑换，不能仅靠本机Map；当前Map只修复同页重登重复扣款。
6. XSS安全渲染、服务器HTML发布验证、有效托管CSP、受支持Next/Node/React组合、全部类型/回归及权限审核完成后，另获明确批准才切真实成员。任何失败回关功能，不回退到客户端自报账号接口。

## 撤销、轮换与生命周期

随机reference token无须签名密钥，DB只存摘要；清Cookie不能代替服务器撤销。CSRF使用独立版本化key ring（仅运行密钥存储），session记录key ID，轮换选择短过渡或全撤销；密钥泄露应全撤销并重新登录。限流HMAC与CSRF分离，轮换期间避免重置计数绕过；原始IP/密钥/会话不进日志、URL、本机草稿或CI。

所有设备注销/停用/改密回归及跨标签事件明确：标签共享Cookie，客户端广播只刷新展示，不代替服务端授权；其他设备必须逐请求失效。网络故障区分401/403/429/503，不把旧缓存当可写会话。旧localStorage只可保留草稿和标明来源的历史显示，不转换成登录证明、不复制旧管理密码、不按昵称认领内容；迁移时保留非敏感草稿，不批量清空用户storage。

实验运行角色已去DELETE/台账UPDATE；正式清理由独立maintenance主体执行有界批次、SKIP LOCKED、明确保留期/监控，不能让public reader或成员会话任意删除。过期、撤销检查即时执行，不依赖清理及时。清理失败告警，不无限延长会话。台账保留和补偿流水另定，不能为清理会话删除审计。

## 托管容量与成本

按当前官方credit计划，compute为10 credits/GB-hour、web requests为2 credits/10,000；实际账号可能是legacy计划，本轮未读取套餐或账单，不报真实月费。公式：compute credits = Σ(实际GB内存×执行秒/3600)×10；请求credits=请求数/10000×2，另计带宽、Neon、重试和限流/清理。官方来源和日期见OFFICIAL_RESEARCH.md。

纯合成算例：每日10,000次受保护请求、每次200ms/1GB时，compute约5.56 credits、请求约2 credits，非实测预算/报价。登录PBKDF2更慢，连接建立/身份证明/事务/异常流量都须实测；本轮合成延迟不能充当Neon/Netlify生产成本。暂不添加在线心跳，避免额外轮询；未来B2-C另做预算。

公开读取优先现有Neon HTTP事务；正式交互事务需要明确受支持的连接方式/池、每实例上限、连接/statement/lock/总超时、并发预算及finally释放。不能在多Function实例无界建池。授权结果不长期缓存；last_seen可评估有界条件更新粒度，但过期/撤销/锁定始终权威校验，不能靠无限续期省写入。来源限流应考虑公会共用NAT，实验5次/15分钟不是生产标准。

## 回滚和停止条件

迁移前恢复演练失败、映射不一、权限过大、云继承不明、CSP变换未知、类型/运行时门槛未过，都停止。正式回滚先关闭新写/撤销会话，保留已生成的业务/审计数据；additive表先停用，不即刻DROP，旧不安全写不能重开。备份恢复/PITR仅按另行批准计划执行。

本轮演练已整体回滚，无真实数据回滚需求。正式头像、在线心跳/隐私开关/名单API/抽屉尚未实施。B2-A正式安全验收未通过，下一步需要真实TEST与控制面证据，再安排运行时/类型及业务恢复独立检查点。
