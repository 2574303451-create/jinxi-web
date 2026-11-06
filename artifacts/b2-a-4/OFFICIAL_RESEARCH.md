# JINXI-B2-A-4 · 官方资料增量核对

核对日期：**2026-11-06（Asia/Shanghai）**。本文区分公开资料中的事实、本项目的设计建议和仍待环境验收的条件；不是生产安全验收。先读了 `artifacts/b2-0/OFFICIAL_RESEARCH.md`，会话基本原则、TEST/prod 数据隔离、Cookie/CSRF 与受限数据库角色沿用该文，本文只补 A-4 所需差异。

本地静态阅读基线：分支 `codex/jinxi-b2-a-4-security`，HEAD `483495aefcd75316731efce76372748a0f00c8c7`；已读 `AGENTS.md`、`COLLABORATION.md`、`WEB_EXPLORATION.md` 及下述相关配置/组件。主任务可能并行修改，本文的源码观察不代表其最终实现。研究只写本文，未读取 `.env`、账户/CLI 登录配置、实际变量值或真实成员资料，未连接数据库、调用实际站点/账号控制面、发邮件、部署或建立真实会话。联网请求仅访问公开官方文档、源码、npm registry 与公开安全公告 API。

## 1. HTML 清理器：当前维护状态与准确版本

以下 `latest` 是本日直接查询 npm registry 的结果，不是搜索摘要或“建议版本范围”。精确版本应由主任务写入依赖与 lockfile；本研究未安装或改锁文件。

| 包 | 本日 latest / 发布时间（UTC） | 官方支持事实与本仓库影响 |
| --- | --- | --- |
| `dompurify` | **3.4.17** / 2026-10-12 12:41:28.880 | 提供 ESM/CJS 和类型；浏览器需要实际 DOM，服务端需要额外 DOM 实现。registry 无 `engines` 声明，不能因此推断所有 Node 版本均获保证。见 [registry 全量元数据](https://registry.npmjs.org/dompurify)、[3.4.17 元数据](https://registry.npmjs.org/dompurify/3.4.17)。 |
| `sanitize-html` | **2.18.1** / 2026-10-14 18:15:44.574 | `engines.node: >=22.12.0`，当前 Node 20 基线不满足。直接使用 HTML parser，不要求浏览器 `window`；也能经 webpack 等构建到浏览器，但没有现成浏览器构建。见 [registry](https://registry.npmjs.org/sanitize-html)、[2.18.1 元数据](https://registry.npmjs.org/sanitize-html/2.18.1)、[维护仓库 README](https://github.com/apostrophecms/apostrophe/blob/e8edbea953b375aaece85267799bf172c37ce61b/packages/sanitize-html/README.md)。 |
| `jsdom`（若服务端采用 DOMPurify） | **31.0.0** / 2026-11-05 12:15:08.988 | `engines.node: ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`，同样不能直接加入 Node 20 基线。见 [registry](https://registry.npmjs.org/jsdom)、[31.0.0 元数据](https://registry.npmjs.org/jsdom/31.0.0)。 |

**维护事实：**DOMPurify 的安全策略只承诺最新 release；其 README 说明持续运行浏览器及 Node/jsdom 测试，并强烈要求服务端 DOM 保持更新：旧 jsdom 自身的解析漏洞可能使正确的 DOMPurify 使用仍发生 XSS，不推荐以 happy-dom 替代安全 DOM。见 [固定版本 README](https://github.com/cure53/DOMPurify/blob/a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575/README.md#running-dompurify-on-the-server)、[安全策略](https://github.com/cure53/DOMPurify/blob/main/SECURITY.md)。sanitize-html 的旧独立仓库已归档，npm 当前指向仍维护的 Apostrophe monorepo；不能仅凭旧仓库归档断言包已停止维护。见 [旧仓库归档状态](https://github.com/apostrophecms/sanitize-html)、[当前包位置](https://github.com/apostrophecms/apostrophe/tree/e8edbea953b375aaece85267799bf172c37ce61b/packages/sanitize-html)。

### 已公开公告不应停留在旧修复版本

| 本轮核到的维护者公告 | 公开影响范围 / 修复版本 | 对本项目的解释 |
| --- | --- | --- |
| DOMPurify [GHSA-c6gr-qvv4-5v3f](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f) | `<=3.4.16` / `3.4.17` | XHTML parser 模式中 SMIL URL 防护被跳过；不要为本站开放 SVG/XHTML。 |
| DOMPurify [GHSA-mrv2-3pqr-j5jr](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr) | `<=3.4.16` / `3.4.17` | `IN_PLACE` 与移除节点 hook 的组合；项目无需采用该模式。 |
| DOMPurify [GHSA-cg2g-xh64-v4q7](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7) | `>=3.4.4, <=3.4.16` / `3.4.17` | `SAFE_FOR_TEMPLATES`、shadow root 与 DOM 输出组合；不要把模板保护旗标当作普通 HTML 清理所必需。 |
| sanitize-html [GHSA-c9rx-x947-fp3h](https://github.com/apostrophecms/apostrophe/security/advisories/GHSA-c9rx-x947-fp3h) | `>=2.18.0, <2.18.1` / `2.18.1` | 丢弃 iframe 的 fallback 重清理可无界递归；`2.18.0` 不是今天的候选。 |

上述 DOMPurify 三项公告发表于 2026-10-12；sanitize-html 该项发表于 2026-10-14。本日 GitHub 公共 advisory API 对 [dompurify@3.4.17](https://api.github.com/advisories?ecosystem=npm&affects=dompurify%403.4.17&per_page=100) 与 [sanitize-html@2.18.1](https://api.github.com/advisories?ecosystem=npm&affects=sanitize-html%402.18.1&per_page=100) 的直接包版本查询均返回空数组。**这仅表示该查询当时未列出适用公告，不证明无漏洞，也不覆盖全部传递依赖或本项目配置。**继续跟踪 [DOMPurify 维护者公告](https://github.com/cure53/DOMPurify/security/advisories) 和 [Apostrophe 维护者公告](https://github.com/apostrophecms/apostrophe/security/advisories)。

## 2. 本仓库建议：浏览器 DOMPurify、显式白名单、按需加载

**已观察的本地触点：**基线 `components/cyber-announcement.tsx` 使用自制黑名单清理，且 `typeof window === 'undefined'` 时返回输入原串；攻略详情与投稿预览把 `formatStrategyContent(...)` 直接送入 `dangerouslySetInnerHTML`。这些都是应由主任务收口的 HTML sink，不因为字段名叫 `safeHtml` 或内容来自管理员就已满足安全清理。

**建议选用 `dompurify@3.4.17` 作为本轮浏览器清理器。**理由是已有浏览器富文本触点、当前 Node 20 构建基线和按需加载要求；这不是对两库安全性的绝对排名。后续受支持 Node 升级后，服务端可独立评估 sanitize-html 或 DOMPurify + 当前 jsdom，不向首页客户端引入 jsdom/isomorphic wrapper。

1. 先完成 Markdown/富文本格式转换，最后一步才清理并直接送入目标 sink；不能清理后再用字符串替换拼接不可信 HTML。DOMPurify 维护者明确指出后续改写可能破坏清理效果，`removed` 也不能用于安全决策。见 [使用约束](https://github.com/cure53/DOMPurify/blob/a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575/README.md#is-there-any-foot-gun-potential)。
2. 用 `ALLOWED_TAGS` / `ALLOWED_ATTR` 明确列出项目允许的正文标签和属性；例如段落、列表、粗斜体、代码、链接，以及经产品确认的图片。默认不开放 `script/style/iframe/object/embed/form/template/svg/math`、事件属性、任意 `style/class/id/name`、`data-*`。可显式关闭 `ALLOW_DATA_ATTR` / `ALLOW_ARIA_ATTR`，保留默认 DOM 防 clobbering；需要属性时逐项说明用途。`USE_PROFILES` 会覆盖 `ALLOWED_TAGS`，不能无意混用。见 [配置 API](https://github.com/cure53/DOMPurify/blob/a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575/README.md#can-i-configure-dompurify)。具体白名单属于项目决策。
3. URL 是独立产品策略：链接、图片分别限制 scheme/目标；不因清理库允许某种 URL 就默认允许。若必须兼容图片 data URL，仅评估已确认的 raster MIME/大小边界，不沿用 `data:image/*` 无差别规则。不要在 `afterSanitize*` hook 中重新写入不可信值；维护者说明该阶段写入不再验证。使用 hook 应限于清晰、可测试的删除/限制，避免嵌套 `sanitize()` 改变同一实例的配置。见 [hook 注意事项](https://github.com/cure53/DOMPurify/blob/a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575/README.md#hooks)。
4. **必须检查 `isSupported === true`，不能只捕获异常。**固定版本源码在不支持环境中会返回输入原串：这是库的兼容行为，不是安全清理成功。缺 DOM、未加载、异常、超限或不支持时只能渲染 React 转义的纯文本/空状态，禁止原 HTML 回退。见 [固定版本源码](https://github.com/cure53/DOMPurify/blob/a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575/src/purify.ts)。
5. 外部库通过 `import('dompurify')` 在真正需要富文本时加载并复用 promise/实例。Next 14 官方支持这类按需导入；仅把组件拆成 chunk、却仍在首页立即挂载它，仍会立即加载。`'use client'` 组件也默认参与 prerender；不能把它等同于“永不在构建端执行”。见 [Next 14 lazy loading](https://nextjs.org/docs/14/app/building-your-application/optimizing/lazy-loading)。异步内容切换时应将旧结果和原输入绑定，忽略过期请求；在新输入完成清理前不展示上次清理结果冒充新结果。

**静态导出兼容判断：**Next 14 在构建时生成各路由 HTML，浏览器可继续加载客户端交互；不在构建期间执行依赖 `window` 的清理逻辑、且初次 prerender 不输出原 HTML 的方案在架构上兼容 `output: 'export'`。这是根据官方渲染模型的推论，仍需主任务实际构建/浏览器验收。见 [Next 14 static exports](https://nextjs.org/docs/14/app/building-your-application/deploying/static-exports)。建议用恶意 HTML、编码/控制字符 URL、损坏嵌套、SVG/MathML、`xmp/noscript/template` 等输入做真正浏览器 sink 验证，并核 bundle/network，不能仅凭源文件有动态 import 宣称首页未提前加载。

浏览器清理保护接收内容的浏览器，不是服务端发布权限、数据库输入约束或其他消费者的完整防线；若未来允许写入 HTML，服务端还须独立验证身份/大小/格式并考虑统一清理。

## 3. CSP：静态 Next hydration 需要明确授权内联脚本

**官方事实：**Next `v14.2.16` 的 App Router 源码会输出包含 `self.__next_f.push(...)` 的内联 `<script>`，用于 hydration 数据。因此 `script-src 'self'` 本身不足以让静态页面完整 hydration。见 [固定版本 use-flight-response.tsx](https://github.com/vercel/next.js/blob/v14.2.16/packages/next/src/server/app-render/use-flight-response.tsx)。当前 Next 指南的 request nonce 方案要求动态渲染；把固定 nonce 写进静态导出文件不满足其每响应唯一、不可预测的前提。见 [Next nonce 与渲染模型](https://nextjs.org/docs/app/guides/content-security-policy#static-vs-dynamic-rendering-with-csp)。

**可实施的本项目提案：**构建最终导出 HTML 后，逐页提取全部需要执行的内联 script 内容，计算 SHA-256/384/512 的 base64 CSP hash，并生成对应路径策略；保留必要的外部脚本来源，移除 `script-src` 中的 `'unsafe-inline'`。hash 计算对象不包含 `<script>` 标签，内容的空白/大小写影响结果；应对最终浏览器解析到的文本保持一致，尤其注意换行规范化。不要把事件属性也放宽为 `unsafe-hashes`；可另设 `script-src-attr 'none'`。见 [MDN script-src 的 hash 与内联规则](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)、[W3C CSP3 的匹配规则](https://www.w3.org/TR/CSP3/#match-element-to-source-list)。

生成器应对全部导出 HTML、公开路由别名、首页、404/未知路由响应建立明确覆盖；无法解析、漏页或策略超限应使构建失败。若逐路由映射尚未可靠验证，合并全部可信构建脚本 hash 到单一策略也是候选，但会扩大单页授权集合并增加 header 大小，必须测量。每次 HTML 或脚本内容变化均重算；不能维护一份长期静态手填 hash。这些是工程建议，不声称 Netlify 已执行。

当前 Next 文档中的实验 SRI 给外部 JS 文件增加 `integrity`；它与 CSP 配合，但不能因此推定本站所有内联 hydration 脚本已被 hash 授权。见 [Next SRI 说明](https://nextjs.org/docs/app/guides/content-security-policy#subresource-integrity-experimental)。

### `unsafe-eval` 与 style 的收紧边界

**事实：**Next 当前官方指南说明开发模式可能需要 `'unsafe-eval'`，默认生产 React/Next 不需要它；这不是“本仓库全部第三方依赖已验收”的结论。见 [Next CSP 指南](https://nextjs.org/docs/app/guides/content-security-policy)。主任务应在生产静态输出上检查动态执行调用与 CSP 违例，覆盖首页、按需弹层、编辑/预览、图表与发信 SDK 的加载；本地 dev/HMR 报错不能反过来成为生产保留它的依据。

**报告模式提案：**未知依赖可先由 `Content-Security-Policy-Report-Only` 观察拟收紧策略；它只报告、不阻断，不能写成“已强制 CSP”。浏览器违例事件可用于本地验收，不需要把数据送至第三方；若配置真实报告端点，URL/样本也应按敏感日志管理。多个强制 CSP 同时存在时全部被执行，后一条不能放宽前一条。见 [MDN Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)、[W3C 多策略](https://www.w3.org/TR/CSP3/#multiple-policies)。

**本地 style 现状：**基线 `app/layout.tsx` 有两个内联 `<style>`，`app/page.tsx`、进度条、轮播/动画、图表等组件存在 `style={...}`；因此不能凭脚本 hash 成功就删除全部 style 内联许可。style 元素 hash 与 style attributes 是不同问题。MDN 说明 `style-src-attr` 约束 style 属性及 `setAttribute('style', ...)`/`cssText`，直接设置单个 `element.style.property` 又有不同处理。见 [MDN style-src-attr](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr)。本轮可先强制脚本策略，保留经说明的 style 限制；后续把可静态化样式移至 CSS，再评估 `style-src-elem` hash 与 `style-src-attr` 收紧，不能宣称已做到全站无内联样式。

## 4. Netlify headers 顺序与发布后 HTML 变换

### 已由官方开源实现确认的顺序

本日读取的 Netlify build commit 为 `aedc1697c304ae5de1a2f8e427391c664cd144ea`，CLI commit 为 `d0bd793f103e1724b38e3240437e13dac2747c07`：

- [`headers-parser/merge.ts`](https://github.com/netlify/build/blob/aedc1697c304ae5de1a2f8e427391c664cd144ea/packages/headers-parser/src/merge.ts) 按 `fileHeaders` 后 `configHeaders` 排列；注释明确**同 path、同 header 时 TOML 覆盖 `_headers`，不连接值**。
- CLI [`headersForPath`](https://github.com/netlify/cli/blob/d0bd793f103e1724b38e3240437e13dac2747c07/src/utils/headers.ts) 将所有匹配规则依次 `Object.assign`，后匹配条目覆盖已有同名字段。因此**按官方 CLI 本地语义**，TOML 的 `/*` 默认 CSP 即使与 `_headers` 的显式路由 path 不同，也会在后面覆盖路由 CSP。
- [`config/src/headers.js`](https://github.com/netlify/build/blob/aedc1697c304ae5de1a2f8e427391c664cd144ea/packages/config/src/headers.js) 将 publish 目录的 `_headers` 与配置一并解析。官方 [custom headers 文档](https://docs.netlify.com/manage/routing/headers/) 说明 headers 只适用于 Netlify 自身静态 backing store；Functions、Edge/SSR、代理响应须自行返回安全头。

**建议：CSP 只留一个生成来源。**若采用生成的 `out/_headers`，TOML 不再同时声明会重叠的 CSP；在同一生成文件中先放默认拒绝策略，再放明确路由策略，并用官方 matcher 验证每个 URL 的最终结果。另一候选是由构建产出最终 TOML CSP 规则，而非期待 `_headers` 覆盖它。生成器缺失/失败时构建必须失败；默认策略不是生成失败后仍准许发布的理由。

上述证据能验证公开 parser/CLI 行为，**本轮没有验证实际 Netlify CDN 的最终响应、重写/404 路径或旧部署**；本地自制服务器也不能把 CDN 的行为变成已证事实。未来验收须看实际响应是否只有预期的一份强制 CSP，并核对 HTML 与 hash。

### 不能仅以“构建后算过 hash”推定线上字节稳定

本日官方 [post-processing overview](https://docs.netlify.com/build/post-processing/overview/) 列出 snippet injection、Pretty URLs 和 prerendering，当前 [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/#post-processing) 的公开 post-processing 配置仅描述 Pretty URLs；不能把旧的 minify/bundle/`skip_processing` 写法当作今天已经关闭一切变换的证据。

官方 [snippet injection](https://docs.netlify.com/build/post-processing/snippet-injection/) 明确可以往 HTML head/body 注入脚本，设置会立即生效、不需 redeploy，且内容可在 serving 时用 Liquid 环境变量展开。它不一定改写已有 hydration script 文本，但会改变脚本集合，新脚本也必须被策略处理；无法据本地构建证明当前站点未启用它。官方 [Prerender extension](https://docs.netlify.com/build/post-processing/prerendering/) 会按 user-agent 重写至函数返回另一份 HTML，而该函数响应不自动继承静态 custom headers。

**待正式启用条件：**授权管理员确认 snippet/第三方注入、prerender、扩展、代理和外层 CDN 的实际设置；若有任何改变内联内容/新增脚本的变换，需将其纳入可信生成与验收链。不得靠放回 `'unsafe-inline'` 掩盖 hash 不匹配。本轮没有读取这些控制面设置，也不将 `[build.processing]` 任一单项视为全部关闭的凭据。

### EmailJS 的具体依赖

基线 `components/email-service.tsx` 动态插入 `https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js`。本日该公开 URL 响应标识 `lib_version: "4.4.1"`，UTF-8 3941 字节；静态阅读未见 `eval()`、`Function()` 或字符串定时器，SDK 直接 fetch EmailJS API。对应 [4.4.1 registry](https://registry.npmjs.org/@emailjs%2fbrowser/4.4.1) 的 gitHead 为 `244f1ad7df859c17a9ce4663e4a6b51c5071c621`，官方源码分别见 [sendPost](https://github.com/emailjs-com/emailjs-sdk/blob/244f1ad7df859c17a9ce4663e4a6b51c5071c621/src/api/sendPost.ts)、[origin 配置](https://github.com/emailjs-com/emailjs-sdk/blob/244f1ad7df859c17a9ce4663e4a6b51c5071c621/src/store/store.ts)、[send](https://github.com/emailjs-com/emailjs-sdk/blob/244f1ad7df859c17a9ce4663e4a6b51c5071c621/src/methods/send/send.ts)。**该 SDK 未给出保留 `unsafe-eval` 的依据；静态阅读不等于完成真实路径验证。**

若保留现有 SDK，建议脚本 URL 精确固定为 `@4.4.1`，按需要开放该脚本路径与 `connect-src https://api.emailjs.com`，再评估 `integrity` / `crossOrigin`。本轮对精确 URL 的公开响应计算得到 `sha384-SALc35EccAf6RzGw4iNsyj7kTPr33K7RoGzYu+7heZhT8s0GZouafRiCg1qy44AS`；这是本轮观测值，实施前应复核。`@4` 为可变 alias，不能长期假定等于该字节集合。全站 `'strict-dynamic'` 还会改变脚本 host allowlist 的处理，不能在保留动态 SDK 的同时未经验证照搬。浏览器验证用 stub 截获发信请求和合成参数即可，不发送真实邮件。本研究未运行 SDK、未读取发信配置值。

## 5. Netlify 环境变量：尚无经核实的纯元数据读取合同

本日核对官方 OpenAPI commit **`96b688490fa406c71e4453e041ec5a0587d35f0b`**（2026-11-03），见 [固定 swagger.yml](https://github.com/netlify/open-api/blob/96b688490fa406c71e4453e041ec5a0587d35f0b/swagger.yml)、[在线 API 参考](https://open-api.netlify.com/)。这里只读取公开 schema，没有请求实际账号/站点。

| 公开读取 operation | 参数 / 响应合同 | 能否用于本轮“不取得值”核验 |
| --- | --- | --- |
| `getEnvVars`，`/accounts/{account_id}/env` | 可按 `context_name`、`scope`、`site_id` 筛选，返回 `envVar[]`。 | **不能据此保证。** |
| `getSiteEnvVars`，schema 中 `/api/v1/sites/{site_id}/env` | 便利接口，不要求 account ID；语义与 `getEnvVars` 相同，也返回 `envVar[]`。 | **不能据此保证。** |
| `getEnvVar`，`/accounts/{account_id}/env/{key}` | 可指定 `site_id`，返回同一 `envVar`。 | **不能据此保证。** |

`envVar` 包含 `key/scopes/is_secret/values`；`envVarValue` 包含 `context/context_parameter/value`，schema 把 `value` 描述为未加密值。上述 GET 未声明 `fields`、`omit_values`、`metadata_only` 或保证仅返回 key/context/scope/source 的投影参数。site 与 shared 来源也不能仅凭同名 key 判定；CLI 以分别查询并合并来源的方式处理。**结论限于“公开合同未证实存在安全的纯元数据接口”，不作“平台永远不可能提供”的断言。**

CLI 并非替代方案：固定 [`env-list.ts`](https://github.com/netlify/cli/blob/d0bd793f103e1724b38e3240437e13dac2747c07/src/commands/env/env-list.ts) 先 `getEnvelopeEnv` 再把表格值遮成 mask，JSON/plain 分支会输出值，CI 分支还直接显示未隐藏值；[`utils/env/index.ts`](https://github.com/netlify/cli/blob/d0bd793f103e1724b38e3240437e13dac2747c07/src/utils/env/index.ts) 先取 account/site 的 `values` 后解析。故不执行 `env:list`、`env:get`、`netlify api getEnvVars` 或 GET 后 `jq/Select-Object` 过滤来冒充“未读取生产值”。

Secrets Controller 的非 dev secret 值是 write-only/掩码，但默认变量未必标记 secret、dev secret 可读、运行于平台的代码仍可读取原值，因此它不是普遍的 metadata-only 合同。见 [Secrets Controller policy](https://docs.netlify.com/build/environment-variables/secrets-controller/#environment-variable-secrets-policy)。

**后续建议：**保持 metadata 核验表的 key/context/scope/shared 来源、分支覆盖、secret 标记等字段，但把未核到的实际内容标为未知。授权管理员可以在不 reveal/copy 的界面核查可见配置；该做法本身仍不能证明浏览器背后的 API 响应从未包含值。若要求连响应都不取得任何生产值，则等待 Netlify 提供/确认服务端元数据投影或其他已验证的权限合同；不要先取原响应再做本地脱敏。本轮所有真实配置仍未验收。

## 6. Blobs / 独立 bucket：共享边界维持待验收

本日重读官方 [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores)：`getStore` 仍是 site-wide，跨全部 deploy/context 共享；文档仍明确提醒 branch deploy 可删除 published deploy 依赖的数据。`getDeployStore` 是 deploy-specific 命名空间；这不是为长期头像提供独立 TEST/prod 授权的充分证明。默认 eventual consistency 的更新/删除可在边缘传播达 60 秒，可选择 strong，但一致性选择本身不是 ACL。

**本项目状态未发生升级：**未验证实际 Blobs site/store、自动注入能力、独立 bucket、IAM/token 范围或公开访问。给 store 加 `test_` 前缀只改变选择，不证明 TEST 代码不能访问生产。独立 TEST/prod bucket 与各自受限凭据仍是候选，需日后用服务端授权拒绝来证明；已有 B2-0 的 [R2 token 范围](https://developers.cloudflare.com/r2/api/tokens/) / [S3 IAM 资源授权](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html) 依据继续适用。本轮不列举、读写、上传、删除真实对象，也不创建 bucket/token。

## 7. 正式会话：可信 client address、成本、连接和清理

本节均为正式接入前的设计依据；B2-0 的随机 reference token、摘要入库、CSRF、状态/版本撤销仍适用，不把本地会话实验直接视为云端完成。

### 来源 IP 与分布式限流

**事实：**现代 Netlify Functions API 提供 `context.ip`，定义为客户端 IP 字符串，见 [Functions API](https://docs.netlify.com/build/functions/api/#ip)。Netlify 维护者对 Lambda 风格请求推荐 `x-nf-client-connection-ip`，并说明早期 `client-ip` 已移除；该支持说明是 [2022 年平台公告](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665)，不应把它扩大为今天任意本地/代理路径的抗伪造证明。

**建议：**生产适配器只从已确认由平台提供的 `context.ip`（或经单独验证的 legacy 入口）取值；不依次回退到来路不明的 `X-Forwarded-For/X-Real-IP`，不简单拿逗号首项。校验有效 IPv4/IPv6、统一规范表达，缺失/畸形时按明确降级策略限流而非创建可任意变化的新 bucket；不得把 IP 当成员身份、授权或 Cookie 会话绑定的唯一条件。若前面还有 Cloudflare/自建代理，Netlify 观察到的是哪一跳、谁覆盖 header、是否可绕过代理，均需验证。loopback 单元测试不能证明平台可信链。

账号与可信来源的组合限流应在共享、原子的状态存储中实施；单函数内存不能覆盖多实例。错误的来源 IP 可让攻击者绕过限流，也可让整个代理出口被误封。限流阈值、保留期、IP 摘要/HMAC 方案和异常流量预算均待定；摘要不自动使 IP 数据匿名。限流原则参见 [OWASP login throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling)。

### 成本与请求频率

**本日官方计费事实：**credit-based 计划的 Functions 以 GB-hour compute 计费，默认 1024 MB；当前公共费率是 compute **10 credits/GB-hour**、web requests **2 credits/10,000 requests**，另有带宽等指标。Legacy 计划规则不同。见 [Functions usage and billing](https://docs.netlify.com/build/functions/usage-and-billing/)、[How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)。本轮不知道实际套餐、配额、地区、自动充值、Neon 账单或用户负载，不估报实际月费。

**建议：**认证查询随受保护业务请求执行，页面恢复/必要状态更新再请求 `me`；不为“显示在线”自动添加频繁心跳。纯算例：100 人每天各开页 8 小时、每 30 秒一次心跳，会新增 `100 × 8 × 3600 / 30 = 96,000` 次请求/天；还未计业务请求、函数执行时间、数据库读写和带宽。对空闲超时的 `last_seen` 写入可评估条件更新/批次粒度，但必须说明误差并始终检查权威过期/撤销/成员状态；不能靠无限延长空闲期或长期缓存授权结论省成本。数据库故障/超时须拒绝受保护动作，并返回受控错误。

### 连接池与事务

**事实：**Neon 推荐 serverless 短连接使用 pooled endpoint；其 PgBouncer 使用 transaction pooling，事务结束即归还服务端连接，不保证跨事务的 session 状态。见 [Neon pooling](https://neon.com/docs/connect/connection-pooling)。`pg.Pool` 的 `max` 是每个进程/池的上限，必须按所有服务和实例合计预算；取出的 client 必须释放，否则池耗尽。见 [node-postgres pool sizing](https://node-postgres.com/guides/pool-sizing)、[Pool API](https://node-postgres.com/apis/pool)、[事务同 client 要求](https://node-postgres.com/features/transactions)。

**建议：**先确定正式运行时与 driver，再选择生命周期；不能同时照搬 TCP pg、Neon HTTP 和 Edge WebSocket 三种模板。Node/TCP 的候选是在可复用的暖实例中保留有界池，设置连接/语句/事务超时、空闲回收与错误处理，并在 `finally` 释放；池大小须结合最大实例数和数据库预算验收，不能把本机 `max=10` 当全站上限。登录/改密/撤销等原子动作必须使用同一 client 的事务，不依赖跨请求 `SET`/全局变量传递身份。

Neon `neon()` 的 HTTP 查询可通过 `transaction()` 提交非交互事务；需要交互事务时才评估 `Pool/Client`。官方特别说明 Edge WebSocket 不能跨请求复用，必须在同一 handler 连接、使用并关闭。见 [Neon driver](https://neon.com/docs/serverless/serverless-driver)。这项 Edge 限制不能未经验证套用为 Netlify Node/TCP 的必然生命周期；反之，Node 暖实例复用经验也不能套用到 Edge。

### 清理不代替到期验证

**事实：**Netlify Scheduled Functions 按 UTC cron 运行，只有 published deploy 自动触发，Deploy Preview/branch 不自动触发；执行上限 30 秒，不能通过公开 URL 直接调用。见 [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/)。PostgreSQL 的 autovacuum 回收已更新/删除元组所占空间，并不会按业务 `expires_at` 自动删除仍存在的行；见 [Routine vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)。

**建议：**请求鉴权始终独立检查绝对/空闲过期、撤销、成员可用状态和 auth version；清理任务延迟/失败不能让旧会话恢复有效。另设有界、幂等的批量清理，按过期索引删除已过期 session、已到保留期的撤销记录/限流窗口；设置批次与时间预算，避免大事务和长锁，重入/失败允许重试，日志只记数量/时长/结果。保留期、索引、容量和最小权限清理 role 属于待实施设计，不在此承诺具体天数。

正式 TEST 需显式验证清理入口与数据隔离，不能因为预览没有自动 cron 就完全不回收；生产不能提供可被匿名调用的“清理全部会话”接口。清理定时器、数据库连接和所有任务配置仍未部署或验收。

## 8. Next / Node 升级评估：只更新依据

本日再次查询，Next registry `latest` 为 **16.4.5**、`backport` 为 **15.5.29**，见 [Next registry](https://registry.npmjs.org/next)。官方 [support policy](https://nextjs.org/support-policy) 仍将 14.x 列为 Unsupported，16.x 为 Active LTS、15.x 为 Maintenance LTS；[2026-11 安全发布](https://nextjs.org/blog/november-2026-security-release) 给出上述两条受支持修复线。不能把旧 14.x 某次修复线当今天仍受支持，也不据版本号宣称本站某个漏洞已可利用。

Node 官方 [release schedule](https://github.com/nodejs/Release/blob/main/schedule.json) 给出 Node 20 EOL 为 2026-04-30，Node 24 自 2026-10-20 为 Maintenance LTS、计划维护至 2028-04-30；本日 [公开发行索引](https://nodejs.org/dist/index.json) 的最新 24.x 为 **24.22.2（2026-10-27）**。它满足上表 sanitize-html/jsdom 的 engines，只证明静态版本条件的交集，不是本仓库已回归通过。

后续独立升级任务应覆盖 React/App Router 变化、静态导出、Netlify 的实际构建/Functions runtime、lint/类型检查、依赖公告、CSP hash 重算、富文本/上传/会话回归；不能仅修改 `engines`、CI 的 Node 或安装成功就宣布完成。本研究没有升级代码，A-4 的清理与 CSP 修复不解除受支持运行时这一正式启用门槛。

## 9. 本轮可采纳结论与仍未知项

| 项目 | 可用依据 / 建议 | 本轮不能证明 |
| --- | --- | --- |
| 富文本渲染 | 精确 DOMPurify 3.4.17、支持检测、白名单、无原 HTML 回退、浏览器按需 import | 主任务最终实现、实际 XSS 测试及 bundle 加载结果 |
| 静态 CSP | hydration 内联脚本需 hash；生产默认框架无 eval 需求；单一 headers 生成来源 | 实际 CDN header、路由/404、post-processing/扩展设置与发布后字节 |
| 变量元数据 | 当前公开 GET/CLI 会取得 values，没有已验证纯 metadata 合同 | 真实 key/context/scope/shared 配置及生产凭据隔离 |
| Blobs/bucket | getStore 仍跨 context 共享；独立授权仍需证据 | 真实资源、凭据和跨环境拒绝能力 |
| 正式会话 | 平台 IP 适配、容量预算、有界连接、逐请求失效、定时回收依据 | 实际代理可信链、套餐、数据库权限/容量、调度和并发效果 |

主任务应把其实际修改与检查记录在独立实施/验收材料中，不把本文的设计建议自动升级为已实现事实。
