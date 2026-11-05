const fs = require("node:fs"),
  path = require("node:path");
const root = __dirname,
  file = path.join(root, "UI_AUDIT.md");
const before = (name) => {
  for (const width of [1440, 768, 390]) {
    if (!fs.existsSync(path.join(root, "before", name + "-" + width + ".png")))
      throw new Error("Missing baseline screenshot: " + name + "-" + width);
  }
  return "`before/" + name + "-{1440,768,390}.png`";
};
const mapping = {
  加入横幅与页脚: before("homepage-full") + "；表单见 " + before("join"),
  "留言标题/筛选/发布表单":
    before("messages-form") + "；改造后 focus 见 `after/messages-form-focus-*`",
  "留言卡/置顶/反应/回复":
    before("messages-card") + "；第一批回复/选中测试见 DELIVERY.md",
  "留言加载/空/错误":
    before("messages-loading") +
    "、" +
    before("messages-empty") +
    "、" +
    before("messages-error") +
    "（拦截 fixture）",
  留言图片预览:
    before("message-image") +
    "；基线只有父原生 dialog，子 fixed 层可见但无独立焦点圈定",
  "图片选择/错误/移除":
    before("image-upload") +
    "；第一批大小/类型/移除已做内存 UI 测试，见 DELIVERY.md",
  管理员密码验证:
    before("admin-password") +
    "；第一批验证错误/重试见 `after/messages-admin-error.png`，非真实后端授权",
  成员轮播舞台与控制:
    before("carousel") + "；第一批键盘/触摸/自动/空状态结果见 DELIVERY.md",
  "成员角色筛选/网格/加载更多":
    before("members") + "；第一批筛选/缺图/空状态见 DELIVERY.md",
  "成员详情 ":
    before("member-detail") + "；第一批二层返回/缺图/长文见 DELIVERY.md",
  通用业务弹窗:
    before("member-detail") +
    "；独立焦点/二层滚动锁已在第一批测试，见 DELIVERY.md",
  图片资源回退:
    "基线图片选择见 " +
    before("image-upload") +
    "；第一批 `after/member-image-loading-*` / `after/member-image-fallback-*` / `after/message-image-error-*`",
  "攻略墙/搜索/分类/难度/排序/卡片":
    before("strategies") + "（明确合成攻略 fixture）",
  "攻略详情/评论":
    before("strategy-detail") + "（合成内容；view POST 本地截断）",
  "攻略投稿/预览/标签": before("strategy-submission") + "；仅打开表单，不投稿",
  "攻略媒体选择/预览":
    before("media-upload") +
    "、" +
    before("media-gallery") +
    "、" +
    before("media-preview"),
  签到与历史:
    before("checkin-guest") +
    "；仅游客，真实有数据/历史/写入尚未验证，第二批处理",
  "每日/每周/成就任务":
    before("tasks") + "；本地 UI 身份 fixture，不代表登录或奖励验证",
  签到排行榜:
    before("rankings-fixture") +
    "；三宽度合成正常态，基线其他状态仍待第二批测试",
  活动积分排行榜:
    before("points-ranking") + "；合成正常态，不扩散账号/余额至首页",
  "组队列表/排行/当前队伍/申请":
    before("teams") + "、" + before("teams-ranking") + "；原浏览器本地默认示例",
  "游戏装备/宠物/角色/成就":
    before("game") +
    "、" +
    before("game-pets") +
    "、" +
    before("game-character") +
    "、" +
    before("game-achievements"),
  公告列表与管理员校验:
    before("announcements") +
    "、" +
    before("announcement-admin") +
    "；未验证真实权限或发布",
  "赞助/登记/感谢名单":
    before("sponsorship") + "；合成登记数据，没有支付/登记写入",
  运行时间终端: before("uptime") + "；展开的真实本地终端，未查询生产档案",
  "FAQ ": before("faq") + "；真实静态问答展开",
  "加入表单/邮件进度与回退":
    before("join") + "；未发真实邮件，发送/失败进度未验证",
  "登录/修改密码/显隐密码":
    before("auth") + "、" + before("password") + "；无登录/改密请求",
};
let text = fs.readFileSync(file, "utf8");
text = text
  .split("\n")
  .map((line) => {
    for (const [prefix, value] of Object.entries(mapping)) {
      if (line.startsWith("| " + prefix))
        return line.replace(/\|[^|]*\|\s*$/, "| " + value + " |");
    }
    return line;
  })
  .join("\n");
text = text.replace(
  "也被攻略投稿共享",
  "基线仅留言调用，攻略使用独立 MediaUpload",
);
const marker = "## 浏览器补充清查与第一批现状";
if (!text.includes(marker))
  text +=
    "\n\n" +
    marker +
    "\n\n已在独立 detached worktree `E:/Recovery/jinxi-rea-003-baseline` 运行同一固定基线，完成其余真实入口的三宽度截图，详情见 `before/capture-extra-1440-390.json` 和 `before/capture-extra.json`（768）。两次采样 errors 均为空；浏览器 localStorage 只模拟 UI 状态，全部 API 请求拦截，攻略浏览量 POST 仅本地返回，未触达生产。`before/capture.json` 记录第一批原状的三宽度捕获。\n\n表中 R/W/M/U 仍指基线源码，供第二、三批追踪。本轮已经真正重构留言墙、成员轮播/列表/详情，新增公开留言展播，重构必要共享管理员验证和图片组件；具体 after 截图、当前文件清单与测试结果见 [DELIVERY.md](DELIVERY.md)。不把旧样式兼容层仍存在的其余组件算作完成。\n\n真实浏览器补充发现旧留言 fixed 图片层和管理员层实际可见，不能一概说被原生 top-layer 遮挡。实测只有一个父原生 dialog，子层没有独立 Escape/焦点管理，按 Escape 会直接关闭父层。第一批改为独立嵌套 dialog 后验证只关闭最上层，并回到触发控件。\n";
fs.writeFileSync(file, text);
