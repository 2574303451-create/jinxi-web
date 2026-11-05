# A+｜重复图片请求诊断

采用 diagnose 的复现、假设、单变量检查、真实调用点回归流程。正常页面没有注入调试日志或生产遥测。

## 原始反馈回路

固定04ca4ef静态导出，Edge390px、CPU6x、150ms延迟、下载200000B/s、全新上下文。旧预览服务器对图片发送 `no-store`。最初3次中2次重复 `/logo.png` 与 `/14.png`，无src变更；原始记录见 `image-repro.json`。该初始脚本有Playwright route，随后改用CDP阻断外部图标，保留HTTP缓存，重新建立干净对照。

向用户展示后依次验证的假设：缓存策略、React水合重复挂载、预加载属性匹配、favicon/统计混入。记录不保存认证请求头。

## 实验结果

| 一次变化 | 结果 | 能支持的结论 |
| --- | --- | --- |
| 完整基线，no-store，CDP阻断 | 3/3重复logo与14 | 确认原始症状 |
| 同一导出，仅改为仓库图片缓存头 | 3/3不重复 | 缓存头是该预览条件下有效的因果变量 |
| no-store，仅禁用JS | 3/3仍重复logo，14不再重复 | 不能将全部问题归咎于React水合 |
| no-store，完整HTML改为一次缓冲交付 | 3/3不重复 | 交付时序也影响结果，移除preload不能据此独立证明有效 |
| 缓冲HTML，再移除image preload | 3/3不重复 | 控制组已不重复，此实验不支持删产品预加载 |
| 更小的两段HTML/preload/IMG样本，快网及慢网 | 两种缓存头都不重复 | 最小化没有保留完整触发条件，不能用它证明修复 |

`image-probes.json` 保存15次实验。`image-frames.json` 确认重复发生在同一frame、同一loader，仅一次Document网络请求；重复发起点分别是头部preload与原有正文IMG，未把favicon的Other类型算作Image。原始小样本保留为诊断材料，不作通过证据。

## 修正与回归

本轮**未改产品图片代码、素材或生产缓存设置**。新的只读预览服务器按现有 netlify.toml 发送图片缓存头；该服务器另外补上MP4 Range，供真实播放测试。

真正回归点是完整生产静态导出，`image-full-regression.cjs` 要求logo/14各一次：旧no-store服务器3/3失败、最终导出服务器3/3通过（`image-full-regression-3030.json` / `image-full-regression-3029.json`）。`image-cache-regression*.json` 的小样本无法复现，明确不算这一回归的证明。

还对当前已部署站点做只读HEAD：logo、14、bg、1.mp4均返回200、`public,max-age=2592000`、Accept-Ranges bytes，见 `public-asset-headers.json`。这只核实当前线上资源头，不代表新分支已部署或线上指标改善。Netlify处理后的字节可能与本地源文件不同。

能确认的是旧实验服务器的缓存条件会放大完整导出的重复下载；Chrome内部为何在该完整HTML/交付时序下触发，未缩减为独立最小样本。没有据此删除预加载、重写GuildImage或宣布所有浏览器都已无重复请求。最终性能对照使用相同正确缓存条件，避免将服务器变化冒充箭头优化收益。
