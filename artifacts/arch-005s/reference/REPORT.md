# REA定向调查：四项统计与推荐卡片

2026-11-05，仅匿名公开首页与公开“查看全部”导航。未登录、购买、提交内容、进入付费详情或改写第三方接口。课程/图片/数字仅留在参考截图，不进入今夕业务内容。没有把任何标注红框当成UI边框。

## 证据等级

- A：本轮REA MCP或真实浏览器DOM、计算样式、截图、键盘/hover观测；不能证明原站经营数据准确。
- B：原作者公开设计系统，已固定的开源提交d23a00a06ccfc7699df080e97ce9fccba3eaebe2（项目外副本），规则不等于线上自动测量。
- C：原创适配/未验证假设，明确列出，不伪称REA实测。

## REA实际可用性

已配置MCP实际调用成功，服务包/运行版本6.8.0。所安装package.engines为`^22.23.4 || ^24.22.1 || >=26.12.1`；实际REA进程使用Codex自带Node24.22.1，符合要求。项目PowerShell Node24.6.0/npm11.5.1与Netlify Node20/npm10是独立环境，未为REA修改它们。使用现有Edge140.0.3485.66，不重复安装MCP/引擎或浏览器。

| 本轮实际MCP | Evidence ID | 实际行为/完整性 |
|---|---|---|
| 1440×1000 | ev_17a606d83283741a1730700b130c84d310c226ec4daa17302e9abc9153dfe3a8 | 独立Edge公开首页等待7秒，DOM/AX/截图/console/network；complete、无缺失。provider-owned，terminated-owned-process |
| 390×844 reduced-motion | ev_9791abbfc0ca512a807ae254fffb4fd3bfe3660b00d4515f5b6945432b6d6b89 | 等6秒、body PageDown、再等500ms，所有步骤completed；events incomplete，不能推断所有请求已结束。provider-owned，terminated-owned-process |

首个手机请求误用了locator.value，REA按真实schema拒绝；纠正为selector后成功。无效结果rea-mobile.json保留，不将其计作成功取证。

MCP截图/DOM解出rea-desktop.png/html、rea-mobile.png/html。独立Playwright初次在shell中有ERR_CONNECTION_CLOSED；随后同一已安装Playwright在Node REPL隔离浏览器实际成功，补全四宽度、样式和交互。没有离线伪造参考页面或把HTML副本当线上DOM。

**公开签名URL脱敏**：原站图片URL带签名/AccessKey参数，仓库版Evidence和DOM将这些参数脱敏；原始完整MCP payload保留项目外E:/Recovery/.jinxi-research/arch-005s-original-evidence。redaction-record.json保留原始/脱敏散列，Evidence ID仍指向原始捕获，不宣称脱敏副本逐字节原样。截图未编辑。

## A：四项统计的真实布局

统计在Hero内部下沿，CTA下方margin-top80px，padding-top48px，顶端2px灰色虚线，max-width1024px，无外卡边框/圆角/硬阴影。桌面在documentY1073，已在1000px首屏之后；不是红框围住的独立面板。

| 视口 | 统计容器宽×高 | 列 | 每项宽×高 | 证据 |
|---|---|---|---|---|
| 1440 | 1024×118px | 4 | 238×68px | measurements.json / reference-statistics-1440.png |
| 768 | 736×118px | 4 | 166×68px | reference-statistics-768.png |
| 390 | 358×210px | 2 | 167×68px | reference-statistics-390.png |
| 320 | 288×210px | 2 | 132×68px | reference-statistics-320.png |

横纵gap24px；数字36px/40px、font-weight900，标签14px。Hero点阵是背景装饰，统计本身background-image:none。数值hover变蓝的类存在；统计项虽有animate-slide-in-up和400/500/600/700ms delay，但本次计算样式animation-name=none、duration=0s，**不能据类名断言实测入场动画时长**。

## A：推荐内容卡

“精选推荐”h2后有说明、查看全部普通链接（/courses），再分“最近更新”与另一推荐组；完整截图reference-full-1440.png记录其相对位置。实际内容随更新可能变化，本轮不复制其课程标题/描述、数量或收费体系。

| 视口 | 抽样卡宽×高 | 排布 |
|---|---|---|
| 1440 | 394.656×512.734px | 桌面三列 |
| 768 | 352×488.750px | 平板两列 |
| 390 | 358×492.125px | 手机一列 |
| 320 | 288×452.750px | 窄手机一列 |

卡片2px黑边、14px圆角，4px硬阴影；容器aspect-video封面，图片object-cover、底部2px分隔。标题计算20px/28px、700、两行截断；描述、播放次数与时长位于正文/底部横排。card-dom.json保留公开DOM层级，未把原站字段移植成今夕虚假播放量。

hover实际：卡片CSS **translate:0 -4px**（transform仍none，不能只看transform误判无位移），阴影4→8px，300ms；图片scale1.05，500ms；标题color过渡150ms。interactions.json记录补测。卡片自身div不是交互元素，其父a可聚焦；实际focus为1px原生auto outline。查看全部焦点后按Enter到/courses成功，截屏reference-keyboard-destination.png。没有进入VIP付费详情。

切换reduced-motion后本次抽样hover仍有300ms位移/500ms图片缩放；统计动画本来就是none。**不能宣称原站所有动效遵守减少动态**。今夕原创适配会在reduce下去掉新卡片位移过渡，不机械复制这项缺陷。

## A：现场加载限制

四宽度文档均无横向溢出，measurements.json记录。匿名鉴权/api/auth/me的401及部分导航/资源ERR_ABORTED被保留，pageErrors为空仅表示采样未捕获脚本异常，不能说网络全成功。REA手机events incomplete，独立浏览器监听也只覆盖所测窗口，不是全站长期监测。

## B与C：今夕适配依据

B：原作者公开DESIGN_SYSTEM/全局CSS提供纸张背景、黄色强调、2px描边、4–8px硬阴影、统一圆角与位移反馈；既有今夕DESIGN.md已采用。不把原作者开源首页与线上部署视为同一个版本。

C（本项目原创决定）：统计放在今夕原Hero之后，不重排Hero；用208份真实档案、可信在线占位、原创立日时长和待接入视频总数。为了信息来源说明增加统一硬边容器，沿用今夕16px圆角、黄/蓝变量，而非宣称参考统计本来有硬外框。

C：今夕只加载最多3篇公开攻略摘要，原稿缺图用文字/网格占位；不显示不存在的视频时长/播放量、不导入购买/VIP业务。卡片链接独立攻略页，首页不播放视频。实际当前公开内容不足以形成高质量精选，因此如实展示现有测试标题，并把内容运营待办写入交付，而不是生成新文章凑数。

现场截图是审美和布局参照，最终今夕效果仍由用户验收。四宽度源码采集脚本collect.cjs和全部JSON/PNG随本目录交付；补充测量与原始录制区别见各文件说明。
