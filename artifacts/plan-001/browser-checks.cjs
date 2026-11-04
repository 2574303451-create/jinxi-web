const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = __dirname;
const results = [];
async function check(name, action) {
  await action();
  results.push({ name, passed: true });
}
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await page.locator('h1').waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await check(`viewport ${width} no overflow`, async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
    if (width !== 320) await page.screenshot({ path: path.join(output, `after-${width}.png`) });
  }
  await check('all anchor targets exist', async () => assert(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.getAttribute('href').slice(1))))));
  await page.setViewportSize({ width: 390, height: 900 });
  await check('mobile navigation opens, navigates and closes', async () => {
    await page.getByRole('button', { name: '菜单 ☰' }).click();
    assert(await page.locator('#guild-navigation').isVisible());
    await page.getByRole('link', { name: '公会介绍', exact: true }).click();
    assert(!await page.locator('#guild-navigation').isVisible());
    assert(page.url().endsWith('#info-tabs'));
  });
  await check('join form traps focus and restores it on Escape', async () => {
    const join = page.locator('.hero-actions button');
    await join.click();
    assert(await page.getByRole('dialog', { name: '加入今夕公会' }).isVisible());
    await page.getByRole('button', { name: '关闭弹窗' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => document.querySelector('dialog[open]').contains(document.activeElement)));
    await page.screenshot({ path: path.join(output, 'join-mobile.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert(await join.evaluate(el => el === document.activeElement));
  });
  await check('announcement opens and shows actual local API failure', async () => {
    await page.getByRole('button', { name: '菜单 ☰' }).click();
    await page.getByRole('button', { name: '公告', exact: true }).click();
    assert(await page.getByRole('dialog', { name: '公会动态' }).isVisible());
    await page.getByRole('dialog').getByRole('button', { name: '重试', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'announcement-error.png') });
    await page.keyboard.press('Escape');
  });
  await check('strategy opens and reports API failure', async () => {
    await page.getByRole('button', { name: '菜单 ☰' }).click();
    await page.getByRole('button', { name: '攻略', exact: true }).click();
    await page.getByText('攻略暂时加载失败，请重试。').waitFor();
    await page.keyboard.press('Escape');
  });
  await check('member details open with keyboard and close', async () => {
    const member = page.locator('#members-page [role="button"]').first();
    await member.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('dialog[open]').count(), 1);
    await page.keyboard.press('Escape');
    assert(await member.evaluate(el => el === document.activeElement));
  });
  await check('video plays from lowercase resource', async () => {
    await page.getByRole('button', { name: '播放公会视频' }).click();
    await page.waitForFunction(() => { const video = document.querySelector('video'); return video && !video.paused && video.readyState >= 2; });
    assert((await page.locator('video').getAttribute('src')) === '/1.mp4');
    await page.locator('video').evaluate(video => video.pause());
  });
  for (const width of [390,768,1440]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(output,`after-${width}.png`)});
    await page.screenshot({path:path.join(output,`after-full-${width}.png`),fullPage:true});
  }
  await check('no uncaught browser exceptions', async () => assert.deepEqual(errors, []));
  const simulation = await browser.newContext({ reducedMotion: 'reduce' });
  const simulatedPage = await simulation.newPage();
  await simulatedPage.route('**/.netlify/functions/**', route => route.fulfill({ status:503,contentType:'application/json',body:'{"error":"验收模拟服务不可用"}' }));
  await simulatedPage.route('**/1.mp4',route=>route.abort());
  await simulatedPage.route('**/13.png',route=>route.abort());
  await simulatedPage.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000',{waitUntil:'domcontentloaded'});
  await check('simulated video failure preserves cover',async()=>{
    await simulatedPage.getByRole('button',{name:'播放公会视频'}).click();
    await simulatedPage.getByText('视频暂不可用，正在展示公会封面。').waitFor();
    assert(await simulatedPage.locator('.hero-poster').isVisible());
  });
  await check('simulated API failures are explicit',async()=>{
    await simulatedPage.getByText('留言暂时加载失败，请重试。').waitFor();
    await simulatedPage.getByText('排行榜暂时加载失败，请重试。').waitFor();
    assert(await simulatedPage.getByText('验收模拟服务不可用').count()>0);
  });
  await check('reduced motion disables marquee and carousel auto-advance',async()=>{
    assert(await simulatedPage.locator('.animate-marquee').first().evaluate(el=>getComputedStyle(el).animationName==='none'));
    const carousel = simulatedPage.locator('.carousel-stage>div');
    const before = await carousel.getAttribute('style');
    await simulatedPage.waitForTimeout(3300);
    assert.equal(await carousel.getAttribute('style'),before);
  });
  await check('member missing image falls back to logo',async()=>{
    await simulatedPage.waitForFunction(()=>[...document.querySelectorAll('#members-page img')].some(img=>img.getAttribute('src')==='/logo.png'));
  });
  await simulatedPage.route('**/.netlify/functions/messages*',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await simulatedPage.route('**/.netlify/functions/announcements*',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await simulatedPage.route('**/.netlify/functions/strategies*',route=>route.fulfill({contentType:'application/json',body:'{"strategies":[],"pagination":{"total":0,"hasMore":false}}'}));
  await check('simulated empty messages show empty state',async()=>{
    await simulatedPage.locator('#message-wall').getByRole('button',{name:'刷新',exact:true}).click();
    await simulatedPage.locator('#message-wall').getByText(/暂无留言|还没有留言/).waitFor();
  });
  fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify({environment:'Local static production build. Real APIs unavailable. Failure/empty responses explicitly simulated in isolated context. No account login or business writes.',results,errors},null,2));
  await browser.close();
  console.log(`${results.length} browser checks passed`);
})().catch(error=>{fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify({results,error:String(error)},null,2));console.error(error);process.exit(1)});
