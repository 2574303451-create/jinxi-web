# 原生 PostgreSQL 集成验证

## 环境与真实性

本机原无postgres/psql/Docker/可用WSL发行版。为完成实际SQL验证，下载官方Windows便携二进制，**没有注册服务、修改PATH或安装到项目依赖**。来源为[PostgreSQL官方Windows页](https://www.postgresql.org/download/windows/)指向的[EDB二进制分发](https://www.enterprisedb.com/download-postgresql-binaries)，选17.11-5 Windows x64：

- 官方文件：https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip
- 实际381531864字节，SHA256 `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`。
- 运行版本：PostgreSQL17.11，x86_64-windows，msvc19.44.35229。
- 只绑定127.0.0.1:55432，专用库jinxi_005r_test、专用用户jinxi_005r，host使用SCRAM和随机测试密码。
- 临时目录为系统TEMP/jinxi-005r-db-tools，凭据仅临时runtime.json/pwfile；脚本不打印、报告不记录其值。

原下载中断后通过Range续传，TLS保持验证；没有关闭证书验证。仅解包pgsql/bin、lib、share。initdb、pg_ctl和真实postgres进程均运行过；不是PGlite，也不是fake SQL。

## 实际结构与检查

`postgres-runtime.cjs`硬性拒绝非上述loopback/库名/用户/端口，只在该新建可丢弃库DROP/CREATE表。显式写最小DDL，**未执行含历史示例INSERT的database-strategy-schema.sql**，未读取生产连接信息。

17列实际类型与7个实际索引见[postgres-results.json](postgres-results.json)：tags为TEXT[]；likes/favorites/comments/media_files为JSONB；status为TEXT DEFAULT published，历史设计没有CHECK约束，所以公开读取必须服务端过滤。索引与仓库DDL的主键、created/pinned/category/difficulty/status/GIN likes一致；此DDL不含与只读查询无关的updated_at触发器，不宣称完全复制线上结构。

36条显式合成记录：34published、1draft、1archived；加入JSONB对象、字符串、数字和null。7组真实执行：

1. 公开完整DTO、公开总数和格式规范化；
2. all/draft/archived显式拒绝、summary/full/search/id过滤、伪造role/password无权限；草稿/归档唯一标题搜索0结果；
3. 实际strategies.handler GET通过隔离Neon-shaped adapter委托本机pg.Client，非仅测试辅助函数；
4. 中文/英文/注入样式关键词、category/difficulty及三个排序列、ASC/DESC；
5. 稳定分页无交叠、ID详情、非数组JSONB不会触发jsonb_array_length错误；
6. 非法分页/难度/ID/排序400，绑定参数不执行注入片段；
7. 清空表空列表/缺ID，以及真实EXPLAIN ANALYZE BUFFERS FORMAT JSON。

18例管理员检查另以实际handlers在隔离VM注入随机测试配置；合法pin/delete执行此数据库真实UPDATE/DELETE，非法请求零SQL。VM只是替换连接工厂与配置来源，底层SQL是原生Postgres，非内存模拟。

## 查询计划与局限

该36行小样本的计划是Limit→Sort→idx_strategies_status Index Scan，published实际34行，关键词过滤及点赞JSONB计算后排序；Execution Time0.064ms，见原始JSON。这个数只证明本机查询能执行，不代表生产吞吐或大量数据性能。仍有COUNT、STRPOS不适合常规B-tree、动态点赞排序需计算、OFFSET深页开销；大数据后应在授权测试分布上评估搜索索引、业务允许的键集分页和索引写成本。

Neon驱动`sql.query()`支持参数化SQL，本轮未误报其不存在。适配器保留tagged sql与query接口，返回rows；**Neon HTTP传输、部署表结构、权限、冷启动和Netlify打包没有通过本机测试获证**。没有生产连接、生产写入、迁移、索引发布或历史数据修改。

JSONB修复与测试范围是顶层非数组结构和SQL计数安全；数组内每一项的业务schema、并发写入合并和旧POST输入验证尚未全面治理，不能把它描述为整个历史内容数据已经清洗或所有非法结构都获保证。

## 重现与清理

重新验证时，使用上述版本的独立loopback集群和全新jinxi_005r_test库，将本机随机凭据写到系统TEMP/jinxi-005r-db-tools/runtime.json，字段host/port/database/user/password；文件绝不提交。运行`node artifacts/arch-005r/postgres-checks.cjs`及`node artifacts/arch-005r/admin-checks.cjs`。脚本含合成库重建，不得改成生产端点。对应runtime适配器限定端点是第一道误用保护，仍应只用专用可丢弃库。

验证结束已停止自己的pg_ctl集群，stopExit=0，55432不再监听；没有注册Windows服务或修改系统Node/PATH。**清理未完成**：自动审批先拒绝整个临时目录的递归删除，又拒绝具体runtime.json/pwfile删除，给出的原因仅为“blocked by policy”。没有换用其他删除手段绕过。实际结果见postgres-cleanup.json。

工具、归档、已停止的合成数据集及两个随机测试凭据文件仍在`C:/Users/lilei/AppData/Local/Temp/jinxi-005r-db-tools`，均未进入仓库；其中密码不是生产密码。用户可在文件管理器删除此整个专用临时目录完成卸载，或保留以复验。不需要卸载服务或恢复PATH。
