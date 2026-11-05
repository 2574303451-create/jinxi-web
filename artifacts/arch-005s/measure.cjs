const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib");
const results = [];
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    for (const slow of [false, true])
      for (let run = 1; run <= 3; run++)
        for (const stage of ["before", "after"]) {
          const base = `http://127.0.0.1:${stage === "before" ? 3026 : 3027}`,
            context = await browser.newContext({
              viewport: { width: slow ? 390 : 1440, height: 1000 },
              reducedMotion: "reduce",
              locale: "zh-CN",
            }),
            page = await context.newPage(),
            cdp = await context.newCDPSession(page),
            assets = {},
            pending = [],
            api = [],
            waterfall = [],
            errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("request", (r) => {
            if (r.url().includes("/.netlify/functions/"))
              api.push({
                path: new URL(r.url()).pathname + new URL(r.url()).search,
                method: r.method(),
                time: Date.now(),
              });
          });
          page.on("response", (r) => {
            if (
              ["script", "stylesheet", "image"].includes(
                r.request().resourceType(),
              )
            )
              pending.push(
                (async () => {
                  const body = await r.body().catch(() => Buffer.alloc(0));
                  assets[new URL(r.url()).pathname] = {
                    type: r.request().resourceType(),
                    bytes: body.length,
                    gzip:
                      r.request().resourceType() === "image"
                        ? null
                        : zlib.gzipSync(body).length,
                    fullGuideCode:
                      /复制分享链接|预览正文|guide-reader-actions/.test(
                        body.toString(),
                      ),
                  };
                })(),
              );
          });
          await cdp.send("Network.enable");
          await cdp.send("Performance.enable");
          await cdp.send("Network.setBlockedURLs", {
            urls: ["https://cdn.jsdelivr.net/*"],
          });
          await cdp.send("Emulation.setCPUThrottlingRate", {
            rate: slow ? 6 : 1,
          });
          if (slow)
            await cdp.send("Network.emulateNetworkConditions", {
              offline: false,
              latency: 150,
              downloadThroughput: 200000,
              uploadThroughput: 93750,
            });
          cdp.on("Network.requestWillBeSent", (e) =>
            waterfall.push({
              event: "request",
              id: e.requestId,
              time: e.timestamp,
              url: e.request.url,
              type: e.type,
            }),
          );
          cdp.on("Network.responseReceived", (e) =>
            waterfall.push({
              event: "response",
              id: e.requestId,
              time: e.timestamp,
              url: e.response.url,
              status: e.response.status,
              cache: e.response.fromDiskCache,
            }),
          );
          cdp.on("Network.loadingFinished", (e) =>
            waterfall.push({
              event: "complete",
              id: e.requestId,
              time: e.timestamp,
              encodedBytes: e.encodedDataLength,
            }),
          );
          await context.addInitScript(() => {
            window.__vitals005s = { lcp: 0, cls: 0, events: [], shifts: [] };
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                window.__vitals005s.lcp = e.startTime;
            }).observe({ type: "largest-contentful-paint", buffered: true });
            new PerformanceObserver((l) => {
              for (const e of l.getEntries()) {
                window.__vitals005s.shifts.push({
                  time: e.startTime,
                  value: e.value,
                  recentInput: e.hadRecentInput,
                });
                if (!e.hadRecentInput) window.__vitals005s.cls += e.value;
              }
            }).observe({ type: "layout-shift", buffered: true });
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                if (e.interactionId)
                  window.__vitals005s.events.push(e.duration);
            }).observe({
              type: "event",
              buffered: true,
              durationThreshold: 16,
            });
          });
          if (run === 1)
            await cdp.send("Tracing.start", {
              categories: "devtools.timeline,v8,blink.user_timing",
              transferMode: "ReturnAsStream",
            });
          await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
          await page.waitForTimeout(1200);
          await Promise.all(pending);
          const metric = async () =>
            Object.fromEntries(
              (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
                m.name,
                m.value,
              ]),
            );
          const initial = {
            assets: structuredClone(assets),
            api: structuredClone(api),
            vitals: await page.evaluate(() => window.__vitals005s),
            metrics: await metric(),
          };
          const begin = Date.now();
          await page
            .locator(stage === "after" ? "#home-guides" : "#community")
            .scrollIntoViewIfNeeded();
          if (stage === "after")
            await page
              .locator("[data-home-guide]")
              .first()
              .waitFor({ timeout: 30000 });
          await page.waitForTimeout(1000);
          await Promise.all(pending);
          const contentReadyMs = Date.now() - begin,
            content = {
              assets: structuredClone(assets),
              api: structuredClone(api),
              vitals: await page.evaluate(() => window.__vitals005s),
              metrics: await metric(),
            };
          if (run === 1) {
            const done = new Promise((resolve) =>
              cdp.once("Tracing.tracingComplete", resolve),
            );
            await cdp.send("Tracing.end");
            const { stream } = await done;
            let trace = "";
            for (;;) {
              const chunk = await cdp.send("IO.read", { handle: stream });
              trace += chunk.data;
              if (chunk.eof) break;
            }
            await cdp.send("IO.close", { handle: stream });
            fs.writeFileSync(
              path.join(
                __dirname,
                `${stage}-${slow ? "mobile" : "desktop"}.trace.json.gz`,
              ),
              zlib.gzipSync(trace),
            );
            await page.screenshot({
              path: path.join(
                __dirname,
                `${stage}-content-${slow ? 390 : 1440}.png`,
              ),
            });
          }
          results.push({
            stage,
            slow,
            run,
            width: slow ? 390 : 1440,
            initial,
            contentReadyMs,
            content,
            waterfall,
            errors,
          });
          fs.writeFileSync(
            path.join(__dirname, "performance-results.json"),
            JSON.stringify(
              {
                results,
                method:
                  "Actual fixed2836ed baseline/current static export, 3 fresh browser contexts per stage/condition alternated. Same sanitized3-record published snapshot and synthetic message fixture. Cache enabled, no Playwright interception, CDN icons blocked equally. Mobile390px CPU6x/150ms RTT/down200000Bps/up93750Bps; desktop1440 unthrottled. Initial then scroll to new recommendation or baseline community; baseline has no corresponding recommendation-ready metric. contentReadyMs includes an intentional1s settle. Raw trace records first run per condition. Decoded response sizes and calculated gzip separate from actual CDP encoded bytes. Local lab only, not field vitals/Netlify database latency.",
              },
              null,
              2,
            ),
          );
          console.log(
            JSON.stringify({
              stage,
              slow,
              run,
              lcp: initial.vitals.lcp,
              initialCls: initial.vitals.cls,
              afterScrollCls: content.vitals.cls,
              initialGuide: initial.api.filter((a) =>
                a.path.includes("strategies"),
              ).length,
              contentGuide: content.api.filter((a) =>
                a.path.includes("strategies"),
              ).length,
            }),
          );
          await context.close();
        }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
