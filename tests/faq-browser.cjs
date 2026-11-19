const assert = require('node:assert/strict');
const { chromium } = require(process.env.JINXI_PLAYWRIGHT_MODULE);
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const [previewUrl, evidenceDirectory] = process.argv.slice(2);
const origin = new URL(previewUrl).origin;
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
assert(evidenceDirectory && process.env.JINXI_EDGE_BINARY);
const questions = ['新人多久能参加活动？', '要不要强制语音？', '公会有什么福利？', '如何提升在公会中的地位？'];

async function main() {
  await mkdir(evidenceDirectory, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.JINXI_EDGE_BINARY });
  const result = { widths: [], errors: [], writeRequests: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
    await context.route('**/*', route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) {
        result.writeRequests.push(request.method());
        return route.abort();
      }
      return new URL(request.url()).origin === origin ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => result.errors.push(error.name));
    const response = await page.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const faq = page.locator('#faq');
    const buttons = faq.getByRole('button');
    assert.deepEqual(await buttons.allTextContents(), questions);
    assert.equal(await faq.locator('.legacy-module').count(), 0);

    const ids = [];
    for (const button of await buttons.all()) {
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      const id = await button.getAttribute('aria-controls');
      assert(id);
      ids.push(id);
      const panel = page.locator('[id=' + JSON.stringify(id) + ']');
      assert.equal(await panel.count(), 1);
      assert.equal(await panel.getAttribute('aria-labelledby'), await button.getAttribute('id'));
      assert.equal(await panel.isHidden(), true);
    }
    assert.equal(new Set(ids).size, questions.length);

    await buttons.first().focus();
    assert.equal(await buttons.first().evaluate(node => node.matches(':focus-visible')), true);
    assert.equal(await buttons.first().evaluate(node => getComputedStyle(node).outlineWidth), '3px');
    await page.keyboard.press('Enter');
    await faq.getByRole('region', { name: questions[0], exact: true }).waitFor();
    for (let i = 1; i < questions.length; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await buttons.nth(i).evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Space');
      assert.equal(await buttons.nth(i - 1).getAttribute('aria-expanded'), 'false');
      await faq.getByRole('region', { name: questions[i], exact: true }).waitFor();
      assert.equal(await faq.getByRole('region').count(), 1);
    }
    await page.keyboard.press('Enter');
    assert.equal(await faq.getByRole('region').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const longest = buttons.last();
      await longest.click();
      const panel = faq.getByRole('region', { name: questions.at(-1), exact: true });
      await panel.waitFor();
      assert.equal(await longest.locator('svg').last().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await longest.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 229, 40)');
      assert.equal(await longest.evaluate(el => getComputedStyle(el.closest('h3').parentElement).borderTopWidth), '2px');
      assert(await longest.evaluate(el => el.clientHeight >= 44 && el.scrollWidth <= el.clientWidth));
      assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await faq.screenshot({ path: path.join(evidenceDirectory, 'faq-' + width + '.png') });
      await longest.click();
      assert.equal(await panel.isHidden(), true);
      result.widths.push(width);
    }
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.writeRequests, []);
    result.passed = true;
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
    await writeFile(path.join(evidenceDirectory, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
