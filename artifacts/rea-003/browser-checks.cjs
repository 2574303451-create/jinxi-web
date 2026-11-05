const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:3004";
const out = path.join(__dirname, "after");
fs.mkdirSync(out, { recursive: true });
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ui-fixture.json"), "utf8"),
);
const results = [],
  errors = [],
  writes = [],
  metrics = [];
let debugPage;
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png") });
}
async function close(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
}
async function openMessages(page) {
  await page.locator(".community-door").first().click();
  await page
    .getByRole("dialog", { name: "留下你的声音", exact: true })
    .waitFor();
  await page.locator(".message-wall").waitFor();
}
async function openComposer(page) {
  const summary = page.locator(".message-composer-disclosure > summary");
  if (
    (await summary.isVisible()) &&
    !(await page
      .locator(".message-composer-disclosure")
      .evaluate((el) => el.open))
  )
    await summary.click();
}
async function overflow(page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth <= innerWidth,
    dialogs: [...document.querySelectorAll("dialog[open]")].map((el) => ({
      name: el.getAttribute("aria-labelledby"),
      ok: el.scrollWidth <= el.clientWidth + 1,
      scroll: el.scrollWidth,
      width: el.clientWidth,
    })),
  }));
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
      reducedMotion: "reduce",
    });
    let mode = "data",
      records = structuredClone(fixture),
      gates = [],
      rejectWrites = false,
      adminFailures = 0;
    await context.route("**/.netlify/functions/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        endpoint = url.pathname.split("/").pop();
      if (req.method() === "GET") {
        if (endpoint !== "messages") return route.fulfill({ json: [] });
        if (mode === "loading")
          await new Promise((resolve) => gates.push(resolve));
        return route
          .fulfill({
            status: mode === "error" ? 503 : 200,
            json:
              mode === "error"
                ? { error: "UI fixture unavailable" }
                : mode === "empty"
                  ? []
                  : mode === "single"
                    ? records.slice(0, 1)
                    : records,
          })
          .catch(() => {});
      }
      // ALL write requests are intercepted. This is a disposable in-memory test API.
      const data = req.postDataJSON();
      writes.push({
        endpoint,
        action: data.action || "create",
        intercepted: true,
      });
      if (rejectWrites)
        return route.fulfill({
          status: 503,
          json: { error: "UI fixture write unavailable" },
        });
      if (endpoint === "messages") {
        const item = {
          ...data,
          id: String(9010 + records.length),
          timestamp: new Date().toISOString(),
          replies: [],
          reactions: [],
          isPinned: false,
        };
        records.push(item);
        return route.fulfill({ status: 201, json: item });
      }
      if (endpoint !== "message-actions")
        return route.fulfill({
          status: 503,
          json: { error: "No test implementation" },
        });
      const item = records.find(
        (item) => String(item.id) === String(data.messageId),
      );
      assert(item);
      if (
        ["pin", "delete"].includes(data.action) &&
        data.password !== "fixture-only"
      ) {
        adminFailures++;
        return route.fulfill({
          status: 403,
          json: { error: "界面测试：管理密码未通过验证" },
        });
      }
      if (data.action === "reply") {
        const reply = {
          ...data.data,
          id: "reply-fixture",
          timestamp: new Date().toISOString(),
        };
        item.replies.push(reply);
        return route.fulfill({ json: reply });
      }
      if (data.action === "reaction") {
        const type = data.data.type;
        let r = item.reactions.find((r) => r.type === type);
        if (!r) {
          r = { type, count: 0, users: [] };
          item.reactions.push(r);
        }
        r.users = r.users.includes(data.data.userName)
          ? r.users.filter((u) => u !== data.data.userName)
          : [...r.users, data.data.userName];
        r.count = r.users.length;
        return route.fulfill({ json: item.reactions });
      }
      if (data.action === "pin") {
        item.isPinned = !item.isPinned;
        return route.fulfill({ json: { pinned: item.isPinned } });
      }
      if (data.action === "delete") {
        records = records.filter((r) => r !== item);
        return route.fulfill({ json: { success: true } });
      }
      return route.fulfill({
        status: 400,
        json: { error: "Unknown fixture action" },
      });
    });
    const page = await context.newPage();
    debugPage = page;
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(() => scrollTo(0, 0));
      await shot(page, `homepage-${width}`);
      await check(`homepage/anchors/overflow ${width}`, async () => {
        assert((await overflow(page)).document);
        assert(
          await page.evaluate(() =>
            [...document.querySelectorAll('a[href^="#"]')].every((a) =>
              document.getElementById(a.getAttribute("href").slice(1)),
            ),
          ),
        );
      });
      await page.locator(".message-showcase").scrollIntoViewIfNeeded();
      await shot(page, `showcase-${width}`);
      await check(
        `showcase real IDs/one accessible copy/reduced-motion ${width}`,
        async () => {
          assert.equal(await page.locator(".message-ribbon-group").count(), 1);
          assert.equal(await page.locator(".message-ribbon-card").count(), 3);
          assert.equal(
            await page.locator(".message-ribbon").getAttribute("data-running"),
            "false",
          );
          assert.equal(
            await page
              .locator(".message-ribbon")
              .getByText("fixture-a")
              .count(),
            0,
          );
        },
      );
      await page.locator(".message-ribbon-card").nth(1).click();
      await page.locator('[data-message-id="9002"]').waitFor();
      await check(
        `showcase click positions correct message and focus ${width}`,
        async () => {
          await page.waitForFunction(
            () =>
              document.activeElement?.getAttribute("data-message-id") ===
              "9002",
          );
          assert.equal(
            await page
              .locator('[data-message-id="9002"]')
              .evaluate((el) => el === document.activeElement),
            true,
          );
        },
      );
      await shot(page, `messages-located-${width}`);
      await close(page);
      await openMessages(page);
      await check(`wall uses direct semantic styles ${width}`, async () => {
        assert.equal(
          await page
            .locator(".message-wall")
            .evaluate((el) =>
              Boolean(el.closest(".legacy-module,.legacy-dialog-content")),
            ),
          false,
        );
        assert((await overflow(page)).dialogs.every((d) => d.ok));
      });
      await shot(page, `messages-${width}`);
      await openComposer(page);
      await page.getByLabel("你的昵称", { exact: false }).fill("界面测试访客");
      await page
        .getByLabel("想说的话", { exact: false })
        .fill("界面状态检查，尚未发送。");
      await page.getByLabel("想说的话", { exact: false }).focus();
      await shot(page, `messages-form-focus-${width}`);
      await page.locator('[data-message-id="9001"]').scrollIntoViewIfNeeded();
      await shot(page, `messages-card-${width}`);
      await page
        .locator('[data-message-id="9001"] .paper-text-button')
        .first()
        .click();
      await page
        .getByLabel("回复 界面测试 · 小夕", { exact: true })
        .fill("界面回复草稿");
      await shot(page, `messages-reply-${width}`);
      await page
        .getByRole("button", {
          name: "查看界面测试 · 小夕的留言配图",
          exact: true,
        })
        .click();
      await check(
        `image nested dialog trap/Escape/focus ${width}`,
        async () => {
          assert.equal(await page.locator("dialog[open]").count(), 2);
          const dlg = page.getByRole("dialog", {
            name: "留言配图",
            exact: true,
          });
          await dlg.getByRole("button", { name: "关闭弹窗" }).focus();
          await page.keyboard.press("Shift+Tab");
          assert(
            await dlg.evaluate((el) => el.contains(document.activeElement)),
          );
          await shot(page, `messages-image-${width}`);
          await close(page);
          assert.equal(await page.locator("dialog[open]").count(), 1);
          assert(
            await page
              .getByRole("button", {
                name: "查看界面测试 · 小夕的留言配图",
                exact: true,
              })
              .evaluate((el) => el === document.activeElement),
          );
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "hidden",
          );
        },
      );
      await page
        .locator('[data-message-id="9001"] .message-admin-menu summary')
        .click();
      await page
        .locator('[data-message-id="9001"] .message-admin-menu')
        .getByRole("button", { name: "取消置顶", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "管理置顶", exact: true })
        .waitFor();
      await shot(page, `messages-admin-${width}`);
      await close(page);
      await close(page);
      for (const state of ["empty", "error", "loading"]) {
        mode = state;
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(".message-showcase").scrollIntoViewIfNeeded();
        await page.locator(`.message-showcase .paper-state.${state}`).waitFor();
        await shot(page, `showcase-${state}-${width}`);
        await openMessages(page);
        await page.locator(`.message-wall .paper-state.${state}`).waitFor();
        await shot(page, `messages-${state}-${width}`);
        await check(
          `explicit ${state} no invented records ${width}`,
          async () => {
            assert.equal(await page.locator(".message-card").count(), 0);
            assert.equal(await page.locator(".message-ribbon-card").count(), 0);
            assert(
              await page.locator(".message-wall .paper-state").isVisible(),
            );
          },
        );
        if (state === "error") {
          mode = "data";
          await page
            .getByRole("dialog", { name: "留下你的声音" })
            .getByRole("button", { name: "重新加载", exact: true })
            .click();
          await page.locator(".message-card").first().waitFor();
          assert.equal(await page.locator(".message-card").count(), 3);
        }
        mode = "data";
        gates.splice(0).forEach((resolve) => resolve());
        await close(page);
      }
      mode = "data";
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "查看全部", exact: true }).click();
      await page.locator(".member-directory-card").first().waitFor();
      await page.waitForFunction(
        () => document.querySelector("dialog[open]")?.scrollTop === 0,
      );
      await shot(page, `members-${width}`);
      await check(`member filters/load more ${width}`, async () => {
        assert.equal(await page.locator(".member-directory-card").count(), 12);
        await page
          .getByRole("button", { name: "加载更多成员", exact: false })
          .click();
        assert.equal(await page.locator(".member-directory-card").count(), 24);
        await page.getByRole("button", { name: "萌新", exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: "萌新", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert((await page.locator(".member-directory-card").count()) > 0);
        await shot(page, `members-filter-${width}`);
        await page.getByRole("button", { name: "全部", exact: true }).click();
      });
      const card = page.locator(".member-directory-card").first();
      await card.focus();
      await page.keyboard.press("Enter");
      await page.locator(".member-profile").waitFor();
      await shot(page, `member-detail-${width}`);
      await check(
        `directory nested detail close restores card ${width}`,
        async () => {
          assert.equal(await page.locator("dialog[open]").count(), 2);
          await close(page);
          assert(await card.evaluate((el) => el === document.activeElement));
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "hidden",
          );
          await close(page);
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "",
          );
        },
      );
      await page.getByRole("button", { name: "打开轮播展示" }).click();
      await page.locator(".member-carousel").waitFor();
      await shot(page, `carousel-${width}`);
      await check(
        `carousel controls/keyboard/visible detail ${width}`,
        async () => {
          await page
            .getByRole("button", { name: "下一张", exact: true })
            .click();
          assert(
            await page
              .locator(".carousel-pagination")
              .textContent()
              .then((t) => t.startsWith("2")),
          );
          await page.keyboard.press("ArrowLeft");
          assert(
            await page
              .locator(".carousel-pagination")
              .textContent()
              .then((t) => t.startsWith("1")),
          );
          const trigger = page.getByRole("button", {
            name: "查看成员详情",
            exact: false,
          });
          await trigger.focus();
          await page.keyboard.press("Space");
          await page.locator(".member-profile").waitFor();
          assert.equal(await page.locator("dialog[open]").count(), 2);
          assert((await overflow(page)).dialogs.every((d) => d.ok));
          await shot(page, `carousel-detail-${width}`);
          await close(page);
          assert(await trigger.evaluate((el) => el === document.activeElement));
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "hidden",
          );
        },
      );
      await check(`carousel touch next ${width}`, async () => {
        const stage = page.locator(".member-carousel-stage");
        await stage.scrollIntoViewIfNeeded();
        const box = await stage.boundingBox();
        const session = await context.newCDPSession(page);
        const y = Math.max(150, Math.min(box.y + 100, 850));
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width * 0.8, y }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: box.x + box.width * 0.2, y }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
        assert(
          await page
            .locator(".carousel-pagination")
            .textContent()
            .then((t) => t.startsWith("2")),
        );
      });
      await close(page);
    }
    // In-memory POST/reply/reaction/admin compatibility; never touches Netlify or a database.
    await page.setViewportSize({ width: 1440, height: 960 });
    await openMessages(page);
    await openComposer(page);
    await check("category empty filter/reset", async () => {
      await page.getByRole("button", { name: "公告", exact: true }).click();
      await page.getByText("还没有「公告」留言").waitFor();
      await shot(page, "messages-filter-empty");
      await page
        .getByRole("button", { name: "查看全部留言", exact: true })
        .click();
    });
    await check("upload validation/preview/remove", async () => {
      const input = page.locator("input[type=file]");
      await input.setInputFiles({
        name: "wrong.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("test"),
      });
      await page.getByText("请选择图片文件。", { exact: true }).waitFor();
      await input.setInputFiles({
        name: "large.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
      });
      await page.getByText("图片不能超过 2MB。", { exact: true }).waitFor();
      await input.setInputFiles({
        name: "tiny.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await page.locator(".message-upload-preview").waitFor();
      await page.getByRole("button", { name: "移除配图", exact: true }).click();
      assert.equal(await page.locator(".message-upload-preview").count(), 0);
    });
    await check(
      "failed submit retains draft, successful mock submit refreshes ribbon",
      async () => {
        await page
          .getByLabel("你的昵称", { exact: false })
          .fill("界面测试访客");
        await page
          .getByLabel("想说的话", { exact: false })
          .fill("仅在内存测试环境发布的留言");
        rejectWrites = true;
        await page
          .getByRole("button", { name: "发布留言", exact: true })
          .click();
        await page.getByText("发布失败，内容已保留，请稍后重试。").waitFor();
        assert.equal(
          await page.getByLabel("想说的话", { exact: false }).inputValue(),
          "仅在内存测试环境发布的留言",
        );
        await shot(page, "messages-submit-error");
        rejectWrites = false;
        await page
          .getByRole("button", { name: "发布留言", exact: true })
          .click();
        await page.getByText("留言已发布。谢谢你留下这一刻。").waitFor();
        await page
          .locator(".message-card")
          .filter({ hasText: "仅在内存测试环境发布的留言" })
          .waitFor();
        assert.equal(
          await page.getByLabel("想说的话", { exact: false }).inputValue(),
          "",
        );
      },
    );
    const first = page.locator('[data-message-id="9001"]');
    await check(
      "mock reply preserved failure/retry and reaction toggle",
      async () => {
        await first.getByRole("button", { name: /^回复/ }).click();
        await page
          .getByLabel("回复 界面测试 · 小夕", { exact: true })
          .fill("仅在内存测试环境回复");
        rejectWrites = true;
        await page
          .getByRole("button", { name: "发送回复", exact: true })
          .click();
        await page
          .getByText("回复失败，内容已保留。请检查留言是否仍然存在后重试。")
          .waitFor();
        assert.equal(
          await page
            .getByLabel("回复 界面测试 · 小夕", { exact: true })
            .inputValue(),
          "仅在内存测试环境回复",
        );
        rejectWrites = false;
        await page
          .getByRole("button", { name: "发送回复", exact: true })
          .click();
        await first
          .getByText("仅在内存测试环境回复", { exact: true })
          .waitFor();
        const reaction = first.getByRole("button", {
          name: "回应 👍",
          exact: true,
        });
        await reaction.click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-message-id="9001"] [aria-label="回应 👍"]')
              ?.getAttribute("aria-pressed") === "true",
        );
        await shot(page, "messages-reaction-selected");
        await reaction.click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-message-id="9001"] [aria-label="回应 👍"]')
              ?.getAttribute("aria-pressed") === "false",
        );
      },
    );
    await check(
      "admin server rejection remains retryable, then mock pin/unpin",
      async () => {
        await first.locator("summary").click();
        await first
          .getByRole("button", { name: "取消置顶", exact: true })
          .click();
        const dlg = page.getByRole("dialog", { name: "管理置顶" });
        await dlg.getByLabel("管理密码", { exact: true }).fill("wrong-fixture");
        await dlg.getByRole("button", { name: "确认操作" }).click();
        await dlg.getByText("界面测试：管理密码未通过验证").waitFor();
        await shot(page, "messages-admin-error");
        await dlg.getByLabel("管理密码", { exact: true }).fill("fixture-only");
        await dlg.getByRole("button", { name: "确认操作" }).click();
        await dlg.waitFor({ state: "hidden" });
        assert.equal(await first.locator(".message-pin").count(), 0);
        assert.equal(adminFailures, 1);
        await first.locator("summary").click();
        await first
          .getByRole("button", { name: "置顶留言", exact: true })
          .click();
        await dlg.getByLabel("管理密码", { exact: true }).fill("fixture-only");
        await dlg.getByRole("button", { name: "确认操作" }).click();
        await first.locator(".message-pin").waitFor();
      },
    );
    await check(
      "delete confirmation and mock delete restore parent focus",
      async () => {
        await page
          .getByRole("dialog", { name: "管理置顶" })
          .waitFor({ state: "hidden" });
        await first.locator("summary").click();
        page.once("dialog", (dialog) => dialog.dismiss());
        await first
          .getByRole("button", { name: "删除留言", exact: true })
          .click();
        assert.equal(await page.locator("dialog[open]").count(), 1);
        page.once("dialog", (dialog) => dialog.accept());
        await first
          .getByRole("button", { name: "删除留言", exact: true })
          .click();
        const dlg = page.getByRole("dialog", { name: "删除留言", exact: true });
        await dlg.getByLabel("管理密码", { exact: true }).fill("fixture-only");
        await dlg.getByRole("button", { name: "确认操作" }).click();
        await first.waitFor({ state: "detached" });
        await dlg.waitFor({ state: "hidden" });
        assert(
          await page
            .getByRole("dialog", { name: "留下你的声音" })
            .evaluate((el) => el.contains(document.activeElement)),
        );
      },
    );
    await close(page);
    // Actual network failure on local preview, still no write request allowed.
    const real = await browser.newContext({
      viewport: { width: 390, height: 960 },
      reducedMotion: "reduce",
    });
    await real.route("**/.netlify/functions/**", (route) =>
      route.request().method() === "GET" ? route.continue() : route.abort(),
    );
    const realPage = await real.newPage();
    await realPage.goto(base, { waitUntil: "domcontentloaded" });
    await openMessages(realPage);
    await check("actual local API failure, no fake messages", async () => {
      await realPage
        .getByText("留言暂时加载失败，请重试。", { exact: true })
        .waitFor();
      assert.equal(await realPage.locator(".message-card").count(), 0);
      await shot(realPage, "actual-local-api-error-390");
    });
    await real.close();
    await check("no uncaught JavaScript exceptions", async () =>
      assert.deepEqual(errors, []),
    );
    fs.writeFileSync(
      path.join(__dirname, "browser-results.json"),
      JSON.stringify(
        {
          base,
          environment:
            "Local Edge. UI fixture records explicitly synthetic. All POST requests intercepted into disposable memory; real authentication, server authorization and database writes NOT verified.",
          results,
          errors,
          writes,
          metrics,
        },
        null,
        2,
      ),
    );
    console.log(results.length + " checks passed");
  } catch (error) {
    if (debugPage) {
      await shot(debugPage, "test-failure").catch(() => {});
      fs.writeFileSync(
        path.join(__dirname, "failure-dom.html"),
        await debugPage.content().catch(() => ""),
      );
    }
    fs.writeFileSync(
      path.join(__dirname, "browser-results.json"),
      JSON.stringify(
        { results, errors, writes, metrics, error: String(error) },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
