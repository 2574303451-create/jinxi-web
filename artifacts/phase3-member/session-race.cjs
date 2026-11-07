// Delay an actual unauthenticated response; never replace it with a fabricated identity.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const {freshDatabase}=require('../../member-local/database.cjs');
const {serve}=require('../../member-local/server.cjs');
async function main(){
  const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');
  const db=await freshDatabase(args[1]);let server,browser,release;
  const record={scope:'Local synthetic HTTPS; delayed actual401 must not erase newer successful login',startedAtUtc:new Date().toISOString(),passed:false};
  try{
    const account=(await db.seed()).find(a=>a.kind==='normal');server=await serve(db,args[3]);
    browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const context=await browser.newContext({ignoreHTTPSErrors:true});const held=new Promise(resolve=>{release=resolve;});
    let intercept=true;
    await context.route('**/*',async route=>{
      if(new URL(route.request().url()).origin!==db.settings.origin)return route.abort();
      if(intercept&&route.request().url()===db.settings.origin+'/api/member?op=me'){
        intercept=false;const response=await route.fetch();assert.equal(response.status(),401);record.heldServerStatus=401;await held;return route.fulfill({response});
      }
      return route.continue();
    });
    const page=await context.newPage();page.setDefaultTimeout(8000);await page.goto(db.settings.origin,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.request==='function');
    await page.locator('#password').fill(account.password);await page.locator('#login button').click();await page.getByText('合成成员登录成功。',{exact:true}).waitFor();
    record.newLoginDisplayedBeforeOldResponse=true;release();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#member').isVisible(),true,'An older401 must not clear a newer authenticated display');
    await page.locator('#profile').click();await page.getByText('仅已登录成员的本人资料。',{exact:true}).waitFor();
    record.serverProfileStillValid=true;record.passed=true;await context.close();
  }catch(error){record.errorType=error.name;}
  finally{release?.();await browser?.close();await server?.close();await db.stop();record.completedAtUtc=new Date().toISOString();const file=path.join(__dirname,'session-race-'+(record.passed?'passed':'failed')+'.json');fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));if(!record.passed)process.exitCode=1;}
}
main().catch(()=>{console.log('LOCAL_SESSION_RACE_TEST_UNAVAILABLE');process.exitCode=1;});
