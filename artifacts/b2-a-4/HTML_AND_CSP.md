# C · 公告HTML与CSP整改

无生产公告读写测试。基线PR12，修补和证据全部在独立A-4分支。官方版本/源码/部署头部依据见OFFICIAL_RESEARCH.md。

## 输入到sink的完整清单

| 路径 | 旧风险/信任 | 本轮处理 |
| --- | --- | --- |
| announcements GET.contentHtml → 公告dangerouslySetInnerHTML | 黑名单只删部分标签、on*与字面javascript:；控制字符协议可通过 | DOMPurify3.4.17明确白名单、URI限制；打开公告才加载，未就绪/不支持/加载失败不渲染原串 |
| 公告contentEditable初值/草稿恢复 → innerHTML | 原effect直接设置value；SSR清理返回原HTML | 先清理再赋值，无SSR原串回退；本机存储一律不可信 |
| 富文本/纯文本粘贴 → 原生DOM插入 | 非图片paste未拦截，执行后再清理太迟 | preventDefault，HTML先清理；纯文本先编码；drop拒绝原生HTML |
| URL、剪贴板、文件图片 → execCommand insertHTML | data:image/*含SVG；无限文件及style属性 | HTTPS/站内路径或受限raster数据，512KiB文件/700k字符data界限；先清理再插入，SVG等拒绝；不上传 |
| 编辑器输入/命令 → 父状态/保存草稿 | 未规范化，不可信style可保留 | 语义格式化命令，清理后状态及本机保存；保存失败保留编辑内容 |
| 旧攻略投稿预览、详情 → formatStrategyContent → 两处dangerouslySetInnerHTML | Markdown替换前没有HTML编码 | 先编码作者HTML，再生成固定Markdown标签；正常粗体/标题保持；独立/guides/原React安全渲染不改 |
| app/layout两个style HTML sink | 仓库CSS常量及Geist构建值，无用户输入 | 保持；属于内联样式许可依赖 |
| ui/chart style HTML sink | 当前仅开发者配置；无API/用户调用路径 | 记录为可信CSS边界，未来不得接任意用户config；类型/样式治理后续独立审 |
| strategy-wall、media-gallery、media-upload的innerHTML fallback | 固定占位标签，无插值用户字段 | 源码确认常量；不误报成存储型HTML路径，后续可改React状态 |

标题、昵称、评论、普通留言由React文本转义。攻略媒体还受既有URI策略约束；本轮不把URL合法当可播放。其他媒体和作者写入仍关闭，不能将未来上传字段当已完成安全验证。

## 白名单与兼容边界

允许段落/div/span、br、b/strong/i/em/u/s/strike、h2–h4、列表、blockquote/pre/code、a和img；只允许href/title/src/alt/start，并按元素检查URL。禁止script/style/iframe/object/embed/form/输入控件/template/SVG/MathML/视频音频、事件、任意style/class/id/name/srcset/data-*。HTTPS URL不允许userinfo、控制字符、空白或反斜杠；链接可用站内路径/#锚点；图片data只PNG/JPEG/WebP/GIF、有大小界限。HTTP、SVG和任意CSS粘贴将被移除；保留普通文本与语义格式。

动态import延后到公告打开；浏览器检查确认初始不下载清理器。DOMPurify实例isSupported必须为真，错误不回落原HTML。库仅在浏览器执行，不引入Node20不兼容的jsdom或给首页加整个服务端DOM。读API仍输出JSON字符串，不是可信HTML；正式写入恢复前仍必须实现服务器规范化/校验及其他消费者约束，当前POST依旧拒绝。

旧管理口令认证/发布UI暂停，既有文章可读，替代为明确标注的本机草稿编辑、图片预览和保存；没有“发布成功”假回执。不会因isAdmin/localStorage而恢复服务器权限，也不再读取旧管理口令。图片仅随草稿留在此浏览器，不是正式头像或云上传。

## CSP的实际改动

Next14静态导出的内联self.__next_f hydration脚本不能直接全部删去。新增postbuild生成器只遍历可信out/*.html，逐脚本SHA256后合并为单份out/_headers；本轮6份HTML、20个去重hash、策略1639B。页面数据不是用户HTML输入。生成器失败即build失败，测试禁止TOML同名CSP覆盖；避免默认/*与具体route策略不确定叠加。

script-src删除unsafe-inline/unsafe-eval，保留self、构建hash及唯一精确EmailJS脚本URL；script-src-attr none。object-src none、base-uri self、form-action限定、connect-src只self及现有邮件服务。移除未挂载busuanzi与明文HTTP来源。保留style-src unsafe-inline：RootLayout、React style、进度/裁剪/动画/图表确有依赖，不能假称全站无内联样式。

现有EmailJS动态@4经公开内容核对实际是4.4.1，本轮固定同版本URL及SHA384 SRI/crossOrigin，未盲升主版本。其源码直接fetch，无eval依赖；真实公开SDK字节在浏览器按SRI加载，邮件API全部本机拦截，**没有发送邮件**。框架、公告编辑、路由及原组件在实际新CSP响应头下验证。

Netlify 配置跳过构建后处理。已用仓库 Netlify CLI 附带的离线 headers parser 核实六条路由均只匹配一份生成策略，见 `csp-build-proof.json`。托管环境的 snippet、prerender、扩展及 CDN 最终 HTML 和响应头仍需核验。任何字节变换造成哈希不匹配时应阻断发布。Functions 响应头由各 Function 管理。

## 实际证据

`html-before.json`/PNG：旧公开公告样本的java+TAB+script链接执行无害内存标记，marker=1，断言先失败。新浏览器四宽度样本6类HTML、格式/正常图片、保存/恢复、富/纯粘贴、raster文件和URL插图、拒绝SVG/drop、清理器下载失败均安全；未知内联script和onclick还被实际CSP独立阻止。before测试首个按钮定位/异步标记读取错误与真实产品红灯分别保留，没有宣称早到的marker=0为通过。

全部截图明确合成；没有改生产公告。正常编辑器支持本机草稿，不代表正式管理功能恢复；CI/类型/保护回归/性能及仍有的托管阻断见DELIVERY.md。若需撤实验改动，应保留旧写关闭，HTML退回纯文本而非退回已知黑名单；CSP回滚用已验证的构建与其匹配hash，不混用旧HTML和新头。
