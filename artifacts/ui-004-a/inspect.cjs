const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN',timezoneId:'Asia/Shanghai',reducedMotion:'no-preference'});
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'public-fixture.json'),'utf8'));
 await context.route('**/.netlify/functions/**',r=>r.request().method()==='GET'?r.fulfill({status:r.request().url().includes('/messages')?200:503,json:r.request().url().includes('/messages')?fixture:{error:'本机UI测试未连接服务'}}):r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3012',{waitUntil:'domcontentloaded'});await page.locator('.message-ribbon-card').first().waitFor();
 const measurements=[];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('.message-showcase').scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(500);
  await page.screenshot({path:path.join(__dirname,`initial-ribbon-${width}.png`)});await page.locator('.message-showcase').screenshot({path:path.join(__dirname,`initial-ribbon-section-${width}.png`)});
  measurements.push(await page.locator('.message-ribbon').evaluateAll(rows=>rows.map(el=>({width:innerWidth,running:el.dataset.running,loop:el.dataset.loop,direction:el.dataset.direction,distance:el.dataset.distance,scrollLeft:el.scrollLeft,animation:el.querySelector('.message-ribbon-track').getAnimations().map(a=>({time:a.currentTime,state:a.playState,duration:a.effect.getComputedTiming().duration})),rect:el.getBoundingClientRect().toJSON()}))));
  await page.locator('[data-guild-time]').scrollIntoViewIfNeeded();await page.locator('[data-guild-time]').screenshot({path:path.join(__dirname,`initial-time-collapsed-${width}.png`)});await page.getByRole('button',{name:'展开同行时光',exact:true}).click();await page.locator('[data-guild-time]').screenshot({path:path.join(__dirname,`initial-time-empty-${width}.png`)});await page.getByLabel('查找你的同行记录',{exact:true}).fill('0');await page.getByRole('button',{name:'查询',exact:true}).click();await page.locator('[data-profile-mode="member"]').waitFor();await page.locator('[data-guild-time]').screenshot({path:path.join(__dirname,`initial-time-record-${width}.png`)});await page.getByRole('button',{name:'收起同行时光',exact:true}).click();
 }
 // Record whether the real browser exposes visibility changes when its own window is minimized.
 const session=await context.newCDPSession(page);let visibility;
 try{const {windowId}=await session.send('Browser.getWindowForTarget');await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForTimeout(100);const hidden=await page.evaluate(()=>document.visibilityState);await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.waitForTimeout(100);visibility={method:'CDP Browser.setWindowBounds on owned headless window',hidden,restored:await page.evaluate(()=>document.visibilityState)}}catch(error){visibility={error:String(error)}}
 fs.writeFileSync(path.join(__dirname,'initial-inspection.json'),JSON.stringify({errors,measurements,visibility},null,2));console.log(JSON.stringify({errors,visibility}));
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
