# 首屏 JavaScript 增量与完整 chunk 清单

PR14 与 PR15 冻结产物实际下载的 gzip JS 为 182556B 和 228546B，增加 45990B。以下按实际下载的文件配对，gzip 按每个文件单独计算。HTTP 头部另见 Performance 记录。

| 来源 | PR14 原始 B | PR15 原始 B | PR14 gzip B | PR15 gzip B | gzip 增量 B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Next 内置 React DOM | 172831 | 203721 | 53742 | 64057 | 10315 |
| Next 客户端路由 / RSC / segment cache | 123798 | 242282 | 31827 | 67462 | 35635 |
| main-app 入口 | 461 | 511 | 217 | 220 | 3 |
| Webpack 加载器 | 5010 | 4958 | 2338 | 2437 | 99 |
| 共享 UI / Motion / 图标 / 样式合并 | 155860 | 153290 | 49914 | 50458 | 544 |
| 留言展示与 Modal 共用组件 | 16515 | 15676 | 6043 | 5945 | -98 |
| 首页业务入口 | 90477 | 87741 | 29067 | 28599 | -468 |
| 同行时光的两份延迟脚本合计 | 37609 | 37098 | 9408 | 9368 | -40 |
| 实际首屏合计 | 602561 | 745277 | 182556 | 228546 | 45990 |

两份主要框架块增加 10315 + 35635 = 45950B，约占总增量 99.9%。其他文件净增 40B。React DOM 来自 Next 内置 compiled/react-dom，不能把该块直接当成外部 react-dom 包文件的增量。Next 路由块里新增或扩展的模块包括 segment-cache/cache、scheduler、render-tree、optimistic-routes 和 RSC client。

一次性、无第三方依赖的 Webpack stats 探针仅放在独立副本中。原始模块 ID 会随构建根路径改变，因此报告用唯一工厂指纹及显式标注的剩余工厂拓扑匹配。对未匹配模块保留空白。JSON 中的 buildSourceBytes 是原模块源码估计，压缩后的单文件 bytes/gzip 才是可相加的下载单位。 [详细模块归属](chunk-inventory.json)

首屏未请求完整攻略阅读器、头像编辑器、会话实验或公告清理器。未下载视频。Vaul、Recharts 和 Radix Dialog scaffold 未进入应用入口；已实际使用的 Modal 是 native dialog。Polyfills 出现在 HTML 的 nomodule 标签，本次现代 Edge 没有请求。

曾将 Toast/Spinner 改用同版本 Framer Motion 的 m/LazyMotion/domAnimation。首屏从 228546 增至 232848B。FAQ 的既有异步 Accordion 仍请求完整 motion 功能，新增共享块破坏了原来的复用。该试验已撤回，保留原动效。 [撤回前重复样本](rejected-motion/performance.json)

最终候选只保留环境声明、静态预览、身份提示和公告指针修复。框架的路由、RSC、React DOM 和安全检查继续按框架方式打包。

本机复现先将两个完整审核 SHA 分别 checkout 到 E:/Recovery/.jinxi-research/b2-a-6/chunks/pr14 与 pr15。已有目录先核对，避免覆盖。以 Node24.22.2 在两份副本分别 npm ci --include=dev；从主验收工作树运行 node artifacts/b2-a-6/prepare-stats.cjs，只给两份专用副本插入 Webpack 原生stats回调，然后分别 npm run build。node artifacts/b2-a-6/analyze-chunks.cjs 对冻结产物作归属，node artifacts/b2-a-6/write-bundle-report.cjs 生成本表。变更机器目录时同步 variants.cjs 与 scratch。产品 next.config 没有stats探针。

## pr14 完整导出资产

| 文件 | 原始 B | gzip B | 归属依赖 | 首页阶段 |
| --- | ---: | ---: | --- | --- |
| /_next/static/AfhcXhrYyDbVRByIbY1Hr/_buildManifest.js | 224 | 179 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/AfhcXhrYyDbVRByIbY1Hr/_ssgManifest.js | 80 | 64 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/117-7e475faf501989ee.js | 123798 | 31827 | next, @swc/helpers | 实际请求 |
| /_next/static/chunks/158.8324c57ca73dcfb4.js | 12746 | 4953 | application | 其他路由或按需 |
| /_next/static/chunks/28.47a59072c969ee6c.js | 4259 | 2023 | application, framer-motion, lucide-react | 其他路由或按需 |
| /_next/static/chunks/30.01857b02eb44316c.js | 16370 | 4315 | application | 其他路由或按需 |
| /_next/static/chunks/380.2f963309a812102c.js | 2522 | 1173 | application | 其他路由或按需 |
| /_next/static/chunks/493-c2f7f58c1ad75203.js | 155860 | 49914 | next, lucide-react, framer-motion, clsx, tailwind-merge, motion-utils, motion-dom | 实际请求 |
| /_next/static/chunks/571.289d8ae1146664ad.js | 36237 | 8714 | application, lucide-react | 实际请求 |
| /_next/static/chunks/596.c06a9bbffdd1c17f.js | 1372 | 694 | application | 实际请求 |
| /_next/static/chunks/623.064d7e93d94adfff.js | 14345 | 4338 | application | 其他路由或按需 |
| /_next/static/chunks/626-8f7bb3b73c4586b4.js | 19791 | 6991 | application, lucide-react | 其他路由或按需 |
| /_next/static/chunks/848.078fd635763650bb.js | 30536 | 11469 | dompurify | 其他路由或按需 |
| /_next/static/chunks/880.b6f56d469ba1f79f.js | 10502 | 3623 | application | 其他路由或按需 |
| /_next/static/chunks/932.410c69649db83968.js | 10865 | 4308 | application | 其他路由或按需 |
| /_next/static/chunks/962-a343d024099659f3.js | 16515 | 6043 | application | 实际请求 |
| /_next/static/chunks/app/guides/page-01e183a90dbf52c3.js | 15497 | 6140 | lucide-react, application, next | 其他路由或按需 |
| /_next/static/chunks/app/layout-63931425cb409f16.js | 858 | 404 | next | 其他路由或按需 |
| /_next/static/chunks/app/page-5a66da0bca513829.js | 90477 | 29067 | application, next | 实际请求 |
| /_next/static/chunks/app/profile-lab/page-b99168ddad1c27d2.js | 16946 | 6747 | application, lucide-react, next | 其他路由或按需 |
| /_next/static/chunks/app/session-lab/page-da84ea04ba8419cd.js | 11472 | 4578 | next, lucide-react, application | 其他路由或按需 |
| /_next/static/chunks/app/_not-found/page-b83f7d1f742076c4.js | 1745 | 873 | next | 其他路由或按需 |
| /_next/static/chunks/fd9d1056-b9b6863d0f5432b1.js | 172831 | 53742 | next | 实际请求 |
| /_next/static/chunks/framework-f66176bb897dc684.js | 139978 | 44946 | scheduler, react-dom, react | 其他路由或按需 |
| /_next/static/chunks/main-9c1c89348c7669f4.js | 111009 | 32298 | next, @swc/helpers, application | 其他路由或按需 |
| /_next/static/chunks/main-app-cefedaf7a84f4311.js | 461 | 217 | next | 实际请求 |
| /_next/static/chunks/pages/_app-72b849fbd24ac258.js | 280 | 194 | next | 其他路由或按需 |
| /_next/static/chunks/pages/_error-7ba65e1336b92748.js | 247 | 181 | next | 其他路由或按需 |
| /_next/static/chunks/polyfills-42372ed130431b0a.js | 112594 | 39627 | Next nomodule polyfills | HTML 声明，Edge 未请求 |
| /_next/static/chunks/webpack-f5f3684d821c30bc.js | 5010 | 2338 | Webpack runtime | 实际请求 |
| /_next/static/css/2dbadeae1d028006.css | 68512 | 12619 | CSS | 实际请求 |
| /_next/static/css/3f109eb114abd446.css | 47310 | 9479 | CSS | 实际请求 |
| /_next/static/css/4cb71f2bf1b214ab.css | 3916 | 1120 | CSS | 其他路由或按需 |
| /_next/static/css/7a4e0bd347172a82.css | 19863 | 4534 | CSS | 实际请求 |
| /_next/static/css/99e71b93752a6c6b.css | 7609 | 1788 | CSS | 实际请求 |
| /_next/static/css/c9b168207b4acce4.css | 1218 | 545 | CSS | 其他路由或按需 |
| /_next/static/css/efdbe75815e8665d.css | 6620 | 1731 | CSS | 其他路由或按需 |

## pr15 完整导出资产

| 文件 | 原始 B | gzip B | 归属依赖 | 首页阶段 |
| --- | ---: | ---: | --- | --- |
| /_next/static/chunks/156.ca8e7647969a9cb7.js | 1345 | 693 | application | 实际请求 |
| /_next/static/chunks/23.3d24349b74946b8e.js | 35753 | 8675 | application, lucide-react | 实际请求 |
| /_next/static/chunks/280.dfa5b53749a53ca6.js | 4752 | 1994 | next | 其他路由或按需 |
| /_next/static/chunks/326.ce2e6b7fd9bdf981.js | 2472 | 1166 | application | 其他路由或按需 |
| /_next/static/chunks/341.937e4a2b738bea60.js | 12388 | 4878 | application | 其他路由或按需 |
| /_next/static/chunks/4bd1b696-c7408084347438ae.js | 203721 | 64057 | next | 实际请求 |
| /_next/static/chunks/510.213b0542cc3666ca.js | 4202 | 2017 | application, framer-motion, lucide-react | 其他路由或按需 |
| /_next/static/chunks/597-ba6e3f1d110b4fa3.js | 19075 | 6900 | application, lucide-react | 其他路由或按需 |
| /_next/static/chunks/758.9bb241f573fcf68d.js | 14148 | 4330 | application | 其他路由或按需 |
| /_next/static/chunks/780.017c8b4df56fd737.js | 10355 | 4212 | application | 其他路由或按需 |
| /_next/static/chunks/794-8d371aeb1948ae36.js | 242282 | 67462 | next, @swc/helpers | 实际请求 |
| /_next/static/chunks/913-9dc10111a512cf18.js | 15676 | 5945 | application | 实际请求 |
| /_next/static/chunks/928-fa42644f46bcebc2.js | 153290 | 50458 | lucide-react, next, tailwind-merge, framer-motion, clsx, motion-dom, motion-utils | 实际请求 |
| /_next/static/chunks/945.8b55ba71d03a8e85.js | 10193 | 3563 | application | 其他路由或按需 |
| /_next/static/chunks/966.1775eb621d8d3e09.js | 753 | 419 | next | 其他路由或按需 |
| /_next/static/chunks/991.e7498e5f0695bda7.js | 16128 | 4280 | application | 其他路由或按需 |
| /_next/static/chunks/992.5c2fcb18cadfe117.js | 30144 | 11399 | dompurify | 其他路由或按需 |
| /_next/static/chunks/app/guides/page-3be05f90aad48554.js | 14628 | 5982 | application, lucide-react, next | 其他路由或按需 |
| /_next/static/chunks/app/layout-dfd856d486d4582a.js | 768 | 383 | next | 其他路由或按需 |
| /_next/static/chunks/app/page-44b07e22c2697089.js | 87741 | 28599 | application, next | 实际请求 |
| /_next/static/chunks/app/profile-lab/page-4d82475e3caea2c6.js | 16197 | 6596 | lucide-react, next, application | 其他路由或按需 |
| /_next/static/chunks/app/session-lab/page-6522ce73aaaeb312.js | 10974 | 4466 | application, next, lucide-react | 其他路由或按需 |
| /_next/static/chunks/app/_global-error/page-aba28f88d5781771.js | 147 | 136 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/app/_not-found/page-8d09983e9464a54c.js | 2667 | 994 | next | 其他路由或按需 |
| /_next/static/chunks/framework-ea4f97ca039bd777.js | 218916 | 68866 | react, react-dom, scheduler | 其他路由或按需 |
| /_next/static/chunks/main-4796b35d9c5c8b9a.js | 131959 | 38837 | next, @swc/helpers, application | 其他路由或按需 |
| /_next/static/chunks/main-app-7736007997126d7f.js | 511 | 220 | next | 实际请求 |
| /_next/static/chunks/next/dist/client/components/builtin/app-error-aba28f88d5781771.js | 147 | 136 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/next/dist/client/components/builtin/forbidden-aba28f88d5781771.js | 147 | 136 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/next/dist/client/components/builtin/global-error-60c553091cf60b75.js | 179 | 160 | next | 其他路由或按需 |
| /_next/static/chunks/next/dist/client/components/builtin/not-found-aba28f88d5781771.js | 147 | 136 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/next/dist/client/components/builtin/unauthorized-aba28f88d5781771.js | 147 | 136 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/chunks/polyfills-42372ed130431b0a.js | 112594 | 39627 | Next nomodule polyfills | HTML 声明，Edge 未请求 |
| /_next/static/chunks/webpack-c5daf6ef5b4ff7b9.js | 4958 | 2437 | Webpack runtime | 实际请求 |
| /_next/static/css/4cb71f2bf1b214ab.css | 3916 | 1120 | CSS | 其他路由或按需 |
| /_next/static/css/6fddc532e69e7c00.css | 68410 | 12544 | CSS | 实际请求 |
| /_next/static/css/7a4e0bd347172a82.css | 19863 | 4534 | CSS | 实际请求 |
| /_next/static/css/99e71b93752a6c6b.css | 7609 | 1788 | CSS | 实际请求 |
| /_next/static/css/c9b168207b4acce4.css | 1218 | 545 | CSS | 其他路由或按需 |
| /_next/static/css/efdbe75815e8665d.css | 6620 | 1731 | CSS | 其他路由或按需 |
| /_next/static/css/f25ca2a06c04d6f7.css | 47314 | 9494 | CSS | 实际请求 |
| /_next/static/jqZh9JDd_jOxqktft49nF/_buildManifest.js | 556 | 260 | 未映射 / 生成代码 | 其他路由或按需 |
| /_next/static/jqZh9JDd_jOxqktft49nF/_ssgManifest.js | 80 | 64 | 未映射 / 生成代码 | 其他路由或按需 |
