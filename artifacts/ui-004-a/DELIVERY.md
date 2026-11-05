# JINXI-UI-004 · 检查点 A 交付

本次仅提交A：双行公开留言展播与“今夕·同行时光”。已认可的首页、留言墙内部和成员画廊未重做。B攻略系统、C其余业务组件均未实施，等待本检查点审美验收。

## 分支与依赖

- 工作分支：`codex/jinxi-ui-004-a`。
- 认可基线 / 本地与远端已复核：`0182518277831ba0d03df3a3e1973f1a7ae06efe`，开始时工作区干净，独立baseline worktree保留。
- 本次实现提交：`a6df595df2fd7eb2c16539e4902839014edf3de0`；后续交付记录为文档提交，最终HEAD由PR和交付回复给出，避免文档自引用SHA。
- 上游：PR #2仍为未合并草稿，base为`codex/jinxi-rea-002` / `328819a57c671b33b743d1ad3f969c0fb7917048`；PR #1仍未合并，base为planning-handoff分支 / `7dfbf69c2e2b61be7c08d4fd65d884c2b371b244`。本检查点叠在PR #2分支上，不合并或部署。
- 基线、日期依据和环境边界：[BASELINE.md](BASELINE.md)。

## 可直接检查

[本机只读预览](http://127.0.0.1:3013/) · [四宽度前后对照](http://127.0.0.1:3013/review/)。仅在运行该仓库的电脑可用。预览顶部明确提示合成留言，其他业务接口503、所有写入405，未转发生产。重启命令：先`npm run build`，再`node artifacts/ui-004-a/serve.cjs`。浏览器工程测试使用`/preview-app/`直接加载实际构建，避免把验收iframe算进整页性能。

截图原件：before/和after/，均覆盖1440/768/390/320。每个宽度都有展播、同行时光收起/展开/档案；after/另有hover/focus/暂停/减少动态/空/加载/失败/少量/单条/日期/错误。并排图为compare-ribbon-section-*.png和compare-time-record-*.png；[视觉差异及修正](VISUAL_REVIEW.md)。

## 实际修改文件

| 文件 | 实现差异 |
| --- | --- |
| components/home/message-showcase.tsx | 原公开响应投影；正文去重，最多12条；≥6条分配两行，上左下右；少量/空/失败保留准确降级；共享暂停 |
| components/home/ribbon-card.tsx（新增） | 14px两行摘要，日期/类别/置顶、原留言定位；副本无Tab入口 |
| components/home/message-ribbon-row.tsx（新增） | 独立轨道、hover/focus/触摸/键盘手动浏览与原始按钮焦点 |
| components/home/use-ribbon-motion.ts（新增） | ResizeObserver实测宽度，32px/s WAAPI transform；取消后保留原生滚动相位；离屏/后台/减少动态停 |
| hooks/use-element-activity.ts（新增） | 独立目标交集和原生页面可见性；处理同批多条事件的最新状态，清理观察器和监听 |
| hooks/use-motion-preference.ts（新增） | 原生matchMedia实时减少动态，不加动画依赖 |
| styles/community-components.css | 仅展播内部两行布局与紧凑卡片，164px高、310/280px宽；保留已认可其他组件规则 |
| components/guild-uptime-terminal.tsx | 浅纸卡/折叠内容按需挂载；同步本地查询；明确历史待确认，移除假在线暗示和人为等待 |
| components/guild-time/runtime-clock.tsx（新增） | 分钟级收起信息、秒级可见叶时钟；各自观察可见性；timer不自动播报秒数 |
| components/guild-time/archive-record.tsx（新增） | 成员/日期结果、原始阶段、历史、勋章与编号；空/验证错误状态 |
| components/guild-uptime-terminal.module.css | 完整内部样式重写，2px边/硬影/黄色、响应式表单和档案，移除扫描/发光/脉冲 |
| lib/guild-terminal-utils.ts | 原函数保持原样，新增结果类型与同步查询解析；保留原ID/昵称/日期算法 |
| styles/guild-theme.css | 仅移除已不再需要的旧终端专用覆盖块；没有新增legacy或!important |
| DESIGN.md | 扩展双行、动效生命周期、同行时光、计时和数据规则 |
| artifacts/rea-003/UI_AUDIT.md、REMAINING.md | 只追加A进度说明，保留原审计时点，明确B/C未完成 |
| artifacts/ui-004-a/ | 基线、截图、原始trace、测试脚本/结果、体积和验收资料 |

非产物文件前后字节数在file-changes.json，构建chunk清单在bundle-before.json / bundle-after.json。没有改app/page.tsx、app/layout.tsx、留言墙内部、成员画廊/列表/详情、services、Functions、config、package.json或package-lock.json。原档案config blob前后均为`b5a58a9f1765b434ae765c2d9fa449a83c580bba`，没有新增生产资料导出。

## 实际验证

| 项目 | 结果与证据 |
| --- | --- |
| A专项 | 50项通过，browser-results.json；四宽度双行唯一内容、反向速度、无缝、hover/focus/暂停/触摸/方向键/原ID定位、日期/昵称/勋章/历史、收起焦点、可见更新/离屏冻结/恢复、实时减少动态、空/加载/失败重试、少量去重降级 |
| 原生后台 | background-results.json；实际标签页visible→hidden→visible，轨道活动动画归零，时钟冻结并恢复。使用自有独立Edge、noDefaults，未伪造visibility事件 |
| 已认可成员组件 | 8项通过，protected-results.json；四宽度列表筛选/加载、键盘详情、画廊前后/方向键、双层弹窗/焦点返回和滚动锁 |
| 其余原入口 | 17项通过，regression-results.json；320px导航、签到/任务/排行/组队/游戏数据/公告/赞助/攻略投稿、加入/登录/改密/FAQ、失效留言定位、四宽度缺图说明和原昵称显示。仅入口与界面回归，未认证或写库 |
| 预览与辅助树 | 11项通过，preview-results.json；只读预览标签/拒写、本机浏览器AX树只有12条原始留言按钮（没有24条副本）、8张并排图实际加载 |
| 四宽度布局/截图 | final-layouts.json；均无整页横向溢出。首页600px三宽度像素差0；390仅Logo32px区域835像素差，代码/素材未改，详见VISUAL_REVIEW.md |
| 独立TypeScript | **仍失败，无新增**：28→28，按文件+TS代码+完整文字比较，忽略行列变化；types-before.txt / types-after.txt / type-comparison.json |
| npm run build | 通过，build-after.txt。首页76.6kB / 首载165kB；构建跳过TS/Lint设置未改，不能代替独立检查 |
| npm run lint | 未完成实际Lint：缺ESLint配置，进入初始化提示退出1；lint.txt。未擅自修改工具链 |
| npm run test:api | 失败：仓库缺test-api.js；test-api.txt。真实API回归未通过 |
| 性能录制 | 前后均有1440与390 CPU6×慢网、可见/离屏各3×7秒及实际trace；PERFORMANCE.md列出所有样本范围与限制 |

共86项浏览器检查和一个独立原生后台流程。所有合成测试都有明确环境标记，不证明真实登录、留言/API写入、管理员授权或数据库结果。A2为原本地静态查询，删除人为等待后无网络加载态，不制造虚假的“查询服务器中”。真实手机硬件和NVDA/VoiceOver未人工测试。

实际浏览器回归还复现并修复IO只读批次第一条导致时钟不恢复的问题。修前原生事件和截图保留为visibility-regression-before-fix.json/.png；最终相同路径通过。未把失败的中间尝试当通过。

## 性能与未完成项

实际录制确认本区域逐帧rAF已消除，原先离屏仍在运行的轨道与每秒父渲染已停止。完整数据与逐次采样见[PERFORMANCE.md](PERFORMANCE.md)，不能把全部差异仅归功于transform（两行结构和计时重构同时变化）。所有静态JS+CSS合计原始+479字节、逐文件gzip+565字节，无新依赖。

整页加载尚未达到稳定目标：最终本机桌面LCP2332ms、慢手机3552ms，另一后测6560/7452ms也保留。外部图标CSS连接/加载有明显波动；慢手机全过程CLS为0.07419，较前测增大，未获得足够元素归因。Event Timing少量交互最大88/96ms不是INP。**不宣称线上LCP/INP/CLS达标**，后续需独立处理首屏/外部资源并重复控制变量实验。

日期/历史只找到已有配置和默认值，缺少独立史料，沿用不改并在UI注明待公会确认。公开messages仍只用原最近100条范围，最多取12条非空正文；API没有单条读取或额外展示授权字段，不把置顶当新授权、不扩散回复/账号/反应用户标识。失效ID明确说明，未绕权限查询。

剩余B/C依旧包括攻略完整内部/媒体、签到/任务/排行、组队/游戏数据、公告/赞助、账号/表单、FAQ/Toast/LoadingSpinner；固定公告/赞助按钮在长元素截图中仍可见，是未改造的C组件。本次未做真实业务写入或生产部署。历史积分P0身份/客户端分值与兑换参数信任风险仍未解决，Functions和积分规则完全未动。

## 回滚

上游认可分支和SHA保留，PR未合并时可直接关闭本检查点PR。需要撤销源变更时，在干净工作分支按从新到旧revert本检查点交付记录和实现提交，重新npm run build；不reset --hard覆盖用户工作。基线worktree `E:/Recovery/jinxi-ui-004-baseline`可只读对照，预览只是本机Node进程，停止其终端进程即可撤下。没有迁移、生产数据或新增依赖需要撤销。

停止点：请先验收检查点A的实际页面与截图，再依据反馈推进B、C；本次没有合并或发布生产。
