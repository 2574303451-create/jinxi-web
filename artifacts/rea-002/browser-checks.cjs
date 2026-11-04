const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3003';
const output = __dirname;
const results = [];
let debugPage;
const errors = [];
const writes = [];
async function check(name, run) { await run(); results.push({ name, passed: true }); console.log("PASS", name); }
async function close(page) { await page.keyboard.press('Escape'); }
async function settleImages(page) {
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 700) {
    await page.evaluate(value => scrollTo(0, value), y);
    await page.waitForTimeout(70);
  }
  await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().width > 0).every(image => image.complete), { timeout: 15000 });
  await page.evaluate(() => scrollTo(0, 0));
}
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce' });
  await context.route('**/.netlify/functions/**', route => {
    if (route.request().method() === 'GET') return route.continue();
    writes.push(route.request().method());
    return route.abort();
  });
  const page = await context.newPage();
  debugPage = page;
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').waitFor();
  await settleImages(page);
  const layouts = [];
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    await check(`no document overflow at ${width}`, async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
    layouts.push(await page.evaluate(() => ({ width:innerWidth, heading:document.querySelector('h1').getBoundingClientRect().toJSON(), fontSize:getComputedStyle(document.querySelector('h1')).fontSize, hero:document.querySelector('#top').getBoundingClientRect().toJSON(), card:document.querySelector('.guild-member-card').getBoundingClientRect().toJSON() })));
    if (width !== 320) {
      await settleImages(page);
      await page.screenshot({ path:path.join(output, `jinxi-final-${width}.png`) });
      await page.screenshot({ path:path.join(output, `jinxi-final-full-${width}.png`), fullPage:true });
    }
  }
  await check('member audience switches to task shortcut',async()=>{
    await page.getByRole('button',{name:'公会成员',exact:true}).click();
    assert(await page.getByRole('button',{name:'签到、任务与积分，从这里开始'}).isVisible());
    await page.getByRole('button',{name:'初次见面',exact:true}).click();
  });
  await check('member card hover moves four pixels and grows hard shadow',async()=>{
    const card=page.locator('.guild-member-card').first();await card.scrollIntoViewIfNeeded();await page.mouse.move(1,1);
    const initial=await card.boundingBox();await card.hover();const hover=await card.boundingBox();
    assert(Math.abs(initial.y-hover.y-4)<1);assert(await card.evaluate(el=>getComputedStyle(el).boxShadow.includes('8px 8px')));
    await page.screenshot({path:path.join(output,'jinxi-card-hover.png')});
  });
  await check('all anchor targets exist', async () => assert(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every(link => document.getElementById(link.getAttribute('href').slice(1))))));
  await page.setViewportSize({width:390,height:900});
  await check('mobile menu opens, navigates and closes', async () => {
    await page.getByRole('button',{name:'打开导航',exact:true}).click();
    await page.screenshot({path:path.join(output,'jinxi-mobile-menu.png')});
    assert(await page.locator('#primary-navigation').isVisible());
    await page.locator('#primary-navigation').getByRole('link',{name:'公会介绍',exact:true}).click();
    assert(!await page.locator('#primary-navigation').isVisible());
    assert(page.url().endsWith('#about'));
  });
  await check('mobile menu Escape restores focus',async()=>{
    await page.getByRole('button',{name:'打开导航',exact:true}).click();
    await page.keyboard.press('Escape');
    assert(!await page.locator('#primary-navigation').isVisible());
    assert(await page.getByRole('button',{name:'打开导航',exact:true}).evaluate(el=>el===document.activeElement));
  });
  await check('join form opens, traps focus, restores trigger',async()=>{
    const trigger=page.locator('.hero-cta button');
    await trigger.click();
    const dialog=page.getByRole('dialog',{name:'加入今夕公会'});
    assert(await dialog.isVisible());
    await dialog.getByRole('button',{name:'关闭弹窗'}).focus();
    await page.keyboard.press('Shift+Tab');
    assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
    await page.screenshot({path:path.join(output,'jinxi-join-mobile.png')});
    await close(page);
    assert(await trigger.evaluate(el=>el===document.activeElement));
  });
  await check('FAQ expands through keyboard',async()=>{
    const question=page.getByRole('button',{name:/要不要强制语音/});
    await question.focus(); await page.keyboard.press('Enter');
    assert(await page.getByText(/战队赛建议语音/).isVisible());
  });
  await check('member card opens detail and returns focus',async()=>{
    const card=page.locator('.guild-member-card').first(); await card.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('dialog[open]').count(),1);
    await close(page); assert(await card.evaluate(el=>el===document.activeElement));
  });
  await check('all member filters and load more remain accessible',async()=>{
    await page.getByRole('button',{name:'查看全部',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'公会成员',exact:true});
    await dialog.getByRole('button',{name:/加载更多/}).click();
    assert(await dialog.getByRole('button',{name:'全部',exact:true}).isVisible());
    await close(page);
  });
  await check('carousel controls remain accessible',async()=>{
    await page.getByRole('button',{name:'打开轮播展示'}).click();
    const dialog=page.getByRole('dialog',{name:'成员精彩展示',exact:true});
    await dialog.getByRole('button',{name:/下一张/}).click();
    assert(await dialog.getByRole('button',{name:/上一张/}).isVisible()); await close(page);
  });
  await check('guest checkin is read-only and has no fake personal balance',async()=>{
    await page.getByRole('button',{name:'去签到',exact:true}).click();
    await page.getByText('请先登录后签到。登录成功后将自动绑定账号身份并解锁签到按钮。').waitFor();
    assert.equal(await page.getByRole('dialog').getByRole('button',{name:'立即签到',exact:true}).count(),0); await close(page);
  });
  await check('tasks open login and password-change dialogs',async()=>{
    await page.getByRole('button',{name:'查看任务',exact:true}).click();
    await page.getByRole('button',{name:'登录账号',exact:true}).click();
    const login=page.getByRole('dialog',{name:'账号登录',exact:true});
    await login.waitFor();
    await login.getByRole('button',{name:'修改密码',exact:true}).click();
    await page.getByRole('dialog',{name:'修改密码',exact:true}).waitFor();
    await close(page);
    assert(await page.getByRole('dialog',{name:'每日任务',exact:true}).isVisible());
    await close(page);
  });
  await check('ranking API failure is explicit',async()=>{
    await page.getByRole('button',{name:'查看排行',exact:true}).click();
    await page.getByText('排行榜暂时加载失败，请重试。').waitFor();
    assert(await page.getByText(/加载积分排行榜失败/).isVisible());
    await page.screenshot({path:path.join(output,'jinxi-ranking-error-mobile.png')});
    await close(page);
  });
  for (const [label,title,login] of [['打开组队','寻找队伍','登录后组队'],['打开面板','游戏数据','登录后查看']]) {
    await check(`${title} entry retained`,async()=>{
      await page.getByRole('button',{name:label,exact:true}).click();
      await page.getByRole('dialog',{name:title,exact:true}).waitFor();
      assert(await page.getByRole('button',{name:login,exact:true}).isVisible());await close(page);
    });
  }
  await check('message wall real API error state',async()=>{
    await page.getByRole('button',{name:/^留下你的声音/}).click();
    await page.getByText('留言暂时加载失败，请重试。').waitFor();
    await page.screenshot({path:path.join(output,'jinxi-messages-error-mobile.png')});await close(page);
  });
  await check('announcement opens original interaction',async()=>{
    await page.getByRole('button',{name:'查看公告',exact:true}).click();
    await page.getByRole('dialog',{name:'公会动态',exact:true}).waitFor();
    await page.getByRole('dialog').getByRole('button',{name:'重试',exact:true}).waitFor();await close(page);
  });
  await check('strategy opens original interaction',async()=>{
    await page.getByRole('button',{name:/^分享经验，一起变强/}).click();
    await page.getByText('攻略暂时加载失败，请重试。').waitFor();
    assert(await page.getByRole('dialog').getByRole('button',{name:/投稿攻略/}).isVisible());
    await page.screenshot({path:path.join(output,'jinxi-strategy-error-mobile.png')});await close(page);
  });
  await check('sponsorship QR remains accessible',async()=>{
    await page.getByRole('button',{name:'赞助公会',exact:true}).click();
    await page.getByRole('dialog',{name:'公会赞助'}).waitFor();
    assert(await page.getByRole('dialog').locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>0));await close(page);
  });
  await check('video lowercase path plays',async()=>{
    await page.locator('.guild-video summary').click();
    await page.getByRole('button',{name:'播放公会视频',exact:true}).click();
    await page.waitForFunction(()=>{const video=document.querySelector('video');return video&&!video.paused&&video.readyState>=2});
    assert.equal(await page.locator('video').getAttribute('src'),'/1.mp4');
    await page.locator('video').evaluate(video=>video.pause());await page.locator('.guild-video summary').click();
  });
  await check('no uncaught exceptions or business writes',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(writes,[])});
  const fixture=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await fixture.addInitScript(()=>{localStorage.setItem('jinxi-auth-account','ui-fixture');localStorage.setItem('jinxi-auth-profile',JSON.stringify({account:'ui-fixture',nickname:'界面测试账号'}))});
  await fixture.route('**/.netlify/functions/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"界面验收模拟服务不可用"}'}));
  await fixture.route('**/1.mp4',route=>route.abort());
  await fixture.route('**/13.png',route=>route.abort());
  const testPage=await fixture.newPage();
  await testPage.goto(base,{waitUntil:'domcontentloaded'});await testPage.locator('h1').waitFor();
  await check('member image failure falls back to logo',async()=>{await testPage.locator('.guild-member-card').first().scrollIntoViewIfNeeded();await testPage.waitForFunction(()=>document.querySelector('.guild-member-card img')?.getAttribute('src')==='/logo.png')});
  await check('reduced motion stops hero decoration',async()=>assert(await testPage.locator('.hero-geometry').first().evaluate(el=>getComputedStyle(el).animationName==='none')));
  await check('video failure returns a real cover',async()=>{
    await testPage.locator('.guild-video summary').click();await testPage.getByRole('button',{name:'播放公会视频',exact:true}).click();await testPage.getByText('视频暂不可用，已显示封面。').waitFor();
    assert(await testPage.locator('.video-frame img').isVisible());
  });
  for(const [label,title] of [['查看任务','每日任务'],['打开组队','寻找队伍'],['打开面板','游戏数据']]) {
    await check(`isolated UI fixture renders ${title}`,async()=>{
      await testPage.getByRole('button',{name:label,exact:true}).click();await testPage.getByRole('dialog',{name:title,exact:true}).waitFor();
      await testPage.waitForTimeout(200);
      const readyButton=title==='每日任务'? /收起/ : title==='寻找队伍'? /战队列表/ : /装备/;
      await testPage.getByRole('dialog').getByRole('button',{name:readyButton}).waitFor();
      await testPage.screenshot({path:path.join(output,`fixture-${title}.png`)});await close(testPage);
    });
  }
  await fixture.route('**/.netlify/functions/announcements*',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await testPage.reload({waitUntil:'domcontentloaded'});
  await check('isolated empty announcements show empty state',async()=>{await testPage.getByText('暂无公告。新的集结通知将在这里出现。').waitFor()});
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({base,environment:'Edge headless. Actual local API failures are tested. Separate isolated ui-fixture uses intercepted API errors and local UI identity only. Authentication correctness and database writes are not verified.',results,errors,writes,layouts},null,2));
  await browser.close();console.log(`${results.length} browser checks passed`);
})().catch(async error=>{if(debugPage) await debugPage.screenshot({path:path.join(output,'test-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({results,errors,writes,error:String(error)},null,2));console.error(error);process.exit(1)});
