const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const results = [];
  try {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      locale: "zh-CN",
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3006/preview-app/", {
      waitUntil: "domcontentloaded",
    });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.locator(".community-door").first().click();
      await page.locator(".message-card").first().waitFor();
      await page.waitForTimeout(300);
      const details = page.locator(".message-composer-disclosure");
      const state = await details.evaluate((el) => ({
        width: innerWidth,
        open: el.open,
        formDisplay: getComputedStyle(el.querySelector("form")).display,
        formHeight: el.querySelector("form").getBoundingClientRect().height,
        formRects: el.querySelector("form").getClientRects().length,
      }));
      results.push({
        name: "default composer layout " + width,
        passed: true,
        ...state,
      });
      console.log(JSON.stringify(state));
      assert.equal(state.open, width > 800);
      if (width <= 800) {
        assert.equal(state.formHeight, 0);
        await details.locator("summary").focus();
        await page.keyboard.press("Enter");
        await details.locator("form").waitFor();
        assert(await details.evaluate((el) => el.open));
        await details.locator("summary").click();
        await page.waitForFunction(
          () =>
            document
              .querySelector(".message-composer-disclosure form")
              .getBoundingClientRect().height === 0,
        );
        results.push({
          name: "native keyboard open and click close " + width,
          passed: true,
        });
      }
      if (width === 390) {
        await page.setViewportSize({ width: 1024, height: 960 });
        await details.locator("form").waitFor();
        assert(await details.evaluate((el) => el.open));
        await page.setViewportSize({ width: 390, height: 960 });
        await page.waitForFunction(
          () =>
            document
              .querySelector(".message-composer-disclosure form")
              .getBoundingClientRect().height === 0,
        );
        results.push({
          name: "cross-breakpoint composer remains reachable",
          passed: true,
        });
      }
      await page.keyboard.press("Escape");
    }
    fs.writeFileSync(
      path.join(__dirname, "composer-results.json"),
      JSON.stringify({ results, passed: true }, null, 2),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(__dirname, "composer-results.json"),
      JSON.stringify({ results, error: String(error) }, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
