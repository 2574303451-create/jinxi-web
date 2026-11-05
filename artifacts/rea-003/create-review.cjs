const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright",
);
const root = __dirname;
const names = {
  messages: "留言墙 · 阅读",
  composer: "留言发布表单",
  card: "留言卡片",
  members: "成员列表",
  detail: "成员详情",
  carousel: "成员轮播",
  showcase: "公开留言展播",
};
const pairs = {
  messages: ["before/messages-form-{w}.png", "after/messages-{w}.png"],
  composer: [
    "before/messages-form-{w}.png",
    "after/messages-form-focus-{w}.png",
  ],
  card: ["before/messages-card-{w}.png", "after/messages-card-{w}.png"],
  members: ["before/members-{w}.png", "after/members-{w}.png"],
  detail: ["before/member-detail-{w}.png", "after/member-detail-{w}.png"],
  carousel: ["before/carousel-{w}.png", "after/carousel-{w}.png"],
  showcase: ["reference/testimonials-band-{w}.png", "after/showcase-{w}.png"],
};
const widths = [1440, 768, 390];
const css =
  '*{box-sizing:border-box}body{margin:0;background:#f8f8f8;color:#101828;font:15px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1480px;margin:auto;padding:24px}h1{font-size:28px;line-height:1.4;margin:6px 0 12px}h2{font-size:22px;margin-top:32px}p{margin:8px 0;color:#52627a}a{color:#1644ae;text-underline-offset:3px}header{padding:24px;background:#fff;border-bottom:2px solid #151515}.note{background:#fff6b0;border:2px solid #151515;padding:14px 18px;border-radius:12px}select,button{min-height:44px;border:2px solid #151515;border-radius:10px;padding:8px 14px;background:white;color:#101828;font:inherit}label{display:inline-flex;align-items:center;gap:10px;margin:10px 18px 10px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;align-items:start}figure{margin:0;background:#fff;border:2px solid #151515;border-radius:12px;overflow:hidden;box-shadow:4px 4px 0 #151515}figcaption{padding:10px 16px;border-bottom:2px solid #151515;font-weight:800}figure img{display:block;width:100%;height:auto}.files{display:flex;flex-wrap:wrap;gap:10px 22px;margin-bottom:20px}.states{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}.states figure{margin-top:14px}.states figcaption{font-size:12px}.states img{max-height:380px;object-fit:cover;object-position:top}.columns{display:grid;grid-template-columns:1fr 1fr;gap:32px}li{margin-bottom:8px}code{overflow-wrap:anywhere}@media(max-width:700px){main,header{padding:18px}.pair,.columns{grid-template-columns:1fr}h1{font-size:24px}}';
const stateFiles = fs
  .readdirSync(path.join(root, "after"))
  .filter(
    (f) =>
      f.endsWith(".png") &&
      /empty|loading|error|focus|hover|pressed|paused|reply|image|admin|located|single/.test(
        f,
      ),
  );
const stateHTML = stateFiles
  .map(
    (f) =>
      `<figure><figcaption><a target="_blank" href="after/${encodeURIComponent(f)}">${f}</a></figcaption><img src="after/${encodeURIComponent(f)}" loading="lazy" alt="${f}"></figure>`,
  )
  .join("");
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JINXI-REA-003 第一批验收对照</title><style>${css}</style><header><div style="max-width:1440px;margin:auto"><small>JINXI-REA-003 / 第一批组件</small><h1>保留首页，统一留言与成员体验。</h1><p>基线 328819a57c671b33b743d1ad3f969c0fb7917048 · 真实本机 Edge 截图 · 1440 / 768 / 390</p></div></header><main><div class="note">留言、攻略、账号状态和 API 成功响应均使用明确的合成测试数据。成员素材沿用原项目。截图与内存测试不能证明真实数据库写入、登录或服务端管理员授权成功。</div><div class="files"><a href="/">打开只读交互预览</a><a href="UI_AUDIT.md">全站 UI 审计</a><a href="reference/REPORT.md">REA 定向报告</a><a href="DELIVERY.md">交付与测试说明</a><a href="VISUAL_REVIEW.md">两轮视觉复查记录</a></div><label>组件 <select id="module">${Object.keys(
  names,
)
  .map((k) => `<option value="${k}">${names[k]}</option>`)
  .join(
    "",
  )}</select></label><label>视口 <select id="width">${widths.map((w) => `<option>${w}</option>`).join("")}</select></label><p id="context"></p><div class="pair"><figure><figcaption id="before-label">改造前</figcaption><a id="before-link" target="_blank"><img id="before-img" alt="改造前真实截图"></a></figure><figure><figcaption>第一批完成后</figcaption><a id="after-link" target="_blank"><img id="after-img" alt="改造后真实截图"></a></figure></div><h2>状态与交互截图</h2><p>加载、空、失败、聚焦、悬停、配图预览、管理员验证和边界数据。文件名保留对应视口。点击查看原图。</p><div class="states">${stateHTML}</div><h2>验收边界</h2><div class="columns"><div><p>已实现第一批：留言墙、公开留言展播、成员轮播、成员列表与详情、必要弹窗及图片基础组件。</p><p>第二批：攻略/投稿/详情/媒体、签到、任务、积分和排行榜。</p><p>第三批：组队、游戏数据、公告、赞助、终端、FAQ、加入、账号与反馈。</p></div><div><p>公开 API 只返回最近100条，无可见性/审核字段或单条查询。展播最多12条，按当前公开数组定位；删除或超出范围显示明确提示。</p><p>积分 P0 授权问题仍未解决。真实写入、真实设备触摸和屏幕阅读器人工验收未完成。</p></div></div></main><script>const pairs=${JSON.stringify(pairs)};function update(){const m=document.getElementById('module').value,w=document.getElementById('width').value;for(const [i,k]of ['before','after'].entries()){const src=pairs[m][i].replace('{w}',w);document.getElementById(k+'-img').src=src;document.getElementById(k+'-link').href=src}document.getElementById('before-label').textContent=m==='showcase'?'参考站实际留言带（非今夕素材）':'已认可基线中的旧组件';document.getElementById('context').textContent=m==='showcase'?'展播是新增组件，左侧为参考站实测；今夕使用公开 API，并原创增强暂停、手动浏览与减少动态。':'左右同一视口。手机发布表单改为可展开，默认先阅读；成员原始数据未变。'}document.querySelectorAll('select').forEach(e=>e.addEventListener('change',update));update();</script></html>`;
fs.writeFileSync(path.join(root, "index.html"), html);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    for (const module of [
      "messages",
      "members",
      "detail",
      "carousel",
      "showcase",
    ])
      for (const width of widths) {
        const outputWidth = width === 1440 ? 1800 : width === 768 ? 1560 : 840;
        const [a, b] = pairs[module].map(
          (p) =>
            "data:image/png;base64," +
            fs
              .readFileSync(path.join(root, p.replace("{w}", width)))
              .toString("base64"),
        );
        await page.setViewportSize({ width: outputWidth, height: 1100 });
        await page.setContent(
          `<html lang="zh-CN"><meta charset="utf-8"><style>${css}main{max-width:none;padding:24px}.pair{margin-top:16px}h1{font-size:24px}</style><main><h1>${names[module]} · ${width}px</h1><p>JINXI-REA-003 · 合成留言仅用于界面验收，原始成员素材保留 · 点击原图以查看细节</p><div class="pair"><figure><figcaption>${module === "showcase" ? "mdldm 实测参考（研究素材）" : "改造前 · 328819a"}</figcaption><img src="${a}"></figure><figure><figcaption>今夕 · 第一批完成后</figcaption><img src="${b}"></figure></div></main></html>`,
        );
        await page.waitForFunction(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth > 0),
        );
        await page.screenshot({
          path: path.join(root, `compare-${module}-${width}.png`),
          fullPage: true,
        });
      }
    const tiles = [];
    for (const module of [
      "messages",
      "members",
      "detail",
      "carousel",
      "showcase",
    ])
      for (const width of widths) {
        const file = `compare-${module}-${width}.png`;
        tiles.push(
          `<figure><figcaption>${names[module]} / ${width}</figcaption><img src="data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString("base64")}"></figure>`,
        );
      }
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.setContent(
      `<html lang="zh-CN"><meta charset="utf-8"><style>${css}main{max-width:none}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}figure img{height:690px;object-fit:contain;object-position:top}</style><main><h1>第一批三宽度对照总览</h1><p>每格左侧为基线（展播为参考站），右侧为今夕第一批。完整原图见验收页。</p><div class="grid">${tiles.join("")}</div></main></html>`,
    );
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    await page.screenshot({
      path: path.join(root, "visual-contact-sheet.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
