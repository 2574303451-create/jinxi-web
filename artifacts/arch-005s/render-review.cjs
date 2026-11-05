const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    for (const [name, width] of [
      ["overview", 1280],
      ["compare-1440", 1440],
      ["compare-390", 840],
    ]) {
      const p = await browser.newPage({ viewport: { width, height: 1000 } });
      await p.goto(`http://127.0.0.1:3027/review/${name}.html`, {
        waitUntil: "networkidle",
      });
      await p.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      );
      await p.screenshot({
        path: path.join(__dirname, name + ".png"),
        fullPage: true,
      });
      await p.close();
    }
    console.log("Saved overview and both reference comparisons");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
