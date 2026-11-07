# 第三阶段检查点1：本地合成成员身份交付

## 范围与基准

从累计分支 d43ee24cfde1277eedabc8c8856de697b702dc0f 建立独立本地 worktree `E:/Recovery/.jinxi-research/phase3-member/worktree`，分支 `codex/jinxi-phase3-member-local`。开始时原F03工作区干净，远端HEAD一致。没有新PR、push、merge、云端部署或云数据库连接。完整最终提交由本地Git记录及本轮答复提供；results.json登记最终受测文件内容指纹，可逐文件核对提交包含的代码。

TEST只读元数据复核：Site 17885134-a57c-4589-83d3-39e30be9e0cf、Deploy 6aeebe4ceae178c10e4199e8、源码13de96d7531dde3222fdf513e711447a1df3e425均未变化；stop_builds=true、skip_prs=true。没有读取环境变量值、修改reader/writer或进行云SQL。原18PR和旧站用户签核的保护状态继续继承，不重新审计。

## 实际实现

复用既有password.js、ATTESTATION_SQL、validateProof及F03隔离原则，建立本机 `/api/member` 的登录、会话恢复、本人资料、修改密码、退出，以及可手动操作的独立HTTPS验证页。运行步骤见 [member-local/README.md](../../member-local/README.md)。它不在Next页面或Netlify入口中，首页不会下载这套代码。

账号的实际源码关系为 bigint账号id、employee_no唯一外键→档案employee_no主键。新的稳定UUID映射独立存在，不根据昵称或208静态档案推断身份。旧两表形状兼容演练用208条全新合成记录，保留锁定/停用/强制改密分布；该事务回滚，不是导入真实208账号，也不证明生产完整schema已亲查。

合成旧200000次PBKDF2及600000次新格式、强制首次改密、不存在/错误/锁定/停用/缺映射的统一拒绝均已实现。Cookie不透明、HttpOnly/Secure/SameSite，数据库仅存摘要。账号状态、改密、到期及主动退出由服务端失效；本人资料不接受客户端主体。事务、输入/Origin/CSRF、持久限流和受限列权限实际测试。旧会话、积分、帖子等旧入口未被重开。

| 修改文件组 | 原因 |
| --- | --- |
| member-local/identity.cjs | 限本机资源、复用实际身份/权限证明的认证处理器，仅五类身份操作 |
| member-local/schema.sql、database.cjs | 新临时集群、旧列形状及稳定ID侧表、摘要会话/限流、状态撤销触发器、最小角色；不作为生产迁移 |
| member-local/server.cjs、demo.html/js/css、scripts/member-local.cjs | 可运行的独立loopback HTTPS入口、Cookie真实浏览器验证、草稿保留；不改原网站组件 |
| tests/member-local-boundary.test.cjs、member-local-postgres.test.cjs | 连接前拒绝、真实SCRAM数据库/ACL/事务、HTTPS和身份攻击回归 |
| package.json、eslint.config.mjs | 加入本机运行/测试命令、新安全测试及新目录lint；不更换依赖、锁文件或CI规则 |
| artifacts/rea-003/UI_AUDIT.md | 同一功能提交中登记UI-DEFER-001/002；待第四阶段修复 |
| 本目录、member-local/README.md、根交接最新提示 | 测试、失败、截图、源指纹及准确操作边界；不增加云建设关卡或平行管理员清单 |

## 实测结果

Node24.22.2/npm11.19.1，PostgreSQL17.11，新临时集群仅127.0.0.1:55436、jinxi_member_local；SCRAM实际登录。不是Neon18、云端身份或生产验收。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 连接前安全边界 | 4/4通过，错误地址/角色/context及继承变量拒绝，getter值未读取 | boundary.log、unit-cookie-race.log |
| 真实数据库及HTTPS身份 | 17组子场景全部通过；Node报告18项包含父项。208合成映射、各类登录、同昵称分离、跨账号、改密/全设备撤销、伪造/重复/轮换/退出/到期重放、状态恢复不复活、并发登录、SQL注入、限流、实际越权ACL和故障回滚 | postgres-cookie-race.log、local-database-proof.json |
| 原公开只读功能及隔离 | 46/46，在另一新临时55435集群。筛选先于LIMIT、null附件/封面、缺权限不伪造0、身份/ACL攻击及限定回滚 | read-only-regression.log；未用云端库替代 |
| API / 安全 | 14/14、71/71；原测试条件保持 | unit-cookie-race.log |
| 原始TypeScript / ESLint / 静态构建 | 均exit0；CSP仍7页/8个哈希 | typecheck.log、lint-cookie-race.log、build.log |
| 本机浏览器 | 1440/1024/768/390/320px通过，正常/首次登录、本人资料、改密、退出、过期、草稿保留；1440多标签共享/退出同步，390断网恢复；键盘3px焦点、reduced-motion、无溢出，页面错误/CSP违规/外部请求均0 | browser-cookie-race.log指定目录，真实PNG及results.json |
| 原CI与受保护源码 | 原d43ee24 CI成功；本轮未push，无新GitHub CI结果。workflow、lock和app/components/hooks/lib/services/public/styles/Netlify Functions及F03配置无Git内容差异 | test-resource-state.json、results.json；新增目录lint和原规则同跑 |

没有新增依赖，复用基线安装目录；本轮不把旧CI冒充新本地提交的云CI。浏览器仅对本机自签测试证书使用新建上下文；原生HTTPS用指定CA和正确SNI，未关闭证书验证。测试结束均在finally停止本轮数据库/服务器，不清理其他工作树或服务。

## 保留失败及修正

1. boundary-before.log保留实现前模块缺失的失败。之后4项通过。
2. postgres-first.log为首轮15通过/3失败（含父项），两项子场景构造问题：idle超时误改已绝对超时的旧会话，触发时间CHECK；Host负向将TLS SNI也变成虚构域，先被正确的证书校验拒绝。现在只更改目标会话摘要对应行，并在HTTP Host负向保持受信localhost SNI/CA；所有CHECK和TLS验证保持。
3. PostgreSQL错误对象包含合成会话摘要片段，原完整输出按指纹私有保留，公开日志仅去除failing-row摘要与冗长公钥证书对象；失败位置、错误码和计数保留。不是业务API回显，所有API失败测试均验证无内部标记。private-evidence-receipt.json记录原文摘要；没有真实账号/原始hash导入。
4. DATE解析对照显示旧式JS ISO切日会将2018-02-10变成2018-02-09；本人资料改用数据库YYYY-MM-DD，实际测试严格断言2018-02-10。原首页创立日数据无改动。
5. 收尾源码复核发现缺失SQL批准标记的NULL比较可能让IF得到unknown。现在各目标/标记使用IS DISTINCT FROM，实际guard在DDL之前以缺批准标记只读运行必须报错，回滚后才正常初始化。最终PG和浏览器已复验；没有为通过而放宽配置或权限。
6. 本地提交后的异步状态复核发现旧核验401会同时清显示与Cookie，可能晚于新登录到达。session-race-failed.json是对实际服务器401做延迟、在新登录后释放的失败复现。单改前端代次判断不足，旧清Cookie头仍会删除新令牌；该中间运行等待资料超时，外层60秒停止后遗留一份本轮临时PG，后续浏览器因端口占用未启动。已严格核对临时data路径、postmaster.pid与55436，只停止该测试实例，没有接管其他服务。最终改为401不隐式清Cookie，仍拒绝访问；主动退出/改密照常撤销并清Cookie，前端仅当前代次更新显示。session-race-passed.json验证延迟401后新身份显示和服务器本人资料都有效；另重跑实际数据库/HTTPS及五宽度浏览器。原“过期必须清Cookie”的断言被更严格的“过期401无Cookie副作用 + 新登录不被旧响应破坏”行为测试取代，未弱化认证、CSRF或到期判定。

## UI登记与云端停止点

UI-DEFER-001（FAQ）和UI-DEFER-002（公告内部）已在原UI_AUDIT登记用户观察、代码线索、规范差异、待修复状态、第四阶段验收和权限/数据影响。原截图在本轮不可得，明确按文字登记，不伪称自动化复验。旧其他待办不标完成。FAQ/公告JSX、CSS、文案、主题、通用组件和本机草稿发布限制没有改变。

此结果只完成第三阶段**第一个本地身份检查点**。真实成员接入、主站统一身份Provider、留言/攻略、签到、积分、公告等恢复尚未实施。现有云TEST继续只读；不启用writer LOGIN，不更新已验收部署。未来需要单独审查受限认证写角色、实际云结构/适配和权限范围，不能直接运行本地schema或删除其loopback限制。

下一步唯一待批准的动作是：在独立审查通过后，将本地候选推送到独立审核分支供继续审核，**不部署、不改当前TEST**。本轮无管理员控制台、凭据或截图待办，不申请生产权限。未获后续授权前停止；回退只需停止/放弃本地实验工作树，旧站和云TEST无需回滚。
