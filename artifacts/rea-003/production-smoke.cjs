const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const base = process.env.REVIEW_URL || "http://127.0.0.1:3006",
  results = [],
  errors = [];
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
      locale: "zh-CN",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const app = page.frameLocator("iframe");
    await check(
      "preview visibly identifies fixture and loads built application",
      async () => {
        assert(
          await page
            .getByText("留言为合成测试数据；所有写入已禁用。", { exact: true })
            .isVisible(),
        );
        await app.locator("h1").waitFor();
        assert.equal(
          (await app.locator("h1").innerText()).replace(/\s/g, ""),
          "今晚开黑，星光作陪。",
        );
      },
    );
    await check(
      "preview API read is synthetic, writes rejected before handlers",
      async () => {
        const read = await context.request.get(
          base + "/.netlify/functions/messages",
        );
        assert.equal(read.headers()["x-jinxi-preview"], "synthetic-read-only");
        const body = await read.json();
        assert(body.every((m) => m.name.startsWith("界面测试")));
        const post = await context.request.post(
          base + "/.netlify/functions/messages",
          { data: { content: "local-rejection-probe" } },
        );
        assert.equal(post.status(), 405);
        assert((await post.json()).error.includes("禁止写入"));
      },
    );
    await check(
      "preview message dialog uses built semantic component",
      async () => {
        await app.locator(".community-door").first().click();
        await app.locator(".message-card").first().waitFor();
        assert.equal(
          await app
            .locator(".message-wall")
            .evaluate((el) =>
              Boolean(el.closest(".legacy-module,.legacy-dialog-content")),
            ),
          false,
        );
        await app
          .getByRole("dialog", { name: "留下你的声音", exact: true })
          .getByRole("button", { name: "关闭弹窗", exact: true })
          .click();
      },
    );
    await check(
      "remaining business components retain compatibility classes",
      async () => {
        await app.getByRole("button", { name: "去签到", exact: true }).click();
        const dialog = app.getByRole("dialog", {
          name: "每日签到",
          exact: true,
        });
        assert.equal(
          await dialog.locator(".legacy-dialog-content .legacy-module").count(),
          1,
        );
        await dialog
          .getByRole("button", { name: "关闭弹窗", exact: true })
          .click();
      },
    );
    const measured = [];
    await page.goto(base + "/review/", { waitUntil: "domcontentloaded" });
    await check(
      "review gallery renders original before/after PNG files",
      async () => {
        await page.waitForFunction(() =>
          ["before-img", "after-img"].every((id) => {
            const image = document.getElementById(id);
            return image?.complete && image.naturalWidth > 0;
          }),
        );
        await page.selectOption("#width", "390");
        await page.waitForFunction(() =>
          ["before-img", "after-img"].every((id) => {
            const image = document.getElementById(id);
            return image?.complete && image.naturalWidth === 390;
          }),
        );
      },
    );
    for (const width of [1440, 768, 390]) {
      await check(`approved hero screenshot comparison ${width}`, async () => {
        const diff = await page.evaluate(async (width) => {
          const load = (src) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = src;
            });
          const [a, b] = await Promise.all([
            load("before/homepage-" + width + ".png"),
            load("after/homepage-" + width + ".png"),
          ]);
          const h = 600,
            c = document.createElement("canvas");
          c.width = width;
          c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(a, 0, 0);
          const first = ctx.getImageData(0, 0, width, h).data;
          ctx.clearRect(0, 0, width, h);
          ctx.drawImage(b, 0, 0);
          const second = ctx.getImageData(0, 0, width, h).data;
          let changed = 0,
            total = 0;
          for (let i = 0; i < first.length; i += 4) {
            const delta =
              Math.abs(first[i] - second[i]) +
              Math.abs(first[i + 1] - second[i + 1]) +
              Math.abs(first[i + 2] - second[i + 2]);
            if (delta > 15) changed++;
            total += delta;
          }
          return {
            width,
            cropHeight: h,
            changedPixels: changed,
            pixels: width * h,
            changedRatio: changed / (width * h),
            meanChannelDelta: total / (width * h * 3),
          };
        }, width);
        measured.push(diff);
        // Source preservation is independently checked by Git; raster comparison records timing/font differences honestly.
        assert(diff.changedRatio < 0.03, JSON.stringify(diff));
      });
    }
    await check("no uncaught production-preview exceptions", async () =>
      assert.deepEqual(errors, []),
    );
    fs.writeFileSync(
      path.join(__dirname, "production-results.json"),
      JSON.stringify(
        {
          results,
          errors,
          measured,
          environment:
            "Actual npm build output via local read-only fixture preview; POST probe only tests local preview rejection, never a business backend.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(__dirname, "production-results.json"),
      JSON.stringify({ results, errors, error: String(error) }, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
