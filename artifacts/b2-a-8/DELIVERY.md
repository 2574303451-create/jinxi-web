# JINXI-B2-A-8 数据保护与视频实验交付

基线为开放草稿 PR #17，完整 HEAD `9f53e1428d29a56f459e9c29ce79e0969ef1294e`。A8 分支为 `codex/jinxi-b2-a-8-data-protection`。实际候选 SHA、CI 与核验状态见独立草稿 PR。 [PR #17 复核](PR17_REVIEW.md)

| 交付 | 实际内容 |
| --- | --- |
| 历史资产 | 核对 18 份追踪 SQL、B1 与更早的 Functions、身份/积分/内容键及存储边界。`jinxi-web` 暂列旧生产保护，旧 Netlify 关联、表、聚合数量仍待核。 [资产清单](HISTORICAL_DATA.md) |
| 旧操作退役 | 审查旧账号导入的覆盖、解锁、重新启用及签到改写风险。为七份历史操作文档加归档标记，冻结配置与旧入口保持原样。 [增量程序规格与不变性测试](INCREMENTAL_MIGRATION.md) |
| TEST 准备 | `jinxi-test` 登记为独立合成项目。保留未知旧项目，补填 F01–F08 和资源、权限、部署证据。 [管理员补表](TEST_RESOURCES.md) |
| 备份和恢复 | 设计 PG17 非池化只读导出、同快照基线、加密独立副本、私有空库恢复、对账、写入切换及回退。三段受保护 PowerShell 模板已做语法检查。 [操作方案](BACKUP_RESTORE.md) |
| 视频模式 | 在 `artifacts/b2-a-8/video-demo/` 验证可选 `playbackMode`、安全平台外链、点击后本站播放、旧附件和统一封面回退。未触及正式 `/guides/` 或首页。 [设计、影响矩阵和复现](VIDEO_DESIGN.md) |

## 验收记录

固定 Node 24.22.2 和 npm 11.19.1 的本机干净安装通过，原始 `tsc` 退出 0，ESLint、静态导出、API 14、安全 13 和视频演示 6 项通过。静态导出包含首页和 `/guides/`，生成 8 个 CSP 哈希，导出目录没有演示。源码差异检查表明 app、Functions、媒体策略、CSS、公开素材、依赖和发布冻结与 PR #17 一致。CI 追加独立 Node 测试，只读工作流继续执行原有临时合成 PostgreSQL 测试。

Edge 140 在 1440、1024、768、390、320px 实测，包含真实 Tab 焦点、Enter 解码、点击前零媒体请求、外链导航拦截、封面失败及视频 404 重试。样本和链接均为合成。外部平台内容与可播放性留待真实上线检查。 [证据](video-demo/evidence/browser.json) · [桌面截图](video-demo/evidence/video-1440.png) · [移动截图](video-demo/evidence/video-390.png)

## 当前阻断与回退

先由 Netlify 管理员确认现有生产 deploy ID、SHA、Functions 和变量归属，Neon 管理员提供资源标识与权限摘要。TEST 资源、只读历史盘点、真实归档和私有恢复分别明确授权。本轮停在源码审计、已提供元数据、操作方案和本机合成演示，未核验真实表行、原站备份可恢复性或实际云端隔离。

A8 可通过保留或撤销独立草稿回退，演示关闭本机进程即可。后续数据操作按备份方案的单写入方切换和对账回退执行。A7 合并链及生产发布仍由既有审批控制。
