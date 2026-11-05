const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.BASELINE_URL || "http://127.0.0.1:3010";
const out = path.join(__dirname, "before");
fs.mkdirSync(out, { recursive: true });
// Synthetic public records, intercepted in the browser. No production writes.
const messages = [
  {
    id: 9001,
    name: "界面测试 · 小夕",
    content:
      "这是界面验收专用留言。今晚一起练习配合，也欢迎新伙伴分享自己的打法。",
    category: "闲聊",
    color: "#3b82f6",
    isPinned: true,
    timestamp: "2026-11-04T12:00:00Z",
    imageUrl: "/1.png",
    reactions: [{ type: "👍", count: 2, users: ["fixture-a", "fixture-b"] }],
    replies: [
      {
        id: "r1",
        name: "界面测试 · 阿星",
        content: "收到，配合练习见！",
        color: "#22c55e",
        timestamp: "2026-11-04T13:00:00Z",
      },
    ],
  },
  {
    id: 9002,
    name: "界面测试 · 阿星",
    content: "想请教一下角度和力度的搭配，有没有适合新手练习的方式？",
    category: "求助",
    color: "#22c55e",
    isPinned: false,
    timestamp: "2026-11-04T11:00:00Z",
    reactions: [],
    replies: [],
  },
  {
    id: 9003,
    name: "界面测试 · 团子",
    content: "这一局虽然没赢，但和大家一起玩的过程很开心。下次继续！",
    category: "闲聊",
    color: "#f59e0b",
    isPinned: false,
    timestamp: "2026-11-04T10:00:00Z",
    reactions: [],
    replies: [],
  },
];
fs.writeFileSync(
  path.join(__dirname, "ui-fixture.json"),
  JSON.stringify(messages, null, 2),
);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    let mode = "data";
    await context.route("**/.netlify/functions/**", (route) => {
      const req = route.request();
      if (req.method() !== "GET") return route.abort();
      if (req.url().includes("/messages")) {
        if (mode === "loading")
          return new Promise((resolve) =>
            setTimeout(
              () => resolve(route.fulfill({ json: messages }).catch(() => {})),
              12000,
            ),
          );
        return route.fulfill({
          status: mode === "error" ? 503 : 200,
          json:
            mode === "error"
              ? { error: "UI fixture" }
              : mode === "empty"
                ? []
                : messages,
        });
      }
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    const shot = async (name) => {
      await page.waitForFunction(() =>
        [...document.images]
          .filter((image) => {
            const r = image.getBoundingClientRect();
            return r.width > 0 && r.top < innerHeight && r.bottom > 0;
          })
          .every((image) => image.complete),
      );
      await page.screenshot({ path: path.join(out, name + ".png") });
    };
    const open = async (name) => {
      await page.getByRole("button", { name, exact: true }).click();
    await page.mouse.move(1, 1);
      await page.waitForTimeout(1200);
      await page
        .locator("dialog[open]")
        .evaluateAll((dialogs) =>
          dialogs.forEach((dialog) => (dialog.scrollTop = 0)),
        );
    };
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(() => scrollTo(0, 0));
      await shot(`homepage-${width}`);
      await page.locator(".community-door").first().click();
      await page.waitForTimeout(700);
      await shot(`messages-form-${width}`);
      const card = page.getByText(messages[0].content, { exact: true });
      await card.scrollIntoViewIfNeeded();
      await shot(`messages-card-${width}`);
      await page.keyboard.press("Escape");
      await open("查看全部");
      await shot(`members-${width}`);
      await page
        .locator('dialog[open] .member-grid [role="button"]')
        .first()
        .click();
      await page.waitForTimeout(1200);
      await shot(`member-detail-${width}`);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await open("打开轮播展示");
      await shot(`carousel-${width}`);
      await page.keyboard.press("Escape");
      for (const state of ["empty", "error", "loading"]) {
        mode = state;
        await page.locator(".community-door").first().click();
        await page.waitForTimeout(state === "loading" ? 250 : 400);
        await shot(`messages-${state}-${width}`);
        await page.keyboard.press("Escape");
      }
      mode = "data";
    }
    // Remaining baseline surfaces are captured by capture-extra.cjs.
    fs.writeFileSync(
      path.join(out, "capture.json"),
      JSON.stringify(
        {
          baseline: "328819a57c671b33b743d1ad3f969c0fb7917048",
          widths: [1440, 768, 390],
          environment:
            "Local Edge, intercepted synthetic UI records only; no database writes.",
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
