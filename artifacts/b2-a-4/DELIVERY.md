# JINXI-B2-A-4 审核交付

基线为 PR #12 的 `483495aefcd75316731efce76372748a0f00c8c7`，独立分支 `codex/jinxi-b2-a-4-security`。开始时重新核对了工作区和 GitHub。PR #1–#12 当时均为草稿且未合并，依赖链和完整 SHA 见 `github-baseline.json`。当前候选的完整 SHA 与 GitHub CI 以新 PR 说明及该提交的实际运行页为准。

| 项 | 交付 | 证据 |
| --- | --- | --- |
| A 独立复核 | 按规范和规格分别核对 PR #12，修补跨范围 SELECT、过期重登后的重复扣款和实验角色权限 | [复核](PR12_REVIEW.md) · `permissions-final.txt` · `nonce-expiry-before.json` / `nonce-expiry-after.json` |
| B 环境隔离 | 四环境数据库与存储矩阵，管理员可交付的无值元数据清单 | [隔离审查](ENVIRONMENT_GATE.md) · `authorized-test-catalog.json` |
| C HTML/CSP | 公告白名单及粘贴清理，旧攻略 HTML 编码，构建生成脚本哈希，局部纸张编辑器样式 | [专项整改](HTML_AND_CSP.md) · `html-before-original-csp.json` · `html-browser-results.json` · `csp-build-proof.json` |
| D 旧功能 | 16 项恢复矩阵，暂停入口状态、可复制草稿、只读感谢名单、本机任务和组队 | [恢复矩阵](RESTORATION_MATRIX.md) · `legacy-reward-before.txt` · `compatibility-browser-results.json` |
| E 真实成员方案 | TEST 结构核验和数据映射清单，正式会话/轮换/限流/成本方案，合成 DDL 约束演练 | [迁移方案](MEMBER_SESSION_PLAN.md) · [SQL 草案](../../database-b2-member-session-draft.sql) · `migration-rehearsal.txt` |

## 修改文件与目的

`netlify/functions/_shared/function-security.js` 对普通 schema 和实际读写权限做完整范围检查。`app/session-lab/page.tsx` 按服务器成员 UUID 保留当前页未确认的兑换编号，并区分错误提示。`tests/support/session-fixtures.cjs` 撤销本机运行角色不需要的删除权限和台账改写权限。

`lib/announcement-html.ts`、`components/cyber-announcement.*` 负责公告白名单、文件和粘贴边界及本机草稿。`services/announcement-service.ts` 移除未使用的旧口令和发布调用。`services/strategy-wall-service.ts` 在旧 Markdown 转换前编码作者原文。`scripts/generate-export-csp.cjs`、`netlify.toml`、`package.json` 和 `package-lock.json` 增加构建后 CSP 及精确依赖。`components/email-service.tsx` 固定原 CDN 别名解析到的版本与 SRI。

`app/page.tsx`、`components/message-wall.tsx`、`components/guides/*`、`components/guild-sponsorship.tsx`、`components/daily-tasks.tsx` 和 `components/team-system.tsx` 明示当前业务状态。`services/daily-task-service.ts` 停止根据本机进度记账。`database-b2-member-session-draft.sql` 是带强制拒绝保护的草案。`.github/workflows/security-checks.yml` 覆盖后续 PR 和集成分支 push，并记录实际测试的 Git HEAD。其余新增文件是测试、复现工具及审核证据。

## 本机回归

- 独立目录 `npm ci`、Node 20.20.2 静态构建和非交互 ESLint 通过。API 14 项、安全单测 10 项、实际合成 PostgreSQL 集成 53 项通过，计数含 Node runner 父项。SQL 草案的六项演练包含在 53 项内，结束后核实三张拟建表均不存在。
- 原始 tsc 仍 exit 2，共 28 项历史诊断，新增 0。独立历史基线比较通过。见 `types/typescript-report.json`。
- 真 Edge 公告与 CSP 7 组、兼容入口 4 组、合成 HTTPS 会话 7 组，以及过期重登兑换复现通过。前后对照中，旧公告混淆协议触发无害标记，新渲染中标记为 0。旧兑换扣两笔，新实现扣一笔。EmailJS 真实 SDK 和 SRI 通过，发信 API 全部由浏览器测试拦截。
- B1 数据与键盘 26 组、独立攻略阅读 13 组、成员/画廊 8 组、原头像框 8 组、原页面入口 17 组、展播/时光 50 组、视频弧线与播放 5 个宽度。保护脚本断言沿用原版本，证据写入本目录 `protected/`。

截图可查看 [旧 CSP 下的合成复现](html-before-original-csp-390.png)、[手机安全公告](html-safe-390.png)、[桌面本机公告编辑](announcement-editor-1440.png)、[清理器不可用时的状态](sanitizer-unavailable-390.png) 和 [本机任务暂停](legacy-upgrade-390.png)。测试路径、按钮定位和角色范围错误与实际产品失败分别留档。历史 B1/B2-0 证据目录在本轮保持原 Git 字节。

## 本机性能对照

同一隔离合成库，PR #12 冻结构建与 A-4 各测三次桌面、三次限速手机，交替顺序、每次新浏览器上下文。桌面 1440px。手机 390px、CPU 6 倍降速、延迟 150ms、下行 200000B/s。12 条样本见 `performance-results.json`。

| 指标 | PR #12 | A-4 |
| --- | ---: | ---: |
| 桌面 LCP 中位 | 204ms | 220ms |
| 慢手机 LCP 中位 | 2948ms | 2888ms |
| CLS 最大 | 0 | 0 |
| 初始 JS 解码字节 / 计算 gzip | 606866 / 183043 | 602562 / 182585 |
| 初始 CSS 解码字节 / 计算 gzip | 142073 / 28310 | 143220 / 28399 |

初始视频请求、攻略或会话请求、完整阅读器、会话和清理器代码均为零。打开公告后才请求清理器。CSS 计算 gzip 增 89B，JS 减 458B。手机样本仍高于 2.5 秒目标。数据来自本机浏览器，线上 LCP 和实际 Netlify 传输量待托管环境验证。

## 复现边界和回滚

`prepare-build.cjs` 复制审阅源码到独立构建目录，`build-source-manifest.json` 绑定输入。`preview.cjs --pr12` 使用冻结的 PR #12 静态构建及该提交原 CSP。`preview.cjs` 使用 A-4 导出与生成策略。公开读取走同一授权合成 PG，合成会话使用本机自签 HTTPS。PG 集成、B1 空表演练和会话浏览器脚本会重置专用夹具，应串行执行。仅凭证文件保留在系统 TEMP，测试报告没有保存令牌、真实成员资料或密码。

若公告渲染需要回退，可用 React 纯文本保留内容。回退 CSP 时整组恢复匹配的构建 HTML 与头部。会话实验可停用路由和 Function。旧写入阻断以及只读角色保持生效。SQL 草案的本机演练已经回滚，生产数据没有迁移。

## 下一检查点

正式接入继续受云资源继承与有效 ACL、真实成员 TEST 结构及备份、托管 CSP 实际响应和受支持运行时的约束。真实成员会话与业务写入的恢复按矩阵独立验收。旧公告发布恢复时须在服务器端验证权限、体积和 HTML，前端清理与 CSP 仍保留。

抽屉和在线隐私沿用 [B2-C+ 规格](../b2-0/B2C_PLUS_PLAN.md)，候选先做明确标注的合成抽屉，等待独立检查点。首页在线仍显示 `—`。类型治理按原五类逐批修复。运行时候选在另一个分支评估受支持的 Next 15/16 与 Node 24 LTS，版本依据和 Netlify 兼容验收要求见 [官方资料](OFFICIAL_RESEARCH.md)。
