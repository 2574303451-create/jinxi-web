# 检查点5最终增量的两路独立补审

初轮独立审查基准：25d6938a6bf42603ecad88428c970c11e5519c21。
本轮精确源码候选：4aa491dea5f77cd2b0c03fcf57ac34a38448e520。
范围：`git diff 25d6938a6bf42603ecad88428c970c11e5519c21...4aa491dea5f77cd2b0c03fcf57ac34a38448e520`，及本轮新增的两份取证脚本run-tests.cjs、check-remote.cjs。既有身份、社区、签到和积分不重新审计。

以下为两个独立子代理实际回复的记录，由主代理整理保存。它们均实际完成了本轮审查，没有沿用前次额度受限时的结论；未购买额外服务。两位均未编辑文件、运行PG/HTTPS/浏览器或修改远端。主代理实际新执行的集成测试单独记录在test-runs.json，不混为独立审查者的执行。

## Standards

审查者：operations_closeout_standards。

独立Standards补审已实际执行。候选4aa491dea5f77cd2b0c03fcf57ac34a38448e520；审查指定三点diff与3个提交，另只读审查本轮两份取证脚本。

**0项明确规范违反，0项阻断，0项建议。**

- 429仅新增错误提示；身份、权限、输入与服务端限流检查保持，私有界面清理和显式重试逻辑保留。
- 综合场景限流重置限于新建合成数据库；专项只恢复指定请求桶，不修改账号、会话、角色或业务数据。
- 原断言未删除、跳过或降权。
- PG/TLS原始日志、退出码及结果来源相符；文档明确积分基准CI不覆盖本轮候选，并如实保留此前补审与远端复读失败。
- 附加脚本保存原rate证据字节；远端检查最多两次只读请求，开启证书验证且不改全局配置。

实际独立命令：Node24 `--test tests/operations-local-boundary.test.cjs tests/operations-local-html.test.cjs tests/operations-local-ui.test.cjs`，exitCode=0，tests/pass=18/18，fail/cancelled/skipped/todo均0，duration_ms=195.3712。PG/HTTPS/浏览器仅核对既有证据，未自行运行。

## Spec

审查者：operations_closeout_spec。

精确候选及增量区间相同，核实继承积分9fde7fec87fc145cb51638114fe4eb2de1717b39，依据本轮指令及ACCEPTANCE第7、9、10项。

**0项新增规格缺陷或越界行为，0项阻断。**

- demo.js第38行只增加429提示；身份、角色、Origin、CSRF、输入及事务实现未改。
- 真实限流测试仅恢复指定合成桶为合法值1；保留首次改密403及业务回执0断言。综合测试仅在独立首次改密场景前清理合成限流表，既有断言未删除或弱化。
- 四个增量取证CJS及本轮两脚本均已静态核验；远端脚本最多两次只读ls-remote，保留证书验证且不改全局配置。
- 公告、赞助、团队、XSS、历史归属及待验业务边界保持。

实际独立执行同组三个纯测试18/18、退出0、无跳过；另对8个相关CJS做node --check，均通过。git diff --check的非零来自原始日志空白，未当作Spec业务问题。旧PG/HTTPS/浏览器/CI/TLS记录没有冒充本次独立新执行。

补充取证注意：旧collect-results.cjs是固定结构的历史快照汇总器，重新执行会覆盖旧RESULTS.json且不保留后添remoteFinalRead字段。本轮不调用该脚本；本目录独立记录新结果。此为证据使用边界，不影响业务代码。

## 合并收尾

Standards明确问题0；Spec明确问题0；最严重问题：无。主体初轮审查与本轮增量补审共同覆盖当前业务与原测试源码。后续本地证据提交仅新增报告/取证材料及交接索引；最终证明须核对业务和原测试文件相对4aa的Git blob均不变，而不是把证据提交SHA冒称已重新执行的源码SHA。
