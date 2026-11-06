# B2-A-5 运行时独立实验

实验 PR 叠加在安全准备分支上，原始审核祖先是 PR #13 的 `f443144a912abf5869d42f4758c86caaf6031525`。使用独立工作树和独立 `out`。安全准备的 Next 14 锁文件仍与 PR #13 相同，合并与托管验证保持人工审阅。

| 工具或依赖 | 实验值 |
| --- | --- |
| Node / npm | 24.22.2 LTS / 11.19.1。Windows x64 官方 ZIP SHA256 为 `ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2`，与发行清单核对 |
| Next / React / 类型 | Next 16.4.5 Active LTS、React/React DOM 19.3.1、React 类型 19.3.0。Vaul 1.1.2 解决 React 19 peer。保留现有 Webpack 生产优化，单独执行 ESLint |
| Netlify | 实验构建明确 Node、npm 版本，并在 NODE_ENV=production 下包含编译所需 devDependencies。Functions 托管 Node 另由控制面确认 |
| TypeScript | 保留严格检查和原 include，加入 Next 16 开发生成类型。两处 hook 接受 React 19 可空 ref，运行逻辑未改 |

锁文件随直接依赖升级重新解析。原分支锁文件保持可回退。新旧包同路径有 27 项版本变化，另有新增/移除的依赖路径。升级选择与限制见 [官方资料](OFFICIAL_RUNTIME_RESEARCH.md)。

## 实际兼容结果

- 干净安装、静态构建、原始 tsc、非交互 ESLint、API 14、安全 10、真实本机合成 PostgreSQL 55 均通过。原始运行时工作树构建目录为 `E:/Recovery/.jinxi-research/b2-a-5-runtime/worktree/out`。
- 首页、独立攻略、profile-lab、session-lab 与 404 均导出。按实际输出重新计算 8 个脚本哈希，离线 Netlify parser 在 6 个路径识别出唯一 CSP，脚本无 unsafe-inline 和 unsafe-eval。 [CSP](browser/runtime/export.json)
- 14 个 CommonJS Functions 以锁内 ZISI 14.1.4 在本地打包后由 Node24 加载，空配置 POST 拒绝。实际本机 HTTPS 上用同版本执行合成会话 7 组，包括强制改密、注销、CSRF、同成员幂等和断网恢复。旧 CLI 未声明 nodejs24.x 包运行时，托管运行时仍需独立核验。 [打包](browser/runtime/function-packaging.json) · [会话](browser/runtime/session-browser/session-browser-results.json) · [PG](runtime-postgres.txt)
- Edge 回归 B1 26、独立阅读器、视频箭头与真实播放、双行展播和动效 50、头像原框、成员详情、公告/CSP、旧入口和本机 profile-lab。首页仍显示 208 份档案及在线 —。 [B1](browser/runtime/browser-checks/browser-results.json) · [展播](browser/runtime/lifecycle-checks/lifecycle-results.json) · [头像](browser/runtime/avatar-frames/avatar-frame-results.json)

[1440px 桌面](browser/runtime/independent/home-1440.png) · [390px 手机](browser/runtime/independent/home-390.png) · [手机视频播放](browser/runtime/arrow-checks/after-390-playing.png) · [合成会话](browser/runtime/session-browser/session-authenticated-1440.png)

## 性能与发布边界

相对安全准备，同一实验桌面 LCP 中位 176 → 188ms，慢手机 3052 → 3044ms，CLS 最大 0。gzip JS 182556 → 228546B，增加 25.2%。gzip CSS 28420 → 28360B。三组等条件采样均无首屏视频或提前下载实验代码、完整阅读器和公告清理器。慢手机仍高于 2.5s，新增 JS 开销须单独审阅。 [样本与方法](performance.json)

真实 Netlify 构建/Functions/CSP 和 TEST 权限未确认。本分支保持实验草稿。回滚时取消实验候选，使用安全准备分支的原锁、原构建和审阅 SHA。真实生产会话、写入、存储、头像和在线业务由后续授权单独推进。
