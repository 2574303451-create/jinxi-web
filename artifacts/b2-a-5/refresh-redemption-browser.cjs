// Requires the dedicated synthetic HTTPS harness. Test values stay in memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const { seedSessionLab } = require('../../tests/support/session-fixtures.cjs');
const { connect } = require('../../tests/support/postgres.cjs');
const endpoint = '/.netlify/functions/session-lab';

async function main() {
  const account = (await seedSessionLab())[1];
  const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const context = await browser.newContext({ ignoreHTTPSErrors:true, viewport:{ width:390, height:1000 } });
  const page = await context.newPage();
  const admin = await connect('admin');
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === 'https://localhost:3048' ? route.continue() : route.abort());
    await page.goto('https://localhost:3048/session-lab/');
    await page.locator('#lab-account').selectOption(account.account);
    await page.locator('#lab-password').fill(account.password);
    await page.getByRole('button', { name:'登录合成账号', exact:true }).click();
    await page.getByRole('button', { name:'退出此设备', exact:true }).waitFor();
    await admin.query('INSERT INTO b2_lab.point_account(member_id,balance) VALUES($1,30) ON CONFLICT(member_id) DO UPDATE SET balance=30', [account.memberId]);
    await page.getByRole('button', { name:'重新核验', exact:true }).click();
    const balance = value => page.waitForFunction(amount => document.querySelector('[data-lab-balance]')?.textContent === amount, String(value));
    const persisted = async () => (await admin.query(
      "SELECT balance::int,(SELECT count(*)::int FROM b2_lab.point_ledger WHERE member_id=$1 AND kind='redeem') debits FROM b2_lab.point_account WHERE member_id=$1",
      [account.memberId],
    )).rows[0];
    await balance(30);
    let pending;
    await context.route('**' + endpoint, async route => {
      if (!pending && route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        if (body.op === 'redeem') {
          pending = body.requestId;
          const result = await route.fetch();
          assert.equal(result.status(), 200);
          await result.dispose();
          return route.abort();
        }
      }
      return route.fallback();
    });
    await page.getByRole('button', { name:'兑换测试纸片', exact:true }).click();
    await page.locator('[aria-live]').filter({ hasText:'网络连接中断' }).waitFor();
    const afterLostResponse = await persisted();
    assert.deepEqual(afterLostResponse, { balance:23, debits:1 });
    await page.reload();
    await balance(23);
    const replay = await page.evaluate(async ({ id, url }) => {
      const current = await fetch(url + '?op=me', { cache:'no-store' }).then(response => response.json());
      const response = await fetch(url, {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-CSRF-Token':current.csrfToken },
        body:JSON.stringify({ op:'redeem', itemCode:'lab-paper-token', requestId:id }),
      });
      const body = await response.json();
      return { status:response.status, alreadyProcessed:body.alreadyProcessed, balance:body.balance };
    }, { id:pending, url:endpoint });
    assert.deepEqual(replay, { status:200, alreadyProcessed:true, balance:23 });
    const afterSameRequest = await persisted();
    assert.deepEqual(afterSameRequest, { balance:23, debits:1 });
    await page.getByRole('button', { name:'兑换测试纸片', exact:true }).click();
    await balance(16);
    const afterFreshClick = await persisted();
    assert.deepEqual(afterFreshClick, { balance:16, debits:2 });
    fs.writeFileSync(path.join(__dirname, 'browser/pr13/refresh-redemption.json'), JSON.stringify({
      scope:'PR #13 frozen static build, actual local HTTPS and synthetic PostgreSQL',
      afterLostResponse, afterSameRequest, afterFreshClick,
      finding:'The server recognizes the same request after refresh. A fresh UI click creates a new intent. Receipt recovery remains required for real orders.',
    }, null, 2) + '\n');
    console.log('Verified lost response, exact replay after refresh, and fresh intent after refresh.');
  } finally {
    await admin.end();
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
