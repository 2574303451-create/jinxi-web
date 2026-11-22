# JINXI-WEB 新会话交接
更新于 2026-11-23，北京时间。本文是当前工作入口，旧验收报告按需查阅。

## 最新接续入口（优先于下方历史交接）

- A 已完成：`codex/jinxi-phase4-business-commit-confirmation` / `dbd6a3b24482872aaa1800b1e67236410062f1ae`，匹配 SHA 的 CI `45013237598` 成功。
- B 核心真实 Gate-only 验收已完成：候选 `bf1af47e576465bb230f56971cb45d2d89fe5261`，部署 `6b02e559458dbdc47e106825`；43 项成功探测后站点已关闭。诊断与修复的单次发布授权均已使用。自然到期、损坏/缺失秘密变量及平台 Edge 崩溃未做真实故障注入。
- C0 已完成：`codex/jinxi-phase4-synthetic-cloud-readiness` / `072f492b672c9ebd36b1f6d0c822fb9ab62b3276`，匹配 SHA 的 CI `45038923825` 成功。原工作树 `E:/Recovery/.jinxi-research/phase4-legacy-access/cloud-readiness-worktree` 保留。完整业务 HTTP 元数据兼容已修复，实际请求、构建和运行时 URL 仍严格为 HTTPS，见 [CLOUD_READINESS.md](synthetic-cloud/CLOUD_READINESS.md)。
- C1 已完成：`codex/jinxi-phase4-synthetic-cloud-bootstrap` / `a230bfd1166a3623e988c35c7e0c771131a21a9e`，同 SHA CI `45041814869` 成功。原工作树 `E:/Recovery/.jinxi-research/phase4-legacy-access/cloud-bootstrap-worktree` 保留。默认六项表授权兼容、PostgreSQL 17 生命周期 17/17、HTTPS 18/18、Firefox 26 场景及五宽度、类型/lint/语法/构建/导出已通过，Standards / Spec 均无未解决项。
- C2 原生只读核验已完成，凭据接入问题已解决。用户委托处理后，既有专用项目口令仅在本机进程内存使用，未打印、落盘、重置或新建 API key。实际 Node `pg` 连接 TLS 1.3、CA、目标主机名及数据库身份均通过；临时服务已停止。详见本地 `C2-evidence.json`、`C2-native-result.json`；不再要求用户准备凭据文件，也不重复获取口令。
- 当前 C3 工作树为 `E:/Recovery/.jinxi-research/phase4-legacy-access/cloud-strict-readiness-worktree`，分支 `codex/jinxi-phase4-strict-cloud-readiness`。可执行源码仍是上述 C1 SHA；C3 只更新文档，实际文档提交 SHA 用 `git rev-parse HEAD` 及本地 `C3-evidence.json` 核对。完整索引为 `../business-commit-remote/final-evidence.json`。
- 用户选择保持严格隔离。当前实测：后端 `pg_stat_ssl.ssl=false`、服务端 `ssl=off`；维护库 `postgres`、`template1` 的 PUBLIC CONNECT 为 true，owner 是 `cloud_admin`，当前主体无撤权所需权限；`log_parameter_max_length=-1` 且更严格的临时 `SET LOCAL ...=0` 返回 42501。日志安全子集通过不等于满足口令配置门禁。API 维护库 GET 404、公开 hook 及泛型 pg_settings 均未提供已证实的修复路径；不据此断言平台级不可能。
- [STRICT_PLATFORM_FINDINGS.md](synthetic-cloud/STRICT_PLATFORM_FINDINGS.md) 已列明官方来源、继续所需证据、未发送的提供方问询稿与停止条件。C3 的只读 API/目录结果及失败的事务内日志尝试保存在本地 `C3-api-readonly.json`。这些调用没有持久配置、对象、权限或业务数据写入；MCP 只读事务不冒称逐项显式 ROLLBACK。
- 下一步需提供方明确证明维护库严格 CONNECT 隔离、后端 TLS true、安全日志 0 均有受支持实施路径，再准备包含目标、SQL/API、回退及验收的具体变更申请。当前不初始化、不设置角色口令、不启用角色、不部署。问询尚未发送，外部发送需用户明确指令；不自动升级付费。若改用其他提供方，先确认资源/预算并设计新的身份绑定，不复用或伪造 Neon 标识。没有新证据时停止本轮云端执行，避免无边界重复审计。
- 默认批准文件仍关闭；没有创建资源、修改云端权限或发布业务部署。生产、旧 TEST、真实数据及原有工作树保持原保护范围；C0/C1 未受影响的检查按范围复用，不能将其 CI 记为新文档 SHA 的 CI。
- 保留原业务与 Gate 工作树及保护范围，复用未受影响的既有证据。下方旧基线、A 未推送、B 待批准等文字属于历史交接，不再代表当前状态。

---

## 1. 本轮接手目标与工作方式

用户已终止原持续目标，要求先整理有目标、节省 token 的计划，再由新会话接手。当前正在交接，未开启新的持续目标。
沿用原五阶段计划，项目处于第四阶段。第三阶段五组业务已完成本地合成实现与审核，第四阶段已完成统一网站、本地端到端、安全适配与历史合成预演。真实云端业务、历史迁移和正式上线尚未完成。

下一会话先收尾当前本地候选，形成一个经过审查和 CI 的明确版本。后续关键路径依次为真实 Gate-only 门禁验收、独立合成业务云端闭环、第四阶段整体验收和第五阶段上线决定。
用户最近明确要求减少零散循环。每个任务先写目标、完成条件和必要证据，只围绕能影响该目标的真实问题修改，集中复测一次最终候选。已经通过且未受影响的工作复用既有证据。

## 2. 唯一当前工作树与版本

以下分支与 SHA 是本轮接手基线；收尾版本和检查终态使用下方“本轮收尾版本索引”，不要把接手时的未推送状态当作最新结果。

- 工作树 `E:/Recovery/.jinxi-research/phase4-legacy-access/worktree`
- origin `https://github.com/2574303451-create/jinxi-web.git`
- 当前分支 `codex/jinxi-phase4-business-commit-confirmation`
- 当前本地 HEAD `3259472ecfb288037bb5be30d0d5ea5e0be5032e`
- 本轮交接开始时，业务测试已有一处未提交改动，见下一节。本轮另新增交接文件并更新 CODEX_HANDOFF 顶部导航，交接文件未提交。
- GitHub 于 2026-11-22 18:24 北京时间查询当前同名分支返回 404，该 SHA 的 Push 工作流为 0。当前分支尚未推送，不能引用其他 SHA 的 CI 为其背书。
- 最近已推送并验收的父基准是 `0de81cdcec61991a0d9292b8e1e0525f06d69c0e`，分支 `codex/jinxi-phase4-points-commit-outcome`。
- 正确继承链为 `c1dff215… → 134b572f… → … → 05965f57… → 0de81cdc… → 15147379… → 3259472e…`。本轮用 merge-base 确认前四个具名基准均为当前 HEAD 的祖先。
- `E:/Recovery/jinxi-web` 是同一仓库的旧工作树，停留在 `codex/jinxi-b2-a-5-test-prep`。不要在那里接续当前开发。旧交接核验目录及历史工作树也不能作为当前源码依据。

### 本轮收尾版本索引

- 目标仍是 A：保留夹具顺序修正，核验回滚不报成功，以单一审核候选收尾；没有新增业务或真实数据影响。
- 当前候选版本为包含本节的提交。交接时用 `git rev-parse HEAD` 获取完整 SHA，并与实际 Push CI 的 `head_sha` 对照。
- 本轮 Standards 与 Spec 增量审查均为 0 项未解决发现；审查覆盖 `0de81cd…` 后的四模块修复及夹具顺序修正。请求准备在补丁安装前，安装后的请求执行由 `finally` 恢复原始查询方法。
- 本轮脱敏执行记录位于 `../business-commit-remote/final-evidence.json`，其中记录实际候选 SHA、本地检查退出码、远程 CI 终态及证据文件。它是本地运行记录，不随源码上传。只有记录与当前 SHA 匹配且 A 的全部条件通过时，才视为 A 完成；缺失或未完成项仍需跟进。
- A 完成后只准备 B 的具体单次授权申请。Gate-only 发布候选仍是 `134b572f69a27b155dfeaab514457047f7f41297`，不能把业务候选或 CI 通过当成发布批准。

## 3. 精确接续点

当前分支相对 `0de81cd…` 只有五个文件的已提交改动。

| 文件 | 改动 |
| --- | --- |
| member-local/identity.cjs | 限流事务和身份事务必须收到 PostgreSQL COMMIT 标签，才继续或返回成功 |
| community-local/handler.cjs | 最终业务事务提交确认 |
| attendance-local/handler.cjs | 最终签到事务提交确认 |
| operations-local/handler.cjs | 最终私有业务事务提交确认 |
| tests/synthetic-cloud-https.test.cjs | 注入数据库真实回滚，核对 503、无 Cookie、无业务写入、本人回执 unresolved |

两个本地提交是 `15147379af480c9f4c46033055d4dd5736ade095` 的失败复现测试，以及 `3259472ecfb288037bb5be30d0d5ea5e0be5032e` 的修复。
接手时唯一既有未提交代码差异在测试文件，把 requestId、URL、headers 的初始化移动到 Client.prototype.query 补丁安装之前，避免准备请求时异常导致补丁未恢复。四增四删，没有业务逻辑变动。本轮保留该差异，收尾结果见上方版本索引。

接手前 Standards 和 Spec 对上述已提交修复均无功能阻断。Standards 建议了这一夹具顺序调整；接手时调整后尚未重跑，本轮实际执行结果见上方版本索引。
公开运营只读分支以及各处理器的只读验真事务仍沿用原实现，本次成功声明限于身份、限流及业务写事务。只有发现影响当前目标的实际缺陷时才扩大修复范围。

## 4. 证据与可信边界

以下本机路径均相对当前工作树；相邻目录中的文件是本地证据，不在 Git 内。不要批量提交这些目录，里面可能有私有执行材料。

| 范围 | 证据与结论 |
| --- | --- |
| 当前修复失败复现 | `../business-commit-remote/https-before.txt`，实际 ROLLBACK 后旧实现返回 200，断言期望 503 |
| 当前已提交修复 | `../business-commit-remote/https-after.txt`，18/18，退出 0，对应干净 HEAD 3259472e，早于未提交的顺序调整 |
| 新注入场景性质 | 从源码 createEntry 在进程内调用 Fetch，连接真实本机 TLS PostgreSQL；同一套其余场景使用打包函数及本地 HTTPS。没有真实 Netlify Runtime/CDN 证据 |
| 父基准 0de81cd | [Push CI 44985971325](https://github.com/2574303451-create/jinxi-web/actions/runs/44985971325)，24 步 success，含 PostgreSQL 17、打包 HTTPS、Firefox 26 场景及 1440/1024/768/390/320 五宽度 |
| 父基准 CI 终态 | `../points-commit-remote/github-run-jobs.json` 和 `ci-log-proof.json`。该目录 github-run-latest.json 保留较早 in_progress 快照，判断终态用实际 jobs/check-runs，不能只读旧快照 |
| 合成库管理工具 | 已继承 05965f57，初始化/激活/seed/空库回滚批准到期、提交回执与响应丢失核验已有真实 PG 回归，[CI 44985152308](https://github.com/2574303451-create/jinxi-web/actions/runs/44985152308) |
| Gate-only 候选 | 独立分支 `codex/jinxi-phase4-gate-upload-manifest`，完整 SHA `134b572f69a27b155dfeaab514457047f7f41297`，[CI 44432015892](https://github.com/2574303451-create/jinxi-web/actions/runs/44432015892) |
| UI 两项 | FAQ 的 9fc6da8、公会动态的 9ad865c 已在继承链，带 tests/faq-browser.cjs、tests/announcement-browser.cjs。UI_AUDIT 含历史待办和后续补记，需按时间读；本地已有验收，未来云端统一复核，不从头重做 |

## 5. 接手后按顺序完成

### A. 收尾当前业务候选，可本地推进

1. 读 AGENTS.md、COLLABORATION.md、WEB_EXPLORATION.md 的工作约定。后两者包含旧技术快照，当前状态以本文、Git 和相应报告为准。
2. 核对实际 HEAD 与差异。阅读五个改动文件及相关提交，无需重审第三阶段和原 18 个 PR。
3. 针对未提交的夹具顺序调整检查恢复路径，并完成必要增量审查。只对新发现的实际缺陷作最小修复。
4. 形成干净的最终本地提交后运行受影响的 HTTPS 套件、类型和 lint。构建门禁要求干净源码；不要删除门禁来运行脏工作树。已有历史测试按影响范围复用。
5. 在已有独立审核分支推送授权和发布门禁仍满足时，推送当前同名审核分支，等待实际 CI 终态并核对 SHA。只保留一个最终候选，结果写回本文版本区。

完成条件是最终 SHA 明确、工作树干净、18 项相关套件和工程检查通过、两路审查无未解决问题、同 SHA 的实际 CI 通过。现有工作流已覆盖真实本机 PostgreSQL/HTTPS/Firefox，不能再把这些一概写成远程未覆盖。

### B. 真实 Gate-only 验收，需用户单次发布授权

唯一现场目标为 XUST 的 `jinxi-synthetic-gate-test`，Site ID `e8033919-6f54-4a27-b09d-26c14d8831ce`，Team ID `689e1405e8627000726e883c`，主域名 `https://jinxi-synthetic-gate-test.netlify.app`。
2026-11-22 12:05 北京时间的只读证据 `../admin-commit-remote/gate-control-current.json` 确认站点 Disabled、未关联 Git，仅有历史部署 `6afe4688aa63d39d85b1938b`。这是历史快照，发布前再核对当时状态和共享额度。
两次旧授权均用于旧 SHA 4e9c1a3，已执行完毕。当前 134b572f 修复版未获得新的单次发布授权，不能挪用旧许可。
按 `synthetic-cloud/gate-only/MANUAL-PILOT.md` 使用固定 CLI 23.15.1、隔离 staging、一个 Edge、零业务 Node Functions、零公开业务文件。All scopes 仅站点专用高熵口令摘要的已说明例外，需批准，不扩展到业务凭据。
完成条件是现场匿名/错误口令 401、正确口令 200 固定内容、业务 API 无业务内容、默认 Functions/Rewrite/部署别名/CDN 无绕过，真实部署身份与平台记录匹配，测试后站点 Disabled。未观察的故障模式明确保留待验。
CLI 严格预上传字节级证明路线已结案，不重开。实际权限、配额或登录不可用时集中报告真实阻断，不用重复本地证明代替现场验收。

### C. 后续第四阶段顺序

门禁通过且另行批准资源、初始化和角色启用后，跑通独立合成云端完整闭环，再验收其他业务和统一 UI。
第一条闭环为登录 → 签到 → 唯一积分结算 → 兑换扣分 → 管理员人工处理，并另验无法履约的一次性退款。
真实历史数据只读范围、可信身份映射、余额/流水/规则/订单对账和迁移分别审批。线上业务达到验收条件后才进行第五阶段上线决定。
以上是当前收敛计划，未创建新阶段、GitHub Issue 或 PR。不要从允许本地准备推定云端启用许可。

## 6. 模块导航

| 入口或能力 | 主要代码与可信服务端 |
| --- | --- |
| 统一网站与会话 | app/page.tsx、app/guides、integration-local/site/client；member-local 的稳定 UUID、服务端 Cookie 会话 |
| 留言与攻略 | community-local；原网站组件通过统一适配器调用，历史无可信作者不认领 |
| 签到与积分兑换 | attendance-local → attendance.recorded.v1 → points-local；同一事实、原账本、事务回执 |
| 公告、赞助和组队 | operations-local；服务端角色控制，管理员与独立审核员职责分开 |
| 未来合成部署 | synthetic-cloud/entry.cjs、service-adapter/cloud.cjs、synthetic-cloud/database；数据库独立最小角色 |
| 未确认结果恢复 | integration-local/RECOVERY.md、recovery-panel.tsx、service-adapter/receipts.cjs；原 requestId、本人授权查询 |
| 历史只读兼容 | history-compat/README.md；完全合成预演，无可信映射的资料留待人工核实 |
| Gate-only | synthetic-cloud/gate-only；独立访客门禁试点，无 Neon、成员或积分业务 |

## 7. 工具与最小验证

Windows PowerShell 在当前工作树运行，先核查这些路径仍可用。

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase4-legacy-access/worktree'
$nodeRoot = 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64'
$nodeExe = Join-Path $nodeRoot 'node.exe'
$env:Path = "$nodeRoot;$env:Path"
$pgBin = 'E:/Recovery/.jinxi-research/identity-review-tools/postgresql-17.11/pgsql/bin'
$sslExe = 'D:/Program Files/Git/usr/bin/openssl.exe'
& $nodeExe tests/synthetic-cloud-https.test.cjs --pg-bin $pgBin --openssl $sslExe
& "$nodeRoot/npm.cmd" run typecheck
& "$nodeRoot/npm.cmd" run lint
```

按需运行 `node scripts/run-clean.cjs run build` 和 `node --test tests/integration-local-export.test.cjs`。
PG/HTTPS/浏览器预演和正式构建顺序执行，避免抢占固定端口及生成目录。本地浏览器入口 https://127.0.0.1:3069/ 仅启动服务后存在，启动方法见 integration-local/README.md，替换其旧工作树路径。
Netlify Git、OpenSSL、PostgreSQL、Node 版本和证书验证按实际工具核对。Git TLS 曾间歇失败，有过保持证书验证的有限重试恢复记录，不能关闭校验。
真实凭据、原始口令、完整 DSN、私钥、成员资料和 Authorization 头均不得进入对话、Git 或公开证据。只报告脱敏结果。

## 8. 权限与技能使用

允许既定范围内本地修复、必要测试、提交，以及满足发布安全门禁的独立审核分支推送。用户这次仅请求交接，本轮未继续这些实施动作。
生产 Neon、pr17-validation、旧 TEST 角色/数据/变量、main、原 18 个 PR、旧不安全写入口继续受保护。真实发布、数据库操作、付费/升级、不可逆清理需明确批准。
原污染分支 codex/jinxi-phase4-synthetic-cloud-local 和本地隔离材料继续保留，禁止推送、批量上传或自动删除。整个共享仓库不能宣称历史敏感资料零命中。
积分规则已确认，下单立即扣分并创建待处理订单，会员通过 QQ 等方式联系管理员，管理员核验后人工开通并确认，无法履约按规则一次性退款。正式奖励规则和历史余额仍待核对。
商品封面后续采用《弹弹堂》经典 Q 版奇幻方向，设计规范见 DESIGN.md；该方向不构成本轮新增视觉任务。真实在线人数、战绩奖励、支付、媒体上传继续待验。

Matt Pocock 技能按任务使用，先读对应 SKILL.md。
- zoom-out 用于这份模块地图，只在上下文出现缺口时进一步读源码。
- to-issues 的纵向切片方法用于上述 A/B/C 顺序，每步有独立可验证结果。用户尚未要求创建 GitHub Issues。
- diagnose 用于已有失败日志，tdd 用于必要的失败复现，review 用于一个最终候选的 Standards/Spec 增量审查。
- docs/agents/ 配置目前不存在，AGENTS.md 沿用原文件。本轮未安装或配置完整技能体系，不把工具配置扩充当成新的项目工作包。

新会话首条反馈控制在十行内，说明实际分支/SHA、未提交项、当前目标和阻断。随后只推进 A；遇到 B 的真实授权边界一次性提出具体申请。每个完整验收目标集中汇报一次。
