// Render the independently collected, non-secret PR ancestry snapshot.
const fs = require('node:fs');
const path = require('node:path');
const {rows} = JSON.parse(fs.readFileSync(path.join(__dirname,'github-baseline.json'),'utf8'));
const lines = [
  '# 十五个 PR 的集成候选方案',
  '',
  '此表记录本轮开始时的实际远端。每个 base 都是上一 PR 的 HEAD，每条本地祖先验证均通过。全部为 open、draft、未合并。新增验收 PR 继续叠加在 #15 之后。',
  '',
  '| PR | base 分支 | 完整 base SHA | HEAD 分支 | 完整 HEAD SHA | 新增提交 |',
  '| --- | --- | --- | --- | --- | ---: |',
  ...rows.map(row=>'| #'+row.number+' | '+row.base+' | '+row.baseSha+' | '+row.head+' | '+row.headSha+' | '+row.newCommits+' |'),
  '',
  '```mermaid',
  'flowchart LR',
  ...rows.map((row,i)=>(i?'p'+rows[i-1].number:'start["'+row.baseSha.slice(0,8)+'"]')+' --> p'+row.number+'["#'+row.number+' · '+row.headSha.slice(0,8)+'"]'),
  '```',
  '',
  '候选建议从最后一个通过审阅与 CI 的 HEAD 创建新的集成分支。保持线性祖先历史，已有十五个 PR 和已审核提交继续保留。此步骤只定义候选，main、PR 状态和 Netlify 站点仍按各自审批处理。',
  '',
  '独立审核使用相邻 base→HEAD 的小差异。集成报告引用这张映射、每个实际 CI 和测试证据。最终与 main 的总差异用于整体核验。main 若有并行提交，先在新候选上普通合并并解决冲突，通过原始 tsc、构建、合成 PG 和 UI 回归后再交审。',
  '',
  '| 阶段 | 准入与产物 | 停止点 |',
  '| --- | --- | --- |',
  '| 代码集成 | 冻结全部输入 SHA、祖先和冲突记录，新的候选 SHA，完整原历史，CI 与页面证据 | 只提交审核候选，原 PR 保留，审批后才决定合入顺序 |',
  '| 环境验收 | 管理员审批的 TEST 资源、部署 SHA、实际 Functions 版本、无值变量来源、DB/存储身份和有效权限、托管响应头 | 任一证据缺失时保持写入闭锁，合成测试单独标注 |',
  '| 真实数据迁移 | 真实 TEST 结构/账号映射、密码兼容、备份恢复、迁移演练和回滚核账 | 生产数据迁移须独立批准并确认恢复点 |',
  '| 最终发布 | 明确候选 SHA、生产环境证据、批准的业务恢复批次、托管回归和回滚版本 | 发布由用户审批的独立动作执行 |',
  '',
  '回滚保留各 PR 的完整 SHA 和原锁文件。候选失败可撤销其新增提交或放弃候选分支；生产迁移与部署分别按各自审批的恢复方案处理。现阶段原十五个 PR 不重写、不自动关闭。',
  '',
  '[原始 GitHub 记录](github-baseline.json) · [TEST 门槛](../b2-a-5/TEST_GATE.md)',
];
fs.writeFileSync(path.join(__dirname,'INTEGRATION.md'),lines.join('\n')+'\n');
