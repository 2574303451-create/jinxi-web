# JINXI-WEB 第三阶段成员身份最终独立审查

日期：2026-11-07（北京时间）。结论：**本机成员身份候选未发现新增阻断缺陷，保留已验证修复，适合申请独立审核分支的安全推送授权；本轮没有推送或部署。** 本结论不等于正式云端身份或真实成员验收。

## 版本来源、工作树与三种状态

- 实际工作区根：`E:/Recovery/.jinxi-research/phase3-member/worktree`。
- origin（fetch/push）：`https://github.com/2574303451-create/jinxi-web.git`；共享Git目录为`E:/Recovery/jinxi-web/.git`。
- 分支：`codex/jinxi-phase3-member-local`。本轮开始HEAD仍为`6f71de9eec8093e3d139b3201fe4249c6b0e52ff`，尚未包含上一轮未提交的恢复竞态补丁。
- 祖先关系：累计d43ee24cfde1277eedabc8c8856de697b702dc0f → 03f20a11cd1ec57ff779a10988fb7039cbf0ba05 → 6f71de9eec8093e3d139b3201fe4249c6b0e52ff → 本次本地收尾提交。原两项身份提交保留，未重写。
- 初始未提交：CODEX_HANDOFF.md、member-local/README.md、demo.js、package.json，身份新增两项测试、交接资料、新截图/日志。无暂存、无冲突，详见[开始状态](before.json)。
- 经本轮确认后，将所列修复、测试、证据及必要交接一并保存为一个本地收尾提交。包含本文件的提交即最终收尾版本；其父提交为6f71。完整SHA由`git rev-parse HEAD`及最终答复/外部提交回执记录，避免在提交内写入循环依赖的自身SHA。
- **未提交**指尚未进入commit的工作区内容；**已提交**指本地Git已有commit；**已推送**需要远端分支实际包含该commit。本轮只完成本地提交，未推送，未建立新PR，未产生该候选的新云CI。若拿到的是提交前工作树，以实际git status为准。
- 本轮只读远端仍为main=`2ce600a79955cd5e5a7bd798f266f8e17b0c283e`、累计F03/F05=`d43ee24cfde1277eedabc8c8856de697b702dc0f`；目标身份分支未返回，见[远端头](remote-heads.txt)。

`E:/Recovery/jinxi-research/takeover-20261107-092150/`（没有点）实际不存在。正确路径为`E:/Recovery/.jinxi-research/takeover-20261107-092150/`，仅存接管报告、日志与复现脚本；不在git worktree list中，无.git，从该目录git rev-parse返回128。它不是业务源码工作树或新分支。原`E:/Recovery/jinxi-web`仍停在PR14/7f850e1，不能替代最新身份工作树。本轮原PR14与F03/F05工作区均干净。

## 真实修复与独立行为审查

实际产品改动仅为既有member-local/demo.js的恢复协调：登录、本人资料读取、改密和退出进行中，online/focus/跨标签通知在统一入口排队合并，完成操作后用当前Cookie核验；保留请求代次，丢弃迟到恢复结果。后台补验身份未变时更新内存令牌而保留资料/反馈；真实失效仍隐藏身份。成功退出/改密后的预期401不覆盖成功提示。

本轮未再修改demo.js、服务器Cookie/认证、密码逻辑、schema或ACL。只补齐收尾要求的测试覆盖和验证工具路径，保留上轮修复。

| 场景 | 实际断言与结果 |
| --- | --- |
| 登录前旧401晚到 | 实际延迟401；登录后释放仍显示成员，服务器本人资料200 |
| 登录中反复联网/聚焦 | 操作中核验请求0，结束后仅1次GET，200；登录提示和草稿保留 |
| 退出后迟到旧200 | 当前补验401；旧200不能恢复身份，退出成功提示保留，服务器本人资料401 |
| 快速A→B及重复操作 | 同昵称不同稳定ID；A的旧me200及退出后匿名401在B登录后释放，UI资料和服务器仍为B；两次账号登录各只发1次POST，退出只发1次 |
| 操作失败与重试 | 错旧密码实际403，身份仍有效且无改密成功提示；中断退出请求后显示网络未核验，服务器仍有效而不假称退出；服务器重验恢复后重试退出401；正确改密重试成功后必须重登 |
| 事件回归 | 12项执行实际demo.js的可控传输顺序，覆盖登录、失败恢复、资料保留、跨标签撤销、退出/改密、乱序、快速切换和重复操作，全部通过 |

上述快速切换测试使用同昵称不同ID，避免只比较昵称而误判账号未串。重复操作同时检查发出请求计数和最终服务器本人资料；没有仅用截图证明状态。

## 测试、工具与证据

| 验证 | 最终本轮结果 | 记录 |
| --- | --- | --- |
| 原始TypeScript | exit0，tsc --noEmit --incremental false | [typecheck.log](typecheck.log) |
| ESLint | exit0，max-warnings0 | [lint.log](lint.log) |
| API | 14/14 | [test.log](test.log) |
| 安全/事件回归 | 83/83，含原71及当前12；无失败/跳过 | [test.log](test.log)、[12项单独结果](ui-review.log) |
| 真实PG/HTTPS浏览器专项 | 5/5；页面错/CSP/外部请求0 | [结果](../../restore-race/2026-11-07T09-54-20-686Z/results.json)、[执行日志](https-review.log) |
| 五宽度原脚本重验 | 1440/1024/768/390/320全部通过 | [结果](../../browser/2026-11-07T09-59-51-544Z/results.json)、[执行日志](five-width-review.log) |
| 原脚本及源码绑定 | 原五宽度脚本SHA与原HEAD相同；实际demo SHA与HTTPS结果一致 | [重放源证明](five-width-replay-source.json)、[16份源码指纹](tested-source.json) |

五宽度断言实际包括：初始旧localStorage不授身份、真实Tab的3px焦点、HttpOnly/Secure/SameSite Cookie、JS不可读Cookie、不把凭据写入localStorage、无横向溢出、首次改密、退出、过期、草稿保留；1440双标签退出同步，390实际浏览器offline/online恢复。使用减少动态设置；没有修改这些原有断言。

本轮首次浏览器启动因临时Playwright入口文件缺失而失败，未产生通过结论，见[失败日志](https-tools-missing.log)。TEMP中的PG二进制也缺失；从独立工具目录恢复同版Playwright1.64.1/PostgreSQL17.11，不改应用依赖/lock。Node24.22.2/npm11.19.1、Edge140.0.3485.66；PG ZIP来源为EDB的17.11 Windows发行包，SHA256=`6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3`。工具存`E:/Recovery/.jinxi-research/identity-review-tools`，不进入提交。

首轮五宽度启动只有空日志，没有通过回执；后续有界重放完整通过。重放只将旧TEMP Playwright绝对导入指向恢复目录，原脚本/断言不改，工具解析信息已绑定。HTTPS新增可选`--playwright-module`绝对路径参数，兼容原四参调用。浏览器仅对loopback自签证书放行；未改系统信任或云TLS。

可复现命令（从实际工作树运行；工具路径需在本机存在）：

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase3-member/worktree'
$identityNode = 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe'
& $identityNode scripts/run-clean.cjs run typecheck
& $identityNode scripts/run-clean.cjs run lint
& $identityNode scripts/run-clean.cjs test

$identityBrowserArgs = @(
  'tests/member-local-recovery-browser.cjs',
  '--pg-bin', 'E:/Recovery/.jinxi-research/identity-review-tools/postgresql-17.11/pgsql/bin',
  '--openssl', 'D:/Program Files/Git/usr/bin/openssl.exe',
  '--playwright-module', 'E:/Recovery/.jinxi-research/identity-review-tools/browser/node_modules/playwright'
)
& $identityNode -e 'const {spawnSync}=require("node:child_process");const {cleanEnv}=require("./scripts/run-clean.cjs");const r=spawnSync(process.execPath,process.argv.slice(1),{env:cleanEnv(),stdio:"inherit",windowsHide:true,timeout:180000});process.exitCode=r.status??1;' @identityBrowserArgs

$identityBrowserArgs[0] = 'artifacts/phase3-member/final-review/2026-11-07T09-46-44Z/replay-five-widths.cjs'
& $identityNode -e 'const {spawnSync}=require("node:child_process");const {cleanEnv}=require("./scripts/run-clean.cjs");const r=spawnSync(process.execPath,process.argv.slice(1),{env:cleanEnv(),stdio:"inherit",windowsHide:true,timeout:180000});process.exitCode=r.status??1;' @identityBrowserArgs
```

后两命令顺序运行，仅新建fresh loopback55436与HTTPS3069，不接现有数据库，不读.env；正常finally停止专用实例，每次证据写新时间目录。不要与其他55436实验同时运行。原17组PG/HTTPS身份测试属于本会话早前实际验证，本轮因认证服务端未改未重复全套，也未重新构建Next或重审全站。

## 范围与现有保护

相对6f71，本轮与上一轮仅涉及member-local/demo.js及README、两项身份测试、package测试命令、必要交接/日志/截图。本轮与原d43累计基准相比，app/components/hooks/lib/services/public/styles、Netlify Functions、test-environment、workflow、netlify.toml与package-lock内容仍无变化。服务端四文件及UI_AUDIT同样无新差异；UI-DEFER-001 FAQ、UI-DEFER-002公告仍仅登记为第四阶段待修，没有改JSX/CSS/文案或开放公告发布。

[当前只读资源结果](resource-state.json)与之前交接逐项比较：

- 原PR1–18全部open/draft/unmerged，base/head SHA逐项一致；无新PR19。GitHub连接器传输失败后仅用公开REST读取元数据，没有改引用或PR。
- TEST仍为Site17885134-a57c-4589-83d3-39e30be9e0cf，Published6aeebe4ceae178c10e4199e8/SHA13de96d7531dde3222fdf513e711447a1df3e425、ready；stop_builds=true、skip_prs=true，允许分支仍为F03/F05。
- TEST合成攻略实际GET200且published/TEST数据、视频统计1；session-lab GET503，没有Set-Cookie。公共Function仍执行现有实际资源指纹和运行reader有效ACL守卫，当前读取成功提供对应范围的权限证据。
- 旧站Site613b5b7c-45b1-494f-9328-dd0625a57963仍Published69a92f4f7be620c834490be1、ready、locked=true；main、allowedBranches=[main]、skip_prs=true。只读控制面确认，没有访问或修改生产数据库/账号/业务。
- 本轮云写入0、环境变量值端点0、数据库直连0；没有启用云身份、writer或旧业务写入口。云reader/owner/writer设置未由本轮更改；未直连云数据库重新查询全部角色，owner/writer NOLOGIN的原生证明仍沿用已验签核，不扩大本轮证据。
- 早一次Netlify网络错误保留在resource-state-first，重试完整元数据成功；未放宽TLS、没有读取秘密值。

## Standards

可确认书面规范违反0。两个身份修复范围、原服务器/数据库/主站/云冻结边界保持；FAQ/公告原待办保留。事件测试运行真实demo.js，证据新目录、旧失败不删；未新增产品依赖、放宽类型/检查或把旧CI冒充当前候选。

## Spec

未发现新增阻断缺陷。busy统一排队与请求代次符合已定“旧恢复请求不覆盖新状态”的本机契约。独立审查补验重复提交及A→B切换，通过后纳入永久测试，并在真实HTTPS验证服务器本人ID。操作失败不假称成功、可恢复重试，旧401/200均有实际时序证据。

本机会话参数、角色、Cookie/CSRF、撤销规则未改；这些结论不替代尚未批准的正式schema/云认证适配、真实成员和全站统一Provider验收。多标签已有共享/退出同步实测，但未声称覆盖任意设备、网络与并发组合。

审查发现：Standards 0项，Spec 0项阻断；上次P2竞态已闭环。建议只申请**独立审核分支的安全推送授权**，不包含部署、合并、云数据库、正式身份启用或付费。最终本地提交后停止。

