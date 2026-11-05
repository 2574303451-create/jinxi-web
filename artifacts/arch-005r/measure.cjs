const {
  chromium,
} = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright");
const fs = require("node:fs"),
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
          const base = `http://127.0.0.1:${stage === "before" ? 3024 : 3025}`;
          await fetch(base + "/__review/reset", { method: "POST" });
          const context = await browser.newContext({
              viewport: { width: slow ? 390 : 1440, height: 1000 },
              locale: "zh-CN",
              reducedMotion: "reduce",
            }),
            page = await context.newPage(),
            cdp = await context.newCDPSession(page);
          const api = [],
            assets = {},
            waterfall = [],
            errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("request", (r) => {
            if (r.url().includes("/.netlify/functions/"))
              api.push({
                url: new URL(r.url()).pathname + new URL(r.url()).search,
                method: r.method(),
                at: Date.now(),
              });
          });
          const pending = [];
          page.on("response", (r) => {
            if (["script", "stylesheet"].includes(r.request().resourceType()))
              pending.push(
                (async () => {
                  const body = await r.body().catch(() => Buffer.alloc(0));
                  assets[new URL(r.url()).pathname] = {
                    type: r.request().resourceType(),
                    bytes: body.length,
                    gzip: zlib.gzipSync(body).length,
                    guideCode: /投稿攻略|guide-browser|strategy-actions/.test(
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
            window.__reviewVitals = { lcp: 0, cls: 0, events: [] };
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                window.__reviewVitals.lcp = e.startTime;
            }).observe({ type: "largest-contentful-paint", buffered: true });
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                if (!e.hadRecentInput) window.__reviewVitals.cls += e.value;
            }).observe({ type: "layout-shift", buffered: true });
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                if (e.interactionId)
                  window.__reviewVitals.events.push(e.duration);
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
          await cdp.send("HeapProfiler.collectGarbage");
          const metrics = async () =>
            Object.fromEntries(
              (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
                m.name,
                m.value,
              ]),
            );
          const initial = {
            assets: structuredClone(assets),
            api: structuredClone(api),
            metrics: await metrics(),
            vitals: await page.evaluate(() => window.__reviewVitals),
            resources: await page.evaluate(() =>
              performance
                .getEntriesByType("resource")
                .map((r) => ({
                  name: r.name,
                  type: r.initiatorType,
                  transfer: r.transferSize,
                  duration: r.duration,
                })),
            ),
          };
          const begin = Date.now();
          await page.locator(".community-door").last().click();
          await page.locator(".guide-card").first().waitFor({ timeout: 90000 });
          const openedMs = Date.now() - begin;
          await page.waitForTimeout(800);
          await Promise.all(pending);
          await cdp.send("HeapProfiler.collectGarbage");
          const opened = {
            assets: structuredClone(assets),
            api: structuredClone(api),
            metrics: await metrics(),
            vitals: await page.evaluate(() => window.__reviewVitals),
          };
          if (run === 1) {
            const done = new Promise((r) =>
              cdp.once("Tracing.tracingComplete", r),
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
                `${stage}-performance-guides-${slow ? 390 : 1440}.png`,
              ),
            });
          }
          results.push({
            stage,
            run,
            slow,
            width: slow ? 390 : 1440,
            openedMs,
            initial,
            opened,
            errors,
            waterfall,
          });
          fs.writeFileSync(
            path.join(__dirname, "performance-results.json"),
            JSON.stringify(
              {
                results,
                method:
                  "Actual fixed-baseline/current production static exports, same25-record synthetic memory API. Three fresh browser contexts per condition, alternated before/after. Cache enabled, no Playwright interception; CDN icon source blocked equally. Desktop unthrottled; mobile390px CPU6x, latency150ms, down200000B/s, up93750B/s. First trial per condition records initial load plus entry navigation in trace. Local laboratory samples, not real-user vitals or deployed database latency. Asset bytes are actual decoded responses; gzip is calculated separately, server itself serves uncompressed. Guide-open timing includes Playwright scroll/click, navigation, fetch and first visible card.",
              },
              null,
              2,
            ),
          );
          console.log(
            JSON.stringify({
              stage,
              run,
              slow,
              openedMs,
              initialGuideAPI: initial.api.filter((r) =>
                r.url.includes("strateg"),
              ).length,
              js: Object.values(initial.assets)
                .filter((a) => a.type === "script")
                .reduce((n, a) => n + a.bytes, 0),
              css: Object.values(initial.assets)
                .filter((a) => a.type === "stylesheet")
                .reduce((n, a) => n + a.bytes, 0),
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
