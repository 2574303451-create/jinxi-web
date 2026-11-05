// Real baseline browser evidence; no production API writes.
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const dir = __dirname;
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const rows = [];
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: {width, height: 1000}, reducedMotion: 'reduce', locale: 'zh-CN' });
      await page.route('https://cdn.jsdelivr.net/**', r => r.abort());
      await page.goto('http://127.0.0.1:3028/', {waitUntil: 'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      const rects = await page.evaluate(() => {
        const box = s => { const r = document.querySelector(s).getBoundingClientRect(); return {x:r.x, y:r.y+scrollY, width:r.width, height:r.height}; };
        return {summary:box('.guild-video summary'), values:box('.hero-values'), hero:box('.guild-hero'), facts:box('#guild-facts'), overflow:document.documentElement.scrollWidth>innerWidth};
      });
      await page.locator('.guild-hero').screenshot({path:path.join(dir, `before-${width}-hero.png`)});
      await page.locator('.guild-video summary').evaluate(el => window.scrollTo({top:el.getBoundingClientRect().top+scrollY-500, behavior:'instant'}));
      await page.screenshot({path:path.join(dir, `before-${width}-collapsed.png`)});
      rows.push({width,...rects});
      await page.close();
    }
    fs.writeFileSync(path.join(dir,'before-layout.json'),JSON.stringify(rows,null,2));
    console.log(JSON.stringify(rows));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
