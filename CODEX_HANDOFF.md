> **2026-11-06 B2接管更新（优先于下方历史快照）**：用户已授权B2-0检查点0–3及GitHub独立草稿PR。本机当前分支codex/jinxi-b2-a-session-lab，base为PR11/d516b8643c73797ddfbd8109d46a7dba58f6016c；最新SHA请核对该分支HEAD及GitHub PR，不以旧正文ca0723e为准。B1审核基线115bf854a7977a3e582a89af13459115178a1e31/PR8；新增检查点PR9、10、11均draft/open/unmerged，当前检查点3独立提交。完整入口：[B2状态](artifacts/b2-0/STATUS.md)、[会话原型](artifacts/b2-0/SESSION_LAB.md)、[工程/集成/阻断](artifacts/b2-0/ENGINEERING_AND_INTEGRATION.md)。原始tsc仍28项/exit2，只设新增诊断失败的历史基线，未假称完整类型通过。新证据含本机真实PG44、HTTPS会话7组、B1保护回归；GitHub CI必须看当前head的实际Checks。云变量继承及真实PROD权限未证明，旧写/旧登录暂停；正式会话、头像、在线心跳与名单均不启用。没有生产连接/密钥读取/迁移/上传、合并或部署。B2-C+新增要求只归档后续计划，不能据此提前开始B2-C。原B1截图已恢复原Git字节，新截图另存，主out不改；3044仍固定B1快照，3048/3049为本机合成隔离验证。
# 今夕公会官网｜Codex 项目交接

> **GitHub审核版更新**：用户已明确授权将完整B1本地提交、原暂存工作、本轮修补和证据提交GitHub。审核入口为 [B1 REVIEW_GUIDE](artifacts/005s-b1/REVIEW_GUIDE.md)，分支codex/jinxi-005s-b1，base仍为A+ d4769e719b2dd486b82cd2867f066d6c4dfa3e19。检查点2代码提交为55825f1a8146d0418bfa6380d7fa5254f093d6cc；完整最终SHA见草稿PR/分支。
>
> 下方“未提交/未推送/HEAD=ca0723e/原9份index未变”与验证JSON中的committed=false，是发布前的原始快照。保留其历史，不代表GitHub审核版当前状态。B2、生产写入、合并和部署仍未授权执行。

> **2026-11-05 本轮续验更新**：下面原正文保留接管前快照；最新状态以 [B1续验交付](artifacts/005s-b1/checkpoint2-recheck/DELIVERY.md)、[安全](artifacts/005s-b1/checkpoint2-recheck/SECURITY.md)、[性能](artifacts/005s-b1/checkpoint2-recheck/PERFORMANCE.md) 为准。
>
> B1检查点2五宽度/边界26项已通过。真实Tab/Shift+Tab的3px焦点通过，原失败是鼠标后程序focus的输入模态。综合检查另修复旧详情对null附件/缺署名的崩溃，12篇实际合成攻略及1个坏DTO注入通过。API现14/14；原生PG16/16及1k/10k规模验证通过并恢复夹具；独立tsc仍exit2/相同28项。受保护组件、生命周期、真实后台、五宽度200%通过；慢手机LCP中位A+2904/B12916ms，2.5秒目标仍未达。
>
> HEAD/分支仍ca0723e/codex/jinxi-005s-b1，无新提交/推送/PR。原9个index内容未变，原19个证据字节未变；新修补另有未暂存差异和新增测试，不能只提交旧index。根交接原件和index备份在E:/Recovery/.jinxi-research/b1-takeover-20261105。
>
> 最终新产物为E:/Recovery/.jinxi-research/b1-takeover-20261105/build-source/out；临时只读合成预览3044。原checkpoint2产物不含新详情修补。主out/1.mp4当前ENOENT，历史EPERM根因未证实。PG仍为授权本机专用实例；视频4不是生产数。生产P0与B2未处理，未合并/部署。

核验日期：2026-11-05，Asia/Shanghai。远端状态查询约20:20，本机只读数据库复核约20:26；接管时须再次核对。

本文依据本次对话的需求与授权、当前源码、Git记录、GitHub只读查询及实际测试日志编写。历史报告保留原貌；下文明确说明哪些结论已被后续阶段替代。未将截图、fixture、构建或工具可见性当作生产功能通过。

**本次只编写交接文档，不继续开发；未提交、推送、切换分支、合并、部署、重建数据库或修改业务代码。此前已暂存和未跟踪的B1工作必须保留。** 原来没有根目录CODEX_HANDOFF.md，本文件为新增，交接本身未提交。

## 1. 接管时先掌握的实际状态

| 项目 | 已核实状态 |
| --- | --- |
| 本机项目根目录 | `E:/Recovery/jinxi-web`；聊天的初始cwd可能是上一级 `E:/Recovery` |
| 仓库 | https://github.com/2574303451-create/jinxi-web ，origin为该仓库HTTPS地址 |
| 当前本地分支 | `codex/jinxi-005s-b1` |
| 当前本地HEAD | **`ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3`**，B1检查点1，只在本地 |
| 最新远端认可基线 | `codex/jinxi-005s-next-a-plus`，**`d4769e719b2dd486b82cd2867f066d6c4dfa3e19`**，[草稿PR #7](https://github.com/2574303451-create/jinxi-web/pull/7) |
| B1是否已上传 | 查询远端B1分支返回404；本地无B1上游；GitHub没有B1 PR。不能让新会话仅从GitHub恢复时假定已取得B1代码 |
| 工作区 | **不是干净状态**：9个B1检查点2文件已暂存，另19个未跟踪证据/运行器文件；无未合并冲突文件。新文档在此基础上新增，不能用reset/clean/checkout覆盖 |
| 当前主要任务断点 | B1检查点1提交完成；检查点2代码已写、构建成功副本存在，但浏览器验收中途失败；检查点3尚未完整完成 |
| 最新浏览器失败 | `browser-checks.cjs:22`，程序聚焦攻略卡后读到outline `0px`，预期 `3px`；仅前3项桌面检查通过，尚未进入后续尺寸及边界用例。原因待核实，不已认定是产品缺陷或测试脚本问题 |
| 生产状态 | 所列PR均未合并；本轮没有生产发布、生产数据库操作、正式会话或真实头像上传。既有线上站点存在，不等于这些开发分支已部署 |

**最建议的下一项工作：保护并核对现有暂存改动，恢复B1隔离预览，定位上述焦点检查失败，然后完成检查点2的浏览器矩阵。不要重新制作首页，也不要先启动B2。**

## 2. 项目概况与协作约定

### 2.1 产品目标

这是弹弹堂「今夕公会」官网。首次访问者要快速认识公会、成员与加入方式；已有成员要容易找到账号、签到、任务、积分排行、组队、游戏数据、留言和攻略；手机访问必须保持导航、弹窗、阅读与原有入口可用。

角色分工：用户决定产品方向、视觉与最终验收；网页版ChatGPT负责策划、文案、规则与验收标准；Codex负责源码核查、实现、测试和提交。**同账号不代表网页版自动读到了本机文件、该会话或最新分支**，交接必须携带分支/SHA/实际资料。

用户偏好：按已授权范围持续完成工作，减少重复确认；需要真实权限或环境授权时说明依据；用中文报告具体结果、失败样本和限制。审美由用户决定，不能用build成功代替。每个阶段有独立检查点、截图和可回退基线，不进行无计划的全站重构。

### 2.2 架构与环境

- Next.js **14.2.16** App Router、React **18.3.1**、TypeScript **5.9.2**、Tailwind **3.4.17**；版本从当前lockfile核实。已有framer-motion、lucide、Geist等依赖，未为B1新增动画库。
- npm管理，package-lock.json为lockfileVersion3；package.json标记private、version0.1.0、packageManager npm@10.0.0。这不是正式Release版本。
- 静态导出：`output:'export'`、`trailingSlash:true`，当前Next的distDir和Netlify发布目录均为`out`。Functions独立在Netlify运行；普通静态服务器不会自动运行Functions。
- Netlify配置：Node20/npm10，命令`npm ci && npm run build`。项目Next与生产Node不得因REA工具要求而随意升级。
- 本机为Windows/PowerShell；默认Node24.6.0/npm11.5.1，Git2.50.1.windows.1。另有隔离便携Node20.20.2/npm10.8.2用于构建验证，不替换系统安装。
- 数据：Neon/PostgreSQL后端；成员档案是仓库静态JSON；组队/游戏数据包含浏览器localStorage与默认示例；头像实验是隔离IndexedDB。

入口与布局：[app/page.tsx](E:/Recovery/jinxi-web/app/page.tsx)、[app/layout.tsx](E:/Recovery/jinxi-web/app/layout.tsx)、[next.config.mjs](E:/Recovery/jinxi-web/next.config.mjs)、[netlify.toml](E:/Recovery/jinxi-web/netlify.toml)、[package.json](E:/Recovery/jinxi-web/package.json)。

## 3. 历史开发进程与远端事实

GitHub只读查询确认PR #1–#7全部为 **open、draft、未合并**，依赖如下：

`B1本地工作 → #7 → #6 → #5 → #4 → #3 → #2 → #1 → codex/planning-handoff-2026-11-04`

远端main仍是`2ce600a79955cd5e5a7bd798f266f8e17b0c283e`；GitHub Releases和Tags查询均为空，本地也没有tag。不要把用户认可、分支提交、PR创建、合并、生产发布混为一谈。

| 阶段 | 实际进展与决策 | 分支最终/当前SHA、PR | 主要证据 |
| --- | --- | --- | --- |
| 最初探索/协作基线 | 上传已有工程、源码探索、职责与风险说明。40项TypeScript为当时历史记录，不是现基线 | `codex/planning-handoff-2026-11-04` / `7dfbf69c2e2b61be7c08d4fd65d884c2b371b244` | [协作](E:/Recovery/jinxi-web/COLLABORATION.md)、[旧探索](E:/Recovery/jinxi-web/WEB_EXPLORATION.md) |
| PLAN-001「星夜集结」 | 曾做深色视觉探索，用户不满意，后来被REA证据驱动方向替换。旧工作已保存在独立提交，不应恢复成现设计 | `codex/plan-001-star-night` / `a95ed1ba63cf6bd38a1321f11e017039056d679e`；无单独交付PR | [旧截图/日志目录](E:/Recovery/jinxi-web/artifacts/plan-001) |
| REA-001工具 | 用户批准安装REA，要求可清理卸载。后续实际MCP取证成功，不只是配置存在。工具在用户环境，不在今夕生产依赖 | 后续核实REA6.8.0；本阶段无独立业务PR | 见本节工具说明及REA报告 |
| JINXI-REA-002 | 真实参考mdldm.club截图/DOM/CSS与公开设计系统，建立纸张、蓝黄、深描边、硬阴影视觉；用户基本认可 | `codex/jinxi-rea-002` / `328819a57c671b33b743d1ad3f969c0fb7917048`；[#1](https://github.com/2574303451-create/jinxi-web/pull/1) | [调查](E:/Recovery/jinxi-web/artifacts/rea-002/REA_REPORT.md)、[交付](E:/Recovery/jinxi-web/artifacts/rea-002/DELIVERY.md) |
| JINXI-REA-003第一批 | 审计全站UI，真正重写留言墙、成员网格/详情/轮播、共享Modal与展播基础；不是全站内部UI已统一。38→28项TS诊断，解决10项 | `codex/jinxi-rea-003-batch-1` / `0182518277831ba0d03df3a3e1973f1a7ae06efe`；[#2](https://github.com/2574303451-create/jinxi-web/pull/2) | [交付](E:/Recovery/jinxi-web/artifacts/rea-003/DELIVERY.md)、[UI审计](E:/Recovery/jinxi-web/artifacts/rea-003/UI_AUDIT.md) |
| JINXI-UI-004 A | 双行反向留言展播与「今夕·同行时光」，WAAPI/离屏暂停、叶时钟、本地档案查询；B/C未按原计划全部实施 | `codex/jinxi-ui-004-a` / `ffa71f8313d3f9895d1b664404c29fa8dbb2dda1`；[#3](https://github.com/2574303451-create/jinxi-web/pull/3) | [交付](E:/Recovery/jinxi-web/artifacts/ui-004-a/DELIVERY.md)、[性能](E:/Recovery/jinxi-web/artifacts/ui-004-a/PERFORMANCE.md) |
| JINXI-ARCH-005第一阶段 | 比较弹窗与独立路由，实施/guides/及/profile-lab/隔离原型；提出正式身份/头像设计。用户基本认可，未实施真实会话/对象存储 | `codex/jinxi-arch-005` / `80737413d3bb981b3a3287c603893eb6c09decf2`；[#4](https://github.com/2574303451-create/jinxi-web/pull/4) | [交付](E:/Recovery/jinxi-web/artifacts/arch-005/DELIVERY.md)、[攻略评估](E:/Recovery/jinxi-web/artifacts/arch-005/GUIDE_ASSESSMENT.md)、[身份设计](E:/Recovery/jinxi-web/artifacts/arch-005/IDENTITY_ARCHITECTURE.md) |
| JINXI-ARCH-005R | 保护原头像外框，公开攻略强制published，移除管理默认密码，修正URL/正文/媒体CSP；有原生PG与管理隔离测试 | `codex/jinxi-arch-005r` / `2836ed13cc5f7da7ffcbce52755063dfbe80b55d`；[#5](https://github.com/2574303451-create/jinxi-web/pull/5) | [交付](E:/Recovery/jinxi-web/artifacts/arch-005r/DELIVERY.md)、[安全](E:/Recovery/jinxi-web/artifacts/arch-005r/SECURITY.md)、[SQL](E:/Recovery/jinxi-web/artifacts/arch-005r/SQL_REPORT.md) |
| JINXI-ARCH-005S A | REA定向统计/推荐调查，独立复算208档案，四项统计与最多3篇真实公开攻略；在线/视频总数当时仍占位，筛选只是当批原型 | `codex/jinxi-arch-005s-a` / `04ca4ef972636ef7ac8169d80db2dbf4af9d8b00`；[#6](https://github.com/2574303451-create/jinxi-web/pull/6) | [交付](E:/Recovery/jinxi-web/artifacts/arch-005s/DELIVERY.md)、[数据方案](E:/Recovery/jinxi-web/artifacts/arch-005s/DATA_AND_ARCHITECTURE.md)、[参考证据](E:/Recovery/jinxi-web/artifacts/arch-005s/reference/REPORT.md) |
| JINXI-005S-NEXT A+ | 加静态弧形视频提示，五宽度实测；修prebuild浅克隆/无Git时间依据；回归与图片缓存诊断。用户已准许继续B1 | `codex/jinxi-005s-next-a-plus` / `d4769e719b2dd486b82cd2867f066d6c4dfa3e19`；[#7](https://github.com/2574303451-create/jinxi-web/pull/7) | [交付](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/DELIVERY.md)、[剩余](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/REMAINING.md) |
| JINXI-005S-B1检查点1 | 真实视频聚合、轻量摘要/SQL筛选、只读超时、预览连接保护、手机箭头。已本地提交，未上传/独立验收 | `codex/jinxi-005s-b1` / `ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3`；无PR | [检查点1](E:/Recovery/jinxi-web/artifacts/005s-b1/CHECKPOINT1.md)、[SQL/API样本](E:/Recovery/jinxi-web/artifacts/005s-b1/checkpoint1-api.json) |
| B1检查点2/3 | 前端接入与缓存等9文件已暂存；新API单测通过。浏览器只跑到1440px第3项后失败；全尺寸/兼容/性能/综合验收未完成 | 未提交，无新的最终SHA | [当前浏览器结果](E:/Recovery/jinxi-web/artifacts/005s-b1/browser-results.json)、[构建](E:/Recovery/jinxi-web/artifacts/005s-b1/build-after.txt) |

实现提交与后补交付提交在部分阶段分开，例如005S实现为`305c4b78476370ea4d0ddad66d5bcce5c9f74a5f`，后续04ca4ef为交付记录。表中SHA对应阶段实际分支头，不应把文档提交误当另一套实现。

### REA与技能环境

- 当前安装包版本6.8.0，package.engines为`^22.23.4 || ^24.22.1 || >=26.12.1`。REA历史实际用Codex自带Node24.22.1，独立于生产Node20与系统Node24.6。
- 包位于 `C:/Users/lilei/AppData/Local/npm-cache/_npx/af752b90495482d7/node_modules/rea-agents`。REA MCP仍出现在可用工具中；本交接没有重做浏览器取证或声称本轮新调用成功。以历史Evidence ID、原始截图/DOM的完整性说明为准。
- 参考调查始终分A实际测量、B公开原作者文档、C原创/未证实推断。部分REA网络事件incomplete，不能宣布原站所有请求成功。公开项目源码仅参考，未整站合并/复制品牌资产。
- 用户此前要求使用Matt Pocock技能；现用户技能目录确有handoff、diagnose、review、frontend-ui-engineering等。不要推断仓库已完成全部技能工作流配置；AGENTS.md没有完整Agent skills上下文块。
- 若后续卸载REA，先核对MCP条目、技能位置和安装备份，只处理REA，不覆盖其他客户端配置。本交接不卸载或更改工具；正式源码架构分析不必为使用REA而对仓库做逆向。

## 4. 当前功能清单与关键位置

本表的“已验证”均带本地/历史范围；**不代表真实生产账号、资金/积分或数据库写入已完整验收。**

| 模块 | 现状、验证边界 | 核心文件 |
| --- | --- | --- |
| 首页/导航/加入入口 | 纸张蓝黄视觉已认可；手机菜单、账号/公告等入口有历史浏览器回归；入会表单仍原流程，真实提交/邮件未验 | [guild-hero](E:/Recovery/jinxi-web/components/home/guild-hero.tsx)、[guild-navigation](E:/Recovery/jinxi-web/components/home/guild-navigation.tsx)、[app/page](E:/Recovery/jinxi-web/app/page.tsx) |
| 宣传影像 | 原生details/summary、/1.mp4、/bg.png封面、preload=none、主动播放/失败回退；A+五宽度已测，B1只改手机短箭头且两宽度实测 | [Hero](E:/Recovery/jinxi-web/components/home/guild-hero.tsx)、[主题](E:/Recovery/jinxi-web/styles/guild-theme.css) |
| 留言墙 | 内部结构真正重构；发布/回复/表情/置顶/删除原调用保留；旧测试写操作为拦截内存API，不是真实生产写入验收 | [message-wall](E:/Recovery/jinxi-web/components/message-wall.tsx)、[message service](E:/Recovery/jinxi-web/services/message-wall-backend.ts)、[messages](E:/Recovery/jinxi-web/netlify/functions/messages.js)、[actions](E:/Recovery/jinxi-web/netlify/functions/message-actions.js) |
| 双行留言展播 | 原公开最近100条范围内投影，最多12条；足量两行，上左下右，少量降级；32px/s按实测宽度；暂停/触摸/焦点/reduced/离屏/后台有历史真实浏览器验证 | [showcase](E:/Recovery/jinxi-web/components/home/message-showcase.tsx)、[motion](E:/Recovery/jinxi-web/components/home/use-ribbon-motion.ts)、[row](E:/Recovery/jinxi-web/components/home/message-ribbon-row.tsx)、[public hook](E:/Recovery/jinxi-web/hooks/use-public-messages.ts) |
| 成员网格/画廊/详情 | 结构重写、筛选/更多/明确详情按钮/轮播/自动播放暂停/嵌套Modal焦点已验；仍原静态成员素材，不是在线人数 | [member-grid](E:/Recovery/jinxi-web/components/magicui/member-grid.tsx)、[carousel](E:/Recovery/jinxi-web/components/magicui/3d-carousel.tsx)、[detail](E:/Recovery/jinxi-web/components/member-detail-modal.tsx) |
| 同行时光/档案查询 | 原2018-02-10和UTC年/天算法；收起简卡、展开检索/历史/勋章。秒计时隔离到可见叶组件，折叠不挂载内部控件；历史事件仍需公会确认 | [terminal](E:/Recovery/jinxi-web/components/guild-uptime-terminal.tsx)、[clock](E:/Recovery/jinxi-web/components/guild-time/runtime-clock.tsx)、[utils](E:/Recovery/jinxi-web/lib/guild-terminal-utils.ts)、[config](E:/Recovery/jinxi-web/config/guild-terminal.config.json) |
| 首页数字 | 档案208/创始1/普通207，时长复用原逻辑，在线仍—。视频由A+占位过渡到B1未提交前端接入，隔离样本4不等于生产4 | [guild-facts](E:/Recovery/jinxi-web/components/home/guild-facts.tsx)、[facts JSON](E:/Recovery/jinxi-web/lib/guild-home-facts.json) |
| 首页推荐 | A+真实公开数据原型已验；B1现为服务端latest/video/pinned最多3篇、明确契约检查、共享缓存，但浏览器完整验收中断 | [featured-guides](E:/Recovery/jinxi-web/components/home/featured-guides.tsx)、[card](E:/Recovery/jinxi-web/components/home/home-guide-card.tsx)、[home service](E:/Recovery/jinxi-web/services/home-guides.ts) |
| 独立攻略中心 | /guides/静态路由、搜索/分类/难度/排序/页码、?id详情/分享/返回、Markdown子集/评论/投稿/媒体/原管理入口；历史本地静态路由已测，真实Netlify托管联调未验 | [route](E:/Recovery/jinxi-web/app/guides/page.tsx)、[center](E:/Recovery/jinxi-web/components/guides/guide-center.tsx)、[reader](E:/Recovery/jinxi-web/components/guides/guide-reader.tsx)、[service](E:/Recovery/jinxi-web/services/guide-service.ts)、[location](E:/Recovery/jinxi-web/lib/guide-location.ts) |
| 攻略公开读取 | R后仅published；B1摘要含cover/hasVideo/videoCount及真正SQL筛选，完整旧DTO与ID详情保持；小型原生PG已验，Neon生产网络未验 | [strategy-read](E:/Recovery/jinxi-web/netlify/functions/_shared/strategy-read.js)、[strategies](E:/Recovery/jinxi-web/netlify/functions/strategies.js)、[stats](E:/Recovery/jinxi-web/netlify/functions/guide-video-stats.js) |
| 头像实验 | /profile-lab/用合成账号、裁剪、128px WebP、隔离IndexedDB、成功/失败/重置/联动。没有正式服务器登录/上传/对象存储 | [profile route](E:/Recovery/jinxi-web/app/profile-lab/page.tsx)、[editor](E:/Recovery/jinxi-web/components/profile/avatar-editor.tsx)、[store](E:/Recovery/jinxi-web/lib/avatar-lab-store.ts)、[PublicAvatar](E:/Recovery/jinxi-web/components/ui/paper.tsx) |
| 登录/改密 | 既有PBKDF2验证、锁定与资料返回；首页localStorage恢复UI。没有HttpOnly可验证服务器会话；不要把账号显示当权限 | [auth-login](E:/Recovery/jinxi-web/netlify/functions/auth-login.js)、[auth-change-password](E:/Recovery/jinxi-web/netlify/functions/auth-change-password.js)、[page](E:/Recovery/jinxi-web/app/page.tsx) |
| 签到/任务/积分排行 | 入口保留，旧UI兼容规则仍在；真实奖励/兑换/签到安全链路未完整验证，积分P0未修 | [checkin](E:/Recovery/jinxi-web/components/checkin-widget.tsx)、[tasks](E:/Recovery/jinxi-web/components/daily-tasks.tsx)、[points](E:/Recovery/jinxi-web/netlify/functions/points.js) |
| 组队/游戏数据 | localStorage及默认示例；不是云同步/实时战绩。内部仍待组件级统一 | [team service](E:/Recovery/jinxi-web/services/team-service.ts)、[game service](E:/Recovery/jinxi-web/services/game-data-service.ts) |
| 公告/赞助/FAQ/Toast等 | 既有入口、数据路径保留；部分外层换肤，仍有旧样式/legacy，不得宣称全站统一 | [公告](E:/Recovery/jinxi-web/components/cyber-announcement.tsx)、[赞助](E:/Recovery/jinxi-web/components/guild-sponsorship.tsx)、[原UI审计](E:/Recovery/jinxi-web/artifacts/rea-003/UI_AUDIT.md) |

旧 `components/strategy-wall.tsx`、旧详情/投稿Modal和strategy-wall-service仍存在，不能因文件名就认定首页仍挂载它们。实际入口已转/guides/；它们的历史类型错误及维护负担仍在。

## 5. 必须保留的技术规则与用户限制

### 5.1 视觉、交互与内容

1. 保留已认可首页主构图、双行展播、成员画廊、同行时光与攻略路由。依据[DESIGN.md](E:/Recovery/jinxi-web/DESIGN.md)增量修改，不再选新审美或生成整个首页。
2. 浅纸/点阵、黄色`#ffe528`、蓝色`#2360f5`、深描边`#151515`、2px边与硬阴影。只在真实有意图的控件上加短交互反馈，不持续发光/跳动/粒子，不添大型库。
3. 不用大范围!important/legacy覆盖冒充内部重构。现有兼容规则不能盲删造成旧组件不可读；按模块替换并验收。
4. 头像外框尺寸、圆角、阴影、角标完全不变：留言42×42/12px角，回复30×30/8px角，展播30×30/9px角，2px描边；照片仅填充内部。静态成员昵称/描述/工号资料不得擅改。
5. 影像保持/1.mp4大小写、preload=none、用户主动播放、失败封面；箭头aria-hidden、pointer-events:none、展开隐藏、静态，不遮挡summary和焦点，不改变Hero高度。
6. 自动动效需要手动暂停、hover/focus暂停、触摸浏览、reduced-motion、离屏/后台暂停；复制轨道不进入重复Tab顺序/辅助树。计时只更新必要叶组件，不能每秒播报屏幕阅读器。
7. 参考mdldm.club只能学习A实测/B公开设计规则；禁止复制品牌、人物、课程封面、留言/经营数字或付费资源。标注红框不是UI边框。

### 5.2 数据与权限

- 208是唯一档案编号数，包含创始1/普通207；不按昵称去重，不等于在线、活跃或当前在会。真实profiles.is_active及导入覆盖没有核验。交接本轮语法树独立复算仍是208个唯一ID；档案无is_active字段。
- 创立日保持2018-02-10；复用严格日期与UTC算法。首页年/天只做可见按日更新，不建第二套每秒计时器，不改历史事件当作已确认。
- 档案prebuild用哈希绑定来源记录；[guild-archive-source.json](E:/Recovery/jinxi-web/config/guild-archive-source.json)与原JSON LF归一化SHA-256配套。完整Git核对时间；浅克隆/无Git用可信记录；不符应失败，不以现在/mtime伪造更新时间。
- B1视频口径为**B：published攻略中符合规则的非空URL视频附件条目**，重复URL按附件计，不计本站/1.mp4、/2.mp4；A登记条目与C已验可播数量另行区分。真实空结果0，失败/旧接口/未验证—。
- B1成功响应契约：`jinxi.guides.video-stats.v1`，countType=`published-valid-url-video-attachments-v1`，含count/calculatedAt/status/playabilityVerified:false。SQL不读全文、不在浏览器数全表；URL规则不代表可达或播放成功。
- 摘要契约`jinxi.guides.summary.v2`并返回appliedFeed；feed=latest/video/pinned先SQL筛选，再LIMIT3。摘要不返回正文/评论正文/点赞收藏ID数组/私有账户字段。原完整公开读取保留；草稿/归档/all拒绝。
- 首页不能把旧后端忽略新参数当成功全站筛选。当前未提交前端会明确拒绝不支持的契约，独立攻略中心可归一化旧完整DTO继续阅读。该浏览器兼容用例尚未跑到，单测通过不等于浏览器通过。
- 新只读路径：RepeatableRead/READ ONLY、3秒statement timeout、5秒HTTP终止；统计1个数据查询，列表2个，另有事务内set_config控制查询。客户端60秒成功缓存/并发合并、12秒请求终止，无自动轮询；错误不回退陈旧值冒充真实统计。
- B1新只读预览连接需专用`JINXI_PREVIEW_DATABASE_URL`；不回退生产连接，拒绝与已知生产host/port/database相同。**配置比较不证明底层物理环境已隔离**；必须由环境负责人确认。此保护没有覆盖旧写接口，不能宣布全站预览已安全。
- localStorage账号、前端memberId/作者昵称均不是服务端认证。历史留言不能按昵称自动认领；生产头像/session/在线心跳未启用。
- 原POST、评论、积分奖励/兑换规则及数据库结构不得在本只读阶段顺改。不修改生产内容、环境或数据库，不以测试数据替换真实文章。

### 5.3 操作边界

当前交接只允许只读/非破坏性验证和文档。以后恢复B1时仍禁止自动合并PR、生产部署、生产写入、生产会话或真实头像上传；B2需独立明确授权及隔离环境。用户已明确授权的**仅本机一次性合成PG测试实例**可在相同边界内继续使用，不含生产权限。

不要读出或提交.env、数据库串、Cookie、Token、真实账号/初始密码/导入资料。不要`git add .`吞入未知文件；先看暂存列表。遇到自动审批拒绝清理/停进程，不换方法绕过，记录原因与实际留下的状态。

## 6. 历史问题与修复依据

| 问题/原因 | 已做修正与验证 | 仍需记住的限制 |
| --- | --- | --- |
| 初版视觉不符合用户期望 | 星夜方案保存到a95ed1b，REA-002改用真实参考的纸张蓝黄语言 | 不恢复旧审美；用户认可不是全站内部都统一 |
| 内部组件仍卡通/玻璃/渐变，外层覆盖不足 | REA-003真正重写留言与成员组件，建立R/W/M/U审计分类 | 签到/任务等剩余模块仍未重构；旧审计中“仅首页一路由”已过时 |
| 视频按钮hover transform覆盖居中位置 | REA-002改独立translate并保留超时/错误封面，后续主动播放实测 | B1修改后仍需完整视频回归，不改源/自动播放 |
| 双行滚动和时钟离屏仍工作；IO一次批量事件取旧状态 | UI-004改实测宽度WAAPI、可见性生命周期、最新IO事件、叶时钟；历史后台/恢复/键盘测试通过 | 不以理论transform更快替代Performance实测，不混用整页加载与轨道性能结论 |
| 嵌套成员/图片弹窗焦点和滚动 | 共享原生dialog、明确详情入口，历史成员四宽度及焦点返回通过 | B1未重跑全部保护组件，不可借历史全绿盖住新失败 |
| 头像裁剪影响原外框/角标 | 005R只增加内部图片层，恢复42/30/30与原圆角/描边，像素外框0差异 | 上传仍只是浏览器原型，不能关联真实账号/历史昵称 |
| 全量攻略读取/首页重模块/未知路由伪首页 | 005独立/guides/、按ID/摘要SQL、懒加载、真404；R修URL状态/分享/历史/正文/媒体 | 静态可导出与本机测试不证明Netlify托管/CDN/Neon已集成 |
| 匿名公开读取草稿/默认管理密码 | 005R强制published、ID404，移除默认口令、缺配置拒绝，原生隔离PG/管理测试 | 仍是共享管理密码，不是会话/限流/CSRF完整系统；旧匿名投稿/自报作者仍有风险 |
| 005S骨架/状态引起布局偏移 | 预留相同封面/正文尺度，状态sr-only，正常三条最终CLS0 | 空/失败/文章数量切换需另测，不能把一个正常态当全部状态无偏移 |
| prebuild浅克隆错误更新时间、无Git失败 | A+哈希绑定真实来源日期，正常/浅克隆/无Git输出一致，错误来源fail closed | 更改档案后须审核并更新来源记录，不能手填当前时间绕过 |
| logo/14重复下载 | A+完整导出对照证明旧预览no-store条件会重复；按现有生产缓存头后3/3不重复；现网只读HEAD曾核对相同缓存头 | 小型HTML未复现；不宣称已解释Chrome全部内部机制，也不能把预览服务器修正算作产品提速 |
| B1两次主目录构建EPERM | 主out/1.mp4访问异常，独立源码副本Node20构建成功 | 根因未定。lstat在Node20/24表现不同、read open均有EPERM；不直接认定ACL或预览占用已定位/修好 |
| B1 fixture/初始化脚本失败 | PG子进程stdio阻塞后改为文件stdio；合成Neon batch响应改results对象；修复测试中错误的feed期望 | 这是环境/测试修正，不是生产数据库故障证据。原失败日志保留 |
| B1桌面卡片focus断言失败 | **未修复、未完成诊断**，浏览器当前仅前3项通过 | 脚本在鼠标交互后直接focus而没有先Tab，可能涉及:focus-visible输入模态；这是待验证假设，禁止直接放宽断言假绿 |

参考：[REA-003交付](E:/Recovery/jinxi-web/artifacts/rea-003/DELIVERY.md)、[UI-004交付](E:/Recovery/jinxi-web/artifacts/ui-004-a/DELIVERY.md)、[R安全](E:/Recovery/jinxi-web/artifacts/arch-005r/SECURITY.md)、[A+构建可靠性](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/BUILD_RELIABILITY.md)、[A+图片诊断](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/IMAGE_DIAGNOSIS.md)。

### 被替换/未采用的方案

- 星夜深色视觉已被用户否决并由REA方向替代，旧提交仅回看，不作为新起点。
- 原攻略首页弹窗不再是主入口；暂停售卖/课程/VIP/AI助手从未是今夕业务，不导入参考站业务。
- 客户端只筛前三条是005S-A明确标注的原型，B1用SQL筛选替代，不应保留为静默fallback。
- 固定复制参考站28秒动画、假在线/假播放量、首页自动视频、用Base64长期保存头像、按昵称认领身份均不采用。
- Netlify Blobs与其他对象存储曾作设计比较，**没有确定并实施生产存储**；历史价格只是当时方案，需要实施时重新核实。
- 曾提出的会话时限、60秒心跳/120–180秒宽限等属于待验证设计，不是已上线规则。不能因本文记录它们就启动B2。

## 7. 当前仓库、环境与验证的精确快照

### 7.1 暂存与未跟踪工作

以下9个文件均在index中，已暂存但未提交；`git diff`（不带--cached）为空不代表没有改动：

```text
E:/Recovery/jinxi-web/DESIGN.md
E:/Recovery/jinxi-web/components/home/featured-guides.tsx
E:/Recovery/jinxi-web/components/home/guild-facts.tsx
E:/Recovery/jinxi-web/package.json
E:/Recovery/jinxi-web/services/guide-service.ts
E:/Recovery/jinxi-web/services/guide-video-stats.ts              [新增]
E:/Recovery/jinxi-web/services/home-guides.ts
E:/Recovery/jinxi-web/services/public-read-cache.ts              [新增]
E:/Recovery/jinxi-web/tests/home-guides.test.cjs                 [新增]
```

原有19个未跟踪文件均在 `E:/Recovery/jinxi-web/artifacts/005s-b1/`：

```text
api-all.txt                       api-unit.txt
browser-checks.cjs                 browser-results.json
browser-run.txt                    build-after.txt
build-before.txt                   build-file-probe.json
build-main-EPERM.txt               build-open-probe.json
checkpoint2-source.json            home-unit-first-failure.txt
home-unit.txt                      postgres-final.txt
postgres-second.txt                preview.cjs
synthetic-guides-compare-1440.png   synthetic-statistics-1440.png
types-initial.txt
```

B1检查点1代码和16份初步证据已在本地ca0723e提交中。未跟踪文件对新会话尤其重要；它们不在HEAD、PR #7或远端，不能靠clone恢复。当前没有冲突文件，也没有新GitHub CI workflow。

### 7.2 本机构建副本与worktree

| 目录 | 用途/实际基线 |
| --- | --- |
| `E:/Recovery/jinxi-005s-b1-baseline` | Git detached worktree，d4769e7，即B1的A+基线；node_modules是指向主目录的junction |
| `E:/Recovery/jinxi-005s-next-baseline` | 04ca4ef，即A+之前的005S-A，不要因目录名误当最新A+ |
| `E:/Recovery/.jinxi-research/005s-b1-checkpoint1/source` | 暂存源文件解包的检查点1构建副本，不是正常Git工作分支 |
| `E:/Recovery/.jinxi-research/005s-b1-checkpoint2/source` | B1检查点2暂存源码副本；当前成功Node20静态导出在该目录的out内；node_modules junction复用主目录 |
| 其余baseline worktree | 005=ffa71f8，005R=8073741，005S=2836ed1，REA-003=328819a，UI-004=0182518；用git worktree list重新核对，保留回退 |

本轮只读比较了检查点2副本与当前工作区204个app/components/config/hooks/lib/netlify/services/styles/types/tests/scripts及构建文件的LF归一化内容：缺失0、差异0。成功导出存在首页、guides、profile-lab三页。这支持“该源码副本build成功”，**不表示主out已可用、执行了全新npm ci或Netlify Linux构建**。

当前主目录out曾在失败构建中改变，不能拿它当完整可用产物。不得为省事删除整个主out、覆盖用户文件或强杀不明预览进程。先诊断文件访问，或继续用独立目录构建。

### 7.3 当前安全验证结果

| 检查 | 本次交接实际运行/核实的结果 | 边界 |
| --- | --- | --- |
| Git/GitHub | 本地ca0723e，暂存9/未跟踪19；PR1–7均未合并；远端A+仍d4769e7，B1分支404，Release/Tags为空 | 只读查询，没有fetch更新/推送/创建PR |
| `npm run test:api` | **13/13通过，exit0**，包括两个父test；测试为API/Neon序列化/前端合约/缓存的合成网络样本 | 新脚本在暂存package.json，HEAD本身尚没有这个脚本修正；不包含真实SQL或生产API调用 |
| 独立TypeScript | **exit2，28→28，新增0/消除0**；完整文件/TS编号/诊断文本对比，只忽略行列 | 仍未通过类型检查，不能只汇报“无回归”而省略失败 |
| 六个B1产品Functions/共享JS语法 | `node --check`全部通过 | 语法不证明Netlify函数部署/Neon服务成功 |
| 隔离PG只读复核 | PostgreSQL17.11、专用reader、transaction_read_only=on；published14/draft1/archived1；SELECT聚合4 | 全部为已授权本机合成数据，本交接没有reset/seed/写表 |
| 原生PG集成历史日志 | 最新检查点1日志22/22通过：API6含父项，PG16含父项；实际SQL、锁超时、EXPLAIN、4并发、旧DTO/私有状态隔离 | 发生在B1开发期间；本次未重跑会DROP/TRUNCATE的集成测试。仅16行样本，不证明生产规模 |
| B1构建记录 | 独立Node20副本成功；首页78.9kB/First Load173kB，guides5.93/93.9kB，profile14.3/108kB | 是Next报告值，不等于CDP实际总下载；主目录两次EPERM失败不可抹掉 |
| B1浏览器 | **未通过**，仅1440px前3项PASS，随后focus outline0≠3失败，results.metrics为空 | 后续移动宽度、真实空库UI/失败重试/乱序/旧后端等代码虽已写，尚未执行到 |
| 手机箭头 | 检查点1的390/320通过：尖端距Play图标4.5px、无线条碰字、原布局矩形一致、Tab/Enter/tap/open隐藏通过 | 不能扩展成整个B1五宽度或200%已通过 |
| Lint | 仓库仍无有效ESLint配置；历史命令进入初始化退出1 | 本次未运行交互初始化，更没有关闭检查或添加新配置 |
| GitHub CI | `.github/workflows`不存在；最小CI仅待评估方案 | 没有CI运行结论，不把便携Node构建叫GitHub/Netlify CI通过 |

当前28项TS按文件分布：strategy-wall2、media-gallery1、sidebar1、toaster10、components/ui/use-toast3、hooks/use-toast3、guild-terminal-config6、strategy-wall-service2。确切文件及完整文字在[基线日志](E:/Recovery/jinxi-web/artifacts/005s-b1/types-before.txt)。

**历史文档差异必须纠正：**

- AGENTS.md/COLLABORATION.md/WEB_EXPLORATION.md中的40项、攻略仍首页弹窗等是早期状态；现3路由、28诊断。没有在交接中擅自重写旧文件。
- REA-003 UI_AUDIT写“只有首页路由”、原攻略/时光待统一，现已分别被005和UI-004部分取代；签到等剩余审计仍有效。
- 005S-A称视频聚合/真SQL未实施，在其时点正确；B1检查点1现已实现并跑原生PG。在线和真实头像仍未实施，不能一起划掉。
- A+报告称test:api缺test-api.js，是当时事实；**当前暂存package.json已改为node --test，本次13通过；本地HEAD版本的package.json仍旧**。旧api-all.txt记12是新增预览隔离子项之前的结果，不覆盖本次13。
- A+末次13.88MB证据中，头像结果JSON有8组；其DELIVERY.md某处仍写4项，属旧汇总计数不一致，以JSON为准，不据此创造新测试。
- 历史127.0.0.1预览URL都是临时服务地址；**本轮端口核验3026–3030、3040–3045均未监听**。不要给用户承诺现可打开旧链接。B1浏览器runner已结束，不在后台继续开发。

### 7.4 隔离PostgreSQL与工具位置

- B1本机集群仍在运行，仅绑定 `127.0.0.1:55433`；库名`jinxi_005s_b1_test`，进程核验时主PID24760（后续会变，按端口/专用目录确认，不照抄PID停进程）。没有注册Windows服务。
- 目录 `C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres`，含pgsql/bin、data及随机测试凭据文件。**不要复制/展示/提交runtime.json或pwfile，不放入交接包。** 本交接未关闭或清理集群。
- 连接助手硬限定loopback/端口/库名/角色：[tests/support/postgres.cjs](E:/Recovery/jinxi-web/tests/support/postgres.cjs)。默认reader只读；admin仅测试seed、空表、锁等。原生PG来源/解压不在项目依赖；17.11二进制来源与hash有历史记录。
- [tests/strategy-postgres.test.cjs](E:/Recovery/jinxi-web/tests/strategy-postgres.test.cjs)及[浏览器B1检查](E:/Recovery/jinxi-web/artifacts/005s-b1/browser-checks.cjs)包含专用库DROP/TRUNCATE/seed。**它们不是非破坏性只读检查**；只有恢复B1并确认该可丢弃实例后才运行，不能改成任意数据库地址，不能与预览/性能采样并发重置。
- 便携Node20：`C:/Users/lilei/AppData/Local/Temp/jinxi-005s-next-runtime/node-v20.20.2-win-x64/node.exe`，其npm CLI在相邻node_modules/npm/bin/npm-cli.js。
- 浏览器测试工具：`C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright`，Edge为`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`。历史脚本多有本机绝对路径，迁机需适配，不代表工具包进项目依赖。
- 项目外`.jinxi-research`存在历史GitHub发布辅助脚本，部分硬编码旧分支。不要直接复用后误更新旧PR；需先核对作用域。连接器/网络过去有间歇故障，官方Git Data API曾逐hash上传同SHA；不是授权强推或覆盖上游的理由。

## 8. 遗留风险、待确认事项与性能边界

| 优先级 | 问题与下一验证 |
| --- | --- |
| **P0 / 生产阻断** | 积分接口仍信任客户端账号/奖励/兑换价格；localStorage不建立服务器身份。正式成员写能力前必须独立整改，服务器决定主体与规则，不能只加新会话而留下旧绕过路径 |
| **P0 / 正式身份与内容写入阻断** | 匿名攻略POST/客户端自报作者、旧actions/自动view/反应身份、防滥用、限流、共享管理口令、CSRF/审计未完整解决。B1只读安全改善不覆盖这些接口 |
| **P1 / B1验收阻断** | 浏览器卡片focus失败，需真实Tab键输入模态与A+对照定位；完整五宽度、乱序、错误/0/缓存/旧后端/独立页回归尚未完成 |
| **P1 / 工程** | 主out/1.mp4 EPERM根因不明；隔离构建可继续但主目录仍有失败状态。不得靠删文件或关杀不明进程掩盖 |
| **P1 / 质量门槛** | 28项TS历史诊断、Lint无配置；B1新test:api脚本尚未提交。CI最小方案未实现，不能忽略tsc退出码做绿灯 |
| **P1 / B1综合** | 新摘要/统计体积、首页真实请求瀑布、切换耗时、B1 JS/CSS/图片/移动LCP/CLS与A+对照尚未录完；生产规模EXPLAIN/Neon实际批事务/超时传输与托管环境未验 |
| **P1 / 数据事实** | 真实在会is_active/档案导入没有核验；最后一次实际公开攻略GET（A+）仅ID13/5/1，测试/模板内容且无封面/视频/置顶。本交接不再查询生产内容；隔离攻略16条/视频4绝不能写为线上数量 |
| **P2 / 可访问性** | A+真实200%时390/320窗口对应195/160 CSS px，整页已有197px横宽；箭头未扩大。B1新手机箭头200%未复验；真实手机硬件/读屏人工检查未完成 |
| **P2 / UI与内容** | 签到/任务/排行、组队/游戏数据、公告/赞助、登录/改密/入会、FAQ/Toast等仍需按模块统一，旧legacy规则仍存在；先完成B1，后续按验收顺序，不重做已认可组件 |
| **P2 / 证据体积** | 当前HEAD的artifacts有1536个tracked文件、175199853字节（约175.20MB原始文件，不是Git pack或网页传输）。B1当前目录35文件约747522B。保留必要失败/trace/复现脚本，后续不持续堆叠重复PNG；本交接不删除既有证据 |

A+最后一轮本地实验：JS601170→601994B、CSS140679→142010B；慢手机LCP中位2924→2884ms，CLS各次0，初始Media/完整攻略代码0。每条件仅3次，不能宣称线上达标或稳定提速；仍高于2.5s。**这是A+的实验，不是B1数据。** 详见[A+性能原始范围](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/PERFORMANCE.md)。

正式会话/头像的会话期限、对象存储选型/费用、数据库迁移和在线心跳策略仍待用户在B2确定/批准；历史设计书不是自动实施许可。真实头像应服务端验证/重编码/去元数据，图片持久化到对象存储、数据库只留key；原型Base64/Blob的本地路径不能冒充生产。

## 9. 下一阶段具体执行顺序

1. **恢复上下文并保护未提交成果。** 先读本文与B1检查点1，再读index差异及失败日志。确认用户要求继续B1后再改代码；不要从旧005/005R或仅PR #7重新开工覆盖当前分支。若只能访问GitHub，先取得本机B1提交及暂存/未跟踪工作；不可假装远端有ca0723e。
2. **恢复独立预览，定位focus失败。** 源码副本204文件与当前一致，可先使用它的out。按真实键盘Tab/Enter驱动，与A+在相同输入模态下比较`document.activeElement`、`:focus-visible`和outline；区分脚本问题与CSS问题，只修已证实原因，不削弱焦点标准。
3. **完成检查点2。** 跑320/390/768/1024/1440；保持208/日期/在线占位，统计真实0与错误—、封面加载失败、视频标记/置顶/最新真正结果、切换竞态、60秒缓存/合并/强制重试、旧后端不误展示、无自动视频/详情代码、独立guides与返回。保留有清楚“隔离合成数据”标识的必要截图，不把UI fixture称作真实写入。
4. **完成检查点3。** 在已授权本机合成PG重跑真实参数化SQL、异常JSONB/URL/草稿隔离、超时/故障、并发与数据不变、EXPLAIN；根据规模另行验证，不用16行暖查询代替增长评估。验证Neon传输契约与真实本机SQL各自边界，继续记录生产投稿/积分P0。
5. **做真实性能与保护回归。** 同条件A+基线/B1交替样本，CDP保留缓存语义，统计真实初始JS/CSS/图片/Media、推荐首次/切换/详情响应、移动CPU降速LCP/CLS及失败样本；重测头像原框、双行/时光生命周期、原业务入口、宣传片、reduced和200%。不要把现隔离服务器建连开销或缓存头变化误归因于产品。
6. **最小CI方案与工程门槛。** 建议Node20/npm10、npm ci、build、现有API契约测试、专用PG测试服务/受限配置、独立tsc结果与基线完整诊断差异。当前没有workflow，不虚构已执行。tsc失败必须显式保留，不能用`|| true`、减少include或关闭检查伪绿；Lint补配置是独立变更范围需说明。
7. **独立提交检查点2/3并交付B1。** 完整SHA、文件清单、API/SQL样本、截图/性能/失败/回滚清楚区分。B1 PR应以`codex/jinxi-005s-next-a-plus`为base并依赖#7；发布分支/PR需依用户恢复开发指令，不在本次交接执行。审查前不得自动合并/生产部署。
8. **B1通过后再B2，然后C。** B2须单独授权可信服务端会话、身份绑定/CSRF/Origin/失效、积分P0整改、心跳租约/多标签去重、锁屏断网、隔离存储头像。原外框不变。C再按审计拆剩余UI，不临时整站翻新。

### 回滚原则

当前本地B1 HEAD基于d4769e7；没有生产迁移或数据回滚。若用户决定放弃B1，应先完整保存当前index与未跟踪成果，再在干净隔离分支按提交逆序revert；不要对这个脏工作区直接reset或checkout旧基线。撤回到005早期会丢R的头像/公开状态/默认密码/CSP修复，不是安全基线。

## 10. 新会话接管指引与命令

### 优先阅读

1. 本文；[AGENTS](E:/Recovery/jinxi-web/AGENTS.md)、[COLLABORATION](E:/Recovery/jinxi-web/COLLABORATION.md)、[WEB_EXPLORATION](E:/Recovery/jinxi-web/WEB_EXPLORATION.md)（注意上文列明的过时结论）。
2. [DESIGN](E:/Recovery/jinxi-web/DESIGN.md)、[A+交付](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/DELIVERY.md)、[A+剩余](E:/Recovery/jinxi-web/artifacts/005s-next-a-plus/REMAINING.md)。
3. [B1检查点1](E:/Recovery/jinxi-web/artifacts/005s-b1/CHECKPOINT1.md)、[当前失败日志](E:/Recovery/jinxi-web/artifacts/005s-b1/browser-run.txt)、[运行器](E:/Recovery/jinxi-web/artifacts/005s-b1/browser-checks.cjs)、[源码快照](E:/Recovery/jinxi-web/artifacts/005s-b1/checkpoint2-source.json)。
4. [R安全边界](E:/Recovery/jinxi-web/artifacts/arch-005r/SECURITY.md)、[S数据设计](E:/Recovery/jinxi-web/artifacts/arch-005s/DATA_AND_ARCHITECTURE.md)、[身份方案](E:/Recovery/jinxi-web/artifacts/arch-005/IDENTITY_ARCHITECTURE.md)、[剩余UI](E:/Recovery/jinxi-web/artifacts/rea-003/REMAINING.md)。

建议技能：handoff读取交接；frontend-ui-engineering用于局部UI与键盘检查；diagnose用于focus/EPERM/性能的复现与可证伪诊断；review用于B1最终规格和代码审查。REA仅在新的真实参考取证需要时使用，不重装、不重做首页调查。没有用户或适用规则授权时不自行启动多代理任务。

以下只读/无业务写入命令可先执行：

```powershell
Set-Location E:/Recovery/jinxi-web
git status --short
git branch --show-current
git rev-parse HEAD
git diff --cached --stat
git diff --cached
git diff --name-only --diff-filter=U
git worktree list
node --version
npm --version
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run test:api
```

独立tsc预期仍exit2/28项，必须完整对照；当前暂存的test:api预期13项通过。**不要在只剩远端A+代码时期待相同命令有同样脚本/结果。**

用户恢复B1后，可在确认端口空闲、隔离PG仍为专用合成库时，分别启动两条本机预览（命令不会创建/重置表，所有HTTP写请求405）：

```powershell
# A+基线静态页面与原A+只读处理器，连接同一个合成测试库
node artifacts/005s-b1/preview.cjs E:/Recovery/jinxi-005s-b1-baseline/out 3041 E:/Recovery/jinxi-005s-b1-baseline

# B1已成功构建的静态副本 + 当前产品只读处理器 + 合成测试库
node artifacts/005s-b1/preview.cjs E:/Recovery/.jinxi-research/005s-b1-checkpoint2/source/out 3044
```

然后才运行B1浏览器runner；该runner会在后段TRUNCATE/重新seed专用测试库，不能将其当只读检查或与其他测试/预览交互并发运行。`npm run test:postgres`当前也是这个明确可丢弃实例的写入型集成测试，不在本次交接运行。

若需要重新构建，优先保留独立产物目录，按副本说明准备相同源文件，用Node20执行npm run build；主目录EPERM未解决前不要自动删除out。Windows后台启动辅助进程应隐藏窗口，确认专用进程/路径后才进行生命周期操作。跨机不能假设能连接用户电脑Chrome或127.0.0.1端口。

### 无共享工作目录时的必要资料

仅clone仓库或读取PR #7只能得到d4769e7及以前，不能恢复本地ca0723e与暂存/未跟踪内容。需要用户提供本文件、B1本地提交的安全导出，以及上述9个文件和必要测试证据的安全副本；**不附带.env、账号资料、runtime/pwfile、node_modules或数据库数据目录**。导出/推送不在本次任务执行；新会话缺资料须明确说出缺口，不能从摘要凭空还原完整实现后声称无损接管。

## 11. 本文质量审查与交接边界

- 已核对远端PR/branch/main/release/tag，未仅沿用对话SHA；已区分本地检查点、远端认可版、暂存及未跟踪。
- 已重新运行安全契约测试、独立tsc、JS语法，读取而未重建专用PG；历史SQL与浏览器结果保留时间/环境限制。
- 已列明B1浏览器失败、主构建EPERM、历史TS/Lint与安全P0；没有把未执行到的测试、旧报告或合成数据写成完成。
- 已区分旧路线替代与待审批设计，保留头像框、数据/动效/生产边界；对过时文档只在本文说明，未覆盖旧资料。
- 本次未运行有重建副作用的PG/浏览器套件、未新建CI/功能、未清理工具/基线、未打开生产写入口。
- 最终逐项复核已完成：HEAD与index内容摘要均未改变，原有28个改动文件（9个已暂存、19个未跟踪）的SHA-256全部与交接开始一致；唯一新增成果为本文件，未暂存。86个本机文档链接全部存在、代码围栏成对，敏感凭据模式检查未发现实际密钥或带凭据数据库串（该检查不替代完整安全审计）。

## 12. 可复制的新Codex会话启动摘要

```text
继续今夕公会官网B1，但先读项目根CODEX_HANDOFF.md并复核实际Git，不重做首页。
仓库：https://github.com/2574303451-create/jinxi-web
本机：E:/Recovery/jinxi-web，Windows/PowerShell。
最新远端认可版：codex/jinxi-005s-next-a-plus，d4769e719b2dd486b82cd2867f066d6c4dfa3e19，PR#7；依赖7→6→5→4→3→2→1均草稿未合并。
当前本地：codex/jinxi-005s-b1，HEAD ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3，仅本地；另有9个已暂存B1前端/脚本文件及19个未跟踪证据，禁止覆盖。远端B1分支/PR尚无。
已认可：首页纸张蓝黄/硬描边、留言墙、成员画廊、双行展播、同行时光、/guides/、头像隔离原型。原头像外框/尺寸/圆角/阴影不变。
B1检查点1已实现：published有效URL视频附件聚合（重复URL按附件计，不代表可播放，排除宣传片）、v2轻量摘要、服务端latest/video/pinned筛选后LIMIT3、只读超时/预览连接保护；原生本机PG小样本集成日志22通过。
检查点2未提交未验收：前端接入/有限缓存已写，Node20独立副本build成功；最新浏览器仅1440前3项通过，在browser-checks.cjs:22卡片focus outline0px≠3px失败。下一步先定位真实Tab/:focus-visible输入模态，再完成五宽度、乱序/错误/旧后端/保护与性能回归，不放宽断言假绿。
本次交接重验：npm run test:api 13通过；独立tsc仍28项历史错误、新增0；Lint无配置，CI未建。主out/1.mp4有EPERM未解决，成功产物在E:/Recovery/.jinxi-research/005s-b1-checkpoint2/source/out；204个相关源文件已核对一致。
用户已授权本机一次性合成PG，仅127.0.0.1:55433/jinxi_005s_b1_test，目前运行，视频4是合成数；凭据只在TEMP，不复制/提交。PG/浏览器集成脚本会重置该专用库，接管前读测试说明，不连接生产。
先读：DESIGN.md、artifacts/005s-b1/CHECKPOINT1.md、browser-results.json、browser-run.txt、artifacts/005s-next-a-plus/DELIVERY.md、artifacts/arch-005r/SECURITY.md。
保留档案208/创始1/普通207/创立2018-02-10，在线仍—。正式会话/心跳/头像持久化B2未实施，积分授权、匿名投稿/自报作者仍为生产阻断。禁止生产数据库操作、自动合并/部署、真实头像上传；B1验收后再独立批准B2。
如果没有共享本机目录：GitHub没有B1的本地提交与未提交文件，先索取安全副本，不能假定clone已包含它们。
```
