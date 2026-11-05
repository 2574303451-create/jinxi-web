# 修复前后性能与网络

固定基线807374...与当前真实生产静态导出，分别本机3024/3025。同25条合成HTTP攻略数据，不连接Neon。`measure.cjs`按before/after交替，每个条件3个全新浏览器context，HTTP缓存保持启用、未使用Playwright route拦截。仅同等屏蔽CDN图标请求，避免外网噪声；代理外部视频测试不参与本表。

桌面1440px不降速；手机390px/CPU6×/RTT150ms/下行200000B/s/上行93750B/s。打开时间从自动化点击攻略入口前开始，到首张列表卡出现，含滚动、点击、导航、JS和合成API，不等于纯组件渲染时间。每个条件首轮trace覆盖首页加载及攻略跳转。

## 实际下载体积

| 内容 | 基线 | 修复后 | 差异 |
|---|---:|---:|---:|
| 首页实际JS解码字节 | 587107 | 586828 | -279 B |
| 首页实际CSS解码字节 | 132260 | 132631 | +371 B |
| 首页JS计算gzip | 176042 | 175997 | -45 B |
| 首页CSS计算gzip | 26245 | 26296 | +51 B |
| 首次攻略额外JS解码字节 | 12435 | 14005 | +1570 B |
| 首页+攻略累计CSS | 138030 | 139251 | +1221 B |

解码字节取实际response.body；gzip是单独计算，**本机服务器未压缩响应**，不能用gzip列冒充实传流量。CDP waterfall包含真实encodedDataLength、缓存命中与时间戳。首页无攻略API、没有预载详情/投稿/完整攻略模块；两版本均如此，本轮保持独立架构而非再次取得拆分收益。

首页都发announcements、messages、announcements两次公告/一次留言请求；这项既有重复公告读取未顺便重构。攻略入口各只发一次`summary=1&status=published&sortBy=created_at&sortOrder=DESC&offset=0&limit=12`。详情、媒体、投稿代码按需加载的浏览器合约检查见contract-results.json。

## 首次打开攻略

| 条件 | 基线3次ms | 修复后3次ms | 中位数 |
|---|---|---|---|
| 桌面 | 162 / 183 / 176 | 189 / 160 / 179 | 176 →179ms |
| 慢手机 | 2294 / 2055 / 1669 | 1584 / 2280 / 1869 | 2055 →1869ms |

桌面约+3ms，手机中位数约-186ms，但样本区间重叠、只有3次，**不能据此宣称稳定提速**。攻略额外JS反而增加1570B，用于完整URL状态和更可靠的恢复；安全Markdown/视频细节仍在详情惰性路径。结果支持“首页负载基本保持、攻略交互有少量代码成本”，不支持“整体大幅性能优化”。

首页LCP：桌面基线288/188/204ms，修复180/208/180ms；慢手机基线2876/3488/3340ms，修复3156/3196/2944ms。慢网实验仍约3秒，**没有达到2.5秒参考目标**。本次CLS观测均0；未取得真实用户INP。没有把本机结果宣称为线上Web Vitals达标。

## 原始资料与其他保护

- [performance-results.json](performance-results.json)：12组全量请求、asset bytes/gzip、heap、CPU任务和vitals；[performance-summary.json](performance-summary.json)用于表格。
- before/after-desktop.trace.json.gz及before/after-mobile.trace.json.gz，解压后导入Chrome/Edge Performance。
- [homepage-protection.json](homepage-protection.json)：1440/768/390/320顶部600px与基线像素差均0；Hero/导航无需审美重新验收。
- [ui004-results.json](ui004-results.json)：50组双行速度/无缝/暂停/触摸/离屏/减少动态、时光检索/历史/收起回归。
- [protected-results.json](protected-results.json)：8组成员列表/画廊嵌套焦点和滚动锁。
- [regression-results.json](regression-results.json)：17组其他入口与错误回退；涉及生产写入全部阻止，不证明后端业务成功。
- [avatar-performance.json](avatar-performance.json)和avatar-mobile.trace.json.gz：本机头像编码/存储，没有HTTP上传/CDN结论。

无新动画、无新库、无package或lockfile变化。没有重新调动画时长、重做展播轨道或同行时光。响应式、鼠标键盘与触摸均为自动化浏览器检查，未宣称实体手机/人工读屏或Netlify生产环境已验证。
