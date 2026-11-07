> **2026-11-07 第三阶段检查点2，本地合成留言与攻略**：本轮工作树为`E:/Recovery/.jinxi-research/phase3-community/worktree`，分支`codex/jinxi-phase3-community-local`，从已推送身份提交`35ae9a676813249ae2beff9845251eb57a72855c`继承；原身份工作树不改。实现可信UUID归属、留言/攻略状态、服务端审核/管理授权、回复与互动、幂等/版本/回滚。真实PG13/13、实际HTTPS、浏览器完整流程及五宽度通过；旧公开读取/TEST模型PG46、API14/安全86、原始tsc/ESLint/Build通过。旧入口仍冻结，全部业务数据合成，主站UI/FAQ/公告不改。仅本地提交，未推送/部署/迁移/更改平台，最终SHA以本条所属提交及最终答复为准。[本轮最终审查与证据](artifacts/phase3-community/FINAL_REVIEW.md)。下方均为保留的历史快照，其“当前/未推送”等措辞只对应当时。

> **身份检查点已推送记录**：身份分支`codex/jinxi-phase3-member-local`已在此前单独授权下推送35ae9a6；上轮真实[GitHub Actions](https://github.com/2574303451-create/jinxi-web/actions/runs/42363078349)对应完整SHA35ae9a676813249ae2beff9845251eb57a72855c，completed/success，本轮只读复核原运行。这个CI不覆盖本轮未推送的留言与攻略代码。

> **2026-11-07 第三阶段身份独立审查收尾**：本次本地收尾提交保留竞态修复，追加快速切换、重复提交及失败重试验证。当前为12项事件回归、5组实际HTTPS专项、五宽度复验及API14/安全83通过，原始tsc/ESLint退出0。原18PR、TEST13de部署和旧站锁定的只读元数据未变。已获本地提交整理授权，未获推送/部署授权；本条随最终本地提交保存，完整提交SHA以本文件所属提交及最终答复为准。[最终审查与可复现命令](artifacts/phase3-member/final-review/2026-11-07T09-46-44Z/FINAL_REVIEW.md)。下方为此前未提交状态的历史快照，原文保留。


> **2026-11-07 本机恢复竞态修复续验**：在用户继续授权后，修复了登录中联网恢复核验覆盖新显示的问题；通知合并为操作后一次服务器重验。8项新增事件回归、3组实际HTTPS专项及1440/1024/768/390/320五宽度通过；原始tsc、ESLint、API14/安全79通过。当前HEAD仍为6f71de9，修复尚在工作区，未提交/推送/部署。新结果与源码指纹见 [恢复竞态交付](artifacts/phase3-member/restore-race/DELIVERY.md)。下文为此前交接快照，已有成果和失败记录保留。

# 今夕公会官网 CODEX 交接文档

更新日期：2026-11-07（北京时间）。适用源码：`6f71de9eec8093e3d139b3201fe4249c6b0e52ff`。本次是交接整理，未继续开发、提交、推送或部署。

**先看结论：F03/F05 合成只读云 TEST 已验收；第三阶段第一个“本机合成成员身份”检查点已实现并完成本地测试，但只有本地提交，尚未推送、未接入云端或首页。正式成员、社区写入、头像与在线系统仍未恢复。**

本文件重整此前多轮快照，不再将旧 B1 快照当作当前任务。原交接全文已逐字节保留在 [交接前备份](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/CODEX_HANDOFF.before.md)，SHA256 和本轮核验见 [交接核验记录](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/handoff-verification.json)。备份中的“当前”均指相应历史时点，不能覆盖本文件最新状态。

事实分级：**本轮复核**＝此次实际命令/API结果；**既有实测**＝已保存的日志、截图、提交及受测源码指纹；**用户控制台证据**＝用户提供，非此次亲连数据库；**计划/待核实**＝未实施或证据不足。代码存在、测试通过、云端部署、生产验收是不同事实。

## 1. 项目概况与接管位置

项目为今夕公会官网，服务访客与成员：公会介绍、成员档案、留言互动、攻略视频、签到积分、公告赞助及后续个人头像和在线伙伴。当前优先级是保住旧站和历史数据，在独立合成环境逐批恢复可信业务，不能为了新版 UI 发布而倒退旧业务能力。

仓库：[2574303451-create/jinxi-web](https://github.com/2574303451-create/jinxi-web)。Windows / PowerShell。**最新开发根目录不是最初的 E:/Recovery/jinxi-web。**

| 位置 | 分支 / 完整 HEAD | 用途 |
| --- | --- | --- |
| `E:/Recovery/.jinxi-research/phase3-member/worktree` | `codex/jinxi-phase3-member-local` / `6f71de9eec8093e3d139b3201fe4249c6b0e52ff` | 本轮交接根目录，最新本地身份成果，未上传 |
| `E:/Recovery/.jinxi-research/f03-f05/worktree` | `codex/jinxi-f03-f05-test-foundation` / `d43ee24cfde1277eedabc8c8856de697b702dc0f` | GitHub 累计基准及云 TEST 验收资料 |
| `E:/Recovery/jinxi-web` | `codex/jinxi-b2-a-5-test-prep` / `7f850e188c750e147181fcba193a8106892b4afc` | 原目录，停在 PR14，不得误作最新 |
| GitHub `main` | `2ce600a79955cd5e5a7bd798f266f8e17b0c283e` | 历史主分支；不是新版候选，也未证明等于旧 Published 产物 |

技术栈实际锁定：Next.js **16.4.5**、React/ReactDOM **19.3.1**、Node **24.22.2**、npm **11.19.1**、TypeScript **5.9.2**、Tailwind **3.4.17**；保留现有 Framer Motion、Radix、Vaul、Recharts。DOMPurify **3.4.17**。npm + package-lock v3；当前身份阶段未改依赖或 lock。

前端为 Next 静态导出，`output: export`、`trailingSlash: true`、`out`；独立 Netlify Functions 使用 PostgreSQL/Neon。本机新身份实验是独立 HTTPS + PostgreSQL 适配器，不是新 Netlify 路由。架构分层：页面/组件 → services → Functions → 资源身份与有效 ACL 守卫 → 数据库；当前公开云 TEST 仅运行合成只读入口。

## 2. 历史开发进程与实际版本

### 2.1 PR1–18：累计历史保留，全部未合并

本轮通过 GitHub 公开只读 API 重新确认：以下 **18 个 PR 均 open、draft、未合并**。#1 的 base 是 planning 分支，不是 main；#2–18 的 base 依次是前一 PR 的 head。以下所有 HEAD 均经本地 `git merge-base --is-ancestor` 验证包含于当前候选。原始全量表见 [PR 链核验](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/pr-chain.json)。

#1 base：`7dfbf69c2e2b61be7c08d4fd65d884c2b371b244`，分支 `codex/planning-handoff-2026-11-04`。其后每行 base SHA 为上一行 HEAD。

| PR | 阶段 / 主要成果及边界 | 完整 HEAD |
| --- | --- | --- |
| [#1](https://github.com/2574303451-create/jinxi-web/pull/1) | REA-002：依据实际参考重建认可首页，取代最初未获认可的星夜视觉方案 | `328819a57c671b33b743d1ad3f969c0fb7917048` |
| [#2](https://github.com/2574303451-create/jinxi-web/pull/2) | REA-003：留言墙、成员展示及必要共享控件；剩余 UI 未全部统一 | `0182518277831ba0d03df3a3e1973f1a7ae06efe` |
| [#3](https://github.com/2574303451-create/jinxi-web/pull/3) | UI-004A：双行留言展播、公会同行时光及暂停机制 | `ffa71f8313d3f9895d1b664404c29fa8dbb2dda1` |
| [#4](https://github.com/2574303451-create/jinxi-web/pull/4) | ARCH-005：独立 /guides/、隔离 /profile-lab/ 头像原型及身份架构设计 | `80737413d3bb981b3a3287c603893eb6c09decf2` |
| [#5](https://github.com/2574303451-create/jinxi-web/pull/5) | ARCH-005R：原头像外框保护、公开攻略读取、安全审查修正 | `2836ed13cc5f7da7ffcbce52755063dfbe80b55d` |
| [#6](https://github.com/2574303451-create/jinxi-web/pull/6) | ARCH-005S-A：208 份档案统计、首页公开攻略补给 | `04ca4ef972636ef7ac8169d80db2dbf4af9d8b00` |
| [#7](https://github.com/2574303451-create/jinxi-web/pull/7) | 005S A+：宣传视频手绘弧形箭头、首页保护回归、prebuild 可靠性 | `d4769e719b2dd486b82cd2867f066d6c4dfa3e19` |
| [#8](https://github.com/2574303451-create/jinxi-web/pull/8) | B1：published 视频附件统计、摘要及服务端筛选，本机完整验收 | `115bf854a7977a3e582a89af13459115178a1e31` |
| [#9](https://github.com/2574303451-create/jinxi-web/pull/9) | B1 最终复核，仅视频 thumbnail 无独立封面的合法回退 | `1be49379a771a2a3f23692260e438c2368841150` |
| [#10](https://github.com/2574303451-create/jinxi-web/pull/10) | B2-0：所有 Functions 的环境边界、旧不安全写入口阻断 | `6abd039e898b9970d8d2ec4e7092e3e5b8f3aaf0` |
| [#11](https://github.com/2574303451-create/jinxi-web/pull/11) | 身份、积分、内容安全整改方案；方案不等于已恢复业务 | `d516b8643c73797ddfbd8109d46a7dba58f6016c` |
| [#12](https://github.com/2574303451-create/jinxi-web/pull/12) | B2-A：合成本机会话、服务器积分/幂等实验、数据库权限与 CI | `483495aefcd75316731efce76372748a0f00c8c7` |
| [#13](https://github.com/2574303451-create/jinxi-web/pull/13) | B2-A4：公告 HTML/CSP、ACL 补查、同页重登兑换幂等、旧功能状态提示 | `f443144a912abf5869d42f4758c86caaf6031525` |
| [#14](https://github.com/2574303451-create/jinxi-web/pull/14) | B2-A5：28 项历史 TS 全部修复，严格 tsc 真正 exit0；TEST 接入准备 | `7f850e188c750e147181fcba193a8106892b4afc` |
| [#15](https://github.com/2574303451-create/jinxi-web/pull/15) | 独立运行时实验：Next16 / React19 / Node24，静态导出及交互兼容 | `f9ff27874beaf3388502f29360ebaa86c5a64c13` |
| [#16](https://github.com/2574303451-create/jinxi-web/pull/16) | B2-A6：框架开销归因、浏览器兼容、TEST 与兑换收据恢复准备 | `a37786ce68ec8223ff0e512b86be1c81b3a3e777` |
| [#17](https://github.com/2574303451-create/jinxi-web/pull/17) | 集成冻结、完整 main 差异与平台签核清单 | `9f53e1428d29a56f459e9c29ce79e0969ef1294e` |
| [#18](https://github.com/2574303451-create/jinxi-web/pull/18) | 历史数据保护、备份/增量迁移设计、双模式视频隔离演示 | `be9513f37251d08661a3f6c1d5240ed059c59f2e` |

旧逐阶段报告、失败和截图保留在对应 artifacts 目录。入口见 [集成冻结](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-7/INTEGRATION.md)、[PR18交付](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-8/DELIVERY.md)。不要重复做全链审计、改原 PR 的 base/head、强推、关闭或自动合并。GitHub Releases 和 Tags 本轮 API 均返回空数组；没有新版正式 Release，旧 Netlify Published 是独立的部署事实。

### 2.2 PR18 之后：F03/F05 独立合成 TEST

基于 PR18 累计历史继续，不新建 PR19。先实现只读预检、合成初始化、角色/有效权限、实际数据库身份指纹、限定回滚和 Netlify 站点/SHA 构建门禁。预检用户回传结果集中核查后，用户另行明确批准限定云资源写入与零费用建设，最终完成合成只读云端验收。

重要节点：本地方案 `43121af3e7920a280480c2dae2e35db8e71f5003`；实际平台 ACL 兼容受测 `316ae73c9de885ad4ec08c7a70c5a3cd0650d374`；Linux npm 启动器修复 `7a65e7df15d04e9f5b0859e647d57932ee98d465`；最终接受部署源码 **`13de96d7531dde3222fdf513e711447a1df3e425`**；最后验收资料 **`d43ee24cfde1277eedabc8c8856de697b702dc0f`**。

唯一管理员清单仍是 [ADMIN_SIGNOFF.md](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/f03-f05/ADMIN_SIGNOFF.md)。三关已在获准范围完成，不要求重复空表查询、截图或新建平行清单。该文件下方仍含“第三关未过/等待 Linux CI”的过程快照，应以顶部最终验收和 results.json 的 gate3Execution 为准。

### 2.3 第三阶段：本机合成成员身份，尚未上传

从 d43 建独立本地 worktree，固定只做身份五项，不开放留言/攻略/签到/积分等业务：

- `03f20a11cd1ec57ff779a10988fb7039cbf0ba05`：本机合成登录、会话、本人资料、改密、退出；受限角色/HTTPS/浏览器验证；在既有 UI 审计登记两个待修项。
- `6f71de9eec8093e3d139b3201fe4249c6b0e52ff`：修复延迟旧 401 响应覆盖新登录的显示与 Cookie，补真实 HTTPS 失败/通过复现。

本轮核实：相对 d43 恰好 ahead2；远端身份分支查询 404。没有对应新 GitHub CI，不能将 d43 的成功 CI 冒充当前本地提交通过 CI。该源码受测内容与提交逐项相符，见第 6 节。

## 3. 当前功能清单与旧业务能力边界

| 模块 | 当前候选实现及证据 | 状态 / 未完成范围 |
| --- | --- | --- |
| 首页、Hero、宣传片 | [首页](E:/Recovery/.jinxi-research/phase3-member/worktree/app/page.tsx)、[home组件](E:/Recovery/.jinxi-research/phase3-member/worktree/components/home)；保留纸张 UI、/1.mp4、弧形箭头 | 已有本机/云 TEST 回归；不得重新设计；非自动播放、首页不提前下载视频 |
| 成员与公会事实 | 静态档案、成员轮播/画廊、[事实摘要](E:/Recovery/.jinxi-research/phase3-member/worktree/lib/guild-home-facts.json)、[同行时光](E:/Recovery/.jinxi-research/phase3-member/worktree/components/guild-uptime-terminal.tsx) | 208 份档案、创立日2018-02-10；不是208个在线/有效登录账号 |
| 留言、回复、反应 | [留言服务](E:/Recovery/.jinxi-research/phase3-member/worktree/services/message-wall-backend.ts)、[messages](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/messages.js)、message-actions | 云 TEST 合成公开读取可用；发布/回复/删除/管理等旧写入关闭，正式可信作者绑定未实施 |
| 双行留言展播 | [message-showcase](E:/Recovery/.jinxi-research/phase3-member/worktree/components/home/message-showcase.tsx)、ribbon 行及 motion hook | 已实现暂停、减少动态与生命周期保护；原 UI 保留 |
| /guides/ 阅读及精选 | [独立页](E:/Recovery/.jinxi-research/phase3-member/worktree/app/guides/page.tsx)、[strategy-read](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/_shared/strategy-read.js)、services/home-guides.ts | published 读取、摘要、latest/video/pinned先筛选后LIMIT3；云 TEST 合成契约通过。投稿/评论/点赞/收藏/审核的真实写入未恢复 |
| 视频统计和封面 | [统计函数](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/guide-video-stats.js)、[媒体SQL](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/_shared/strategy-media.js) | 合法URL的视频附件条目数；0与失败分开，URL合法不代表可播放。thumbnail合法回退；不造封面/播放量/时长 |
| 外链/本站双模式视频 | [设计及演示](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-8/VIDEO_DESIGN.md)、其video-demo目录 | 已有隔离演示，未写真实攻略或接正式投稿；可选playbackMode兼容media_files，不重定义B1统计 |
| 公告 | [cyber-announcement](E:/Recovery/.jinxi-research/phase3-member/worktree/components/cyber-announcement.tsx)、DOMPurify清理及导出CSP | 公开读/安全渲染已验；“编辑本机草稿”仅本地，不是管理员发布；内部UI待第四阶段 |
| 赞助 | [sponsorship函数](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/sponsorship.js) | 合成公开只读可验；正式登记/管理写入未恢复 |
| 旧登录/改密/资料 | [旧登录函数](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/auth-login.js)、旧页面入口 | 新候选旧身份入口安全关闭；localStorage不是身份。旧生产部署行为不能仅由当前main推断 |
| 旧session-lab | [隔离页](E:/Recovery/.jinxi-research/phase3-member/worktree/app/session-lab/page.tsx)、_shared/session-lab.js | 历史本机合成会话/服务器积分和幂等实验；云端继续拒绝，不是正式登录/兑换已上线 |
| 新成员身份五项 | [member-local说明](E:/Recovery/.jinxi-research/phase3-member/worktree/member-local/README.md)、identity.cjs、database.cjs、schema.sql、server.cjs、demo.* | 已实现且本机合成实测；不在app/public/Functions入口、不加载首页，不提供云身份功能 |
| 签到、任务、积分、兑换、排行 | checkin/points/leaderboard/points-board及对应services；[恢复矩阵](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-4/RESTORATION_MATRIX.md) | 旧不安全写入/私有投影关闭；每日任务规则/历史参考值不等于当前可领取。跨刷新/设备未确认兑换恢复仅设计，不能宣称完成 |
| 组队、游戏数据 | [team-service](E:/Recovery/.jinxi-research/phase3-member/worktree/services/team-service.ts)、[game-data-service](E:/Recovery/.jinxi-research/phase3-member/worktree/services/game-data-service.ts) | 多为设备localStorage/默认数据；无已验共享后端或实时游戏能力 |
| 头像 | [profile-lab](E:/Recovery/.jinxi-research/phase3-member/worktree/app/profile-lab/page.tsx)、原PublicAvatar | 隔离本地裁剪/IndexedDB原型；正式安全上传/持久存储/全站作者头像未完成 |
| 在线人数及右侧抽屉 | [B2C+规划](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-0/B2C_PLUS_PLAN.md) | 尚未实现真实心跳、名单API、隐私开关或正式抽屉；首页仍“—”，不得显示合成在线用户 |

完整旧功能到新版恢复条件见既有 RESTORATION_MATRIX、[RESTORE_SEQUENCE](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-5/RESTORE_SEQUENCE.md)、[IDENTITY_AUDIT](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-7/IDENTITY_AUDIT.md)。旧站是否实际部署某功能须另结合 Published 产物和已授权只读证据，不能把 GitHub schema 或函数列表直接当成上线事实。

### 3.1 新本机身份的具体契约

旧源码 [database-member-auth-schema.sql](E:/Recovery/.jinxi-research/phase3-member/worktree/database-member-auth-schema.sql) 的关联是 accounts.id bigint PK；accounts.employee_no UNIQUE FK → profiles.employee_no PK。新实验通过独立不可变 account→随机member UUID映射实现稳定主体，不假定旧profiles已有UUID，不按昵称认领历史内容。真实库完整列/触发器/密码格式分布尚未亲连核查。

复用 [password.js](E:/Recovery/.jinxi-research/phase3-member/worktree/netlify/functions/_shared/password.js)：合成PBKDF2-SHA256 200000次旧格式与600000次新格式兼容；迭代有界并补足验证工作量。不接受明文/未知算法。真实208账号不能因这项合成兼容测试被宣称已可登录。

本机 `https://127.0.0.1:3069/api/member` 仅支持 login、me、本人profile、change-password、logout。首次改密前仅允许身份恢复/改密/退出，不开放资料。不存在、错密、锁定、停用、缺映射统一拒绝；客户端userId/memberId/账号主体等额外输入直接拒绝。

32字节随机不透明令牌，数据库只存摘要；`__Host-` Cookie，HttpOnly/Secure/SameSite=Lax/Path=/。POST要求精确Origin、JSON、体积限制，已登录写操作要求绑定会话的CSRF；无宽泛CORS，响应no-store。本人资料不返回登录账号、工号、密码散列、会话ID或IP。

会话过期、退出、改密、锁定/停用由服务端判定；改密撤销全部设备旧会话，重新启用不复活旧会话。7天绝对期限、30分钟空闲、最多5设备为**本地实验参数**，非正式产品批准标准。多标签共享Cookie；广播只触发服务器重验，不广播令牌。仍有效bearer Cookie可能被复用，不能声称窃取Cookie绝不造成会话盗用。

新数据库仅fresh loopback `127.0.0.1:55436/jinxi_member_local`。`jinxi_member_owner` NOLOGIN；运行角色`jinxi_member_session` NOINHERIT，无管理能力、对象所有权、DDL/TEMP、解锁、档案/身份映射和业务写权限；仅认证五表所需读取、密码/登录元数据、会话/限流的最小列写权限。实际权限和数据库身份先验，再业务查询；不是只凭URL/环境变量自报隔离。

## 4. 已确定的技术、产品和操作规则

### 4.1 UI与数据事实

依据 [DESIGN.md](E:/Recovery/.jinxi-research/phase3-member/worktree/DESIGN.md)：白/浅纸底、`#ffe528`黄、`#2360f5`蓝、`#151515`深描边、2px边框、4/8px硬影、16px卡片、12px按钮。保留已认可Hero、弧形箭头、成员轮播、留言墙、双行展播、同行时光和独立攻略。不加动画库、持续闪烁/发光、旧玻璃霓虹；不以全局!important/legacy补丁替代组件修复。

头像只能替换原框内部：保留尺寸/圆角/边框/阴影/位置；留言42px、回复30px、展播30px及攻略作者各原框均保护。没有图片或加载失败回文字；上传失败不丢旧头像；不能按相同昵称认领旧留言。现有公会图像也不能任意替换。

208按静态档案稳定ID计，不按昵称去重；创立日2018-02-10；在线不可用显示“—”，不是假0。视频统计按published合格附件条目，排除宣传视频；重复URL不同旧附件沿原定义各计一次，不静默改成唯一视频数。首页不预取完整阅读器、清理器、头像编辑器、第三方播放器或视频。

暂停机制覆盖hover/focus/touch/手动/后台/离屏与prefers-reduced-motion；保持真实Tab下3px focus-visible，不放宽断言假绿。长文本、空态、失败、移动320/390及键盘均需验收；静态截图不能证明交互。

### 4.2 未来在线成员规格（后续B2-C+，本轮未实施）

服务器有效会话 + 有效/未锁定成员 + 有效活动心跳，多标签/多设备按稳定member ID去重。60秒心跳、180秒超时、15秒聚合缓存仅待测初值。绿色静态点意为最近窗口有心跳，不证明此刻正在浏览。

首页可公开聚合总数X；具体名单只向已登录成员提供，个人在线可见性**默认关闭、主动开启**才进入Y人展示。不能先发私有全名单再前端过滤；不泄露账号/工号/IP/设备/会话/精确活动时间；同名匿名作者不被关联。

点击在线卡片右侧抽屉“在线公会伙伴”，原文字/真实头像、昵称、静态绿点、“X人在线·Y人公开展示”。保持纸张UI，约380–420px、手机不溢出、Escape/遮罩关闭、焦点陷阱与返回、背景滚动锁定、减少动态。仅打开且可见时有限轮询、合并请求/按需分页；不默认WebSocket，不重复造心跳。无人在线、无人公开、加载/过期/断网/服务器错误分开。名单逻辑路由要核实Netlify真实映射，不能假定嵌套路径天然可用。

### 4.3 安全与授权纪律

- 只在已批准资源及动作范围操作。生产数据库、真实账号、存储、正式部署必须另行明确批准；不读原始密钥，不输出完整DSN，不导出.env/Token/hash/账号私有资料。
- 生产禁用DROP/TRUNCATE、不受控ALTER、重置/覆盖、重导账号、改旧密码/解锁/激活/覆盖积分留言。`scripts/import_accounts_to_db.js`旧ON CONFLICT会覆盖密码/is_locked/is_active，冻结不能直接解除运行。
- 当前F03授权仅合成只读云TEST；不自动扩展为云身份写入。不得改变reader、启用writer LOGIN、把本机schema直接上云或替换已验部署。
- 旧localStorage仅历史数据与草稿，不是认证；不能恢复客户端自报作者、账号、价格、奖励。服务端决定主体/规则、可信商品价、事务与幂等。
- 不新建不必要PR19、不改main/原18PR、不强推、不自动合并/发布/解锁、不产生未批准费用；推送审核分支也须后续授权。代码集成、环境验收、真实数据迁移、发布分开。
- 不删失败证据，不靠扩大any、ts-ignore、缩小include、关strict或放宽测试制造通过；不以测试数量增加代替行为和权限证据。
- 用户已多次要求停止重复审计、重复截图/空表查询、空泛方案和额外关卡。复用现有文档；真实技术冲突才最小修正，说明原因。没有待办时不要索要新凭据。
- Windows删除/移动/停进程必须核实绝对目标与专用实例；不因端口冲突杀不明服务。后台辅助进程隐藏窗口，不清理用户工作树/证据。

## 5. 历史问题、修复与保留失败

| 问题 | 原因及最终处理 | 验证/现状 |
| --- | --- | --- |
| 最初首页方案未认可 | 早期星夜视觉不符合目标，替换为REA-002依据实际参考的纸张视觉 | 旧方案仅历史，不再重做首页 |
| B1卡片focus 0px≠3px | 必须区别鼠标/脚本聚焦与真实Tab的:focus-visible，完成真实输入模态复核 | PR8及后续完整回归；不是当前未通过项，不重启早期失败任务 |
| 旧TS28、Lint/CI缺失 | Toast、Sidebar、攻略契约、档案配置、正则目标分批修；保留strict，建立非交互ESLint与CI | PR14及本轮raw tsc/lint exit0；旧“28项仍在”过时 |
| 旧客户端身份/积分信任 | userId、奖励/价格/作者可自报，localStorage不建服务器认证 | 全旧入口先阻断；server规则在隔离session-lab演练，不等于正式恢复 |
| 公告黑名单/脚本CSP过宽 | 受维护DOMPurify白名单、URL/粘贴/图片策略；静态导出生成脚本哈希 | PR13无害XSS样本与浏览器证据；不盲删必要style支持、不重开发布 |
| Next16 JS增加 | gzip首页182556→228546B，+45990B；45950B来自主要框架/ReactDOM/路由块 | PR16来源及重复性能数据；不能仅凭LCP接近说等价 |
| 动效拆分试验无收益 | m/LazyMotion与既有FAQ异步motion破坏共享，额外+4302B | 已撤回，保留原动效，不重复研究 |
| TEST预检平台ACL兼容 | Neon cloud_admin默认模板不是任意用户越权，原脚本全拒绝误阻塞 | 精确识别已解释模板，未知/全局/权限变化仍拒绝；失败和专测保留 |
| reader初始无法设密/登录 | 无密码角色平台Reset限制，且误用owner密码不能认证reader | 隐藏输入helper、SCRAM、原生psql真实reader证明；凭据不入Git |
| TEST Git Host key verification | 缺Netlify GitHub App installation绑定 | 绑定现有80952013，未关闭SSH验证 |
| Windows npm启动器到Linux失败 | 仅Windows相邻node_modules/npm路径假设 | 7a65修复POSIX lib布局，并实际Linux CI验证 |
| TEST React418水合失败 | 平台head注释/前导换行与普通head资源声明顺序；只移注释的诊断不足 | 13de改为React管理link/style资源；840+277原CSS字节不变，真实未修改响应三宽度通过；不忽略水合、不降CSP |
| 本机本人资料日期偏一天 | PG DATE经JS Date/UTC切日导致2018-02-10→09 | SQL直接to_char YYYY-MM-DD，严格回归原日期 |
| SQL缺批准标记意外放行 | NULL比较在IF中为unknown | IS DISTINCT FROM，DDL前真实缺标记负向失败，再合法初始化 |
| 最初PG/HTTPS用例失败 | idle用例误命中过期行；伪Host同时改SNI导致先被TLS正确拒绝 | 只改目标会话、用受信CA+正确SNI测Host；CHECK/TLS不放宽 |
| 延迟401删新登录 | 旧恢复响应晚于新登录；前端代次只保UI不能阻止Set-Cookie删除新Cookie | 6f71：401不隐式清Cookie，仍拒绝；显式退出/改密照常撤销清除，前端只当前代次更新。延迟真实401的失败/成功浏览器证据及PG五宽度重跑保留 |
| 旧out/1.mp4 EPERM | 历史原目录文件访问失败，隔离副本构建可用 | 后续Next16/新工作树构建成功；没有声称旧文件锁根因已修，不随意删out |

证据入口：[B1复核](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/005s-b1/REVIEW_GUIDE.md)、[HTML/CSP](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-4/HTML_AND_CSP.md)、[包体归因](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-6/BUNDLE.md)、[性能](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/b2-a-6/PERFORMANCE.md)、[F03失败](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/f03-f05/FAILURES.md)、[本机身份交付/失败](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/DELIVERY.md)。性能数字是指定环境历史样本，非当前生产SLA；不再做无收益框架/动效拆分。

历史原完整失败日志含合成摘要的片段和冗长证书对象，已私有保留及登记hash；公开证据保留错误码、失败位置与计数并脱敏，不索取私有原文或复制到交接。后续修复不抹掉这些失败。

## 6. 当前仓库、环境与测试的真实快照

### 6.1 Git与文件保护

本轮开始最新工作树干净，无暂存/未暂存/未跟踪/冲突。原PR14目录和F03工作树本轮也未见未提交输出。未切分支、未fetch改引用、未提交/推送。**完成本次交接后预期只有根CODEX_HANDOFF.md修改、artifacts/handoff/新备份与核验资料未跟踪；这些文档尚未提交。** HEAD仍6f71。

本地`HEAD`对`main`完整Git差异：2483文件，399348插入、9088删除（包含大量既有证据，非纯产品代码行）。采用本地Git对象比较，不受GitHub PR files API文件数量上限影响；不把本次祖先核验说成又完成一轮全源码安全审计。PR18后当前候选完整保留原18PR祖先，优先复用当前累计候选，避免从main重建或再做重复巨大PR。

当前身份改动：member-local/、scripts/member-local.cjs、两项身份测试、package脚本/ESLint范围、artifacts/phase3-member、UI_AUDIT和交接提示。对d43的app/components/hooks/lib/services/public/styles、Netlify Functions、test-environment、netlify.toml、workflow、package-lock内容差异均为空。

`node_modules`是指向F03工作树安装目录的junction。不要随意在此npm ci清空共享安装；需要干净重装时另建已批准独立目录并保留lock。本轮未npm ci、未重新build。原所有基线worktree、构建副本、工具和证据保留，运行`git worktree list`查看真实路径，不reset/clean/remove。

### 6.2 本轮安全重验与既有实测分开

| 范围 | 结果与证据 | 本轮是否重跑 |
| --- | --- | --- |
| 原始TypeScript | `tsc --noEmit --incremental false` exit0 | 是；[本轮typecheck](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/typecheck.log) |
| ESLint非交互 | exit0，max-warnings0 | 是；[本轮lint](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/lint.log) |
| API/安全单元 | 14/14 + 71/71，fail0 | 是；[本轮unit](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/handoff/2026-11-07T09-00-53Z/unit.log)，clean runner剥离数据库/云变量 |
| 当前源码/提交绑定 | results.json的12项LF归一化SHA256，与工作树及HEAD blob均一致；保护源码无diff | 是；本轮核验记录 |
| 原始构建 | exit0，静态CSP7页8哈希 | 既有本机build.log；此次不重写构建产物 |
| 新本机PG/HTTPS | 17组子场景通过；Node报告18项含父项 | 既有postgres-cookie-race.log；此次未创建/重置DB |
| F03只读回归 | 46/46，另一fresh loopback55435合成集群 | 既有read-only-regression.log，不是云SQL |
| 身份浏览器 | 1440/1024/768/390/320、真实3px键盘焦点/reduced-motion、改密/退出/过期/草稿、多标签、断网恢复；页面错/CSP/外部请求均0 | 既有[最终结果](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/browser/2026-11-07T08-32-58-428Z/results.json)及同目录PNG；此次未启动浏览器 |
| Cookie响应竞态 | 延迟实际401，登录后释放；新显示与服务器本人资料仍有效 | [先失败](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/session-race-failed.json)、[后通过](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/session-race-passed.json) |
| 云TEST现状 | 指定Deploy/SHA保持ready，stop_builds=true、skip_prs=true | 本轮只读Netlify元数据复核；不读env值 |
| GitHub CI | d43及13de均completed/success且head_sha匹配 | 本轮只读REST复核；不是6f71的CI |

本机身份覆盖208条**完全合成**旧形状兼容记录（事务回滚）、正确/错误/不存在/锁定/停用账号、强制改密、跨账号拒绝、伪造/轮换/过期/退出重放、锁定再启用不复活、并发设备上限、SQL注入/输入校验/CSRF/Origin/限流、实际最小列权限/DDL/TEMP/definer/业务越权拒绝、指纹/权限漂移阻断、事务故障回滚。详见 [results.json](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/results.json)及引用日志，不能扩大为真实成员验收。

真实已成功CI：[已验部署源码13de](https://github.com/2574303451-create/jinxi-web/actions/runs/42344725850)、[累计资料d43](https://github.com/2574303451-create/jinxi-web/actions/runs/42347156554)。现workflow [security-checks.yml](E:/Recovery/.jinxi-research/phase3-member/worktree/.github/workflows/security-checks.yml)在Ubuntu24/Node24执行npm ci、原始tsc/build/API安全/lint、PG17临时集成。它没有发布步骤；本地新member-local PG完整套件尚未加入云CI，不应以原CI包括老session-lab就声称覆盖新实现。

此次GitHub连接器传输失败，公开REST个别EOF后curl HTTP1.1成功。只读元数据结果保留；不要将网络失败误报“PR数量0”。Releases/tags空数组与PowerShell外层数组Count=1的包装差异已经纠正。

### 6.3 云端合成TEST与生产：严格分开

| 资源 | 已知身份与状态 | 证据边界 |
| --- | --- | --- |
| Netlify TEST | `jinxi-web-test`；Site `17885134-a57c-4589-83d3-39e30be9e0cf`；Deploy `6aeebe4ceae178c10e4199e8`；源码`13de96d7531dde3222fdf513e711447a1df3e425`；https://jinxi-web-test.netlify.app/ | 本轮只读确认ready、构建暂停、PR预览关闭；不能替换为6f71 |
| TEST上下文/团队 | TEST站点自己的`production`部署context，数据分类`synthetic-test`；XUST Legacy Free，团队`689e1405e8627000726e883c`，GitHub App installation80952013 | context叫production不代表生产资源；额度团队共享，不是独立计费保证 |
| Neon TEST | 项目`jinxi-test / restless-salad-74668264`；分支`production / br-red-pond-bdtrjpmy`；endpoint`ep-dry-queen-bd6q46s6`；DB`neondb`；PG18.6 | 用户预检、初始化COMMIT、reader原生证明和托管合成读取的既有证据，此次不连Neon |
| TEST实际注册 | cluster `7704950029723409949`、OID16397；环境UUID `0fdb5a68-436e-4a80-b01d-5b0207637eac`；指纹`c0d2a0fbc7baf4b680e8a9403052245636078e5cb41c3d51a4d27a3c3641ede1` | ID是非秘密元数据，仍须与实际DB/role/ACL证明联合，非自报开关 |
| TEST运行权限 | `jinxi_test_reader` LOGIN/NOINHERIT且实际只读最小ACL；`jinxi_test_owner` / `jinxi_test_writer`保持NOLOGIN | 这里不指平台初始化主体neondb_owner；不能用管理员跑站点或把writer解锁作为新身份捷径 |
| TEST数据 | 5攻略（4published）、2留言、4禁用合成账号、0会话；公共公告/赞助各1；视频附件合成统计1 | 不是真实公会数量；URL合法但不保证可播的样本是刻意测试 |
| 旧生产Netlify | `jinxi-web`；Site `613b5b7c-45b1-494f-9328-dd0625a57963`；Published `69a92f4f7be620c834490be1`；https://jinxi-web.netlify.app/ | 锁定、main-only、Don't deploy pull requests来自已签核控制台/既有元数据；本轮未操作/重查旧站 |
| 旧Published产物 | [独占部署链接](https://69a92f4f7be620c834490be1--jinxi-web.netlify.app/)，用户控制台2026-03-05 15:22、Production、12Functions/5redirect/17header | 完整源码SHA、所有Functions实际版本和连接仍有未确认项，不与Git main混同 |
| 旧Neon生产 | `jinxi-web`：production、development、pr17-validation | 都受历史数据保护；pr17-validation为真实副本，绝不可公开TEST |
| 旧数据基准 | public13基础表、131字段、494记录；账号/档案各208，孤立/缺资料0 | 用户控制台聚合证据，不是本轮亲连核验，也不是仓库静态208的推论 |
| 生产备份 | 2026-11-06 09:58:43 UTC手动快照、Expires Never；pr17-validation各表数量匹配 | 用户证据；独立pg_dump/pg_restore及恢复可用性尚未实际验证 |
| 旧未知项目 | snowy-bar-74188325 | 来源待核实，不清理、不挪用 |

旧12Functions：announcements、auth-change-password、auth-login、checkin、leaderboard、message-actions、messages、points-board、points、sponsorship、strategies、strategy-actions。新版另有guide-video-stats及local-only session-lab，不能将两套数量/版本混为一谈。

TEST变量只记录key：JINXI_RESOURCE_ENVIRONMENT、JINXI_RUNTIME_CONTEXT、JINXI_CLOUD_ISOLATION_APPROVAL、JINXI_TEST_APPROVED_COMMIT、JINXI_TEST_READ_DATABASE_URL。后者是秘密，不读值。Legacy Free下已验Build/Functions/Runtime作用域与clean子进程隔离，不让Next编译子进程继承DB密钥。团队“无共享变量”是用户确认事实。任何approved字符串都不能替代Site/SHA/DB/role/ACL实际校验。

既有云验收：HTTP31项、云浏览器1440/390/320、Node构建24.22.2/npm11.19.1、Functions部署元数据nodejs24.x（并非已亲测其进程补丁号）；错误非秘密context实际构建被拒绝且未替换Published。生产地址/凭据负向只用虚构对象或本地模拟，**没有实际连生产证明拒绝，也没有网络出口防火墙认证**。正常reader实际ACL拒绝证据另列。锁定发布不能证明密钥隔离，也不能撤销已有部署的变量快照。

早前误贴的TEST owner密码已由用户确认重置；不要复述、试用旧密码或再索要连接串。reader密码私下设置及配置已完成，当前无凭据/控制台截图待办。

## 7. 遗留问题与风险（明确状态）

| 优先级 | 项目 / 当前状态 | 前置与最终验收 |
| --- | --- | --- |
| P0 | 历史生产数据/旧站保护必须持续；旧Published来源部分未核实 | 保留锁、禁预览、账号/积分等原数据；不得为了测试试连或改生产 |
| P0 | 云端真实成员会话未授权、未启用 | 本机候选独立审查；受限认证写角色/实际云schema适配与TEST授权，不能直接运行本地SQL/开启writer |
| P1 | 正式账号真实结构、密码分布、映射及独立恢复备份待核实 | 未来单独授权的最小元数据审核及私有备份恢复演练；不导出成员凭据到CI |
| P1 | 新候选旧业务关闭，直接发布会功能倒退 | 按固定顺序恢复并验收登录→留言攻略→签到→积分→其他；不能保留可点击但伪成功按钮 |
| P1 | 本机6f71未推送/新CI，缺共享盘就无法完整接管 | 安全副本保留两提交和证据；独立审查后仅另获审核分支push许可，不自动部署 |
| P1 | 积分完整恢复与未确认订单跨刷新/设备恢复未实现 | 主体/价格/规则由服务器，幂等凭据/收据查询、并发/余额/故障/跨账号回归；不得恢复旧接口 |
| P1 | 全站统一服务器身份Provider未接入 | 导航、资料、作者和退出状态一致；旧localStorage只草稿/历史，不能直接授权 |
| P2 | Next16实测框架体积代价仍存在 | 沿用Next16/React19/Node24候选；真正产品改动再测性能，勿重复无收益拆分/假等价结论 |
| P2 | UI-DEFER-001：首页FAQ内层未统一 | 只登记，待第四阶段；组件源代码/展开/焦点/长文本/移动/减少动态实际验收 |
| P2 | UI-DEFER-002：公告弹窗内层未统一 | 只登记，待第四阶段；0/1/多公告、加载失败/草稿/手机/键盘，不改变本机草稿权限 |
| P2 | 原UI_AUDIT其他未完成模块仍待验收 | 保留原待办，不因首页或此登记而标全站统一 |
| P2 | 正式头像、存储持久化、在线心跳/名单/抽屉未实施 | 可信身份及单独安全/隐私/存储授权，严格保原头像框与默认隐藏在线 |
| P2 | 历史脚本绝对路径、证据量及旧文件锁 | 迁机先适配工具；关键报告/失败/PNG保留，重复大文件未来可建议CI Artifacts，不未经审查删除 |

UI两项已在 [UI_AUDIT](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/rea-003/UI_AUDIT.md)明确编号、用户观察、代码线索、差异、待修复、未来验收和权限影响。当前按用户文字登记，原始当次截图未在身份开发回合取得，不能说已自动复验。身份代码没有改FAQ、公告JSX/CSS、文案、主题或通用组件。

历史文本纠错：旧交接的“B1仅本地9暂存/19未跟踪”“B1焦点未过”“无CI/Lint”“28项仍失败”“无云TEST”均为过期快照；其失败/资产不删除。WEB_EXPLORATION日期2026-11-04，旧架构/40错/跳过构建类型检查等不代表当前。UI_AUDIT正文中的“只有首页/第二批未实施”为原审计时点；攻略独立页等已后续交付，但其未闭环UI项不自动完成。F03 results.json顶部testedGitHead等是早期运行快照，最终部署以gate3Execution/13de/d43为准。

## 8. 下一阶段顺序、停止点与恢复原则

**最近唯一建议任务：先对本地6f71身份候选进行独立源码与证据复核，尤其旧401响应、撤销/首次改密、最小权限与旧schema兼容；不继续开发业务，不重建F03。** 当前用户本轮仅授权交接，文档完成后停止。

若独立审查通过，下一项需明确批准的动作仅为：将既有两本地提交推送至独立审核分支，供网页版GPT/用户审核；不创建不必要PR、不改当前TEST部署。没有新授权不push。

未来已定顺序，不作为此次执行许可：

1. 身份：在独立合成TEST审查云认证角色/权限、实际schema适配、会话撤销/密钥/清理，获批后只登录、本人资料、改密、退出；保留现有只读TEST可恢复路径。
2. 留言/攻略：认证作者绑定、权限/审核/限流/失败回滚，游客能力单独设计，昵称不授认证。
3. 签到：幂等重复防护、服务器规则、统计/奖励事务。
4. 积分：可信余额/流水/排行/价格、并发幂等兑换及跨设备收据恢复。
5. 头像、在线、公告、赞助、组队/媒体等分检查点；第四阶段完整UI一致性验收，不重做认可首页。

集成优先复用PR18之后的累计线性历史；保留18PR追溯，不从main重做，不擅自新增汇总PR/改base。今后集成前必须保护旧Published、核实预览不获生产凭据、验收独立TEST、业务能力无不可接受倒退、明确回滚；代码集成不等于批准数据迁移或上线。

回退：本机实验仅停止本次新服务/新临时集群，保留工作树与提交，不reset或清理旧资产。云TEST保持13de/Deploy6aeebe4c和d43资料可追溯；未来停止TEST须管理员按原签核撤销专用凭据/处理旧部署，删除变量并不能让旧部署快照失效。不得因TEST失败操作旧站/真实数据。真实数据迁移只做独立增量、备份恢复和不变性验证，历史schema含示例INSERT不得直接重跑。

## 9. 新会话接管指引与安全命令

### 9.1 按需阅读，避免重审全项目

1. 本文 → [AGENTS](E:/Recovery/.jinxi-research/phase3-member/worktree/AGENTS.md)、[COLLABORATION](E:/Recovery/.jinxi-research/phase3-member/worktree/COLLABORATION.md)、[历史源码探索](E:/Recovery/.jinxi-research/phase3-member/worktree/WEB_EXPLORATION.md)，以实际代码和最新状态纠正历史快照。
2. [member-local/README](E:/Recovery/.jinxi-research/phase3-member/worktree/member-local/README.md)、[身份DELIVERY](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/DELIVERY.md)、其results.json、session-race失败/成功及最终浏览器结果。
3. [F03 ADMIN_SIGNOFF](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/f03-f05/ADMIN_SIGNOFF.md)、其DELIVERY/results.json的最终gate3Execution；仅作既有保护基线，不重跑建设。
4. 涉UI再读DESIGN/UI_AUDIT；正式schema兼容再读b2-a-4/MEMBER_SESSION_PLAN及b2-a-7/IDENTITY_AUDIT；数据保护再读b2-a-8/HISTORICAL_DATA、BACKUP_RESTORE、INCREMENTAL_MIGRATION。
5. B1或运行时有真实回归才查对应历史报告，不重新审计18PR、抓旧站或进行无目标研究。

建议技能：handoff用于交接；需要独立分支审查时用review（先遵守技能/代理授权规则）；真实错误用diagnose复现→定位→最小修复→回归；UI第四阶段才用frontend-ui-engineering。REA只在确有发布产物/真实参考取证需要时使用，不为普通源码再做环境普查。此交接未启动子代理。

### 9.2 先核对；下列命令无业务数据库操作

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase3-member/worktree'
git status --short --branch
git rev-parse HEAD
git diff --cached --stat
git diff --name-only --diff-filter=U
git worktree list

& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' --version
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' --version
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run typecheck
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run lint
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' test
```

期望Node24.22.2/npm11.19.1、raw tsc/lint exit0、API14/安全71；新增代码后不机械沿用旧数量。所有证据路径指向此根目录，迁机按同一仓库相对位置重定位。不要dump进程env、调用env:list或原始env GET。clean runner只继承OS/工具链，防止数据库/云变量注入；配置名校验也必须避免读值。

构建流程：prebuild生成档案摘要 → next build --webpack → postbuild生成静态CSP；start为静态预览脚本，export为build别名，不用next start/旧next export部署。**build与tsc必须串行**，build会删除重建类型目录；历史并发TS6053不能误当业务错误。build可能改生成文件/行尾，先保工作区；此次未运行。

### 9.3 仅在恢复本地验证任务获准后使用

PostgreSQL17.11：`C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres/pgsql/bin`；OpenSSL：`D:/Program Files/Git/usr/bin/openssl.exe`。不得用其他应用（如MATLAB）自带PG。浏览器工具在独立TEMP/jinxi-browser-tools/node_modules/playwright，Edge在Program Files (x86)/Microsoft/Edge/Application/msedge.exe；不是应用新增依赖。

```powershell
# 新临时合成集群与HTTPS演示，不读.env/Neon，不接已有DB。
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run member:local -- --pg-bin 'C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres/pgsql/bin' --openssl 'D:/Program Files/Git/usr/bin/openssl.exe'

# 或单独运行实际本机PG/HTTPS套件；不要与上面的演示同时占用55436。
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' 'scripts/run-clean.cjs' run test:member-local -- --pg-bin 'C:/Users/lilei/AppData/Local/Temp/jinxi-005s-b1-postgres/pgsql/bin' --openssl 'D:/Program Files/Git/usr/bin/openssl.exe'
```

演示URL `https://127.0.0.1:3069`，只有本机自签证书，不改系统信任。仅输入新生成的合成账号；启动只输出私有凭据文件路径，不分享其内容。每次fresh集群不是持久成员库，Ctrl+C/finally停止本次服务，不删其他实例。本轮确认3069/55436/55435无监听，旧55433状态此次未重新认证，不能假定其仍运行。

测试副作用必须区分：`test:member-local`新建并停止55436；`test:test-environment`新建55435；旧`test:integration/test:postgres`涉及55433专用fixture的重置，必须先读说明和目标保护。`scripts/check-test-foundation.cjs`会改写原results，不作为只读交接命令。`database-b2-member-session-draft.sql`仍DRAFT_NOT_APPROVED，其他历史schema/导入/云包装也不直接执行。不要照旧文档盲跑SQL。

### 9.4 没有共享工作目录时

**GitHub clone只能取得d43及以前，不能取得两项本地身份提交或本次未提交交接。** 新会话应先拿到经用户授权的安全Git bundle/提交补丁与必要新文件/证据及此文档，校验两个完整SHA与12项源码指纹；缺安全副本时明确停止在资料接收，不凭摘要重写后声称无损接管。

本轮没有制作/上传源码包。未来传递须排除.env、.netlify认证、owner/reader密码、runtime/pwfile/私有账户清单、数据库data目录、node_modules、临时证书私钥和真实成员资料。保留Git历史、已提交源/关键证据及这次文档；不能把最初PR14目录当最新副本。新机器路径不存在应先映射安全副本，不能假装能控制用户127.0.0.1服务。

## 10. 交接质量审查与本轮停止状态

已核对实际Git/远端main与累计HEAD/18PR元数据和祖先/对应CI，复核TEST只读控制面，重新raw tsc/lint/API安全及源码指纹。数据库、浏览器和构建沿用已绑定源码的既有实测，不伪称本轮重跑或生产验收。未修改业务/视觉代码、原UI待办、数据库、env、云设置、Git引用或发布状态。

旧交接完整备份、hash相符；新文件不是简单叠加过期“当前”快照。所有未完成/未验证项保留状态，关键本地未上传成果及迁机缺口明确。文档编写后再检查链接、围栏、敏感模式、HEAD/受保护代码/暂存状态，详细结果登记本次handoff-verification.json。该记录与备份仅此次文档成果，不产生新的管理员验收关卡。

## 11. 可复制的新Codex会话启动摘要

```text
接管今夕公会官网，先读最新根CODEX_HANDOFF.md并核对实际Git。本次准备交接，不授权继续开发/推送/部署。
仓库：https://github.com/2574303451-create/jinxi-web
最新本机根：E:/Recovery/.jinxi-research/phase3-member/worktree，Windows/PowerShell。
本地分支codex/jinxi-phase3-member-local，HEAD6f71de9eec8093e3d139b3201fe4249c6b0e52ff；前一提交03f20a11cd1ec57ff779a10988fb7039cbf0ba05。两提交未上传，无PR19/新云CI；本次交接文档及备份未提交，禁止覆盖。
GitHub累计分支codex/jinxi-f03-f05-test-foundation=d43ee24cfde1277eedabc8c8856de697b702dc0f。PR1–18全部草稿未合并，均为本地候选祖先，保留追溯。原E:/Recovery/jinxi-web停在PR14，不用它继续开发。
Next16.4.5/React19.3.1/Node24.22.2/npm11.19.1，静态导出out；严格tsc已exit0。node_modules为共享junction，勿随意npm ci清空。
F03/F05获准合成只读云TEST已过：jinxi-web-test，Site17885134-a57c-4589-83d3-39e30be9e0cf，Deploy6aeebe4ceae178c10e4199e8，接受源码13de96d7531dde3222fdf513e711447a1df3e425；构建暂停、PR预览关闭。Neon独立jinxi-test/restless-salad-74668264，branch br-red-pond-bdtrjpmy，endpoint ep-dry-queen-bd6q46s6，neondb；jinxi_test_reader只读，jinxi_test_owner/jinxi_test_writer NOLOGIN。不要重建F03或索要凭据。
最新实现仅member-local/独立loopback HTTPS：合成登录、会话、本人资料、首次/普通改密、退出。旧账号id bigint/employee_no关联档案，新增稳定UUID映射；PBKDF2兼容、HttpOnly Secure Cookie、Origin/CSRF、撤销/限流/最小ACL。未接首页/Netlify，未启云写入。
6f71修复延迟旧401删除新登录Cookie：401不隐式清Cookie，仍拒绝；主动退出/改密撤销清除。真实失败/成功、PG/浏览器证据在artifacts/phase3-member/。
本轮交接重跑raw tsc/lint、API14/安全71均通过，12源码指纹匹配；既有实际PG17组子场景（Node18含父项）、只读回归46、build、五宽度浏览器通过，此次未重建数据库。d43/13de真实CI成功，不冒充6f71已过CI。
UI-DEFER-001 FAQ/002公告内层已在artifacts/rea-003/UI_AUDIT.md登记，待第四阶段；没有改JSX/CSS/主题。保护Hero/箭头/双行留言/时光/208档案/2018-02-10/独立guides/原头像框，在线仍—。
生产旧站jinxi-web Published69a92f4f7be620c834490be1锁定，main-only且禁PR预览；Neon jinxi-web production及pr17-validation真实历史数据严禁公开TEST/修改。手动快照用户已确认，但独立备份恢复未实测。禁止生产连接、迁移、真实账号导入、云writer LOGIN、旧不安全业务恢复、合并/发布/付费。
建议下一任务仅独立审查本地6f71；审查通过后另获“推送审核分支”授权，不能扩展到部署。后续顺序身份→留言攻略→签到→积分→其他。
若没有共享本机目录，clone没有两项本地提交和新交接，必须先取得安全副本；不附密钥/.env/真实账号/数据库目录，不凭摘要重写实现。
```

