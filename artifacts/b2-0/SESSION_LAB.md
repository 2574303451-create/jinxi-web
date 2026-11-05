# 检查点3：本机可信会话与积分安全原型

基线：检查点2 `d516b8643c73797ddfbd8109d46a7dba58f6016c` / 草稿PR11。B1仍为PR8 / `115bf854a7977a3e582a89af13459115178a1e31`。本PR继承PR9缩略图补丁、PR10全部旧写阻断和PR11整改方案，不从main重做功能。

本原型仅使用 `127.0.0.1:55433/jinxi_005s_b1_test` 的 `b2_lab` 合成账号。没有连接生产或读取生产密钥，没有正式成员会话、生产迁移、头像上传、在线心跳或名单。**本机测试通过不能解除云隔离、真实表结构、HTML/CSP和运行时升级的阻断。B2-A正式安全验收尚未完成，B2-B/C不启动。**

## 改动与信任边界

| 文件/组 | 原因与行为 |
| --- | --- |
| `netlify/functions/_shared/session-lab.js`、`session-lab.js` | 独立实验Function，拒绝所有云context；校验实际库指纹/角色后使用事务；主体只能来自有效会话 |
| `_shared/password.js` | 异步PBKDF2-SHA256、600k、独立盐、常数时间摘要比较；严格有界解析，合成200k旧格式补足工作量测试；未读取真实hash |
| `_shared/function-security.js` | 复查发现仅表级权限不足；补查列级INSERT/UPDATE/REFERENCES、可写视图/外表、序列USAGE/UPDATE及函数所有权，防止角色误判 |
| `tests/support/session-fixtures.cjs` | 先核对授权库，NOLOGIN owner建b2_lab；只有两份明确synthetic账号；无历史示例schema导入 |
| `app/session-lab/*` | 单独路由演示登录、恢复、改密、退出、服务器积分及本机草稿；首页没有新增入口或预取 |
| `tests/*security*`、`session-postgres.test.cjs` | Cookie/CSRF/身份/撤销/锁定/过期/限流及真实事务攻击回归 |
| `eslint.config.mjs`、package/lock、`scripts/check-types.cjs`、TS基线、workflow | 独立非交互检查与Node20/24的临时PG CI；完整保留28项原始诊断，不关闭新错误 |
| `tests/support/b2-postgres.cjs`、`scripts/ci-postgres.cjs` | GitHub临时服务使用loopback转发55433、独立随机运行角色；仅固定合成CI标识生效，不从环境选择任意库 |
| `tests/support/postgres.cjs` | 原夹具drop/recreate会丢失B2 reader的SELECT；只恢复存在的专用合成reader权限，测试不放宽 |
| `components/marquee-3d.tsx`、`scripts/import_accounts_to_db.js` | 移除过时eslint-disable注释，无行为变化；导入脚本没有执行 |
| `lib/avatar-crop.ts` | Promise执行器改为块体，保持toBlob参数、WebP0.82、尺寸和40KiB检查；原框像素回归8组通过 |

原13入口风险和环境矩阵见[全部入口审计](ENVIRONMENT_AND_ENDPOINTS.md)。新增第14个Function `session-lab` 属P1实验面：云端固定503；本机必须具备明确合成配置、实际权限证明和HTTPS Origin。旧points/checkin/auth接口仍关闭；没有将实验接口偷偷替换到旧生产页面。

## API契约

实际地址为 `/.netlify/functions/session-lab`，不是假定天然存在的嵌套路由。所有响应 `Cache-Control: no-store`，无跨域授权；错误不含SQL、stack、连接、账号存在性或原始密钥。

| 请求 | 最小输入 | 权限/输出 |
| --- | --- | --- |
| GET `?op=me` | HttpOnly Cookie | 公开UUID、合成昵称、首次改密标志、内存CSRF；无账号/工号/会话ID |
| POST login | `op, account, password` | 仅b2-lab-a/b；随机32字节不透明令牌Cookie；未知/错密/锁定/停用统一401 |
| POST change-password | `op,currentPassword,newPassword` + CSRF | 校验旧密码，更新版本、撤销所有设备、清Cookie；必须重新登录 |
| POST logout | `op` + CSRF | 撤销当前设备会话、清Cookie；其他设备不误删 |
| GET `?op=points` | Cookie | 当前服务器主体余额；首次改密时拒绝；失败不伪造0 |
| POST claim-checkin | `op` + CSRF | 服务器UTC日与只读规则表的10分；同日/多设备/并发只记一次 |
| POST redeem | `op,itemCode,requestId(UUID)` + CSRF | 只读商品表7分；锁钱包、幂等流水及余额CHECK原子提交 |

POST仅JSON、4KiB、字段白名单、精确HTTPS Origin、非cross-site Fetch Metadata和绑定会话的CSRF。客户端 `memberId/userId/accountId/employeeNo/pointDelta/pointCost/price/reward` 全拒绝；GET额外查询字段拒绝。首次改密只允许me、改密、退出。无任务自报奖励、真实商品或管理员写接口。

Cookie为 `__Host-jinxi_session_lab`、HttpOnly、Secure、SameSite=Lax、Path=/、无Domain。DB只存token/CSRF摘要；CSRF由服务端密钥与token派生，供同Cookie标签共享，仅浏览器内存。7天绝对/30分钟空闲、最多5设备是实验参数；正式期限待审。会话维护不是在线心跳，不用于统计。

每次检查account锁定、profile有效及synthetic来源、auth_version、撤销和两种过期。锁定/停用触发器永久撤销旧会话，恢复账号不会复活旧Cookie。改密撤销所有设备；退出当前设备；同设备标签共享Cookie，下次服务端核验即发现退出。页面重新聚焦/重连时核验，无周期心跳。未实现跨标签即时广播；不把本地展示当授权。

限流使用数据库原子持久桶：120次/分钟/IP、登录5次/15分钟/IP及规范化账号摘要、改密5次/15分钟/IP。账号桶生成不依赖账号是否存在；客户端转发头不决定地址。桶单独提交，业务失败不能撤销计数；原始IP不入日志或桶。实验Netlify wrapper默认将无法证明的地址合并为一个桶，不信任XFF；正式平台地址来源和分布式反滥用仍待托管验证。

兑换先查收据，再读规则/商品，商品下架也可恢复既有收据；同key不同SKU409。余额安全整数检查避免BIGINT转JS时静默舍入。前端在当前页面内保留失败兑换nonce，丢失成功响应后重试不重复扣款；刷新后nonce不持久化是原型限制，正式兑换应有服务器订单/收据恢复流程。草稿单独存本机，退出/过期保留；不存密码、Cookie、CSRF。保留草稿不代表自动上传或跨账号认领。

## 实际验证与复现

先读[环境说明](ENVIRONMENT_AND_ENDPOINTS.md)。`test:integration` 会重建**专用合成库**的攻略夹具并重置b2_lab账号/会话/积分，禁止对其他库执行，禁止并发运行重置脚本。运行时凭据只在系统TEMP；不要复制、打印或提交。历史生产导入脚本与示例INSERT未执行。

- `npm run test`：API14、安全6，共20项（runner计数含父项）；含类型检查反例，新增/全局TS错误及编译器失败不会绿。
- `npm run test:integration`：真实原生PG44项，覆盖实际身份与错误权限、读写隔离、并发签到/兑换、余额不负、错误回滚、幂等重试、跨账号及同昵称不同ID、错CSRF、退出/改密/锁定/停用/过期、持久限流。`checkpoint3/integration-final.txt`。
- 新授权遗漏先红：`effective-grants-before.txt` 的列级UPDATE没有被拒绝；修复后列、视图、序列均由实际PG证明拒绝。最终元数据在 `checkpoint3/database-proof.json`，没有密码/hash/会话值。
- `checkpoint3/session-browser.cjs`：真实Edge + 本机自签HTTPS + 真实受限PG，7组通过。320/390/768/1440布局、真实Tab/3px焦点/reduced-motion、Cookie脚本不可读、旧localStorage不认证、刷新恢复、首次改密、双标签/双设备、退出/过期/断网草稿、丢响应兑换重试均通过。截图明确为合成。自动语义/键盘检查不冒充人工屏幕阅读器验收。
- `prepare-build.cjs`：只复制允许的源码/公共资源，不含.env/.git/运行凭据；全新目录npm ci成功，Node20 build成功，新增路由独立92.5kB First Load，首页仍173kB。源文件hash清单绑定构建输入。当前tsc仍28项/exit2，详见工程报告。
- 既有保护回归：B1五宽度26、成员/画廊8、头像原框8、留言入口/边界17、展播/时光/暂停/reduced-motion50。UI夹具写操作被拦截，不是恢复旧接口生产写入。新证据在 `checkpoint3/protected/`。

保留原失败日志：首次干净复制遗漏Functions目录，已修复制白名单；B1夹具重建丢B2只读授权，已修夹具；多设备过期用例在重新聚焦自动核验后旧按钮已消失，改为真实刷新核验过期与草稿，未放宽产品状态断言。运行器还曾将4张截图写回旧目录，已另存新截图并按原Git blob逐字节恢复，`historical-evidence-restoration.json`记录；历史B1目录最终无Git差异。修正运行器证据路径，无删除历史证据。

## 停止点与回滚

云变量context/scope/shared继承、真实TEST凭据在PROD的拒绝、实际正式account/profile schema仍未知；当前只是本机同实例保护canary，不能声称已验证真实生产隔离。HTML/CSP、Next14/Node20生命周期、28项TS和托管会话适配见[工程与集成报告](ENGINEERING_AND_INTEGRATION.md)。正式会话不启用，首页在线继续—。

回滚实验：撤回本检查点新路由和session-lab Function，保留PR10关闭旧越权入口与加强后的权限证明；停止自己的3048/3049进程。合成schema/角色可以保留，删除需再次核实具体实例和owner，不执行整库DROP或历史迁移。无需生产数据回滚，因为没有生产操作。B2-C+只留[后续计划](B2C_PLUS_PLAN.md)，当前没有名单API/隐私开关/抽屉/绿色在线数据。
