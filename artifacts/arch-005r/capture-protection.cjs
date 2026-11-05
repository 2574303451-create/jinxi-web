const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const results = [];
  try {
    const context = await browser.newContext({
        reducedMotion: "reduce",
        locale: "zh-CN",
      }),
      page = await context.newPage();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const stage of ["before", "after"]) {
        await page.goto(
          `http://127.0.0.1:${stage === "before" ? 3024 : 3025}/`,
          { waitUntil: "networkidle" },
        );
        await page.waitForFunction(
          () =>
            document.fonts.status === "loaded" &&
            [...document.images]
              .filter((img) => {
                const r = img.getBoundingClientRect();
                return r.top < innerHeight && r.bottom > 0 && r.width > 0;
              })
              .every((img) => img.complete),
        );
        await page.screenshot({
          path: path.join(__dirname, `${stage}-home-${width}.png`),
        });
      }
      const diff = await page.evaluate(async (width) => {
        const arrays = await Promise.all(
          ["before", "after"].map(
            (stage) =>
              new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = width;
                  canvas.height = 600;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  resolve(ctx.getImageData(0, 0, width, 600).data);
                };
                img.onerror = reject;
                img.src = `/review/${stage}-home-${width}.png`;
              }),
          ),
        );
        let changed = 0,
          minX = width,
          minY = 600,
          maxX = -1,
          maxY = -1;
        for (let i = 0; i < arrays[0].length; i += 4)
          if ([0, 1, 2, 3].some((k) => arrays[0][i + k] !== arrays[1][i + k])) {
            changed++;
            let x = (i / 4) % width,
              y = Math.floor(i / 4 / width);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        return {
          width,
          height: 600,
          changed,
          bounds: { minX, minY, maxX, maxY },
        };
      }, width);
      results.push(diff);
    }
    fs.writeFileSync(
      path.join(__dirname, "homepage-protection.json"),
      JSON.stringify(
        {
          results,
          method:
            "Actual baseline/new static browser, same font/viewport/reduced-motion. Screenshots top600px exact RGBA comparison; dynamic image decoder/rendering may differ, retain bounded evidence instead of declaring equality from unchanged source.",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
