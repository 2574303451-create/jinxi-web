首页的React.lazy攻略墙仍无条件挂载，实际提前下载了攻略/投稿/媒体代码。本PR完成JINXI-ARCH-005第一阶段：把入口改为同域`/guides/`独立静态路由，增加只读SQL分页、摘要和published详情读取，并提供明确隔离的`/profile-lab/`头像原型及完整会话/存储/模型设计。

保留已认可首页、双行展播、同行时光、留言墙布局和成员画廊。攻略支持搜索/分类/难度/排序/页码、按ID分享与刷新、阅读/评论/点赞收藏/原管理员验证/投稿和媒体展示；详情/投稿按需加载，首页不请求攻略API、不预取大模块。未知静态路由改为404。原POST与strategy-actions、认证/积分服务、schema、档案和依赖锁文件均未改；没有执行真实数据库或生产写入。

头像仅合成账号与本机IndexedDB：JPEG/PNG/WebP校验、裁剪为128pxWebP，32/48/64展示、失败保留、恢复默认、缺图回退、同名游客区分、实际留言墙/回复/双行展播联动。页面和保存提示明确非生产；浏览器会话模型不是服务端安全。真实Cookie会话、CSRF、限流、上传重编码、Blobs/R2授权、身份外键与迁移均为待批准设计，未实施。Blobs同site预览的权限隔离不能仅靠store名，方案已列为阻断核验项。

验证：110组浏览器检查通过（28新流程、7网络/CSP合约、50前轮A回归、8成员、17既有入口），另有SQL参数/模型检查和实际移动Performance录制。首页四宽度顶部600px像素差均为0。独立TypeScript仍28项历史错误，原始差异保留，除同义member/founder联合类型显示顺序外完整匹配，无新增语义诊断。构建通过：首页71.2kB/165kB，guides5.02kB/93kB，profile-lab14.1kB/108kB。Lint缺配置，test:api缺test-api.js，真实Postgres/Netlify托管层尚未验证。

性能实测不等于“拆页一定更快”：首页原始JS644359→587104字节、离线gzip188866→176062字节；正常缓存的CPU6×慢手机，首次进入攻略1233→1509ms，独立页面略慢。完整瀑布、post-GC内存、原始trace、缓存禁用的更差样本和限制均保留，不宣称线上LCP/INP达标。推荐B基于首页负担、阅读与分享体验。

旧投稿在隔离VM/fake SQL下仍接受任意客户端署名；积分身份/奖励/兑换信任P0仍在。不能把本PR当生产认证或权限修复。用户验收本阶段后，才进入真实会话、对象存储和数据库迁移；不合并、不发布生产。

基线：`ffa71f8313d3f9895d1b664404c29fa8dbb2dda1`，本PR依赖未合并PR #3（其依赖#2、#1），base=`codex/jinxi-ui-004-a`。

- [完整交付、修改文件、限制和回滚](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-arch-005/artifacts/arch-005/DELIVERY.md)
- [攻略架构与性能评估](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-arch-005/artifacts/arch-005/GUIDE_ASSESSMENT.md)
- [会话、头像、存储费用与数据模型](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-arch-005/artifacts/arch-005/IDENTITY_ARCHITECTURE.md)
- [桌面攻略原型截图](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-arch-005/artifacts/arch-005/guides-list-1440.png)
- [手机头像裁剪截图](https://github.com/2574303451-create/jinxi-web/blob/codex/jinxi-arch-005/artifacts/arch-005/avatar-crop-390.png)

[本机隔离预览](http://127.0.0.1:3021/review-preview/) · [攻略中心](http://127.0.0.1:3021/guides/) · [头像原型](http://127.0.0.1:3021/profile-lab/) · [截图总览](http://127.0.0.1:3021/review/)。仅运行该项目的电脑可用，全部数据明确为合成，未连接生产。
