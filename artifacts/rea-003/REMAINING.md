# 第一批之后的组件清单

本文件不表示以下模块已经统一。优先级和固定基线源码定位见 [UI_AUDIT.md](UI_AUDIT.md)，三宽度正常态基线截图在 `before/`。

| 检查点 | 待改组件 | 重点及独立验收 |
| --- | --- | --- |
| 第二批 / P1 | strategy-wall、strategy-submission-modal、strategy-detail-modal、media-upload、media-gallery | 深色渐变、模糊卡片、彩色按钮和媒体预览层；保留 strategies/strategy-actions、搜索/分类/难度/排序/投稿/评论。共享管理员弹窗已经更新，攻略内部仍旧样式 |
| 第二批 / P1 | checkin-widget、daily-tasks、leaderboard-widget、points-ranking-widget | 签到/历史、任务/进度、积分/排行的浅纸面板与完整状态；保留账号边界、奖励及原接口。不用界面正常证明积分P0已修复 |
| 第三批 / P1 | team-system、game-data-panel | 组队列表/排行/申请与装备/宠物/角色/成就，清理卡通、发光与彩虹渐变；保持浏览器本地存储与默认示例说明 |
| 第三批 / P1 | cyber-announcement、guild-sponsorship、guild-uptime-terminal | 公告列表/管理员/编辑器、赞助/登记/二维码、展开的霓虹终端；保留既有权限和实际联系/支付素材 |
| 第三批 / P1–P2 | 加入表单、登录/改密、Accordion、Toast、LoadingSpinner、其余可达旧弹层 | 逐组件迁移语义样式与状态，减少 legacy 规则，保持既有已批准首页和所有入口 |

每批分别交付改造前后1440/768/390截图、状态和交互、类型诊断差异、构建及修改清单，依据用户验收反馈推进。第一批此时供验收，不自动把后两批合并实施。

独立P0仍为 `netlify/functions/points.js` 的身份绑定与客户端积分/兑换参数信任风险。本次没有修改服务端规则、数据库或生产数据，没有增加新的积分写入口；修复需单独的安全实施范围。

未取得授权测试账号/可写测试后端，因此真实登录、留言写入、管理员服务端授权、签到积分、攻略投稿、赞助登记和邮件发送仍未完成集成验证。浏览器内存fixture仅证明界面和原payload调用路径，不证明数据库结果。
