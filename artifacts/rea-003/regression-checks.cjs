const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:3004",
  out = path.join(__dirname, "after");
const fixture = JSON.parse(
    fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
  ),
  results = [],
  writes = [];
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png") });
}
async function closeAll(page) {
  for (let i = 0; i < 5 && (await page.locator("dialog[open]").count()); i++) {
    const count = await page.locator("dialog[open]").count();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      (before) => document.querySelectorAll("dialog[open]").length < before,
      count,
    );
  }
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 960 },
      reducedMotion: "reduce",
      locale: "zh-CN",
    });
    let records = structuredClone(fixture),
      failImages = false;
    await context.route("**/.netlify/functions/**", (route) => {
      if (route.request().method() !== "GET") {
        writes.push("blocked");
        return route.abort();
      }
      return route.request().url().includes("/messages")
        ? route.fulfill({ json: records })
        : route.fulfill({
            status: 503,
            json: { error: "UI fixture service unavailable" },
          });
    });
    await context.route("**/1.png", (route) =>
      failImages
        ? route.fulfill({ status: 404, body: "UI image fixture missing" })
        : route.continue(),
    );
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await check(
      "mobile navigation open/navigate/close and Escape focus",
      async () => {
        const trigger = page.getByRole("button", {
          name: "打开导航",
          exact: true,
        });
        await trigger.click();
        await page
          .locator("#primary-navigation")
          .getByRole("link", { name: "公会介绍", exact: true })
          .click();
        assert(!(await page.locator("#primary-navigation").isVisible()));
        await trigger.click();
        await page.keyboard.press("Escape");
        assert(await trigger.evaluate((el) => el === document.activeElement));
      },
    );
    for (const [button, title] of [
      ["去签到", "每日签到"],
      ["查看任务", "每日任务"],
      ["查看排行", "积分与排行"],
      ["打开组队", "寻找队伍"],
      ["打开面板", "游戏数据"],
      ["查看公告", "公会动态"],
      ["赞助公会", "公会赞助"],
    ]) {
      await check(`retained entry ${title}`, async () => {
        await page.getByRole("button", { name: button, exact: true }).click();
        await page.getByRole("dialog", { name: title, exact: true }).waitFor();
        await shot(page, `regression-${title}-390`);
        await closeAll(page);
      });
    }
    await check("strategy and submission entry retained", async () => {
      await page.locator(".community-door").last().click();
      await page.getByText("攻略暂时加载失败，请重试。").waitFor();
      await page.getByRole("button", { name: /投稿攻略/ }).click();
      assert((await page.locator("dialog[open]").count()) >= 2);
      await shot(page, "regression-strategy-submission-390");
      await closeAll(page);
    });
    await check("join/login/change-password and FAQ retained", async () => {
      await page.locator(".hero-cta button").click();
      await page
        .getByRole("dialog", { name: "加入今夕公会", exact: true })
        .waitFor();
      await closeAll(page);
      await page.getByRole("button", { name: "打开导航", exact: true }).click();
      await page
        .locator("#primary-navigation")
        .getByRole("button", { name: "登录", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "账号登录", exact: true })
        .waitFor();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "修改密码", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "修改密码", exact: true })
        .waitFor();
      await closeAll(page);
      await page.getByRole("button", { name: /要不要强制语音/ }).click();
      assert(await page.getByText(/战队赛建议语音/).isVisible());
    });
    await check(
      "stale showcase ID reports unavailable rather than inventing record",
      async () => {
        await page.locator(".message-ribbon-card").nth(1).waitFor();
        records = records.filter((item) => item.id !== 9002);
        await page.locator(".message-ribbon-card").nth(1).click();
        await page
          .getByText(
            "这条留言不在当前公开列表中，可能已被移除或不在最近 100 条内。",
            { exact: true },
          )
          .waitFor();
        await shot(page, "messages-located-missing-390");
        await closeAll(page);
      },
    );
    records = fixture.slice(0, 1);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".message-ribbon-card").waitFor();
    await check("single public message is static", async () => {
      assert.equal(await page.locator(".message-ribbon-card").count(), 1);
      assert.equal(
        await page.locator(".message-ribbon").getAttribute("data-running"),
        "false",
      );
      await page.locator(".message-showcase").scrollIntoViewIfNeeded();
      await shot(page, "showcase-single-390");
    });
    failImages = true;
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator(".community-door").first().click();
      await page.locator(".message-card").first().waitFor();
      await page.locator(".message-attachment").scrollIntoViewIfNeeded();
      await page
        .locator('.message-attachment .content-image[data-state="error"]')
        .waitFor();
      await check(
        `message image unavailable has explicit fallback ${width}`,
        async () => {
          await shot(page, `message-image-error-${width}`);
          await page.locator(".message-attachment").click();
          await page
            .getByRole("dialog", { name: "留言配图", exact: true })
            .locator('.content-image[data-state="error"]')
            .waitFor();
          await shot(page, `message-preview-error-${width}`);
          await page.keyboard.press("Escape");
          await closeAll(page);
        },
      );
    }
    await check(
      "local identity is only used as existing display nickname",
      async () => {
        await page.evaluate(() => {
          localStorage.setItem("jinxi-auth-account", "ui-fixture-account");
          localStorage.setItem(
            "jinxi-auth-profile",
            JSON.stringify({
              account: "ui-fixture-account",
              nickname: "界面测试昵称",
            }),
          );
        });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(".community-door").first().click();
        await page.locator(".message-wall").waitFor();
        const details = page.locator(".message-composer-disclosure");
        if (!(await details.evaluate((el) => el.open)))
          await details.locator("summary").click();
        const input = page.getByLabel("你的昵称", { exact: false });
        assert.equal(await input.inputValue(), "界面测试昵称");
        assert((await input.getAttribute("readonly")) !== null);
        await closeAll(page);
      },
    );
    assert.deepEqual(writes, []);
    fs.writeFileSync(
      path.join(__dirname, "regression-results.json"),
      JSON.stringify(
        {
          results,
          writes,
          environment:
            "Local Edge. No POST attempted; unrelated APIs deliberately failed. Local auth profile is a UI fixture only, never server authentication.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(__dirname, "regression-results.json"),
      JSON.stringify({ results, writes, error: String(error) }, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
