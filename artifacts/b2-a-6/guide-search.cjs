const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const {a6}=require('./variants.cjs');
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 try{
  for(const width of[1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   let writes=0;const errors=[];
   await context.route('https://**',r=>r.abort());
   context.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes++;});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(a6.origin+'/guides/',{waitUntil:'networkidle'});
   await p.locator('.guide-card').first().waitFor();
   const seen=p.waitForResponse(r=>r.url().includes('/strategies?')&&new URL(r.url()).searchParams.get('search')==='攻略14');
   await p.locator('#guide-search').fill('攻略14');
   await p.getByRole('button',{name:'搜索',exact:true}).click();
   const reply=await seen;assert.equal(reply.status(),200);
   await p.waitForFunction(()=>document.querySelectorAll('.guide-card').length===1);
   const card=p.locator('.guide-card').first();
   assert((await card.innerText()).includes('攻略14'));
   await card.getByRole('link',{name:/阅读全文/}).click();
   await p.locator('.guide-reader h1').waitFor();
   assert.equal(await p.locator('.guide-reader h1').innerText(),'【隔离样本】攻略14');
   assert.equal(writes,0);assert.deepEqual(errors,[]);
   results.push({width,serverSearch:true,matched:1,detailId:'14',writes,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(__dirname,'browser/search-results.json'),JSON.stringify({scope:'Local real readonly Function and synthetic PG',results},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
