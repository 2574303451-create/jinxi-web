// Read-only public reference inspection. Executed in the existing Node REPL browser.
const fs = require("node:fs"),
  path = require("node:path");
async function collect(page, out) {
  const result = {
    capturedAt: new Date().toISOString(),
    source: "A: actual mdldm.club public browser",
    widths: [],
    network: [],
    pageErrors: [],
    consoleErrors: [],
  };
  page.on("response", (r) => {
    if (r.status() >= 400)
      result.network.push({ url: r.url().split("?")[0], status: r.status() });
  });
  page.on("requestfailed", (r) =>
    result.network.push({
      url: r.url().split("?")[0],
      error: r.failure()?.errorText,
    }),
  );
  page.on("pageerror", (e) => result.pageErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") result.consoleErrors.push(m.text().slice(0, 500));
  });
  const style = (el) => {
    const c = getComputedStyle(el),
      r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      class: el.className,
      rect: {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        documentY: r.y + scrollY,
      },
      tabIndex: el.tabIndex,
      role: el.getAttribute("role"),
      style: Object.fromEntries(
        [
          "display",
          "width",
          "height",
          "maxWidth",
          "padding",
          "marginTop",
          "marginBottom",
          "gap",
          "columnGap",
          "rowGap",
          "gridTemplateColumns",
          "borderTop",
          "borderRadius",
          "boxShadow",
          "backgroundImage",
          "backgroundSize",
          "fontSize",
          "fontWeight",
          "lineHeight",
          "letterSpacing",
          "color",
          "transform",
          "transitionDuration",
          "transitionProperty",
          "animationName",
          "animationDuration",
          "animationDelay",
          "animationIterationCount",
        ].map((k) => [k, c[k]]),
      ),
    };
  };
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("https://www.mdldm.club/", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("heading", { name: "精选推荐", exact: true })
      .waitFor();
    await page.waitForTimeout(2200);
    const stats = page
        .locator("section")
        .first()
        .locator('[class*="grid-cols-4"]')
        .first(),
      featured = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", { name: "精选推荐", exact: true }),
        }),
      cards = featured
        .locator("div.group")
        .filter({ has: page.locator("h3.text-xl") });
    await page.screenshot({
      path: path.join(out, `reference-top-${width}.png`),
    });
    const observation = {
      width,
      stats: await stats.evaluate(style),
      statItems: await stats.locator(":scope>div").evaluateAll((nodes, body) =>
        nodes.map((el) => {
          const s = getComputedStyle(el),
            v = el.firstElementChild,
            c = getComputedStyle(v),
            r = el.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            valueFont: c.fontSize,
            valueWeight: c.fontWeight,
            valueLineHeight: c.lineHeight,
            labelFont: getComputedStyle(el.lastElementChild).fontSize,
            animation: s.animationName,
            duration: s.animationDuration,
            delay: s.animationDelay,
          };
        }),
      ),
      hero: await page.locator("section").first().evaluate(style),
      featured: await featured.evaluate(style),
      heading: await featured.locator("h2").evaluate(style),
      cardLinkParent: await cards.first().locator("..").evaluate(style),
      card: await cards.first().evaluate(style),
      cardTitle: await cards.first().locator("h3").evaluate(style),
      cardImage: await cards.first().locator("img").first().evaluate(style),
      count: await cards.count(),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    };
    await stats.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: path.join(out, `reference-statistics-${width}.png`),
    });
    await cards.first().scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(350);
    await page.screenshot({
      path: path.join(out, `reference-recommendations-${width}.png`),
    });
    await cards.first().hover();
    await page.waitForTimeout(350);
    observation.hover = await cards.first().evaluate(style);
    await cards
      .first()
      .screenshot({
        path: path.join(out, `reference-card-hover-${width}.png`),
      });
    const all = featured.getByRole("link", { name: "查看全部", exact: true });
    observation.allLink = {
      href: await all.getAttribute("href"),
      count: await all.count(),
    };
    await all.focus();
    observation.keyboard = await all.evaluate((el) => ({
      focused: el === document.activeElement,
      outline: getComputedStyle(el).outline,
    }));
    await page.keyboard.press("Space");
    observation.afterSpaceScroll = await page.evaluate(() => scrollY);
    await page.emulateMedia({ reducedMotion: "reduce" });
    observation.reduced = await stats
      .locator(":scope>div")
      .first()
      .evaluate(style);
    await page.screenshot({
      path: path.join(out, `reference-reduced-${width}.png`),
    });
    result.widths.push(observation);
    fs.writeFileSync(
      path.join(out, "measurements.json"),
      JSON.stringify(result, null, 2),
    );
  }
  return result.widths.map((r) => ({
    width: r.width,
    statsWidth: r.stats.rect.width,
    statsHeight: r.stats.rect.height,
    columns: r.stats.style.gridTemplateColumns,
    cardWidth: r.card.rect.width,
    cardHeight: r.card.rect.height,
    overflow: r.overflow,
  }));
}
module.exports = { collect };
