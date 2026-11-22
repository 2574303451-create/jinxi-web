请接管 JINXI-WEB 后续工作，按 Matt Pocock 技能采用有明确目标、完成条件和证据的执行方式。

先切换到实际当前工作树
E:/Recovery/.jinxi-research/phase4-legacy-access/worktree

先读 NEXT_SESSION_HANDOFF.md 全文，再读 AGENTS.md，以及 COLLABORATION.md、WEB_EXPLORATION.md 的工作约定。CODEX_HANDOFF.md 下方的大量内容是历史快照，按需查阅。若聊天项目目录是 E:/Recovery 或 E:/Recovery/jinxi-web，以实际当前工作树为准。

接手基线分支为 codex/jinxi-phase4-business-commit-confirmation，原 HEAD 为 3259472ecfb288037bb5be30d0d5ea5e0be5032e；最近已验收远程父基准为 0de81cdcec61991a0d9292b8e1e0525f06d69c0e。后续收尾版本以实际 Git、NEXT_SESSION_HANDOFF.md 的版本索引及 ../business-commit-remote/final-evidence.json 为准。先核对这些证据，不丢弃任何现有改动，不沿用原先“未推送”的旧快照。

使用 zoom-out 理解交接中的模块地图，按 to-issues 的纵向切片方法执行已有顺序。遇到实际失败时再使用 diagnose/tdd，最终候选使用 review 的 Standards/Spec 增量审查。只读所需技能，避免先扩建工具配置或创建 Issues。

若版本索引中的 A 尚未完成，唯一实施目标仍是收尾这次业务提交确认候选：检查最后夹具调整，完成必要审查和受影响验证，形成干净的最终提交。在既有独立审核分支推送授权及自动部署门禁满足时，推送同名审核分支并等待同一 SHA 的实际 CI。原有通过的测试按影响范围复用，一组相关改动集中验证和汇报。若 A 已由匹配 SHA 的完整记录证实完成，直接进入 B 的授权准备，不重复重跑已完成任务。

A 完成后，下一关键目标是 B 项的真实 Gate-only 门禁验收。候选 SHA、站点、执行说明和验收条件均在交接中。旧两次发布许可已使用完，当前修复版仍需用户单独批准一次受控发布。准备具体申请后停在该授权边界，不执行发布。不要另起重复的本地证明研究。

继续原五阶段计划。生产、旧 TEST、main、原 18 个 PR 和真实数据受保护，数据库初始化、角色启用、迁移及付费均须对应授权。历史不按昵称认领。兑换维持下单扣分、管理员人工核验开通、无法履约一次性退款。

首条反馈最多十行，说明实际分支/SHA、未提交项、下一目标和真实阻断，然后跟进尚未完成的既定目标。只有新证据表明需要调整时才修改计划。不要自动创建持续目标或无边界的审计循环。
