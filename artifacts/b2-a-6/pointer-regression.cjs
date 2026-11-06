const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const variants=require('./variants.cjs');
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 try{
  for(const stage of['pr15','a6'])for(const width of[1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   await page.route('https://**',r=>r.abort());
   await page.goto(variants[stage].origin,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'查看公告',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'公会动态',exact:true});
   const close=dialog.getByRole('button',{name:'关闭弹窗',exact:true});
   const hit=await close.evaluate(button=>{
    const r=button.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return{pointerEvents:getComputedStyle(button).pointerEvents,hitButton:top===button||button.contains(top)};
   });
   assert.deepEqual(hit,stage==='a6'?{pointerEvents:'auto',hitButton:true}:{pointerEvents:'none',hitButton:false});
   if(stage==='a6'){
    await page.screenshot({path:path.join(__dirname,'browser/announcement-close-'+width+'.png')});
    await close.click();await dialog.waitFor({state:'hidden'});
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
   }else{
    await assert.rejects(close.click({timeout:1000}),/Timeout/);
    await page.keyboard.press('Escape');
   }
   results.push({stage,width,...hit,physicalCloseSucceeded:stage==='a6'});
   await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'browser/pointer-results.json'),JSON.stringify({results},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
