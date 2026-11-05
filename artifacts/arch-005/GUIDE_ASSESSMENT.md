# JINXI-ARCH-005 · 攻略架构与性能评估

基线`ffa71f8313d3f9895d1b664404c29fa8dbb2dda1`，新分支`codex/jinxi-arch-005`。远端HEAD与本地一致、开始时工作区干净。PR #3→#2→#1均未合并；本分支从#3成果创建，不覆盖上游。独立对照worktree为`E:/Recovery/jinxi-arch-005-baseline`。未读取凭据、连接数据库或写生产数据。

## A · 现状与实测

源码：首页使用React.lazy声明StrategyWall，但在首页末尾无条件渲染，`isOpen=false`仅传给组件内Modal。这会触发加载攻略模块，不能把lazy声明当成“点击才下载”的证明。StrategyWall自身只在isOpen为真时读取列表，详情/投稿/媒体又静态导入在同一模块树。

实际生产浏览器证据：基线首页9个已下载脚本中，`597.65af0f28f0fadcda.js`含攻略/投稿/媒体代码，原始57171字节、逐文件gzip13536字节。初次首页无strategies请求；点击后GET `strategies?sortBy=created_at&sortOrder=DESC&limit=12&offset=0`。不是首页提前读攻略数据，而是提前下载代码。

### 可复现比较

`measure.cjs before|after`、`serve.cjs`、`fixture.cjs`均在本目录。两个独立生产静态导出，基线端口3020、新版3021；25条明确标记的合成攻略（长正文、媒体元数据、评论），只有本机HTTP和内存，不对生产发请求。桌面1440×1000 CPU1×；手机390×1000 CPU6×、150ms、200000B/s下行、93750B/s上行。CDP阻止双方原有不稳定外部图标CDN请求，原生HTTP缓存保持开启。首次页面冷上下文，点击是在首页已加载之后。各条件1次主样本，不是稳定分位数或线上Web Vitals。

| 指标 | 弹窗基线 | 独立路由原型 | 解释 |
| --- | ---: | ---: | --- |
| 首页实际下载JS原始字节 | 644359 | 587104 | -57255（约8.9%），不是Next构建表中的单一entry大小 |
| 首页各脚本独立gzip合计 | 188866 | 176062 | -12804（约6.8%）；本机未配置传输压缩，此列是离线gzip估算 |
| 首页已含完整攻略代码 | 是，57171B chunk | 否 | 网络响应内容检查，不只看import写法 |
| 首页攻略API | 0 | 0 | 双方均未提前请求 |
| 桌面点击→首批攻略可见 | 108ms | 125ms | 新版首次访问略慢，旧版代码已驻留 |
| CPU6×手机点击→首批攻略可见 | 1233ms | 1509ms | 独立路由没有在这个样本上更快；增加导航/解析成本 |
| 首页post-GC JSHeap 桌面 | 3826444B | 3396900B | 浏览器估计值，约少0.43MB；不是精确组件内存 |
| 打开后post-GC JSHeap 桌面 | 5769592B | 3163376B | 新路由替换文档、摘要更轻，不能将差值全归因于一个组件 |
| 首页post-GC JSHeap 手机 | 3818556B | 3403392B | 同上 |
| 打开后post-GC JSHeap 手机 | 5780712B | 3191076B | 同上 |
| 本机首页LCP 桌面/手机 | 300 / 2756ms | 284 / 2708ms | 外部资源被控制阻断，不能拿此宣称真实线上目标达成 |

原始数据：[前](performance-before.json)、[后](performance-after.json)，包含请求/响应/完成时间、传输字节、脚本标记、API时机、post-GC指标、LCP和事件样本；真实移动/桌面点击录制为`before-mobile.trace.json.gz`、`after-mobile.trace.json.gz`等，可导入DevTools。

读写无关的后续视觉微调前样本另保留于performance-after-pre-polish.json；该样本桌面163ms/手机1411ms，不能视作完全相同构建的重复抽样。

另保留早期浏览器路由拦截导致HTTP缓存禁用的样本`performance-*-cache-disabled.json`及同名trace：手机旧弹窗1278ms、新导航4959ms，桌面135→196ms。此差异受重复导航缓存策略影响，不能隐藏或当正常缓存比较。最终主比较改用CDP网络屏蔽，未修改生产代码预取来制造收益。响应fromDiskCache=false也不代表一定无内存缓存，原始encodedBytes和事件一并保留，不杜撰命中率。

### 方案选择

| 方案 | 价值与代价 | 本项目成本估计（非报价） | 回退 |
| --- | --- | --- | --- |
| A 保留弹窗 | 可把组件条件挂载，解决提前下载；熟悉、点击不换文档。但长文/分享/返回/多层弹窗仍复杂，继续占首页状态与CSS | 最低：约半至1个工程日完成条件挂载与回归，视觉统一另计 | 恢复基线组件挂载，不改数据 |
| B 同域/guides/ | 首页不载攻略树、阅读独立、真实URL/刷新/分享；首次访问仍需代码和数据，实际点击样本略慢。可以日后在用户明确意图时预热小模块，不能无条件预取回去 | 中等：约2–4工程日完善页面/GET/全状态回归；本轮已有原型，真实测试库SQL计划与部署仍待核验 | revert本分支，恢复首页弹窗；原POST/actions与数据未迁移 |
| C 暂停入口 | 首页可去掉相关代码，但丢失攻略交流路径；对不需要攻略的短期维护窗口可用 | 最低：数小时处理入口和说明；恢复成本低但产品损失最大 | 恢复入口与组件，保留数据/后端 |

**推荐B，理由是阅读与信息架构、实测首页代码减少；不是宣称所有导航更快。** 若唯一目标是最低改动减少首页下载，A的条件挂载更经济。C不符合继续交流的产品方向。此为工作量量级估计，未把研究/安全迁移算成确定排期。

## B · 已实施原型

- `/guides/`为Next14静态导出页面，首页仅两个普通`a href`入口，不使用Next Link预取、router.prefetch或悬停预取。原完整StrategyWall不再挂载，但旧源码保留作回退。
- 列表搜索/分类/难度/排序/分页，GET明确`summary=1&status=published`；列表不带完整正文、媒体或评论。详情按`?id=...`独立GET，不通过扫描列表寻找目标。
- `/guides/?id=1`实际可直接访问、刷新、返回和复制链接。不存在/无效ID明确提示，未知路径HTTP404；不是只更改地址栏的假深链接。此能力需要新GET Function与前端作为同一预览版本发布；旧Function不支持id/summary，不能拆开部署。
- 阅读正文、媒体、评论、点赞/收藏、原管理员验证和投稿入口保留。React文本渲染替代旧正则HTML插入，原HTML内容作为文字，不执行作者HTML。支持基础标题/强调/代码/列表，未实现完整Markdown规范；原始正文未被修改。
- 详情与投稿按需React.lazy，媒体随详情代码加载，列表不提前加载图片/视频，视频preload=none。投稿原型支持媒体URL；没有宣称已完成旧版文件上传的对象存储迁移。
- 原评论/点赞/收藏/投稿/管理员请求继续原服务与payload，不新增认证标记。原型不自动对阅读执行view写入；显示原viewCount，避免把单纯GET访问作为写入成功证明。这是与旧点击先写view再显示的明确行为差异，未来可在批准后另做非阻塞计数。

真实截图：`guides-list-*`、`guides-reader-*`、`guides-submission-*`覆盖1440/768/390/320，加载/失败/空数据另有截图。浏览器结果与边界见DELIVERY.md。

## C · SQL扩展与数据保护

旧`strategies.js`每次GET `SELECT`全部行及content/comments/media/likes，再JS过滤、slice；随总行数N和正文/嵌套数组体积增长，数据库→Function传输、函数内存、JSON解析与冷启动开销会增长。limit12只限制最终输出，不限制数据库取回量。旧sortBy/sortOrder虽然由前端发送，但查询固定按置顶/创建时间，未实际使用。

新增`_shared/strategy-read.js`是**只读代码改动，不是数据库结构迁移**：

1. 参数化WHERE（状态/类别/难度/标题正文子串），COUNT聚合后由SQL LIMIT/OFFSET限定返回行；排序字段只在服务端allowlist，方向只ASC/DESC，追加id稳定排序。limit限制1–50、offset限制0–100000，搜索最多200字符；避免把请求直接拼成SQL。
2. 原GET不传summary时仍返回完整旧DTO；新summary在服务端固定published，仅摘要、公开署名和计数，不扩散likes/favorites用户数组或完整评论/媒体。
3. `id`读取只允许正整数范围、`WHERE id=$1 AND status='published' LIMIT 1`，缺失404、无效400；不触发浏览量写入。
4. POST创建与strategy-actions完全未改；作者、正文、评论、点赞、原始ID和静态工号配置均不改。保留旧status过滤兼容语义，并明确其既有公开draft/all风险未解决；新页面固定published。

这将Function取回的数据从全表降到页大小，但**不代表数据库计算是O(12)**：COUNT、无索引子串搜索、排序、深offset仍可能扫描大量行。两个独立SQL读不是同一快照，并发写入下total可短暂与列表不一致，不用于权限/资产决策。没有真实测试数据库，因此没有EXPLAIN、真实行数、索引命中率或SQL执行时间结论。

建议下一阶段只在批准的测试库比较：`(status,is_pinned DESC,created_at DESC,id DESC)`索引；浏览/点赞排序需要合适表达式索引或计数列，需检查JSON数组脏数据；中文子串查询评估pg_trgm GIN（需确认扩展/成本），或明确的中文全文检索策略。大量深分页可用置顶/排序值/id键集游标，先保留offset兼容旧客户端。**这些索引/扩展/列均未创建。** 原JSONB点赞/评论并发读改写的竞争风险需未来单独事务化，不以本轮SQL分页宣称解决。

`read-results.json`验证实际只读handler的绑定参数、allowlist、页界限、ID状态、摘要及旧DTO，但SQL执行器为recording fake；不是PostgreSQL集成测试。没有读取、备份或修改真实数据的授权环境，所以“原数据不变”依据是未建立数据库连接、生产写路径未修改及源码hash检查，而不是查询生产内容来证明。

## D · 路由与部署边界

`output:'export'`、trailingSlash与Netlify发布out保留。实际构建生成`out/guides/index.html`和`out/profile-lab/index.html`。原`/*→/index.html 200`会让未知路径看似首页；改成最后的`/*→/404.html 404`，有效静态文件按Netlify文件shadowing正常服务，删除无意义的静态资源自我重写。真实GET `?id`在客户端读取，静态HTML不依赖运行时Next服务器。

参考[Next14静态导出](https://nextjs.org/docs/14/app/building-your-application/deploying/static-exports)、[Netlify redirects/file shadowing](https://docs.netlify.com/manage/routing/redirects/redirect-options/)。本机HTTP验证了导出目录、直接路径/刷新/query/返回/404；未部署到Netlify，也没有可用本地Netlify CLI，因此**托管层实际重写与CDN行为尚未验证**。本机按配置设置CSP的浏览器测试允许blob头像预览；CSP仅额外允许img-src blob，不放宽script-src。预览部署必须另获批准并确保测试库/存储隔离，不能直接连生产验证。
