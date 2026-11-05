const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
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
    await page.clock.setFixedTime(new Date("2026-11-05T12:00:00Z"));
    await page.addInitScript(() => {
      const original = window.setTimeout,
        clear = window.clearTimeout;
      window.__longTimers = new Map();
      window.setTimeout = function (fn, delay, ...args) {
        let id;
        const wrapped = () => {
          window.__longTimers.delete(id);
          fn(...args);
        };
        id = original(wrapped, delay);
        if (delay > 3600000)
          window.__longTimers.set(id, { delay, fire: wrapped });
        return id;
      };
      window.clearTimeout = function (id) {
        window.__longTimers.delete(id);
        return clear(id);
      };
    });
    await page.goto("http://127.0.0.1:3027/", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#guild-facts").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__longTimers.size === 1);
    const before = await page.locator("#guild-facts a").nth(2).innerText(),
      active = await page.evaluate(() =>
        [...window.__longTimers.values()].map((v) => v.delay),
      );
    assert(before.includes("268"));
    await page.clock.setFixedTime(new Date("2026-11-06T00:00:01Z"));
    await page.evaluate(() => {
      const [id, timer] = [...window.__longTimers][0];
      clearTimeout(id);
      timer.fire();
    });
    await page.waitForFunction(() =>
      document.querySelector("#guild-facts").textContent.includes("269"),
    );
    const after = await page.locator("#guild-facts a").nth(2).innerText();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => window.__longTimers.size === 0);
    const offscreen = await page.evaluate(() => window.__longTimers.size);
    await page.locator("#guild-facts").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__longTimers.size === 1);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => window.__longTimers.size === 0);
    const hidden = await page.evaluate(() => window.__longTimers.size);
    fs.writeFileSync(
      path.join(__dirname, "clock-activity-results.json"),
      JSON.stringify(
        {
          passed: true,
          before,
          after,
          activeLongTimers: active.length,
          activeDelay: active,
          offscreenLongTimers: offscreen,
          backgroundLongTimers: hidden,
          scope:
            "Actual statistic component in browser. Controlled fixed Date and explicit invocation of the captured due callback exercise UTC day rollover; actual24h passage not observed; long owned timeouts observed, no extra second interval added. Hidden state explicitly simulated with Page Visibility event, not physical phone lock. This is NOT online heartbeat/session validation.",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS one daily timer, UTC rollover, offscreen and simulated background stop",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
