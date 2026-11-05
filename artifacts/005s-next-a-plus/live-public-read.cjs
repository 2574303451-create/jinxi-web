// Actual public GET forwarded to the local exported UI only for this browser check.
// No auth cookies, database credentials, fixture body or write forwarding.
const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const evidence = { at: new Date().toISOString(), requests: [], writes: [] };
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    let published = [];
    await context.route(
      "**/.netlify/functions/strategies?**",
      async (route) => {
        assert.equal(route.request().method(), "GET");
        const query = new URL(route.request().url()).search,
          source =
            "https://jinxi-web.netlify.app/.netlify/functions/strategies" +
            query,
          response = await fetch(source, {
            signal: AbortSignal.timeout(20000),
          }),
          body = await response.text();
        evidence.requests.push({
          url: source,
          status: response.status,
          contentType: response.headers.get("content-type"),
          bytes: Buffer.byteLength(body),
          sha256: crypto.createHash("sha256").update(body).digest("hex"),
        });
        assert(response.ok);
        const data = JSON.parse(body);
        published = (data.strategies || [])
          .slice(0, 3)
          .filter(
            (s) =>
              s.status === "published" && /^[1-9]\d{0,9}$/.test(String(s.id)),
          );
        return route.fulfill({
          status: response.status,
          contentType: "application/json",
          body,
        });
      },
    );
    page = await context.newPage();
    page.on("request", (r) => {
      if (r.url().includes("/.netlify/") && r.method() !== "GET")
        evidence.writes.push({ method: r.method(), url: r.url() });
    });
    await page.goto("http://127.0.0.1:3029/", { waitUntil: "networkidle" });
    assert.equal(evidence.requests.length, 0);
    await page.locator("#home-guides").scrollIntoViewIfNeeded();
    await page.locator("[data-home-guide]").first().waitFor({ timeout: 30000 });
    assert.equal(evidence.requests.length, 1);
    for (const item of published) {
      const card = page.locator(`[data-home-guide="${item.id}"]`);
      assert.equal(await card.locator("h3").innerText(), item.title);
      assert.equal(await card.getAttribute("href"), "/guides/?id=" + item.id);
    }
    assert.deepEqual(evidence.writes, []);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("#home-guides").scrollIntoViewIfNeeded();
      await page
        .locator("#home-guides")
        .screenshot({
          path: path.join(__dirname, `live-public-guides-${width}.png`),
        });
    }
    evidence.passed = true;
    evidence.publishedIDs = published.map((s) => String(s.id));
    evidence.scope =
      "Actual live anonymous HTTPS GET, no credentials or writes, body forwarded unchanged to real local exported UI through explicit Playwright route. This proves UI compatibility with current public response, not a deployed new frontend/SQL API. Normal screenshots also replay sanitized snapshot separately. Raw body and comment/reaction identity arrays not retained.";
    fs.writeFileSync(
      path.join(__dirname, "live-public-results.json"),
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence));
  } catch (e) {
    evidence.passed = false;
    evidence.error = String(e);
    fs.writeFileSync(
      path.join(__dirname, "live-public-results.json"),
      JSON.stringify(evidence, null, 2),
    );
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
