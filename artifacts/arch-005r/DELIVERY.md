# JINXI-ARCH-005R 交付

已完成头像原框保护、公开攻略状态过滤、管理默认口令移除、完整URL状态、安全正文排版和媒体CSP修复；保留认可首页与动效。没有合并、生产发布、真实会话/头像启用或生产数据库操作。

## 版本与实际页面

- 基线`80737413d3bb981b3a3287c603893eb6c09decf2`；独立分支`codex/jinxi-arch-005r`，base为codex/jinxi-arch-005（PR #4）。上游#4→#3→#2→#1均未合并，复核#4 HEAD仍未变化，详见[BASELINE.md](BASELINE.md)。
- 完整实现SHA与新修复PR在VERSION.md及交付回复中提供；后续版本记录提交只补交付元数据，不用文档自引用自己的SHA。
- [本机截图与报告](http://127.0.0.1:3025/review/) · [首页隔离预览](http://127.0.0.1:3025/review-preview/) · [攻略中心](http://127.0.0.1:3025/guides/) · [头像原型](http://127.0.0.1:3025/profile-lab/)。仅本机Node进程存活时可用，不是公网/Netlify部署。
- 重开：先npm run build，再`node artifacts/arch-005r/serve.cjs out 3025`。该HTTP服务器使用合成留言/攻略和本机内存操作，其他API503，**不转发生产**。真实PostgreSQL测试是独立运行器，不与预览混用。

## 修正文件

完整20项非证据文件及前后字节见[file-changes.json](file-changes.json)，其余本目录为脚本、报告、PNG/JSON和原始trace。

| 文件 | 实际变化 |
|---|---|
| components/ui/paper.tsx、styles/community-components.css | PublicAvatar固定原框，只有内部图片层；原42/30/30px和12/8/9px圆角，保留角标和缺图文字 |
| components/profile/avatar-editor.tsx、profile-lab.tsx | 默认中心填充、简易位置可选；缺图模拟传到真实留言/回复/展播。仍仅合成头像原型 |
| _shared/strategy-read.js | 全部公开GET仅published，非公开状态403/ID404，参数更严格，异常JSONB数组可靠回退 |
| _shared/admin-password.js、strategy-actions.js、message-actions.js | 无默认管理密码；缺配置/错误401，授权前零SQL，GET不读取口令，通用错误响应 |
| lib/guide-location.ts、hooks/use-guide-location.ts、guide-center.tsx、guide-reader.tsx | 统一URL状态与历史/滚动恢复；分享和返回保留筛选，删除后保留列表链接；不恢复自动view写入 |
| guide-body.tsx、styles/guides.css | 标题层级、真实列表/缩进、代码/图文/长行、安全转义；保留纸张设计 |
| guide-video.tsx、guide-media.tsx、guide-submission.tsx、lib/guide-media-policy.ts、netlify.toml | 明确来源策略、原生播放/失败恢复/外部打开、准确投稿说明；只加精确media-src |
| DESIGN.md | 扩展原框、链接/正文/媒体规范，未改视觉方向 |

app/page.tsx、Hero、成员画廊、留言墙、ribbon轨道/数据范围、同行时光、成员静态资料、auth/points、策略POST、schema、package/lock、Next配置均未修改；[invariants.json](invariants.json)记录文件hash、原头像CSS块及CSP不变性检查。

## 实际检查

| 范围 | 结果与边界 |
|---|---|
| 头像 | 1440/390文字/照片/再次替换/缺图/恢复，8组DOM/像素检查；原框外0差异，卡片/轨道不变。关闭profile-lab专属CSS后也通过。抗锯齿与测试固定状态宿主的方法完整说明于[AVATAR_REPORT.md](AVATAR_REPORT.md) |
| 攻略与头像主流程 | 28组真实浏览器，通过四宽度列表/筛选/详情/投稿/图片预览/键盘、评论/点赞合成内存操作、非法ID/404、格式/超限/存储失败/同名游客/账号隔离/失效；[browser-results.json](browser-results.json) |
| 全URL/正文 | 5组，四宽度直接链接/刷新/前进返回/分页1次API/滚动及安全Markdown；[guide-browser-results.json](guide-browser-results.json) |
| 分割/状态/CSP头像 | 7组，首页悬停无攻略预取、列表无reader/poster、ID只取详情、加载/失败/重试/空态、合成资料入口、JPEG/WebP/128px/刷新/清理；[contract-results.json](contract-results.json) |
| 视频 | 6组；同源MP4和白名单HTTPS视频真实播放，非法/不可用/非白名单及实际media-src违规事件；外网用已有本机代理，直连停滞样本保留；[MEDIA_AND_COMPATIBILITY.md](MEDIA_AND_COMPATIBILITY.md) |
| 原生SQL | 7组真实PostgreSQL17.11，actual handler/参数化列表/筛选/搜索/排序/分页/ID/空表/JSONB/状态/EXPLAIN；非fake SQL、非生产库；[SQL_REPORT.md](SQL_REPORT.md) |
| 管理验证 | 18例；无配置/空配置/错误/随机正确口令与GET拒绝；合法动作真实写本机合成库；[SECURITY.md](SECURITY.md) |
| 已认可UI回归 | 双行/时光50组、成员8组、其余入口17组通过。业务写入拦截，仅证明入口/UI，不证明生产API成功 |
| 首页保护 | 四宽度顶部600px与基线逐像素0差异；[homepage-protection.json](homepage-protection.json) |
| 性能 | 前后×桌面/CPU6×慢手机×3轮共12次；实际首页JS-279B/CSS+371B，攻略首开中位数桌面176→179ms、慢手机2055→1869ms；样本重叠，不宣称稳定提速；[PERFORMANCE.md](PERFORMANCE.md) |
| TypeScript | **仍失败28→28，新增0/消除0**。原始完整诊断也逐条匹配，仅忽略行列位移；raw与规范化报告及两份日志全部保留 |
| build | 通过。首页71.2kB/首载165kB，guides5.64kB/93.6kB，profile14.3kB/108kB；原构建跳过TS/Lint，未把build当类型通过 |
| Lint / API命令 | npm run lint因缺配置进入初始化，退出1；npm run test:api缺test-api.js，退出1。日志保留，没有关闭检查或假称通过 |
| JS语法 / 凭据 | 四个修改函数/共享JS node --check通过；当前新增/修改文件凭据启发式扫描0发现，未读取生产环境文件或提交本机凭据 |

截图均是实际浏览器渲染；用于UI分页/正文/用户身份的fixture明确为合成。原生SQL和管理测试不借fixture冒充数据库执行。没有真实手机硬件/读屏人工测试、没有Netlify托管/CDN/函数集成验收。

## 剩余风险及限制

1. 正式会话、服务端头像验证/重编码/对象存储/限流/缓存和数据库迁移仍未实施。profile-lab本机成功不是线上账号保存，历史昵称不自动绑定。
2. 积分身份/客户端分值与价格信任仍是独立P0；必须在真实成员写能力前修复，不得因本轮通过而放行。共享管理口令仍需后续会话/限流/审计；匿名署名/ID与旧写接口并未变成安全身份。
3. 匿名status=all/draft/archived现明确403；缺ADMIN_PASSWORD的管理操作会拒绝，这是必要收紧，非静默回退。部署时前后端需同步，但本轮没有部署或改环境。
4. Markdown是明确子集，复杂历史语法可能以文本显示；旧本地blob预览从来不是云上传，新页未提供虚假上传。新阅读器不增长浏览计数，旧view endpoint防滥用仍待治理。
5. SQL测试结构为新建专用库，与仓库DDL核对，不证明真实线上schema/索引或Neon网络传输；36行EXPLAIN不证明大数据性能。慢网LCP仍约3秒，没有声称线上2.5秒达标。
6. **临时PG清理被自动审批拒绝**：集群已停止且55432关闭，工具/归档/合成数据和两份随机测试凭据仍在本机TEMP/jinxi-005r-db-tools，未进Git；可由用户文件管理器删除整个专用目录。详情postgres-cleanup.json，未尝试绕过删除限制。

## 回滚

本修复PR未合并，关闭PR即可停止采纳；需要撤销已取到本地的源码时，在干净分支按新到旧revert本任务的交付记录/实现提交，重新build，回到807374...的认可成果，不重置/覆盖用户工作。无数据库迁移或生产写入需要回滚。撤回安全修复会重新暴露匿名草稿/默认管理密码问题，不应将它视为安全生产方案。

停止本机3025预览撤下页面；原型点“清理全部测试头像”或站点设置删除jinxi-avatar-lab-v1，只影响合成头像。基线worktree与截图保留供复核。用户只需验收本修复，不会因此触发合并、上线或下一阶段真实账号系统实施。
