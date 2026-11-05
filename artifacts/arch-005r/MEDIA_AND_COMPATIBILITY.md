# 攻略功能、链接与媒体边界

## 视频与CSP实测

仅新增`media-src 'self' https://interactive-examples.mdn.mozilla.net`，script-src完全不变；未放开任意https媒体，也不新增iframe权限。来源策略复用lib/guide-media-policy.ts，拒绝空白、带凭据URL、javascript/file/blob等不持久来源。图片维持原策略；这里只控制视频内嵌。

[video-results.json](video-results.json)记录实际Edge、真实响应CSP、真实媒体请求（不拦截或伪造媒体响应）：

| 场景 | 观测 |
|---|---|
| 同源/1.mp4 | HTTP206、video/mp4、Range0–4172470/4172471，播放时间>0.15s，videoWidth1136 |
| MDN公开CC0 flower.mp4 | HTTP206、video/mp4、1128375字节，实际播放，960×540，readyState4 |
| 允许源不存在路径 | 浏览器net::ERR_BLOCKED_BY_ORB，明确失败/重试/外部打开，不把该错误伪称已观测HTTP404 |
| 其他HTTPS视频 | 无video元素，仅外部打开，noopener noreferrer |
| 非法javascript地址 | 媒体地址不可用，不执行 |
| 受控未允许源探针 | 测试插入video触发实际media-src CSP事件；不修改产品白名单绕过 |

同源视频通过原生播放控件触发，preload=none；重试仅重建播放器。外部链接不是持久存储保证。白名单为这次确实播放的公开MDN示例源；以后需要其他来源应单独审查域名与CSP，不扩大到任意来源。

**网络局限**：Edge直连MDN得到206但25秒仍缓冲，原始video-direct-incomplete.json及中间截图保留。改用机器现有10910 SOCKS代理后实际播放；loopback绕过代理。未关闭TLS校验，未代理到伪造媒体或把下载文件冒充外部请求。此结果证明代理网络下可用，不证明用户所有直连网络稳定，也不证明生产Netlify头已生效。

## 投稿能力逐项比较

| 能力 | 旧弹窗/MediaUpload | 独立攻略中心（本轮保留） | 实际持久性 |
|---|---|---|---|
| HTTP(S) URL、标题、说明、分类/难度/标签 | 支持 | 支持 | 后端保存URL字符串；源站失效仍会失效，不是本站托管 |
| 本地文件选择/拖拽 | URL.createObjectURL(file)预览 | 不提供虚假上传按钮 | 旧实现没有上传文件字节到对象存储 |
| blob URL随投稿JSON发送 | 可能作为mediaFiles.url保存 | 拒绝为正式媒体来源 | 旧blob字符串不等于可持久图片，刷新/其他浏览器不能据此恢复原文件 |
| 真正云端文件上传 | 未实现 | 未实现 | 没有获存储授权，不伪造成功 |
| 正文/URL预览、提交、失败保留 | 支持 | 支持、安全子集、原API | 本机测试仅合成内存请求，未证明生产POST持久化 |
| 头像本地存储 | 无对应正式系统 | profile-lab的IndexedDB合成Blob | 可在本机刷新后保留，需重新选合成账号；不是云账号头像 |

源码证据：components/ui/media-upload.tsx的createObjectURL与url:previewUrl；strategy-submission-modal.tsx将mediaFiles交原service；新guide-submission.tsx只接受URL并说明边界。未复制/迁移旧附件，没有删除原数据库媒体字段。

## URL与正文

GuideLocation是地址栏状态唯一模型，q/category/difficulty/sort/page/id一起序列化。初次只做一次规范化replaceState；用户动作pushState；popstate重新读取完整模型；返回列表保留上下文，分享复制完整URL。分页完成后对齐guide-browser顶部24px，历史位置等数据挂载后恢复，避免加载spinner阶段错误clamp滚动。无变化URL不发起跳转。删除后返回保留上下文的listHref。

guide-browser-results.json的四种宽度（1440/768/390/320）验证直接筛选链接、刷新、分页一次请求、文章ID、回退/前进/再刷新和返回列表。36条合成HTTP记录只是稳定测试条件，非数据库或真实用户文章。另有browser-results.json检查真实本机内存评论/点赞、缺失/非法ID、媒体弹窗、投稿预览和404，contract-results.json检查loading/error/empty及惰性加载。

安全Markdown子集支持标题映射h2–h6（文章自身h1）、数字/无序/缩进列表、加粗/斜体、行内与围栏代码、段落、图和链接、中英文长文本。React文本转义原始HTML；危险URL不变成可执行链接。未实现表格、复杂嵌套inline语法、脚注、完整CommonMark，历史复杂内容可能按普通文字展示，不能称无损全语法兼容。

## 浏览量的有意变化

阅读器继续不自动调用view POST：已有viewCount能显示，但新阅读不递增，旧“浏览最多”排序不会反映这条新路径的流量。产品数据应注明是既有计数，不伪造增长。

后续若批准恢复，应设计published校验、服务器侧计数/聚合、短期去重、机器人和频率限制、隐私最小化与幂等边界；不能从URL访问直接触发无限可重放写入，也不把localStorage ID当登录身份。旧view endpoint依然需要单独治理，本轮没有启用自动写入或宣称其已安全。
