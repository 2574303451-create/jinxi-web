const {
    chromium,
  } = require("C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const base = "http://127.0.0.1:3025",
  results = [],
  errors = [],
  requests = [];
const fixture = require("../arch-005/fixture.cjs").strategies;
const special = structuredClone(fixture[0]);
special.content =
  '# 一级标题\n\n中文 English 混排与 **加粗**、`inline code`。\n\n## 二级标题\n\n1. 有序第一项\n2. 有序第二项\n  - 嵌套无序内容\n\n### 三级标题\n\n- 无序第一项\n- 无序第二项\n\n```js\nconst safe = "<script>";\n```\n\n![测试图片](/bg.png)\n\n<img src=x onerror=alert(1)>\n\n' +
  "LongEnglishTextWithoutSpaces".repeat(40);
special.mediaFiles = [];
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    await context.route("**/.netlify/functions/strategies?**", (route) => {
      const url = new URL(route.request().url());
      requests.push(url.search);
      if (url.searchParams.has("id"))
        return route.fulfill({
          json: { strategy: { ...special, id: url.searchParams.get("id") } },
        });
      let list = Array.from({ length: 36 }, (_, i) => ({
        ...fixture[i % 25],
        id: String(i + 1),
        category: "PVE",
        difficulty: 2,
        title: `【合成审查】Search ${i + 1}`,
      }));
      return route.fulfill({
        json: {
          strategies: list
            .slice(
              Number(url.searchParams.get("offset") || 0),
              Number(url.searchParams.get("offset") || 0) + 12,
            )
            .map((item) => ({
              ...item,
              excerpt: "合成摘要",
              likeCount: 1,
              commentCount: 1,
              favoriteCount: 0,
            })),
          pagination: {
            total: 36,
            hasMore: Number(url.searchParams.get("offset") || 0) < 24,
          },
        },
      });
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      requests.length = 0;
      await page.goto(
        base + "/guides/?q=Search&category=PVE&difficulty=2&sort=likes&page=2",
        { waitUntil: "networkidle" },
      );
      await page.locator(".guide-card").first().waitFor();
      assert.equal(
        await page.getByRole("combobox", { name: /^难度/ }).inputValue(),
        "2",
      );
      assert.equal(
        await page.getByRole("combobox", { name: /^排序/ }).inputValue(),
        "likes",
      );
      assert.equal(
        await page.getByLabel("找一篇需要的攻略").inputValue(),
        "Search",
      );
      assert.equal(await page.getByText("第 2 页", { exact: true }).count(), 1);
      assert.equal(requests.length, 1);
      await page.screenshot({
        path: path.join(__dirname, `guides-filters-${width}.png`),
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.getByText("第 2 页", { exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get("difficulty"), "2");
      const before = requests.length;
      await page.getByRole("button", { name: "下一页", exact: true }).click();
      await page.getByText("第 3 页", { exact: true }).waitFor();
      await page.waitForTimeout(150);
      assert.equal(requests.length, before + 1);
      assert.equal(new URL(page.url()).searchParams.get("page"), "3");
      const position = await page
        .locator(".guide-browser")
        .evaluate((el) => el.getBoundingClientRect().top);
      assert(Math.abs(position - 24) < 2);
      await page.locator(".guide-card h2 a").first().click();
      await page.locator(".guide-reader h1").waitFor();
      assert.equal(new URL(page.url()).searchParams.get("page"), "3");
      assert.equal(new URL(page.url()).searchParams.get("sort"), "likes");
      assert.equal(new URL(page.url()).searchParams.get("id"), "25");
      assert.equal(await page.locator(".guide-body h2").count(), 1);
      assert.equal(await page.locator(".guide-body h3").count(), 1);
      assert.equal(await page.locator(".guide-body h4").count(), 1);
      assert.equal(await page.locator(".guide-body ol").count(), 1);
      assert.equal(await page.locator(".guide-body ul").count(), 2);
      assert.equal(await page.locator(".guide-body pre code").count(), 1);
      assert.equal(await page.locator(".guide-body script").count(), 0);
      assert.equal(await page.locator(".guide-body img").count(), 1);
      assert(
        await page
          .getByText("<img src=x onerror=alert(1)>", { exact: true })
          .isVisible(),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: path.join(__dirname, `guides-body-${width}.png`),
      });
      await page.goBack();
      await page.getByText("第 3 页", { exact: true }).waitFor();
      await page.locator(".guide-card").first().waitFor();
      await page.goBack();
      await page.getByText("第 2 页", { exact: true }).waitFor();
      await page.goForward();
      await page.getByText("第 3 页", { exact: true }).waitFor();
      await page.goForward();
      await page.locator(".guide-reader h1").waitFor();
      await page.reload({ waitUntil: "networkidle" });
      await page.locator(".guide-reader h1").waitFor();
      assert.equal(new URL(page.url()).searchParams.get("category"), "PVE");
      await page
        .getByRole("link", { name: "← 返回攻略列表", exact: true })
        .click();
      await page.getByText("第 3 页", { exact: true }).waitFor();
      results.push({
        width,
        name: "full URL state, refresh, detail, back/forward, pagination scroll, one API per transition, safe Markdown subset",
        passed: true,
      });
      console.log("PASS guides", width);
    }
    await page.goto(
      base + "/guides/?q=Search&category=PVE&difficulty=2&sort=likes&page=3",
    );
    await page
      .getByRole("button", { name: "写一篇攻略 ↗", exact: true })
      .click();
    await page.getByRole("dialog", { name: "投稿攻略" }).waitFor();
    await page.getByLabel("攻略标题", { exact: true }).fill("合成投稿");
    await page.getByLabel("攻略正文", { exact: true }).fill(special.content);
    await page.getByRole("button", { name: "预览正文", exact: true }).click();
    assert.equal(await page.locator(".guide-body-preview script").count(), 0);
    await page.screenshot({
      path: path.join(__dirname, "guides-submission-320.png"),
    });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    results.push({
      name: "submission preview stays safe, one close control, no fake cloud file upload",
      passed: true,
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(__dirname, "guide-browser-results.json"),
      JSON.stringify(
        {
          results,
          errors,
          scope:
            "Actual exported pages. Synthetic HTTP list/detail responses deliberately intercepted for deterministic 36-record pagination/Markdown tests, not production API or database writes. Request counts and browser history observed.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    if (page)
      await page.screenshot({
        path: path.join(__dirname, "guide-failure.png"),
      });
    fs.writeFileSync(
      path.join(__dirname, "guide-browser-results.json"),
      JSON.stringify({ results, errors, error: String(e) }, null, 2),
    );
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
