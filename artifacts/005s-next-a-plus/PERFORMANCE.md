# A+｜真实浏览器性能对照

固定04ca4ef静态导出 vs 本轮最终静态导出，Edge全新上下文，按before/after交替各3次。桌面1440px；慢手机390px、CPU6x、150ms延迟、下载200000B/s、上传93750B/s。相同公开攻略快照、相同合成留言、相同缓存头；CDP阻断外部图标，不用会关闭HTTP缓存的Playwright route。没有同时进行构建或其他浏览器测试。

| 项目 | 基线 | A+ | 差值 |
| --- | ---: | ---: | ---: |
| 首页实际加载JS，解码原始字节 | 601170B | 601994B | +824B |
| 首页实际加载CSS，解码原始字节 | 140679B | 142010B | +1331B |
| JS计算gzip | 180887B | 181135B | +248B |
| CSS计算gzip | 28005B | 28297B | +292B |
| 桌面LCP，3次中位数 | 248ms | 244ms | -4ms |
| 慢手机LCP，3次中位数 | 2924ms | 2884ms | -40ms |
| 初始/滚动后CLS，各次 | 0 | 0 | 0 |
| 慢手机初始图片实际传输，每次 | 735958B | 735958B | 0 |
| 桌面初始图片实际传输，中位数 | 821582B | 821582B | 0 |
| 初始攻略请求，每次 | 0 | 0 | 0 |
| 攻略区出现后列表请求，每次 | 1 | 1 | 0 |
| 初始媒体请求 / 完整攻略代码 | 0 / 0 | 0 / 0 | 0 |

LCP慢手机原始样本：before `[2972,2924,2884]`，after `[2884,2904,2872]`。桌面before `[296,248,212]`，after `[252,236,244]`。样本少，轻微差值不能证明箭头带来性能提升，也不能替代真实用户指标。慢手机仍高于2.5s目标；没有真实用户INP结论。

这些是本地静态服务器实验，没有真实Netlify函数/数据库延迟。JS/CSS gzip为计算值，CDP encodedDataLength则包含实际本地HTTP传输，二者分开。桌面第一轮before只开始加载8张既有图片，后续before与全部after为9张；按采样时点保留差异，不裁掉不利数据。慢手机均为相同8张。没有新增图片、外部SVG、视频、字体、图标包或动画依赖。

## 动效、布局与视频

提示没有动画、Transition、requestAnimationFrame、计时器或React状态。默认和reduced-motion检查均animationName=none；它不参与布局。五档Hero、summary、统计区矩形与基线逐项相同，箭头命中测试落到summary而非装饰。开放details时按CSS隐藏，不等待React。

真实视频检查均从主动按钮播放 `/1.mp4`，currentTime超过0.5s、readyState4、1136×544；初始无Media请求。主动失败样本通过阻断该本地MP4取得，封面实际加载成功，未以静态视频缩略图冒充播放。

原始文件：`performance-results.json`、`performance-summary.json`；第一轮完整记录为 `performance-first-layout.json`（当时箭头位置尚未最终微调，慢手机median3308/3452ms，未舍弃）。本轮最终4份 `before/after-desktop/mobile.trace.json.gz` 可解压后导入Chrome/Edge Performance，记录加载和滚动过程。未将第一轮与最终轮混合求中位数。

图片缓存诊断见 IMAGE_DIAGNOSIS.md。最终前后对照均使用同一缓存条件，未把修改预览服务器导致的重复下载减少计为产品性能收益。242个受保护应用/资源文件按归一化内容哈希保持原样，详见 protected-files.json。
