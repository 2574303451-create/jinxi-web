# B1 检查点2续验与综合验收

> GitHub审核阅读入口：[REVIEW_GUIDE](../REVIEW_GUIDE.md)。本文件正文及JSON保留提交前验收快照；其中未提交/未推送等Git状态由本轮获授权的GitHub发布更新替代，质量结论和失败证据保持原样。实现提交55825f1a8146d0418bfa6380d7fa5254f093d6cc，完整最终HEAD以草稿PR为准。

2026-11-05，Asia/Shanghai。

**检查点2本机浏览器验收通过，综合安全/性能检查已执行并保留边界。生产发布仍阻断。** 未重新设计首页，未启动B2、推送、创建PR、合并或部署。

## Git 与成果保护

- 仓库2574303451-create/jinxi-web，本机E:/Recovery/jinxi-web。
- 分支仍codex/jinxi-005s-b1，HEAD仍ca0723eea3e1874c7dc3ddb76a7b52f074fac4b3；本次未创建提交。
- 远端认可基线codex/jinxi-005s-next-a-plus / d4769e719b2dd486b82cd2867f066d6c4dfa3e19。接管时连接器复核PR1–7均open/draft/未合并，B1分支搜索无结果。
- 原9个index内容保持不变。新修补为额外未暂存差异；只提交旧index不会包含本轮修复。
- 原19个证据文件保持字节一致。开始前备份9个暂存文件、19个证据、交接文档、index和完整patch，位置E:/Recovery/.jinxi-research/b1-takeover-20261105。没有PG凭据或.env。
- 本轮证据写到本目录，原失败runner/results/log保留。根交接文档只增加续验指引，原正文保留。

## 实际结果

| 检查 | 结果 |
| --- | --- |
| 原焦点失败 | 鼠标后程序focus稳定复现active=true/focus-visible=false/outline0；A+/B1真实Tab、Shift+Tab、稳定焦点和Enter通过，3px蓝轮廓及4px偏移未放宽 |
| B1完整矩阵 | 320/390/768/1024/1440，共26项通过；实际SQL、4/0/—、封面失败、不足3篇、缓存/重试/乱序、旧后端及独立详情 |
| 额外流程 | 3项：筛选/返回/历史、实际分页、约12秒取消停滞请求及恢复 |
| 详情异常回归 | 12篇实际合成攻略+1个坏DTO注入，无JS/React异常或写请求 |
| API | 14/14含父项；接管13项，新增1个详情读取边界回归 |
| 原生PG | 16/16含父项；另有1k/10k规模、14份实际EXPLAIN、四并发和数据不变验证，均通过，已恢复16条夹具 |
| 成员/画廊 | 8组通过，嵌套Modal和焦点返回保留 |
| 原入口/留言边界 | 17项通过，写入均隔离，不算生产写链路通过 |
| 头像外框 | 8组文字/照片替换/失败/恢复的几何及像素对照，框外变化0 |
| 展播/同行时光 | 50项通过；双向32px/s、暂停/触摸/键盘/离屏/reduced-motion、档案/日期与计时叶组件生命周期 |
| 真后台 | 实际visibilityState=hidden时轨道停止、动画0、时钟冻结，前台恢复 |
| 宣传片 | 五宽度键盘/触摸、真实主动播放/失败封面，preload=none、无初始Media，手机箭头和原高度通过 |
| 真200% | tabs.setZoom(2)，五宽度DPR2和半宽CSS视口；无新增横向溢出，既有极窄197px横宽仍在 |
| 独立tsc | exit2，28→28，完整诊断一致、新增0；未伪装为通过 |
| JS语法 | 6个B1产品Functions/共享文件通过 |
| 构建 | 最终隔离Node20成功；首页79.2kB、guides6.16kB、profile-lab14.3kB（Next报告，非线传输） |
| 性能 | 最终12组交替样本完成；慢手机2.5秒目标未达 |

4、200、2000都是**本机隔离合成附件数**，不是生产数量。档案208、创立日2018-02-10、在线—保持。

## 本次变更

既有暂存B1前端在本轮得到完整验收。新产品修补仅涉及：

- services/guide-service.ts：规范化历史完整详情的坏评论/附件及缺署名；有效地址继续交给原媒体安全策略。
- components/guides/guide-reader.tsx：缺失/非法评论时间显示“时间未提供”，不捏造日期。
- tests/guide-detail-read.test.cjs：实际读取边界先失败后修复的回归，package.json明确将其纳入无数据库test:api。
- tests/fixtures/guides.cjs：正常基线评论补齐必填署名/时间，原混合JSONB、坏URL、草稿/归档样本保留。坏评论由专门注入继续测试。

后端完整DTO、数据库结构/记录、会话/积分/权限、媒体嵌入白名单、头像外框与已认可构图/运动代码不改；不加依赖。

## 保留的失败及原因

1. 原焦点是输入模态不符。新runner按真实Tab顺序到卡片，同时断言activeElement、focus-visible和3px；纯键盘与A+对照通过，CSS未改。
2. 增强控制台检测后捕获预览故意返回的无关公告503。第一次失败和全部consoleErrors保留；只精确区分已知环境信息，其他JS/React异常仍会失败。
3. 缓存到期脚本在旧卡片仍存在时过早数请求。改为等待实际新成功响应，2次请求的标准保留。
4. 旧生命周期脚本平滑scrollTo在250ms后仍未到顶；只改成instant，原断言通过，产品代码未改。
5. 旧200%脚本生成扩展时正则转义丢失；修复临时扩展后真实setZoom、DPR和视口通过，没有用CSS zoom冒充。
6. 综合检查发现旧详情null.url和undefined.trim崩溃，A+/B1均可复现。本轮局部修复并补坏数据回归，不再避开该样本。修复前失败保留。

## 性能与生产边界

初始JS+4871B、CSS+63B；12个样本初始Media、攻略/统计API、完整阅读器代码为0，初始和推荐后CLS均0。慢手机LCP中位数 **A+2904→B12916ms**，未达2.5秒，3次小样本不足以判定速度改善。首次推荐约347ms、视频筛选约265ms，均为本机实验。见[PERFORMANCE.md](PERFORMANCE.md)。

积分P0、正式身份及旧内容写权限、CSRF/防滥用仍阻断生产；Neon托管、Netlify Linux/CI、真实手机和人工读屏未验。Lint缺配置。主out/1.mp4当前ENOENT，历史EPERM根因未证实；最终构建来自新隔离目录。见[SECURITY.md](SECURITY.md)。

## 复核入口与后续

当前[B1本机只读合成预览](http://127.0.0.1:3044/)；A+为3041，B1前端+旧后端为3045。均为临时loopback进程；先核对端口及preview-final-processes.json，不照抄PID。原授权PG仍运行，未停止。

最终产物E:/Recovery/.jinxi-research/b1-takeover-20261105/build-source/out，哈希见build-final-source.json。原checkpoint2/source/out保留，但不含本轮详情容错。

提交前审核原index和新差异，不能git add .。本轮没有新SHA、B1远端分支或PR。后续B1草稿PR仍以A+为base、依赖#7，不自动合并/部署；B2需独立授权。没有生产迁移；先保存当前工作再按文件/补丁撤回，禁止对脏工作区直接reset/clean。
