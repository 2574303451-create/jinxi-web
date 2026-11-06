const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');

const origin = 'http://127.0.0.1:3065';
const localNotice = '本机游戏记录与默认示例供参考。操作只保存在此浏览器。';
const cachedAccount = 'synthetic-a7-legacy-account';
const historyKey = 'jinxi-task-stats-synthetic-a7-local';

async function check(browser, width, withOldCache) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  const requests = [];
  const errors = [];
  await context.addInitScript(({ withOldCache, cachedAccount, historyKey }) => {
    localStorage.setItem('jinxi-user-id', 'synthetic-a7-local');
    localStorage.setItem('jinxi-task-last-reset', new Date().toISOString());
    localStorage.setItem('jinxi-task-schema-version', 'previous-release');
    localStorage.setItem(historyKey, JSON.stringify({ totalPoints: 81 }));
    if (withOldCache) {
      localStorage.setItem('jinxi-auth-account', cachedAccount);
      localStorage.setItem('jinxi-auth-profile', JSON.stringify({ account: cachedAccount, nickname: 'Synthetic stale nickname' }));
    }
  }, { withOldCache, cachedAccount, historyKey });
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    requests.push({ path: url.pathname, method: request.method(), type: request.resourceType() });
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.name));
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert(!requests.some(item => item.type === 'media' || /\/(?:strategies|guide-video-stats|session-lab)$/.test(item.path)));
    assert.equal((await page.getByLabel('在线人数尚未接入').innerText()).trim(), '—');
    const archive = page.locator('#guild-facts a[href="#members"]').locator('span').first();
    assert.equal((await archive.innerText()).replace(/\s/g, ''), '208份');
    assert.equal(await page.getByText('欢迎回来，选一件今天想做的事。', { exact: true }).count(), 0);

    if (width <= 768) await page.getByRole('button', { name: '打开导航', exact: true }).click();
    const nav = page.getByRole('navigation', { name: '主导航', exact: true });
    assert.equal(await nav.getByText(cachedAccount, { exact: true }).count(), 0);
    await nav.getByRole('button', { name: '登录', exact: true }).click();
    const login = page.getByRole('dialog', { name: '账号登录', exact: true });
    assert.equal(await login.getByRole('textbox', { name: '账号', exact: true }).inputValue(), '');
    assert(await login.locator('form').getByRole('button', { name: '登录', exact: true }).isDisabled());
    await login.getByRole('button', { name: '需要修改密码？', exact: true }).click();
    const change = page.getByRole('dialog', { name: '修改密码', exact: true });
    const accountInput = change.getByRole('textbox', { name: '账号', exact: true });
    assert.equal(await accountInput.inputValue(), '');
    assert.equal(await accountInput.getAttribute('readonly'), null);
    assert(await change.getByRole('button', { name: '确认修改', exact: true }).isDisabled());
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: '打开面板', exact: true }).click();
    const game = page.getByRole('dialog', { name: '游戏数据', exact: true });
    await game.getByRole('status').filter({ hasText: localNotice }).waitFor();
    await game.getByRole('button', { name: /宠物/ }).click();
    assert.equal(await game.getByRole('button', { name: '登录后查看', exact: true }).count(), 0);
    assert(await game.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1));
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: '查看任务', exact: true }).click();
    const tasks = page.getByRole('dialog', { name: '每日任务', exact: true });
    await tasks.getByText('本机历史积分', { exact: true }).waitFor();
    assert(await tasks.getByText('81', { exact: true }).isVisible());
    await tasks.getByRole('status').filter({ hasText: '当前不可领取' }).waitFor();
    await page.keyboard.press('Escape');

    await page.locator('button.community-door').click();
    const messages = page.getByRole('dialog', { name: '留下你的声音', exact: true });
    if (width <= 800) await messages.locator('summary').filter({ hasText: '写一条留言' }).click();
    const nickname = messages.getByRole('textbox', { name: /你的昵称/ });
    assert.equal(await nickname.inputValue(), '');
    assert.equal(await nickname.getAttribute('readonly'), null);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '查看公告', exact: true }).click();
    await page.getByRole('dialog', { name: '公会动态', exact: true }).getByRole('button', { name: '关闭弹窗', exact: true }).click();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    const saved = await page.evaluate(key => ({
      account: localStorage.getItem('jinxi-auth-account'),
      version: localStorage.getItem('jinxi-task-schema-version'),
      history: JSON.parse(localStorage.getItem(key)).totalPoints,
    }), historyKey);
    assert.deepEqual(saved, { account: withOldCache ? cachedAccount : null, version: 'previous-release', history: 81 });
    assert.equal(requests.filter(item => !['GET', 'HEAD'].includes(item.method)).length, 0);
    assert.deepEqual(errors, []);
    return { width, withOldCache, guestNavigation: true, passwordAccountEditable: true,
      localGameAccessible: true, historyPreserved: true, noCachedAuthor: true, noMutations: true };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const results = [];
    for (const [width, cached] of [[1440, true], [390, true], [390, false], [320, false]]) {
      const result = await check(browser, width, cached);
      results.push(result);
      console.log('Passed local identity and draft regression at ' + width + ', legacy cache ' + cached);
    }
    fs.writeFileSync(path.join(__dirname, 'identity-browser.json'), JSON.stringify({
      scope: 'Local Edge, synthetic browser state and authorized synthetic PG read fixtures',
      browser: browser.version(),
      results,
    }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
