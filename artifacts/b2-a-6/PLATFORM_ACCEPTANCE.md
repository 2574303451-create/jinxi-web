# JINXI-B2-A-6 · 平台与真实环境验收门槛

核对日期：**2026-11-06（Asia/Shanghai）**。本报告沿用 B2-A-5 `TEST_GATE.md`、`OFFICIAL_RUNTIME_RESEARCH.md` 及 B2-A-4 `ENVIRONMENT_GATE.md` 的边界，仅核对公开官方资料、公开包元数据与本工作树配置。**没有访问 TEST/PROD、真实站点控制面、数据库或存储，没有读取环境变量值、凭据或登录文件，没有部署、轮换或撤销云资源。下列云验收项全部待证，本文不构成云隔离批准。**

## 1. 当日版本、支持与公开公告

| 对象 | 本轮重新核对的官方事实 | 对本候选的结论 |
| --- | --- | --- |
| Next.js | npm `latest` 为 **16.4.5**，`backport` 为 **15.5.29**。16.x 为 Active LTS；15.x 为 Maintenance LTS，安全发布延至 **2027-01-31**；14.x 已不受支持。16.4.5 的 Node engine 为 `>=20.9.0`。 [npm 标签](https://registry.npmjs.org/-/package/next/dist-tags) · [支持政策](https://nextjs.org/support-policy) · [16.4.5 元数据](https://registry.npmjs.org/next/16.4.5) | 保留 Next **16.4.5**。15.5.29 仅为受支持备选，不能回退至原 14.2.16。 |
| React / React DOM | 两包 npm `latest` 均为 **19.3.1**；DOM 的 React peer 为 `^19.3.1`。Next 16.4.5 的 React/DOM peer 包含 React 19。 [React latest](https://registry.npmjs.org/react/latest) · [React DOM latest](https://registry.npmjs.org/react-dom/latest) · [Next 包合同](https://registry.npmjs.org/next/16.4.5) | 保留 **19.3.1 / 19.3.1**。这里没有把 React 描述为 Node/Next 式 LTS。 |
| Node.js | 官方索引中最新 24.x 是 **24.22.2（2026-10-27）**，附带 npm **11.19.1**。24.x 于 **2026-10-20** 进入 Maintenance LTS，计划支持至 **2028-04-30**。全局最新稳定/LTS 主线已有 **26.13.0（2026-10-28）**，26.x 于该日进入 Active LTS；20.x 已于 2026-04-30 结束维护。 [发行索引](https://nodejs.org/dist/index.json) · [Node 官方计划](https://github.com/nodejs/Release/blob/main/schedule.json) | **24.22.2 是最新 24.x，不能称为全局最新 Node。** 构建和本机继续使用该精确版本；Functions 单独验收。 |
| npm | 候选 **11.19.1** 的 Node engine 为 `^20.17.0 \|\| >=22.9.0`，接受 24.22.2。注册表全局 `latest` 已为 **12.2.2**，其 engine 为 `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`。 [11.19.1 元数据](https://registry.npmjs.org/npm/11.19.1) · [npm latest](https://registry.npmjs.org/npm/latest) | 11.19.1 是本次随 Node 固定、可复现的工具链选择，**不是当日 npm latest**。本报告没有把 npm 11 标成具有官方 LTS 承诺的主线，也未变更为 npm 12。 |

16.4.5 的官方 11 月 3 日发行说明列出七项安全修复，覆盖四项缓存隔离/污染问题，以及自托管响应转发、图片优化 SVG 拒绝和 Edge 内部响应头问题。不得因为本项目静态导出就跳过锁文件及直接/间接依赖审查。 [Next 16.4.5 官方安全修复清单](https://github.com/vercel/next.js/releases/tag/v16.4.5)

本轮通过**未认证的公开 GitHub Advisory API**精确查询 `next@16.4.5`、`react@19.3.1`、`react-dom@19.3.1`、`npm@11.19.1`，均得到空数组。此结论仅限采集时已公开、匹配对应直接包版本的公告，不包含全部锁文件、框架内置 React、未公开漏洞或托管补丁状态。15.5.29 的本轮查询遇到 TLS 失败，没有沿用上轮空数组冒充本轮成功结果。 [Next 精确查询](https://api.github.com/advisories?ecosystem=npm&affects=next%4016.4.5&per_page=100) · [React 精确查询](https://api.github.com/advisories?ecosystem=npm&affects=react%4019.3.1&per_page=100) · [React DOM 精确查询](https://api.github.com/advisories?ecosystem=npm&affects=react-dom%4019.3.1&per_page=100) · [npm 精确查询](https://api.github.com/advisories?ecosystem=npm&affects=npm%4011.19.1&per_page=100)

## 2. 构建版本与实际 Functions runtime 分开验收

Netlify 当前构建镜像默认为 Node 24，允许选择 nvm 可安装的版本。Node 选择优先级为 `.nvmrc` → `.node-version` → `NODE_VERSION` → 站点依赖设置；npm 另受 `NPM_VERSION` 等依赖配置影响。本工作树观察到 `netlify.toml` 固定 Node **24.22.2**、npm **11.19.1**，构建命令为 `npm ci --include=dev && npm run build`，发布目录为 `out`；未发现上述两个 Node 版本文件。实际云结果仍须构建日志证明。 [Netlify 构建软件与优先级](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/) · [依赖安装规则](https://docs.netlify.com/build/configure-builds/manage-dependencies/)

Netlify 默认按构建 Node 主版本选择有效且距弃用超过两个月的 AWS runtime，否则回退 Node 24。官方允许通过 UI/CLI/API 的 `AWS_LAMBDA_JS_RUNTIME` 指定 runtime，并要求重新部署；**该覆盖不能写在 `netlify.toml`**。文档中的 `nodejs24.x` 是期望的运行时标识，不是本轮读到的站点变量值。 [Netlify Functions runtime 规则](https://docs.netlify.com/build/functions/configuration/#nodejs-version-for-runtime)

AWS `nodejs24.x` 基于 Amazon Linux 2023，计划弃用日 **2028-04-30**，运行时补丁由平台管理，不能以构建机 24.22.2 推定它的精确补丁号。AWS 表中虽出现 `nodejs26.x`，但其当前状态为 **public preview，无 SLA/技术支持，官方要求不要用于生产**。因此本轮保持 Node 24 Functions 验收目标，不能从“Node 26 已 Active LTS”直接推导平台生产支持。Node 24 Lambda 不再接受异步 callback 型 handler，并默认禁用 `require(esm)` 与自动模块检测；须检查**打包后的入口/包装器**，而不只看源函数是否 `async`。 [AWS 支持表与预览限制](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported) · [AWS Node 24 行为变更](https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/)

| 必交非秘密证据 | 通过条件 |
| --- | --- |
| 站点/团队项目 ID、部署 ID、分支、实际 context、完整 40 位 Git SHA、构建配置修订、采集时间与审阅者 | 对应同一批准的候选提交；不能用 PR 号或分支名替代 SHA。 |
| 构建镜像、实际 `node --version` / `npm --version`、锁文件 SHA-256、安装方式、构建/后处理退出码 | 本轮精确工具链一致；构建工具确已安装，`postbuild` 确已生成 CSP；脱敏日志不含变量值。 |
| CLI、平台 build/bundler、Next 适配器的实际版本和启用/跳过状态、publish 目录、Functions 清单及产物摘要 | 静态 `out` 与自有 Functions 的部署方式明确；不能把本地 CLI 打包成功当作云运行证明。 |
| 打包 target/runtime 声明、最终入口及模块格式、有效 runtime 配置的管理员摘要、实际调用使用的 runtime 标识和精确 Node 版本 | **本机 Node、构建 Node、打包 target、实际托管 Node 分栏**；runtime 为获批 Node 24，包装器符合 Node 24；平台管理的补丁号据实记录。 |
| 同一 deploy/SHA 的获批 TEST 合成请求及平台日志对应编号 | 覆盖冷启动、依赖载入、预期只读、拒绝路径和错误响应；不得新增公开的环境变量诊断或泄漏配置的 health 接口。 |

B2-A-5 已记录锁定 CLI 23.2.1 / zip-it-and-ship-it 14.1.4 的映射/编译 target 止于 Node 22。正式验收必须提供**本次实际平台打包版本与目标**，不能把较旧 CLI 的 Node 22 target 当成实际 Functions runtime，也不能把 `AWS_LAMBDA_JS_RUNTIME` 的期望标识当成已运行的事实。其官方固定源码供追溯。 [runtime 映射](https://github.com/netlify/build/blob/5fe77df7b4aed960ac5a29358d46f50600721d84/packages/zip-it-and-ship-it/src/runtimes/node/utils/node_runtime.ts) · [esbuild target](https://github.com/netlify/build/blob/5fe77df7b4aed960ac5a29358d46f50600721d84/packages/zip-it-and-ship-it/src/runtimes/node/bundlers/esbuild/bundler_target.ts)

## 3. 变量元数据：不能先取值再过滤

本轮重新阅读公开 Netlify OpenAPI `getEnvVars` / `getSiteEnvVars`：参数可筛 context、scope、site，返回 `envVar[]`；其中 `values` 指向含未加密 `value` 的 `envVarValue`。所列合同没有纯元数据投影参数。**未发现可保证“从未取回值”的公开列表合同，不等于断言平台绝无其他方法。** 不调用真实环境的 `env:list`、环境变量 GET、完整站点响应，或“先 GET 再 Select/jq 遮盖”的流程；这些流程不能满足本轮不读取值的边界。 [当前公开 OpenAPI](https://raw.githubusercontent.com/netlify/open-api/master/swagger.yml) · [上轮固定 OpenAPI 快照](https://github.com/netlify/open-api/blob/96b688490fa406c71e4453e041ec5a0587d35f0b/swagger.yml)

Netlify 默认变量可覆盖所有 context/scope；site 对 shared 的覆盖仅发生在它实际定义的 context/scope，分支值也可影响 Deploy Preview。**`Runtime` scope 用于表单/签名代理，不是 Functions scope**。Functions 变量须在平台设置并包含 Functions scope，`netlify.toml` 变量不直接注入 Functions；变更值须新部署才能用于该部署。Secrets Controller 只保护被标 secret 的值，`dev` 值仍可读。 [context/scope 与覆盖](https://docs.netlify.com/build/environment-variables/overview/) · [Functions 可见性与部署快照](https://docs.netlify.com/build/functions/environment-variables/) · [Secrets Controller 的 dev 例外](https://docs.netlify.com/build/environment-variables/secrets-controller/)

由有权管理员按其现有权限提供**已隔离值的字段清单或签名审核表**；若无法保证元数据获取不超出其授权，先由平台支持确认方法。本轮只接收以下列，不请求原始响应、`.env` 导出或包含隐藏值的截图：

- `key`、是否存在、context（含 all / production / deploy-preview / branch-deploy / branch 与分支参数 / dev / dev-server）、scope、site/shared 来源及来源资源 ID、来源配置修订、secret 标记、更新时间、证据编号、审批责任人。
- 对每个 context × scope × key 给出**最终生效来源及回落路径**，包括缺失 site/branch 值时是否继承 shared/all；不能只列“preview 有独立 key”。核对历史 `DATABASE_URL`、DB/storage/session 凭据 key、旧部署快照、集成/插件自动注入、构建来源与构建过程的注入。
- 对 `NEXT_PUBLIC_*`、HTML/JS 静态产物及日志提供“未含 DB/storage/session 秘密”的管理员检查结论，不提供被检查的秘密原值。构建能取得的生产凭据也必须纳入隔离边界，不能只审 Functions。
- 普通 metadata 表不填 URL/DSN/token、变量值或它们的散列；指纹指**资源身份指纹/审批登记 ID**，不以秘密字符串散列充当隔离证明。不要导出角色密码散列、成员记录或对象正文。

## 4. TEST / PROD 资源和权限的操作员证据表

下表为本项目验收条件；供应商、资源与实际权限目前未知。PostgreSQL 对象所有权、PUBLIC、继承和 grant option 可影响有效权限；列/序列/函数等须分别审查，名称中含 `reader` 不构成只读证明。 [PostgreSQL 17 权限合同](https://www.postgresql.org/docs/17/ddl-priv.html)

| 环境 | 数据库要求 | 存储要求 | 当前状态 |
| --- | --- | --- | --- |
| production | 管理员批准的独立资源、公开内容只读角色与管理角色分离；正式会话另审 | 独立生产 bucket/store、主体和有效授权 | 未接入。仅接收管理员既有证据；正式会话、头像/心跳/名单和旧写入口不开放。 |
| deploy-preview | 批准的合成 TEST 资源与 TEST reader；预览主体不得认证/继承/切换到 PROD 权限 | 独立 TEST 资源；不得继承生产 site-wide store 权限 | 未核验。禁止凭分支名、不同 URL 或本地 canary 宣称隔离。 |
| branch-deploy | 与 TEST 同标准，另逐分支核 context、覆盖和回落 | 分支源和主体限定 TEST | 未核验。缺值/错 context 不准回落生产。 |
| local | 本轮仍仅原授权的 127.0.0.1:55433 合成 PG；此前证据不能代替托管 TEST | 本机状态不能证明云存储隔离 | 本报告没有新增连接或测试；本地结果由对应验证报告提供。 |

| 证据编号 | 管理员提供的非秘密记录 | 明确通过条件 |
| --- | --- | --- |
| ENV-1 绑定 | TEST 与 PROD 的提供方、账号/项目 ID、集群/实例/branch/数据库 ID、引擎版本、环境登记号、资源指纹、部署 SHA/context 到资源绑定 | 控制面与实际数据库只读身份结果交叉一致；别名、pooler、URL 差异或同库 canary 不替代资源/权限边界。 |
| ENV-2 有效角色 | 各运行角色/管理角色名称、属性、直接/间接 membership、继承和 SET ROLE 路径、所有者、PUBLIC、默认授权、schema/table/column/view/materialized-view/foreign-table/sequence/function ACL、RLS 与运维权限摘要 | public reader 仅四张获批普通表 SELECT；无额外写权限、对象/函数所有权、高权继承、schema CREATE、危险 definer/EXECUTE 或 MAINTAIN。按实际 PG 版本复核。 |
| ENV-3 间接路径 | 可更新视图、分区/表继承、规则/触发器、跨 schema FK 动作、SECURITY DEFINER 与 search_path、扩展/外表/外连能力、网络/TLS/连接策略摘要 | 直接 ACL 扫描未覆盖的路径有独立证明；TEST principal 在 PROD 无认证/继承/可切换权限/网络连接路径；不依赖应用 guard 作为隔离证书。 |
| ENV-4 存储 | TEST/PROD 供应商、区域、账号项目、bucket/store/deploy ID、所有者、访问主体、context 绑定；有效 list/read/write/delete/管理授权，公开访问与签名 URL 策略、日志/保留摘要 | TEST 主体不能触达生产对象；前缀或命名空间须有服务端强制授权边界。跨部署共享需求单独审核。 |
| ENV-5 备份恢复 | 两环境各自的备份类型、周期/保留与可恢复点、备份及恢复目标资源 ID、权限分离、最近成功时间、隔离恢复演练编号、聚合校验、RPO/RTO、负责人及日期 | 有可用恢复证据；恢复在批准的隔离目标，不能覆盖生产。TEST 可重建/清理；PROD 仅接收管理员既有记录，不为本报告执行操作。 |
| ENV-6 追溯与变更 | 上述每项的证据日期、配置修订、SHA/deploy/resource/role ID、审阅者及结论，旧部署/旧授权处理记录 | SHA、资源/角色授权、context/scope/shared 来源、snippet 或路由变更后重审；回滚不重开旧越权入口。 |

Netlify Blobs `getStore` 是 site-wide，跨新部署持续存在且可由所有 deploy context 使用；`getDeployStore` 按 deploy 命名空间划分，并非独立访问主体或长期存储隔离证书。若不能证明同站点预览无法获得生产 store 权限，应使用独立站点/资源/主体边界并由管理员审核，不能只换 store 名称。 [Netlify Blobs 范围与访问合同](https://docs.netlify.com/build/data-and-storage/netlify-blobs/#getstore)

备份策略须对应提供方实际启用能力与可恢复范围，不把“开启备份”当作已完成恢复演练；PostgreSQL 区分 SQL dump、文件级备份与连续归档/PITR，操作员须说明采用哪一种及其恢复限制。 [PostgreSQL 备份与恢复](https://www.postgresql.org/docs/17/backup.html)

未来若另获 TEST 调用授权，依 `TEST_GATE.md` 在**批准 TEST 副本与实际最小权限角色**验证正向只读及缺变量/错 context/错资源指纹/额外 ACL 等负例，并在 TEST 一次性合成对象上验证存储；保留预期/实际、请求编号和数据未变的聚合证明。PROD 隔离拒绝只采用管理员控制面/有效授权/既有拒绝记录或另行明确批准的非写入核验，**不向 PROD 发探测请求，不以生产 DML 证明拒绝**。

## 5. Headers / CSP：控制面元数据与实际 HTTP 都要有

本工作树静态配置观察：`output: 'export'`、`trailingSlash: true`、`images.unoptimized: true`、构建显式 `--webpack`；CSP 由 `scripts/generate-export-csp.cjs` 在 `postbuild` 扫最终 HTML 的内联脚本，写入 `out/_headers` 和 `csp-manifest.json`，TOML 没有第二份 CSP。采集时本机 manifest 为 **7 页、991 bytes policy**；该数字只是当时本机产物观察，后续最终 SHA/部署须重新取证。生成器的 8000-byte 拒绝阈值是本项目约束，本文不把它描述为 Netlify 平台上限。

Netlify `_headers` / TOML 自定义头仅作用于其静态 backing store；**Functions、Edge Functions、代理响应须自己返回必需头**，所以 TOML 的 `/.netlify/functions/*` 匹配项不能证明 API 已有 no-store/CORS 等头。默认 header 规则跨 context。 [Netlify headers 的适用边界](https://docs.netlify.com/manage/routing/headers/#limitations)

`skip_processing=true` 不能独立证明部署后 HTML 未被修改。官方 snippet injection 在**页面送出时**插入，保存后立即生效而无需重新部署；它可读取允许 Post processing scope 的变量。因此即便 deploy/SHA 不变，站点 snippet/后处理配置仍会改变验收对象。 [Netlify snippet injection](https://docs.netlify.com/build/post-processing/snippet-injection/) · [后处理功能](https://docs.netlify.com/build/post-processing/overview/)

| 证据编号 | 非秘密证据 | 通过条件 |
| --- | --- | --- |
| HTTP-1 配置元数据 | 同一 site/deploy/context/SHA 的有效 publish/重定向/header 配置摘要、build plugin/Next adapter/Edge/代理/CDN 清单、post-processing/prerender/snippet 启用状态、配置 ID/修订/更新时间/责任人 | 摘要只含标识与布尔/状态，不含 env values、snippet 正文或控制面完整响应。`skip_processing` 与所有独立改写来源逐项核对。 |
| HTTP-2 最终字节 | 获批 TEST 部署各页面/404 的 GET 状态与重定向链、最终 HTML 的 SHA-256、内联脚本 hash 集、资源/manifest 摘要、响应 CSP 的完整公开策略或摘要及字节数、采集时间与 request ID | 从真实部署 URL 与适用域名获取，比较内容编码解码后的 HTML/脚本；完整静态字节与批准产物一致，或每项改写已审阅并重建 CSP；所有内联执行脚本由实际 enforcement CSP 覆盖。 |
| HTTP-3 CSP 生效 | 浏览器控制台/网络/CSP violation 聚合、hydration/懒加载/路由交互结果、页面与未知路由/404 的 enforcement header | 不能只检查 Report-Only 或本机预览。CSP 没有被重复/冲突 header 或代理替换；script-src 不含 unsafe-inline/unsafe-eval，script-src-attr none，object-src none，frame-ancestors none，外部脚本/连接与业务批准一致。保留现有样式 inline 例外的审阅记录。 |
| HTTP-4 静态路由 | 根页、已导出路径、trailing slash、直接深链、404、JS/CSS/图片的状态、MIME、缓存/安全头与请求编号 | 真 404，文件 shadowing 符合导出；不能把首页重写或 200 HTML 错当资源成功。HTML/错误页/缓存后访问均核实际头。 |
| HTTP-5 API | 每个实际部署 Function 的 GET/OPTIONS/允许方法与拒绝方法的状态、Content-Type、Cache-Control、CORS、错误体形状和平台请求编号；Set-Cookie 只记录属性，不记录值 | 函数自身返回所需头，成功与拒绝/错误路径都符合既定策略；旧写/云 session 拒绝不变；无秘密、账号资料、堆栈或配置回显。 |
| HTTP-6 复核 | deployment permalink 与批准 preview/branch/custom-domain 各路径的结果、CDN/cache/代理/配置修订与采集时间 | 不是用相同 SHA 的本机 HTTP 结果替代真实平台。snippet、代理或 header 配置变更会使先前证据失效。 |

上表是**待授权后的操作员清单**；本轮没有请求真实站点、API 或域名，也没有接受任何 TEST/PROD 验收为已通过。

## 6. 明确阻断项与解除条件

| 阻断 | 本轮状态 | 解除所需的具体证据 |
| --- | --- | --- |
| P-1 实际平台构建/运行未知 | 本机配置和公开支持合同已核对；真实部署、bundler 和 Functions runtime 未核验 | 同一最终 SHA/deploy 的完整构建身份、精确版本、平台产物与 Node 24 实际调用记录。 |
| P-2 变量来源/继承未知 | 公开 GET 合同会返回含值结构；未调用真实环境 API/CLI，也无管理员元数据表 | 每 context × scope 的 key 来源/回落、site/shared/branch/插件/历史部署证据，且过程符合不取值的权限边界。 |
| P-3 TEST/PROD DB 隔离未知 | 无实际资源、身份、有效 ACL/间接依赖与网络证据 | ENV-1/2/3；本地合成测试、角色名字及配置开关不能替代。 |
| P-4 TEST/PROD 存储隔离未知 | 无 bucket/store/principal/有效授权/保留日志证据 | ENV-4；明确排除预览继承生产 site-wide store 的路径。 |
| P-5 可恢复性未知 | 两环境备份/可恢复点/隔离恢复演练未交付 | ENV-5；生产只接收管理员既有记录，不自行操作。 |
| P-6 部署后 HTTP/CSP 未核验 | 只有本机生成器/配置观察，真实 snippet/header/CDN/函数响应未知 | HTTP-1 至 HTTP-6，同一批准 SHA 和当时控制面修订，保留浏览器 hydration 与 CSP 证据。 |
| P-7 TEST 云操作尚未授权 | 仅公开研究和本机既定范围 | 明确的 TEST 资源、主体、允许接口/方法、证据采集范围与负责人授权；在此之前只整理证据，不部署或连接。 |

以上任一项缺失即保持相应云门槛。公开支持/公告核对通过只允许继续本机候选验证，**不批准真实 TEST/PROD 联调、数据库写入、存储上传或上线**。本报告未宣称这些阻断已解除。
