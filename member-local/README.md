# 第三阶段检查点1：仅本机合成成员身份

基线 d43ee24cfde1277eedabc8c8856de697b702dc0f。此目录不在 Next app/public 或 Netlify Functions 入口内，没有接入首页、云端 TEST、真实账号或旧写接口。它复用原 PBKDF2、安全会话设计及 F03/F05 的实际数据库身份/有效权限校验；只为独立本机数据库提供适配与受限角色。

## 本机运行

本机已验证 Node24.22.2、PostgreSQL17.11、Git附带OpenSSL。下面命令通过既有 clean runner 剥离数据库/云环境变量，只创建新的临时集群，监听127.0.0.1:55436，库名jinxi_member_local。不会读取 .env、旧本地运行库、Neon或任何连接串。

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase3-member/worktree'
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run member:local -- --pg-bin 'C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres/pgsql/bin' --openssl 'D:/Program Files/Git/usr/bin/openssl.exe'
```

打开 https://127.0.0.1:3069 。这是新生成的两天有效本机自签证书，不更改系统信任或关闭云端TLS验证。启动输出仅给出合成账号私有文件路径，密码不打印、不进入Git或网页存储。用该文件内的合成账号/密码；不要输入真实成员资料。Ctrl+C停止本轮独立服务器与数据库。临时文件私有保留，便于复现；每次启动是新的合成集群，不能当作持久成员库。端口被占用时拒绝，不接管现有服务。

实际 PostgreSQL/HTTPS 回归：

```powershell
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run test:member-local -- --pg-bin 'C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres/pgsql/bin' --openssl 'D:/Program Files/Git/usr/bin/openssl.exe'
```

这同样仅创建新临时集群并在finally停止，既不重置55433旧合成库，也不操作55435以外的F03回归资源。Playwright复现程序位于 artifacts/phase3-member/browser.cjs，依赖本机已有独立浏览器工具；未添加应用依赖或动画库。

## 兼容契约与身份

源码 database-member-auth-schema.sql 的关联是 accounts.id（bigint）为账号PK，accounts.employee_no UNIQUE外键→profiles.employee_no PK。昵称、archive_member_id及仓库208份档案均不是登录主体或已验证member UUID。此结论来自代码，不声称已亲连真实库复核列/触发器/密码分布。

本地保留旧两表的列、主键、唯一和外键形状，以新的member_account_security_v2把内部account ID一对一映射到不可变的随机member UUID；不在旧档案中假定已有UUID，也不按昵称回填。旧v2设计草案的profiles.member_id假设不能直接用于旧schema，本轮没有解除该草案的DRAFT_NOT_APPROVED。兼容测试额外创建208条**完全合成**旧形状记录并回滚，检查映射、锁定、停用及强制改密标志，不复制或重新生成任何真实账号。

复用原有pbkdf2_sha256，合成旧200000次和当前600000次格式均验证；新密码12–128字符、字母/数字/符号，改密后600000次。验证总PBKDF2工作量有界并补足至600000次；不接受明文、未知算法或无界迭代。真实密码算法分布、其他盐/编码格式仍待未来获授权的结构兼容审核，不能据此认定208个真实账号已可登录。

## 本机API

仅 https://127.0.0.1:3069/api/member；Netlify未增加该路由。请求/错误均no-store，无宽泛CORS。POST要求精确Origin、JSON、≤4096字节；已登录POST另要求与当前会话绑定的X-CSRF-Token。忽略客户端昵称身份是不可接受的，本实现直接拒绝memberId/userId/accountId/employeeNo等自报主体及多余字段。资料只能从Cookie解析本人。

| 方法/op | 行为 |
| --- | --- |
| POST login + account/password | 统一错误处理不存在/错误/锁定/停用/缺映射/不兼容密码；签发随机32字节不透明令牌；已有Cookie轮换并撤销；登录失败不重置持久限流 |
| GET me | 核验有效会话、版本、账号/档案状态；返回不透明member ID、昵称、首次改密标志和CSRF令牌，不返回账号、工号、hash、会话ID或活动时间 |
| GET profile | 同一鉴权后仅返回本人昵称/展示名/身份标签/入会日期；首次改密前拒绝；DATE以数据库YYYY-MM-DD输出，避免时区偏移 |
| POST change-password + currentPassword/newPassword | 验证当前会话、Origin/CSRF、旧密码及新密码规则；同一事务更新密码、版本并撤销所有旧设备会话；失败整体回滚 |
| POST logout | 验证Origin/CSRF，撤销当前会话并清Cookie；旧Cookie重放拒绝 |

数据库仅保存token/CSRF摘要，Cookie为__Host-、HttpOnly、Secure、SameSite=Lax、Path=/，不设置Domain。7天绝对期限、30分钟空闲期限和最多5个有效设备会话是**本地实验参数**，不是未经验证的正式产品标准。多标签共享Cookie；广播只通知重新向服务器核验，不传播身份或令牌。修改密码/锁定/停用后的会话不能在重新启用后复活。有效Cookie允许本人正常续用；伪造、轮换、撤销和过期后的非法重放有明确拒绝测试，不声称被窃的仍有效bearer Cookie绝不可能被复用。

未经授权的401响应不发送清Cookie头，防止较早的核验响应延迟到达时删除新登录Cookie；它仍严格拒绝访问，旧令牌不会变有效。主动退出及成功改密仍撤销并清Cookie。前端只有当前请求代次可以更新会话显示，底层fetch不隐式清身份。真实HTTPS浏览器用例延迟原始401响应，在新登录成功后释放，再验证显示和本人资料均正常，失败/通过记录保留。

联网恢复、窗口聚焦与多标签通知共用同一核验入口。登录、读取资料、改密或退出进行中，通知合并为一次操作结束后的服务器重验，避免使用操作前Cookie发起的响应覆盖新状态。补验确认身份不变时保留已读资料和操作提示；真正失效时仍隐藏身份。成功退出或改密后的预期401不覆盖成功提示。此次修复的8项事件顺序回归、真实HTTPS专项与五宽度验证见 [恢复竞态续验](../artifacts/phase3-member/restore-race/DELIVERY.md)；原历史证据不覆盖。

最终独立审查又补齐重复操作、快速切换账号、退出失败和改密失败的回归，目前为12项事件测试及5组实际HTTPS专项；类型、规范、API14/安全83及五宽度复验通过。完整执行命令、工具恢复说明、远端只读保护核验和本地提交状态见 [最终审查](../artifacts/phase3-member/final-review/2026-11-07T09-46-44Z/FINAL_REVIEW.md)。旧8项/3组记录保留为原轮快照，不能当作当前全部覆盖。

前端只保存独立草稿key，密码与CSRF留在内存，Cookie不可由JS读出。断网时身份转为未核验，恢复后重新查询；旧localStorage账号不成为登录身份。没有接入正式统一导航Provider或其他业务页面，本轮不伪称全站登录已恢复。

## 数据库权限与停止

| 主体 | 权限/边界 |
| --- | --- |
| jinxi_member_admin | 仅新临时集群初始化和合成测试；不作为应用运行主体 |
| jinxi_member_owner | NOLOGIN，拥有本地对象；触发器按精确状态变更撤销，不给运行角色EXECUTE |
| jinxi_member_session | LOGIN + NOINHERIT，无superuser/createdb/createrole/replication/bypassrls/成员关系/对象所有权/DDL/TEMP。SELECT限本机认证5表；仅账号密码元数据/登录时间、会话与限流的必要列可更新；只在会话/限流表INSERT，不能解锁、改档案/身份映射、删会话、改业务数据或调用其他definer函数 |

初始化SQL对库名、TCP loopback/port、管理主体、缺失批准标记及已有schema均明确拒绝；actual SQL guard在任何DDL前以缺失批准标记做只读负向验证。运行时每次先用F03/F05原身份及有效权限证明逻辑核对实际cluster/DB指纹、注册分类、实际会话角色、TEMP及细列权限。仿生产地址、错误端口/库/角色、托管context和继承凭据名称会在连接前拒绝；不读取继承值。schema.sql是本地新库实现，禁止拿到现有云端合成库或生产运行。

签到、积分、帖子、头像、心跳等操作没有本机身份API；旧云Functions和reader/writer权限未变。未来云端接入必须另审受限认证写入角色、实际表结构、撤销/密钥管理、清理/成本及托管适配器；不能启用现有writer LOGIN或删除本机限制直接上线。

本轮结果和失败保留在 artifacts/phase3-member/DELIVERY.md。无新GitHub PR、推送、云端部署或真实数据库操作。停止开发时关闭本机服务即可；无生产回滚需要。
