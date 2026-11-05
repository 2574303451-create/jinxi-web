# JINXI-ARCH-005 · 成员身份、资料与头像设计

2026-11-05。**本文件是待验收设计，不是已经实现的生产认证。** 本轮仅有合成账号、浏览器隔离IndexedDB和可交互裁剪原型；没有新增生产会话、头像Function、对象存储凭据或数据库迁移执行。未获得明确的只读测试数据库，本轮不读取任何.env、不连接生产/测试数据库；实际表结构未核实。

## 已观察到的现状

- `auth-login.js`以PBKDF2校验密码并检查锁定/成员有效性，更新last_login_at后返回account、employeeNo、nickname、forceResetPassword。没有Set-Cookie或后续可验证会话。`auth-change-password.js`再次验证客户端账号和旧密码，但没有会话撤销流程。
- 首页用localStorage恢复展示账号/昵称。该状态仅能控制现有界面，不是服务器身份。现有留言与攻略/评论从客户端接受署名，不能因昵称相同认领历史记录。
- 仓库schema文件声明profiles.employee_no为TEXT主键，accounts.id为BIGSERIAL、employee_no唯一外键；没有avatar_key。留言replies、攻略comments为JSONB数组。**这是仓库声明，不能当成实际部署结构**。旧脚本含示例INSERT，禁止直接整份重跑。
- `PublicAvatar`此前只按名称取一个字。本轮默认仍保持文字头像，增加可选的、仅由隔离原型Provider提供的记录ID映射。没有把localStorage账号或昵称映射到真实头像。
- 已有积分接口P0继续存在：客户端自报account/userId、奖励分值及兑换价格信任问题。新增认证若不同时封堵旧路径，认证体系仍可被绕过。

## 生产实施的依赖顺序

1. 获得明确测试环境、只读schema核验权限，检查实际列/约束、Postgres版本、索引、迁移历史与数据量；仅输出结构与聚合统计，不导出用户资料。
2. 批准会话/身份模型及隐私规则后，在隔离测试库引入稳定member_id、sessions及头像指针；备份并核对原数据计数/hash。没有此批准不执行附带的设计SQL。
3. 所有身份相关写接口先统一使用共享`requireSession`。**积分P0必须在启用生产成员写能力前处理**：取消信任自报用户/分值/商品价格；签到/任务奖励由服务端规则计算，兑换在事务中读商品价格、校验余额和幂等性。需独立安全任务与验收，不把本原型算作修复。
4. 接入头像重编码、对象存储、CAS指针交换与清理，再接公开作者投影。最后进行隔离测试、审计、迁移演练与用户批准的上线。

## A · 会话管理（建议）

服务端用32字节CSPRNG生成不透明session token；数据库只存SHA-256摘要，与稳定member_id绑定。浏览器仅有`__Host-jinxi_session` Cookie：`Path=/; HttpOnly; Secure; SameSite=Lax`，不设Domain。跨域需求目前不存在；不把token写localStorage，不将account/employeeNo放URL当凭证。每次请求按摘要查询有效会话、成员状态和auth_version。

建议起始策略：空闲30分钟、绝对7天，登录和权限/密码变更时轮换；敏感资料操作可要求近期验证（例如15分钟）。具体期限属于可调整产品策略，尚未实施。生产只允许HTTPS。`GET /auth-me`返回最小私有资料，`Cache-Control: no-store`；前端从服务器恢复状态，旧localStorage只用于一次性迁移提示，不成为认证fallback。

退出通过POST校验CSRF后撤销服务端记录并清Cookie；修改密码需当前会话+旧密码/二次验证，事务内更新密码和auth_version、撤销其他全部会话，并为本设备签发新token或强制重登。锁定/停用立即撤销；强制重置账号仅可访问改密/退出，不得上传或进行积分操作。未知、过期、撤销会话统一401，前端清理私有缓存并保留非敏感草稿。

防护：同源Origin/Referer校验、绑定会话的CSRF token+自定义请求头，拒绝跨站写入；SameSite仅作为纵深防御。CORS改成明确的环境Origin，不用`*`配凭据。登录页也校验Origin，防登录CSRF。服务端用持久、原子的限流器按IP与账号摘要限速，建议5次失败/15分钟+渐进延迟，不能只用单个Function内存；响应不枚举账号。轮换token通过事务撤销旧token，不能无限接受重放。日志不记密码、Cookie、CSRF或原图；审计记录最小member_id/动作/时间/结果、短期IP摘要。

以上参考[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)、[Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)。这是本项目方案，时间和阈值不是原站实测或已实施规则。

## B · 头像处理流水线

`POST /profile/avatar`只从会话确定主体；拒绝客户端指定其他member_id/account/employeeNo。上传经CSRF、账户状态、限速和容量校验。客户端裁剪只提供体验，服务器必须独立验证，不能信任MIME/扩展名/客户端裁剪结果。

建议限制：JPEG、PNG、WebP，原文件≤2MiB、解码尺寸32–4096px、最多16MP；拒绝SVG/GIF/动画WebP、双重格式/异常解码。服务端读取magic bytes、解码器限制总像素/帧数/内存/时间，以经过维护的重编码库输出单帧128×128 WebP，≤40KiB，去EXIF/GPS/ICC等非必要元数据。正方形裁剪坐标/比例先验证再应用，不把SVG或用户提供URL交给服务器代抓以免SSRF。客户端裁剪结果也须重复走这一流程。

只存最终小图，不长期存原图。每成员1个当前版本、至多1个待清理旧版本（约80KiB上限，另加临时孤儿预算）；建议3次/小时、10次/日，管理员可调。对象key为服务端生成的环境前缀+随机版本，不含账号/工号/原文件名。响应只返回公开头像URL/版本，不暴露存储凭据。

替换顺序：验证→写新key→强一致读取确认可用→数据库事务CAS更新`avatar_key/version`→成功后异步清理旧key。任何失败不改旧指针；数据库失败产生的孤儿由TTL任务清理。并发上传只有预期版本能提交，失败者删除其新key；不把对象存储与数据库假设成同一事务。恢复默认采用同样CAS流程把指针置NULL，清理可重试且不能删除当前引用。对象不存在/图像加载失败时回退文字头像，不能阻塞留言。

参考[OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)。浏览器原型目前只验证格式签名、解码与裁剪，**没有服务端重编码、恶意图片沙箱或真实上传安全证明**。

## C · 存储、费用与隔离

| 方案 | 适配、缓存与持久性 | 费用/访问控制与成本 |
| --- | --- | --- |
| Netlify Blobs（优先评估） | 同架构Functions可用；site-wide store跨部署持久，默认最终一致，存在strong读取选项。应用通过Function提供头像，不把SDK token交浏览器 | 当前公开计划包含Blobs，但不能断言本账号永久免费；需核对用户实际legacy/credit计划及用量。新信用计划公开口径：带宽20 credits/GB、web请求2 credits/万次、compute10 credits/GB-hour。重编码/代理交付计入相关费用。工程集成相对低 |
| Cloudflare R2 Standard | 独立私有bucket，Functions用服务端凭据/S3兼容API；公开头像经受控网关/缓存，原图不公开 | 官方存储$0.015/GB-month、写类$4.50/百万、读类$0.36/百万、出口不计费；月免费层10GB/100万A/1000万B（以官网当前条款为准）。额外账号/凭据/网关/CDN及删除策略维护，工程成本更高 |
| 现有Neon数据库存Base64/浏览器localStorage | 不建议。把展示图复制到每条留言会放大查询、备份、网络和更新开销，localStorage不具备跨设备账户持久性 | 不选；数据库只保存avatar_key/版本/更新时间，头像正文在对象存储 |

资料核对日期2026-11-05：[Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)、[Netlify credit计费](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)、[计划差异](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)、[R2价格](https://developers.cloudflare.com/r2/pricing/)。本轮未查询账户账单、未购买或注册任何存储服务，不能给出实际账单保证。

规模假设而非真实人数：1000个头像×40KiB≈39MiB，保留2版≈78MiB；10万次头像交付≈3.8GiB未命中缓存流量，需另加网关请求和重编码计算。按Netlify公开系数估算约76带宽credits+20请求credits，不含compute、免费额度、其他网站流量及缓存效果。R2相同存储规模约$0.0012/月且可能落在免费层，但请求/网关/域名和维护时间不能忽略。这是算例，不是购买推荐或报价。

**隔离不能只靠Deploy Preview名字或不同store名称。** Netlify `getStore`的site-wide数据可跨部署上下文共享；预览代码可能访问生产。命名`avatars-preview`只能防误用，不能证明同一site自动注入的凭据不能访问`avatars-production`。不能把CONTEXT判断当成对任意预览代码的资源权限边界。真实生产头像需跨部署持久，也不能误用随部署生命周期清理的deploy-specific store当唯一永久保存。

在“不新建第二站点”的约束下，Blobs仍可优先做便利性评估，但**严格存储隔离是其待确认阻断项**：未验证可落实的独立资源授权之前，不能启用同site预览里的Blobs访问。更明确的替代是同一个Netlify站点对接R2独立生产/测试bucket，凭据仅授权指定bucket，生产凭据仅注入production上下文，预览只有测试凭据；不新增网站/域名或迁移页面服务器。R2支持按指定bucket限制对象权限，见[官方token说明](https://developers.cloudflare.com/r2/api/tokens/)。部署环境配置和自动凭据可达性仍要实际核验。本阶段使用本机IndexedDB，无任何对象存储凭据。

两种选择都必须有独立测试数据库、未知环境fail closed及明确权限测试。若无法证明资源隔离，宁可保留本地原型并报告阻断，也不让Deploy Preview使用生产资源。

缓存建议：公开头像只包含用户明确同意公开的小图，版本化URL，短期`max-age=86400`并定义删除/封禁清理策略；不可把永久immutable缓存当成即时撤回机制。`/auth-me`与上传响应no-store，私密原图绝不进入公共缓存。是否公开、最长缓存、审核/申诉和删除时效在生产实施前由用户验收；目前原型不向网络交付头像。

## D · 作者身份与数据兼容

统一公开作者投影建议为`{kind:'member'|'guest', publicMemberId?, displayName, avatarUrl?}`。member仅能由服务器会话与外键确认；publicMemberId是不透明公开标识，不是employee_no、login_account或session。游客由原匿名流程发表且有清楚“游客署名”标记。冒名改请求昵称、memberId或头像URL都不能得到成员标记或写其他资料。

新增留言、回复、攻略、评论用会话写入稳定member_id；昵称由服务器确定并另保留发布时快照。匿名交互仍保留，反滥用与长度校验继续由服务器执行。历史内容`author_member_id=NULL`，**绝不根据昵称/旧localStorage/设备ID自动回填**。同名游客保留文字头像。若日后需要历史认领，必须另有所有权证据、可审计的人工流程及授权，不属于本任务。

回复/攻略评论目前嵌套JSONB；第一阶段可对新对象加入服务器生成`authorMemberId`并在读API中批量关联公共头像，旧对象保持不变。中长期迁移成独立表可改善并发/索引，但需额外迁移方案，不能在这次原型悄悄执行。留言反应users/攻略likes目前含客户端标识，成员头像不能从这些数组推出。

公开GET按DTO投影，不返回账号/工号、session、私有设备标识；列表只给摘要和计数，详情只给原公开内容与最小作者投影。现有攻略API允许status=all的历史风险仍需认证/审核权限治理；本轮新列表固定published、ID读取也仅published，未把旧status接口当成安全的管理员API。

## E · UI与原型边界

“我的资料”显示头像、昵称、账号说明及恢复默认；原型入口在已登录的账户菜单中明确标为“隔离原型”，不携带真实资料。单独`/profile-lab/`必须手动选择合成A/B，不把旧登录状态变成新认证。

原型使用IndexedDB数据库`jinxi-avatar-lab-v1`、avatars store，每个合成成员最多一张Blob；没有Base64写localStorage或写留言。URL.createObjectURL只用于当前页面显示，替换/卸载时revoke。32/48/64展示共用128px输出。保存/失败/恢复文字始终说明“本机测试存储”，不写“生产账号保存成功”。刷新需重新选测试账号，存储可用按钮清空。

实际留言墙、回复、双行展播通过只读数据Provider在原型页面复用；对明确合成记录ID指定成员映射，同名游客不映射，所有写操作在原型内被拒绝。默认官网无Provider，仍使用原公开API和文字头像，UI结构未重新生成。攻略作者与账号菜单使用同一个MemberAvatar。原型会话是可篡改的浏览器模型，跨账号拒绝测试只验证模型，不代表真正的服务端访问控制。

## 迁移与回退（待批准）

拟议结构仅保存在[MODEL_PROPOSAL.sql.txt](MODEL_PROPOSAL.sql.txt)，不是迁移脚本入口、未执行。先添加可空列与新表，再回填稳定member_id（不回填历史作者），核对计数/约束，再逐接口启用。回退时先停写新功能、撤回客户端和Functions、保留新增列/表与对象备份；不能直接DROP丢失用户新数据。确认无新引用后再另行批准清理。

本次原型回退仅需revert本分支提交，清理浏览器原型DB；没有生产数据或存储需要恢复。真实会话、头像存储、迁移及积分P0安全改造需用户批准后才实施。
