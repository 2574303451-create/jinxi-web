# JINXI-REA-002 首页视觉验收

工作分支为 codex/jinxi-rea-002。精确提交由该分支 Git 历史确定，最终交付消息与 PR 提供完整 SHA。

本次起点为 7dfbf69c2e2b61be7c08d4fd65d884c2b371b244，前轮未提交工作已保存到 a95ed1ba63cf6bd38a1321f11e017039056d679e。可从检查点另建 worktree 回看星夜设计。

## 可查看的结果

本机静态生产构建预览为 http://127.0.0.1:3003/ 。服务由本次任务启动，仅监听本机。服务停止后可在项目目录运行 `python -m http.server 3003 --bind 127.0.0.1 --directory out`。重新生成构建使用 `npm run build`。

此预览仅提供静态页面，Netlify Functions 没有在该服务器中运行，因此正常显示真实的 API 不可用状态。需要联调后端时使用已有 npm run dev:netlify，并提供相应测试环境配置。

- REA_REPORT.md 包含 A/B/C 证据、参数与初版修正记录。
- ../../DESIGN.md 包含今夕设计系统。
- reference-{1440,768,390}.png 与 reference-full-*.png 为目标站实际截图。
- jinxi-initial-*.png 为初版，jinxi-revised-*.png 为修正过程，jinxi-final-*.png 与 jinxi-final-full-*.png 为最终构建截图。
- compare-{1440,768,390}.png 为并排比较，comparison.html 可在浏览器查看。
- browser-results.json 为浏览器检查结果，browser-checks.cjs 为复现脚本。
- build.txt、types-baseline.txt、types-final.txt、type-comparison.json、lint.txt 与 test-api.txt 为工程检查记录。

浏览器脚本使用单独的 Playwright 工具安装，未加入项目依赖。可通过 PLAYWRIGHT_MODULE 指定模块路径，PREVIEW_URL 指定静态预览地址，然后运行 `node artifacts/rea-002/browser-checks.cjs`。默认浏览器路径为本机 Edge。

## 实现与业务范围

居中 Hero、点阵、蓝色标题、黄色强调和硬描边来自线上取证后的设计转译。成员入口、管理名片、行动卡片、公告预览、加入区域与移动导航为今夕独立实现。素材使用现有今夕图片，未导入参考站人物、封面、Logo、评价或真实统计。

首页功能入口打开原有组件。登录、改密、成员与轮播、公告、签到、任务、积分与排行榜、组队、游戏数据、留言、攻略和赞助均保留。任务、组队与本地数据继续使用已有界面登录状态控制入口。

相对策划基线，package.json、package-lock.json、netlify.toml、Netlify 后端函数和积分服务均未改变。本次新增公告预览复用 announcements API，没有新业务写入入口。

具体文件清单见 CHANGED_FILES.txt。前次检查点单独提交，本轮视觉修改独立提交。

## 工程验证

生产构建成功。Next 配置仍会跳过构建期 TypeScript 和 ESLint，因此另行执行了独立类型检查。

本次检查点基线为 38 处 TypeScript 错误，最终仍为同样的 38 处。比较按文件、错误代码和诊断文字进行，忽略行号移动，新增与消除列表均为空。更早的 40 处记录不作为本轮实际基线。

Lint 命令进入 ESLint 首次配置提示，仓库缺少可直接运行的配置。test:api 因缺少 test-api.js 失败。这两项没有报告通过。

浏览器结果以 browser-results.json 为准。正常预览验证真实 API 失败状态；独立 UI fixture 拦截所有 API，使用本地虚拟界面账号检查登录后模块渲染、缺图与视频失败。fixture 不是服务端身份认证证据。没有进行生产数据写入、真实登录、签到、奖励领取、兑换或留言发布。

## P0 与待确认

现有 netlify/functions/points.js 直接从请求接收账号、奖励分值和兑换价格，账号存在性查询不足以建立会话身份绑定。该风险继续作为 P0，视觉验收不能视作问题已解决。本轮服务端代码未改变。

仍待真实测试环境验证登录和改密成功链路、签到、奖励、兑换、留言和攻略写入，以及数据库状态与并发一致性。

## 视觉差异与验收范围

今夕使用游戏角色拼贴，参考站使用人物与 AI 问答动画，两者视觉素材与交互内容不同。黄色和蓝色采用近似色，详见 DESIGN.md 中线上实测值与今夕值。参考站的课程数量、评价带与运营统计没有移植，因此页面长度与内容密度不同。

旧业务弹窗仍保留原组件内部排版，部分轮播、战队和游戏数据界面的信息密度高于新首页。本轮已统一外框、背景、文字和错误状态；后续页面的细化等待首页方向验收。

本轮使用 Edge 验证。其他浏览器、真实移动设备与完整屏幕阅读器审计尚未完成。最终审美是否通过由用户决定。
