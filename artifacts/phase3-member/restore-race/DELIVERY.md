**本机成员身份恢复竞态修复｜2026-11-07（北京时间）**

本轮用户在接管报告后授权“继续严谨运行”。完成已确认P2缺陷的最小本机修复及回归；不扩展为云端身份接入或审核分支推送。

当前分支 `codex/jinxi-phase3-member-local`，HEAD仍为 `6f71de9eec8093e3d139b3201fe4249c6b0e52ff`。本轮修复尚未提交，不能仅取该SHA就认定包含本修复。初始工作区已有CODEX_HANDOFF.md修改及artifacts/handoff/资料，原文和历史证据予以保留。

**问题与原因**

此前浏览器实测：登录尚未完成时派发online，页面会立即使用旧Cookie核验；登录成功后，迟到的401清空新显示，而本人资料仍200。旧6f71的服务器Cookie修复有效，遗漏的是操作进行中再启动前端核验的时序。

本轮先添加执行真实demo.js事件处理器的可控传输回归。旧实现8项中3通过/5失败，修复后8项全通过。原始失败日志保留，没有修改断言掩盖失败。最初一次代码规范检查发现测试辅助函数的Promise executor隐式返回值，已加语句块消除，最终规范检查通过；这不是产品错误或关闭规则。

**实际修改**

| 文件 | 内容与原因 |
| --- | --- |
| [demo.js](E:/Recovery/.jinxi-research/phase3-member/worktree/member-local/demo.js:14) | 会话恢复统一在入口检查busy；操作中的online/focus/广播合并为一个待执行标记；操作结束后用当前Cookie重验。保留原请求代次判断，迟到结果仍丢弃 |
| 同文件 | 后台补验身份/显示名/首次改密标志不变时保留本人资料和操作提示，并更新内存会话数据；真实失效仍隐藏身份。已确认退出或改密后的预期401保留成功提示 |
| [member-local-ui.test.cjs](E:/Recovery/.jinxi-research/phase3-member/worktree/tests/member-local-ui.test.cjs) | 8项永久回归：登录中恢复事件合并、旧401、登录网络失败后服务器恢复、资料不被补验清空、跨标签撤销、退出/改密与旧200、恢复结果乱序 |
| [member-local-recovery-browser.cjs](E:/Recovery/.jinxi-research/phase3-member/worktree/tests/member-local-recovery-browser.cjs) | 真实新建本机PG及HTTPS的3组专项，用延迟的实际401/200验证Cookie及页面状态，输出到每次独立目录 |
| [package.json](E:/Recovery/.jinxi-research/phase3-member/worktree/package.json:18) | 新UI回归加入已有test:security，继承原npm test/CI测试入口；未改依赖或lock |
| README、根交接提示、本目录 | 补充状态协调说明及最新结果。根交接只在前面增加提示，续验前原文逐字节作为正文保留；原始完整备份在本机验证目录 |

同一批恢复通知不增加轮询、定时器、第三方库或状态存储。密码和CSRF仍只在内存，Cookie仍由服务端控制；未增加客户端授权字段。

**验证结果**

| 检查 | 实际结果与证据 |
| --- | --- |
| 原始TypeScript | exit0，`tsc --noEmit --incremental false`：[日志](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/typecheck.log) |
| ESLint | exit0，max-warnings0：[最终日志](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/lint.log)，[首轮辅助函数规范错误](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/lint-first.log) |
| 原API与全部安全回归 | API14/14，安全79/79，无失败/跳过；安全数含原71与新增8：[日志](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/test.log) |
| UI事件回归前后 | 修复前3通过/5失败，修复后8/8：[前](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/ui-before.log)、[后](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/ui-final.log) |
| 实际HTTPS专项 | 3/3：旧401与新登录；登录中online/focus合并为1次操作后GET200；退出后补验401且旧200不能复活显示。页面错误/CSP/外部请求均0：[结果](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/2026-11-07T09-35-27-660Z/results.json) |
| 原身份五宽度浏览器 | 1440/1024/768/390/320均通过；真实Tab3px焦点、减少动态、无横溢、首次改密、退出、过期、草稿；1440多标签退出同步与390实际浏览器offline切换恢复通过：[结果](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/browser/2026-11-07T09-36-56-716Z/results.json) |
| Git/源码保护 | [最终核验与源码指纹](E:/Recovery/.jinxi-research/phase3-member/worktree/artifacts/phase3-member/restore-race/final-verification.json)。除列明文件外，已有服务端/数据库/公开页面/历史证据均未改；无暂存/冲突，临时3069/55436服务已停止 |

专项测试通过route暂缓实际请求/响应并派发online/focus事件，验证应用在这些合法事件顺序下的行为；没有伪造服务器身份DTO。浏览器仅对独立loopback自签测试证书放行，未更改系统信任或云端TLS。五宽度复用原脚本及原断言，写入新时间目录，旧截图/结果/PG回执未覆盖。

本轮没有修改服务器身份、密码、数据库schema/权限或云端配置；没有重新跑已有PG全套、F03建设或Next构建。这些模块在上一轮接管已验，当前改动不在Next编译入口；本轮新的浏览器验证仍实际创建并关闭了独立合成PG/HTTPS。没有把历史云CI冒充本轮工作区已过新云CI。

**兼容性、回滚与后续**

接口、Cookie、数据库及已认可主站UI契约保持。可见变化仅为：身份操作进行中收到的恢复事件在操作结束后补验，不再以操作前结果覆盖新状态；真正被撤销的会话仍拒绝并隐藏。

如需回滚，只撤销本轮demo.js小补丁及其对应测试/脚本和说明改动；不要reset/clean整个工作树。完整续验前demo/package/交接备份位于 `E:/Recovery/.jinxi-research/member-restore-fix-20261107-093244`，回滚前应再次对照差异防止覆盖后来工作。没有生产或云端回滚需要。

本机P2问题已闭环。正式成员身份、全站Provider、留言攻略/签到/积分恢复和头像在线系统仍不属于已完成范围；审核分支推送、云认证写角色和部署仍等待分别明确授权。原测试固定回执输出及原目录交接入口的整体整理不是本轮修改内容，保留接管报告中的工具改进建议。

