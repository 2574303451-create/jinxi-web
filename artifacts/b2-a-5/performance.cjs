// Run with the three loopback previews and no other browser tests/builds.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const variants = require('./variants.cjs');
const orders = [['pr13','prep','runtime'], ['runtime','pr13','prep'], ['prep','runtime','pr13']];

async function sample(browser, stage, mobile, run) {
  const { origin } = variants[stage];
  const context = await browser.newContext({
    viewport:{ width:mobile ? 390 : 1440, height:1000 }, locale:'zh-CN', reducedMotion:'reduce',
  });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const requests = [], assets = [], pending = [], errors = [];
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    page.on('pageerror', error => errors.push(error.name));
    page.on('request', request => requests.push({
      path:new URL(request.url()).pathname, type:request.resourceType(), method:request.method(),
    }));
    page.on('response', response => {
      const type = response.request().resourceType();
      if (!['script', 'stylesheet'].includes(type) || new URL(response.url()).origin !== origin) return;
      pending.push(response.body().then(body => assets.push({
        type, bytes:body.length, gzip:zlib.gzipSync(body).length,
        prematureCode:/DOMPurify|jinxi-session-lab-draft-v1|guide-reader-actions|复制分享链接/.test(body.toString()),
      })));
    });
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate:mobile ? 6 : 1 });
    if (mobile) await cdp.send('Network.emulateNetworkConditions', {
      offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750,
    });
    await context.addInitScript(() => {
      window.vitals = { lcp:0, cls:0 };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.vitals.lcp = entry.startTime;
      }).observe({ type:'largest-contentful-paint', buffered:true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.vitals.cls += entry.value;
      }).observe({ type:'layout-shift', buffered:true });
    });
    await page.goto(origin, { waitUntil:'networkidle', timeout:120000 });
    await page.waitForTimeout(1200);
    await Promise.all(pending);
    assert.deepEqual(errors, []);
    assert(!assets.some(asset => asset.prematureCode));
    assert(!requests.some(request => request.type === 'media' || /strategies|guide-video-stats|session-lab/.test(request.path)));
    assert(!requests.some(request => !['GET', 'HEAD'].includes(request.method)));
    const { lcp, cls } = await page.evaluate(() => window.vitals);
    assert(lcp > 0);
    const sum = (type, key) => assets.filter(asset => asset.type === type).reduce((n, asset) => n + asset[key], 0);
    return { stage, mobile, run, lcp, cls, js:sum('script','bytes'), jsGzip:sum('script','gzip'),
      css:sum('stylesheet','bytes'), cssGzip:sum('stylesheet','gzip'), initialMediaOrGuideOrLab:0 };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const samples = [];
  try {
    for (const mobile of [false, true]) {
      for (let i = 0; i < orders.length; i++) for (const stage of orders[i]) {
        const item = await sample(browser, stage, mobile, i + 1);
        samples.push(item);
        console.log(JSON.stringify(item));
      }
    }
    const summaries = [];
    for (const mobile of [false, true]) for (const stage of Object.keys(variants)) {
      const rows = samples.filter(row => row.stage === stage && row.mobile === mobile);
      const { js, jsGzip, css, cssGzip } = rows[0];
      for (const row of rows) assert.deepEqual([row.js,row.jsGzip,row.css,row.cssGzip], [js,jsGzip,css,cssGzip]);
      summaries.push({ stage, mobile, lcpMedian:rows.map(row => row.lcp).sort((a,b) => a-b)[1],
        clsMax:Math.max(...rows.map(row => row.cls)), js, jsGzip, css, cssGzip });
    }
    fs.writeFileSync(path.join(__dirname, 'performance.json'), JSON.stringify({
      method:'Cold Edge contexts, three interleaved samples per variant and width, localhost only. 1440px CPU1, 390px CPU6 with 150ms and 200000/93750 bytes/s. Same external request block. gzip computed from decoded response bytes. Lab samples.',
      edge:browser.version(), summaries, samples,
    }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
