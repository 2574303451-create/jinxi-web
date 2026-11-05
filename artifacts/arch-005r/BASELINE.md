# ARCH-005R 基线与实施边界

2026-11-05，本机Windows/PowerShell，Node24.6.0、npm11.5.1。工作目录E:/Recovery/jinxi-web。开始工作区干净，原分支codex/jinxi-arch-005，本地和GitHub公开REST核对均为`80737413d3bb981b3a3287c603893eb6c09decf2`，从其创建`codex/jinxi-arch-005r`。

| PR | 状态 | head | base分支 |
|---|---|---|---|
| #1 | OPEN、未合并 | 328819a57c671b33b743d1ad3f969c0fb7917048 | codex/planning-handoff-2026-11-04 |
| #2 | OPEN、未合并 | 0182518277831ba0d03df3a3e1973f1a7ae06efe | codex/jinxi-rea-002 |
| #3 | OPEN、未合并 | ffa71f8313d3f9895d1b664404c29fa8dbb2dda1 | codex/jinxi-rea-003-batch-1 |
| #4 | OPEN、未合并 | 80737413d3bb981b3a3287c603893eb6c09decf2 | codex/jinxi-ui-004-a |

本修复PR叠加在#4，base为codex/jinxi-arch-005，不合并上游。独立detached worktree E:/Recovery/jinxi-arch-005r-baseline保留807374...作为运行与截图对照。没有覆盖用户未提交文件。

已读AGENTS/COLLABORATION/WEB_EXPLORATION/DESIGN及ARCH-005交付、性能、身份和模型草案。使用已安装frontend-ui-engineering技能，未安装新框架、动画库或项目依赖。未重新研究或复制参考站素材。

实际独立类型基线28个错误，AGENTS中40条为旧记录。原构建允许跳过TS与Lint，分别重新检查。未修改package.json、package-lock.json、Next配置、Netlify Node版本、生产环境变量、认证/积分/成员静态数据及历史schema。

本机预览3024为原基线导出，3025为修复后导出，双方使用相同合成攻略/留言。HTTP预览是内存fixture服务器，不连接PostgreSQL或生产API；真实SQL验证单独使用原生PostgreSQL测试集群，不把两者混淆。业务写入测试没有使用生产数据。头像仅保留隔离原型。

Git网络曾遇到现有代理TLS连接失败，改用公开GitHub REST只读核对；没有修改全局Git或MCP配置。视频外部浏览器请求使用本机已存在的10910 SOCKS代理，未新增系统代理配置。
