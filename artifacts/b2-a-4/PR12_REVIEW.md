# A · PR12独立源码复核

固定范围 `git diff d516b8643c73797ddfbd8109d46a7dba58f6016c...483495aefcd75316731efce76372748a0f00c8c7`。2026-11-06实际GitHub重查：PR1–12全为open/draft/unmerged，PR12 head及base与上式一致；原始快照见github-baseline.json。PR12实际CI运行42129863425 completed/success，Node20.20.2/24.22.1日志均为API14、安全6、临时PG44，原始tsc exit2/28、仅历史基线通过。没有用报告替代远端核对。

依review技能，两个独立只读审查代理分别检查规范和规格，没有改代码、读取凭据或重置数据库。仓库和PR已由用户明确指定，本轮不进行Issue/triage设置或发Issue；规范来源AGENTS、COLLABORATION、DESIGN、相关B2文档。以下保持两轴独立，不将已声明延期的正式环境工作重新包装为漏做。

## Standards

- **P3明文偏差**：固定blob `app/session-lab/page.tsx:25–28` 的输入/网络失败全部进入role=status。DESIGN.md要求输入错误role=alert。成功状态继续status，失败应单独alert。
- **判断项、非明文违反**：固定blob `tests/support/session-fixtures.cjs:23` 授予四表DELETE和台账UPDATE，handler没有用到。虽然仍在b2_lab内，权限可进一步缩小。

未发现首页、原头像框、轻量加载、云拒绝、生产数据边界或CI含义的其他明文偏差。

## Spec

- **P1跨schema SELECT误授权漏检**：ENVIRONMENT_AND_ENDPOINTS.md要求“不可读写公共或保护资源”。固定blob function-security.js:46只查写能力，:53无读取权限验证；新session-lab.js:39直接沿用。给运行角色误授其他表/列SELECT后，仍通过“权限证明”。
- **P2未确认兑换在过期重登后丢幂等编号**：SESSION_LAB.md承诺当前页面保留失败兑换nonce，仅明确刷新限制。固定blob page.tsx:10的forgetIdentity清nonce，:14任意401触发，:36重试生成新UUID；服务端按member+新UUID再记账。提交已成功但响应丢失、过期、同账号重登后可重复扣款。

其余实现有源码依据：32字节CSPRNG、仅存摘要、Cookie标志、精确Origin/CSRF、首次改密限制；账号/profile锁先于会话/钱包锁，规则及价格在服务器，业务失败回滚，限流先独立提交。跨标签即时广播、刷新订单恢复、云隔离/真实schema/XSS/运行时升级已声明延期，不作为本次新发现。合成实现不是正式成员安全验收。

## 主任务复现、修补和界限

1. `permissions-before.txt` 记录真实 PG 误授 SELECT 后未拒绝。修补后 session 的读取范围限定为 b2_lab，public reader 限定为四张公开内容表。检查覆盖表级、列级 SELECT，以及其他视图、外表和序列。主任务另复现了原 `pg_%` 通配符误跳过普通 schema 的问题，改用字面 `pg_` 前缀后权限检查 12 项通过。首次白名单与实际赞助表名不一致的失败也已保留。见 `permissions-final.txt` 和 `permissions-system-prefix-before.txt`。
2. `nonce-expiry-before.json`真实HTTPS浏览器复现：起始30分，丢响应后重登重试变16分、两笔扣账，预期23分/一笔。按服务器公开member UUID在当前页面内隔离保留pending nonce，401/退出不丢；成功回执才移除。`nonce-expiry-after.json`23分/一笔通过。刷新仍需正式订单恢复方案，未假称已实现。
3. 错误状态改role=alert、成功status。运行角色撤销DELETE及台账UPDATE；真实PG测试拒绝改写/删除台账和删除会话/钱包/限流记录。

前置fixture路径、钱包已存在等测试错误与产品红灯分开保留。A-4 HTML/browser、UI及完整PG回归见DELIVERY.md；正式接入阻断不因修补消失。

两轴结果：Standards 1项硬偏差、1项最小权限判断；Spec 2项。最高为P1跨scope读取漏检，已由真实PG先红后绿验证修补。
