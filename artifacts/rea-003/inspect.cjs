const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    const fixture = JSON.parse(
      fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
    );
    await context.route("**/.netlify/functions/**", (r) =>
      r.request().method() === "GET"
        ? r.fulfill({
            json: r.request().url().includes("/messages") ? fixture : [],
          })
        : r.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:3004", { waitUntil: "networkidle" });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const [selector, name] of [
        [".community-door", "messages"],
        ['button[aria-label="打开轮播展示"]', "carousel"],
      ]) {
        if (name === "messages") await page.locator(selector).first().click();
        else await page.getByRole("button", { name: "打开轮播展示" }).click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(__dirname, `initial-${name}-${width}.png`),
        });
        await page.keyboard.press("Escape");
      }
      await page.getByRole("button", { name: "查看全部", exact: true }).click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(__dirname, `initial-members-${width}.png`),
      });
      await page.locator(".member-directory-card").first().click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(__dirname, `initial-member-detail-${width}.png`),
      });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.locator(".message-showcase").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(__dirname, `initial-showcase-${width}.png`),
      });
    }
    console.log(JSON.stringify({ errors }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
