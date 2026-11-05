const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const observations = [];
async function snapshot(p, target) {
  return target.evaluate(el => ({active: document.activeElement === el, connected: el.isConnected, focusVisible: el.matches(':focus-visible'), outlineWidth: getComputedStyle(el).outlineWidth, outlineStyle: getComputedStyle(el).outlineStyle, outlineColor: getComputedStyle(el).outlineColor, outlineOffset: getComputedStyle(el).outlineOffset, id: el.dataset.homeGuide}));
}
function visible(value) {
  assert.equal(value.active, true);
  assert.equal(value.connected, true);
  assert.equal(value.focusVisible, true);
  assert.equal(value.outlineWidth, '3px');
  assert.equal(value.outlineStyle, 'solid');
  assert.equal(value.outlineColor, 'rgb(35, 96, 245)');
  assert.equal(value.outlineOffset, '4px');
}
(async () => {
  const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true});
  try {
    for (const stage of ['A+', 'B1']) for (const width of [1440, 390]) {
      const ctx = await b.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', {urls: ['https://cdn.jsdelivr.net/*']});
      await p.goto(`http://127.0.0.1:${stage === 'A+' ? 3041 : 3044}/`, {waitUntil: 'networkidle'});
      await p.locator('#home-guides').evaluate(el => scrollTo({top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'instant'}));
      const target = p.locator('[data-home-guide]').first();
      await target.waitFor();
      // A fresh document starts on body. Reach the link using real Tab events only.
      const tabOrder = [];
      for (let i = 0; i < 180; i++) {
        await p.keyboard.press('Tab');
        tabOrder.push(await p.evaluate(() => ({tag: document.activeElement.tagName, text: document.activeElement.textContent.trim().slice(0, 60), id: document.activeElement.dataset.homeGuide || null})));
        if (await target.evaluate(el => document.activeElement === el)) break;
      }
      const pureTab = await snapshot(p, target); visible(pureTab);
      await p.locator('#home-guides').getByRole('button', {name: stage === 'A+' ? '公开更新' : '最近发布', exact: true}).click();
      await target.focus();
      const mouseThenProgrammatic = await snapshot(p, target);
      assert.equal(mouseThenProgrammatic.active, true);
      assert.equal(mouseThenProgrammatic.focusVisible, false);
      assert.equal(mouseThenProgrammatic.outlineWidth, '0px');
      // No synthetic focus-visible selector: the keyboard sets input modality and tab order.
      await p.keyboard.press('Shift+Tab');
      assert.equal(await p.evaluate(() => document.activeElement.textContent.trim()), '置顶精选');
      await p.keyboard.press('Tab');
      const keyboardForward = await snapshot(p, target); visible(keyboardForward);
      await p.keyboard.press('Tab');
      await p.keyboard.press('Shift+Tab');
      const keyboardBackward = await snapshot(p, target); visible(keyboardBackward);
      await p.waitForTimeout(250);
      const stable = await snapshot(p, target); visible(stable);
      if (stage === 'B1') await p.screenshot({path: path.join(__dirname, `focus-real-tab-${width}.png`)});
      observations.push({stage, width, pureTab, tabOrder, mouseThenProgrammatic, keyboardForward, keyboardBackward, stable});
      await p.keyboard.press('Enter');
      await p.waitForURL(`**/guides/?id=${stable.id}`);
      observations.at(-1).enterNavigates = true;
      await p.locator('.guide-reader h1').waitFor();
      observations.at(-1).detailRenders = true;
      console.log('PASS real keyboard focus', stage, width);
      await ctx.close();
    }
  } finally {
    fs.writeFileSync(path.join(__dirname, 'focus-results.json'), JSON.stringify({observations}, null, 2));
    await b.close();
  }
})().catch(e => {console.error(e); process.exitCode = 1});
