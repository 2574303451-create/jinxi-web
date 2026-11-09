# 第四阶段工作包2：独立 Standards / Spec 审查

收尾日期：2026-11-10（用户时区 Asia/Shanghai）。原始日志使用工具实际UTC时间，不改写其日期。唯一继承基准42722d553849eb98faf171f794a3aeee54440b2c；最终受审实现66fcbb13e54163a15537c803fd506729905866d6。后续交接/证据提交不改变该实现源码，最终本地HEAD见交付及FINAL_STATE.json的源码对应证明。

两路由不同代理独立只读执行，Standards核对仓库约定、信任边界和工程安全；Spec按service-adapter/SPEC.md和当前用户任务核对实际行为。不启动其他PG/浏览器进程以免与根任务固定端口冲突。不把代码阅读、内存模型或根任务结果冒充代理的真实PG/浏览器执行。

## 实际发现和关闭

| 项 | 来源与严重度 | 真实问题 | 最小修复 / 回归 |
|---|---|---|---|
| 1 | Standards P1 | 数据已返回后等待持久化确认，切号仍可能返回A的私有结果 | journal.mark之后再次核验世代/Cookie标记；真实IDB回调延迟后切B，旧成功通知为0 |
| 2 | Standards P2 | 大小写UUID可能绕过历史映射重复身份判断 | 按PostgreSQL UUID语义统一小写再判重，两个旧账号不得认领同一UUID |
| 3 | Standards P2 | 错误预演资源在拒绝之前先读财务快照 | 先验证数据库身份/地址/指纹再快照；错误目标快照调用次数为0 |
| 4 | Spec P2 | 前16条一直未知，无法核对第17条 | 稳定排序及显式16条分页；真实浏览器不删前页即可核对第17条 |
| 5 | Spec P2 | 首次确定拒绝的旧意图过期后也被当成未知永久冻结 | rejected与unknown分开；确定拒绝继续原号，未知7天后仍冻结 |
| 6 | Spec P2 | 旧SERIAL数值ID被临时行号替代 | 安全整数无损转十进制源ID；不安全ID隔离，数字/字符串重复ID也隔离 |
| 7 | Spec P2 | 多个旧user_id指向一个UUID，掩盖同日重复奖励/余额风险 | 奖励按可信UUID+日期查重，多财务别名明确报错；原余额逐个保留，不自动合并 |
| 8 | Spec P2 | 128条结果已核实但内存容量未释放，新操作仍拒绝 | 仅在当前服务端确认同一ID后释放其内存槽；129次操作回归 |
| 9 | Spec P2 | 已完成true→false→true或加入→退出→加入重放旧状态 | 仅列举的目标状态操作在已确认后允许新意图；财务/创建/退款不自动换号 |
| 10 | Standards P2 | false响应丢失→true→false，后一个false重放旧结果 | 先核对同类未知回执；未确认相反目标拒绝；IndexedDB事务内再检查竞争未知意图 |
| 11 | Spec P2 | 更早true已确认→false丢响应→同值false重试错误换号 | wasUnknown始终保留原号，不根据其他confirmed猜顺序；单测、真实PG与IDB断言 |

前7项修复在1b75d38c5ca50125feee37a30938d87329fb59f8；第8/9项在a00eb102b00f65868ce4e3fcfbefa4b3593ded5a；第10项在38c751d08ecfd10f870b80a962b84f022ca14ba7；第11项在66fcbb13e54163a15537c803fd506729905866d6。0dab9965c5d993342916b4a8d1087673ac213dff仅校正PG退出队伍夹具字段。全部线性继承，不改写已审提交。

根任务保留的真实RED：unit-2026-11-09T06-55-23-396Z.log（16通过5失败）、06-56-38-347Z（16/7）、07-10-42-938Z（25/2）、07-32-55-793Z（27/1）、07-43-59-994Z（29/1）。这些日志是发现时结果，不能当成最终代码失败或被最终通过覆盖。完整命令、源码SHA256、时刻和退出码见test-runs.json，失败原因另见FAILURES.md。

## 最终增量审查的真实结论

Standards与Spec均固定66fcbb13e54163a15537c803fd506729905866d6，重审38c751d..66fcbb1并核对先前修复影响，无新增P1/P2阻断。两路各自执行以下同一组公开测试，分别53/53、exit0、skipped0、cancelled0；增量git diff --check退出0。证据来源是各代理在当前聊天的实际工具执行与最终消息，本文件是该消息的整理记录，不是额外工具签名或云端运行结果。

```powershell
& 'E:/Recovery/.jinxi-research/b2-a-5-tools/node-v24.22.2-win-x64/node.exe' --test tests/adaptation-policy.test.cjs tests/adaptation-session.test.cjs tests/history-compat.test.cjs tests/integration-local-session.test.cjs tests/integration-local-boundary.test.cjs
git diff --check 38c751d08ecfd10f870b80a962b84f022ca14ba7...66fcbb13e54163a15537c803fd506729905866d6
```

Standards另以git show编译固定session/journal的公开接口，使用内存串行事务适配器完成四项探针：丢失false→true→false；旧confirmed不导致同值换号；未确认相反目标拒绝；两个相反目标原子claim仅一成功、另一明确拒绝。模型不替代真实IndexedDB。首次探针对两个完整session调用作了过强的“必须恰一成功”假设；完整调用可先核对回执后合法串行完成，因此改为直接检查原子claim不变量，无业务源码或权限改动。

Spec独立复现第11项修复后输出：

```json
{"retainedOriginalUnknownId":true,"targets":[true,false,false],"actualServerState":false,"distinctServerTransactions":2}
```

两路均确认原浏览器夹具适配只增加真实恢复界面的“服务端确认→用户明确允许新意图”；没有清空IndexedDB或伪造回执。两笔兑换扣减、两次退款、退款原流水、两条同名感谢及毫秒时间等原断言均保留。根任务另外执行实际PG/HTTPS/浏览器，结果和边界见REPORT.md/test-runs.json。

## 限制

没有云端连接、部署、真实208资料或正式数据迁移验收。未来独立TEST真实Context/TLS/数据库schema/角色身份、持久化清理政策和真实历史证据仍需批准及实测。本审查不放行真实业务写入；UI-DEFER-001/002继续待办。
