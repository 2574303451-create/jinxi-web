# JINXI-B2-A-6 交付

从 PR15 的 f9ff27874beaf3388502f29360ebaa86c5a64c13 创建隔离分支 codex/jinxi-b2-a-6-runtime-acceptance。安全基线 PR14 为 7f850e188c750e147181fcba193a8106892b4afc。最终应用构建提交为 7a30f921a957066c3044943dcbee6a231d040a25，后续交付提交只增加验收记录、CI 工具链输出与交接。最新完整审核 SHA 和 CI 链接见本 PR。

| 交付 | 实际结论与入口 |
| --- | --- |
| 独立复核 | 原始 tsc 及55项 PG的 CI 对应 #14/#15 完整审核 HEAD。独立 Standards/Spec 审阅、主任务浏览器复核和失败证据归档。[复核](REVIEW.md) |
| 包体来源 | 增加45990B中，10315B为 Next内置React DOM，35635B为Next客户端路由/RSC/segment cache，其他净增40B。完整37/43份JS/CSS资产及模块归属已列明。[来源](BUNDLE.md) · [原始清单](chunk-inventory.json) |
| 优化试验 | m/LazyMotion/domAnimation 拆分反而增加4302B，因为既有FAQ仍取完整motion，已撤回。最终候选维持原动效 |
| Performance | 36次轮换冷/热加载、真实gzip与原生缓存、Script/Task/长任务/事件/堆及3份原始trace。框架执行与内存成本更高，LCP相近不足以证明等价。[报告](PERFORMANCE.md) |
| 运行时规范 | engines/锁文件、Netlify、CI与构建文档对齐 Node24.22.2、npm11.19.1。start 为本机静态预览，export 兼容入口调用正常build。Next16.4.5/React19.3.1继续用于TEST候选 |
| 页面缺陷修补 | 公告 native dialog 的鼠标关闭因继承 pointer-events:none 失效，scoped CSS 修复；成员行动和留言昵称不再把旧缓存呈现为认证身份 |
| 真实TEST | 本轮没有获得资源授权。管理员无值矩阵、实际 Functions运行时、DB/存储有效权限、继承、备份恢复、托管HTTP/CSP仍待取证。[管理员步骤](PLATFORM_ACCEPTANCE.md) |
| 成员接入 | 208份仓库档案与实际账号分列。真实表/映射/密码兼容待核，稳定member ID绑定、批次恢复及跨刷新/设备收据设计已补齐。[接入与订单](RECEIPT_RECOVERY.md) |
| 集成 | 十五个PR的base、HEAD、祖先、提交增量和Mermaid链，保留原PR及提交，新的候选按相邻差异审核。[集成候选](INTEGRATION.md) |

## 测试与浏览器

干净安装使用固定 Node24.22.2/npm11.19.1。原始 tsc exit0、ESLint、build、API14、安全10、本机合成PG55通过。14个Functions本地打包/加载及无配置写拒绝通过，托管版本独立待核。 [PG日志](postgres.txt) · [本地Functions](browser/a6/function-packaging.json)

| 页面与交互 | 结果 |
| --- | --- |
| 首页B1保护 | 26项通过，真实Tab与3px焦点、先筛选再LIMIT3、0/失败区分、旧契约闭锁、缓存、1440/1024/768/390/320 |
| 双行留言、时光、减少动态 | 原50项通过，含暂停、后台/不可见、去重、档案查询、live region与焦点 |
| 原头像框、成员、视频、阅读器 | 几何/像素检查、成员详情、轮播、宣传视频播放/失败和弧形箭头均通过；独立阅读器与搜索详情通过 |
| 公告、CSP和旧入口 | 原7组HTML/CSP、4组兼容、17组入口/FAQ/图片失败通过。旧身份断言改为拒绝缓存预填及锁定，原失败保留 |
| 原生Modal | 14类入口及嵌套成员详情，1440/768/390/320，真实鼠标/遮罩、Escape、焦点循环/返回、背景锁定、无横向溢出 |
| 本机会话 | 原7组 HTTPS 合成测试通过，包含CSRF/改密撤销、同成员多标签/多设备、断网与幂等。没有真实账号接入 |

[桌面](browser/home-1440.png) · [手机](browser/home-390.png) · [公告关闭](browser/announcement-close-390.png) · [B1](browser/a6/browser-checks/browser-results.json) · [展播与时光](browser/a6/lifecycle-checks/lifecycle-results.json) · [完整交互](browser/interaction-results.json) · [搜索](browser/search-results.json)

源码修改限定于公告指针CSS、两个旧缓存入口、package/lock、静态预览、CI、README与部署说明。README原为UTF16，本轮转成UTF8以便审核版本说明。Motion试验有独立提交及撤回提交，原历史保持可追溯。

测试资料保留实际缺陷的红绿记录及脚本定位失败。轮播页码为span、留言为summary且桌面默认展开、改密提交为“确认修改”，新全入口脚本按实际语义校正。旧回归中的缓存昵称锁定预期与本轮安全修补相反，针对该项改为更严格的游客/草稿状态验证。原B1文件与历史证据无改动。重复新截图留在本机原始证据目录，PR保留关键截图、结构化结果和复现程序。

本机PG原进程停止后，以原数据目录和白名单127.0.0.1:55433恢复。相关失败采样没有进入最终36次比较。早期DOMContentLoaded点击作为水合结束标记不可靠，最终报告说明了水合与INP代理的测量限制。

## 阻断与回滚

真实TEST、云资源/权限、托管运行时/缓存/压缩/CSP、真实账号映射/备份、正式订单与收据恢复仍须按清单取证或实现。Next16的框架包体与CPU代价已归因，生产性能未验收。Vaul/Recharts/Radix的未引用封装只有编译/依赖证据，未来启用需补特定交互验证。

本轮未开放头像上传、在线心跳或名单。B2-C+仍为有效会话/心跳按member ID去重，原头像框内填图、右侧抽屉、静态绿点、登录后读名单、可见性默认关闭，公开字段最小化。当前首页在线继续—。

回滚以独立PR为单位。可回到PR15 SHA复现原运行时，但应保留本轮公告指针与身份提示修补。保留PR14原锁作为审查参考，其Next14已不受支持，需另选受支持运行时后才进入发布审批。云验收、真实迁移和生产发布分别授权与回滚。本轮无生产迁移、合并或正式部署。
