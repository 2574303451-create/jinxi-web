const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 1000 },
      }),
      page = await context.newPage(),
      session = await context.newCDPSession(page);
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    await session.send("Network.enable");
    await session.send("Network.setBlockedURLs", {
      urls: ["https://cdn.jsdelivr.net/*"],
    });
    await session.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750,
    });
    await page.goto("http://127.0.0.1:3025/profile-lab/", {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "进入合成账号 A", exact: true })
      .click();
    await page
      .getByRole("button", { name: "恢复默认头像", exact: true })
      .waitFor();
    const input = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffe528";
      ctx.fillRect(0, 0, 1200, 900);
      ctx.fillStyle = "#2360f5";
      ctx.fillRect(400, 0, 800, 900);
      ctx.fillStyle = "#101828";
      ctx.font = "bold 280px sans-serif";
      ctx.fillText("夕", 430, 560);
      return [
        ...new Uint8Array(
          await (
            await new Promise((r) => canvas.toBlob(r, "image/png"))
          ).arrayBuffer(),
        ),
      ];
    });
    await session.send("Tracing.start", {
      categories: "devtools.timeline,v8,blink.user_timing",
      transferMode: "ReturnAsStream",
    });
    const started = Date.now();
    await page
      .locator("#avatar-file")
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: Buffer.from(input),
      });
    await page.locator(".avatar-crop-layout canvas").waitFor();
    const cropReadyMs = Date.now() - started;
    assert.equal(
      await page
        .locator(".avatar-crop-layout details")
        .evaluate((el) => el.open),
      false,
    );
    await page
      .locator(".avatar-editor")
      .screenshot({ path: path.join(__dirname, "avatar-crop-390.png") });
    const saving = Date.now();
    await page
      .getByRole("button", { name: "保存到隔离测试存储", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "已保存到本机隔离测试存储" })
      .waitFor();
    const saveObservedMs = Date.now() - saving;
    await page.locator(".avatar-sizes img").last().waitFor();
    const blobInfo = await page
      .locator(".avatar-sizes img")
      .first()
      .evaluate(async (img) => {
        await img.decode();
        const blob = await new Promise((resolve, reject) => {
          const request = indexedDB.open("jinxi-avatar-lab-v1", 1);
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction("avatars", "readonly"),
              get = tx.objectStore("avatars").get("lab-member-a");
            tx.oncomplete = () => {
              db.close();
              resolve(get.result);
            };
            tx.onerror = reject;
          };
          request.onerror = reject;
        });
        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          bytes: blob.size,
          type: blob.type,
        };
      });
    assert.equal(blobInfo.width, 128);
    assert.equal(blobInfo.type, "image/webp");
    await page.locator(".profile-title").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(__dirname, "avatar-saved-390.png"),
    });
    await page
      .getByRole("button", { name: "检查实际留言墙与回复区", exact: true })
      .click();
    await page.locator('[data-message-id="avatar-lab-0"]').waitFor();
    assert.equal(
      await page
        .locator('[data-message-id="avatar-lab-0"] .message-card-head img')
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator('[data-message-id="avatar-lab-0"] .message-replies img')
        .count(),
      1,
    );
    await page.screenshot({
      path: path.join(__dirname, "avatar-linked-wall-390.png"),
    });
    await page.keyboard.press("Escape");
    const done = new Promise((resolve) =>
      session.once("Tracing.tracingComplete", resolve),
    );
    await session.send("Tracing.end");
    const { stream } = await done;
    let trace = "";
    for (;;) {
      const chunk = await session.send("IO.read", { handle: stream });
      trace += chunk.data;
      if (chunk.eof) break;
    }
    await session.send("IO.close", { handle: stream });
    fs.writeFileSync(
      path.join(__dirname, "avatar-mobile.trace.json.gz"),
      zlib.gzipSync(trace),
    );
    fs.writeFileSync(
      path.join(__dirname, "avatar-performance.json"),
      JSON.stringify(
        {
          viewport: 390,
          cpuSlowdown: 6,
          inputBytes: input.length,
          cropReadyMs,
          saveObservedMs,
          blobInfo,
          status: await page
            .getByRole("status")
            .filter({ hasText: "已保存到本机隔离测试存储" })
            .innerText(),
          backendRequests: requests.filter((url) => url.includes("/.netlify/")),
          method:
            "One local synthetic image, real browser decode/crop/WebP encode/IndexedDB/save and linked actual wall/reply. Slow mobile lab; observed timings include automation. Blob URLs are local and share one encoded object across 32/48/64 uses; no HTTP avatar upload, CDN cache, remote durability, server validation or security tested.",
        },
        null,
        2,
      ),
    );
    await page
      .getByRole("button", { name: "清理全部测试头像", exact: true })
      .click();
    console.log(JSON.stringify({ cropReadyMs, saveObservedMs, blobInfo }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
