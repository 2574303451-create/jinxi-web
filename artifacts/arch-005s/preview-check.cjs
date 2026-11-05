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
      }),
      origin = "http://127.0.0.1:3027",
      results = [];
    await page.goto(origin + "/review/", { waitUntil: "networkidle" });
    assert(await page.getByRole("heading", { level: 1 }).isVisible());
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const links = await page
      .locator("a")
      .evaluateAll((nodes) => [...new Set(nodes.map((n) => n.href))]);
    for (const href of links) {
      assert.equal(new URL(href).origin, origin);
      const response = await page.request.head(href);
      results.push({ path: new URL(href).pathname, status: response.status() });
      assert.equal(response.status(), 200, href);
    }
    const dom = await page.request.get(
      origin + "/review/reference/rea-desktop.html",
    );
    assert(dom.headers()["content-type"].startsWith("text/plain"));
    assert.equal(
      dom.headers()["content-security-policy"],
      "default-src 'none'; sandbox",
    );
    const denied = await page.request.post(
      origin + "/.netlify/functions/strategies",
      { data: { title: "No write may be forwarded" } },
    );
    assert.equal(denied.status(), 503);
    assert.equal(
      (
        await page.request.get(
          origin + "/.netlify/functions/strategies?status=draft",
        )
      ).status(),
      403,
    );
    await page.goto(origin + "/review-preview/");
    assert(await page.getByText("005S A阶段", { exact: false }).isVisible());
    await page.goto(origin + "/");
    await page.locator("#guild-facts").scrollIntoViewIfNeeded();
    assert.equal(await page.getByLabel("在线人数尚未接入").innerText(), "—");
    await page.locator("#home-guides").scrollIntoViewIfNeeded();
    await page.locator("[data-home-guide]").first().waitFor();
    assert.equal(await page.locator("[data-home-guide]").count(), 3);
    fs.writeFileSync(
      path.join(__dirname, "preview-check-results.json"),
      JSON.stringify(
        {
          passed: true,
          results,
          evidenceDOMServedAsText: true,
          localWritesRejected503: true,
          nonPublishedRejected403: true,
          scope:
            "Local read-only preview and all linked evidence resources. No production publishing or live database. HEAD used for large PNG evidence, real page/images rendered separately.",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ links: results.length, passed: true }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
