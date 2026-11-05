# JINXI-005S-NEXT｜A+交付

仅交付A+：宣传视频弧形箭头、统计与攻略推荐回归、prebuild可靠性及性能证据。B1等待本轮验收，B2需另行授权和隔离环境，C未开始。

## 基线与预览

- 基线分支 `codex/jinxi-arch-005s-a`，完整SHA `04ca4ef972636ef7ac8169d80db2dbf4af9d8b00`。本地开始时干净，远端一致。
- 新分支 `codex/jinxi-005s-next-a-plus`，从该实际HEAD创建，没有回退到005/005R。最终完整提交SHA在交付回复和PR HEAD中核对。
- PR依赖 #6→#5→#4→#3→#2→#1，均为open/draft/未合并，查询快照 `pr-baseline.json`。
- 当前电脑只读预览：`http://127.0.0.1:3029/`；截图/报告画廊：`http://127.0.0.1:3029/review/`。攻略为真实公开响应的脱敏快照；留言为清楚标记的合成数据。写入请求被拒绝，不连接生产数据库。
- 重启预览：在仓库执行 `node artifacts/005s-next-a-plus/serve.cjs out 3029`。需要先 `npm run build`。不部署生产。

## 实际产品改动

| 文件 | 变化 |
| --- | --- |
| components/home/guild-hero.tsx | 原details外加局部容器及装饰SVG，保留原视频/播放/错误逻辑与原生summary；仅整理原缩进 |
| styles/guild-theme.css | 仅video入口容器/箭头样式；桌面长弧、手机短弧、极窄缩放仅箭头；open隐藏；不添加!important或持续动画 |
| config/guild-archive-source.json | 新增已核实时间与源哈希绑定记录，无成员身份数据 |
| scripts/generate-guild-summary.cjs | 完整历史核对/浅克隆与无Git可信降级，来源不符明确失败 |
| DESIGN.md | 扩展入口提示及来源规范，原设计方向保留 |

`artifacts/005s-next-a-plus/` 为原始截图、测试程序、日志、trace和报告；完整清单/哈希见 `FILES.json`。`lib/guild-home-facts.json` 内容不变。242个受保护app/components/hooks/lib/services/netlify/config/public/styles及构建配置文件未改（明确排除本轮Hero/CSS），`protected-files.json`可复核。

## 箭头实测与截图

坐标为页面CSS px；SVG尖端经getScreenCTM变换，不能用SVG画布边缘替代。矩形格式x/y/宽/高。所有正常宽度尖端均位于summary真实点击区，elementFromPoint命中summary，装饰pointer-events:none且aria-hidden；Hero和统计区位置与基线相同。

| 宽度 | summary矩形 | 尖端x/y | 前后并排 |
| ---: | --- | --- | --- |
| 1440 | 420 / 1132 / 600 / 42 | 810 / 1152 | [对照](compare-1440.png) |
| 1024 | 212 / 1132 / 600 / 42 | 602 / 1152 | [对照](compare-1024.png) |
| 768 | 84 / 1222 / 600 / 42 | 474 / 1242 | [对照](compare-768.png) |
| 390 | 16 / 1320.5 / 358 / 42 | 278 / 1330.5 | [对照](compare-390.png) |
| 320 | 16 / 1388.5 / 288 / 42 | 243 / 1398.5 | [对照](compare-320.png) |

每档提供 `after-宽度-collapsed/expanded/playing/failed/keyboard/reduced-motion.png`，以及真实200%缩放的 `zoom200-collapsed/expanded.png` 和整段Hero截图。五档完整链接在 [截图画廊](index.html)。并排图保留真实首页区域，不是孤立SVG；两边使用相同reduced-motion和滚动位置。

实际检查：Tab/Enter打开与关闭、焦点3px、折叠后不进入内部按钮、桌面点击、手机tap开关、主动真实播放、MP4失败后封面成功、展开隐藏提示、默认/reduced无提示动画、正常宽度无溢出。数据见 `arrow-results.json`，错误数组为空。

**真实200%缩放**通过临时独立浏览器profile内的 `chrome.tabs.setZoom(tabId,2)`，验证devicePixelRatio2及CSS视口减半；不是CSS zoom伪装。全部箭头仍在点击区、Enter打开正常。390/320窗口存在基线已知页面197px横宽，未扩大；不将该整页问题写成通过。临时扩展没有装入用户浏览器。见 `zoom-results.json`、REMAINING.md。

初次极窄检查失败样本保留在 `arrow-first-failure.json`，后续区分既有整页溢出的记录为 `arrow-zoom-overflow-baseline-discovery.json`。修正是≤280px去掉提示签并收窄局部箭头；另将桌面/手机尖端向入口文字左移25/30px。没有改变Hero高度或下方布局。

## 统计与攻略回归

- 再次复算档案：唯一ID208、创始1、普通207，创立日2018-02-10。只表示档案收录；在线、攻略视频总数仍—，localStorage假账号不能改变统计。
- 五档统计布局、来源说明、正常三篇攻略、仅一篇、空数据、失败重试、未知视频索引、视频/置顶筛选空提示、键盘跳转独立攻略页，共25项检查通过，`browser-results.json`。
- 实际匿名HTTPS GET仍返回公开ID13/5/1，HTTP200，首页初始不取攻略、进入推荐区只读一次。`live-public-results.json`保存时间、响应哈希及无写入证据，未保存作者身份数组/评论正文。
- 三篇真实文章没有封面/视频/置顶，保留真实标题与元数据；封面成功/失败、草稿排除、lazy图片和零首页播放器使用明确合成UI样本，不能证明生产媒体或数据库写入成功。
- 原头像外框像素/几何检查4项；成员网格/详情及嵌套弹窗8项；其余入口/留言边界17项回归通过。签到/任务/积分/组队/数据/公告/赞助/登录/改密/申请入口保留；本轮没有测试真实账号写入。见 avatar-frame-results.json、protected-results.json、regression-results.json。
- 内容运营建议见 REMAINING.md，未更改生产测试文章。

## 工程与性能

隔离Windows Node20.20.2/npm10.8.2真实 `npm ci && npm run build` 成功；浅克隆原错误日期复现，无Git原失败复现，修正后JSON稳定一致；来源错误按预期拒绝。见 BUILD_RELIABILITY.md 和 ci原始日志。

独立TypeScript **28→28，新增0**；当前及基线Lint均缺有效配置、API test均缺test-api.js，未通过。主工作区构建成功，构建跳过类型和Lint的事实如实保留。

首页JS **+824B**、CSS **+1331B**；最终慢手机LCP中位数2924→2884ms，CLS各次0，初始Media0、完整攻略代码0；不能据少量本地样本宣布优化或线上达标，慢手机仍高于2.5s。第一轮波动和4份原始trace保留。详见 PERFORMANCE.md。

图片重复问题通过完整导出回归确认与旧预览no-store条件有关，新服务器采用现有生产缓存策略；现网HEAD也核对了相同缓存头。小样本未复现的局限明确记录，未重写产品图片系统。见 IMAGE_DIAGNOSIS.md。

## 风险、停止点与回滚

仍有极窄200%导航溢出、28项历史类型诊断、缺Lint/API test运行条件、慢手机LCP目标未达、攻略内容质量不足。原积分身份授权P0、可信会话/在线、真实头像持久化没有解决；不能把本轮页面正常看作权限已安全。

**停在A+审查，未开始B1/B2/C；不合并、不发布、不改生产数据库。**

本分支基于未合并PR #6；审查时只比较本分支相对 `codex/jinxi-arch-005s-a`。放弃本轮可切回该基线或固定04ca4ef；保留原分支和独立基线worktree，没有reset/覆盖用户工作。已引用本提交的开发分支可用 `git revert <A+提交SHA>` 撤销；没有数据迁移或生产数据需要回退。预览停掉本轮独立Node进程即可，不修改用户的Chrome/Edge配置。
