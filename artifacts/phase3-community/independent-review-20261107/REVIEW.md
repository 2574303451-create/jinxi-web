# 检查点2独立代码安全验收

2026-11-07。结论：发现5个实际问题，已作最小修复并复测；本机合成业务代码安全验收通过。仅保存新的本地提交，不推送、不部署、不迁移，不进入签到/积分。原生产与TEST没有本轮操作。

## 版本与受审范围

- 当前终端入口E:/Recovery本身不是本轮仓库；实际根目录E:/Recovery/.jinxi-research/phase3-community/worktree。
- origin：`https://github.com/2574303451-create/jinxi-web.git`；分支：`codex/jinxi-phase3-community-local`；开始时工作区干净。
- 用户提供的c769400候选字面SHA有误，实际受审完整SHA为`c769400cf09c95b0085e2e9f93f0b00d2b3767bc`，直接父提交为`35ae9a676813249ae2beff9845251eb57a72855c`。
- 完整直接继承链：F03/F05受验收源码`13de96d7531dde3222fdf513e711447a1df3e425` → 交接`d43ee24cfde1277eedabc8c8856de697b702dc0f` → 身份初始实现`03f20a11cd1ec57ff779a10988fb7039cbf0ba05` → 身份修复`6f71de9eec8093e3d139b3201fe4249c6b0e52ff` → 身份审核`35ae9a676813249ae2beff9845251eb57a72855c` → 业务候选c769400 → 本次修复提交。最后一个完整SHA以本文件所属提交和最终答复为准。
- 固定审查命令：`git diff 35ae9a676813249ae2beff9845251eb57a72855c...HEAD`。独立读取全部本轮代码、数据库定义、前后端契约及关键断言；另外比较c769400之后最小修复。未重做前两阶段或原身份模块审计。
- 受审来源、受保护路径零差异、测试完整性和源码指纹见[verification.json](verification.json)。

## 实际发现及最小修复

| 编号/等级 | 在c769400的真实触发 | 修改及验证 |
| --- | --- | --- |
| R1 / P1 | A载入并保存私有攻略，editing引用已清空而正文仍在；另一窗口登录B后再次提交，旧正文先被捕获，身份重验虽清编辑器，仍把旧body作为B的新内容POST | demo.js在开始操作时绑定成员UUID，身份重验后同时检查代次及成员；不匹配时不发业务POST。真实脚本VM及真实HTTPS浏览器验证零POST、B本人内容无A正文 |
| R2 / P1 | 身份重验网络失败仅清列表，A的私有编辑文字和“已核验”身份仍保留；自行输入的成员草稿换号后也保留 | 核验期间隐藏编辑器；身份失败、退出或成员变化清全部可见编辑字段，不仅依赖editorFromServer。相同已核验成员的POST响应丢失仍保留草稿和原requestId |
| R3 / P1 | 未接入原身份页BroadcastChannel/online通知，busy时还忽略刷新；另一页退出/改密/切号后，A延迟的私有响应仍可显示 | 复用原jinxi-member-local-refresh广播，监听online/focus；busy期间也失效旧读取。提交前旧身份响应废弃，提交后旧写响应不能清B新草稿。VM和真实浏览器验证改密广播、延迟回包、B登录与退出 |
| R4 / P2 | PostgreSQL将大小写UUID视为同一内容，但逻辑锁按原字符串取hash；大写互动和小写撤下没有互锁 | store.cjs仅两处锁参数统一小写。真实PG通过固定大小写UUID、实际锁点阻塞与释放复现；RED证实撤下提前完成，修复后必须等待且两次操作均成功 |
| R5 / P2 | 身份核验先成功，业务事务等待账号锁时会话到期；now()仍取事务开始时间，过期写入返回200 | handler.cjs会话再次核验改用clock_timestamp()。真实PG在已开始事务、等待账号锁时设定到期并等待实际过期，原断言200≠401；修复后401且无请求回执 |

未修改身份模块、schema、授权范围、审核业务规则或主站UI。R1–R3为新业务页状态修复；R4–R5仅改变两个锁参数和会话时钟表达式。历史代码和原失败证据均保留，新建本地提交，不amend或reset历史。

## 关键断言复核

- 权限：同昵称不同UUID不能编辑/删除他人内容；私有内容对非本人404，普通成员审核和置顶403，审核员不能置顶，管理员角色来自可信UUID表。数据库直接角色也不能自审、改他人正文、授角色或改归属。
- 状态：留言submitted，攻略draft→submitted→published/rejected；公开只读published，修订已公开内容会撤下重审。已归档/删除不能再编辑。新评论/回复及反应只对已公开且有可信归属的内容。
- 历史：NULL归属/legacy对普通成员、审核员、管理员均只读，留言和攻略的回复/点赞/收藏均拒绝；直接角色SQL也拒绝插入历史互动。旧读取投影前后深比较一致，不做昵称认领。
- 幂等与异常：相同成员同requestId重试只产生一项内容，同号不同正文409；相同version并发修改恰好一个200、一个409；审计故障后内容与回执整体回滚，同号再试恰好成功一次；反应使用active设值、唯一键计数为1。
- 内容：HTML/脚本、控制字符和恶意媒体引用被拒；历史恶意HTML只按textContent显示。真实浏览器脚本执行false、注入节点0、CSP违规/pageErrors/外站请求均0。
- 会话：游客、首次改密、锁定、停用、退出、绝对/空闲到期不能写。核验后再退出、锁定、到期，以及真实改密撤销均不能写回执。新增等锁到期、跨号旧form、私有延迟响应和B新草稿断言补足原覆盖缺口。
- 原四个测试文件中三个未改（PG主业务、HTTPS、边界），浏览器文件仅增加断言/场景；未删除原断言、无skip/todo/only，也未放宽权限。新增UI VM 7项纳入默认安全测试；新增真实PG专项3组。

## 实测命令、结果与证据

在上述工作树执行。工具路径和变量定义见[本地复现说明](../../../community-local/README.md)：Node24.22.2/npm11.19.1、PostgreSQL17.11、Playwright1.64.1及本机Edge。CLI均由cleanEnv或scripts/run-clean.cjs清除云端/数据库环境变量后执行；UI VM无网络或数据库。

| 实际命令（省略已定义的工具路径变量） | 结果 | 证据 |
| --- | --- | --- |
| node --test tests/community-local-ui.test.cjs | 原代码新增安全期望5项RED；修复扩展至7/7通过 | [ui-red.log](ui-red.log)、[ui-green.log](ui-green.log) |
| node tests/community-local-review-postgres.test.cjs --pg-bin $pgBin | 新增3组专项，含父测试4/4通过；UUID/到期两项先真实RED；改密撤销原本即通过 | [postgres-red.log](postgres-red.log)、[postgres-fixed.log](postgres-fixed.log) |
| node scripts/run-clean.cjs run test:community-local -- --pg-bin $pgBin | 原12组业务场景，含父测试13/13，0跳过 | [postgres-full.log](postgres-full.log) |
| node scripts/run-clean.cjs run test:community-https -- --pg-bin $pgBin --openssl $openssl | 实际TLS信任本机CA的HTTPS1组多断言通过 | [https.log](https.log) |
| node scripts/run-clean.cjs run test:community-browser -- --pg-bin $pgBin --openssl $openssl --playwright-module $playwright | 真实浏览器原流程、新增切号/广播场景、XSS和五宽度全过 | [browser-first.log](browser-first.log)、[results.json](../browser/2026-11-07T12-08-21-604Z/results.json) |
| node scripts/run-clean.cjs run test:test-environment -- --pg-bin $pgBin | 旧公开读取/只读隔离/权限/回滚46/46 | [readonly-postgres.log](readonly-postgres.log) |
| node scripts/run-clean.cjs test | API14/14、安全93/93（含新增7项UI事件），0跳过 | [api-security-final.log](api-security-final.log) |
| node scripts/run-clean.cjs run typecheck | 原始tsc --noEmit --incremental false，exit0 | [typecheck.log](typecheck.log) |
| node scripts/run-clean.cjs run lint | 首次复制的VM辅助函数误返回Promise executor值；仅补语句块，未改断言；最终exit0、无关闭规则 | [lint.log](lint.log)、[lint-fixed.log](lint-fixed.log) |
| node scripts/run-clean.cjs run build | Next16.4.5静态构建exit0，CSP7页面/8hash，保留Browserslist陈旧提示 | [build.log](build.log) |

真实PG新集群55436、HTTPS3069严格顺序运行，旧只读回归独用新集群55435；没有连接真实Neon。所有服务finally停止。TypeScript检查覆盖原TS工程；新CJS由实际执行、ESLint和专项测试验证，不能把tsc通过夸大为CJS静态类型证明。本轮没有远程CI运行；之前35ae9a6的CI不能代表本轮代码。

## Standards

独立标准轴初查确认3项P1（R1–R3），与需求轴重叠的R1只计一次。最终复核原3项均闭环，限定范围内未发现剩余阻断或修复新增标准违反。复核身份失败清理、跨号快照、广播与延迟回包、旧写响应保护，以及UUID和时钟差异；独立重跑原3项VM复现及新VM/边界测试共13执行节点全通过。PG/浏览器由根代理执行，标准轴只读审阅证据，没有重启服务或更改代码。

## Spec

独立需求轴初查确认R1。最小修复复核认为原P1已闭环，未发现新增阻断。提交绑定原成员、重验后校验代次与身份，阻止A正文以B身份POST；广播和重连事件废弃旧读取，换号或核验失败清理可见草稿。独立重跑真实脚本VM7/7，核对浏览器新增断言及通过结果；UUID/实际时钟修复对应真实PG复现，未扩大身份、权限或schema范围。

双轴最终剩余阻断：Standards0、Spec0。另两项根代理真实PG发现也已修复。结论限于本地合成与此次审查，不作生产安全保证。

## 保护范围、兼容及下一授权

相对35ae9a6，app/components/hooks/lib/services/types/styles/public、member-local、Netlify Functions、test-environment、.github、netlify.toml、package-lock、UI_AUDIT均无内容差异。相对c769400，新增最小修复限新业务页/处理器/存储逻辑、测试、命令及必要文档。未更改原生产Published锁定、Deploy Previews、TEST构建冻结或数据库权限，未开启云端writer LOGIN；未操作main、原18PR或pr17-validation。此处是代码与本轮操作范围核对，不冒称重新取证平台实时设置。

原身份与公开读取兼容。业务仍是新/api/community本地合成实现，未接正式网站或云端TEST；旧Netlify写入口继续关闭。历史内容需要可信UUID映射证明；真实旧JSONB互动迁移、状态扩展兼容、备份恢复、角色授予及云存储仍需另行审核，不运行本地初始化SQL于真实库。未确认请求只在当前页面内存绑定原成员，跨刷新恢复未实现；不向其他成员展示原成员草稿或重放其请求。

建议申请**只推送同名独立审核分支**授权。本次未推送。唯一下一授权为推送该候选用于远程代码审核；获授权后仍须按既定流程核对最新远程/HEAD/差异/敏感信息和自动部署触发规则，不能因此改变平台设置或夹带部署、数据库操作、PR或合并。生产/TEST部署继续保持。完成本地提交与状态核对后停止，不开始检查点3。
