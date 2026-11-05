const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:3004";
const out = path.join(__dirname, "after"),
  results = [],
  measurements = [];
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
);
let debugPage;
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png") });
}
async function sample(page, ms = 800) {
  const t = await page
    .locator(".message-ribbon")
    .evaluate((e) => ({ x: e.scrollLeft, t: performance.now() }));
  await page.waitForTimeout(ms);
  const b = await page
    .locator(".message-ribbon")
    .evaluate((e) => ({ x: e.scrollLeft, t: performance.now() }));
  return {
    delta: b.x - t.x,
    ms: b.t - t.t,
    speed: (b.x - t.x) / ((b.t - t.t) / 1000),
  };
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const fixtureDir = path.resolve(__dirname, "../../app/rea003-fixture"),
    fixtureFile = path.join(fixtureDir, "page.tsx");
  let ownsFixture = false;
  assert(
    fixtureDir.startsWith(path.resolve(__dirname, "../../app") + path.sep),
  );
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      locale: "zh-CN",
      reducedMotion: "no-preference",
    });
    await context.route("**/.netlify/functions/**", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            json: route.request().url().includes("/messages") ? fixture : [],
          })
        : route.abort(),
    );
    const page = await context.newPage();
    debugPage = page;
    await page.goto(base, { waitUntil: "networkidle" });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.locator(".message-showcase").scrollIntoViewIfNeeded();
      await page.mouse.move(1, 1);
      await page.waitForFunction(
        () =>
          document.querySelector(".message-ribbon")?.dataset.running === "true",
      );
      await check(`ribbon speed and sufficient copies ${width}`, async () => {
        const m = await sample(page);
        measurements.push({ width, ...m });
        assert(m.speed > 27 && m.speed < 36, JSON.stringify(m));
        assert(
          await page.locator(".message-ribbon").evaluate((el) => {
            const group = el.querySelector(".message-ribbon-group");
            return (
              el.scrollWidth - el.clientWidth >=
              group.getBoundingClientRect().width + 20
            );
          }),
        );
        assert.equal(
          await page
            .locator(".message-ribbon-group:not([aria-hidden]) button")
            .count(),
          3,
        );
        assert(
          await page
            .locator(".message-ribbon-group[aria-hidden] button")
            .evaluateAll((buttons) => buttons.every((b) => b.tabIndex === -1)),
        );
      });
      await check(`ribbon hover and focus actually stop ${width}`, async () => {
        await page.locator(".message-ribbon").hover();
        await page.waitForTimeout(100);
        assert(Math.abs((await sample(page, 400)).delta) < 1);
        await page.mouse.move(1, 1);
        await page
          .locator(".message-ribbon-group:not([aria-hidden]) button")
          .first()
          .focus();
        await page.waitForTimeout(100);
        assert(Math.abs((await sample(page, 400)).delta) < 1);
        await shot(page, `showcase-focus-${width}`);
        await page
          .getByRole("button", { name: "暂停滚动", exact: true })
          .focus();
      });
      await check(`ribbon manual pause/resume ${width}`, async () => {
        await page
          .getByRole("button", { name: "暂停滚动", exact: true })
          .click();
        await page.mouse.move(1, 1);
        assert(Math.abs((await sample(page, 400)).delta) < 1);
        await shot(page, `showcase-paused-${width}`);
        await page
          .getByRole("button", { name: "恢复滚动", exact: true })
          .click();
        await page.mouse.move(1, 1);
        assert((await sample(page, 400)).delta > 5);
      });
      await check(`ribbon touch/manual browse ${width}`, async () => {
        const ribbon = page.locator(".message-ribbon");
        await ribbon.dispatchEvent("pointerdown", {
          pointerType: "touch",
          pointerId: 1,
        });
        await ribbon.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(500);
        assert.equal(await ribbon.getAttribute("data-running"), "false");
        assert(await ribbon.evaluate((e) => e.scrollLeft > 0));
        await page
          .getByRole("button", { name: "恢复滚动", exact: true })
          .click();
        await page.mouse.move(1, 1);
      });
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.getByRole("button", { name: "打开轮播展示" }).click();
    await page.locator(".member-carousel").waitFor();
    await page.mouse.move(1, 1);
    await check(
      "carousel genuine autoplay switches after five seconds",
      async () => {
        assert.equal(
          await page.locator(".carousel-pagination").innerText(),
          "1 / 12",
        );
        await page.waitForTimeout(5250);
        assert.equal(
          await page.locator(".carousel-pagination").innerText(),
          "2 / 12",
        );
      },
    );
    await check(
      "carousel hover/focus suspend timer and detail restores pause",
      async () => {
        await page.locator(".member-carousel-stage").hover();
        assert.equal(
          await page.locator(".member-carousel").getAttribute("data-autoplay"),
          "false",
        );
        await page.mouse.move(1, 1);
        const detail = page.getByRole("button", {
          name: "查看成员详情",
          exact: false,
        });
        await detail.focus();
        assert.equal(
          await page.locator(".member-carousel").getAttribute("data-autoplay"),
          "false",
        );
        await detail.click();
        await page.locator(".member-profile").waitFor();
        await page.keyboard.press("Escape");
        assert(await detail.evaluate((el) => el === document.activeElement));
        assert.equal(
          await page.locator(".member-carousel").getAttribute("data-autoplay"),
          "false",
        );
        await page.keyboard.press("Escape");
      },
    );
    // Hover lift, pressed and keyboard-visible focus use actual computed styles.
    await page.getByRole("button", { name: "查看全部", exact: true }).click();
    const card = page.locator(".member-directory-card").first();
    await page.mouse.move(1, 1);
    await card.scrollIntoViewIfNeeded();
    await check("member card hover and button pressed/focus", async () => {
      const a = await card.boundingBox();
      await card.hover();
      await page.waitForTimeout(250);
      const b = await card.boundingBox();
      assert(Math.abs(a.y - b.y - 3) < 1);
      await shot(page, "members-hover");
      const filter = page.getByRole("button", { name: "全部", exact: true });
      await filter.focus();
      await page.keyboard.press("Tab");
      await shot(page, "members-keyboard-focus");
      const next = page.getByRole("button", {
        name: "加载更多成员",
        exact: false,
      });
      await next.scrollIntoViewIfNeeded();
      const box = await next.boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.waitForTimeout(250);
      await shot(page, "button-pressed");
      assert(
        await next.evaluate((el) => getComputedStyle(el).transform !== "none"),
      );
      await page.mouse.up();
    });
    await page.keyboard.press("Escape");
    // Disposable local route tests impossible static-data boundaries without editing real member arrays.
    assert(
      !fs.existsSync(fixtureDir),
      "Refusing to replace an existing application route",
    );
    fs.mkdirSync(fixtureDir);
    ownsFixture = true;
    fs.copyFileSync(path.join(__dirname, "fixture-page.tsx.txt"), fixtureFile);
    const boundary = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
      locale: "zh-CN",
    });
    let release = [];
    await boundary.route("**/missing-rea003-fixture.png", async (route) => {
      await new Promise((resolve) => release.push(resolve));
      await route
        .fulfill({ status: 404, body: "test image missing" })
        .catch(() => {});
    });
    const bp = await boundary.newPage();
    debugPage = bp;
    for (const width of [1440, 768, 390]) {
      await bp.setViewportSize({ width, height: 960 });
      await bp.goto(base + "/rea003-fixture", {
        waitUntil: "domcontentloaded",
      });
      await bp.getByRole("button", { name: "single", exact: true }).waitFor();
      await check(`empty grid/carousel safe ${width}`, async () => {
        assert(
          await bp.getByText("暂无可展示的成员", { exact: true }).isVisible(),
        );
        assert(await bp.getByText("暂无成员展示", { exact: true }).isVisible());
        assert.equal(await bp.locator(".member-directory-card").count(), 0);
        await shot(bp, `members-carousel-empty-${width}`);
      });
      await bp.getByRole("button", { name: "single", exact: true }).click();
      await bp.locator(".member-directory-card .image-status").waitFor();
      await shot(bp, `member-image-loading-${width}`);
      await check(
        `member image failure fallback and single slide ${width}`,
        async () => {
          release.splice(0).forEach((resolve) => resolve());
          await bp
            .locator(".member-directory-card .image-fallback-note")
            .waitFor();
          await shot(bp, `member-image-fallback-${width}`);
          assert(
            await bp
              .getByRole("button", { name: "下一张", exact: true })
              .isDisabled(),
          );
          assert.equal(
            await bp.locator(".carousel-pagination").innerText(),
            "1 / 1",
          );
          await bp.locator(".member-directory-card").click();
          await bp.locator(".member-profile").waitFor();
          assert(
            await bp
              .getByText("这位伙伴暂时还没有留下个人介绍。", { exact: true })
              .last()
              .isVisible(),
          );
          release.splice(0).forEach((resolve) => resolve());
          await bp.locator(".member-profile .image-fallback-note").waitFor();
          await shot(bp, `member-detail-fallback-${width}`);
          await bp.keyboard.press("Escape");
        },
      );
      await bp.getByRole("button", { name: "long", exact: true }).click();
      await bp.locator(".member-directory-card").click();
      await bp.locator(".member-profile").waitFor();
      release.splice(0).forEach((resolve) => resolve());
      await check(
        `long original text remains complete and dialog no overflow ${width}`,
        async () => {
          assert.equal(
            await bp.locator(".member-profile-description p").innerText(),
            "这是独立测试数据，不是公会真实成员。".repeat(25),
          );
          assert(
            await bp
              .getByRole("dialog")
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          );
          await shot(bp, `member-detail-long-${width}`);
          await bp.keyboard.press("Escape");
        },
      );
    }
    await boundary.close();
    fs.writeFileSync(
      path.join(__dirname, "motion-results.json"),
      JSON.stringify(
        {
          results,
          measurements,
          environment:
            "Local Edge actual timing, native mouse/keyboard. Boundary page uses explicit synthetic component props and intercepts missing image only. No production writes.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (debugPage) await shot(debugPage, "motion-test-failure").catch(() => {});
    fs.writeFileSync(
      path.join(__dirname, "motion-results.json"),
      JSON.stringify({ results, measurements, error: String(error) }, null, 2),
    );
    throw error;
  } finally {
    if (ownsFixture) {
      if (fs.existsSync(fixtureFile)) fs.unlinkSync(fixtureFile);
      if (fs.existsSync(fixtureDir)) fs.rmdirSync(fixtureDir);
    }
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
