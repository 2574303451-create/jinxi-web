# PR14 与 PR15 独立复核

固定范围分别为 f443144a912abf5869d42f4758c86caaf6031525 → 7f850e188c750e147181fcba193a8106892b4afc，以及 7f850e188c750e147181fcba193a8106892b4afc → f9ff27874beaf3388502f29360ebaa86c5a64c13。本机起始两工作区干净，远端、base 和 CI 与交接一致。 [GitHub 快照](github-baseline.json) · [逐作业日志核对](pr14-pr15-ci.json)

原始 tsc 在两个 PR 的实际 CI 中退出 0，日志中检出的完整 SHA、API 14、安全 10 和 PostgreSQL 55 均匹配。候选也保留原始编译检查，构建不豁免。独立源码审阅另用系统 Node24.6.0 运行 tsc 为 0，该次只作额外核对，正式证据使用固定 Node24.22.2。

## Standards

独立审阅按 AGENTS、COLLABORATION、WEB_EXPLORATION、DESIGN 和 A5 文档检查。PR14 的表/列 ACL、同 schema 视图、PG17 MAINTAIN 拒绝、旧写闭锁与 TEST 门槛相符。固定 PR15 的 engines、start/export 与实际静态工具链不一致，已在候选修正。候选最终保留原动效实现，减少 features 的试验因包体变差撤回。

## Spec

PR14 的导航已处理旧缓存，成员行动欢迎语和留言昵称锁定仍使用缓存。候选为这两个入口补上同一暂停门槛，四宽度用合成缓存实际验证。PR15 保留 Vaul/Recharts/Radix scaffold，应用未引用其 Drawer/Chart/Dialog 封装；本轮仅报告其依赖和编译状态，实际弹窗为 native dialog，完整操作已另测。

全入口复核新发现公告标题栏继承 pointer-events:none。PR15 及原候选实际鼠标关闭失败，键盘 Escape 正常。新增 scoped CSS 为公告 native dialog 恢复 pointer-events:auto。1440/390/320px 的中心命中和真实点击回归均通过。没有 force click 或改弱断言。 [原失败](browser/announcement-close-before.json) · [红绿对照](browser/pointer-results.json)

14 类入口及成员嵌套详情在 1440/768/390/320px 检查关闭、Escape、遮罩、焦点进入/循环/返回、背景滚动锁定和无溢出。开发复现脚本的选择器修订记录单独保留，包括轮播页码实际为 span、留言折叠器为 summary、桌面默认展开、改密提交按钮实际名称。 [最终交互](browser/interaction-results.json)

原头像外框、双行留言、成员与档案、时光、宣传视频与独立攻略由原断言复跑。B1 几何比较本轮使用冻结 PR15，旧后端契约负例仍使用本机既有 A+ 源码与合成库。更换比较产物及证据路径不更改焦点 3px、过滤、空值和错误断言。 [运行器](run-browser.cjs)

本轮授权范围为本机合成库与开发分支。云 TEST 尚未授权，正式账号、生产数据及存储操作不属于本轮实测。环境证据与正式收据的阻断仍保留。
