// Baseline-only read-only UI audit. All API traffic is intercepted in an isolated browser.
// Usage: node artifacts/rea-003/capture-extra.cjs (start detached baseline on 127.0.0.1:3010).
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright",
);
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.BASELINE_URL || "http://127.0.0.1:3010";
const out = path.join(__dirname, "before");
const baseline = "328819a57c671b33b743d1ad3f969c0fb7917048";
const widths = process.env.CAPTURE_WIDTHS
  ? process.env.CAPTURE_WIDTHS.split(",").map(Number)
  : [1440, 768, 390];
const messages = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
);
const stamp = "2026-11-04T12:00:00Z";
const strategy = {
  id: "ui-only-9001",
  title: "界面测试 · 配合练习笔记",
  content:
    "# 界面验收专用攻略\n\n这是合成 UI fixture，用来检查标题、正文、标签、媒体与评论。不是玩家真实攻略。\n\n## 练习步骤\n\n1. 交流思路\n2. 尝试配合\n3. 记录经验",
  author: "界面测试 · 小夕",
  category: "PVP",
  difficulty: 1,
  tags: ["UI fixture", "配合练习"],
  likes: [],
  favorites: [],
  comments: [
    {
      id: "ui-comment-1",
      userId: "ui-fixture",
      userName: "界面测试 · 阿星",
      content: "这是合成评论，只验证界面排版。",
      timestamp: stamp,
    },
  ],
  isPinned: true,
  imageUrl: "/1.png",
  mediaFiles: [
    {
      id: "ui-media-1",
      type: "image",
      url: "/1.png",
      title: "界面测试 · 现有公会素材",
      description: "仅复用仓库原有图片作为 UI 媒体 fixture",
    },
  ],
  viewCount: 0,
  status: "published",
  createdAt: stamp,
  updatedAt: stamp,
};
const fixtureAnnouncement = {
  id: "ui-announcement-1",
  title: "界面测试 · 公告示例",
  contentHtml: "<p>这是界面验收用的合成公告，非真实活动安排。</p>",
  author: "UI fixture",
  createdAt: stamp,
};
const results = {
  baseline,
  base,
  startedAt: new Date().toISOString(),
  widths,
  environment:
    "Local isolated Edge; no production API. All non-GET requests are intercepted. UI localStorage profile is not authentication.",
  automationCorrections: [
    "Initial announcement locator matched both preview and modal; scoped to dialog heading.",
    "Initial media click targeted covered image; actual visible caption bubbles to gallery card, now used. These were locator corrections, not business-code changes.",
  ],
  screenshots: [],
  checks: [],
  errors: [],
  apiRequests: [],
  blockedWrites: [],
  blockedExternal: [],
};
let browser;
const saveResults = () =>
  fs.writeFileSync(
    path.join(out, "capture-extra.json"),
    JSON.stringify(results, null, 2),
  );
async function createContext(auth = false) {
  const context = await browser.newContext({
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
  });
  if (auth)
    await context.addInitScript(() => {
      localStorage.setItem("jinxi-auth-account", "ui-fixture-only");
      localStorage.setItem(
        "jinxi-auth-profile",
        JSON.stringify({
          account: "ui-fixture-only",
          nickname: "界面测试 · 非真实登录",
          employeeNo: "ui-only",
          forceResetPassword: false,
        }),
      );
      localStorage.setItem("jinxi-user-id", "ui-fixture-only");
      localStorage.setItem("jinxi-user-name", "界面测试 · 非真实登录");
    });
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (!["GET", "HEAD"].includes(req.method())) {
      let body;
      try {
        body = req.postDataJSON();
      } catch {}
      const entry = {
        method: req.method(),
        path: url.pathname,
        action: body?.action || null,
        handling: "blocked-no-network",
      };
      results.blockedWrites.push(entry);
      // Opening the old detail UI awaits the existing view-count action. This synthetic
      // response permits UI inspection; it proves no actual increment/authorization.
      if (
        url.pathname.endsWith("/strategy-actions") &&
        body?.action === "view"
      ) {
        entry.handling = "synthetic-view-response-no-network";
        return route.fulfill({
          json: { success: true, data: { viewCount: 0 } },
        });
      }
      return route.fulfill({
        status: 403,
        json: {
          success: false,
          error: "UI audit: write blocked, no request sent",
        },
      });
    }
    if (url.pathname.startsWith("/.netlify/functions/")) {
      results.apiRequests.push({
        method: req.method(),
        path: url.pathname,
        query: url.search,
        handling: "synthetic-local-only",
      });
      if (url.pathname.endsWith("/messages"))
        return route.fulfill({ json: messages });
      if (url.pathname.endsWith("/strategies"))
        return route.fulfill({
          json: {
            strategies: [strategy],
            pagination: { total: 1, limit: 12, offset: 0, hasMore: false },
          },
        });
      if (url.pathname.endsWith("/announcements"))
        return route.fulfill({ json: [fixtureAnnouncement] });
      if (url.pathname.endsWith("/sponsorship"))
        return route.fulfill({
          json: {
            success: true,
            entries: [
              { id: 9001, sponsor: "界面测试 · 合成登记", time: "2026-11-04" },
            ],
          },
        });
      if (url.pathname.endsWith("/leaderboard"))
        return route.fulfill({
          json: {
            type: url.searchParams.get("type") || "total",
            entries: [
              {
                rank: 1,
                userId: "ui-fixture-only",
                userName: "界面测试 · 合成排行",
                value: 3,
                totalCheckins: 3,
                continuousCheckins: 1,
                totalPoints: 3,
              },
            ],
            updatedAt: stamp,
            totalUsers: 1,
          },
        });
      if (url.pathname.endsWith("/points-board"))
        return route.fulfill({
          json: {
            success: true,
            entries: [
              {
                userId: "ui-fixture-only",
                userName: "界面测试 · 合成排行",
                totalActivityPoints: 3,
                checkinPoints: 3,
                otherActivityPoints: 0,
                balance: 3,
              },
            ],
            sceneSummary: [{ scene: "checkin", points: 3 }],
            overview: {
              totalActivityPoints: 3,
              checkinPoints: 3,
              otherActivityPoints: 0,
            },
          },
        });
      if (url.pathname.endsWith("/points"))
        return route.fulfill({
          json: {
            account: {
              userId: "ui-fixture-only",
              balance: 0,
              totalEarned: 0,
              totalSpent: 0,
              updatedAt: stamp,
            },
            ledger: [],
            todayEarned: 0,
          },
        });
      return route.fulfill({
        status: 503,
        json: { error: "UI audit local failure fixture; no backend running" },
      });
    }
    if (url.origin === new URL(base).origin || url.protocol === "data:")
      return route.continue();
    // Do not contact production sites, upload endpoints, analytics, or account services.
    // Existing icon-font CDN is a read-only visual resource, permitted for legibility.
    if (
      req.method() === "GET" &&
      url.hostname === "cdn.jsdelivr.net" &&
      url.pathname.includes("/fonts/remixicon.")
    )
      return route.continue();
    results.blockedExternal.push({
      method: req.method(),
      host: url.hostname,
      path: url.pathname,
    });
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) =>
    results.errors.push({ type: "pageerror", message: e.message }),
  );
  page.on("dialog", async (dialog) => {
    results.checks.push({
      name: "browser-native-dialog",
      type: dialog.type(),
      message: dialog.message(),
      handling: "dismissed",
    });
    await dialog.dismiss();
  });
  return { context, page };
}
async function home(page, width) {
  await page.setViewportSize({ width, height: 960 });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator("h1").waitFor({ timeout: 90000 });
  await page.waitForTimeout(600);
}
async function closeAll(page) {
  for (let i = 0; i < 5 && (await page.locator("dialog[open]").count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
  }
}
async function shot(
  page,
  name,
  kind = "synthetic-ui-fixture",
  note = "",
  fullPage = false,
) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, name + ".png"), fullPage });
  results.screenshots.push({
    file: name + ".png",
    width: page.viewportSize().width,
    kind,
    note,
    openDialogs: await page.locator("dialog[open]").count(),
    url: page.url(),
  });
  saveResults();
  console.log("SHOT " + name);
}
async function step(page, name, fn) {
  try {
    await fn();
    results.checks.push({ name, result: "observed" });
  } catch (e) {
    results.checks.push({ name, result: "not-completed", reason: e.message });
    console.log("INCOMPLETE " + name + ": " + e.message.split("\n")[0]);
  } finally {
    await closeAll(page);
    saveResults();
  }
}
async function action(page, text) {
  await page.getByRole("button", { name: text, exact: true }).click();
  await page.waitForTimeout(450);
}
async function messagesOpen(page) {
  await page.locator(".community-door").first().click();
  await page.getByText(messages[0].content, { exact: true }).waitFor();
}
async function strategiesOpen(page) {
  await page.locator(".community-door").last().click();
  await page.getByText(strategy.title, { exact: true }).waitFor();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const guest = await createContext(false),
    member = await createContext(true);
  for (const width of widths) {
    const page = guest.page;
    await home(page, width);
    for (
      let y = 0;
      y < (await page.evaluate(() => document.documentElement.scrollHeight));
      y += 800
    ) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(80);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await shot(
      page,
      `homepage-full-${width}`,
      "baseline-ui-with-synthetic-api-preview",
      "首页静态结构与原始素材；公告预览为明确合成 fixture",
      true,
    );
    await step(page, "guest-checkin-" + width, async () => {
      await action(page, "去签到");
      await shot(
        page,
        `checkin-guest-${width}`,
        "anonymous-ui",
        "游客提示，无签到写入",
      );
    });
    await step(page, "rankings-" + width, async () => {
      await action(page, "查看排行");
      await shot(page, `rankings-fixture-${width}`);
      const panel = page.getByText("积分排行榜", { exact: true });
      await panel.scrollIntoViewIfNeeded();
      await shot(page, `points-ranking-${width}`);
    });
    await step(page, "announcements-" + width, async () => {
      await page.locator('aside[aria-label="公告栏"] > button').click();
      await page
        .locator("dialog[open]")
        .getByRole("heading", { name: fixtureAnnouncement.title, exact: true })
        .waitFor();
      await shot(page, `announcements-${width}`);
      const admin = page.locator('dialog[open] input[type="password"]');
      if (await admin.count()) {
        await admin.scrollIntoViewIfNeeded();
        await shot(page, `announcement-admin-${width}`);
      }
    });
    await step(page, "sponsorship-" + width, async () => {
      await page.getByRole("button", { name: "赞助公会", exact: true }).click();
      await page.getByText("界面测试 · 合成登记", { exact: true }).waitFor();
      await shot(page, `sponsorship-${width}`);
    });
    await step(page, "faq-" + width, async () => {
      const q = page.getByRole("button", { name: /要不要强制语音/ });
      await q.click();
      await q.scrollIntoViewIfNeeded();
      await shot(
        page,
        `faq-${width}`,
        "static-baseline-ui",
        "真实 FAQ 展开，不涉及 API",
      );
    });
    await step(page, "uptime-" + width, async () => {
      await page
        .getByRole("button", { name: "展开公会数据终端", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "公会数据终端", exact: true })
        .scrollIntoViewIfNeeded();
      await shot(
        page,
        `uptime-${width}`,
        "static-baseline-ui",
        "展开真实本地终端，没有查询生产档案",
      );
      await page
        .getByRole("button", { name: "折叠公会数据终端", exact: true })
        .click();
    });
    await step(page, "join-" + width, async () => {
      await page.locator(".hero-cta button").click();
      await shot(
        page,
        `join-${width}`,
        "static-baseline-ui",
        "只打开原表单，不发邮件",
      );
    });
    await step(page, "auth-" + width, async () => {
      if (width < 1101)
        await page
          .getByRole("button", { name: "打开导航", exact: true })
          .click();
      await page
        .locator(".nav-account")
        .getByRole("button", { name: "登录", exact: true })
        .click();
      await shot(
        page,
        `auth-${width}`,
        "anonymous-ui",
        "只打开登录表单，无登录请求",
      );
      await page
        .locator("dialog[open]")
        .getByRole("button", { name: "修改密码", exact: true })
        .click();
      await shot(
        page,
        `password-${width}`,
        "anonymous-ui",
        "只打开改密表单，无账号或密码写入",
      );
    });
    await step(page, "old-message-image-" + width, async () => {
      await messagesOpen(page);
      await page
        .getByText("点击或拖拽上传图片", { exact: true })
        .scrollIntoViewIfNeeded();
      await shot(
        page,
        `image-upload-${width}`,
        "synthetic-ui-fixture",
        "仅原图像选择区域，不提交文件/留言",
      );
      const img = page.locator("dialog[open] .message-wall img").first();
      await img.scrollIntoViewIfNeeded();
      await img.click();
      await shot(
        page,
        `message-image-${width}`,
        "synthetic-ui-fixture",
        "基线旧 fixed 图片层；仅一个原生父 dialog。截图不代表已修复 top-layer/焦点",
      );
      const dom = await page.evaluate(() => ({
        dialogCount: document.querySelectorAll("dialog[open]").length,
        imageLayers: [...document.querySelectorAll("dialog[open] .fixed")].map(
          (x) => ({
            className: x.className,
            zIndex: getComputedStyle(x).zIndex,
            rect: x.getBoundingClientRect().toJSON(),
          }),
        ),
        activeTag: document.activeElement?.tagName,
      }));
      await page.keyboard.press("Escape");
      dom.afterEscapeNativeDialogCount = await page
        .locator("dialog[open]")
        .count();
      results.checks.push({ name: "old-message-image-layer-" + width, dom });
    });
    await step(page, "old-admin-password-" + width, async () => {
      await messagesOpen(page);
      await page.getByTitle("取消置顶", { exact: true }).click();
      await page.getByPlaceholder("请输入管理密码", { exact: true }).waitFor();
      await shot(
        page,
        `admin-password-${width}`,
        "synthetic-ui-fixture",
        "旧 fixed 管理员密码层。只打开，不提交密码/置顶操作",
      );
      const dom = await page.evaluate(() => ({
        dialogCount: document.querySelectorAll("dialog[open]").length,
        activeTag: document.activeElement?.tagName,
        passwordFocused:
          document.activeElement?.getAttribute("placeholder") ===
          "请输入管理密码",
        passwordInNativeDialog: !!document.querySelector(
          'dialog[open] input[placeholder="请输入管理密码"]',
        ),
      }));
      dom.shiftTabFocus = [];
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Shift+Tab");
        dom.shiftTabFocus.push(
          await page.evaluate(() => ({
            tag: document.activeElement?.tagName,
            text: document.activeElement?.textContent?.trim().slice(0, 80),
            title: document.activeElement?.getAttribute("title"),
            placeholder: document.activeElement?.getAttribute("placeholder"),
          })),
        );
      }
      await page.keyboard.press("Escape");
      dom.afterEscapeNativeDialogCount = await page
        .locator("dialog[open]")
        .count();
      results.checks.push({ name: "old-admin-password-layer-" + width, dom });
    });
    // Reload clears React-only fixed overlays which old Escape does not close independently.
    await home(page, width);
    const mp = member.page;
    await home(mp, width);
    await step(mp, "tasks-local-fixture-" + width, async () => {
      await action(mp, "查看任务");
      await shot(
        mp,
        `tasks-${width}`,
        "localStorage-ui-fixture",
        "仅浏览器合成账号打开既有任务 UI，不是身份认证；进度是本地记录",
      );
    });
    await step(mp, "teams-local-fixture-" + width, async () => {
      await action(mp, "打开组队");
      await shot(
        mp,
        `teams-${width}`,
        "localStorage-ui-fixture",
        "既有默认本地队伍示例，不是线上公会队伍/排名",
      );
      await mp
        .locator("dialog[open]")
        .getByRole("button", { name: /排行榜/ })
        .click();
      await shot(mp, `teams-ranking-${width}`, "localStorage-ui-fixture");
    });
    await step(mp, "game-local-fixture-" + width, async () => {
      await action(mp, "打开面板");
      await shot(
        mp,
        `game-${width}`,
        "localStorage-ui-fixture",
        "既有默认装备示例，不是实时游戏数据",
      );
      await mp.getByRole("button", { name: /宠物/ }).first().click();
      await shot(mp, `game-pets-${width}`, "localStorage-ui-fixture");
      await mp.getByRole("button", { name: /角色/ }).first().click();
      await shot(mp, `game-character-${width}`, "localStorage-ui-fixture");
      await mp.getByRole("button", { name: /成就/ }).first().click();
      await shot(mp, `game-achievements-${width}`, "localStorage-ui-fixture");
    });
    await step(mp, "strategy-wall-" + width, async () => {
      await strategiesOpen(mp);
      await shot(mp, `strategies-${width}`);
    });
    await step(mp, "strategy-submission-" + width, async () => {
      await strategiesOpen(mp);
      await mp.getByRole("button", { name: /投稿攻略/ }).click();
      await shot(
        mp,
        `strategy-submission-${width}`,
        "synthetic-ui-fixture",
        "仅打开投稿，不提交；作者为本地 UI fixture",
      );
      const media = mp.getByRole("heading", {
        name: "通过URL添加媒体文件",
        exact: true,
      });
      await media.scrollIntoViewIfNeeded();
      await shot(mp, `media-upload-${width}`);
    });
    await step(mp, "strategy-detail-" + width, async () => {
      await strategiesOpen(mp);
      await mp.getByText(strategy.title, { exact: true }).click();
      await mp
        .locator("dialog[open]")
        .last()
        .getByRole("heading", { name: strategy.title, exact: true })
        .waitFor();
      await shot(
        mp,
        `strategy-detail-${width}`,
        "synthetic-ui-fixture",
        "详情 view POST 已拦截并合成响应，未真实增加浏览量",
      );
      const media = mp.getByText("界面测试 · 现有公会素材", { exact: true });
      await media.scrollIntoViewIfNeeded();
      await shot(mp, `media-gallery-${width}`);
      await media.click();
      await shot(mp, `media-preview-${width}`);
    });
  }
  await guest.context.close();
  await member.context.close();
  results.completedAt = new Date().toISOString();
  saveResults();
})()
  .catch((e) => {
    results.fatal = e.message;
    saveResults();
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    saveResults();
  });
