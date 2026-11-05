const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const fixture = require("../arch-005/fixture.cjs").strategies[0],
  results = [],
  violations = [],
  network = [];
const origin = "https://interactive-examples.mdn.mozilla.net";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
    proxy: {
      server: "socks5://127.0.0.1:10910",
      bypass: "127.0.0.1,localhost",
    },
  });
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1000 },
      locale: "zh-CN",
    });
    await context.exposeFunction("reportCsp", (value) =>
      violations.push(value),
    );
    await context.addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (e) =>
        window.reportCsp({
          directive: e.effectiveDirective,
          blocked: e.blockedURI,
        }),
      ),
    );
    let videoUrl = "/1.mp4";
    await context.route("**/.netlify/functions/strategies?**", (route) =>
      route.fulfill({
        json: {
          strategy: {
            ...fixture,
            content: "合成视频验证：点击原生播放控件。",
            mediaFiles: [
              {
                id: "synthetic-video",
                type: "video",
                url: videoUrl,
                title: "合成视频验证",
              },
            ],
          },
        },
      }),
    );
    page = await context.newPage();
    page.on("response", (r) => {
      if (r.request().resourceType() === "media")
        network.push({
          url: r.url(),
          status: r.status(),
          type: r.headers()["content-type"],
          range: r.headers()["content-range"],
        });
    });
    page.on("requestfailed", (r) => {
      if (r.resourceType() === "media")
        network.push({ url: r.url(), failed: r.failure()?.errorText });
    });
    for (const [name, url] of [
      ["same-origin", "/1.mp4"],
      ["trusted-https", origin + "/media/cc0-videos/flower.mp4"],
    ]) {
      videoUrl = url;
      await page.goto("http://127.0.0.1:3025/guides/?id=1", {
        waitUntil: "networkidle",
      });
      const video = page.locator("video");
      await video.waitFor();
      await video.scrollIntoViewIfNeeded();
      const box = await video.boundingBox();
      await page.mouse.click(box.x + 25, box.y + box.height - 50);
      await page.waitForFunction(
        () => {
          const v = document.querySelector("video");
          return v && v.currentTime > 0.15 && v.videoWidth > 0;
        },
        null,
        { timeout: 25000 },
      );
      const state = await video.evaluate((v) => ({
        time: v.currentTime,
        width: v.videoWidth,
        height: v.videoHeight,
        readyState: v.readyState,
        error: v.error?.code || 0,
        src: v.currentSrc,
      }));
      await video.evaluate((v) => v.pause());
      await page.screenshot({
        path: path.join(__dirname, `video-${name}.png`),
      });
      assert.equal(state.error, 0);
      results.push({ name, played: true, state });
      console.log("PASS video", name);
    }
    videoUrl = origin + "/media/cc0-videos/jinxi-no-such-video.mp4";
    await page.goto("http://127.0.0.1:3025/guides/?id=1", {
      waitUntil: "networkidle",
    });
    const broken = page.locator("video");
    await broken.scrollIntoViewIfNeeded();
    await broken.evaluate((v) => v.play().catch(() => {}));
    await page
      .getByText("视频暂时无法播放，请稍后重试或在原站打开。", { exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("link", { name: "在原站打开视频 ↗", exact: true })
        .isVisible(),
    );
    await page.screenshot({
      path: path.join(__dirname, "video-unavailable.png"),
    });
    results.push({
      name: "allowed missing source (browser opaque response block)",
      explicitFallback: true,
    });
    videoUrl = "https://example.org/video.mp4";
    await page.goto("http://127.0.0.1:3025/guides/?id=1", {
      waitUntil: "networkidle",
    });
    await page
      .getByText("该视频来源不在本站的内嵌允许列表中。", { exact: true })
      .waitFor();
    assert.equal(await page.locator("video").count(), 0);
    assert.equal(
      await page
        .getByRole("link", { name: "在原站打开视频 ↗", exact: true })
        .getAttribute("rel"),
      "noopener noreferrer",
    );
    results.push({ name: "untrusted HTTPS source", externalLinkOnly: true });
    await page.evaluate(() => {
      const probe = document.createElement("video");
      probe.src = "https://example.org/csp-negative-probe.mp4";
      probe.preload = "auto";
      document.body.append(probe);
      probe.load();
    });
    await page.waitForTimeout(300);
    assert(
      violations.some(
        (v) => v.directive === "media-src" && v.blocked.includes("example.org"),
      ),
    );
    results.push({ name: "controlled negative CSP probe", mediaBlocked: true });
    videoUrl = "javascript:alert(1)";
    await page.goto("http://127.0.0.1:3025/guides/?id=1", {
      waitUntil: "networkidle",
    });
    await page.getByText("媒体地址不可用", { exact: true }).waitFor();
    assert.equal(await page.locator("video").count(), 0);
    results.push({ name: "invalid scheme", rejected: true });
    fs.writeFileSync(
      path.join(__dirname, "video-results.json"),
      JSON.stringify(
        {
          passed: true,
          results,
          violations,
          network,
          scope:
            "Actual exported GuideMedia/GuideVideo in Edge with response CSP from current netlify.toml. Same-origin project MP4 and actual HTTPS MDN CC0 flower clip played using browser controls. Only API data synthetic; media responses NOT intercepted; Edge uses the already-running local SOCKS proxy on10910 for external networking (loopback bypassed). Direct networking returned206 but stalled, retained in video-direct-incomplete.json. Negative CSP probe inserted only by test. No deployment, upload or production database write.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    if (page)
      await page.screenshot({
        path: path.join(__dirname, "video-failure.png"),
      });
    fs.writeFileSync(
      path.join(__dirname, "video-results.json"),
      JSON.stringify(
        { passed: false, results, violations, network, error: String(e) },
        null,
        2,
      ),
    );
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
