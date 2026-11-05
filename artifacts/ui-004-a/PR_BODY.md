已认可首页的留言展播需要双行反向滚动，旧公会终端仍为霓虹风格且收起/离屏也每秒重渲染。本PR只完成JINXI-UI-004检查点A：保留首页、留言墙内部和成员画廊，将公开留言改为实测宽度驱动的WAAPI双行展播，将终端内部重构为纸张风格的“今夕·同行时光”，保留本地成员查询、日期、历史和勋章。

轨道支持hover/focus/手动/触摸暂停、减少动态、离屏和真实后台暂停，副本不进入重复Tab或辅助树。可见计时限制在叶组件，折叠卸载内部控件，删除原500ms人为等待及静态在线提示。另修复原生IntersectionObserver同批事件只读取第一条而导致计时不恢复的问题；保留真实修前事件和最终回归证据。

基线为`0182518277831ba0d03df3a3e1973f1a7ae06efe`，实现提交`a6df595df2fd7eb2c16539e4902839014edf3de0`。本PR依赖尚未合并的PR #2，base为`codex/jinxi-rea-003-batch-1`。B攻略系统、C其余业务组件尚未实施；不合并或部署生产。

验证：1440/768/390/320实际截图；50项专项、17项既有入口、8项成员组件、11项预览/辅助树检查通过，另实际标签页后台暂停流程通过。生产构建通过；独立TypeScript仍28项历史错误，逐诊断比较无新增。Lint缺配置、test:api缺test-api.js，均未通过实际检查。真实账号、写API和数据库未验证，预览留言为明确标识的合成数据，写入禁止。

前后真实Performance录制确认逐帧rAF开销消除，全部静态JS+CSS原始净增479字节、逐文件gzip净增565字节，无新依赖。最终实验室LCP桌面2332ms/慢手机3552ms，另一次6560/7452ms也保留；外部图标CSS加载波动明显。慢手机全过程CLS0.07419、交互最大样本96ms不等于INP；不宣称线上达标。既有积分P0仍未解决，未改Functions、积分规则、数据库或档案数据。

- [四宽度对照与状态图](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/artifacts/ui-004-a/index.html)
- [桌面展播前后](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/artifacts/ui-004-a/compare-ribbon-section-1440.png)
- [手机同行时光前后](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/artifacts/ui-004-a/compare-time-record-390.png)
- [交付、文件清单、限制与回滚](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/artifacts/ui-004-a/DELIVERY.md)
- [性能数据及原始录制索引](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/artifacts/ui-004-a/PERFORMANCE.md)
- [设计规范](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-ui-004-a/DESIGN.md)

[本机只读预览](http://127.0.0.1:3013/) · [浏览器截图对照](http://127.0.0.1:3013/review/)。只在运行该项目的电脑可用，未发布生产。请先验收检查点A，再依据反馈推进B、C。
