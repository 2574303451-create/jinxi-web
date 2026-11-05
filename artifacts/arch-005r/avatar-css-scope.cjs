const {
  chromium,
} = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 1000 },
      reducedMotion: "reduce",
    });
    await page.goto("http://127.0.0.1:3025/profile-lab/", {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "进入合成账号 A", exact: true })
      .click();
    const png = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = c.height = 200;
      c.getContext("2d").fillRect(0, 0, 200, 200);
      return [
        ...new Uint8Array(
          await (
            await new Promise((r) => c.toBlob(r, "image/png"))
          ).arrayBuffer(),
        ),
      ];
    });
    await page
      .locator("#avatar-file")
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: Buffer.from(png),
      });
    await page.locator(".avatar-crop-layout canvas").waitFor();
    await page
      .getByRole("button", { name: "保存到隔离测试存储", exact: true })
      .click();
    await page.locator(".avatar-crop-layout").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "检查实际留言墙与回复区", exact: true })
      .click();
    const avatar = page.locator(
      '[data-message-id="avatar-lab-0"] .message-card-head .paper-avatar',
    );
    await avatar.locator("img").waitFor();
    const inspect = () =>
      avatar.evaluate((el) => {
        const s = getComputedStyle(el),
          img = el.querySelector("img"),
          r = img.getBoundingClientRect(),
          i = getComputedStyle(img);
        return {
          width: el.offsetWidth,
          height: el.offsetHeight,
          border: s.borderWidth,
          radius: s.borderRadius,
          overflow: s.overflow,
          marker: !!el.querySelector("i"),
          imgWidth: r.width,
          imgHeight: r.height,
          fit: i.objectFit,
          position: i.objectPosition,
          animation: i.animationName,
        };
      });
    const before = await inspect();
    const disabled = await page.evaluate(() => {
      const list = [];
      for (const sheet of document.styleSheets) {
        try {
          if (
            [...sheet.cssRules].some((r) =>
              r.cssText.startsWith(".member-avatar "),
            )
          ) {
            sheet.disabled = true;
            list.push(sheet.href);
          }
        } catch {}
      }
      return list;
    });
    assert.equal(disabled.length, 1);
    const after = await inspect();
    assert.deepEqual(after, before);
    assert.equal(after.width, 42);
    assert.equal(after.imgWidth, 38);
    assert.equal(after.fit, "cover");
    assert.equal(after.animation, "none");
    fs.writeFileSync(
      path.join(__dirname, "avatar-css-scope-results.json"),
      JSON.stringify(
        {
          passed: true,
          before,
          after,
          disabled,
          scope:
            "Only the actual route-specific stylesheet containing member-avatar/profile-lab rules disabled by browser test. Global community CSS retained. Actual MessageWall PublicAvatar photo geometry unchanged; no production stylesheet mutation.",
        },
        null,
        2,
      ),
    );
    console.log("PASS public avatar needs no profile-lab stylesheet");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
