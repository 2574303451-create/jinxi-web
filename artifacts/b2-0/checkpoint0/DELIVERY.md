# B2-0 检查点0：B1最终复核

基线115bf854a7977a3e582a89af13459115178a1e31（PR8）。PR1–8均draft/open/未合并，基线当前无可确认Check/Workflow。核对记录在../github-baseline.json。

本机API14/14、原生PG16/16、五宽度完整浏览器矩阵26项重验通过。视频统计为published有效URL附件，4为合成数量、真实空表0、失败—；latest/video/pinned先SQL过滤再LIMIT3；各feed缓存和到期/重试/乱序、旧契约提示、无初始视频/攻略请求/阅读器、坏附件/评论不崩溃等均复验。原始runner只调整本机端口和重复截图输出，断言保留。

新增真实PG thumbnail-only用例先失败：imageUrl=null而预期/14.png（thumbnail-before.txt）。修补只在SQL cover投影增加第三层：原合法独立封面→首个合法image附件→首个合法video附件的合法thumbnail。thumbnail和video URL均走现有严格策略；非法javascript缩略图不展示，不捏造图片。PG四种优先级/安全样本通过（thumbnail-after.txt）；实际SQL→HTTP摘要→原首页卡浏览器通过，截图thumbnail-only-390.png已标合成。样本插入后finally按固定ID/标题删除，原16条夹具和视频4恢复。

最初测试夹具的参数类型冲突是测试前置错误，日志保留thumbnail-fixture-first-failure.txt；修复后才复现产品缺口，不把前置错误当产品失败。

产品只改netlify/functions/_shared/strategy-media.js，无首页组件、CSS、头像、成员资料或动效改动；无需更换已有B1前端静态产物。test:postgres将新PG回归纳入并按文件串行执行，避免并发重置专用库。既有B1预览3044已固定到B1源码副本，当前开发使用独立3047端口。

这是本机合成复核，不是生产验收。既有28项TS、Lint/CI缺口和生产P0留待后续检查点；未生产写入、部署、合并、真实会话、头像上传或在线心跳。回退只需revert本检查点SQL/测试提交，无数据库迁移。
