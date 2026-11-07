# 第三阶段检查点2：本地合成留言与攻略

基线：35ae9a676813249ae2beff9845251eb57a72855c，分支codex/jinxi-phase3-community-local。前一身份审核CI：https://github.com/2574303451-create/jinxi-web/actions/runs/42363078349 ，对应35ae9a6，completed/success（上轮实际API与日志记录）。本轮不再开展身份基础审计，不修改其Cookie/密码/会话规则。

## 旧契约与兼容边界

- messages.js公开读取最近100条、name/content/category/color/reactions/replies/isPinned/imageUrl/timestamp。数据库仅昵称，无可信作者UUID；replies/reactions为JSONB。公开反应users已由原读取层去除。
- message-actions.js、strategy-actions.js是已冻结入口。strategies.js仍只读published；旧前端提交name/author/userId/userName、pin/delete传password等接口不可作为新授权来源。
- strategies旧字段保留title/content/author/category/difficulty/tags/imageUrl/mediaFiles及时间、状态。旧status为draft/published/archived；本地扩展另加submitted/rejected/deleted，不写原表。分类保留PVP、PVE、新手向/老玩家回归、装备、战力系统、副本、活动、其他；难度1–5；标题100、正文10000、标签10个且各20。
- 本地/api/community是新合成接口，不是旧服务的直接替换；未接主站组件。公开DTO保留留言和攻略基本字段；反应只给计数和空users，攻略likes/favorites保留数组形状但成员列表不公开，另给聚合likeCount/favoriteCount。不会把浏览器自报UUID当认证。
- 本地媒体引用仅允许固定合成路径/fixtures/community-cover.jpg及/fixtures/community-demo.mp4，保留mediaFiles的类型、id、url、thumbnail、title、description、duration、size、uploadedAt、playbackMode字段。仅验证引用契约，未执行任何上传，不新建云存储/凭据或证明真实视频可播。

## 本机安全边界

复用member-local/freshDatabase、原不透明Cookie、稳定UUID、原createMemberHandler与CSRF。身份代码保持原样。每次认证业务先由原身份入口核验；随后用独立jinxi_community_app连接，在事务内按账号→会话锁顺序再次检查状态、版本、过期、首次改密和CSRF摘要，避免核验与写入之间的撤销窗口。登录、改密和退出仍调用原身份模块。

community_lab是仅本机新schema，schema.sql带实际DB名/loopback/55436/管理员/批准标记/新schema及合成注册检查；拒绝缺批准标记。新owner NOLOGIN，运行角色无管理/DDL/TEMP、身份密码/锁定/映射/角色授予写权限。复用实际cluster/DB/角色/有效ACL证明，另核对列授权和RLS；未知身份或权限漂移在业务查询前拒绝。原member角色不获业务表权限。

RLS的community.actor是**由服务器完成会话核验后设置的事务上下文**，并非数据库独立验证过的身份凭证。HTTP客户端不能设置该上下文或得到运行角色连接凭据；所有输入采用参数化SQL。不能据此宣称运行角色凭据被盗后仍无法伪造上下文。角色/列权限、RLS和触发器是纵深约束，不能替代会话/CSRF及应用授权。应用运行连接不使用owner或初始化管理员。

member_roles仅由合成初始化管理员写入，稳定UUID分别授reviewer/admin；普通账号在原profiles中的member_role、昵称、前端标志、ADMIN_PASSWORD均不授予权限。reviewer只审核待审内容，不能置顶或删除他人内容；admin可置顶/删除普通业务内容。作者不可自审，即便有审核角色。旧无归属内容对所有角色只读。

## 明确业务规则

- 留言创建submitted；攻略创建draft，作者submit后submitted；审核者approve→published，reject→rejected。公开只读published，作者只读本人，审核队列只给受信任审核角色。
- 修改必须提供version，成功递增1。已发布内容修改后撤下并重新进入留言submitted／攻略draft，置顶清除；不能绕过重新审核。
- 删除为软删除；归档和删除后不允许改写。旧无归属样本owner_id=NULL、legacy=true，不按相同昵称/静态档案自动关联；数据库也禁止更改归属。
- 互动用active=true/false明确设定，不用有重试歧义的toggle。每个成员/内容/类型只有一行；回复/评论和互动仅对已公开内容。内容被撤下后不再公开其评论与互动。
- 写操作必须带UUID requestId。相同成员、同号同内容返回原成功结果，不重复写；同号不同内容409。请求回执、内容和审核审计同一事务提交；失败整体回滚。并发修改依据version只接受一个版本，其余409。
- 成功回执是原操作的结果，不保证其内容状态仍为最新；随后列表读取反映当前状态。浏览器只在内存保留未确认请求及绑定成员，重试沿用原请求号；切换成员时拒绝重放，输入草稿保留。刷新/关闭页面后的未确认业务收据恢复不属于本检查点的承诺，不能误称已经完成。
- 纯文本/Markdown源内容；HTML标签、控制字符和不可信媒体引用拒绝。隔离演示页使用textContent呈现，不插入作者HTML。历史文本只做安全读取投影，不改旧数据。
- 重新核验、退出或更换成员时清除旧列表；从服务器条目载入编辑器的字段也在成员变化时清除，避免把A的私有正文留给B。自行输入且未绑定服务器条目的草稿按原规则保留；网络失败不自动重放。
- 只创建合成账号和合成内容，不连接真实Neon或读取真实成员。

## 未来迁移仍需审核

需要经授权核实真实messages/strategies及JSONB子项、原id和状态分布，并以独立的可信证明建立历史内容与稳定UUID映射；没有证明的保持未认领。不得把本地schema直接运行于生产或现有TEST，不重跑含示例INSERT的历史SQL。未来将旧JSONB回复/互动拆成带外键/唯一约束的规范表，并建立审核/版本/幂等记录，必须另做备份恢复及增量兼容验收。

本地通过不等于云端业务恢复成功。FAQ/公告UI-DEFER-001/002仍留第四阶段；主站纸张设计、头像外框、双行展播和攻略中心不改。

## 本机复现（PowerShell）

在本分支工作树根目录运行。工具路径指向现有独立工具目录，不安装应用依赖或收费服务：

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase3-community/worktree'
$node = 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe'
$pgBin = 'E:/Recovery/.jinxi-research/identity-review-tools/postgresql-17.11/pgsql/bin'
$openssl = 'D:/Program Files/Git/usr/bin/openssl.exe'
$playwright = 'E:/Recovery/.jinxi-research/identity-review-tools/browser/node_modules/playwright'
& $node scripts/run-clean.cjs run test:community-local -- --pg-bin $pgBin
& $node scripts/run-clean.cjs run test:community-https -- --pg-bin $pgBin --openssl $openssl
& $node scripts/run-clean.cjs run test:community-browser -- --pg-bin $pgBin --openssl $openssl --playwright-module $playwright
& $node scripts/run-clean.cjs test
& $node scripts/run-clean.cjs run typecheck
& $node scripts/run-clean.cjs run lint
& $node scripts/run-clean.cjs run build
& $node scripts/run-clean.cjs run test:test-environment -- --pg-bin $pgBin
```

前三条按顺序执行，各自新建本机SCRAM PostgreSQL临时集群（55436）和全新合成库，finally停止；HTTPS与浏览器测试再启动3069回环服务。不能同时运行多个55436测试或交互演示。旧公开读取回归使用另一新建集群55435。没有真实数据库连接参数。

需要手动查看时，运行下面一条后，在浏览器打开https://127.0.0.1:3069/community。证书只用于本机临时自签HTTPS；按该次终端输出的private文件位置读取**合成**账号密码，文件不在Git工作树。结束时在启动终端按Ctrl+C：

```powershell
& $node scripts/run-clean.cjs run community:local -- --pg-bin $pgBin --openssl $openssl
```

最终结果、失败原因与修复记录见[本轮证据](../artifacts/phase3-community/FINAL_REVIEW.md)。新业务的真实PG/HTTPS/浏览器用例不在现有远程CI覆盖范围，本轮也没有推送或触发新CI。
