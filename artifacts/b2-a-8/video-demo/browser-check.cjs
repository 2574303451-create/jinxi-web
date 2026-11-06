const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.JINXI_PLAYWRIGHT_MODULE || 'playwright');
const { startDemo } = require('./serve.cjs');

const videoPath = '/guide-videos/synthetic-motion.mp4';
const watchUrl = 'https://www.bilibili.com/video/BV0A8JX0TEST';
const output = process.argv[2] && path.resolve(process.argv[2]);

async function checkLayout(browser, origin, width) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
  const requests = [];
  const remote = [];
  await context.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) {
      remote.push({ url: url.href, referrer: req.headers().referer || null });
      if (url.href === watchUrl) return route.fulfill({ contentType: 'text/html', body: '<title>Synthetic navigation check</title>' });
      return route.abort();
    }
    requests.push(url.pathname);
    return route.continue();
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '攻略视频实验' }).waitFor();
    const legacy = page.getByRole('article', { name: '旧版攻略附件' });
    assert.equal(await legacy.locator('img').count(), 0);
    assert.equal(await legacy.getByText('暂无封面').isVisible(), true);
    assert.equal(await legacy.getByRole('link').count(), 1);
    const nativeCard = page.getByRole('article', { name: '走位时机演示' });
    assert.equal(await nativeCard.getByText('暂无封面').isVisible(), false);
    assert.equal(await page.getByRole('article', { name: '待复核的来源' }).getByRole('link').count(), 0);
    assert.equal(await page.locator('iframe, video, [autoplay]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(requests.includes(videoPath), false);
    assert.deepEqual(remote, []);
    if (output && [1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `video-${width}.png`), fullPage: true });

    const external = page.getByRole('article', { name: '副本路线演示' }).getByRole('link');
    const native = page.getByRole('button', { name: '本站播放', exact: true });
    await page.keyboard.press('Tab');
    assert.equal(await external.evaluate(node => node === document.activeElement && getComputedStyle(node).outlineWidth === '3px'), true);
    assert.equal(await external.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await external.getAttribute('target'), '_blank');
    await page.keyboard.press('Tab');
    assert.equal(await native.evaluate(node => node === document.activeElement && getComputedStyle(node).outlineWidth === '3px'), true);
    await page.keyboard.press('Enter');
    const video = page.locator('video');
    await video.waitFor();
    assert.equal(await video.getAttribute('preload'), 'none');
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.equal(await native.isVisible(), false);
    await page.waitForFunction(() => {
      const element = document.querySelector('video');
      return element?.currentTime > 0.1 && element.videoWidth > 0;
    });
    assert(requests.includes(videoPath));
    assert.deepEqual(remote, []);
    if (width === 1440) {
      const [popup] = await Promise.all([context.waitForEvent('page'), external.click()]);
      await popup.waitForLoadState();
      assert.equal(popup.url(), watchUrl);
      assert.equal(await popup.evaluate(() => window.opener === null), true);
      assert.deepEqual(remote, [{ url: watchUrl, referrer: null }]);
      await popup.close();
    }
    assert.deepEqual(errors, []);
    return { width, legacyFallback: true, lazyNative: true, decodedAfterKeyboard: true, focusRing: true, externalStubNavigation: width === 1440 };
  } finally {
    await context.close();
  }
}

async function checkFailure(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
  let videoUnavailable = true;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (videoUnavailable && url.pathname === videoPath) return route.fulfill({ status: 404 });
    return route.continue();
  });
  try {
    await page.goto(origin);
    await page.getByRole('button', { name: '本站播放', exact: true }).click();
    const retry = page.getByRole('button', { name: '重试本站播放', exact: true });
    await retry.waitFor();
    assert.equal(await page.getByText('视频暂时无法播放，可以重试。').isVisible(), true);
    assert.equal(await retry.evaluate(node => document.activeElement === node), true);
    assert.equal(await page.locator('video').count(), 0);
    videoUnavailable = false;
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.1);
    await page.route('**/fixtures.json', route => route.fulfill({ status: 503 }));
    await page.reload();
    await page.getByText('合成示例暂时无法读取，请刷新重试。').waitFor();
    return { media404RestoredFocus: true, retryPlayed: true, fixtures503Notice: true };
  } finally {
    await page.close();
  }
}

async function run() {
  if (output) mkdirSync(output, { recursive: true });
  const server = await startDemo(0);
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.JINXI_BROWSER_CHANNEL || 'msedge' });
    const cases = [];
    for (const width of [1440, 1024, 768, 390, 320]) cases.push(await checkLayout(browser, origin, width));
    const report = { scope: 'loopback synthetic fixtures; external navigation intercepted', browser: browser.version(), cases, failure: await checkFailure(browser, origin) };
    const data = `${JSON.stringify(report, null, 2)}\n`;
    if (output) writeFileSync(path.join(output, 'browser.json'), data);
    process.stdout.write(data);
  } finally {
    await browser?.close();
    server.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
