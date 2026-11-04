# JINXI-REA-002 调查与对照

日期为 2026-11-05。公开目标为 https://www.mdldm.club/ 。使用 Windows 本机 Edge、REA 6.8.0 MCP 和 Playwright。全程以匿名访客观察公开页面，没有提交留言、登录或购买。

## 证据等级

A 为实际网页中观察或测量。B 为作者公开源码与文档。C 为尚未验证的推测。B 不能自动证明线上部署使用同一源码，C 不作为实现事实。

## 基线与回退

远端 origin/codex/planning-handoff-2026-11-04 与本地起始 HEAD 都为 7dfbf69c2e2b61be7c08d4fd65d884c2b371b244。工作区存在 PLAN-001 未提交改动。先在 codex/plan-001-star-night 保存检查点 a95ed1ba63cf6bd38a1321f11e017039056d679e，再建立 codex/jinxi-rea-002。

检查点包含前次代码和截图。可以从该提交创建独立 worktree 回看，避免强制重置当前工作区。

## A 类现场取证

直接调用本会话 mcp__rea__capture_browser_scenario，证据编号为 ev_5da27451ae4548b4bd277fc0b84a4b26a8e6d83810574d55f967e74befe104b4，摘要见 rea-mcp-summary.json。启动临时 Edge，以 1440×900 访问公开首页并等待 2 秒，取得 DOM、可访问性、截图与网络事件。请求尚在进行使 REA 标记 events incomplete，此结果不能证明全量网络无错误。

CLI 重复取证的完整 JSON 留在 E:/Recovery/.jinxi-research/rea-full-evidence.json。仓库摘要保留 MCP 证据编号、参数、步骤与截图散列。下列 Playwright 现场证据补充浏览器计算样式和交互。

| 观测项 | A 类结果 | 文件或记录 |
| --- | --- | --- |
| 桌面首屏与完整页 | 1440×900，公开首页 | reference-1440.png、reference-full-1440.png |
| 平板与手机 | 768×900、390×900，无文档横向溢出 | reference-768.png、reference-390.png 及 full 文件 |
| 导航悬停 | 灰文字变深色，150ms 过渡 | reference-nav-hover.png、reference-interaction-styles.json |
| 导航点击 | 点击课程后等待并确认 /courses 路由 | 浏览器现场检查 |
| 手机导航 | 点击“打开导航”后出现纵向菜单 | reference-mobile-menu.png |
| 卡片悬停 | 上移 4px，硬阴影 4px 变 8px，300ms | reference-card-hover.png、reference-card-styles.json |
| 按钮按下 | 抽样已选中的“我是人类”，按下时未测得位移变化 | reference-button-pressed.png、reference-interaction-styles.json |
| 弹窗 | 公开留言表单为白色描边面板，遮罩与背景模糊 | reference-dialog.png |
| 滚动 | 桌面导航持续位于 y=0，高 69px | reference-scroll.png |
| DOM 与样式 | 顶部层级、section、字体、边框、阴影与变量 | reference-measurements-1440.json、reference-extra.json、reference-layout-*.json |
| 脚本与网络 | 匿名 /api/auth/me 返回 401，采样窗口内无 pageerror | reference-network.json |

截图中的公开品牌、课程和评论仅用于视觉对照，未进入今夕业务内容。

## 视觉参数表

| 参数 | A 类线上实测 | B 类公开规则 | 今夕选择 |
| --- | --- | --- | --- |
| 构图 | 居中标题、纵向入口 | 开源首页左右分栏 | 采用 A 类构图 |
| 底色 | RGB 248,248,248 | #f7f7f2 | #f8f8f8 |
| 强调黄 | RGB 255,223,32 | #ffd83d | #ffe528，近似色 |
| 标题蓝 | RGB 21,93,252 | #4e79f6 | #2360f5，近似色 |
| 字体 | Geist / Geist Fallback | Geist 与系统字体 | 原有 Geist 与中文回退 |
| 桌面标题 | 72px/90px、900、-1.8px 字距 | 响应式尺寸不同 | 72px/90px、900 |
| 平板标题 | 768px 下 72px/90px、双行 | 未作为线上测量依据 | 72px 双行 |
| 手机标题 | 48px/60px、双行 | 公共响应式规则 | 48px 双行 |
| 容器 | 宽 1280px、内边距 16px | 最大 86rem | 可用版心 1248px、侧边 16px |
| 点阵 | #cbd5e1、半径 1.5px、间距 24px | 点阵与网格 | Hero 24px 点阵 |
| 内容卡片 | 2px 黑边、抽样圆角 14px | 2px 边、面板 16px、按钮 12px | 2px 边、面板 16px、按钮 12px |
| 硬阴影 | 默认 4px，悬停 8px | 4–8px | 同 A |
| 动效 | 卡片 300ms、按钮 200ms | hover 与 active 位移 | 200/300ms，按压规则采用 B |
| 背景动画 | 几何 6s、人物 4s、留言带 28s | 可访问交互规则 | 6s 几何，支持 reduced-motion |

线上颜色用浏览器 canvas 将实际计算色转为 RGBA，见 reference-paint.json。样式测量以取样元素为限，不代表所有控件规则一致。

## B 类公开源码

固定阅读提交 d23a00a06ccfc7699df080e97ce9fccba3eaebe2 的六个文件。副本在项目外 E:/Recovery/.jinxi-research/mdldm-source。

- docs/DESIGN_SYSTEM.md，主题与语义变量。
- app/globals.css，配色、描边、圆角、硬阴影与位移。
- components/mdldm-ui.tsx，面板、按钮、标题与空状态职责。
- app/page.tsx，开源首页内容组织与数据回退。
- docs/assets/README.md，Demo 截图及原站素材的授权边界。
- TRADEMARKS.md，品牌与商标规则。

源码入口为 https://github.com/CzzzzzzJ/mdldm-knowledge-kit/tree/d23a00a06ccfc7699df080e97ce9fccba3eaebe2 。本次没有合并上游项目，新增今夕组件独立实现。

## C 类未知

线上部署提交与公开项目是否相同，尚未验证。登录后、付费区、真实运营数据正确性未验证。当前网络窗口不能推断长期网络质量，也没有覆盖目标站全部按钮、动画和浏览器差异。

## 初版对照与修正

| 具体偏差 | 修改位置 | 修正结果 |
| --- | --- | --- |
| 桌面素材区过高，标签与 CTA 靠下 | guild-theme.css 的 hero-game-art、game-print、hero-context | 区域从 200px 缩至 140px，减少重复留白 |
| 平板初版 56px 单行，与实测不同 | guild-theme.css 平板断点 | 72px 双行，与 A 类比例一致 |
| 手机胶囊出现单字换行 | guild-hero.tsx 手机换行 | 拆成品牌与集结文案两行 |
| 纸张底色 #fafafa 与实测不同 | --page 与页头色 | 改为 #f8f8f8 |
| 主导航重心偏右 | guild-navigation.tsx 的 nav-primary | 栏目居中、账号留在右侧 |
| FAQ 旧白字在浅底消失 | app/page.tsx FAQ 容器 | 统一 legacy-module 文字映射 |
| 黄色入口被通用背景覆盖 | .guild-panel.yellow | 使用明确状态样式恢复黄色 |
| 全页截图含未加载图片 | browser-checks.cjs | 逐段滚动并等待 complete 后截图 |

视频首次点击问题来自按钮 hover 的 transform 覆盖了居中 transform，现已改用独立 translate 定位，并增加 8 秒无数据时的封面降级。

初版为 jinxi-initial-*.png，修正过程为 jinxi-revised-*.png，最终为 jinxi-final-*.png。同宽度 compare-*.png 按左参考、右今夕排列。完整页长度因业务数量不同而不同，未以像素相同比例作为审美通过的结论。
