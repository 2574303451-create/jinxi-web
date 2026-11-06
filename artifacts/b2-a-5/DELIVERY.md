# B2-A-5 TEST 准备交付

基线为 PR #13 的 `f443144a912abf5869d42f4758c86caaf6031525`。工作区起始干净。安全准备分支从该 SHA 开始，运行时实验另建工作树并以安全准备为 PR base。源代码验证点为 `935209e29a617a9455164d5d2921ab81d7beea60`。本分支原 `package-lock.json` 与 PR #13 一致。最新审核 HEAD 与 CI 链接以 GitHub 草稿 PR 为准。 [依赖链](github-baseline.json) · [PR13 独立复核](PR13_RECHECK.md)

| 改动 | 原因与核验 |
| --- | --- |
| `function-security.js`、PG 负例、证明 fixture | 关闭实验同 schema 所有者视图和 PG17 MAINTAIN 漏检。冻结 PR13 原 53 通过，新增两条负例红，修补后 55 通过 |
| `cyber-announcement.tsx` | 对齐草稿序列化与恢复约束，兼容已存合法内容。Edge 的 525,000 字符负例由恢复 0 改为完整恢复 |
| `app/page.tsx`、`daily-tasks.tsx` | 本机历史缓存不能显示为正式登录。任务显示规则参考、历史和暂停状态。390 和 1440px 实测零写入 |
| Toast、Sidebar、攻略、档案、正则 | 撤下无调用的三份旧 Toast scaffold，保留当前 Toast。Sidebar 复用等价断点 hook，修正攻略布尔与弹窗尺寸契约，明确档案解析回调类型，保持旧 Markdown 跨行匹配 |
| `next.config.mjs`、`package.json`、CI | 移除构建绕过和历史豁免，构建与 CI 直接执行类型检查。原 strict、include 和目标保留 |
| 审核资料与复现脚本 | 冻结基线与候选分开取证，提供管理员只读取证步骤，记录正式功能的分批恢复与回滚 |

## 类型与页面验证

编译诊断按批为 **28 → 12 → 11 → 8 → 2 → 0**。真实 `tsc --noEmit --incremental false`、构建、ESLint、API 14、安全 10、本机合成 PG 55 通过。Toast 的原在用展示由超大粘贴反馈覆盖。旧 Sidebar scaffold 无页面入口，已检查复用 hook 的 768px 契约，实际导航手机回归通过。独立攻略详情、原头像外框、档案数据和跨行 Markdown 分别验证。 [分批原始诊断](typescript-steps.json) · [合成 PG](prep-postgres.txt)

| Edge 证据 | 覆盖 |
| --- | --- |
| [桌面 1440](browser/prep/independent/home-1440.png) · [手机 390](browser/prep/independent/home-390.png) | 原首页、档案 208、在线 —、旧身份回归、任务提示、profile-lab |
| [公告 390](browser/prep/html-browser/html-safe-390.png) · [7 组结果](browser/prep/html-browser/html-browser-results.json) | 1440/768/390/320，HTML、粘贴、图片、CSP 拒绝和错误状态 |
| [头像框](browser/prep/avatar-frames/avatar-frame-results.json) · [兼容](browser/prep/compatibility-browser/compatibility-browser-results.json) | 原框几何/像素、阅读与草稿、登录暂停、组队演示 |
| [静态 CSP](browser/prep/export.json) | 6 份 HTML、20 个实际哈希，6 路径离线解析出唯一策略 |

## 性能

相同 Edge 与本机数据，18 次交替冷上下文，桌面 1440px，慢手机 390px/CPU×6/150ms。JS/CSS 为收到的解压字节与离线计算的 gzip。 [原始样本](performance.json)

| 指标 | PR13 | A5 安全准备 | 独立运行时实验 |
| --- | ---: | ---: | ---: |
| JS gzip（B） | 182585 | 182556 | 228546 |
| CSS gzip（B） | 28399 | 28420 | 28360 |
| 桌面 LCP 中位（ms） | 188 | 176 | 188 |
| 慢手机 LCP 中位（ms） | 3128 | 3052 | 3044 |
| CLS 最大 | 0 | 0 | 0 |

三个版本首屏均无视频下载、完整阅读器、会话或清理器代码。运行时实验比安全准备增加 45,990B gzip JS（25.2%），慢手机仍超过 2.5s。仅作本机实验比较。

## 联调阻断与回滚

托管 TEST 仍需资源授权、无密钥变量来源、实际 DB/存储独立权限与恢复演练。正式账号映射、间接 ACL、托管 CSP、Functions 运行时与真实兑换收据仍待验证。权限失败保持关闭，旧入口按批恢复。安全准备的改动没有数据库迁移。需要回滚时可关闭候选路由并回到 PR13 SHA 复查；如权限负例涉及现有预览，先保留闭锁，再恢复原只读配置。独立框架实验可单独放弃，原锁和构建基线可复现。

[TEST 证据清单与运行步骤](TEST_GATE.md) · [分批恢复](RESTORE_SEQUENCE.md) · [运行时官方资料](OFFICIAL_RUNTIME_RESEARCH.md)
