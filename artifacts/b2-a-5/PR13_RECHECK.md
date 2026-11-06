# PR #13 独立复核

固定差异为 `483495aefcd75316731efce76372748a0f00c8c7...f443144a912abf5869d42f4758c86caaf6031525`。远端与本机起始 SHA 一致。查阅 DELIVERY、PR12_REVIEW、HTML_AND_CSP、ENVIRONMENT_GATE、RESTORATION_MATRIX、MEMBER_SESSION_PLAN，独立 Standards 和 Spec 两路对照源码。GitHub 记录显示 #1 至 #13 保持逐层草稿依赖。PR #13 CI 的 Node20.20.2 和 24.22.1 均成功，检查出该完整 SHA。 [链路快照](github-baseline.json) · [PR #13](https://github.com/2574303451-create/jinxi-web/pull/13) · [CI 42143012478](https://github.com/2574303451-create/jinxi-web/actions/runs/42143012478)

## Standards

- **P1 误配权限边界。** 旧证明把整个实验 schema 纳入允许范围，实验 schema 内的 owner-rights 可更新视图能够桥接保护表。实际合成角色更新成功后回滚，旧证明未拒绝。已限制普通无继承表和指定序列。正式测试还需审查触发器、规则、外表和 FK 的间接授权。
- **P3 草稿回执。** 编辑器接受 525,000 个引号，存储 JSON 膨胀至 1,050,022 字符，旧代码提示已存而刷新恢复为 0。已统一 HTML 上限和 JSON 包络限制，并能恢复旧的合法长草稿。
- **判断项 · 旧账号来源。** 预置旧浏览器缓存会使导航出现账号菜单。暂停期不再用该缓存驱动导航登录态，移除冲突的即时写库承诺。对照 DESIGN 的草稿恢复规则和成员会话计划的旧缓存边界。

## Spec

- 公告的正常编辑和刷新恢复未覆盖高转义文本。独立 Edge 负例复现。A5 两个构建在 1440 和 390px 均恢复 525,000 字符，写请求 0。
- 每日任务的裸积分和「待领取」会误导。已区分规则参考值、历史本机记录和当前暂停态。
- PostgreSQL 17 `MAINTAIN` 可刷新受保护的物化视图。直接授权负例在 PR #13 漏检，A5 拒绝。触发器等间接路径、托管上下文与资源身份仍需真实 TEST 证据。

两轴各三项，风险最高的是同 schema 视图使权限证明漏检。测试仅在授权合成库进行。 [旧负例日志](pr13-permission-negative.txt) · [修补后集成日志](prep-postgres.txt)

## 实验结论

| 复核项 | 证据 |
| --- | --- |
| PR13 基线实际 PG | 53 通过，含跨范围表/列 SELECT、UPDATE 和角色拒绝。新增 owner-rights 视图、MAINTAIN 在 PR13 按预期失败，在 A5 均拒绝，集成 55 通过 |
| 丢响应与兑换 | 同页面会话过期再登录仍是余额 23/一笔。刷新后精确重放同一请求同样一笔。刷新后新点兑换会发新编号，余额 16/两笔。真实订单恢复仍是第 3 批前置 |
| HTML 与 CSP | 恶意 HTML、粘贴、插图 URL、原文与正常图片、安全组件下载失败均通过。CSP 从真实导出重新计算，离线 Netlify 解析每个目标路由只得一条脚本策略 |
| 旧入口与 UI | 旧写无 POST、暂停明确。本机旧缓存不充当登录。原头像框像素/尺寸复核，归档 208、创立日期 2018-02-10、在线 — 保留 |

[PR13 PG](pr13-postgres.txt) · [同页兑换](browser/pr13/nonce-expiry-browser/nonce-expiry-results.json) · [刷新边界](browser/pr13/refresh-redemption.json) · [旧浏览器负例](browser/pr13/independent/results.json) · [修补后](browser/prep/independent/results.json)
