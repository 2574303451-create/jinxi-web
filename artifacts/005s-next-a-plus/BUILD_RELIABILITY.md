# A+｜档案 prebuild 与 Node20 验证

基线：`04ca4ef972636ef7ac8169d80db2dbf4af9d8b00`。未改 Netlify Node/npm 版本、Next.js、package.json 或 package-lock.json。

## 已复现的问题

原脚本直接使用 `git log -1 --format=%cI -- config/guild-terminal.config.json`。真实 depth=1 克隆测试中，Git 将合成克隆边界 `2026-11-05T00:00:00Z` 作为结果，原脚本成功生成了错误更新时间；源文件实际最后提交时间为 `2026-03-01T21:50:37+08:00`。无 Git 元数据时原脚本 exit 1。原始输出和对照见 `ci-shallow-old-generator.txt`、`ci-no-git-old-generator.txt`、`ci-results.json`。

## 修正

新增 `config/guild-archive-source.json`，记录源路径、LF归一化 SHA-256 和从完整历史核实的时间。每次构建先比对文件哈希；完整历史额外核对真实 Git 时间。浅克隆、源代码压缩包、Git 不可执行时使用同一已提交的哈希绑定记录。缺失或不匹配时明确失败；不使用构建时间、mtime、浅克隆边界或空字符串代替。

档案 ID 重复检查、日期检查、208/1/207 计数规则未删减。生成的 `lib/guild-home-facts.json` 与基线内容完全一致，没有成员档案或历史数据修改。

维护档案时：先提交经过审核的档案修改，在完整历史中取得该文件最后提交 `%cI`，重新计算 LF 归一化 SHA-256，再更新来源记录并构建。不要为通过构建手填“现在”的时间；未审核的来源变化应保持失败。

## 实际受控环境

- 本地 Windows，便携 Node **20.20.2** / npm **10.8.2**。不是 Netlify Linux 容器或线上构建。
- 官方下载 `https://nodejs.org/dist/v20.20.2/node-v20.20.2-win-x64.zip`；SHA-256：`dc3700fdd57a63eedb8fd7e3c7baaa32e6a740a1b904167ff4204bc68ed8bf77`，与官方 SHASUMS 文件核对。
- 独立 Git 克隆，没有复制 `.env`、账号或数据库连接。子进程使用受限环境、独立 npm 配置和缓存，`NODE_ENV=production`。
- 真实执行现有 Netlify 命令对应的 `npm ci` 和 `npm run build`；不是仅运行脚本或复用主项目 node_modules。
- `npm ci` 安装288项生产依赖，prebuild 的 TypeScript 依赖可用，静态导出成功。另行 include-dev 安装/构建也通过；未将它改为项目要求。
- 最新 Hero/CSS 再同步到该克隆并构建成功，见 `ci-final-build.txt`。锁文件 SHA-256 始终为 `41fae14ffa79f6f0ae9c22617e8f827eb8a9e882aa67565d6a1aaa891d7142f7`。

| 情况 | 原脚本 | 新脚本 |
| --- | --- | --- |
| 正常完整克隆 | 可用 | Git时间核对通过 |
| 真实depth=1克隆 | 错用边界时间，exit0 | 保留已核实时间，JSON与完整历史相同 |
| 无.git | exit1 | 哈希绑定降级，JSON相同 |
| Git可执行文件不可用 | 未单独运行原版 | 哈希绑定降级，exit0 |
| 连续生成两次 | — | 输出哈希稳定 |
| 来源哈希不匹配 | 无此保护 | exit1，预期拒绝 |

完整命令、退出码和耗时见 `ci-check.cjs`、`ci-results.json` 及 `ci-*.txt`。合成克隆边界仅用于测试 Git 行为，不是公会历史事件。没有数据库/SQL执行或生产写入。

## 工程检查边界

主工作区 `npm run build` 成功；独立 TypeScript **28→28**，按完整文件/错误码/诊断文本比较，新增0、消失0，只忽略行列位置。见 `type-comparison.json` 和原始日志。

当前及固定基线的 `npm run lint` 均进入缺失ESLint配置的初始化询问并退出1；`npm run test:api` 均因 `test-api.js` 不存在而退出1。两项均未通过，没有补造测试命令或将构建跳过类型/Lint表述为通过。
