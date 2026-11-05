// Actual accepted baseline export; synthetic avatar stays in this browser's IndexedDB.
const {
  chromium,
} = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      headless: true,
    }),
    results = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
          locale: "zh-CN",
        }),
        page = await context.newPage();
      await page.goto("http://127.0.0.1:3024/profile-lab/", {
        waitUntil: "networkidle",
      });
      await page
        .getByRole("button", { name: "进入合成账号 A", exact: true })
        .click();
      for (const stage of ["text", "photo"]) {
        if (stage === "photo") {
          const buffer = await page.evaluate(async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 480;
            canvas.height = 320;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffe528";
            ctx.fillRect(0, 0, 480, 320);
            ctx.fillStyle = "#101828";
            ctx.fillRect(220, 30, 160, 260);
            return [
              ...new Uint8Array(
                await (
                  await new Promise((r) => canvas.toBlob(r, "image/png"))
                ).arrayBuffer(),
              ),
            ];
          });
          await page
            .locator("#avatar-file")
            .setInputFiles({
              name: "synthetic.png",
              mimeType: "image/png",
              buffer: Buffer.from(buffer),
            });
          await page.locator(".avatar-crop-layout canvas").waitFor();
          await page
            .getByRole("button", { name: "保存到隔离测试存储", exact: true })
            .click();
          await page
            .locator(".avatar-crop-layout")
            .waitFor({ state: "detached" });
        }
        await page
          .getByRole("button", { name: "检查实际留言墙与回复区", exact: true })
          .click();
        const card = page.locator('[data-message-id="avatar-lab-0"]');
        await card.waitFor();
        const frames = await card
          .locator(".paper-avatar,.member-avatar")
          .evaluateAll((nodes) =>
            nodes.map((el) => {
              const r = el.getBoundingClientRect(),
                s = getComputedStyle(el);
              return {
                class: el.className,
                width: r.width,
                height: r.height,
                border: s.borderWidth,
                radius: s.borderRadius,
                marker: !!el.querySelector("i"),
              };
            }),
          );
        await card.screenshot({
          path: path.join(
            __dirname,
            `baseline-avatar-wall-${stage}-${width}.png`,
          ),
        });
        await page.keyboard.press("Escape");
        const ribbon = page.locator(".message-showcase");
        await ribbon.scrollIntoViewIfNeeded();
        await ribbon.screenshot({
          path: path.join(
            __dirname,
            `baseline-avatar-ribbon-${stage}-${width}.png`,
          ),
        });
        results.push({ width, stage, frames });
      }
      await context.close();
    }
    fs.writeFileSync(
      path.join(__dirname, "avatar-baseline-results.json"),
      JSON.stringify(
        {
          baseline: "80737413d3bb981b3a3287c603893eb6c09decf2",
          results,
          scope:
            "Actual accepted baseline export, same synthetic avatar fixture as after screenshots; old editor default zoom retained. Shows original outer-container substitution bug. No backend writes.",
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
