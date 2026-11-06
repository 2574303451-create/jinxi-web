// Local Edge regression. The PR13 run is a negative control for two UI defects.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const variants = require('./variants.cjs');
const stage = process.argv[2];
if (!Object.hasOwn(variants, stage)) throw Error('Unknown browser variant');
const { origin } = variants[stage];
const output = path.join(__dirname, 'browser', stage, 'independent');
fs.mkdirSync(output, { recursive:true });

async function main() {
  const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport:{ width, height:1000 }, reducedMotion:'reduce' });
      let writes = 0;
      await context.addInitScript(() => {
        localStorage.setItem('jinxi-auth-account', 'synthetic-a5-stale');
        window.auditCsp = [];
        document.addEventListener('securitypolicyviolation', event => window.auditCsp.push(event.effectiveDirective));
      });
      await context.route('**/*', route => {
        const request = route.request();
        if (new URL(request.url()).origin !== origin) return route.abort();
        if (!['GET', 'HEAD'].includes(request.method())) { writes++; return route.abort(); }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.name));
      await page.goto(origin, { waitUntil:'networkidle' });
      const online = page.getByLabel('在线人数尚未接入');
      assert.equal((await online.innerText()).trim(), '—');
      const archive = page.locator('#guild-facts a[href="#members"]').locator('span').first();
      assert.equal((await archive.innerText()).replace(/\s/g, ''), '208份');
      if (width === 390) await page.getByRole('button', { name:'打开导航', exact:true }).click();
      const navigation = page.getByRole('navigation', { name:'主导航', exact:true });
      const legacyLooksAuthenticated = await navigation.getByText('synthetic-a5-stale', { exact:true }).isVisible();
      assert.equal(legacyLooksAuthenticated, stage === 'pr13');
      if (stage !== 'pr13') {
        await navigation.getByRole('button', { name:'登录', exact:true }).click();
        assert(await page.locator('dialog[open] form').getByRole('button', { name:'登录', exact:true }).isDisabled());
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name:'查看任务', exact:true }).click();
        const tasks = page.locator('dialog[open]');
        await tasks.getByText('规则参考 15 积分', { exact:false }).first().waitFor({ state:'visible' });
        assert.equal(await tasks.getByText('待领取', { exact:true }).count(), 0);
        assert.equal(await tasks.evaluate(dialog => dialog.scrollWidth > dialog.clientWidth + 1), false);
        await page.keyboard.press('Escape');
        if (width === 390) await page.goto(origin, { waitUntil:'networkidle' });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path:path.join(output, 'home-' + width + '.png') });
      }
      const openDraft = async () => {
        await page.getByRole('button', { name:'查看公告', exact:true }).click();
        await page.getByRole('button', { name:'编辑本机草稿', exact:true }).click();
        return page.getByRole('textbox', { name:'公告草稿内容' });
      };
      const editor = await openDraft();
      await editor.fill('"'.repeat(525_000));
      await page.getByRole('button', { name:'保存本机草稿', exact:true }).click();
      await page.getByText('草稿已保存在此浏览器，尚未发布。', { exact:true }).waitFor();
      const encoded = await page.evaluate(() => localStorage.getItem('jinxi-announcement-draft-v1').length);
      assert(encoded > 1_001_000);
      await page.reload({ waitUntil:'networkidle' });
      const reopened = await openDraft();
      const restored = (await reopened.innerText()).length;
      assert.equal(restored, stage === 'pr13' ? 0 : 525_000);
      if (stage === 'pr13') await page.getByText('草稿暂无法恢复；原存储未改写。', { exact:true }).waitFor();
      assert.equal(writes, 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(await page.evaluate(() => window.auditCsp), []);
      await page.goto(origin + '/profile-lab/', { waitUntil:'networkidle' });
      await page.getByText('非生产数据 · 头像与账号交互原型', { exact:true }).waitFor();
      assert(await page.getByText('尚未进入合成账号；游客继续显示文字头像。', { exact:true }).isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      results.push({ width, legacyLooksAuthenticated, encoded, restored, writes, profileLab:true });
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({
      stage, edge:browser.version(), negativeControl:stage === 'pr13', results,
    }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
