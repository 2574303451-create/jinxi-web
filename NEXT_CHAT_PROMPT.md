请接管 JINXI-WEB 后续工作，按 Matt Pocock 技能采用有明确目标、完成条件和证据的执行方式。

最新接续入口（优先于下方历史快照）：

- 工作树为 `E:/Recovery/.jinxi-research/phase4-legacy-access/cloud-strict-readiness-worktree`，分支为 `codex/jinxi-phase4-strict-cloud-readiness`。可执行源码基线为 `a230bfd1166a3623e988c35c7e0c771131a21a9e`，本轮仅更新文档，文档提交 SHA 用实际 Git 核对。先读 NEXT_SESSION_HANDOFF.md 顶部最新入口及 synthetic-cloud/STRICT_PLATFORM_FINDINGS.md，再按 AGENTS.md 读取协作约定。
- A 的 `dbd6a3b24482872aaa1800b1e67236410062f1ae` 已验收；B 核心真实 Gate-only 的 `bf1af47e576465bb230f56971cb45d2d89fe5261` 已验收且站点已关闭。过去发布批准均已使用，不重复运行 A 或重新发布 Gate。
- C0 与 C1 已完成；C1 最终源码为 `a230bfd1166a3623e988c35c7e0c771131a21a9e`，同 SHA CI `45041814869` 成功。六项默认表授权兼容已通过真实 PostgreSQL 17 回归；无需重复运行已完成检查。
- C2 原生只读验证已完成。用户委托处理凭据后，既有专用项目口令仅在本机进程内存临时使用，未输出、保存或重置。真实 Node `pg` 连接通过 TLS 1.3、CA、主机名与数据库身份校验，但后端 `pg_stat_ssl.ssl=false`。不要再询问私有凭据文件或重复获取口令。证据为 `../business-commit-remote/C2-evidence.json`、`C2-native-result.json`。
- 用户选择继续保持严格隔离。C3 补充核对当前身份、官方文档、公开实现及只读 API：维护库 PUBLIC CONNECT、后端 TLS false、安全日志参数 -1 仍阻断；更严格的临时 `SET LOCAL` 实测返回 42501。当前没有已证实的受支持修复路径，不等同于证明 Neon 全平台不可能。详见研究文件与本地 `C3-evidence.json`、`C3-api-readonly.json`。
- 下一步只在提供方给出可复核的三项受支持能力后，准备精确变更申请；证据清单及未发送问询稿已经备好。未经明确指令不发送外部消息，不升级付费、不创建替代资源、不初始化或启用角色、不部署。若需更换提供方，先确认目标和预算，再设计新资源身份合同；当前代码只接受 Neon 绑定，不能伪造为 Neon 或直接替换主机名。缺少新证据时停止云端初始化，不继续重复本地证明。
- 保护范围、业务规则及技能使用约定继续适用。下方的旧工作树、A 未推送、B 待申请等描述仅保留作历史快照，不据此回退当前进度。

---

历史快照：

先切换到实际当前工作树
E:/Recovery/.jinxi-research/phase4-legacy-access/worktree

先读 NEXT_SESSION_HANDOFF.md 全文，再读 AGENTS.md，以及 COLLABORATION.md、WEB_EXPLORATION.md 的工作约定。CODEX_HANDOFF.md 下方的大量内容是历史快照，按需查阅。若聊天项目目录是 E:/Recovery 或 E:/Recovery/jinxi-web，以实际当前工作树为准。

接手基线分支为 codex/jinxi-phase4-business-commit-confirmation，原 HEAD 为 3259472ecfb288037bb5be30d0d5ea5e0be5032e；最近已验收远程父基准为 0de81cdcec61991a0d9292b8e1e0525f06d69c0e。后续收尾版本以实际 Git、NEXT_SESSION_HANDOFF.md 的版本索引及 ../business-commit-remote/final-evidence.json 为准。先核对这些证据，不丢弃任何现有改动，不沿用原先“未推送”的旧快照。

使用 zoom-out 理解交接中的模块地图，按 to-issues 的纵向切片方法执行已有顺序。遇到实际失败时再使用 diagnose/tdd，最终候选使用 review 的 Standards/Spec 增量审查。只读所需技能，避免先扩建工具配置或创建 Issues。

若版本索引中的 A 尚未完成，唯一实施目标仍是收尾这次业务提交确认候选：检查最后夹具调整，完成必要审查和受影响验证，形成干净的最终提交。在既有独立审核分支推送授权及自动部署门禁满足时，推送同名审核分支并等待同一 SHA 的实际 CI。原有通过的测试按影响范围复用，一组相关改动集中验证和汇报。若 A 已由匹配 SHA 的完整记录证实完成，直接进入 B 的授权准备，不重复重跑已完成任务。

A 完成后，下一关键目标是 B 项的真实 Gate-only 门禁验收。候选 SHA、站点、执行说明和验收条件均在交接中。旧两次发布许可已使用完，当前修复版仍需用户单独批准一次受控发布。准备具体申请后停在该授权边界，不执行发布。不要另起重复的本地证明研究。

继续原五阶段计划。生产、旧 TEST、main、原 18 个 PR 和真实数据受保护，数据库初始化、角色启用、迁移及付费均须对应授权。历史不按昵称认领。兑换维持下单扣分、管理员人工核验开通、无法履约一次性退款。

首条反馈最多十行，说明实际分支/SHA、未提交项、下一目标和真实阻断，然后跟进尚未完成的既定目标。只有新证据表明需要调整时才修改计划。不要自动创建持续目标或无边界的审计循环。
