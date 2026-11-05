# B1｜GitHub 严格审核入口

本次用户已明确要求将本机 B1 完整成果提交 GitHub 供 GPT 审核。此分支包括此前仅在本机的检查点1、首页接入、详情容错修补、全部既有未跟踪证据与续验资料；不只是 PR #7 的副本。

## 审核基线与提交

- 仓库：2574303451-create/jinxi-web。
- 审核分支：[codex/jinxi-005s-b1](https://github.com/2574303451-create/jinxi-web/tree/codex/jinxi-005s-b1)。最终完整 HEAD 以草稿 PR 的 head SHA 和 GitHub 分支为准。
- 对比基线：codex/jinxi-005s-next-a-plus，`d4769e719b2dd486b82cd2867f066d6c4dfa3e19`。
- 检查点1：`ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3`，只读 SQL/聚合/摘要/隔离连接保护及手机箭头。
- 检查点2与详情容错实现：`55825f1a8146d0418bfa6380d7fa5254f093d6cc`，包含原9个暂存文件及本轮所有产品修补/测试，不含凭据。
- 本文件及证据在后续文档提交；审核整个分支相对 A+ 的差异，不能只审最后一个文档提交。
- 草稿 PR 以 A+ 为 base、依赖 #7；#7→#6→#5→#4→#3→#2→#1 均未合并。不是 main 发布或生产完成。

## 先读这些资料

1. [检查点1](CHECKPOINT1.md)：数据口径、只读契约和原生PG边界。
2. [最终交付](checkpoint2-recheck/DELIVERY.md)、[安全](checkpoint2-recheck/SECURITY.md)、[性能](checkpoint2-recheck/PERFORMANCE.md)。
3. [最终验证汇总](checkpoint2-recheck/VALIDATION.json)、[最终构建源码哈希](checkpoint2-recheck/build-final-source.json)、[类型诊断对比](checkpoint2-recheck/types-final-comparison.json)。
4. [最终浏览器矩阵](checkpoint2-recheck/browser-results.json)、[真实键盘对照](checkpoint2-recheck/focus-results.json)、[详情坏数据](checkpoint2-recheck/reader-results.json)。
5. [PG集成日志](checkpoint2-recheck/postgres-tests.txt)、[规模/执行计划](checkpoint2-recheck/scale-results.json)、[最终API日志](checkpoint2-recheck/api-final.txt)、[性能原始样本](checkpoint2-recheck/performance-results.json)。

上述验收文件是在提交 GitHub 前记录的原始证据。其中 `head=ca0723e`、`committed=false`、`pushed=false`、“原9份index未变”等是**当时的Git快照**，不能当作发布后的当前状态。原失败日志和旧报告没有删除或改成成功记录。根 CODEX_HANDOFF.md 的历史正文同理，最新阅读入口以本文件及 PR 为准。

## 源码重点

- netlify/functions/guide-video-stats.js、strategies.js 和 _shared/strategy-read.js、strategy-media.js、strategy-query.js、strategy-database.js：published范围、URL/JSONB、筛选先于LIMIT3、参数化、事务/超时、连接隔离。
- services/home-guides.ts、guide-video-stats.ts、public-read-cache.ts：契约拒绝旧后端、成功缓存/并发合并、失败不冒充0、12秒取消。
- components/home/featured-guides.tsx、guild-facts.tsx：真实筛选、竞态、首次可见读取及事实口径。
- services/guide-service.ts、components/guides/guide-reader.tsx：坏附件和缺字段评论的读取容错，缺失时间不捏造日期；后端原完整DTO与写接口未改。
- tests/strategy-api.test.cjs、strategy-postgres.test.cjs、home-guides.test.cjs、guide-detail-read.test.cjs：区分合成网络契约、真实本机SQL与浏览器注入。

## 必须核验的边界

- 保留认可首页、留言墙、画廊、双行展播、同行时光、/guides/和原头像外框。不是全站重做；档案208、创立日2018-02-10、在线—。
- 4只是隔离合成库的视频附件数；1k/10k规模下200/2000也是合成附件数。URL形式有效不代表可播放，不计本站宣传片。
- 原focus失败来自鼠标后程序focus；真实Tab/Shift+Tab必须同时有activeElement、focus-visible和3px轮廓，不可用放宽断言绿灯。
- 本机矩阵26项、详情13项、API14/14、PG16/16；独立tsc仍exit2且相同28项历史诊断。构建配置跳过类型检查，不能用build成功代替tsc。
- 最终12组性能样本：手机LCP中位A+2904/B12916ms，未达到2.5秒；CLS0；初始JS+4871B、CSS+63B。3次小样本不证明提速或线上达标。
- 积分授权P0、正式服务器会话、旧内容写权限/CSRF/防滥用、在线心跳及头像持久化仍未完成。B2未启动，未生产写入、合并或部署。
- 主out/1.mp4历史EPERM根因未证实，目前该主文件不存在；本轮只以新隔离Node20产物验收。未重跑npm ci，不是GitHub/Netlify Linux CI。

## 运行说明

`npm run test:api` 无数据库。`npm run test:postgres` 和 browser-checks.cjs 会重置专用本机合成库，不能当作只读脚本运行；先读 tests/support/postgres.cjs 和原交接说明。凭据不在仓库，也不得把脚本改指向生产。临时localhost预览不是远端可公开访问的网站。

建议审核输出：按严重度列真实可复现问题，给文件/行号、触发样本、影响与最小修复；分别说明新增回归和历史遗留。对未执行项保持未知，不以报告自述代替源码或原始记录；不要自动合并部署或启动B2。
