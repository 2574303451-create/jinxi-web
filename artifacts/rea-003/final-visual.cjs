const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const out = path.join(__dirname, "after"),
  fixture = JSON.parse(
    fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
  );
async function ready(page) {
  await page.waitForFunction(() =>
    [...document.images]
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width && r.height && r.top < innerHeight && r.bottom > 0;
      })
      .every((img) => img.complete),
  );
  await page.waitForTimeout(80);
}
async function shot(page, name) {
  await ready(page);
  await page.screenshot({ path: path.join(out, name + ".png") });
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      locale: "zh-CN",
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
    });
    await context.route("**/.netlify/functions/**", (r) =>
      r.request().method() === "GET"
        ? r.fulfill({
            json: r.request().url().includes("/messages") ? fixture : [],
          })
        : r.abort(),
    );
    const page = await context.newPage();
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:3004", {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".message-ribbon-card").first().waitFor();
    const layouts = [];
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        scrollTo(0, 0);
      });
      await shot(page, `homepage-${width}`);
      await page.locator(".message-showcase").scrollIntoViewIfNeeded();
      await shot(page, `showcase-${width}`);
      await page.locator(".community-door").first().click();
      await page.locator(".message-card").first().waitFor();
      await page.waitForFunction(
        (expected) =>
          document.querySelector(".message-composer-disclosure")?.open ===
          expected,
        width > 800,
      );
      await shot(page, `messages-${width}`);
      const details = page.locator(".message-composer-disclosure");
      if (!(await details.evaluate((el) => el.open)))
        await details.locator("summary").click();
      await page
        .getByLabel("想说的话", { exact: false })
        .fill("界面状态检查，尚未发送。");
      await page.getByLabel("想说的话", { exact: false }).focus();
      await shot(page, `messages-form-focus-${width}`);
      await page.locator(".message-card").first().scrollIntoViewIfNeeded();
      await shot(page, `messages-card-${width}`);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "查看全部", exact: true }).click();
      await page.locator(".member-directory-card").first().waitFor();
      await page.waitForFunction(
        () => document.querySelector("dialog[open]")?.scrollTop === 0,
      );
      await shot(page, `members-${width}`);
      await page.locator(".member-directory-card").first().click();
      await page.locator(".member-profile").waitFor();
      await shot(page, `member-detail-${width}`);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "打开轮播展示" }).click();
      await page.locator(".member-carousel").waitFor();
      await shot(page, `carousel-${width}`);
      const layout = await page.evaluate(() => {
        const el = document.querySelector("dialog[open]"),
          art = document.querySelector(".member-carousel-art"),
          controls = document.querySelector(".member-carousel-controls");
        return {
          width: innerWidth,
          overflow: el.scrollWidth > el.clientWidth,
          artHeight: art.getBoundingClientRect().height,
          controls: controls.getBoundingClientRect().toJSON(),
        };
      });
      assert.equal(layout.overflow, false);
      if (width === 390) assert(layout.controls.bottom < 945);
      layouts.push(layout);
      await page.getByRole("button", { name: "下一张", exact: true }).click();
      assert(
        (await page.locator(".carousel-pagination").innerText()).startsWith(
          "2",
        ),
      );
      await page
        .getByRole("button", { name: "查看成员详情", exact: false })
        .click();
      await page.locator(".member-profile").waitFor();
      await shot(page, `carousel-detail-${width}`);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog[open]").count(), 1);
      await page.keyboard.press("Escape");
      await page.evaluate(() => scrollTo(0, 0));
      await ready(page);
      await page.screenshot({
        path: path.join(out, `homepage-full-${width}.png`),
        fullPage: true,
      });
    }
    fs.writeFileSync(
      path.join(__dirname, "final-layouts.json"),
      JSON.stringify(
        {
          layouts,
          passed: true,
          environment:
            "Final visual review with intercepted synthetic public messages. No writes.",
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
