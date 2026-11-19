# 第四阶段第三工作包 · 独立合成云端 TEST

本目录为未来独立 TEST 提供一个可构建的静态站和一个 Netlify Functions v2 入口。两条页面路由复用已验收的 React 组件、统一会话和业务面板。站点只带合成素材，测试数据库由空 PostgreSQL 初始化。五组处理器、原账本和回执算法沿用第二工作包；本包只补部署和数据库准备。基准为 `f7aa0fac2c117f122d98320255230ce8fec546f7`，对应 [已完成的基准 CI](https://github.com/2574303451-create/jinxi-web/actions/runs/42736079671)。

| 路径 | 用途 |
| --- | --- |
| `synthetic-cloud/netlify.toml`、`build.cjs` | 仅由新站 Package directory 选择，校验构建身份、导出静态页面并生成服务端入口 |
| `function/jinxi-service.mjs`、`entry.cjs`、`binding.cjs` | 精确路由、构建证明、逐请求 Netlify Context 和资源校验 |
| `database/initialize.cjs`、`guard.cjs`、`seed.cjs` | 事务初始化、结构及权限指纹、合成数据、受控角色激活及回滚 |
| `database/admin.cjs`、`admin-approval.disabled.json`、`metadata.sql` | 后续私有管理入口、默认关闭的独立批准和只读预检 |
| `site/` | 独立静态入口。复用攻略中心、留言墙、导航、会话 Provider 和积分、公告、赞助及组队面板 |
| `tests/synthetic-cloud-*` | 环境门禁、临时数据库、离线 ZIP、HTTPS、Edge 验收 |

## 构建与请求

新站构建证明只包含非密钥配置。Netlify 构建时比对官方构建变量、Git HEAD 和干净工作树。候选分支、仓库地址、团队和站点、唯一部署 ID、源提交、HTTPS 域名、有效期必须一致。仅新站自身的 `production` Context 可通过。PR、其他分支、Preview Server、Build Hook 和两个原站明确拒绝。Function 每次核对已发布 deploy、Context、站点、团队及请求 origin。Netlify Functions 运行时仅用平台保证的 `SITE_ID`、`URL`，用受审构建证明补足 commit/branch/deploy，运行时如果另有相冲突的值也拒绝。[构建变量](https://docs.netlify.com/build/configure-builds/environment-variables/) · [Functions 变量](https://docs.netlify.com/build/functions/environment-variables/) · [Context](https://docs.netlify.com/build/functions/api/)

只开放同源 `GET/POST /api/{member,community,attendance,points,operations}`。旧组件需要的 5 条公开读取路径由同一 Function 投影，忽略用户身份，POST 直接拒绝。启动先实际以五个最小角色登录，检查 TLS、库物理指纹、授权 UUID、地址及 schema 指纹；使用已审的成员、内容和账本处理器。启动后每次实际服务连接再核验部署的数据库身份、结构和角色。会话、CSRF、写事务和回执由原处理器校验。密钥或资源失败只返回安全错误，API 响应 `no-store, private`。

Next 16.4.5 的 `output: 'export'` 把网页导出为静态文件。数据请求由独立 Function 提供。该目录的静态构建不导入旧首页内嵌的真实档案、不复制全站 public 和历史 SQL，单独生成同源 CSP。Functions 产物及私有运行配置位于发布目录之外。[Next 静态导出](https://nextjs.org/docs/app/guides/static-exports) · [Netlify 包目录](https://docs.netlify.com/build/configure-builds/monorepos/)

原根目录 `netlify.toml`、`netlify/functions`、正式页面、旧写入口、F03/F05 的 SQL 和 GitHub Actions 沿用基准。UI-DEFER-001、UI-DEFER-002 继续留在后续验收。

## 数据库权限

迁移主体只用于目标空库的初始化、校验和冻结。服务角色初始 `NOLOGIN`，不拥有对象、不继承角色、无管理属性、无 DDL/TEMP，连接数每角色最多 4。所有者角色单独 `NOLOGIN`，只授权初始化主体管理。本地预演的服务角色只能连接业务库。核查所有可连接库，包括 `postgres` 和 `template1`。真实 Neon 必须验证五个角色在该独立项目内的连接权限。若平台无法限制其他库，请停在能力核验。

| 服务角色 | 获准范围 |
| --- | --- |
| `jinxi_member_session` | 成员身份映射读取，密码指定列更新，会话和限流必要读写 |
| `jinxi_community_app` | 验证会话、留言攻略本人或公开范围、审核与互动的受限列 |
| `jinxi_attendance_app` | 本人签到事实、事件和幂等记录的必要读写，不改日期和奖励 |
| `jinxi_points_app` | 签到事件受限读、账户与追加流水、规则、订单、库存和回执的限定操作 |
| `jinxi_operations_app` | 公告、合成赞助及组队所需权限，审核或管理员权限由可信会话判定 |

初始化读取七个哈希固定的已有 SQL 文件，保留约束、RLS、索引和授权。它替换本机目标门禁、库名、环境分类和新所有者的管理授权。目标专用的保护在同一事务中运行。建表、角色或后续约束失败全部回滚。空库默认 ACL 可以为空。存在 Neon 模板时，只接受 `cloud_admin` 在 `public` 向 `neon_superuser` 可转授的 PostgreSQL 17 表权限集合（8 项）及序列权限集合（3 项）。F03/F05 的 6 项表权限记录对应旧只读环境，并由旧门禁沿用。结构指纹覆盖对象、定义、索引、RLS、列级 ACL 和角色参数。核对本地指纹时考虑 PostgreSQL 小版本和托管 ACL 差异。真实权限或结构与新门禁不符即停止。 [Neon 默认授权源码](https://github.com/neondatabase/neon/blob/main/compute_tools/src/sql/default_grants.sql#L19-L26)

真实云端管理写入在本提交中为禁用状态。未来有批准后才可登记非密钥目标。空库初始化、种子、角色激活、冻结及空模型回滚用同一事务级锁串行处理。完成激活之前必须确认日志策略和 SCRAM。冻结可在原批准到期后执行，仍逐项核对原批准目标和登记身份。先停止新请求，再清除这五个运行角色的登录与密码，已有连接需要另行排空。已写入的合成事实、回执和账本随故障保留。严格空模型回滚只撤销新库的空表、函数和角色，有意外对象、依赖、结构变化、活动连接或业务行就停止。

## 本机复现

`B2 security checks` 在干净检出中运行合成会话、历史兼容、Edge 门禁和 Gate-only 测试。文件清单测试使用锁文件安装的 Netlify CLI 23.2.1，核对零公开文件和 Edge 收集路径。正式构建后，CI 扫描真实静态产物，核对其中没有合成业务入口或恢复代码。CLI 23.15.1 的试点打包检查、完整合成 PostgreSQL、HTTPS、浏览器流程及真实 Netlify CDN 验收仍需按各自的操作说明执行。

在本分支的干净工作树运行。需要锁文件中的 Node 24.22.2/npm 11.19.1 依赖、本机 PostgreSQL 17.11 bin、OpenSSL、Windows Edge、Playwright。预演只启动随机临时目录下的 PostgreSQL `127.0.0.1:5432`，端口已占用时应先查清归属。测试命令不会接管现有监听者。用明确的工具路径替换占位文字。

```powershell
node --test tests/synthetic-cloud-boundary.test.cjs
node tests/synthetic-cloud-database.test.cjs --pg-bin '<PG bin 路径>' --openssl '<openssl.exe 路径>'
node tests/synthetic-cloud-https.test.cjs --pg-bin '<PG bin 路径>' --openssl '<openssl.exe 路径>'
node tests/synthetic-cloud-browser.cjs --pg-bin '<PG bin 路径>' --openssl '<openssl.exe 路径>' --playwright-module '<Playwright 目录>' --edge '<msedge.exe 路径>'
```

后三条依次运行。HTTPS 验收用已安装的 Netlify 配置解析器和 ZIP 打包器，将 ZIP 解包，在本机 HTTPS 服务器调用实际打包的 Fetch 入口。其 Netlify Context 和 DNS 映射由本机夹具提供，数据库权限、Cookie、TLS 验证和事务均实际执行。Edge 在运行期间信任一张随机生成且限定域名和环回地址的临时 CA，签名私钥在导入前已销毁，退出会按指纹从当前用户根证书库移除。运行时全局 TLS 校验保持开启。中断时可根据被忽略的 `artifacts/phase4-synthetic-cloud/local/browser-ca.public.cer` 找到这一次的公开证书，按该证书指纹检查或移除残留信任。

`scripts/run-clean.cjs run build` 是正式导出回归命令。它会重生成现有 `lib/guild-home-facts.json`。正式导出与合成预演不要并行运行。如果出现只有换行符的脏工作区，先用 Git 比较该文件内容，再恢复这个生成文件，不要恢复用户修改。

Windows 根证书导入不可用时，可以在同一套浏览器测试末尾使用 `--firefox`（替代 `--edge '<msedge.exe 路径>'`）。使用同版本 Playwright 安装其 Firefox 构建。测试先以默认验证访问本机 HTTPS 并断言拒绝未知颁发者，再仅为一个临时 Firefox 进程配置本次预演的 CA。证书链、域名和 TLS 版本照常检查，浏览器关闭后清除临时配置。此结果记录为 Firefox，不计入 Edge 的复测结果。

[管理员执行清单](ADMIN_RUNBOOK.md) 说明下一次明确授权之后的操作、报价依据和真实平台需补验事项。本轮只验收本机。
