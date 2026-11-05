# B1 本机综合安全重验

> 本文保留GitHub发布前的验证快照；当前发布范围、实现提交与审查入口见[REVIEW_GUIDE](../REVIEW_GUIDE.md)。原未推送等状态不作为发布后的Git结论，生产阻断仍保留。

日期：2026-11-05，Asia/Shanghai。范围是 `codex/jinxi-005s-b1` 在本地 HEAD `ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3` 之上的既有暂存实现及本次详情容错修补。不是生产放行。

## 已实际执行

- `api-final.txt`：`npm run test:api` 14/14，包括父项；无数据库的 API/已安装 Neon 驱动序列化/首页契约缓存测试，以及新增的详情读取坏数据回归。
- `postgres-tests.txt`：真实 PostgreSQL 17.11 集成 16/16，包括父项。实际参数化 SQL、published 隔离、非法筛选提前拒绝、混合 JSONB/URL、只读角色拒绝写入、真正锁表触发 3 秒超时与恢复、四并发和数据校验均通过。
- `scale-results.json`：仅在受限本机库上，另测 1,000/10,000 条合成攻略，80% published、20% 有有效视频附件、2% 置顶。每规模统计/latest/video/pinned 各 3 次、7 份实际 EXPLAIN ANALYZE BUFFERS、四并发和前后数据摘要一致性。全部成功，finally 已恢复 16 条原合成夹具。不是生产容量或 Neon 延迟承诺。
- `browser-results.json`：五宽度和空表、失败/重试、旧后端、竞态、缓存共 26 项。首页不把旧后端当新筛选，不用失败冒充 0，不在选中新 feed 时显示旧结果。Date.now 注入的 59/62 秒缓存检查明确标记，不称作真实等待 62 秒。
- `extra-results.json`：真实浏览器 AbortController 约 12 秒取消停滞请求，显示 — 并可手动恢复；独立攻略过滤、分页、返回、历史导航通过。网络停滞是显式注入，不冒充 PostgreSQL 超时。
- `reader-results.json`：12 篇实际合成攻略及 1 个坏 DTO 注入场景通过。JS/React 异常与写请求均为空。
- `syntax-results.json`：6 个 B1 Functions/共享 JS 文件语法通过。

全部数据库连接由现有 `tests/support/postgres.cjs` 的 loopback/55433/库名/角色检查约束。HTTP 预览只开放 GET/HEAD，任何其他请求均 405。没有加载生产 `.env`、使用生产数据库、真实登录、发布内容、领取积分或上传真实头像。PG 凭据仍仅留系统 TEMP，未复制、打印或提交。

## 本次实修的旧读取异常

`reader-media-repro.json` 保留 A+ 与 B1 原产物对合成攻略 2 的相同崩溃：`null.url`。`detail-invalid-fixture.json` 保留缺失评论署名触发的 `undefined.trim`。

修补只发生在浏览器详情读取 DTO：

1. 评论的 null/标量无效条目不进入渲染；缺署名显示“匿名署名”。缺失/非法日期保留无效 Date，在 UI 显示“时间未提供”，不填当前时间。
2. 附件 null/标量或错误 URL 类型保留为空地址的不可用条目，继续由原媒体组件展示错误说明。有效原地址及既有媒体安全策略保持。
3. 后端完整 DTO、数据库原记录和写接口没有变。匿名显示不绑定成员身份或授权。

先运行新增 `tests/guide-detail-read.test.cjs` 得到真实失败，再修补并通过；日志分别是 `detail-unit-before.txt` 与 `detail-unit-after.txt`。主 `test:api` 显式纳入此回归，未把会重置数据库的 PG 测试混入无数据库脚本。

合成夹具补齐正常评论的 userName/timestamp，让 A+ 对照使用完整的普通 DTO；坏评论仍由单测和明确注入专门验证，没有删掉原来用于 SQL 检验的坏附件。

## 检查边界与未解决项

- 原有积分接口信任客户端账号/奖励/价格，正式服务器会话、CSRF/Origin、防滥用、旧内容写接口的身份权限仍是生产阻断。本次只读改善不覆盖这些 P0。
- Neon 驱动序列化测试使用合成 HTTP 协议响应；本机真实 SQL 使用真实 pg 传输。没有连接 Neon 生产或验证其实际网络/托管行为。
- 前端校验和公开 URL 规则不证明媒体可达、内容可信或视频可播放。合成库视频数 4 不是生产数量。
- TypeScript 最终仍 exit 2、28 项历史诊断，完整诊断相同：`types-final-comparison.json`。修补过程一个临时类型守卫诊断已修正，初次日志仍保留。Lint 仍缺有效配置；没有新增或假称运行 GitHub CI。
- 本地预览故意对公告等无关接口返回 503。原始 consoleErrors 保留；仅精确已知公告错误和资源 HTTP 错误按环境记录，其他 JS/React 错误会使浏览器检查失败。不声称全站业务后端验收通过。
- 主 `out/1.mp4` 当前为 ENOENT，public 和独立产物可读。历史 EPERM 根因未证实，未删除主 out、修改 ACL 或终止不明进程。最终构建来自新的隔离目录。

B2、正式会话、在线心跳、头像持久化均未启动。PR #1–#7 经连接器只读复核仍 open/draft/未合并；远端 A+ 仍为 d4769e7，B1 尚未推送或创建 PR。
