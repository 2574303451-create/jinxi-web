# 双模式攻略视频设计

## 兼容字段与判定

继续使用 `strategies.media_files` JSONB。每个 `type: "video"` 可增加 `playbackMode: "external" | "native"`。保留原 `id`、`type`、`url`、`thumbnail`、`title`、`description`、`duration` 及未识别字段。无需改变表结构。空值、非数组和坏项沿用安全降级。投影可以新增独立的 `playback` 结果，原始附件保留在受控数据层。旧客户端兼容前先核对详情返回契约。 [现有媒体类型](../../types/strategy-wall.ts) · [详情读取](../../netlify/functions/_shared/strategy-read.js)

| 记录 | 读取与展示 | 管理端未来写入验证 |
| --- | --- | --- |
| `external` | 封面、标题、简介和“前往视频平台”。只渲染 canonical HTTPS 观看页的普通链接，`target="_blank"` 与 `rel="noopener noreferrer"` | 按精确 origin 和观看页路径解析。候选支持 Bilibili `/video/BV…`、`/video/av…` 和 YouTube `/watch?v=…`。去掉追踪参数及片段，拒绝协议相对、非 HTTPS、带凭据、仿冒域、重定向入口、embed 和直接媒体 URL |
| `native` | 封面、标题、简介和“本站播放”。点击前无 `<video>` 或媒体 `src`，点击后才挂载 `controls`、`playsInline`、`preload="none"` 并响应本次主动播放 | 核对同源 `/guide-videos/` 的已批准对象、MIME、容器及可访问性。当前演示支持 MP4/WebM 路径，实际短片为 MP4。可用存储源必须符合现有 `media-src`，先验收 Range、缓存、文件安全和错误处理 |
| 旧记录未设置模式 | 先按获批本站文件或平台观看页推断。其他旧附件保留元数据并进入审核，必要时显示来源待复核。上线前对既有可播放记录做兼容盘点 | 读取不修改 JSONB，禁止批量补模式。仅对人工确认的单项更新。明确设置的未知模式返回不可用 |

现有 [详情播放器](../../components/guides/guide-video.tsx) 和 [URL 许可](../../lib/guide-media-policy.ts) 允许同源以及一个既有 MDN 演示媒体源，外链历史回退较宽。新 `native` 候选先使用更窄的已登记同源路径，旧文件先验收清单。新 `external` 仅接受明确平台观看页。`javascript:`、`data:`、协议相对、路径穿越或不受信任的来源均无法产生新动作。方案维持现有 `script-src`，不引入 iframe、播放器脚本、预连接或自动解析第三方服务器 URL。服务端不向投稿 URL 发 `HEAD`、下载或做远端转发。 [导出 CSP](../../scripts/generate-export-csp.cjs) · [HTML 媒体加载](https://html.spec.whatwg.org/multipage/media.html#attr-media-preload) · [外链隐私](https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer)

封面从已审核的本站图像资源取值。维持详情和 B1 卡片的现有覆盖顺序，未来新增的外部附件优先配本站可控封面，避免追踪和不必要的第三方请求。展示宽高比固定。封面缺失、未批准或加载失败使用同一占位。播放失败回到封面和重试，键盘焦点回到重试按钮。保留旧时长原字段，页面只在来源明确且已核验时展示，播放次数不从攻略 `view_count` 推断。

## B1 统计与首页契约

现行 `published-valid-url-video-attachments-v1` 按已发布攻略中合格 `type=video` 数组条目计数，排除本站宣传文件。独立旧条目即使同 URL 仍各计一次，指标也不代表成功播放、视频时长或播放次数。增加模式只注解同一条目，新写入按附件 ID 原地更新，防止同一附件同时以两种模式写成两条。重复的写入请求和新重复 ID 拒绝或幂等返回原条目。任何存量去重属于单独的指标迁移。

保留 `latest`、`video`、`pinned` 先过滤后 `LIMIT 3`，摘要缓存按模式区分。首页不提前请求完整详情、播放器、视频或视频平台。统计零值与查询失败继续区分。包含合法 URL 但待审核的旧记录仍按 B1 定义统计。 [设计规则](../../DESIGN.md) · [B1 SQL](../../netlify/functions/_shared/strategy-media.js) · [统计契约](../../netlify/functions/guide-video-stats.js)

## 新旧影响矩阵

| 入口 | A8 实际变更 | 未来开关与回退 |
| --- | --- | --- |
| 首页、精选卡片、视频统计 | 生产组件、API、CSP、资源和指标保留，实验文件在 `artifacts/` | 继续现有摘要合同。将来有开关也只在详情解释模式 |
| `/guides/` 列表与详情 | 原代码保留，另有本机可运行的合成演示 | 在独立 TEST 核对旧数据后先启用详情投影，失败回退既有 reader，原始 JSONB 完整保留 |
| 投稿、编辑、审核、发布 | 旧写入继续关闭 | 正式会话、管理员角色和资产授权通过后才启用。使用事务和并发校验更新同一附件 |
| 数据、存储、统计 | 演示只使用固定合成样本和本机生成短片 | 实际视频对象做权限、MIME、Range 和恢复验证。B1 总数与旧值对账后才能批准 |
| 宣传视频、头像、在线名单 | 保持现有入口和素材，实验脚本仅本机运行 | 头像只填充原框。在线按有效会话、心跳和稳定成员 ID 去重。右侧抽屉仅给已认证成员，公开开关默认关闭，绿色点静态 |

## 本机复现

在仓库根目录运行 `node artifacts/b2-a-8/video-demo/serve.cjs`，浏览 `http://127.0.0.1:3086/`。服务器只绑定环回并校验 Host，只接受固定本地资源的 GET/HEAD。演示使用单独的 CSP，外链为合成地址。短片以 FFmpeg `testsrc2` 生成，无真实攻略、真实账户或第三方依赖。

运行 `node --test artifacts/b2-a-8/video-demo/policy.test.cjs`。浏览器回归使用已安装的 Playwright 和 Edge，`JINXI_PLAYWRIGHT_MODULE` 可指定本机模块，执行 `node artifacts/b2-a-8/video-demo/browser-check.cjs <证据目录>`。外链导航通过拦截验证目标和 opener/referrer，真实视频平台可用性待上线前批准的人工核验。 [浏览器记录](video-demo/evidence/browser.json) · [桌面](video-demo/evidence/video-1440.png) · [移动](video-demo/evidence/video-390.png)
