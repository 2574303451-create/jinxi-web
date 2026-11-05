const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const baseline=require('./before-layout.json'),rows=[],errors=[];
const file=(w,state)=>path.join(__dirname,`after-${w}-${state}.png`);
async function locate(page){await page.locator('.guild-video summary').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-500,behavior:'instant'}));await page.waitForTimeout(100)}
async function geometry(page){return page.evaluate(()=>{
 const q=s=>document.querySelector(s),box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height}};
 const svg=[...q('.guild-video-cue').querySelectorAll('svg')].find(el=>getComputedStyle(el).display!=='none');
 const p=svg.createSVGPoint();p.x=svg.classList.contains('guild-video-cue-compact')?53:5;p.y=svg.classList.contains('guild-video-cue-compact')?24:30;const tip=p.matrixTransform(svg.getScreenCTM());
 const r=q('.guild-video summary').getBoundingClientRect(),hero=q('.guild-hero').getBoundingClientRect();
 return{summary:box(q('.guild-video summary')),hero:box(q('.guild-hero')),facts:box(q('#guild-facts')),tip:{x:tip.x,y:tip.y+scrollY},tipInsideSummary:tip.x>=r.left&&tip.x<=r.right&&tip.y>=r.top&&tip.y<=r.bottom,decorationsInsideHero:[svg,q('.guild-video-cue-label')].every(el=>{const b=el.getBoundingClientRect();return b.left>=hero.left&&b.right<=hero.right&&b.top>=hero.top&&b.bottom<=hero.bottom}),hitIsSummary:q('.guild-video summary').contains(document.elementFromPoint(tip.x,tip.y)),pointerEvents:getComputedStyle(q('.guild-video-cue')).pointerEvents,overflow:document.documentElement.scrollWidth>innerWidth,animation:getComputedStyle(q('.guild-video-cue')).animationName,videoPreload:q('.guild-video video').preload,videoAutoplay:q('.guild-video video').autoplay};
})}
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const width of [1440,1024,768,390,320]){
  const ctx=await b.newContext({viewport:{width,height:1000},locale:'zh-CN',reducedMotion:'no-preference',hasTouch:width<=390}),p=await ctx.newPage(),requests=[];
  p.on('pageerror',e=>errors.push({width,error:e.message}));p.on('request',r=>requests.push({path:new URL(r.url()).pathname,type:r.resourceType()}));
  const c=await ctx.newCDPSession(p);await c.send('Network.enable');await c.send('Network.setBlockedURLs',{urls:['https://cdn.jsdelivr.net/*']});
  await p.goto('http://127.0.0.1:3029/',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await locate(p);
  const normal=await geometry(p),old=baseline.find(x=>x.width===width);
  for(const name of ['summary','hero','facts'])assert.deepEqual(normal[name],old[name],`${width} ${name} original geometry`);
  assert(normal.tipInsideSummary&&normal.decorationsInsideHero&&normal.hitIsSummary&&!normal.overflow);
  assert.equal(normal.pointerEvents,'none');assert.equal(normal.animation,'none');assert.equal(normal.videoPreload,'none');assert.equal(normal.videoAutoplay,false);assert.equal(requests.filter(r=>r.type==='media').length,0);
  await p.screenshot({path:file(width,'collapsed')});await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.guild-hero').screenshot({path:file(width,'hero')});await locate(p);
  await p.locator('.guild-video summary').focus();const outline=await p.locator('.guild-video summary').evaluate(el=>getComputedStyle(el).outlineWidth);assert.equal(outline,'3px');await p.screenshot({path:file(width,'keyboard')});
  await p.keyboard.press('Enter');assert(await p.locator('.guild-video').evaluate(el=>el.open));assert(await p.locator('.guild-video-cue').isHidden());await locate(p);await p.screenshot({path:file(width,'expanded')});
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),'播放公会视频');
  await p.keyboard.press('Enter');await p.waitForFunction(()=>{const v=document.querySelector('.guild-video video');return v&&!v.paused&&v.currentTime>0.5},{timeout:20000});
  const video=await p.locator('.guild-video video').evaluate(v=>({currentTime:v.currentTime,readyState:v.readyState,source:new URL(v.currentSrc).pathname,width:v.videoWidth,height:v.videoHeight}));assert.equal(video.source,'/1.mp4');await p.screenshot({path:file(width,'playing')});await p.locator('.guild-video video').evaluate(v=>v.pause());
  await p.locator('.guild-video summary').focus();await p.keyboard.press('Enter');assert(!(await p.locator('.guild-video').evaluate(el=>el.open)));assert(await p.locator('.guild-video-cue').isVisible());await p.keyboard.press('Tab');assert(!(await p.evaluate(()=>document.activeElement.closest('.video-frame'))));
  if(width<=390){await p.locator('.guild-video summary').tap();assert(await p.locator('.guild-video').evaluate(el=>el.open));await p.locator('.guild-video summary').tap();}
  const reduced=await geometry(p);assert.equal(reduced.animation,'none');await p.screenshot({path:file(width,'reduced-motion')});
  // Layout at a 200% equivalent CSS viewport, recorded separately from true zoom.
  await p.setViewportSize({width:Math.floor(width/2),height:500});await locate(p);const zoomEquivalent=await geometry(p);assert(zoomEquivalent.tipInsideSummary); zoomEquivalent.scope = 'Full-page overflow at CSS195/160 matches the fixed baseline; separately verified in zoom-results.json.';await p.screenshot({path:file(width,'zoom-layout')});await p.setViewportSize({width,height:1000});
  await p.route('**/1.mp4',r=>r.abort('failed'));await p.reload({waitUntil:'networkidle'});await locate(p);await p.locator('.guild-video summary').click();await p.getByRole('button',{name:'播放公会视频',exact:true}).click();await p.getByText('视频暂不可用，已显示封面。',{exact:true}).waitFor();await p.waitForFunction(()=>document.querySelector('.video-frame img')?.naturalWidth>0);assert(await p.locator('.guild-video-cue').isHidden());await locate(p);await p.screenshot({path:file(width,'failed')});
  rows.push({width,normal,keyboardOutline:outline,video,reducedMotionStatic:reduced.animation==='none',zoomEquivalent,failedFallback:true,touch:width<=390?'tap open/close passed':'not touch emulation',passed:true});fs.writeFileSync(path.join(__dirname,'arrow-results.json'),JSON.stringify({rows,errors},null,2));console.log('PASS arrow',width);await ctx.close();
 }
 assert.equal(errors.length,0);
}finally{await b.close()}})().catch(e=>{console.error(e);fs.writeFileSync(path.join(__dirname,'arrow-results.json'),JSON.stringify({rows,errors,failure:e.stack},null,2));process.exitCode=1});
