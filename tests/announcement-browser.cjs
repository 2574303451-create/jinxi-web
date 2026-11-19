const assert = require('node:assert/strict');
const { chromium } = require(process.env.JINXI_PLAYWRIGHT_MODULE);
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const [previewUrl, evidenceDirectory] = process.argv.slice(2);
const origin = new URL(previewUrl).origin;
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
assert(evidenceDirectory && process.env.JINXI_EDGE_BINARY);

const item = {
  id: 'sample-1', title: '合成活动通知', createdAt: '2026-01-01T10:00:00Z',
  contentHtml: '<p><strong>测试格式</strong> · ' + '长公告正文'.repeat(28) +
    '</p><pre>' + 'SampleWithNoSpaces'.repeat(10) +
    '</pre><img src="/placeholder.jpg" alt="合成图片"><form><input></form>',
};
const more = [item, { ...item, id: 'sample-2', title: '合成活动补充', contentHtml: '<p>第二条合成公告。</p>' }];

async function main() {
  await mkdir(evidenceDirectory, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.JINXI_EDGE_BINARY });
  const result = { scenarios: [], widths: [], pageErrors: [], writes: [] };
  let release;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', reducedMotion: 'reduce' });
    const delayed = new Promise(resolve => { release = resolve; });
    let fixture = 'loading';
    page.on('pageerror', error => result.pageErrors.push(error.name));
    await page.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (!['GET', 'HEAD'].includes(req.method())) {
        result.writes.push(req.method());
        return route.abort();
      }
      if (url.origin !== origin) return route.abort();
      if (url.pathname !== '/.netlify/functions/announcements') return route.continue();
      if (fixture === 'loading') await delayed;
      if (fixture === 'error') return route.fulfill({ status: 503, json: { error: '合成暂不可用' } });
      return route.fulfill({ json: fixture === 'many' ? more : fixture === 'one' ? [item] : [] });
    });

    const trigger = page.getByRole('button', { name: '查看公告', exact: true });
    const modal = page.getByRole('dialog', { name: '公会动态', exact: true });
    const open = async () => {
      await trigger.click();
      await modal.waitFor();
      assert.equal(await modal.locator('.legacy-dialog-content').count(), 0);
    };
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(await trigger.count(), 1);
    await open();
    await modal.getByRole('status').filter({ hasText: '正在加载公告' }).waitFor();
    fixture = 'empty';
    release();
    await modal.getByRole('status').filter({ hasText: '暂无公告' }).waitFor();
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate(button => document.activeElement === button));
    result.scenarios.push('loading-empty-keyboard-close-and-focus');

    fixture = 'error';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open();
    const alert = modal.getByRole('alert').filter({ hasText: '公告加载失败' });
    await alert.waitFor();
    fixture = 'one';
    await alert.getByRole('button', { name: '重试', exact: true }).click();
    const cards = modal.getByRole('article');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 1);
    assert.equal(await cards.first().locator('form,input').count(), 0);
    assert.equal(await cards.first().locator('strong').innerText(), '测试格式');
    result.scenarios.push('error-retry-one-and-sanitized-format');

    fixture = 'many';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open();
    await modal.getByRole('heading', { name: '合成活动补充', exact: true }).waitFor();
    assert.equal(await cards.count(), 2);
    const image = modal.getByRole('img', { name: '合成图片', exact: true });
    await image.evaluate(async node => { await node.decode(); });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      assert(await modal.evaluate(node => node.scrollWidth <= node.clientWidth));
      assert(await cards.first().evaluate(node => node.scrollWidth <= node.clientWidth));
      assert(await image.evaluate(node => node.clientWidth <= node.parentElement.clientWidth));
      assert(await modal.locator('.dialog-heading').evaluate(node => getComputedStyle(node).position === 'sticky'));
      assert.equal(await modal.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
      await modal.screenshot({ path: path.join(evidenceDirectory, 'reader-' + width + '.png') });
      result.widths.push(width);
    }
    assert(await modal.evaluate(node => node.scrollHeight > node.clientHeight));
    await modal.evaluate(node => node.scrollTo(0, node.scrollHeight));
    assert(await modal.evaluate(node => node.scrollTop > 0));
    result.scenarios.push('multiple-long-text-image-and-single-scroll');

    const draft = modal.getByRole('button', { name: '编辑本机草稿', exact: true });
    await draft.click();
    const title = modal.getByRole('textbox', { name: '草稿标题', exact: true });
    const editor = modal.getByRole('textbox', { name: '公告草稿内容', exact: true });
    await title.fill('只存在本机的合成草稿');
    await editor.fill('合成草稿的正文');
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 8;
      canvas.getContext('2d').fillRect(0, 0, 8, 8);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await modal.locator('input[type=file]').setInputFiles({
      name: 'synthetic-draft.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
    });
    await editor.locator('img[src^="data:image/png"]').waitFor();
    await modal.getByRole('button', { name: '保存本机草稿', exact: true }).click();
    await modal.getByText('草稿已保存在此浏览器，尚未发布。', { exact: true }).waitFor();
    assert.equal(await modal.getByRole('button', { name: '发布暂未开放', exact: true }).isDisabled(), true);
    assert(await modal.evaluate(node => node.scrollWidth <= node.clientWidth));
    await modal.screenshot({ path: path.join(evidenceDirectory, 'draft-320.png') });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open();
    await draft.click();
    assert.equal(await title.inputValue(), '只存在本机的合成草稿');
    assert.equal((await editor.innerText()).trim(), '合成草稿的正文');
    assert.equal(await editor.locator('img[src^="data:image/png"]').count(), 1);
    assert.equal(await cards.count(), 2);
    assert.equal(await modal.getByRole('button', { name: '发布暂未开放', exact: true }).isDisabled(), true);
    await modal.getByRole('button', { name: '关闭弹窗', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate(button => document.activeElement === button));
    result.scenarios.push('local-only-draft-restored-with-disabled-publish');

    assert.deepEqual(result.pageErrors, []);
    assert.deepEqual(result.writes, []);
    result.passed = true;
    console.log(JSON.stringify(result));
  } finally {
    release?.();
    await browser.close();
    await writeFile(path.join(evidenceDirectory, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
