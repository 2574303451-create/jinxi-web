# 第四阶段工作包1：统一的本地合成网站

父提交：`5c2856bb386e6d52348d8a15a3a95e0952e177e6`。这里不是第六个业务模型，也不复制前五个demo。独立Next开发工程直接导入原 `app/page.tsx`、`app/guides/page.tsx` 与原布局，调用同一套已经审核的服务端处理器。

## 实际结构对照

| 现有网页入口/组件 | 必要适配 | 原审核业务与服务端授权 | 原本机数据库角色/数据 |
|---|---|---|---|
| GuildNavigation、原登录/改密入口、本人资料 | SiteRuntime提供交互回调；统一内存会话、世代与Cookie失效标记；独立AuthDialog复用原Modal | 唯一createMemberHandler、会话Cookie、CSRF/Origin、PBKDF2与版本撤销 | jinxi_member_session；b2_lab身份/会话表 |
| 首页MessageWall、双行展播 | 原公开DTO只读翻译；原表单/回复/反应注入动作；CommunityManagement管理本人及审核 | createCommunityHandler；可信UUID、RLS、独立审核、请求回执 | jinxi_community_app；community_lab |
| 原GuideCenter、GuideSubmission、GuideReader与首页攻略卡 | UUID详情读取、可信署名、草稿保存/提交/审核/评论；不伪造点赞用户ID | 同一社区处理器；保留类别、封面/媒体模型 | 同上，无新作者表 |
| 原MemberActions的签到弹窗 | AttendancePanel仅提供可信状态/事实交互；不用旧浏览器账号和未到账奖励显示 | createAttendanceHandler；服务端Asia/Shanghai日期、唯一事实和事件 | jinxi_attendance_app；attendance_lab |
| 原积分入口和通用Modal | PointsPanel绑定账户/流水/规则结算/排行/目录/订单/取消 | createPointsHandler；唯一事件回执、RLS、资金事务与原约束 | jinxi_points_app；points_lab；原attendance事件只读 |
| 原公告入口/CommunityUpdates、感谢入口、组队入口 | 原布局/Modal+安全内容显示；发布与本机草稿区分；授权维护；不展示真实收款码 | createOperationsHandler；既有staff/admin与队长/本人权限、版本/幂等/最终重验 | jinxi_operations_app；operations_lab |

旧CheckinWidget/PointsRankingWidget/TeamSystem仍包含浏览器ID、旧奖励解释或静态战绩。统一预览复用其原网站入口和Modal，增加消费已审核契约的必要控件，没有恢复这些旧信任路径、虚构战绩或按昵称授权。正式网站的默认组件路径保持原冻结行为。

HTTPS网关 `server.cjs` 只监听127.0.0.1:3069；Next开发renderer只监听127.0.0.1:3070，接收两条真实页面路由及必要静态/HMR请求，**不转发会话Cookie或CSRF**。只有精确loopback Host与Origin的HMR升级被接受。`/.netlify/functions/`只翻译明确公开读接口，所有旧写请求410，不调用或代理任何真实Netlify站点。

五种业务角色仍各用原连接、数据库指纹、注册身份和最小权限证明。每次启动新建一次临时集群（127.0.0.1:55436/jinxi_member_local）；复用freshOperations的累积初始化和合成账号，不读取.env/DSN/真实库、不重复身份schema。额外虚构纸签单价1、库存2只是本地集成样本，便于同一天完整验证签到到账/兑换/退款，不代表真实规则。合成规则仍沿用原 `SYNTHETIC.checkin` 版本；原事件表无金额列，读取契约的奖励金额null与积分结算回执分开，不改写签到事实。

## 启动位置与步骤

在Windows PowerShell中执行（路径均为本轮实际工具位置）：

```powershell
Set-Location 'E:/Recovery/.jinxi-research/phase4-integration/worktree'
$nodeExe='E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe'
$pgBin='E:/Recovery/.jinxi-research/identity-review-tools/postgresql-17.11/pgsql/bin'
$sslExe='D:/Program Files/Git/usr/bin/openssl.exe'
& $nodeExe scripts/run-clean.cjs run integration:local -- --pg-bin $pgBin --openssl $sslExe
```

打开 **https://127.0.0.1:3069/**；同一网站攻略入口为 **/guides/**。终端只打印本次 `integration-accounts.private.json` 的私有路径，账号密码只在该新临时文件中，未写入Git或网页产物。用normal/same成员、admin管理员、reviewer独立审核员；它们都是随机生成密码的虚构账号。不要在本页输入真实账号。

证书为本机临时自签名，不改系统信任和远端TLS。自动测试Node HTTPS明确pin该证书，Edge只信任本轮证书的SPKI，不关闭远端证书验证。手动浏览器会提示本机自签证书，仅在确认该精确本机地址后查看。Ctrl+C关闭本次服务、renderer和新临时数据库；重启是全新合成数据，不接管任何已有端口。

原工作区node_modules通过本机junction只读复用现有锁定依赖，未安装新依赖、未更改前五个工作树。全新检出应先按原package-lock安装依赖；本轮没有升级包。

## 会话和生产隔离

`session.cjs`只管理同一服务端身份在React中的内存状态，不实现密码/角色/令牌验证。私有响应需要同一请求世代、同一已核验主体和未变化的非敏感Cookie标记；退出、改密、联网/窗口恢复与多标签先清空再核验。丢失响应保留同一成员/操作的requestId；不会将令牌、CSRF、密码或私有草稿放进localStorage/BroadcastChannel。通知只发送changed，真正身份仍回读服务器。不同进程/标签的清理依赖浏览器调度，500ms轮询不是服务端权限保障或即时远程擦屏承诺；所有业务请求仍独立授权。

原静态工程不导入integration-local实现，只保留默认null的通用运行时接口；`LEGACY_MEMBER_AUTH_READY=false`未改。预览工程不在app/public/Functions目录，非development或缺显式本机renderer标记即拒绝启动。生产构建不导出该工程。构建后运行静态产物测试，确认没有本机API/地址、凭据、可写集成路由；修改客户端标志不能创建不存在的服务端写能力。开发HMR所需CSP例外只由本机网关返回，不改生产CSP。

## 验证命令

```powershell
& $nodeExe scripts/integration-checks.cjs unit,api,security,typecheck,lint,build
& $nodeExe --test tests/integration-local-export.test.cjs
& $nodeExe scripts/integration-checks.cjs https --pg-bin $pgBin --openssl $sslExe
& $nodeExe scripts/integration-checks.cjs browser --pg-bin $pgBin --openssl $sslExe --playwright-module 'E:/Recovery/.jinxi-research/identity-review-tools/browser/node_modules/playwright'
& $nodeExe scripts/integration-checks.cjs regressions,readonly --pg-bin $pgBin --openssl $sslExe
```

固定端口测试必须顺序执行。每次真实命令、退出码、失败日志、源码SHA-256、浏览器实际数据库断言与截图保存在artifacts/phase4-integration。浏览器综合场景之间可重置**本次新库**的限流夹具，记录原因；真实429单独验证且不在失败后放宽限流。原模块的测试/断言不删除或改弱。

## 仍未获准的事项

没有云端统一会话适配、部署、数据库迁移、真实208账号导入、历史UUID归属、旧余额核对/补算、正式积分规则生效时间或真实兑换。线上管理人员名单/发布政策、真实在线/战绩/任务奖励、支付、存储上传与入会通知仍待受控确认。旧历史合成样本保持无可信归属，不按昵称迁移。

UI-DEFER-001（FAQ）、002（公会动态弹窗）仍为第四阶段后续统一验收项。本轮没有改变Hero、导航布局、双行展播、攻略首页或头像设计。生产Published、TEST构建冻结、main/18PR及所有云资源未操作。
