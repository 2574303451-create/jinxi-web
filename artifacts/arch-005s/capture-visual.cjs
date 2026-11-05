const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      headless: true,
    }),
    results = [];
  try {
    for (const width of [1440, 390])
      for (const stage of ["before", "after"]) {
        const context = await browser.newContext({
            viewport: { width, height: 1000 },
            locale: "zh-CN",
            reducedMotion: "reduce",
            hasTouch: width === 390,
          }),
          page = await context.newPage();
        await page.goto(
          `http://127.0.0.1:${stage === "before" ? 3026 : 3027}/`,
          { waitUntil: "networkidle" },
        );
        for (
          let y = 0;
          y <
          (await page.evaluate(() => document.documentElement.scrollHeight));
          y += 800
        ) {
          await page.evaluate(
            (y) => window.scrollTo({ top: y, behavior: "instant" }),
            y,
          );
          await page.waitForTimeout(110);
        }
        await page.waitForFunction(() =>
          [...document.images].every((img) => img.complete),
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: path.join(__dirname, `${stage}-full-${width}.png`),
          fullPage: true,
        });
        if (stage === "after") {
          await page.addStyleTag({
            content: '[class*="cyberAnnFab"]{visibility:hidden}',
          });
          for (const id of ["guild-facts", "home-guides"]) {
            await page.locator("#" + id).scrollIntoViewIfNeeded();
            await page.mouse.move(1, 1);
            await page
              .locator("#" + id)
              .screenshot({
                path: path.join(__dirname, `final-${id}-${width}.png`),
              });
          }
          if (width === 1440) {
            await page.emulateMedia({ reducedMotion: "no-preference" });
            const card = page.locator("[data-home-guide]").first();
            await card.hover();
            await page.waitForTimeout(350);
            const style = await card.evaluate((el) => {
              const s = getComputedStyle(el);
              return {
                transform: s.transform,
                shadow: s.boxShadow,
                duration: s.transitionDuration,
              };
            });
            assert.equal(style.transform, "matrix(1, 0, 0, 1, 0, -4)");
            await card.screenshot({
              path: path.join(__dirname, "new-card-hover-1440.png"),
            });
            await page.emulateMedia({ reducedMotion: "reduce" });
            assert.equal(
              await card.evaluate((el) => getComputedStyle(el).transform),
              "none",
            );
            results.push({
              width,
              hover: style,
              reducedMotionTransform: "none",
            });
          }
          if (width === 390) {
            await page
              .locator("#home-guides")
              .getByRole("button", { name: "视频附件", exact: true })
              .tap();
            await page
              .getByText("这批公开内容尚无视频附件", { exact: true })
              .waitFor();
            await page
              .locator("#home-guides")
              .getByRole("button", { name: "公开更新", exact: true })
              .tap();
            await page.locator("[data-home-guide]").first().tap();
            await page.waitForURL("**/guides/?id=*");
            await page.locator(".guide-reader h1").waitFor();
            results.push({ width, touchFilterAndNavigation: true });
          }
        }
        await context.close();
      }
    fs.writeFileSync(
      path.join(__dirname, "visual-check-results.json"),
      JSON.stringify(
        {
          passed: true,
          results,
          method:
            "Actual baseline/current full-page captures with public snapshot. Component closeups hide only the old floating announcement button through test-only CSS to avoid covering cards; full-page images keep it. Real-source titles untouched. Hover/reduced and native touch taps checked, no online/data writes.",
        },
        null,
        2,
      ),
    );
    console.log("PASS full-page, component closeups, hover/reduced and touch");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
