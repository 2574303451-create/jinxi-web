# 十五个 PR 的集成候选方案

此表记录本轮开始时的实际远端。每个 base 都是上一 PR 的 HEAD，每条本地祖先验证均通过。全部为 open、draft、未合并。新增验收 PR 继续叠加在 #15 之后。

| PR | base 分支 | 完整 base SHA | HEAD 分支 | 完整 HEAD SHA | 新增提交 |
| --- | --- | --- | --- | --- | ---: |
| #1 | codex/planning-handoff-2026-11-04 | 7dfbf69c2e2b61be7c08d4fd65d884c2b371b244 | codex/jinxi-rea-002 | 328819a57c671b33b743d1ad3f969c0fb7917048 | 2 |
| #2 | codex/jinxi-rea-002 | 328819a57c671b33b743d1ad3f969c0fb7917048 | codex/jinxi-rea-003-batch-1 | 0182518277831ba0d03df3a3e1973f1a7ae06efe | 2 |
| #3 | codex/jinxi-rea-003-batch-1 | 0182518277831ba0d03df3a3e1973f1a7ae06efe | codex/jinxi-ui-004-a | ffa71f8313d3f9895d1b664404c29fa8dbb2dda1 | 2 |
| #4 | codex/jinxi-ui-004-a | ffa71f8313d3f9895d1b664404c29fa8dbb2dda1 | codex/jinxi-arch-005 | 80737413d3bb981b3a3287c603893eb6c09decf2 | 2 |
| #5 | codex/jinxi-arch-005 | 80737413d3bb981b3a3287c603893eb6c09decf2 | codex/jinxi-arch-005r | 2836ed13cc5f7da7ffcbce52755063dfbe80b55d | 2 |
| #6 | codex/jinxi-arch-005r | 2836ed13cc5f7da7ffcbce52755063dfbe80b55d | codex/jinxi-arch-005s-a | 04ca4ef972636ef7ac8169d80db2dbf4af9d8b00 | 2 |
| #7 | codex/jinxi-arch-005s-a | 04ca4ef972636ef7ac8169d80db2dbf4af9d8b00 | codex/jinxi-005s-next-a-plus | d4769e719b2dd486b82cd2867f066d6c4dfa3e19 | 1 |
| #8 | codex/jinxi-005s-next-a-plus | d4769e719b2dd486b82cd2867f066d6c4dfa3e19 | codex/jinxi-005s-b1 | 115bf854a7977a3e582a89af13459115178a1e31 | 3 |
| #9 | codex/jinxi-005s-b1 | 115bf854a7977a3e582a89af13459115178a1e31 | codex/jinxi-b2-0-b1-review | 1be49379a771a2a3f23692260e438c2368841150 | 1 |
| #10 | codex/jinxi-b2-0-b1-review | 1be49379a771a2a3f23692260e438c2368841150 | codex/jinxi-b2-0-isolation | 6abd039e898b9970d8d2ec4e7092e3e5b8f3aaf0 | 1 |
| #11 | codex/jinxi-b2-0-isolation | 6abd039e898b9970d8d2ec4e7092e3e5b8f3aaf0 | codex/jinxi-b2-0-security-plan | d516b8643c73797ddfbd8109d46a7dba58f6016c | 1 |
| #12 | codex/jinxi-b2-0-security-plan | d516b8643c73797ddfbd8109d46a7dba58f6016c | codex/jinxi-b2-a-session-lab | 483495aefcd75316731efce76372748a0f00c8c7 | 1 |
| #13 | codex/jinxi-b2-a-session-lab | 483495aefcd75316731efce76372748a0f00c8c7 | codex/jinxi-b2-a-4-security | f443144a912abf5869d42f4758c86caaf6031525 | 1 |
| #14 | codex/jinxi-b2-a-4-security | f443144a912abf5869d42f4758c86caaf6031525 | codex/jinxi-b2-a-5-test-prep | 7f850e188c750e147181fcba193a8106892b4afc | 3 |
| #15 | codex/jinxi-b2-a-5-test-prep | 7f850e188c750e147181fcba193a8106892b4afc | codex/jinxi-b2-a-5-runtime-lab | f9ff27874beaf3388502f29360ebaa86c5a64c13 | 4 |

```mermaid
flowchart LR
start["7dfbf69c"] --> p1["#1 · 328819a5"]
p1 --> p2["#2 · 01825182"]
p2 --> p3["#3 · ffa71f83"]
p3 --> p4["#4 · 80737413"]
p4 --> p5["#5 · 2836ed13"]
p5 --> p6["#6 · 04ca4ef9"]
p6 --> p7["#7 · d4769e71"]
p7 --> p8["#8 · 115bf854"]
p8 --> p9["#9 · 1be49379"]
p9 --> p10["#10 · 6abd039e"]
p10 --> p11["#11 · d516b864"]
p11 --> p12["#12 · 483495ae"]
p12 --> p13["#13 · f443144a"]
p13 --> p14["#14 · 7f850e18"]
p14 --> p15["#15 · f9ff2787"]
```

候选建议从最后一个通过审阅与 CI 的 HEAD 创建新的集成分支。保持线性祖先历史，已有十五个 PR 和已审核提交继续保留。此步骤只定义候选，main、PR 状态和 Netlify 站点仍按各自审批处理。

独立审核使用相邻 base→HEAD 的小差异。集成报告引用这张映射、每个实际 CI 和测试证据。最终与 main 的总差异用于整体核验。main 若有并行提交，先在新候选上普通合并并解决冲突，通过原始 tsc、构建、合成 PG 和 UI 回归后再交审。

| 阶段 | 准入与产物 | 停止点 |
| --- | --- | --- |
| 代码集成 | 冻结全部输入 SHA、祖先和冲突记录，新的候选 SHA，完整原历史，CI 与页面证据 | 只提交审核候选，原 PR 保留，审批后才决定合入顺序 |
| 环境验收 | 管理员审批的 TEST 资源、部署 SHA、实际 Functions 版本、无值变量来源、DB/存储身份和有效权限、托管响应头 | 任一证据缺失时保持写入闭锁，合成测试单独标注 |
| 真实数据迁移 | 真实 TEST 结构/账号映射、密码兼容、备份恢复、迁移演练和回滚核账 | 生产数据迁移须独立批准并确认恢复点 |
| 最终发布 | 明确候选 SHA、生产环境证据、批准的业务恢复批次、托管回归和回滚版本 | 发布由用户审批的独立动作执行 |

回滚保留各 PR 的完整 SHA 和原锁文件。候选失败可撤销其新增提交或放弃候选分支；生产迁移与部署分别按各自审批的恢复方案处理。现阶段原十五个 PR 不重写、不自动关闭。

[原始 GitHub 记录](github-baseline.json) · [TEST 门槛](../b2-a-5/TEST_GATE.md)
