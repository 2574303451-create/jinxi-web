# 工程检查与安全集成计划

检查点3基线为PR11 / d516b8643c73797ddfbd8109d46a7dba58f6016c，B1基线115bf854a7977a3e582a89af13459115178a1e31。提交时CI配置和本机证据随代码交付；**远端执行结论以该PR当前head的Checks/工作流及PR说明中的运行链接为准**，本文件不将配置存在当运行成功。

## 最小重复检查

`.github/workflows/security-checks.yml` 在GitHub-hosted Ubuntu24.04、Node20.20.2与Node24.22.1各执行npm ci、build、test、lint、独立TS历史基线校验、临时PG初始化和真实SQL/会话集成。Actions固定完整官方SHA、contents:read、checkout不持久化凭据；没有注入任何Netlify/Neon/生产secret，不调用deploy/导入脚本。PG17服务只含合成数据，job结束随服务销毁；固定CI口令仅属于临时容器，非用户真实凭据。随机运行角色密码只在job TEMP。

生产数据库、存储、应用会话都不参与CI。实际DB内部容器172.16/12:5432与宿主loopback:55433作明确区分；例外仅限CI/GITHUB_ACTIONS/Linux标识和指定合成库，不能自动选择其他连接。每个job创建新集群身份/独立无提权角色，实际权限测试不依赖本机遗留schema。

只上传allowlist中的typescript.txt/report.json，隐藏文件关闭、保留7天；没有上传TEMP、.env、账户文件、原始HTTP/Cookie、整个工作区或DB目录。测试结果在job步骤日志；报告明确rawCompilerPassed=false，不借artifact改写检查含义。

本机独立源码目录 `E:/Recovery/.jinxi-research/b2-a-ci-check/source` 从空目录npm ci成功，Node20构建通过；主out未清理/覆盖。最初复制遗漏Functions使API测试加载失败，日志保留，修正白名单后再通过；并非构建失败被隐藏。生产依赖版本与B1对照0项变化，新ESLint/typescript-eslint仅dev依赖，`checkpoint3/production-lock-comparison.json`。

ESLint10.14.0/typescript-eslint8.72.1使用flat config和非交互CLI，选定重复键/不可达分支/不安全finally/eval/Promise执行器等正确性规则，覆盖源码、Functions、脚本和测试。**不是完整Next/React Hooks/a11y或type-aware规则集，也不代替安全审计与依赖核验。** 未引入不兼容旧Next ESLint配置或为绿灯忽略peer冲突。

## TypeScript的28项历史诊断

原始命令 `npm run typecheck` 仍exit2。`typecheck:baseline`独立实际运行同一编译器，比较每条完整file/code/message的多重集合，仅忽略行列移动；新增、无法解析的全局错误、崩溃/未知退出码均失败。反例单测真实验证这些失败路径。基线原件来自B1，未减少include、关闭strict、增加ts-ignore或扩大any来伪造通过。

| 类别 | 数量 | 后续单独治理方式 |
| --- | --- | --- |
| strategy-wall、media-gallery布尔/组件契约 | 3 | 明确可空输入和组件props，在旧页面边界验证 |
| toast组件、双份use-toast的缺失/循环导出及隐式参数 | 16 | 先修公共类型和引用方向，再消除重复Hook，验证原通知行为 |
| sidebar缺失模块引用 | 1 | 核对现有移动端Hook/契约，补正确依赖并验证导航 |
| guild-terminal-config类型谓词/空值/集合推断 | 6 | 以真实208份档案复算和无效字段样本验证收窄 |
| strategy-wall-service正则目标版本 | 2 | 独立核对浏览器/编译目标和正则语义，不为两条错盲调全局target |
| 合计 | 28 | 每批缩小基线；最终删除基线例外，以完整tsc成功为目标 |

当前仍是28、没有新增或消除。Next历史build跳过类型/框架lint的配置未改；build通过不能替代上述原始红灯。CI的绿色历史基线步骤只证明没有新增错误，名称及JSON明确其边界。

## 页面保护和性能

最终独立构建上，原B1浏览器26、原头像框8、成员组件8、留言/原入口17、展播/时光50项通过；真实键盘及reduced-motion保留。原42px/30px头像尺寸/边框/阴影未改，实验路由复用文字头像，不依赖上传。首页Hero、弧形箭头、208档案、2018-02-10创立日、独立/guides/和在线—保持。旧写功能显式暂停是PR10安全措施，页面UI夹具通过不表示生产写功能重新开放。

12组交替冷上下文样本见 `checkpoint3/performance-results.json`：

| 本机样本 | B1 | B2-A |
| --- | --- | --- |
| 桌面1440 LCP中位 | 220ms | 208ms |
| 慢手机390、CPU6/150ms LCP中位 | 2940ms | 2876ms |
| CLS最大 | 0 | 0 |
| 首页初始JS解码字节 | 606871 | 606866 |
| 同资源计算gzip字节 | 182986 | 183043 |
| CSS解码/计算gzip | 142073/28310 | 142073/28310 |
| 初始Media/攻略统计请求/完整阅读器/实验会话代码 | 0 | 0 |

每档3次、fresh context、交替顺序，测试时无其他浏览器回归并发。JS gzip微增57B；新实验路由未进入首页初始包。旧无关公告处理器503与新合成只读成功存在差异，记录在方法中。不能据这些样本宣称生产提速或已达2.5秒目标；慢手机仍未达目标，Neon/Netlify延迟和用户真实设备未验。

## PR依赖与集成停止条件

| 顺序 | 分支/PR | 审核范围 |
| --- | --- | --- |
| 原UI/架构链 | #1→#2→#3→#4→#5→#6→#7→#8 | 按各PR base审，保持草稿，不将B1代码重从main实现 |
| 检查点0 | #9 / codex/jinxi-b2-0-b1-review | B1最终复核及真实thumbnail回退 |
| 检查点1 | #10 / codex/jinxi-b2-0-isolation | 13入口、环境边界、旧身份/写入阻断 |
| 检查点2 | #11 / codex/jinxi-b2-0-security-plan | 积分/认证/内容方案和B2-C+后续隐私要求 |
| 检查点3 | codex/jinxi-b2-a-session-lab / 当前独立草稿PR | 合成本机会话/积分演示、权限补强、CI、证据 |

PR9基于8、10基于9、11基于10、当前基于11；实际base/head从GitHub核对，不擅自rebase/squash/合并，避免断开旧审核链。最终集成需在经批准候选分支依依赖顺序整合，每批重跑安全与UI回归，全部门槛通过后再由用户批准发布。上表不是自动合并指令。

## 仍未解决的生产阻断

1. **P0云隔离**：没有控制面key/context/scope/shared来源及真实角色/存储授权证据，不能证明预览代码无法获得生产密钥，也没有用TEST凭据验证真实PROD拒绝；所有云写/实验会话继续拒绝。不同名称、URL、Neon复制分支或同库canary均不等于证明。
2. **P0身份迁移**：真实授权TEST的account/profile约束、成员停用来源、旧hash分布、迁移历史未知。当前仅两份合成账号，未创建真实成员会话。正式迁移需独立演练/备份/撤销验证；不重跑历史示例INSERT。
3. **P0/P1内容与运行时**：旧公告HTML黑名单和unsafe-inline/eval未完成替代；正式同源会话前须完成XSS安全渲染/CSP方案。当前官方Next14不受支持、14.2.16过旧，Node20已EOL；生产需单独受支持版本升级与Netlify回归，不能因静态导出就宣称安全或直接断言存在某RCE。官方依据见[研究](OFFICIAL_RESEARCH.md)。本轮为可复现仍测试旧Node20，并加入Node24，不顺带重构首页/升级框架。
4. **P1托管认证运维**：真实平台地址可信来源、连接池/并发容量、密钥轮换、限流TTL清理与监控、会话清理、真实管理员授权、跨标签即时通知、刷新后的兑换订单恢复仍是正式实现事项。实验过期行不自动定时清除；始终按状态拒绝。每次会话先做身份证明有开销，须在真实TEST量测，未对生产压测。
5. **工程**：28项TS、完整可访问性人工测试、慢手机LCP、Linux托管浏览器与真实Neon/Netlify联调仍有边界。头像独立bucket、服务端重编码、在线租约/可见性名单/抽屉均只保留方案，不在本轮启用。

停止在独立PR审核；不合并、不部署、不生产迁移、不真实头像上传。实验回滚见SESSION_LAB.md；不回退到已知可越权旧接口，不删除原B1证据。
