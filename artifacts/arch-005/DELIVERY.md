# JINXI-ARCH-005 · 第一阶段交付

本阶段完成攻略性能评估、同域`/guides/`独立路由原型、会话/头像/数据模型方案和可交互隔离头像原型。**没有实现或上线真实会话、生产头像上传、对象存储或数据库迁移。** 保留已认可首页、双行展播、同行时光、留言墙内部和成员画廊。

## 版本与预览

- 分支：`codex/jinxi-arch-005`。基线`ffa71f8313d3f9895d1b664404c29fa8dbb2dda1`，开始时干净、远端一致，独立对照worktree保留。
- 上游PR #3未合并，依赖#2→#1；已重新读取三者的实际状态与SHA。新PR基于`codex/jinxi-ui-004-a`，不合并上游。
- 实现提交：`70ce1c69ed592f4b49c0baa26b0bd6ae8427d85f`。后续交付记录仅为文档，最终HEAD由交付回复/PR给出，避免文档自引用SHA。
- [本机隔离预览](http://127.0.0.1:3021/review-preview/) · [攻略中心](http://127.0.0.1:3021/guides/) · [头像原型](http://127.0.0.1:3021/profile-lab/) · [截图与报告](http://127.0.0.1:3021/review/)。只在该电脑Node进程运行期间可用，不是公网部署。
- 重启：`npm run build`，`node artifacts/arch-005/serve.cjs out 3021`。该本机服务器只连接导出文件、合成攻略/留言与内存操作，永远不转发生产API；头像在浏览器IndexedDB。其他业务API503，不伪造在线数据。

## 结论与设计

推荐B独立路由，依据是首页实测少下载攻略代码、长文阅读和分享路径更清楚，**不是独立页面所有操作一定更快**。正常缓存的单次慢手机实验，第一次从首页进入独立路由仍比打开已预载弹窗稍慢；网络/CPU参数、全部瀑布、内存、原始录制、早期缓存禁用的更慢样本均保留在[GUIDE_ASSESSMENT.md](GUIDE_ASSESSMENT.md)及performance-*.json中。单次本机指标不证明线上LCP/INP/CLS目标。

新攻略GET把筛选/排序/页大小交给参数化SQL，保留旧完整DTO、增加轻量摘要和仅published的按ID读取。未执行SQL迁移、未创建索引；真实Postgres计划/部署结构还没核实。旧API的全表读取与sortBy被忽略、未来索引/键集分页、COUNT/深分页局限都有说明。所有POST和strategy-actions保持原代码；原作者、评论、点赞和工号配置未迁移。

完整身份设计在[IDENTITY_ARCHITECTURE.md](IDENTITY_ARCHITECTURE.md)，涵盖不透明Cookie会话、CSRF、轮换/失效/改密/限流、上传签名/尺寸/服务端重编码、CAS替换/旧文件清理、Blobs/R2费用与环境隔离、可信作者及历史不自动认领。模型草案[MODEL_PROPOSAL.sql.txt](MODEL_PROPOSAL.sql.txt)是**不可直接执行的设计资料**，需先核对真实测试结构并批准。

## 修改文件

| 范围 | 文件与实际变更 |
| --- | --- |
| 首页轻入口 | app/page.tsx移除始终挂载的StrategyWall及其状态；guild-navigation和community-updates改普通链接，已登录展示菜单增加“我的资料（隔离原型）”；不预取 |
| 新攻略路由 | app/guides/page.tsx、components/guides/{guide-center,guide-reader,guide-body,guide-media,guide-submission}.tsx、services/guide-service.ts、styles/guides.css：列表/筛选/分页/详情/评论/投稿/媒体/原管理入口 |
| 只读API | netlify/functions/strategies.js仅GET委托；_shared/strategy-read.js新增SQL WHERE/ORDER/LIMIT、摘要、按ID；原POST/actions不变 |
| 头像原型 | app/profile-lab/page.tsx、components/profile/{profile-lab,avatar-editor,member-avatar,avatar-scope,lab-community,public-message-scope}.tsx、lib/avatar-crop.ts、lib/avatar-lab-store.ts、styles/profile-lab.css：合成会话、裁剪/校验/编码、本机Blob保存、恢复、错误及联动 |
| 现有组件的最小接口扩展 | paper.tsx给PublicAvatar可选记录subject；message-wall/ribbon-card传记录ID，默认为原文字头像；use-public-messages支持原型只读数据源；留言墙原型模式在任何写入前拒绝，默认业务路径不变。没有重生成布局 |
| 路由与设计 | netlify.toml移除首页兜底200，未知路径404、img-src额外允许blob预览；styles/guild-theme.css仅给账户菜单链接同等样式；DESIGN.md增加新路由/原型规范 |
| 证据 | artifacts/arch-005含脚本、实际截图、JSON、trace、架构/费用/风险与回滚资料；原始不利样本保留 |

精确前后文件字节清单、保护文件hash及原POST片段hash检查见file-changes.json / invariants.json。无新依赖、无package-lock变更。auth-login/auth-change-password、points、schema.sql、静态成员/工号数据、成员轮播、同行时光和双行运动算法均未修改。

## 实际验证及边界

| 检查 | 结果 |
| --- | --- |
| 攻略/头像主检查 | 28组浏览器检查通过，browser-results.json；1440/768/390/320列表/正文/投稿、搜索/分类/页码、ID刷新返回、媒体弹窗焦点、受控评论/点赞、缺失ID/404、裁剪保存失败/格式/超限/回退/账号隔离/过期、原型无后端请求 |
| 请求分割与CSP | 7组，contract-results.json；首页悬停无攻略API/大模块，列表无详情/投稿/媒体；ID直达只读详情；加载/失败/重试/空态；资料入口、JPEG/WebP及blob在配置CSP下显示，刷新保留隔离Blob但不保留测试会话 |
| 已认可A功能 | 50组，ui004-results.json；双行真实速度/无缝/暂停/触摸/减少动态、定位、同行时光查询/历史/收起/离屏/计时完整回归 |
| 已认可成员 | 8组，protected-results.json；四宽度列表/加载/筛选与画廊嵌套详情/焦点/滚动锁 |
| 其余既有入口 | 17组，regression-results.json；导航、公告、签到、任务、积分排行、组队/游戏数据、赞助、加入、登录改密/FAQ、失效留言/缺图。全部写请求拦截或禁用，只证明入口及UI |
| 首页视觉保护 | homepage-protection.json；四宽度顶部600px逐像素差异均为0（相同字体/减少动态/浏览器）。其他区域保留结构，仅攻略入口文案/目标变更 |
| SQL读取 | read-results.json：4组实际read handler结构/绑定/摘要/旧DTO/缺失ID检查，记录型fake SQL适配器；**未执行真实SQL/EXPLAIN** |
| 身份模型 | security-model-results.json：4组匿名/过期/跨账号/失败拒绝；只是可篡改浏览器模型，不能当服务器安全通过 |
| 旧署名风险探针 | legacy-identity-results.json：实际旧POST在隔离VM+fake SQL接受任意合成作者，观测201；这是未解决风险，不是安全通过。无生产调用 |
| 头像移动性能 | avatar-performance.json和avatar-mobile.trace.json.gz：390px CPU6×，合成图片实际解码/裁剪/128pxWebP/IndexedDB，零后端请求；本地URL共享小图，无真实HTTP上传/CDN缓存结论 |
| 独立TypeScript | **仍失败、无新增语义错误**：28→28；type-comparison-raw.json保留原始2进2出差异，仅member/founder同义联合类型顺序不同。最终比较只额外规范化这一个顺序，其他完整诊断匹配，type-comparison.json |
| npm run build | 通过；首页71.2kB/首载165kB，guides5.02kB/93kB，profile-lab14.1kB/108kB。现有构建跳过TS/Lint，独立检查另报 |
| Lint/API测试 | npm run lint缺配置进入初始化，退出1；test:api缺test-api.js，退出1。日志保留，未声称通过 |
| 函数语法/数据保护 | 修改的两个JS文件node --check通过；未读取环境变量、连接真实数据库、执行迁移或生产写入；保护hash与提交扫描另外记录 |

浏览器合计110组（28+7+50+8+17），另有原生性能trace、SQL和模型测试。截图中攻略/成员为明确标识合成数据，留言墙的独立回归也用fixture。没有用这些结果证明真实登录、管理员授权、数据库写入或真实用户性能。

## 仍未完成 / 验收风险

1. **真实会话与服务端头像上传没有实施。** 不能把本地保存、前端跨账号拒绝或头像联动当安全认证。生产会话/CSRF/上传重编码/频率/对象权限/缓存失效、跨账号与冒名发布的真实后端测试均待批准后实施。
2. 没有授权测试数据库，实际表结构、索引、SQL执行与数据分布未核实；只读API和页面需同版本部署。旧status=all/draft访问、管理员默认密码fallback及客户端署名/反应标识风险仍需单独治理。
3. 已有积分P0未改、未解决。不能在未来启用会话后继续让旧积分写路径信任客户端账号/分值/兑换价格；身份写能力上线前必须完成独立安全任务。
4. `/guides/?id=...`本机静态客户端和新GET合约已测；Netlify真实托管重写/CDN/函数与预览数据库隔离尚未验证，没有发布预览部署。未知路由404逻辑遵循官方文件shadowing规则，但不拿本机服务器冒充Netlify集成验收。
5. 原型投稿提供媒体URL与预览，未实现对象存储文件上传；基础Markdown安全文本不执行历史HTML。旧自动浏览量POST不再在只读访问时自动发起；原viewCount与旧服务保留，未虚构增长。
6. 实际手机硬件、读屏软件人工测试未做；历史类型错误、Lint/测试工具缺失仍在。费用是公开计费口径/算例，未核对用户实际套餐。
7. 旧UI-004 B/C剩余组件未在此任务顺便统一；本次仅新攻略中心承担其对应新UI，其他业务内部样式保持原状。

## 具体修正与回滚

实际浏览器发现320px原生file input的固有最小宽度使编辑器溢出15px；已用限定网格列minmax(0,1fr)、min-width:0及输入宽100%修正，最终四宽度无溢出。攻略摘要移除基础Markdown符号提升可读性。缓存禁用比较与重复执行测试导致内存fixture评论重复的失败均保留方法说明，不解释为生产API故障；测试开始重置独立内存数据。

回退：保留认可基线和worktree，先关闭未合并的本任务PR；需要撤源改动时在干净分支按从新到旧revert本任务交付/实现提交，重新build即可恢复原攻略弹窗。无需迁移回滚；新GET代码可随客户端一起撤回，原写接口和数据未改。浏览器原型用“清理全部测试头像”清空`jinxi-avatar-lab-v1`，或在站点设置删除此数据库；不会触及真实localStorage账号资料。停止本机Node预览即可撤下。

下一停止点：用户验收本阶段推荐、攻略页面和头像交互后，再明确授权真实会话、对象存储、测试/生产迁移范围。未经批准不合并或发布生产。
