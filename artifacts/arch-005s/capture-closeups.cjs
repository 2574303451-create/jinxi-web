// Full-page captures keep normal UI. Only closeups use a taller viewport and hide fixed header.
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
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        locale: "zh-CN",
        reducedMotion: "reduce",
      });
      await page.goto("http://127.0.0.1:3027/", { waitUntil: "networkidle" });
      await page.locator("#home-guides").scrollIntoViewIfNeeded();
      await page.locator("[data-home-guide]").first().waitFor();
      await page.addStyleTag({
        content: '.guild-header,[class*="cyberAnnFab"]{visibility:hidden}',
      });
      for (const id of ["guild-facts", "home-guides"]) {
        const el = page.locator("#" + id),
          height = Math.max(
            1000,
            Math.ceil(
              await el.evaluate((e) => e.getBoundingClientRect().height),
            ) + 160,
          );
        await page.setViewportSize({ width, height });
        await page.evaluate((id) => {
          const e = document.getElementById(id);
          window.scrollTo({
            top: e.getBoundingClientRect().top + scrollY,
            behavior: "instant",
          });
        }, id);
        await page.waitForTimeout(180);
        const rect = await el.boundingBox();
        assert(Math.abs(rect.y) < 1);
        assert(rect.y + rect.height < height);
        await el.screenshot({
          path: path.join(__dirname, `final-${id}-${width}.png`),
        });
        const captureRect = await el.boundingBox(),
          footerBounds = await el
            .locator("footer")
            .evaluateAll((nodes) =>
              nodes.map((e) => ({
                top: e.getBoundingClientRect().y,
                bottom: e.getBoundingClientRect().bottom,
              })),
            );
        assert(
          captureRect.y >= -1 &&
            captureRect.y + captureRect.height <= height + 1,
        );
        assert(
          footerBounds.every(
            (r) => r.bottom <= captureRect.y + captureRect.height + 1,
          ),
        );
        results.push({
          width,
          id,
          viewportHeight: height,
          rectBeforeScreenshot: rect,
          captureRect,
          footerBounds,
        });
      }
      await page.close();
    }
    fs.writeFileSync(
      path.join(__dirname, "closeup-results.json"),
      JSON.stringify(
        {
          passed: true,
          results,
          method:
            "Element screenshot in original1000px viewport could clip below screen while retaining a blank tail in headless capture; debug-final.png retained. Final closeups increase ONLY viewport height to component height+160, align target at viewport y0, hide fixed navigation/announcement with test-only visibility CSS. Bounding boxes prove full card footers are inside capture. Product source and full-page screenshots unchanged. Widths1440/768/390/320 remain exact.",
        },
        null,
        2,
      ),
    );
    console.log("PASS complete component closeups all4 widths");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
