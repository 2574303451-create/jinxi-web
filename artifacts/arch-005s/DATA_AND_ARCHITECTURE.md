# 005S A：数据口径与B阶段接口设计

日期2026-11-05。A阶段已实现静态真实档案/时长及公开攻略原型。本文中B阶段的会话、在线租约、视频聚合和SQL是**待批准方案，未部署、未执行迁移、未完成集成测试**。

## 首页四项数字

| 项目 | 本轮数据与算法 | 页面状态 / 更新 | 链接 |
|---|---|---|---|
| 成员档案 | 原JSON members对象的唯一档案ID；包含创始成员，按编号而非昵称 | 208份；构建前生成极小聚合文件，显示源配置最后Git变更日 | #members |
| 当前在线登录成员 | 尚无可验证服务端会话，不读取localStorage账号、last_login_at或前端userId计数 | — / 统计接入中；没有心跳请求或后台轮询 | #online-status的公开说明 |
| 公会同行时长 | 原2018-02-10、原parseDateStrict和calculateRuntime，UTC周年/剩余天算法 | 可见时核对，下一UTC日界更新；离屏/后台取消日界timeout；aria-live=off | #guild-time-anchor |
| 已收录攻略视频 | B阶段聚合published攻略内type=video的数组条目 | — / 公开攻略视频索引接入中，不把3张卡片或宣传MP4当全站总数 | /guides/ |

时长没有新建每秒计时器，没有向原时光组件传入第二套起点。原时光模块仅增加一个跳转锚点，展开后的秒钟/查询/历史逻辑不变。首页展示到年、天，原组件仍可查看详细时长；当前时间与原组件一样取浏览器时钟，不宣称是经过服务器校时的时间。

## 成员独立复算

`audit-members.cjs`同时使用JSON语法树和对象解析，防止重复JSON键被JSON.parse覆盖后漏报。结果见member-audit.json：208个语法属性、208个唯一ID，连续0–207，无缺号/重复键/非法编号；founder=1、member=207，创始ID匹配。两组重复昵称对应ID19/138与96/128，仍保留4份独立档案，不按昵称合并。

日期全部严格回读有效，没有未来日期或早于创立日期，范围2018-02-10至2026-02-18。原配置没有is_active字段。`database-member-auth-schema.sql`说明profiles可能有archive_member_id与is_active，但**没有连接实际数据库核实导入覆盖、重复映射、停用状态或真实在会人数**。不能由DDL默认true推定全部208仍在会。既有历史事件尚无独立史料，本轮不改。

构建脚本scripts/generate-guild-summary.cjs只输出数量/日期/源文件散列/Git变更时间到lib/guild-home-facts.json，不把208份姓名/编号重新打包进统计组件。npm prebuild执行检查，无新依赖、无lockfile变化。raw散列与LF规范化散列均记录，避免Windows换行误报。

## 攻略公开读取的实际状况

只读公开地址来源于仓库netlify.toml中已有域名jinxi-web.netlify.app。2026-11-05实际GET `/.netlify/functions/strategies?summary=1&status=published&limit=3&offset=0`返回200，pagination.total=3；部署接口仍返回旧完整DTO，**忽略summary轻量投影**。三篇已发布记录的原始标题包含“1”“API测试攻略”“执手攻略模板”，无封面/媒体、均未置顶，不能改写成高质量精选或假视频。 sanitized snapshot记录读取时间，只保留公开署名/摘要/计数，不保留评论正文、反应用户数组或内部成员标识。

services/home-guides.ts复用readGuideList及原API参数，兼容旧完整DTO和新摘要；只显示published和合法ID，最多3条，不做全表扫描/深分页。摘要缺少视频标记时为unknown，不把unknown当0；视频/置顶筛选**仅筛选首页这3条公开结果**，提示已明确限定，不声称覆盖整个中心。全中心仍由/guides/承接，不新做搜索/评论/媒体系统。

API首次在推荐模块可见时读取，共享并发Promise和60秒内存缓存，12秒请求超时、错误重试；不自动刷新或轮询，重新进入离屏区域不重复请求。不在localStorage保存攻略记录。封面使用真实URL且lazy；缺失/失败使用原创文字/网格占位，无随机素材。首页没有video元素，无任何自动播放/媒体预加载；视频标记若有，点卡进入独立详情后才使用原播放路径。

**部署限制**：005R的摘要SQL尚未生产发布；其当前summary格式也未投影封面/视频标记。B阶段需给同一只读摘要投影补充最小cover/hasVideo字段，保留原完整DTO，真实Postgres验证后与前端同版本部署。不能为A阶段视觉而偷读全部全文或每卡额外取ID。

## B阶段：在线心跳设计（未实施）

前置：沿用005/005R的服务端不透明会话设计，Cookie必须HttpOnly/Secure/SameSite，服务端校验有效期/撤销/账号锁定/成员is_active；修改密码、退出和停用有明确撤销路径，CSRF/同源校验与限流先完成。不能将当前密码验证后返回的账户资料当会话；真实身份写能力上线前先处理既有积分P0。

建议180秒租约、60秒心跳，浏览器恢复可见/重新联网/pageshow时立即补一次，重复触发合并，加入轻量抖动只分散请求时间，不生成数字。每个页面实例有随机page token，仅用于该会话下租约，不携带可自报的member ID。server从Cookie解析成员，按(session,page) upsert服务器时间；过期清理后台低频执行。

多标签/多窗口/多设备计数使用COUNT(DISTINCT server_member_id)，而非Cookie/session/tab数量。可选BroadcastChannel选举减少同源标签写入，但服务端去重不能依赖浏览器协调。初版按页面每60秒最多一写，账户/会话/页面租约数量及速率有限制；100个单页面活跃成员约100次写/分钟只是容量估算，实际索引/延迟/费用需隔离压测。

关闭/导航离站可best-effort释放本页租约，不能移除其他页；退出在服务器撤销会话后立刻使该会话的所有租约失效，其他设备仍有效则成员继续在线。改密/停用按设计撤销全部会话。统计查询必须JOIN有效会话和活跃成员，不能只看presence时间戳。

后台仍停留页面不应立即排除；尝试在允许的60秒节奏维持，浏览器冻结/锁屏/丢弃/断网收不到心跳时180秒自然到期，恢复后重验会话再计入。**这只能是“最近180秒有有效心跳的登录成员”，无法精确证明此刻页面还开着**。公开说明需给出宽限口径，不能承诺unload立即可靠。公开总数可缓存15秒，所以最迟排除约195秒（租约+缓存）；退出撤销若需更快须主动失效计数缓存。

公开GET仅返回`{onlineMembers, observedAt, windowSeconds, status}`，不返回名单、工号、会话ID、page token或IP。错误/存储不可用返回unavailable与空值，不返回0伪装无人。缓存与真实会话校验分离，心跳端点禁止跨域任意写、body大小限额和服务器限流。

依据：[MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)说明后台定时器节流；[Chrome Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)说明页面可能冻结/丢弃且终止事件不可靠。Cookie属性参考[MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)。60/180/15秒是本项目待验证的设计选择，不是这些文档给出的实测推荐参数。

## B阶段：视频聚合与摘要扩展（未实施）

拟在原策略读取辅助层增加明确只读统计模式，或一个轻量公共统计函数复用相同published条件，不读取全文。不接受客户端status=all/draft。统计type=video条目，不是DISTINCT攻略ID；合法JSONB数组内对象才参与，不按URL是否目前能播放推算总数。

草案见VIDEO_AGGREGATE.sql.txt。顶层null/字符串/对象均转[]，数组内null/标量不计；video对象即使未给URL仍是“登记条目”，是否可播须另做校验，不能混淆。统计响应附计算时间/口径版本；失败为null/error。原视频/图像素材和数据不迁移。

聚合SQL、详情投影、索引/权限/JSONB坏数据实际执行、可信会话、在线去重和存储故障测试均留待B阶段。005R曾跑过原读取SQL的真实Postgres，**不能把那个历史结果当成此新聚合SQL通过**。

内容增多后的推荐模式也应在同一SQL摘要查询中先筛选最新/含视频/置顶，再LIMIT3，而非下载全部或仅在前三条中冒充全站筛选；增加可选mode或hasVideo/isPinned受控参数，并验证旧列表兼容。目前A明确只是首页这批公开结果的原型筛选。

## B阶段验收矩阵（全部未运行）

| 测试 | 期望 |
|---|---|
| 匿名/伪造localStorage/自报member/userId | 不建立租约，不计数 |
| 有效会话1页、同成员3标签/2窗口 | 统计1人；另一成员加入才+1 |
| 关一页、关最后页、unload丢失 | 前者仍1；后者释放或180秒到期；考虑公共缓存 |
| logout/改密/停用/会话到期 | 服务器撤销即时生效，旧Cookie/重放不续租 |
| 页面切换/BFCache/pageshow | 不累积重复租约，恢复先验会话 |
| 后台标签/移动锁屏/浏览器freeze/discard | 定时器节流不制造永久在线；恢复重验 |
| 断网/恢复/超时/多次visibility事件 | TTL排除；立即补心跳且合并/限流 |
| 聚合接口隐私 | 仅数值与时间戳，无账户/工号/用户名 |
| PG发布/草稿/归档、空库、多视频/坏JSONB | 只数published视频对象，空数据0、失败null |
| EXPLAIN/并发/缓存/权限/跨账号请求 | 实际隔离PG记录，非fake SQL；不触及生产 |

## 回滚与停止点

A阶段没有迁移或服务端写入，回退新增组件/聚合文件和最小挂载即可，保持005R安全修复。B阶段须在A验收、可信会话任务及隔离环境范围获批后实施；当前交付不包含B上线承诺。
