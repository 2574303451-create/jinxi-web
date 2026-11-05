const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:3027",
  out = __dirname;
async function photo(page, tone) {
  return Buffer.from(
    await page.evaluate(async (tone) => {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 320;
      const ctx = c.getContext("2d");
      ctx.fillStyle = tone;
      ctx.fillRect(0, 0, 480, 320);
      ctx.fillStyle = "#101828";
      ctx.fillRect(220, 30, 160, 260);
      return [
        ...new Uint8Array(
          await (
            await new Promise((r) => c.toBlob(r, "image/png"))
          ).arrayBuffer(),
        ),
      ];
    }, tone),
  );
}
async function save(page, tone) {
  await page.locator("#avatar-file").setInputFiles({
    name: "synthetic-frame.png",
    mimeType: "image/png",
    buffer: await photo(page, tone),
  });
  await page.locator(".avatar-crop-layout canvas").waitFor();
  assert(
    !(await page
      .locator(".avatar-crop-layout details")
      .evaluate((el) => el.open)),
  );
  await page
    .getByRole("button", { name: "保存到隔离测试存储", exact: true })
    .click();
  await page.locator(".avatar-crop-layout").waitFor({ state: "detached" });
  await page.locator(".avatar-sizes img").first().waitFor();
}
async function frames(locator) {
  return locator.evaluate((root) => {
    const parent = root.getBoundingClientRect();
    return [...root.querySelectorAll(".paper-avatar")].map((el) => {
      const r = el.getBoundingClientRect(),
        css = getComputedStyle(el);
      return {
        x: r.x - parent.x,
        y: r.y - parent.y,
        pixelX: r.x - Math.floor(parent.x),
        pixelY: r.y - Math.floor(parent.y),
        width: r.width,
        height: r.height,
        border: css.borderTopWidth,
        color: css.borderTopColor,
        radius: css.borderTopLeftRadius,
        shadow: css.boxShadow,
        overflow: css.overflow,
        marker: !!el.querySelector("i"),
        photo: !!el.querySelector("img"),
      };
    });
  });
}
async function snapshot(page, width, stage) {
  await page
    .getByRole("button", { name: "检查实际留言墙与回复区", exact: true })
    .click();
  const card = page.locator('[data-message-id="avatar-lab-0"]');
  await card.waitFor();
  await page.locator("dialog[open] .dialog-heading button").first().focus();
  await page.mouse.move(1, 1);
  await page.waitForTimeout(120);
  const cardFrames = await frames(card),
    cardBuffer = await card.screenshot({
      path: path.join(out, `avatar-wall-${stage}-${width}.png`),
    });
  await page.keyboard.press("Escape");
  const section = page.locator(".message-showcase");
  await section.scrollIntoViewIfNeeded();
  await page
    .locator(".message-ribbon")
    .evaluateAll((nodes) => nodes.forEach((el) => (el.scrollLeft = 0)));
  await page.mouse.move(1, 1);
  const ribbonFrames = await frames(section),
    ribbonBuffer = await section.screenshot({
      path: path.join(out, `avatar-ribbon-${stage}-${width}.png`),
    });
  const geometry = await page.locator(".message-ribbon").evaluateAll((nodes) =>
    nodes.map((el) => ({
      width: el.clientWidth,
      height: el.clientHeight,
      distance: el.dataset.distance,
      card: [...el.querySelectorAll(".message-ribbon-card")].map((card) => ({
        width: card.getBoundingClientRect().width,
        height: card.getBoundingClientRect().height,
      })),
    })),
  );
  return { cardFrames, cardBuffer, ribbonFrames, ribbonBuffer, geometry };
}
async function diff(page, a, b, masks) {
  return page.evaluate(
    async ({ a, b, masks }) => {
      const images = await Promise.all(
        [a, b].map(
          (src) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = "data:image/png;base64," + src;
            }),
        ),
      );
      if (
        images[0].width !== images[1].width ||
        images[0].height !== images[1].height
      )
        throw new Error("Screenshot dimensions changed");
      const arrays = images.map((img) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      });
      let inside = 0,
        outside = 0;
      const outsideSamples = [];
      for (let i = 0; i < arrays[0].length; i += 4) {
        if ([0, 1, 2, 3].every((k) => arrays[0][i + k] === arrays[1][i + k]))
          continue;
        const x = ((i / 4) % images[0].width) + 0.5,
          y = Math.floor(i / 4 / images[0].width) + 0.5;
        const allowed = masks.some((r) => {
          const border = parseFloat(r.border);
          const left = r.pixelX + border,
            top = r.pixelY + border,
            right = r.pixelX + r.width - border,
            bottom = r.pixelY + r.height - border,
            radius = Math.max(0, parseFloat(r.radius) - border);
          if (x < left || x >= right || y < top || y >= bottom) return false;
          const cx = Math.max(left + radius, Math.min(right - radius, x)),
            cy = Math.max(top + radius, Math.min(bottom - radius, y));
          return (
            Math.max(0, Math.abs(x - cx) - 0.5) ** 2 +
              Math.max(0, Math.abs(y - cy) - 0.5) ** 2 <=
            (radius + 0.25) ** 2
          );
        });
        if (allowed) inside++;
        else {
          outside++;
          if (outsideSamples.length < 60)
            outsideSamples.push({
              x,
              y,
              before: [...arrays[0].slice(i, i + 4)],
              after: [...arrays[1].slice(i, i + 4)],
            });
        }
      }
      return {
        width: images[0].width,
        height: images[0].height,
        inside,
        outside,
        outsideSamples,
      };
    },
    { a: a.toString("base64"), b: b.toString("base64"), masks },
  );
}
const frameShape = (frame) => {
  const { photo, pixelX, pixelY, ...rest } = frame;
  return rest;
};
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
          locale: "zh-CN",
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      await page.goto(base + "/profile-lab/", { waitUntil: "networkidle" });
      await page.addStyleTag({
        content: ".profile-status{height:72px;overflow:hidden}",
      });
      await page
        .getByRole("button", { name: "进入合成账号 A", exact: true })
        .click();
      await page
        .getByRole("button", { name: "恢复默认头像", exact: true })
        .waitFor();
      const text = await snapshot(page, width, "text");
      assert.equal(text.cardFrames[0].width, 42);
      assert.equal(text.cardFrames[1].width, 30);
      assert.equal(text.ribbonFrames[0].width, 30);
      for (const [stage, tone] of [
        ["photo", "#ffe528"],
        ["replacement", "#2360f5"],
      ]) {
        await save(page, tone);
        const next = await snapshot(page, width, stage);
        assert.deepEqual(
          next.cardFrames.map(frameShape),
          text.cardFrames.map(frameShape),
        );
        assert.deepEqual(
          next.ribbonFrames.map(frameShape),
          text.ribbonFrames.map(frameShape),
        );
        assert.deepEqual(next.geometry, text.geometry);
        const card = await diff(
            page,
            text.cardBuffer,
            next.cardBuffer,
            text.cardFrames,
          ),
          ribbon = await diff(
            page,
            text.ribbonBuffer,
            next.ribbonBuffer,
            text.ribbonFrames,
          );
        if (card.outside || ribbon.outside) {
          results.push({
            width,
            stage,
            cardFrames: next.cardFrames,
            ribbonFrames: next.ribbonFrames,
            card,
            ribbon,
          });
          console.log(JSON.stringify({ card, ribbon }));
        }
        assert.equal(card.outside, 0);
        assert.equal(ribbon.outside, 0);
        assert(card.inside > 0 && ribbon.inside > 0);
        results.push({
          width,
          stage,
          frames: next.cardFrames,
          ribbonFrames: next.ribbonFrames,
          geometry: next.geometry,
          cardPixels: card,
          ribbonPixels: ribbon,
        });
        console.log("PASS frame geometry/pixels", width, stage);
      }
      await page.getByLabel("模拟图片加载失败").check();
      await page.waitForTimeout(250);
      const failed = await snapshot(page, width, "failed");
      const failedCard = await diff(
          page,
          text.cardBuffer,
          failed.cardBuffer,
          [],
        ),
        failedRibbon = await diff(
          page,
          text.ribbonBuffer,
          failed.ribbonBuffer,
          [],
        );
      assert.equal(failedCard.outside, 0);
      assert.equal(failedRibbon.outside, 0);
      results.push({
        width,
        stage: "failed",
        cardPixels: failedCard,
        ribbonPixels: failedRibbon,
      });
      await page.getByLabel("模拟图片加载失败").uncheck();
      await page
        .getByRole("button", { name: "恢复默认头像", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "已恢复本机测试账号" })
        .waitFor();
      const restored = await snapshot(page, width, "restored");
      const card = await diff(page, text.cardBuffer, restored.cardBuffer, []),
        ribbon = await diff(page, text.ribbonBuffer, restored.ribbonBuffer, []);
      assert.equal(card.outside, 0);
      assert.equal(ribbon.outside, 0);
      results.push({
        width,
        stage: "restored",
        cardPixels: card,
        ribbonPixels: ribbon,
      });
      await context.close();
    }
    fs.writeFileSync(
      path.join(out, "avatar-frame-results.json"),
      JSON.stringify(
        {
          results,
          passed: true,
          method:
            "Actual exported browser and actual wall/reply/ribbon components under the isolated provider. Same text/state/focus; synthetic profile status host fixed to72px only in test to prevent unrelated notification wrapping moving the screenshot raster origin. Masks account for fractional element screenshot origins; border pixels remain excluded. Every changed pixel must lie strictly within an existing avatar border interior; all pixels outside the rounded inner fill coverage (pixel coverage plus0.25px raster antialias allowance, still strictly inside the original2px frame bounds) must match exactly. Bounding boxes, borders, radius, shadow, outside markers, cards and track distances compared. Replacement, failed source and reset included. No production identity/upload.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    fs.writeFileSync(
      path.join(out, "avatar-frame-results.json"),
      JSON.stringify({ results, passed: false, error: String(e) }, null, 2),
    );
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
