const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const base = "http://127.0.0.1:3029",
  snapshot = require("../arch-005s/public-guides-snapshot.json"),
  results = [],
  measurements = [],
  errors = [];
const record = (name, extra = {}) => {
  results.push({ name, passed: true, ...extra });
  console.log("PASS", name);
};
async function assertOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "horizontal overflow",
  );
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  let page;
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
          locale: "zh-CN",
          reducedMotion: "reduce",
        }),
        requests = [];
      page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) =>
        requests.push({
          url: r.url(),
          type: r.resourceType(),
          method: r.method(),
        }),
      );
      await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(
        requests.filter((r) => r.url.includes("/strategies")).length,
        0,
      );
      assert.equal(requests.filter((r) => r.type === "media").length, 0);
      await assertOverflow(page);
      await page.screenshot({
        path: path.join(__dirname, `home-top-${width}.png`),
      });
      record(`initial homepage has no guide API or media request ${width}`);
      const facts = page.locator("#guild-facts");
      await facts.scrollIntoViewIfNeeded();
      await facts
        .getByText(/8年/)
        .first()
        .waitFor()
        .catch(() => {});
      assert.equal(await facts.locator("a").count(), 4);
      assert.equal(
        (await facts.getByText("208", { exact: false }).count()) >= 1,
        true,
      );
      assert.equal(await facts.getByLabel("在线人数尚未接入").innerText(), "—");
      assert.equal(
        await facts.getByLabel("攻略视频总数尚未核实").innerText(),
        "—",
      );
      await facts.getByRole("link").nth(1).click();
      assert(await page.locator("#online-status").evaluate((el) => el.open));
      await page.evaluate(() => {
        localStorage.setItem("jinxi-auth-account", "not-a-session");
        localStorage.setItem("userId", "synthetic-not-online");
      });
      assert.equal(await facts.getByLabel("在线人数尚未接入").innerText(), "—");
      await page.locator("#online-status summary").click();
      await page.keyboard.press("Tab");
      await facts.locator("a").first().focus();
      const outline = await facts
        .locator("a")
        .first()
        .evaluate((el) => getComputedStyle(el).outlineWidth);
      assert.equal(outline, "3px");
      await page.mouse.move(1, 1);
      await facts.screenshot({
        path: path.join(__dirname, `statistics-${width}.png`),
      });
      const boxes = await facts.locator("a").evaluateAll((nodes) =>
        nodes.map((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, x: r.x, y: r.y };
        }),
      );
      const cols = new Set(boxes.map((b) => b.x)).size;
      assert.equal(cols, width >= 1024 ? 4 : 2);
      record(
        `four accurate statistic cards, safe placeholders and source details ${width}`,
      );
      const guides = page.locator("#home-guides");
      await guides.scrollIntoViewIfNeeded();
      await page.locator("[data-home-guide]").first().waitFor();
      assert.equal(
        requests.filter((r) => r.url.includes("/strategies")).length,
        1,
      );
      assert.equal(await page.locator("[data-home-guide]").count(), 3);
      for (const row of snapshot.rows)
        assert.equal(
          await guides
            .getByRole("heading", { name: row.title, exact: true })
            .count(),
          1,
        );
      assert.equal(await guides.locator("video").count(), 0);
      assert.equal(await guides.locator("img").count(), 0);
      await assertOverflow(page);
      await page.mouse.move(1, 1);
      await guides.screenshot({
        path: path.join(__dirname, `recommendations-${width}.png`),
      });
      await guides
        .getByRole("button", { name: "视频附件", exact: true })
        .click();
      await guides
        .getByText("这批公开内容尚无视频附件", { exact: true })
        .waitFor();
      await page.screenshot({
        path: path.join(__dirname, `no-video-${width}.png`),
      });
      await guides
        .getByRole("button", { name: "置顶精选", exact: true })
        .click();
      await guides
        .getByText("这批公开内容尚无置顶攻略", { exact: true })
        .waitFor();
      await guides
        .getByRole("button", { name: "公开更新", exact: true })
        .click();
      await facts.scrollIntoViewIfNeeded();
      await guides.scrollIntoViewIfNeeded();
      assert.equal(
        requests.filter((r) => r.url.includes("/strategies")).length,
        1,
      );
      record(
        `real published snapshot, scoped filters, zero fake cards, one request ${width}`,
      );
      const card = page.locator("[data-home-guide]").first();
      await page.keyboard.press("Tab");
      await card.focus();
      assert.equal(
        await card.evaluate((el) => getComputedStyle(el).outlineWidth),
        "3px",
      );
      await card.hover();
      assert.equal(
        await card.evaluate((el) => getComputedStyle(el).transform),
        "none",
      );
      const href = await card.getAttribute("href");
      await page.keyboard.press("Enter");
      await page.waitForURL("**" + href);
      await page.locator(".guide-reader h1").waitFor();
      assert.equal(
        await page.locator(".guide-reader h1").innerText(),
        snapshot.rows[0].title,
      );
      record(
        `keyboard link reaches independent guide, reduced motion ${width}`,
      );
      measurements.push({
        width,
        boxes,
        requests: requests.filter((r) => r.url.includes("/.netlify/")),
        scope:
          "Real public snapshot replay; detail snapshot excludes comment contents and user arrays. No live database writes.",
      });
      await context.close();
    }
    for (const mode of [
      "loading-error-retry",
      "empty",
      "few",
      "summary-unknown",
      "media-fixture",
    ]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 1000 },
        locale: "zh-CN",
        reducedMotion: "reduce",
      });
      page = await context.newPage();
      let release,
        phase = mode,
        count = 0;
      await context.route(
        "**/.netlify/functions/strategies?**",
        async (route) => {
          count++;
          if (phase === "loading-error-retry") {
            await new Promise((r) => (release = r));
            return route.fulfill({
              status: 503,
              json: { error: "Explicit synthetic failure" },
            });
          }
          const published = snapshot.rows.map((r) => ({ ...r }));
          let rows =
            phase === "empty"
              ? []
              : phase === "few"
                ? [published[0]]
                : phase === "summary-unknown"
                  ? [
                      {
                        ...published[0],
                        mediaFiles: undefined,
                        hasVideo: undefined,
                        videoCount: undefined,
                      },
                    ]
                  : phase === "media-fixture"
                    ? [
                        {
                          ...published[0],
                          title: "【合成 UI】视频附件及封面状态",
                          imageUrl: "/bg.png",
                          isPinned: true,
                          tags: ["合成UI", "非生产"],
                          mediaFiles: [{ type: "video", url: "/1.mp4" }],
                        },
                        {
                          ...published[1],
                          title: "【合成 UI】图片失败",
                          imageUrl: "/__missing_test_cover__.png",
                          mediaFiles: null,
                        },
                        {
                          ...published[2],
                          status: "draft",
                          title: "DRAFT MUST NOT DISPLAY",
                        },
                      ]
                    : published;
          return route.fulfill({
            json: {
              strategies: rows,
              pagination: { total: rows.length, hasMore: false },
            },
          });
        },
      );
      await page.goto(base, { waitUntil: "domcontentloaded" });
      const guides = page.locator("#home-guides");
      await guides.scrollIntoViewIfNeeded();
      if (mode === "loading-error-retry") {
        await guides.getByText("正在读取公开攻略…", { exact: true }).waitFor();
        await page.screenshot({
          path: path.join(__dirname, "state-loading-390.png"),
        });
        release();
        await guides.getByText("攻略暂时无法读取", { exact: true }).waitFor();
        await page.screenshot({
          path: path.join(__dirname, "state-error-390.png"),
        });
        phase = "ready";
        await guides.getByRole("button", { name: "重试", exact: true }).click();
        await page.locator("[data-home-guide]").first().waitFor();
        assert.equal(count, 2);
      }
      if (mode === "empty") {
        await guides
          .getByText("暂时还没有可展示的公开攻略", { exact: true })
          .waitFor();
        assert.equal(await page.locator("[data-home-guide]").count(), 0);
        await page.screenshot({
          path: path.join(__dirname, "state-empty-390.png"),
        });
      }
      if (mode === "few") {
        await page.locator("[data-home-guide]").first().waitFor();
        assert.equal(await page.locator("[data-home-guide]").count(), 1);
      }
      if (mode === "summary-unknown") {
        await page.locator("[data-home-guide]").first().waitFor();
        await guides
          .getByRole("button", { name: "视频附件", exact: true })
          .click();
        await guides.getByText("视频索引接入中", { exact: true }).waitFor();
      }
      if (mode === "media-fixture") {
        await page.locator("[data-home-guide]").first().waitFor();
        assert.equal(await page.locator("[data-home-guide]").count(), 2);
        await guides.getByText("封面暂不可用", { exact: true }).waitFor();
        assert.equal(
          await guides.locator("img").first().getAttribute("loading"),
          "lazy",
        );
        assert.equal(await guides.locator("video").count(), 0);
        assert.equal(
          await guides.getByText("含视频", { exact: true }).count(),
          1,
        );
        assert.equal(
          await guides
            .getByText("DRAFT MUST NOT DISPLAY", { exact: true })
            .count(),
          0,
        );
        await guides.screenshot({
          path: path.join(__dirname, "synthetic-media-states-390.png"),
        });
        await guides
          .getByRole("button", { name: "置顶精选", exact: true })
          .click();
        assert.equal(await page.locator("[data-home-guide]").count(), 1);
      }
      await assertOverflow(page);
      record(`explicit controlled state ${mode}`, { syntheticOnly: true });
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(__dirname, "browser-results.json"),
      JSON.stringify(
        {
          results,
          measurements,
          errors,
          method:
            "Actual production static export in Edge. Normal screenshots replay sanitized public published snapshot; state/media tests explicitly synthetic and labelled. All POST blocked by review server; no real login, online heartbeat, database, or video aggregation API tested.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    if (page && !page.isClosed())
      await page.screenshot({
        path: path.join(__dirname, "browser-failure.png"),
      });
    fs.writeFileSync(
      path.join(__dirname, "browser-results.json"),
      JSON.stringify(
        { results, measurements, errors, error: String(e) },
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
