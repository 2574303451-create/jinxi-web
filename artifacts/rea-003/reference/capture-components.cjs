/* Read-only public-page research. Does not submit forms, sign in or alter responses. */
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const result = {capturedAt:new Date().toISOString(),browser:'Edge isolated Playwright context',observations:[],network:[],pageErrors:[],consoleErrors:[]};
const save = () => fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(result,null,2));
const styleFn = (e) => {
  const s=getComputedStyle(e),r=e.getBoundingClientRect();
  const props=['display','position','zIndex','width','height','maxWidth','padding','gap','margin','backgroundColor','color','borderWidth','borderColor','borderRadius','boxShadow','fontFamily','fontSize','fontWeight','lineHeight','overflowX','overflowY','transform','transitionProperty','transitionDuration','transitionTimingFunction','animationName','animationDuration','animationTimingFunction','animationIterationCount','animationPlayState','outline','touchAction'];
  return {tag:e.tagName,classes:e.className,role:e.getAttribute('role'),tabIndex:e.getAttribute('tabindex'),ariaLabel:e.getAttribute('aria-label'),ariaModal:e.getAttribute('aria-modal'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,styles:Object.fromEntries(props.map(k=>[k,s[k]]))};
};
async function styles(loc) {return loc.evaluate(styleFn)}
async function snap(loc,name) {await loc.screenshot({path:path.join(out,name),timeout:15000});}
async function observeNetwork(page,width){
  page.on('response',r=>{if(r.status()>=400)result.network.push({width,url:r.url().split('?')[0],status:r.status()});});
  page.on('requestfailed',r=>result.network.push({width,url:r.url().split('?')[0],failure:r.failure()?.errorText}));
  page.on('pageerror',e=>result.pageErrors.push({width,message:e.message}));
  page.on('console',e=>{if(e.type()==='error')result.consoleErrors.push({width,text:e.text()});});
}
async function homeAt(browser,width,reduced=false){
  const context=await browser.newContext({viewport:{width,height:900},locale:'zh-CN',reducedMotion:reduced?'reduce':'no-preference',isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();
  await observeNetwork(page,width);
  const rec={page:'home',width,reducedMotion:reduced,states:{}}; result.observations.push(rec); save();
  await page.goto('https://www.mdldm.club/',{waitUntil:'domcontentloaded'});
  rec.states.initial=await page.evaluate(()=>({headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent),skeletonCount:document.querySelectorAll('[class*="animate-pulse"]').length}));
  if(!reduced)await page.screenshot({path:path.join(out,`home-loading-${width}.png`)});
  const title=page.getByText('他们这样说',{exact:true});
  try {await title.waitFor({timeout:40000});}
  catch(e) {rec.unavailable={reason:e.message,headings:await page.locator('h1,h2').allTextContents(),bodyExcerpt:(await page.locator('body').innerText()).slice(0,400)};save();await context.close();return;}
  const section=page.locator('section').filter({has:title});
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500);
  rec.section=await styles(section);
  rec.structure=await section.evaluate(e=>{
    const walk=(x,depth)=>({tag:x.tagName,class:x.className,role:x.getAttribute('role'),tabIndex:x.getAttribute('tabindex'),childCount:x.children.length,children:depth<5?[...x.children].map(y=>walk(y,depth+1)):undefined});
    return walk(e,0);
  });
  rec.animations=await section.evaluate(e=>e.getAnimations({subtree:true}).map(a=>({name:a.animationName,target:a.effect?.target?.className,timing:a.effect?.getTiming(),computed:a.effect?.getComputedTiming(),keyframes:a.effect?.getKeyframes()})));
  const track=section.locator('div').filter({has:page.locator(':scope > .never')});
  const tracks=section.locator('div.flex.py-1');
  rec.trackCount=await tracks.count();
  rec.visibleEmptyText=rec.trackCount?null:await section.locator('div.text-center').allTextContents();
  if(rec.trackCount){
    const first=tracks.first();
    rec.trackDefault=await styles(first);
    rec.trackChildren=await first.evaluate(e=>[...e.children].map(x=>({tag:x.tagName,class:x.className,role:x.getAttribute('role'),tabIndex:x.getAttribute('tabindex'),width:x.getBoundingClientRect().width})));
    rec.card=await styles(first.locator(':scope > *').first());
    const sample=async()=>first.evaluate(e=>({time:performance.now(),transform:getComputedStyle(e).transform,state:getComputedStyle(e).animationPlayState}));
    rec.motion={before:await sample()}; await page.waitForTimeout(650);rec.motion.after=await sample();
    // Playwright hover targets an actual visible card, not a synthetic event.
    await first.locator(':scope > *').first().hover({force:true});
    await page.waitForTimeout(350);rec.hover={before:await sample()};await page.waitForTimeout(650);rec.hover.after=await sample();
    rec.focusableCount=await section.locator('a[href],button,input,textarea,[tabindex="0"]').count();
    await page.mouse.move(0,0);
    const focusables=section.locator('a[href],button,input,textarea,[tabindex="0"]');
    if(await focusables.count()){await focusables.first().focus();rec.focus={before:await sample()};await page.waitForTimeout(650);rec.focus.after=await sample();}
    rec.cardHover=await styles(first.locator(':scope > *').first());
    rec.horizontalContainers=await section.evaluate(e=>[...e.querySelectorAll('div')].filter(x=>x.scrollWidth>x.clientWidth+10).map(x=>({class:x.className,clientWidth:x.clientWidth,scrollWidth:x.scrollWidth,overflowX:getComputedStyle(x).overflowX,touchAction:getComputedStyle(x).touchAction})).slice(0,10));
  }
  rec.pageOverflow=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  if(!reduced){
    await page.mouse.move(0,0); await snap(section,`testimonials-${width}.png`);
    const homeCards=page.locator('div.group').filter({has:page.locator('h3')});
    rec.homeCardCount=await homeCards.count();
    if(rec.homeCardCount){
      const hc=homeCards.first();await hc.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForTimeout(350);rec.homeCard=await styles(hc);await snap(hc,`home-card-${width}-default.png`);await hc.hover();await page.waitForTimeout(350);rec.homeCardHover=await styles(hc);await snap(hc,`home-card-${width}-hover.png`);
      rec.homeCardSemantics=await hc.evaluate(e=>({tag:e.tagName,role:e.getAttribute('role'),tabIndex:e.getAttribute('tabindex'),links:[...e.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent?.slice(0,50)})),buttons:[...e.querySelectorAll('button')].map(b=>b.textContent?.slice(0,50))}));
    }
    await page.getByRole('button',{name:'给麦当留言',exact:true}).click();
    const textarea=page.locator('textarea');await textarea.waitFor();
    const panel=textarea.locator('xpath=../../..');const overlay=panel.locator('..');
    await page.waitForTimeout(350);
    rec.messageModal={panel:await styles(panel),overlay:await styles(overlay),textarea:await styles(textarea),inputs:await page.locator('input').evaluateAll(els=>els.map(e=>({type:e.type,placeholder:e.getAttribute('placeholder'),required:e.required}))),sendDisabled:await page.getByRole('button',{name:'发送留言',exact:false}).isDisabled(),dialogRoleCount:await page.getByRole('dialog').count(),bodyOverflow:await page.locator('body').evaluate(e=>getComputedStyle(e).overflow),animation:await panel.evaluate(e=>e.getAnimations().map(a=>({name:a.animationName,timing:a.effect?.getTiming()})))};
    await page.screenshot({path:path.join(out,`message-modal-${width}.png`)});
    await textarea.focus();rec.messageModal.focusedTextarea=await styles(textarea);await page.screenshot({path:path.join(out,`message-modal-focus-${width}.png`)});
    await page.keyboard.press('Escape');rec.messageModal.escapeClosed=await textarea.count()===0;
    if(await textarea.count()){await panel.locator('button').first().click();rec.messageModal.closeButtonClosed=await page.locator('textarea').count()===0;}
    await page.getByRole('button',{name:'给麦当留言',exact:true}).click();
    const overlay2=page.locator('textarea').locator('xpath=../../../..');
    await overlay2.click({position:{x:3,y:3}});rec.messageModal.backdropClosed=await page.locator('textarea').count()===0;
    if(width<768){
      if(await page.locator('textarea').count())await page.locator('textarea').locator('xpath=../../..').locator('button').first().click();
      await page.evaluate(()=>scrollTo(0,0));await page.getByRole('button',{name:'打开导航',exact:true}).click();await page.screenshot({path:path.join(out,`mobile-navigation-${width}.png`)});rec.mobileNavigation={buttonLabel:await page.getByRole('button',{name:/导航/}).getAttribute('aria-label'),visibleLinks:await page.locator('header a:visible').evaluateAll(els=>els.map(e=>({text:e.textContent,href:e.getAttribute('href')})))};
    }
  }
  save(); await context.close(); console.log(`home ${width} reduced=${reduced} recorded`);
}
async function coursesAt(browser,width){
  const context=await browser.newContext({viewport:{width,height:900},locale:'zh-CN',isMobile:width===390,hasTouch:width===390}); const page=await context.newPage();await observeNetwork(page,width);
  const rec={page:'courses',width};result.observations.push(rec);
  await page.goto('https://www.mdldm.club/courses',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'所有课程',exact:true}).waitFor();
  const all=page.getByRole('button',{name:'全部',exact:true}); await all.waitFor();
  rec.filterBefore=await styles(all);rec.filterStructure=await all.locator('..').evaluate(e=>({tag:e.tagName,class:e.className,buttons:[...e.querySelectorAll('button')].map(x=>({text:x.textContent,class:x.className,ariaPressed:x.getAttribute('aria-pressed')}))}));
  const card=page.locator('div.group').filter({has:page.locator('h3')}).first();await card.waitFor();rec.card=await styles(card);rec.countBefore=await page.locator('div.group').filter({has:page.locator('h3')}).count();
  if(width===1440){await card.hover();await page.waitForTimeout(400);rec.cardHover=await styles(card);await snap(card,`courses-card-hover-${width}.png`);}
  await page.mouse.move(0,0);await page.screenshot({path:path.join(out,`courses-filters-${width}.png`)});
  const selected=page.getByRole('button',{name:'AI基础',exact:true});await selected.click();await page.waitForTimeout(600);rec.filterAfter=await styles(selected);rec.countAfter=await page.locator('div.group').filter({has:page.locator('h3')}).count();await page.screenshot({path:path.join(out,`courses-filter-selected-${width}.png`)});
  const search=page.locator('input[placeholder^="搜索课程"]').first();await search.fill('rea003_no_matching_course_20261105');await page.waitForTimeout(1300);rec.emptySearch={count:await page.locator('div.group').filter({has:page.locator('h3')}).count(),visibleText:(await page.locator('body').innerText()).split('\n').filter(x=>/没有|未找到|暂无|搜索|匹配/.test(x)),url:page.url()};await page.screenshot({path:path.join(out,`courses-empty-search-${width}.png`)});
  rec.overflow=await page.evaluate(()=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,containers:[...document.querySelectorAll('div')].filter(e=>e.scrollWidth>e.clientWidth+10&&getComputedStyle(e).overflowX!=='visible').map(e=>({class:e.className,overflowX:getComputedStyle(e).overflowX,width:e.clientWidth,scrollWidth:e.scrollWidth})).slice(0,8)}));
  save();await context.close();console.log(`courses ${width} recorded`);
}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{for(const w of [1440,768,390]){await homeAt(browser,w);await coursesAt(browser,w);}await homeAt(browser,390,true);result.browserVersion=browser.version();}finally{save();await browser.close();}})().catch(e=>{result.failure=e.stack;save();console.error(e);process.exitCode=1});
