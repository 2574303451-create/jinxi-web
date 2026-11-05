# B2-0 检查点1：环境隔离、入口与阻断

基线检查点0 / 1be49379a771a2a3f23692260e438c2368841150，依赖PR9→PR8。**本机权限/数据库身份测试通过，不等于云预览与生产已隔离。云侧证据缺失，所有旧写路径及旧身份入口保持拒绝，不部署。**

## 连接和权限矩阵

| 环境 | 资源选择 | 生效要求 | 当前事实 |
| --- | --- | --- | --- |
| production | JINXI_PRODUCTION_READ_DATABASE_URL及对应READ_POLICY | 显式运行时context、独立批准记录、DB实际指纹/登记分类/角色、无写/所有权/提权/危险definer能力 | 未读取生产密钥、未连接，未批准；默认拒绝 |
| deploy-preview / branch-deploy | JINXI_PREVIEW_READ_DATABASE_URL及context匹配的READ_POLICY | 同上且登记分类synthetic-test；不读旧DATABASE_URL或生产键 | 云继承/实际授权未知，缺审批即拒绝 |
| local | JINXI_LOCAL_READ_DATABASE_URL / READ_POLICY | 只准127.0.0.1:55433/jinxi_005s_b1_test，登记synthetic-local，实际cluster-system-id+DB OID+库名SHA256匹配；专用只读角色 | 真实原生PG验证通过 |
| 本机session-lab准备 | LOCAL_SESSION键，allowedSchema=b2_lab | 强制local，同一实际指纹、无提权/DDL/所有权、不可读写公共或保护资源，只准DML到b2_lab | 新角色已建、保护资源访问拒绝通过；会话业务在检查点3实现 |

变量配置名/URL差异不是证明。实际证明查询jinxi_guard.environment_identity()的当前cluster/system/database身份，校验角色属性、成员关系、DB/schema CREATE、对象所有权、跨schema写权限和未批准SECURITY DEFINER执行权。只读请求每次以READ ONLY/RepeatableRead及3s statement/5s transport限制执行；错误不回落旧连接。

指纹登记表不能由runtime角色更改。固定无参数身份函数由本机测试管理员持有，固定search_path=pg_catalog，只返回非秘密身份元数据；PUBLIC执行撤销，专门授予reader/session角色。新owner为NOLOGIN，reader和session均由SQL创建为NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS、无role membership；app不拥有表。角色密码与csrf/rate密钥只在系统TEMP新运行时文件，不入库/仓库/日志。

实际授权库最初只有public.strategies，无guild_member_accounts/profiles（catalog-before.json）。新增b2_lab、jinxi_guard和synthetic protected canary命名空间；没有执行历史schema或示例INSERT。public.messages/announcements/sponsorship是有明确B2 owner检查的本机合成只读回归夹具，不是生产内容。

## 13个旧入口及风险分级

| 入口 | 原风险 | 当前策略 |
| --- | --- | --- |
| strategies | P0匿名自报作者POST；读取隔离仅保护新路径 | 仅GET，B1 DTO/过滤保持，POST拒绝；实际只读角色/指纹 |
| guide-video-stats | P0环境缺失时旧默认prod选择；URL隔离不能证明实际目标 | 仅GET，聚合/0与错误契约保留，新增实际权限证明 |
| messages | P0匿名自报署名无限写；日志正文/stack/连接错误 | GET只读，反应users不公开；旧POST拒绝，日志和stack移除 |
| message-actions | P0自报反应身份/回复署名，共享口令管理、读改写竞态 | 全部旧动作拒绝，尚无可信成员或游客写替代 |
| strategy-actions | P0自报userId/评论署名，未认证view/点赞/收藏，管理共享口令 | 全部旧动作拒绝 |
| auth-login | P0密码校验后无会话；跨域*、锁定枚举、同步PBKDF2可超大参数、错误日志 | 旧接口暂停；不读账号/密码/连接，检查点3只建合成本机会话 |
| auth-change-password | P0自报account、无会话撤销、枚举/原始错误 | 旧接口暂停 |
| points | P0自报account增减积分、客户端价格、私有台账越权 | GET/POST均拒绝；安全替代先在合成原型验证 |
| checkin | P0账号存在性冒充认证；客户端biz/device/IP及旧函数降级 | GET/POST均拒绝，不继续旧降级绕过 |
| announcements | P0默认管理口令；GET隐式DDL和作者UPDATE；raw error/CORS* | 仅GET，无DDL/作者改写/默认密码；写入暂停 |
| sponsorship | P0匿名写及GET建表/索引 | 仅GET，无运行时DDL；POST暂停 |
| leaderboard | P1公开登录账号标识，缺受控公共memberId映射 | 暂停旧投影，待隐私契约整改 |
| points-board | P1账号/余额投影及客户端主体生态 | 暂停旧投影，待公共标识/数据授权明确 |

旧身份入口401；其他旧写/私有投影403（从来只读的视频统计不支持方法405）。OPTIONS无凭据204，不建立数据库连接。返回no-store，移除CORS通配符，不向跨站提供私有响应。5个公开GET依旧为受控公开内容；私有/写能力不会因为旧localStorage、账号字符串或旧管理口令而恢复。

这意味着旧签到/积分/管理/匿名发布暂不能写入；UI入口和草稿组件保留，返回明确升级错误。不是正式生产行为切换，尚未部署。游客是否恢复发布及反滥用方案在检查点2明确，不把游客姓名升级为认证成员。

## 实际测试

legacy-boundary-before.txt保留修补前“未知环境读旧DATABASE_URL/旧写路径创建连接”的失败。environment-tests-final.txt的9项（含父测试）与unit-after-isolation.txt的3项边界测试共12项，覆盖实际fingerprint成功/不符、同一正确URL但实际高权限角色拒绝、reader写/篡改登记/建schema/SET ROLE/读保护数据失败、session角色跨资源读写失败、13入口39种旧写动作在有效本机配置下仍不创建transport、三类云context无批准先拒绝、5个公开GET真实只读PG且公告数据摘要不变。不是只靠配置字符串做绿灯。

B1 SQL/契约旧测试的handler helper用合成proof隔离数据层，明确不据此声称验证新隔离边界；新environment-postgres.test.cjs使用真实身份函数和实际PG角色。原生SQL/锁等待测试仍真实执行。无生产资源参与。

## 云端阻断与安全集成

OFFICIAL_RESEARCH.md核实了Netlify变量默认跨context/scope、shared/分支覆盖、构建CONTEXT与Functions运行时的区别；netlify.toml不能代替Functions运行时配置。没有执行会读取值的env:list/get或加载.env。**当前不能证明预览未继承生产变量、旧部署从未获得生产凭据、TEST凭据对真实生产实例没有权限。**

启用云环境前，由授权管理员提供不含值的key/context/scope/shared来源/部署ID/版本元数据，确认生产凭据不在all-context/dev/preview；在真实批准TEST资源上验证独立DB角色与实际身份，证明其在PROD被拒绝（不得把错误端点别名或Neon复制branch当证明）。本轮未获此控制面证据，云写入不启用。

回滚：本机夹具可保留隔离；先撤回新代码，继续关闭不安全旧写，不建议回滚到可越权版本。无生产迁移/数据回退。删除本机B2角色/schema须另行核验只属于专用实例并显式执行；本轮不删除原B1或历史证据。
