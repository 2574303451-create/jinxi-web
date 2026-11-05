# JINXI-REA-003｜组件定向参考调查

调查时间：2026-11-05，Windows 本机独立 Edge 140.0.3485.66。目标为公开的 [mdldm.club](https://www.mdldm.club/) 与 [/courses](https://www.mdldm.club/courses)。本轮不重复 REA-002 的整体首页布局研究。

## 证据等级及边界

- **A**：本轮真实 REA / Playwright 浏览器观察、DOM 与计算样式。
- **B**：作者公开设计系统，固定阅读提交 `d23a00a06ccfc7699df080e97ce9fccba3eaebe2`，不代表线上部署一致。
- **C**：本轮没有验证的行为或解释，不作为已实现事实。

仅匿名读取公开页面、打开公开留言表单、切换分类、输入公开搜索词、点击公开内容链接。没有登录、发送留言、购买、提交后台动作或改写第三方响应。截图中出现的原站公开品牌、评价和封面仅用于对照，不作为今夕内容或素材。没有把真实留言文本复制为今夕 fixture。

## REA 实际调用

| 捕获 | 当前 MCP Evidence ID | 行为与结果 |
| --- | --- | --- |
| 1440×900 公开首页 | `ev_ee6728c9e2a016354a79c99e2cc955af4ce547afeaed4235ddebeac5d2593a79` | 启动独立 Edge，等待 2500ms，取得 DOM、可访问性、截图、网络/console/page-error 事件。此时部分首页内容尚未完成。 |
| 390×844 公开留言表单 | `ev_7956ee42587ea4c9605c7bb26bc0746ceb1370c22e4288732cbc808a7c5446bc` | 等待 8000ms → 点击「给麦当留言」 → 等待 400ms → 捕获实际弹层。四个步骤均 completed。 |

两次调用均为本轮实际 `mcp__rea__capture_browser_scenario`，不是仅检查工具注册。两次结果均确认 `process_ownership: provider-owned`、`cleanup: terminated-owned-process`。完整 inline Evidence 分别保存在 `rea-mcp-evidence.json`、`rea-mcp-message-form.json`；截图和 DOM 已解出同名 PNG/HTML，摘要为 `rea-mcp-summary.json`。

REA 两次都将 events 标为 **incomplete**：捕获结束仍有未完成网络请求。`dropped=0` 不等于所有网络请求都已结束，不能由此宣称目标站网络完全正常。Playwright 补充证据也只覆盖采样窗口。

## A：留言展播

DOM：`section` → 版心 → 标题行 + `flex flex-col lg:flex-row` → 左侧 CTA / 右侧展播容器 → 两个 `overflow-hidden` 包裹 → `div.flex.py-1` 动画轨道 → 留言卡。

| 参数 | 本轮现场结果 | 证据 |
| --- | --- | --- |
| 行数与方向 | 两行，`marquee-left` / `marquee-right` 方向相反 | `measurements.json` 的 home.animations |
| 轨道宽度 | 抽样 2208px，半程 1104px | home.trackDefault |
| 动画 | 28s、linear、infinite，0 ↔ -50% | keyframes / computed styles |
| 实际速度 | `1104 / 28 ≈ 39.43px/s`；三宽度的 650ms 采样约移动 26px | home.motion |
| 卡片 | 256px 宽，2px 黑边，14px 圆角，3px 右下硬阴影，16px 内边距，10px 内部 gap，两侧各 10px margin | home.card |
| 昵称 | 12px / 16px，900 字重 | `detail-measurements.json` |
| 正文 | 12px / 19.5px，500 字重 | 同上 |
| 日期 | 10px / 15px，500 字重 | 同上 |
| 头像 | 32×32px，2px 黑边，2px 硬阴影 | 同上 |
| 展播可见宽度 | 1440：840px；768：736px；390：358px | home.horizontalContainers |
| 响应式 | 桌面左 CTA / 右展播；768 与 390 为 CTA 在上、展播在下 | `testimonials-{width}.png` |
| 文档横向溢出 | 三个宽度均 `scrollWidth === innerWidth` | home.pageOverflow |

**暂停行为不能误报为原站已实现**：

- 实际 hover 留言卡后轨道仍为 `running`，约 673ms 内继续移动 26.94px（1440 样本）。
- 将键盘焦点放入此栏目的真实可聚焦 CTA，轨道仍为 `running`；卡片本身没有链接、按钮、tabIndex。
- 独立上下文设置 `reducedMotion: reduce` 后，仍测得 28s 动画、`running`、664ms 内继续移动 25.63px。
- 390px 的轨道包裹为 `overflow-x:hidden`。一次 CDP 原生触摸滑动抽样后包裹 `scrollLeft` 没有变化；这是模拟触摸抽样，不代表所有真机浏览器。
- 点击抽样留言卡后 URL、textarea 数量和 dialog 数量均未变化，未发现留言详情路径。不能据此为今夕猜造对应入口。

因此今夕的 hover / focus 暂停、reduced-motion 静态手动浏览、可定位详情入口应明确属于本任务要求的原创可访问性增强。

## A：公开留言弹窗与输入状态

入口是公开浮动按钮，正文为联系站长表单；它不等同于今夕留言墙的回复、表情、置顶和管理员流程。

| 参数 / 行为 | 现场结果 |
| --- | --- |
| 面板 | 白色、2px 黑边、16px 圆角、8px 右下硬阴影、24px 内边距、最大宽 448px |
| 桌面 / 平板 | 1440 与 768 均 448×505px，垂直居中 |
| 手机 | 390×900 时面板 x=16、宽358、高505、底部留16px，底部对齐 |
| 遮罩 | fixed 全视口，z-index50，黑色40%透明度，背景模糊 |
| 输入框 | 2px 黑边，textarea 10px 圆角、14px /20px、8px 12px 内边距 |
| 输入焦点 | textarea 出现黄色2px focus ring |
| 默认提交 | 内容为空时禁用，未发送 |
| 关闭 | 关闭按钮、点击遮罩均关闭；Escape 实测不关闭 |
| 语义 / 焦点 | 没有 role=dialog / aria-modal；打开后焦点仍留触发按钮；Tab 能离开弹层进入背景 |
| 动画 | 面板带 `animate-slide-in-up` 类，但计算 `animation-name:none`、`getAnimations():[]`。不能仅凭类名认定存在入场动画。 |

今夕应采用可访问的 dialog、焦点约束与归还、顶层 Escape 关闭、嵌套弹层滚动锁；这些要求不应因参考站缺陷而降级。截图 `message-modal-{width}.png` 与 `message-modal-focus-{width}.png`；数据见 `measurements.json`、`detail-measurements.json`。

## A：内容卡片和分类

必须区分首页与 `/courses` 的两套线上表现，不能将首页硬阴影规则概括为整个原站已一致。

| 项目 | 首页推荐卡 | /courses 卡 |
| --- | --- | --- |
| 桌面抽样宽度 | 394.656px | 400px |
| 边框 / 阴影 | 2px 黑边，4px 硬影 | 1px 浅灰边，轻柔阴影 |
| 圆角 | 14px | 14px |
| Hover | y 上移4px，硬影4→8px | 边框变深，无位移和硬影变化 |
| 过渡 | 300ms，cubic-bezier(.4,0,.2,1) | 同左 |
| 链接语义 | 卡片 DIV 外包真实 A 链接 | 本轮仅测卡片视觉与分类 |

首页卡片初次短窗口点击未立即观察到跳转；后续 `check-content-link.cjs` 等待真实 URL 后确认进入公开 `/series/...` 页面（`content-link.json`，`navigationSucceeded:true`），没有详情弹窗，也没有进入需登录内容。此复核取代短窗口的不足结论。

`/courses` 分类：

- 容器 `flex flex-wrap gap-2`；手机换行，不是强制整行缩小或横向溢出。
- 控件高36px，14px/20px、500字重，8px 16px内边距、胶囊圆角、150ms过渡。
- 非选中为浅底细边；选中为深底白字；没有 `aria-pressed`。黄色选中属于今夕/B规范选择，不能写成此页 A 实测。
- 实际从「全部」切换「AI基础」后，抽样卡片数量14→2。这里只用于确认筛选确实生效，不是今夕运营数据。
- 卡片布局：1440为三列、768为两列、390为单列；采样宽度分别400、356、358px。
- 手机导航按钮能由「打开导航」切换为「关闭导航」，出现公开纵向导航。

## A：加载、空态、网络与未观察的失败态

| 场景 | 结果及范围 |
| --- | --- |
| 首页初始加载 | DOMContentLoaded 后首次捕获时无 h1/h2、无 animate-pulse；随后内容异步出现。截图 `home-loading-{width}.png` 证明初始画面，不代表加载体验已完善。 |
| 搜索加载 | 合法公开搜索 `rea003_no_matching_course_20261105`，约450ms时出现「正在搜索…」。`courses-search-loading-1440.png` / `-390.png`。 |
| 桌面实际空态 | 继续等待9000ms后出现0个内容、暂无合适推荐与清除搜索动作。`courses-search-settled-1440.png`。 |
| 手机等待状态 | 相同9秒窗口仍处于语义推荐提示，不能报告手机最终空态完成。 |
| 平板空态 | 只取得初始搜索加载态，没有等待最终结果，最终空态未验证。 |
| 网络 | 匿名 `/api/auth/me` 返回401，console有对应资源错误；采样没有 pageerror。认证探测401不能冒充留言API失败。 |
| 留言API失败UI | 本轮没有自然观察到，**未验证**；没有覆盖响应或故意断网制造A证据。 |
| 回复、表情、置顶、管理员、成员详情/轮播 | 在当前公开调查路径中未发现对应参考组件，不能称其样式或流程来自A实测。 |

## B：可用于原创组件的公开规则

固定来源：[公开设计系统](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/d23a00a06ccfc7699df080e97ce9fccba3eaebe2/docs/DESIGN_SYSTEM.md)、[语义变量](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/d23a00a06ccfc7699df080e97ce9fccba3eaebe2/app/globals.css)、[组件入口](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/d23a00a06ccfc7699df080e97ce9fccba3eaebe2/components/mdldm-ui.tsx)。沿用 REA-002 固定提交副本，未声称已核对远端最新部署。

- 文档14–17行：2px 深描边、4–8px硬影、16px卡片/12px按钮圆角、胶囊标签、点阵和网格。
- `globals.css` 根变量：page/surface/ink/muted/accent，frame/control/press 分组，卡片 hover 8px 硬影。
- `mdldm-ui.tsx:292` 的 `MdldmEmptyState`：描边面板 + 标题 + 辅助说明 + 可选恢复动作，是今夕未取证失败态的 B 类构图依据。

没有复制其整个项目、品牌、封面、头像、真实留言或运营数字。

## 今夕实施建议（原创设计决策，不冒充 A）

1. 展播速度以可读性为目标，先取约25–40px/s，再根据今夕摘要长度和验收调整；按**实际循环距离 / 目标速度**计算时长，不能固定28秒。用 ResizeObserver 测两组起点间距，窗口、字体或数据变化后重算。
2. Hover 和 focus-within 暂停，另设明确暂停/继续按钮；减少动画偏好下展示单份静态列表并允许横向手动浏览。
3. 循环复制项不重复进入键盘顺序/读屏树；无数据/错误不启用轨道，不填充假留言。
4. 只有既有公开API支持定位时才提供真实「查看该留言」；否则准确说明目前入口只打开留言墙，不能伪称已定位。
5. 昵称和正文可比参考站放大：参考站12px正文/8px标签是A事实，不是今夕必须照搬的可读性目标。
6. 业务弹层使用一致的浅色描边、硬影、表单、状态提示；权限、数据来源及写入规则保持原逻辑。

## 复现与文件索引

脚本依赖系统 Edge 和项目外 Playwright：`C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright`。没有修改项目依赖或锁文件。所有脚本均在 `finally` 关闭其自有浏览器。

在仓库根目录运行：

```powershell
node artifacts/rea-003/reference/capture-components.cjs
node artifacts/rea-003/reference/follow-up-interactions.cjs
node artifacts/rea-003/reference/detail-evidence.cjs
node artifacts/rea-003/reference/check-content-link.cjs
```

- `measurements.json`：三宽度 DOM 结构、computed styles、动画keyframes、时间/位移采样、表单、筛选及网络摘要。
- `interactions.json`：卡片点击、390模拟触摸、合法搜索的450ms/9s状态。
- `detail-measurements.json`：正文/昵称/标签/头像样式、A父链接、弹窗Tab序列。
- `content-link.json`：等待URL后的公开内容链接复核。
- `testimonials-{1440,768,390}.png`：完整参考栏目；截图区域高于视口时可能包含原站固定导航。
- `testimonials-band-{1440,768,390}.png`：不含整段CTA的局部留言带，适于组件对照。
- `home-card-*-default.png` / `home-card-*-hover.png`：首页卡片状态。
- `message-modal-*.png` / `message-modal-focus-*.png`：留言表单与焦点。
- `courses-filters-*.png` / `courses-filter-selected-*.png`：分类和选中。
- `courses-search-loading-*.png` / `courses-search-settled-*.png`：真实搜索状态。
- `mobile-navigation-390.png`：公开手机导航展开。

本目录只交付参考调查，不代表今夕组件通过验收。线上部署提交、真实手机硬件、登录区、付费区、写入结果和自然发生的留言API故障均未验证（C）。
