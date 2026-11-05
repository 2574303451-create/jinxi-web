# B1 检查点1｜只读数据契约

基线：`d4769e719b2dd486b82cd2867f066d6c4dfa3e19`；分支 `codex/jinxi-005s-b1`。PR依赖7→6→5→4→3→2→1均未合并。用户本轮明确授权创建本机一次性PostgreSQL，仅合成数据、loopback、独立目录，不读取生产连接。

## 口径与接口

- A：JSONB数组中的video对象登记条目，可能空链接或无效链接；不作为首页数字。
- B：首页采用**已发布攻略中通过公开附件URL规则的视频条目数**。同一URL多次登记按独立附件累计，不去重。排除本站根路径/1.mp4、/2.mp4（含查询/片段及相应编码）和今夕已知部署域名上的对应宣传片。
- C：已实测可播放的视频数。本轮没有后台探测媒体，不从数据库推断C，也不报告C。

`GET /.netlify/functions/guide-video-stats`只返回聚合，不接收身份或状态筛选参数。成功示例（**本机合成库，不是生产数量**）：

```json
{"contract":"jinxi.guides.video-stats.v1","count":4,"countType":"published-valid-url-video-attachments-v1","calculatedAt":"由数据库statement_timestamp计算的ISO时间","status":"ready","playabilityVerified":false}
```

真正空库为ready/0；失败503、超时504，count/calculatedAt为null、status=unavailable。所有响应no-store；没有后端定时轮询。实际响应及时间见 `checkpoint1-api.json`，执行SQL见 `VIDEO_AGGREGATE.sql`。

公开URL规则同源代码用于SQL与前端：单斜线根路径或HTTP(S)，支持ASCII域名/IPv4与合法端口，允许中文等路径；最多2048 UTF8字节；拒绝凭据、空白/控制符、反斜线、坏百分号编码和路径点段。IPv6/裸非ASCII域名暂不在此保守规则内，IDN可用punycode；data/blob不进入轻量摘要。相同文件名的外部CDN资源不因叫1.mp4就被全球排除。此规则检查链接形式，不验证内容类型、网络可达性或播放能力。原完整详情读取及媒体渲染规则未改。

`GET strategies?summary=1&feed=latest|video|pinned&limit=3&offset=0`先在数据库筛选，再排序/LIMIT3；latest严格按created_at/id倒序，不受旧置顶优先影响。feed限定摘要、offset0、limit≤3及固定最新排序，非法参数400。通用公开列表继续有界分页，offset>100000拒绝，排序标识符为白名单，分类严格校验，用户值全部参数绑定。

新摘要返回 `contract=jinxi.guides.summary.v2`、`appliedFeed` 和稳定的封面、hasVideo、videoCount、摘要、署名、分类/标签、计数、日期；不返回正文、评论正文、点赞/收藏ID数组或账户字段。封面优先合法image_url，其次首个合法image附件，无封面则null。未修改原完整列表/ID详情格式；所有读取强制published，显式草稿/归档/all拒绝，伪管理参数不授予权限。

同一逻辑请求在一个RepeatableRead/READ ONLY事务中读取；本地statement_timeout3000ms及HTTP5000ms限制。统计1条数据查询，列表2条，另各有1条事务内set_config控制查询。返回错误是通用信息，不输出内部连接/SQL错误。Neon真实安装版本的事务序列化也有独立契约测试；该测试的HTTP响应为合成协议样本，不冒充数据库集成。

Netlify deploy-preview/branch-deploy必须提供专用 `JINXI_PREVIEW_DATABASE_URL`；没有时不回退生产DATABASE_URL，与生产相同host/port/database也拒绝。未配置云预览、未读取/修改Netlify环境；生产上下文仍用原DATABASE_URL。原匿名POST、客户端自报作者、积分P0及既有写接口预览隔离仍为生产阻断，未因只读功能宣布已解决。

## 实际验证

- PostgreSQL17.11原生Windows进程，127.0.0.1:55433，专用jinxi_005s_b1_test库、随机测试凭据，只读账号仅SELECT。凭据只在系统TEMP/jinxi-005s-b1-postgres，未进入仓库。不是PGlite或用内存假adapter计算SQL。
- 使用真实pg传输执行产品SQL；handlers在受控VM中仅替换Neon连接工厂为该真实本机连接，SQL/处理器源码未替换。没有连接Neon生产环境，也不宣称验证了其网络服务。
- `checkpoint1-tests.txt`：真实PG15个子项（runner16含父项）及无DB API/驱动契约5个子项（runner6）。覆盖空库、多视频/重复URL、JSONB null/SQL NULL/对象/数字/字符串/混合数组、非法协议/空URL、草稿归档、参数化与权限、并发、数据不变、实际EXPLAIN，以及真正锁表等待触发3秒SQL超时后504/恢复。
- 合成视频结果4；latest IDs14/13/12，video IDs11/2/1，pinned IDs3/1。视频/置顶结果在前三篇之外，证明未用客户端筛选前三篇冒充全站。
- 16条小样本：摘要响应latest2650B、video2615B、pinned1786B；本机暖查询约1.4–2.7ms，聚合EXPLAIN执行0.432ms。仅为小型隔离样本，不作生产规模或网络延迟承诺；后续检查点补充规模/浏览器性能。
- 对精确暂存产品源码副本执行Node20.20.2/npm10.8.2静态构建，成功，`checkpoint1-build.txt`；独立TSC28项历史诊断，`checkpoint1-types.txt`。源码快照说明见checkpoint1-source.json。首页数据接入留在检查点2，不将其算作本提交已完成。
- 手机390/320：箭头从左侧指向Play图标，尖端距图标4.5px、7px描边未碰文字/图标；Hero/summary/统计区矩形与新鲜A+基线一致。焦点层置于装饰之上，原3px轮廓保留；键盘/tap开关与展开隐藏通过。见arrow-results.json及arrow-compare/focus两档截图。桌面曲线未改。

## 失败记录与回滚

`postgres-first.txt`是初始化脚本被原生子进程输出句柄阻塞、runtime未生成导致的测试失败；停止并以文件stdio重新启动该专用实例后完成配置，真实SQL测试通过。`api-unit-first-failure.txt`是合成Neon响应把batch写为数组而非results对象的测试夹具错误，按已安装驱动协议修正；不将它说成产品SQL失败或集成通过。保留必要原始失败，不重复保存大量成功截图。

无需迁移、没有生产数据变化。可revert本检查点提交或切回d4769e7基线；若依赖本提交的检查点2已应用，应一起回退对应前端契约。未合并/部署，B2未开始。
