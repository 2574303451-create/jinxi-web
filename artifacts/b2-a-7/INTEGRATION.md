# 集成冻结记录

main 2ce600a79955cd5e5a7bd798f266f8e17b0c283e → 审核基线 a37786ce68ec8223ff0e512b86be1c81b3a3e777 → A7 代码候选 d0131fbbcc128b421e1e826194189df076ed4335。候选保留现有线性历史。

| PR | 变更 | base SHA | HEAD SHA | 新增提交 | 变更文件 |
| --- | --- | --- | --- | ---: | ---: |
| #1 | JINXI-REA-002 · 基于现场证据的今夕首页视觉重建 | 7dfbf69c2e2b61be7c08d4fd65d884c2b371b244 | 328819a57c671b33b743d1ad3f969c0fb7917048 | 2 | 106 |
| #2 | JINXI-REA-003｜第一批：统一留言墙与成员展示组件 | 328819a57c671b33b743d1ad3f969c0fb7917048 | 0182518277831ba0d03df3a3e1973f1a7ae06efe | 2 | 368 |
| #3 | JINXI-UI-004｜检查点 A：双行留言展播与同行时光 | 0182518277831ba0d03df3a3e1973f1a7ae06efe | ffa71f8313d3f9895d1b664404c29fa8dbb2dda1 | 2 | 211 |
| #4 | JINXI-ARCH-005｜独立攻略中心与隔离头像原型 | ffa71f8313d3f9895d1b664404c29fa8dbb2dda1 | 80737413d3bb981b3a3287c603893eb6c09decf2 | 2 | 203 |
| #5 | JINXI-ARCH-005R｜头像原框保护与独立攻略审查修复 | 80737413d3bb981b3a3287c603893eb6c09decf2 | 2836ed13cc5f7da7ffcbce52755063dfbe80b55d | 2 | 248 |
| #6 | JINXI-ARCH-005S A｜真实档案统计与公开攻略补给 | 2836ed13cc5f7da7ffcbce52755063dfbe80b55d | 04ca4ef972636ef7ac8169d80db2dbf4af9d8b00 | 2 | 274 |
| #7 | JINXI-005S-NEXT A+｜宣传视频弧形箭头、首页回归与prebuild可靠性 | 04ca4ef972636ef7ac8169d80db2dbf4af9d8b00 | d4769e719b2dd486b82cd2867f066d6c4dfa3e19 | 1 | 234 |
| #8 | JINXI-005S-B1｜公开视频聚合、真实首页筛选与完整本机验收 | d4769e719b2dd486b82cd2867f066d6c4dfa3e19 | 115bf854a7977a3e582a89af13459115178a1e31 | 3 | 206 |
| #9 | JINXI-B2-0 检查点0｜B1最终复核与真实视频缩略图回退 | 115bf854a7977a3e582a89af13459115178a1e31 | 1be49379a771a2a3f23692260e438c2368841150 | 1 | 18 |
| #10 | JINXI-B2-0 检查点1｜全Functions隔离边界与旧写入阻断 | 1be49379a771a2a3f23692260e438c2368841150 | 6abd039e898b9970d8d2ec4e7092e3e5b8f3aaf0 | 1 | 38 |
| #11 | JINXI-B2-0 检查点2｜可信身份、积分及内容整改门槛 | 6abd039e898b9970d8d2ec4e7092e3e5b8f3aaf0 | d516b8643c73797ddfbd8109d46a7dba58f6016c | 1 | 3 |
| #12 | JINXI-B2-A 检查点3｜合成本机会话、权限补强与安全CI | d516b8643c73797ddfbd8109d46a7dba58f6016c | 483495aefcd75316731efce76372748a0f00c8c7 | 1 | 109 |
| #13 | JINXI-B2-A-4｜公告安全整改与可信成员接入准备 | 483495aefcd75316731efce76372748a0f00c8c7 | f443144a912abf5869d42f4758c86caaf6031525 | 1 | 178 |
| #14 | JINXI-B2-A-5 · TEST 隔离准备与安全复核 | f443144a912abf5869d42f4758c86caaf6031525 | 7f850e188c750e147181fcba193a8106892b4afc | 3 | 69 |
| #15 | JINXI-B2-A-5 · Next 16 / Node 24 运行时实验 | 7f850e188c750e147181fcba193a8106892b4afc | f9ff27874beaf3388502f29360ebaa86c5a64c13 | 4 | 15 |
| #16 | JINXI-B2-A-6 · 运行时成本归因与 TEST 验收准备 | f9ff27874beaf3388502f29360ebaa86c5a64c13 | a37786ce68ec8223ff0e512b86be1c81b3a3e777 | 4 | 72 |

~~~mermaid
flowchart LR
start["冻结起点"] --> p1["#1 · 328819a5"]
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
p15 --> p16["#16 · a37786ce"]
~~~

main 是已审核候选的祖先，Git dry merge 的树与候选树相同。未创建 merge commit，未修改 main。源代码、配置与数据草案分别核对，证据和截图没有被用来掩盖业务冲突。

| 差异分类 | 文件数 |
| --- | ---: |
| engineering | 4 |
| tooling | 15 |
| documentation | 11 |
| application | 124 |
| evidence | 2072 |
| database-draft | 5 |
| public-asset | 1 |
| tests | 22 |

每个 PR 的标题、完整提交列表和相邻变更路径见 github-freeze.json。代码候选与 main 的全部对象 ID、模式和路径见 main-diff.json。树 ID 也绑定二进制和证据文件。交付提交可用此脚本指定完整 SHA 和独立输出路径再次生成总表。

代码集成、云TEST验收、真实数据迁移、最终发布分别审批。建议保留原PR与其完整提交，新候选只承接相邻的审核增量。main 后续若变化，重新冻结并在候选副本检查冲突，完成回归后再提交审核。
