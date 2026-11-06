# B2-A-5 云 TEST 联调门槛

本机 PostgreSQL 仅验证合成资源和代码行为。托管 TEST 尚未授权，也没有收到站点配置、数据库资源或存储的验收记录。云读接口保持现有隔离门槛，旧写入口继续关闭。审批字段只记录已完成的独立验收。

| 管理面 | 所需无密钥证据 | 通过条件 |
| --- | --- | --- |
| Netlify 站点 | 站点 ID、项目代号、部署 ID、完整 Git SHA、分支、实际部署上下文、Functions 运行时 | 核对 production、deploy-preview、branch-deploy 及 local。构建 Node 与 Functions 版本分栏记录 |
| Netlify 变量 | key、context、scope、shared/site/branch/代码/构建来源和覆盖顺序、采集时间、审批记录号 | 记录最终来源及是否存在，遮盖所有值。核查分支缺值的回落路径和 Functions 可见性，包括旧 DATABASE_URL |
| TEST 数据库 | 提供方项目、实例、分支和数据库资源 ID、PG 版本、独立注册号、指纹、网络边界、运行角色和对象所有者 | 由实际数据库、角色和托管资源记录交叉核对独立边界 |
| PROD 数据库 | 资源 ID、运行角色、管理角色和连接策略的脱敏权限摘要 | 由生产管理员提供既有权限证据。预览凭据在生产侧无认证、角色继承或连接路径 |
| 数据库有效权限 | 表、列、序列、schema、默认授权及 PUBLIC、角色继承、所有者、RLS、函数 EXECUTE、运维权限及 SET ROLE | 追踪可更新视图、物化视图、触发器/规则、分区/继承、跨 schema FK 动作、definer、扩展/外表依赖及外连能力 |
| 存储 | 供应商及 bucket/store ID、所有者、授权主体、context 绑定、读写删列 ACL、日志与保留策略 | TEST 与 PROD 主体及资源隔离。需跨部署共享 store 时先证明授权边界。头像上传继续关闭 |
| 备份与恢复 | 两环境的备份/保留窗口、可恢复点时间、隔离恢复演练编号、RPO/RTO、负责人、聚合结果 | TEST 可重建可清理。生产记录由管理员提供，审核材料不含账号资料或密码散列 |

管理员仅提供表中的列，先遮盖截图中的值和账户资料。勿导出 `netlify env:list` 或控制面响应正文。SHA、部署 ID、角色或授权变更后重新采集。 [Netlify 变量上下文与 scope](https://docs.netlify.com/build/environment-variables/overview/) · [Functions 环境变量](https://docs.netlify.com/build/functions/environment-variables/) · [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)

| 上下文 | 读取资源与凭据 | 写入、存储与证据状态 |
| --- | --- | --- |
| production | 专属 PRODUCTION READ policy/URL 和生产只读角色 | 只接受生产管理员证据。旧写关闭，正式会话、头像、心跳和名单未开放 |
| deploy-preview | 对应 context、PREVIEW READ policy/URL，仅独立 TEST 只读角色 | 禁止继承生产、shared 生产权限和生产存储授权。待托管验证 |
| branch-deploy | 同一前缀的 policy context 必须匹配 branch-deploy，按分支单独记录来源 | 仅 TEST。缺配置、错匹配、额外 ACL 时拒绝。待托管验证 |
| local | 授权的 127.0.0.1:55433/jinxi_005s_b1_test，LOCAL READ 和 LOCAL SESSION | 可重置合成夹具。仅白名单本地 HTTPS 提供合成会话 |

公共角色仅能 SELECT 四个明确的无继承普通表。合成会话允许八张实验表和台账序列，列级 DML 由夹具授权。新增负例覆盖同 schema 所有者视图及 PG17 MAINTAIN。运行时证明覆盖直接 ACL 与对象类型，控制面、资源及间接依赖须独立取证。 [PostgreSQL 权限](https://www.postgresql.org/docs/17/ddl-priv.html) · [视图](https://www.postgresql.org/docs/17/sql-createview.html) · [物化视图刷新](https://www.postgresql.org/docs/17/sql-refreshmaterializedview.html)

## 待授权后执行的顺序

1. 锁定审批的 TEST 资源、完整部署 SHA 与角色指纹。先完成备份及恢复试验。生产侧只核对管理员提供的授权和隔离记录。
2. 生成 SQL。经批准后管理员以 TEST 的**实际只读角色**和预设安全连接服务运行。SQL 建立只读事务，核对实际角色、库名和 TEST 注册，再执行应用使用的 ACL 查询。保存脱敏结果。

   ~~~powershell
   node artifacts/b2-a-5/test-role-evidence.cjs --sql | Set-Content -Encoding utf8 test-role-proof.sql
   psql -X -qAt -v test_database=TEST_DB_ID -v test_role=TEST_READER_ROLE -v test_environment_id=REVIEWED_TEST_ID -f test-role-proof.sql -o proof.json
   node artifacts/b2-a-5/test-role-evidence.cjs --verify proof.json expected-test-policy.json
   ~~~

   两种预览分别提供经过审核的 JSON，字段为 context、classification（synthetic-test）、role、environmentId、fingerprint。脚本核对单一角色的直接 ACL。
3. 在 TEST 专用副本验证缺变量、错 context、错注册或指纹、额外表/列/视图/序列/MAINTAIN/函数权限和旧写拒绝。合成负例用回滚事务，断言预期失败和数据未变。恢复最小权限后读接口应通过。错连核查使用身份和控制面资料。
4. 以 TEST 存储和一次性合成对象验证边界、访问日志和恢复。生产存储仅接受控制面授权证据或管理员的既有拒绝记录。
5. 记录每条用例的 SHA、部署和资源、角色、预期和实际结果、审阅者、证据编号。缺项时保留现有门槛。误配置时撤销 TEST 变量及角色、关闭 TEST 路由、恢复专用快照，保留失败记录。
