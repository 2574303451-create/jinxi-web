const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},locale:'zh-CN',reducedMotion:'no-preference'});
    await page.goto('https://www.mdldm.club/',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1800);
    const home = await page.evaluate(() => ({
      headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({tag:e.tagName,text:e.textContent,class:e.className})),
      buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,aria:e.getAttribute('aria-label'),class:e.className})),
      animations:document.getAnimations().map(a=>({name:a.animationName,target:a.effect?.target?.className,timing:a.effect?.getTiming()})),
      sections:[...document.querySelectorAll('section')].map(e=>({class:e.className,head:e.querySelector('h1,h2,h3')?.textContent,children:[...e.children].map(x=>({tag:x.tagName,class:x.className}))}))
    }));
    await page.getByRole('button',{name:'给麦当留言',exact:true}).click();
    const modal = await page.evaluate(()=>({
      fields:[...document.querySelectorAll('input,textarea')].map(e=>({tag:e.tagName,placeholder:e.getAttribute('placeholder'),ancestors:[e.parentElement,e.parentElement?.parentElement,e.parentElement?.parentElement?.parentElement,e.parentElement?.parentElement?.parentElement?.parentElement].filter(Boolean).map(x=>({tag:x.tagName,class:x.className}))})),
      buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,aria:e.getAttribute('aria-label'),class:e.className}))
    }));
    await page.goto('https://www.mdldm.club/courses',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1600);
    const courses = await page.evaluate(()=>({
      headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({tag:e.tagName,text:e.textContent,class:e.className})),
      buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,aria:e.getAttribute('aria-label'),class:e.className})),
      inputs:[...document.querySelectorAll('input')].map(e=>({placeholder:e.getAttribute('placeholder'),type:e.type,class:e.className})),
      candidateCards:[...document.querySelectorAll('div.group')].filter(e=>e.querySelector('h3')).slice(0,3).map(e=>({tag:e.tagName,class:e.className,role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex'),children:[...e.children].map(x=>({tag:x.tagName,class:x.className}))}))
    }));
    fs.writeFileSync(path.join(out,'scout.json'),JSON.stringify({capturedAt:new Date().toISOString(),home,modal,courses},null,2));
    console.log(JSON.stringify({home,modal,courses},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
