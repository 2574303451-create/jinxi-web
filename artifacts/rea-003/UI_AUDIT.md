> 2026-11-09 第四阶段工作包1状态同步：本文以下为原UI审计快照，旧业务风险/批次状态不代表当前累计实现；最新状态见CODEX_HANDOFF与artifacts/phase4-integration/REPORT.md。两项既有待办编号此前记于交接摘要，本处同步明确：**UI-DEFER-001 首页FAQ、UI-DEFER-002 公会动态公告弹窗，均待第四阶段后续统一UI验收**。本轮只做原网站组件的本地合成功能接入；没有改FAQ、正式公告弹窗或已认可视觉。1440/1024/768/390/320本地预览截图只证明本轮预览适配，不代表两项视觉待办已关闭。
# JINXI-REA-003 全站 UI 基线审计

## 2026-11-07 用户确认的遗留项登记（第三阶段仅登记）

来源：用户本轮提供的文字观察与代码线索。本轮未取得对应原始截图，未将既有自动化截图冒充这两项的重新验收。以下两项状态均为**待修复**，统一进入**第四阶段完整 UI 一致性验收**。本文其余模块原有未完成、待补截图和限制保持，不因身份开发或本次登记标为完成。

| 编号 | 页面及位置 | 用户实际观察 / 代码线索 | 与 DESIGN.md 的差异 | 未来验收要求 | 业务权限与数据影响 |
| --- | --- | --- | --- | --- | --- |
| UI-DEFER-001 | 首页「入会前，你可能想问」FAQ | 外部纸张卡片基本符合规范；内部项目仍偏扁平浅灰蓝背景、细描边，内外层次、控件及展开状态未统一。检查 app/page.tsx FAQ、components/ui/accordion.tsx、legacy-module 与 styles/guild-theme.css；Accordion 尚有旧透明背景、白字工具类 | 对照白/浅纸底、#ffe528、#2360f5、#151515、2px描边、4/8px硬影、16px卡片/12px按钮圆角及一致焦点。优先修组件职责与源代码，不继续叠加全局覆盖；内层不机械套厚边硬影 | 桌面/平板/手机；长问答、单项/多项展开收起、键盘焦点、aria-expanded/controls、减少动态、可读性与溢出。原文案和问答内容保留；浏览器验收前不得宣称统一 | 静态FAQ；不涉及认证、写权限或数据迁移。本轮不改JSX、CSS、交互、文案或主题变量 |
| UI-DEFER-002 | 首页「公会动态」公告弹窗 | 外框已有纸张、深边和硬影；内层公告卡、辅助提示、文字层次、按钮体系未完全统一。检查 components/cyber-announcement.tsx、其module.css、components/ui/modal.tsx及legacy展示规则 | 同一 DESIGN.md 色彩、描边、圆角、硬影、排版和状态规则；外壳符合不等于内容层完成。按公告内容/控件职责整合，不增加!important、legacy补丁或持续动效 | 桌面/平板/手机；0/1/多公告、长文本/图片、加载、空、失败/重试；本机草稿编辑、键盘/关闭与焦点恢复、滚动、减少动态。保留HTML清理与CSP约束 | 「编辑本机草稿」仅存本地，不能正式发布。未来UI修订不得恢复管理员/公告写入、改既有公告数据或改变权限；本轮只登记 |

本轮身份验证页独立于首页；没有实施以上两项的UI修复，也未将其他历史审计模块改为完成。

后续状态（2026-11-05 / UI-004-A）：双行展播和guild-uptime-terminal内部已真正重构，删除了其终端专用全局兼容规则；原审计表仍保留基线语义。本次验收、截图与限制见[检查点A交付](../ui-004-a/DELIVERY.md)。攻略、签到/任务/排行、组队/数据、公告/赞助、账号/FAQ等仍待UI-004的B/C检查点，不视作完成。

审计日期：2026-11-05。源码基线：`328819a57c671b33b743d1ad3f969c0fb7917048`（用户已审查的 REA-002 成果）。实施分支：`codex/jinxi-rea-003-batch-1`。**本文件是实施前的清查，不是所有批次已经完成的声明。** 源码行号均指上述固定提交；第一批修改后的行号可能移动。

静态清查读取了 `COLLABORATION.md`、`WEB_EXPLORATION.md`、`AGENTS.md`、`DESIGN.md`、REA-002 调查及交付文档、主题 CSS，以及首页/布局的递归导入图。没有登录真实账号、调用写入接口或修改服务端权限。可达文件图见 [ui-import-graph.json](ui-import-graph.json)，样式定位线索见 [ui-style-markers.json](ui-style-markers.json)。静态代码证据不标为目标站 A 类浏览器实测；目标站定向研究另见本轮 REA 报告。

## 判定方法与边界

- **R（真正重构）**：组件 JSX 本身使用明确的 `guild-*` 等新设计职责，面板、卡片、按钮和状态直接采用当前设计系统。
- **W（覆盖换肤）**：组件源代码仍含旧白字、透明底、彩色渐变、发光、卡通字体/动画，通过 `.jinxi-dialog` 或 `.legacy-module` 的属性选择器和 `!important` 被改色或隐藏。屏幕看起来变浅，不等于内部重构。
- **M（混合）**：新外壳/错误提示已经重构，但内部主要布局和控件仍为 W。
- **U（遗留未覆盖）**：可达组件仍直接输出旧风格，并且不完全处于上述覆盖范围。

只有 `app/page.tsx` 一个用户页面路由。功能页大多是该页面的状态弹窗，不应把文件名当成独立路由。`app/page.tsx:802` 是导航入口，`:826` 是通用业务弹窗，`:1179` 是攻略入口。成员详情还可从首页六张成员卡直接打开，不只来自“全部成员”。

下文优先级中 P1 为本轮核心一致性或关键交互，P2 为剩余精修；P0 专指既有积分身份授权风险，单独记录，不能借视觉任务宣称已解决。第一批仅覆盖留言与成员及必要共享基础；第二、第三批保留独立验收点。

截图根目录是 `artifacts/rea-003/before/`。`{1440,768,390}` 表示三个已存在文件；其他行明确标“待补”，并给出建议拍摄名。已有 PNG 由主任务真实浏览器捕获，本静态审计没有据此宣称交互通过。fixture 有数据截图只证明 UI 可渲染，不代表真实 API/认证/写入成功。

## 主题 CSS 清查

| 范围（基线） | 已有规则 | 问题与迁移要求 |
| --- | --- | --- |
| `styles/guild-theme.css:1` | 浅纸底、白面板、黄强调、蓝标题、2px 深边、4/8px 硬阴影、16/12px 圆角、200/300ms 时长 | 保留已认可方向；新组件直接消费语义变量，不另建一套审美。 |
| `:54`、`:63` | focus-visible、1248px 版心、全局侧距 | 保留；控件实际可达性、焦点和溢出仍须浏览器验证。 |
| `:1031`、`:1050`、`:1070` | 原生 dialog 外框、sticky 标题、正文 padding | 外壳为 R；不代表所有后代已重构。需检查嵌套弹窗、滚动锁和焦点恢复。 |
| `:1119`—`:1164` | `:is(.jinxi-dialog,.legacy-module)` 按类名子串改白字/彩色字/透明底/渐变/字体/边框，大量 `!important` | 覆盖依赖旧 Tailwind 类名、内联 style 的序列化；误伤合法图片遮罩/语义色，不能表达组件状态。应按批次减少，未改的组件继续保留兼容层。 |
| `:1166`—`:1192` | 后代按钮最小 44px；输入框强制白底黑边；渐变按钮/`.cartoon-btn` 强制黄底和 3px 阴影 | 仅基础可读性补丁；不统一按钮层级、筛选选中、错误和禁用布局。 |
| `:1194`—`:1207` | 轮播强制 440px、恢复舞台白字、停用含 `animate-` 的类、隐藏 conic-gradient | 依赖例外规则，粒子 Framer 动画和 inline shimmer 不等于被清除；第一批应移除对应旧 JSX 装饰。 |
| `:1218`、`:1229`—`:1253` | Toast 强制浅底；对 dialog 中 blur、攻略背景、公告 CSS module 名做覆盖；公告内部 header 隐藏 | Toast 和公告属于 M/W；精修要回到各自源组件，不能只添加更多选择器。 |
| `:1255`—`:1288` | 公告/赞助悬浮按钮重染；运行时间终端移入正常文档流，仅 miniDock 按钮换肤 | 展开的终端不在 `.legacy-module`/`.jinxi-dialog` 范围，深色霓虹仍存在，第三批必须包括它。 |
| `:1291`、`:1632` | 多个响应式断点，reduced-motion 停 CSS animation/transition/scroll | 不能由 CSS 停用就推断 JS timer 或所有 Framer 循环已停。第一批轮播、展播需要各自逻辑尊重 reduced-motion。 |

`app/layout.tsx:4`—`:5` 只导入 globals 与 guild-theme；旧 `styles/cartoon-theme.css` 未被导入。遗留 `.cartoon-*` 类即使已不再有旧全局定义，也仍是未迁移的源代码，不能把“旧类失效”算作设计完成。`app/globals.css:31` / `:33` 的 shadcn HSL `--muted` / `--accent` 与后导入 guild 颜色同名；当前可达 UI 未使用那批 shadcn 控件，今后接入时需避免把 hex 值传给 `hsl(var(...))`。

## 已认可首页：保留与回归清单

| 模块/源文件（基线） | 已完成 | 遗留与原因 | 交互和数据来源 | CSS / 优先级 / 批次 | 对应截图 |
| --- | --- | --- | --- | --- | --- |
| 导航及账号菜单 `components/home/guild-navigation.tsx:19` | R；专用新导航、移动展开、账号 details 菜单、明确 CTA | 不重新生成；需回归菜单跳转后关闭、Escape 返回菜单按钮、账号菜单 | 页面状态；锚点 about/members/actions；公告自定义事件；攻略/登录/改密/退出回调 | `.guild-header/.guild-nav/.guild-links/.account-menu`；P1 回归 | `before/homepage-{1440,768,390}.png`；独立移动展开/账号菜单待补 |
| Hero/视频 `components/home/guild-hero.tsx:15` | R；已批准构图、今夕自有素材、用户入口切换、视频主动播放/8 秒降级 | 不改视觉方向；视频/封面及按钮要回归 | `/1.mp4`、`/bg.png`、原有图片；加入表单/滚动 | `.guild-hero/.audience-switch/.hero-video`；P1 回归 | `before/homepage-{1440,768,390}.png`；视频播放/失败专项待补 |
| 公会介绍与管理团队 `components/home/guild-sections.tsx:49`；`components/home/guild-members.tsx:24` | R；专用入口卡和管理名片 | 静态活动信息仍以“待确认”边界处理；不要改成员文字或把静态数量当实时统计 | 首页静态文案、`managementTeam`；公告与入会回调 | `.guild-panel/.management-*`；P2 回归 | 全页 before 截图待补；REA-002 `jinxi-final-full-*.png` 仅历史参考 |
| 首页成员六卡 `components/home/guild-members.tsx:87` | R；原生 button 卡片、图文层级、查看全部/轮播入口 | 卡片打开的详情仍为 W，不能称整条链路完成 | `app/page.tsx:499` 的 allMembers；截取前六；成员详情状态 | `.guild-member-card/.member-cover`；P1 第一批（详情） | `before/homepage-{1440,768,390}.png`；独立卡片 hover 待补 |
| 成员行动与游客入口 `components/home/guild-sections.tsx:158`；`app/page.tsx:829` | R 的外部行动卡；游客任务/组队/游戏引导有明确登录入口 | 打开业务组件后仍是 W；游客引导不代表服务端鉴权 | 原有页面登录状态；五类业务面板 | `.action-grid/.action-card/.guild-empty`；P1 回归/第二三批内部 | `before/tasks-guest-1440.png`；768/390 和其他游客面板待补 |
| 公告预览与交流入口 `components/home/community-updates.tsx:10` | R；真实 API 加载/空/失败/重试；留言/攻略新入口卡 | 留言动态展播基线不存在，第一批新增；不得虚构留言 | `services/announcement-service.ts:50`；打开公告/留言/攻略 | `.announcement-feed/.feed-state/.community-door`；P1 第一批展播/首页回归 | 全页 before 待补；REA-002 历史截图可回看 |
| 加入横幅与页脚 `components/home/guild-sections.tsx:197`；`app/page.tsx:825` | R；独立新横幅和页脚 | 表单内部尚 W；保持批准的首页 | 加入弹窗、回到顶部；静态品牌说明 | `.join-banner/.guild-footer`；P2 回归 | `before/homepage-full-{1440,768,390}.png`；表单见 `before/join-{1440,768,390}.png` |

## 第一批：留言墙、成员与必要共享基础

| 模块/源文件（基线） | 已完成的改造 | 未完成旧样式、具体不一致 | 交互与数据来源 | 涉及 CSS / 优先级 / 批次 | 对应截图 |
| --- | --- | --- | --- | --- | --- |
| 留言标题/筛选/发布表单 `components/message-wall.tsx:284`、`:321`、`:347` | M；dialog 外框、明确 API 错误重试、登录昵称填充 | 内联半透明渐变主容器、glass 发布框、白字、蓝色渐变按钮、类别随机颜色；缺组件语义样式，全靠全局后代映射 | `services/message-wall-backend.ts:9` GET messages；`:58` POST；昵称/分类/正文/图片；成功后更新原每日留言进度 | `.message-wall` + Tailwind + inline；guild-theme `:1119`—`:1192`；P1 第一批 | `before/messages-form-{1440,768,390}.png`；改造后 focus 见 `after/messages-form-focus-*` |
| 留言卡/置顶/反应/回复 `components/message-wall.tsx:453`、`:462`、`:535`、`:561` | W；原功能存在，空数据有文字 | 透明模糊卡片、彩色圆头像、低透明文字、hover 变半透明，表情/回复未统一描边与状态；缺专门长文本/窄屏规范 | 同一公开数组；message-actions 的 reaction/reply/pin/delete；用户标识为浏览器原有 getUserId；删除先 confirm；置顶/删除需管理员密码 | 原 Tailwind/inline background；全局 `.legacy-module` 覆盖；P1 第一批 | `before/messages-card-{1440,768,390}.png`；第一批回复/选中测试见 DELIVERY.md |
| 留言加载/空/错误 `components/message-wall.tsx:270`、`:319`、`:445` | M；loadError 不伪造数据，重试可达 | loading 白边 spinner/白字；空状态只大 emoji 和一行灰字；未形成同一 state 面板，首次失败与真正空数据需明确区分 | GET 状态，不调用写入；重载按钮 | `.module-error` + 旧透明工具类；P1 第一批 | `before/messages-loading-{1440,768,390}.png`、`before/messages-empty-{1440,768,390}.png`、`before/messages-error-{1440,768,390}.png`（拦截 fixture） |
| 留言图片预览 `components/message-wall.tsx:630` | W；已有点击图片/关闭 | fixed 黑遮罩 z50；不是独立原生 dialog，缺自身 focus trap/返回焦点/Escape 约束；放在原生父 dialog 内，需实测 top-layer 与滚动 | 已公开留言 imageUrl；不新增数据来源 | 自建 fixed div、`bg-black/80`、圆形关闭按钮；P1 第一批 | `before/message-image-{1440,768,390}.png`；基线只有父原生 dialog，子 fixed 层可见但无独立焦点圈定 |
| 图片选择/错误/移除 `components/ui/image-upload.tsx:17`、`:129` | W；类型/大小/数量校验、FileReader 本地预览 | 虚线半透明白边/白字、红色圆形删除按钮只在 hover 显示；触屏与键盘入口语义不足，组件底层需统一；不能只重染父容器 | 留言传 Base64 到原 API；本地选文件本身不是上传成功；基线仅留言调用，攻略使用独立 MediaUpload | 旧 `text-white/bg-white/border-white` 工具类；P1 第一批（兼容第二批） | `before/image-upload-{1440,768,390}.png`；第一批大小/类型/移除已做内存 UI 测试，见 DELIVERY.md |
| 管理员密码验证 `components/ui/admin-password-dialog.tsx:15`、`:57` | W；异步 onConfirm、空密码/后端错误、提交禁用 | white/95 blur 玻璃框、细白边、蓝渐变；fixed div z250，没有原生 dialog/独立可访问对话框语义；留言和攻略都调用，嵌套行为需保持 | 密码传原 message-actions 或 strategy-actions；客户端非空检查不等于鉴权；不改密码或服务端权限规则 | 旧 Tailwind/inline 渐变；P1 第一批共享 | `before/admin-password-{1440,768,390}.png`；第一批验证错误/重试见 `after/messages-admin-error.png`，非真实后端授权 |
| 首页动态留言展播（基线无组件） | 未实现；首页只有留言入口卡 | 不能把旧 marquee demo 当成真实上线留言带；应原创实现当前公开数据的简洁展播，暂停/焦点/触摸/reduced-motion/失败降级完整 | 仅复用公开 GET 返回字段；定位与公开条件限制见下节；不得展示 reactions.users/后台资料 | 新的专用语义类；P1 第一批 | 无改造前组件；记录现有首页 `before/homepage-*`，改造后需三宽度/暂停/空/失败截图 |
| 成员轮播舞台与控制 `components/magicui/3d-carousel.tsx:21`、`:90`、`:185` | M；上一张/下一张/暂停/页码；useReducedMotion 停自动 timer；Enter/Space 可开详情 | 3D 大半径舞台、蓝色选中光晕与软阴影、透明渐变卡、8 个无限粒子；点击仅选中/双击开详情，手机无明显详情入口；空数组 `360 / totalMembers` 与取余有无效值风险 | `app/page.tsx:411` carouselMembers 原始静态数组；3000ms 自动切换；前后操作会暂停 | `.carousel-stage/.carousel-3d` + inline 发光/Framer；guild-theme `:1194`—`:1207` 是补丁；P1 第一批 | `before/carousel-{1440,768,390}.png`；第一批键盘/触摸/自动/空状态结果见 DELIVERY.md |
| 成员角色筛选/网格/加载更多 `components/magicui/member-grid.tsx:21`、`:48`、`:69`、`:167` | M；角色 filter、分批加载、键盘详情、图片失败 logo 回退 | bg-white/5、hover scale1.05/图片1.1、暗色 hover 渐变描述、彩色角色胶囊、旋转 conic-gradient 边框；不存在专门 empty panel；loading 不是异步数据 | 仍使用 allMembers；客户端过滤和每次增加展示数量；不更改昵称/角色/描述，不推算实时会员量 | `.member-grid` + 工具类/inline；conic 被隐藏而非源头删除；P1 第一批 | `before/members-{1440,768,390}.png`；第一批筛选/缺图/空状态见 DELIVERY.md |
| 成员详情 `components/member-detail-modal.tsx:22`、`:85`、`:102`、`:172` | M；新 Modal 壳、图片错误 logo 回退；姓名/角色/介绍保留 | 旋转流光边、深蓝渐变内层、shimmer、角色渐变、渐变透明标题、引用软玻璃；多处 Framer 入场与动态色，覆盖不能表达统一状态 | 首页卡、MemberGrid、Carousel3D 共用；原始 member props；imageLoaded 控制模糊 | `.jinxi-dialog` 外壳 + 旧 inline conic/linear/radial gradient；P1 第一批 | `before/member-detail-{1440,768,390}.png`；第一批二层返回/缺图/长文见 DELIVERY.md |
| 通用业务弹窗 `components/ui/modal.tsx:14` | R 的 native dialog、标题、Escape、Tab 环绕、关闭回焦/背景点击 | 是共享基建而不是完成所有业务组件；每个实例独立保存并恢复 body overflow，嵌套关闭顺序/焦点范围需要实际验证；通用补丁不应继续扩张 | 原 activePanel 和所有嵌套详情/表单；不承担账号鉴权 | `.jinxi-dialog/.dialog-heading/.dialog-body`；P1 第一批必要基础 | `before/member-detail-{1440,768,390}.png`；独立焦点/二层滚动锁已在第一批测试，见 DELIVERY.md |
| 图片资源回退 `components/home/guild-image.tsx:11`；`components/ui/optimized-image.tsx:25` | 前者 R：首页图片失败改用现有 logo；后者 W：Next Image 正常/错误/加载分支 | GuildImage 的 logo 再失败没有第二级文字占位；OptimizedImage loading 仍是 white/20 blur + 蓝 spinner；头像渐变导出未被实际用到，不应宣称可达头像组件已重构 | 项目既有图片与公开留言图片；图片失效不是伪造新素材 | `.guild-image` 及 OptimizedImage 的工具类；P1 第一批必要回退 | 基线图片选择见 `before/image-upload-{1440,768,390}.png`；第一批 `after/member-image-loading-*` / `after/member-image-fallback-*` / `after/message-image-error-*` |

### 留言公开条件与定位的实际能力

`netlify/functions/messages.js:50`—`:54` 的 GET 未要求登录，固定返回最多 100 条，置顶优先、创建时间倒序。返回昵称、正文、分类、颜色、图片、时间、置顶、反应和回复；`services/message-wall-backend.ts:9` 做日期及默认字段归一化。**接口没有 visibility、moderation、首页展示授权字段，没有公开筛选参数，没有分页，也没有按 id 读取单条的查询。** API 已公开返回只能证明当前公开读取事实，不能证明每条数据有新的首页展示授权，更不能把置顶等同展示同意。

基线 MessageWall 只支持本地分类过滤，没有 initialMessageId、URL hash 定位或独立留言路由。新展播至多可在同次公开 GET 的当前集合中按 id 打开/定位；无法保证前 100 条之外、已删除或已变化的目标可打开。缺目标应明确提示，不能跨权限拉取资料。默认只考虑昵称、正文摘要、分类、时间；不要将反应用户标识列表、回复作者或后台字段带上首页。无公开数据/失败应隐藏展播或显示准确状态，不补假发言。

发布/回复/表情与 pin/delete 都是原有业务能力，保留原 action payload、管理员密码流程和后端判定。第一批截图可用明确标识的本地 fixture；**本轮未以 fixture 证明真实发布、回复、管理员验证或删除成功。**

## 第二批：攻略、签到、任务与排行（本文件清查时未实施）

| 模块/源文件（基线） | 已完成 | 遗留与原因 | 交互与数据来源 | CSS / 优先级 / 批次 | 对应截图 |
| --- | --- | --- | --- | --- | --- |
| 攻略墙/搜索/分类/难度/排序/卡片 `components/strategy-wall.tsx:33`、`:219`、`:260`、`:359` | M；新 Modal 壳、API 错误/重试、原分页 | 大幅 inline 深色 SVG 背景、模糊卡、白字、软阴影/scale、暗色 option、四种彩色焦点；双重标题/关闭按钮；管理动作仅 group-hover 显示对触屏不友好 | `strategy-wall-service.ts:13` 查询 strategies；like/favorite/view/pin/delete 走 strategy-actions；详情/投稿/管理员嵌套 | `.strategy-content.legacy-module` + guild-theme `:1232` + 旧工具类；P1 第二批 | `before/strategies-{1440,768,390}.png`（明确合成攻略 fixture） |
| 攻略详情/评论 `components/strategy-detail-modal.tsx:20`、`:64`、`:195` | W 的内部、R 的壳；保留作者/标签/评论/媒体 | 深蓝渐变页面、prose-invert、透明面板、白字/彩色互动；封面 w48 与水平标题行在手机需专项排版；share URL 可读路径需复核 | strategy props 与 strategy-actions；评论、like/favorite、浏览量、分享；真实写入不可用生产数据测 | 旧 Tailwind + `.jinxi-dialog` 映射；P1 第二批 | `before/strategy-detail-{1440,768,390}.png`（合成内容；view POST 本地截断） |
| 攻略投稿/预览/标签 `components/strategy-submission-modal.tsx:17`、`:121` | W；原校验、作者锁定、媒体与预览 | 深蓝渐变、cyan/purple/pink/green 多色渐变按钮、blur 表单/标签、嵌套滚动 min-height700px，状态层级未统一 | submitStrategy POST；现有浏览器账号信息用于 UI 作者；不能当服务端认证证据 | 旧 Tailwind/Framer；P1 第二批 | `before/strategy-submission-{1440,768,390}.png`；仅打开表单，不投稿 |
| 攻略媒体选择/预览 `components/ui/media-upload.tsx:24`；`components/ui/media-gallery.tsx:14` | W；文件/URL 两模式、图片/视频预览/放大 | 透明输入/卡片、彩色提示、黑色全屏预览；MediaGallery `:159` 使用未支持的 size="large"，属于实际类型基线问题；多层 dialog 行为需回归 | 原 MediaFile 数组、本地 FileReader/外部 URL；不新增上传服务 | 旧工具类 + 嵌套 Modal；P1 第二批 | `before/media-upload-{1440,768,390}.png`、`before/media-gallery-{1440,768,390}.png`、`before/media-preview-{1440,768,390}.png` |
| 签到与历史 `components/checkin-widget.tsx:15`、`:114`、`:130`、`:231` | M；游客引导、账号状态/错误、原接口 | 模糊透明卡、白字、蓝紫/绿渐变签到、彩色指标；历史独立 fixed 深色弹层、无统一 dialog 焦点；加载/失败时奖励和统计的呈现要验证真实语义 | `checkin-service.ts:17`/`:53`/`:75`；points 汇总；保留设备标识和任务 streak 更新 | 旧 Tailwind/inline + `.legacy-module`；P1 第二批 | `before/checkin-guest-{1440,768,390}.png`；仅游客，真实有数据/历史/写入尚未验证，第二批处理 |
| 每日/每周/成就任务 `components/daily-tasks.tsx:13`、`:104`、`:143`、`:161` | W；账号入口门槛、后台积分加载占位 | cartoon-card/button、candy/rainbow 渐变文字、ZCOOL cursive、浮动 emoji、渐变进度和脉冲领奖；状态与领取反馈未按新规范重构 | daily-task-service 本地进度/统计；原 claimReward；points 汇总及原上报路径；不改变奖励规则 | `.cartoon-*`、`.gradient-text-*`、旧动画，部分通过覆盖失效；P1 第二批 | `before/tasks-{1440,768,390}.png`；本地 UI 身份 fixture，不代表登录或奖励验证 |
| 签到排行榜 `components/leaderboard-widget.tsx:13`、`:94`、`:111` | M；错误时 guild-empty/重试；原五分类与刷新 | 加载/正常内部仍透明卡、白字、排行彩色渐变/软面板，列表/说明视觉未统一 | `checkin-service.ts:104`/`:125` leaderboard GET；总/连续/月/积分/最长连续 | `.guild-empty` + 旧工具类/inline；P1 第二批 | `before/rankings-fixture-{1440,768,390}.png`；三宽度合成正常态，基线其他状态仍待第二批测试 |
| 活动积分排行榜 `components/points-ranking-widget.tsx:63`、`:84`、`:145` | W；GET、加载、错误和空数组分支；失败不绘制总分 | 透明卡、三种彩色统计、奖台/表格混排、细白边；公开显示账号与余额是既有信息范围，不能扩散到新首页展播 | points-board GET limit30；entries、overview、sceneSummary；self 仅界面高亮 | 旧 Tailwind/inline + `.legacy-module`；P1 第二批 | `before/points-ranking-{1440,768,390}.png`；合成正常态，不扩散账号/余额至首页 |

## 第三批与其余真实入口（本文件清查时未实施）

| 模块/源文件（基线） | 已完成 | 遗留与原因 | 交互与数据来源 | CSS / 优先级 / 批次 | 对应截图 |
| --- | --- | --- | --- | --- | --- |
| 组队列表/排行/当前队伍/申请 `components/team-system.tsx:18`、`:79`、`:305` | W；首页已给本地记录/默认示例提示 | cartoon 标题按钮、渐变指标、浮动图标、透明卡；申请 fixed 深灰弹层、alert/confirm；尚无统一空状态，原本地自动通过行为不可暗改 | `team-service.ts:188`/`:208`/`:233`/`:249`/`:366`，localStorage；不改成云端，不把示例胜率/排名作实时统计 | 旧工具类/inline；P1 第三批 | `before/teams-{1440,768,390}.png`、`before/teams-ranking-{1440,768,390}.png`；原浏览器本地默认示例 |
| 游戏装备/宠物/角色/成就 `components/game-data-panel.tsx:12`、`:58`、`:402` | W；首页已给本地记录/示例提示 | 四标签混合彩虹字、稀有度发光、渐变面板与进度、弹跳/浮动；未按新卡/标签/状态规范；需保留全部原字段 | `game-data-service.ts:270` 读取/初始化默认数据；`:375` 切宠物写本地；不接游戏实时战绩 | 旧工具类/inline getRarityGlow；P1 第三批 | `before/game-{1440,768,390}.png`、`before/game-pets-{1440,768,390}.png`、`before/game-character-{1440,768,390}.png`、`before/game-achievements-{1440,768,390}.png` |
| 公告列表与管理员校验 `components/cyber-announcement.tsx:333`、`:531`、`:612` | M；新 Modal 壳、真实加载/空/失败/重试、公告入口事件 | module 仍深色赛博底、霓虹描边/软光/半透明文本，由主题按类名子串覆盖；旧 header 被隐藏；表单语义色未整体重构 | announcement-service GET、verify token、POST；原 localStorage admin token；不在报告记录 token；保留原权限 | `cyber-announcement.module.css:19`/`:45`/`:55`/`:157`/`:268`；guild-theme `:1235`；P1 第三批 | `before/announcements-{1440,768,390}.png`、`before/announcement-admin-{1440,768,390}.png`；未验证真实权限或发布 |
| 公告富文本编辑器/Emoji/图片 `components/cyber-announcement.tsx:85`、`:259`、`:592` | W；编辑命令/选择恢复/图片校验仍在 | dark CSS module 工具栏、编辑面板、URL 输入/emoji popover，旧色与 focused 状态依赖覆盖；仅管理员确认后可达，不可擅测发布 | 原 contentEditable 与本地 Base64/URL；原 sanitize/render 流程；本轮不改权限和上传服务 | module `:303`—`:452`；P2 第三批 | 需授权测试环境/只读 fixture 的 `before/announcement-editor-*` 待补 |
| 赞助/登记/感谢名单 `components/guild-sponsorship.tsx:14`、`:103`、`:115` | M；新壳、GET 列表、错误/空数据、保留原二维码 | 渐变悬浮按钮在首页被重染；内部白字/透明表格/绿渐变按钮，仍 W；二维码不更换、不生成伪支付资料 | sponsorship GET/POST，登记仅原昵称；不执行支付/登记生产写入 | 原工具类/inline；guild-theme `:1261`；P1 第三批 | `before/sponsorship-{1440,768,390}.png`；合成登记数据，没有支付/登记写入 |
| 运行时间终端（收起/展开/查询） `components/guild-uptime-terminal.tsx:36`、`:170` | M/U；collapsed dock 被换成白底硬阴影，位置改为文档流 | 展开 terminalPanel 仍独立深蓝玻璃、青色数字光、scan/光标动画、条码底；该区域不在 legacy/dialog 覆盖范围；“在线”是静态标签，不能当实时监控数据 | config/guild-terminal.config.json 及 `lib/guild-terminal-config.ts`；本地查询工号/昵称/日期，500ms UI 延迟；每秒计算时长，不请求在线 API | `guild-uptime-terminal.module.css:61`/`:164`/`:241`/`:264`；guild-theme `:1273` 只改 dock；P1 第三批 | `before/uptime-{1440,768,390}.png`；展开的真实本地终端，未查询生产档案 |
| FAQ `app/page.tsx:740`、`:818`；`components/ui/accordion.tsx:21` | M；新外 panel | Accordion 内仍白字/透明面板和 border-white；Framer 展开，触发按钮缺明确 aria-expanded/controls 关联；不能只靠变黑文字 | 静态 faqItems；单/多开状态，不查 API | `.faq-panel.legacy-module` + 旧工具类；P2 第三批 | `before/faq-{1440,768,390}.png`；真实静态问答展开 |
| 加入表单/邮件进度与回退 `app/page.tsx:354`、`:840` | M；新 Modal 壳、原表单/反馈、现有联系渠道 | 输入白字/透明底、暗 option、彩色内联按钮、未统一可读 label/状态层级；不改外部邮件配置/收件人 | `components/email-service.tsx:131`；原 EmailJS→备用通道→mailto；只读 UI 检查，不发送真实邮件 | `.jinxi-dialog` + 旧工具类/inline；P1 第三批 | `before/join-{1440,768,390}.png`；未发真实邮件，发送/失败进度未验证 |
| 登录/修改密码/显隐密码 `app/page.tsx:182`、`:246`、`:945` | M；新 Modal 壳、原校验/忙碌/错误、成功恢复界面状态 | tab 仍 emerald/blue 半透明，表单/错误/按钮为旧工具类；无新控件规范；本轮不重新设计认证协议 | auth-login / auth-change-password；页面 localStorage account/profile 只作已有 UI 状态，不等于服务器凭证 | 旧 Tailwind/inline + `.jinxi-dialog`；P1 第三批 | `before/auth-{1440,768,390}.png`、`before/password-{1440,768,390}.png`；无登录/改密请求 |
| Toast/懒加载/浏览器 alert-confirm `components/ui/toast.tsx:28`、`:65`；`components/ui/loading-spinner.tsx:10`；`app/page.tsx:36` | M；Toast class/role=status、CSS 浅色硬影；Suspense 有 status | Toast 源 getToastStyles/关闭按钮仍旧颜色，通过 !important 映射；spinner 蓝色；alert/confirm 是浏览器原生 UI，不可用截图替代业务反馈一致性 | 原各组件调用；auto dismiss timer；ComponentLoader 懒加载 | `.guild-toast/.module-loading` + 旧工具类；P2 第三批，第一批必要状态可直接规范 | `before/feedback-{1440,768,390}.png` 待补 |

## 不可达代码与未出现的界面

静态图从 `app/page.tsx` 和 `app/layout.tsx` 出发，扫描静态导入、`lazy(import(...))` 和 `dynamic(import(...))`。在基线导入图中，下列文件没有用户入口，**没有把它们算作“全站已统一”或待验收的真实弹窗**：

- `components/hidden-easter-eggs.tsx`、`components/analytics/busuanzi-counter.tsx`、`components/theme-provider.tsx`。
- `components/magicui/marquee.tsx`、`components/marquee-3d.tsx`、`components/marquee-demo.tsx`；它们不是基线首页动态留言展播。
- 未被首页图导入的 shadcn 控件：`components/ui/alert-dialog.tsx`、`alert.tsx`、`aspect-ratio.tsx`、`avatar.tsx`、`badge.tsx`、`breadcrumb.tsx`、`button.tsx`、`calendar.tsx`、`card.tsx`、`carousel.tsx`、`chart.tsx`、`checkbox.tsx`、`collapsible.tsx`、`command.tsx`、`context-menu.tsx`、`dialog.tsx`、`drawer.tsx`、`dropdown-menu.tsx`、`floating-bubbles.tsx`、`form.tsx`、`hover-card.tsx`、`input-otp.tsx`、`input.tsx`、`label.tsx`、`menubar.tsx`、`navigation-menu.tsx`、`pagination.tsx`、`popover.tsx`、`progress.tsx`、`radio-group.tsx`、`resizable.tsx`、`scroll-area.tsx`、`select.tsx`、`separator.tsx`、`sheet.tsx`、`sidebar.tsx`、`skeleton.tsx`、`slider.tsx`、`sonner.tsx`、`switch.tsx`、`table.tsx`、`tabs.tsx`、`textarea.tsx`、`toaster.tsx`、`toggle-group.tsx`、`toggle.tsx`、`tooltip.tsx`、`use-mobile.tsx`。
- 文件级可达不等于每个导出都渲染：`components/ui/optimized-image.tsx:117` 的 AvatarImage、`components/ui/loading-spinner.tsx:30` 的 LoadingSkeleton 未找到实际调用；不将其“头像渐变/骨架”列为屏幕已出现事实。
- `services/points-service.ts:83` 的 createRedeemOrder 没有实际 UI 调用。当前页面只有积分/排行入口，不能凭服务函数存在就称“兑换弹窗可达”。同理游戏服务 equipItem/unequipItem 等函数不自动证明有装备编辑入口。

本图不尝试判断第三方库内部组件，也不把数据类型、服务函数或邮件 HTML 当作浏览器中的独立页面。UI 样式 marker 是定位辅助，既可能命中新设计的合法阴影，也可能漏掉组合类名，不能用命中数当完成率。

## 状态/交互验收矩阵

| 第一批对象 | 基线有数据 | 空/加载/失败 | 必须补充的真实交互 | 测试限制 |
| --- | --- | --- | --- | --- |
| 留言 | 三宽度表单/卡片 fixture PNG | 三宽度 empty/loading/error PNG | 分类、刷新、输入 focus、图片选择移除/超限、反应选中、回复展开、图片预览、管理员弹窗开关/错误；定位缺失提示 | 所有写入只可使用授权测试环境；拦截响应不得称后端成功 |
| 动态展播 | 基线无该组件 | 新实现必须覆盖无数据、慢请求、失败 | 按内容宽度速度、hover/focus 暂停、手动暂停、移动横向浏览、点击定位、reduced-motion | 只使用现有公开数据；不带内部/私密字段 |
| 轮播 | 三宽度 PNG | 空数组、单成员、缺图待补 | 前后/页数、暂停、自动播放、触摸、Enter/Space/方向键、可见详情入口、reduced-motion | 原静态数据不可删减；空/单状态只在独立 fixture 验证 |
| 成员列表/详情 | 三宽度网格及详情 PNG | 筛选空、缺图、长文本待补；静态数组不存在真实网络 loading，勿编造 | 角色 selected 状态、加载更多、按键开详情、焦点圈定、Escape、回到触发卡、轮播→详情二层弹窗关闭后父层仍可用、背景不滚动 | fixture 只改变测试数据副本；保留原昵称/角色/介绍 |

完整浏览器验收结果应由本轮测试报告补齐。本静态审计没有把“源码有 onKeyDown/role”当成键盘通过，也没有用构建或现有三张 PNG 代替上述状态验收。

## P0、剩余工作与回滚

既有积分 P0：`netlify/functions/points.js:165` / `:173` / `:210` / `:216` 从请求接收账号；`:234` / `:242` 奖励分值、`:269`—`:287` 兑换价格信任边界。账号存在性不构成已认证会话绑定。**本轮不修改该规则，不扩大写入口，不宣称已修复。** 真实漏洞利用、生产数据库权限和数据状态未做验证。

第一批完成后仍需按上表处理第二批的攻略/媒体/签到/任务/排行，第三批的组队/游戏数据/公告/赞助/终端/FAQ/加入/账号/反馈。保留已批准首页，仅回归其入口。每批分别交付截图、状态与交互、工程基线比较和修改清单；不能把兼容覆盖还存在的组件写为 R。

源码基线已由完整提交保存。回滚首选从该提交建立独立分支或 worktree 对照，按本轮提交 revert，不执行 `reset --hard` 覆盖用户工作。此清查产物只新增审计文档与 JSON，不修改业务源码。


## 浏览器补充清查与第一批现状

已在独立 detached worktree `E:/Recovery/jinxi-rea-003-baseline` 运行同一固定基线，完成其余真实入口的三宽度截图，详情见 `before/capture-extra-1440-390.json` 和 `before/capture-extra.json`（768）。两次采样 errors 均为空；浏览器 localStorage 只模拟 UI 状态，全部 API 请求拦截，攻略浏览量 POST 仅本地返回，未触达生产。`before/capture.json` 记录第一批原状的三宽度捕获。

表中 R/W/M/U 仍指基线源码，供第二、三批追踪。本轮已经真正重构留言墙、成员轮播/列表/详情，新增公开留言展播，重构必要共享管理员验证和图片组件；具体 after 截图、当前文件清单与测试结果见 [DELIVERY.md](DELIVERY.md)。不把旧样式兼容层仍存在的其余组件算作完成。

真实浏览器补充发现旧留言 fixed 图片层和管理员层实际可见，不能一概说被原生 top-layer 遮挡。实测只有一个父原生 dialog，子层没有独立 Escape/焦点管理，按 Escape 会直接关闭父层。第一批改为独立嵌套 dialog 后验证只关闭最上层，并回到触发控件。
