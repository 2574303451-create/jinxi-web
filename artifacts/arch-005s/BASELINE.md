# JINXI-ARCH-005S A 基线

开始时E:/Recovery/jinxi-web工作区干净，实际在005R分支，HEAD与GitHub PR #5均为`2836ed13cc5f7da7ffcbce52755063dfbe80b55d`。用户给定005分支的`80737413d3bb981b3a3287c603893eb6c09decf2`仍为PR #4的head，但它不含后续R修复；因此从最新R成果创建`codex/jinxi-arch-005s-a`，避免倒退公开状态过滤、管理员验证、URL修复与头像原框保护。

| PR | 开始核对状态 | head | base |
|---|---|---|---|
| #4 | open，未合并 | 80737413d3bb981b3a3287c603893eb6c09decf2 | codex/jinxi-ui-004-a |
| #5 | open，未合并 | 2836ed13cc5f7da7ffcbce52755063dfbe80b55d | codex/jinxi-arch-005 |

新PR以codex/jinxi-arch-005r为base，依赖#5→#4→#3→#2→#1；没有合并上游。独立detached对照worktree E:/Recovery/jinxi-arch-005s-baseline固定2836ed...，node_modules仅本地junction复用，不进入Git。

已阅读AGENTS/COLLABORATION/WEB_EXPLORATION/DESIGN、005R交付及相关首页/档案/SQL/API源码。AGENTS中的40条类型错误是旧记录，本轮实际独立基线28条。新构建/类型/浏览器证据重新取得，没有用历史结果充数。

运行环境为本机Windows、PowerShell。项目shell Node24.6.0/npm11.5.1；REA6.8.0实际进程使用Codex自带Node24.22.1，匹配该包engines，浏览器Edge140.0.3485.66。未升级Node、Next、Netlify生产Node20/npm10，也未重装MCP或原生逆向引擎。

范围是用户规定的A阶段：REA定向证据、档案复算、真实配置统计、在线/视频安全占位、公开攻略原型、视觉和性能验收。B阶段可信会话/在线持久化/视频聚合API和实际SQL测试尚未实施，详见DATA_AND_ARCHITECTURE.md。

本轮没有连接/启动PostgreSQL、读取真实profiles、执行生产写入或迁移。上轮被审批阻止清理的本机PG临时目录未在此任务重启或改动，不借旧SQL测试证明新聚合。公开攻略仅匿名GET，不登录、不发送评论/点赞/浏览量写入。
