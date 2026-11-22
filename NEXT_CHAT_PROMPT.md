请接管 JINXI-WEB 后续工作，按 Matt Pocock 技能采用有明确目标、完成条件和证据的执行方式。

最新接续入口（优先于下方历史快照）：

- 工作树为 `E:/Recovery/.jinxi-research/phase4-legacy-access/cloud-bootstrap-worktree`，分支为 `codex/jinxi-phase4-synthetic-cloud-bootstrap`。先读 NEXT_SESSION_HANDOFF.md 顶部最新入口及 synthetic-cloud/BOOTSTRAP_PREFLIGHT.md，再按 AGENTS.md 读取协作约定并核对实际 Git。
- A 的 `dbd6a3b24482872aaa1800b1e67236410062f1ae` 已验收；B 核心真实 Gate-only 的 `bf1af47e576465bb230f56971cb45d2d89fe5261` 已验收且站点已关闭。过去发布批准均已使用，不重复运行 A 或重新发布 Gate。
- C0 的 `072f492b672c9ebd36b1f6d0c822fb9ab62b3276` 已完成，CI `45038923825` 成功。当前 C1 对 JXhead 既有专用合成项目做了只读目录核验，并修复本地六项默认表授权模板兼容。用 `../business-commit-remote/C1-evidence.json` 及 `final-evidence.json` 核对候选、检查、审查及同 SHA CI；只补未完成条件，不重跑 C0。
- 用户确认目前没有本地私有管理凭据文件，原生直连 TLS/身份检查保留待接入。SQL Editor 的 `ssl=false` 不可充当 Node TLS 通过证据；现场日志参数也尚不符合角色密码配置门禁。不得提取控制台口令、收集聊天密码或放宽门禁。后续先完成专用项目的私有原生只读验证，再准备数据库命名、初始化和新站的具体申请。未授权云端写入、角色启用、业务秘密变量配置或发布；Gate 例外不等同于业务凭据例外。
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
