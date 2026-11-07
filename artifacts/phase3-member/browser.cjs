// Local-only actual browser test; never accesses the hosted TEST or production.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const {freshDatabase}=require('../../member-local/database.cjs');
const {serve}=require('../../member-local/server.cjs');
async function main(){
  const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--pg-bin'&&args[2]==='--openssl');
  const db=await freshDatabase(args[1]);let server,browser;
  const directory=path.join(__dirname,'browser',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(directory,{recursive:true});
  const results={origin:db.settings.origin,classification:'synthetic-local',passed:false,viewports:[]};
  try{
    server=await serve(db,args[3]);browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});results.edge=browser.version();
    for(const width of [1440,1024,768,390,320]){
      const accounts=Object.fromEntries((await db.seed()).map(a=>[a.kind,a]));
      const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:1000},reducedMotion:'reduce'});
      const row={width,passed:false,pageErrors:[],cspViolations:[],externalRequests:0};results.viewports.push(row);
      await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==db.settings.origin){row.externalRequests++;return route.abort();}return route.continue();});
      await context.addInitScript(()=>{localStorage.setItem('jinxi-auth-account','forged-old-local-account');window.localCsp=[];document.addEventListener('securitypolicyviolation',e=>window.localCsp.push(e.effectiveDirective));});
      const page=await context.newPage();page.on('pageerror',error=>row.pageErrors.push(error.name));
      try{
        await page.goto(db.settings.origin,{waitUntil:'networkidle'});
        await page.locator('#login').waitFor({state:'visible'});
        assert.equal(await page.locator('#member').isVisible(),false);
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#account').evaluate(node=>node===document.activeElement),true);
        assert.equal(await page.locator('#account').evaluate(node=>getComputedStyle(node).outlineWidth),'3px');
        await page.locator('#draft').fill('本机合成草稿：退出、过期及断网后保留。');
        await page.screenshot({path:path.join(directory,'guest-'+width+'.png')});
        const login=async account=>{await page.locator('#account').selectOption(account.account);await page.locator('#password').fill(account.password);await page.locator('#login button').click();await page.locator('#member').waitFor({state:'visible'});};
        await login(accounts.normal);
        await page.locator('#profile').click();await page.getByText('仅已登录成员的本人资料。',{exact:true}).waitFor();
        assert.equal(await page.locator('#identity').innerText(),'合成伙伴 normal');
        assert((await page.locator('#profile-data').innerText()).includes('2018-02-10'));
        const cookies=await context.cookies();const session=cookies.find(c=>c.name==='__Host-jinxi_member_local');assert(session?.httpOnly&&session.secure&&session.sameSite==='Lax','Browser cookie protections must apply');
        assert.equal(await page.evaluate(()=>document.cookie.includes('__Host-jinxi_member_local')),false);
        const storage=await page.evaluate(()=>JSON.stringify(localStorage));assert(!storage.includes(accounts.normal.password)&&!storage.includes(session.value),'No credentials in localStorage');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await page.screenshot({path:path.join(directory,'profile-'+width+'.png')});
        if(width===1440){
          const tab=await context.newPage();await tab.goto(db.settings.origin,{waitUntil:'networkidle'});await tab.locator('#member').waitFor({state:'visible'});
          const c=await db.admin();try{assert.equal(Number((await c.query('SELECT count(*) AS n FROM b2_lab.member_sessions_v2 WHERE revoked_at IS NULL')).rows[0].n),1);}finally{await c.end();}
          await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});await tab.locator('#login').waitFor({state:'visible'});assert.equal(await tab.locator('#draft').inputValue(),'本机合成草稿：退出、过期及断网后保留。');await tab.close();row.sharedCookieAndLogoutBroadcast=true;
          await login(accounts.normal);
        }
        if(width===390){
          await context.setOffline(true);await page.locator('#refresh').click();await page.getByText('网络中断，身份尚未核验；草稿保留。',{exact:true}).waitFor();assert.equal(await page.locator('#login').isVisible(),true);
          await context.setOffline(false);await page.locator('#member').waitFor({state:'visible'});row.networkRecovery=true;
        }
        await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});
        assert.equal(await page.locator('#draft').inputValue(),'本机合成草稿：退出、过期及断网后保留。');
        await login(accounts.first);assert.equal(await page.locator('#profile').isDisabled(),true);
        await page.locator('#current').fill(accounts.first.password);await page.locator('#next').fill('Synthetic-Browser-Changed-123!');await page.locator('#change button').click();
        await page.getByText('密码已修改，所有旧会话已撤销，请重新登录。',{exact:true}).waitFor();assert.equal(await page.locator('#login').isVisible(),true);
        await login({...accounts.first,password:'Synthetic-Browser-Changed-123!'});assert.equal(await page.locator('#profile').isDisabled(),false);
        const admin=await db.admin();try{await admin.query("UPDATE b2_lab.member_sessions_v2 SET created_at=now()-interval '8 days',expires_at=now()-interval '1 second',idle_expires_at=now()-interval '2 seconds' WHERE account_id=$1",[accounts.first.accountId]);}finally{await admin.end();}
        await page.locator('#refresh').click();await page.locator('#login').waitFor({state:'visible'});
        assert.equal(await page.locator('#draft').inputValue(),'本机合成草稿：退出、过期及断网后保留。');
        row.cspViolations=await page.evaluate(()=>window.localCsp);assert.deepEqual(row.pageErrors,[]);assert.deepEqual(row.cspViolations,[]);assert.equal(row.externalRequests,0);
        row.firstChange=true;row.expiry=true;row.draftPreserved=true;row.passed=true;
      }catch(error){row.errorType=error.name;await page.screenshot({path:path.join(directory,'failure-'+width+'.png')});throw Error('LOCAL_BROWSER_ASSERTION_FAILED');}
      finally{await context.close();}
    }
    results.passed=true;
  }finally{await browser?.close();await server?.close();await db.stop();results.completedAtUtc=new Date().toISOString();fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,viewports:results.viewports.map(v=>({width:v.width,passed:v.passed})),evidence:directory}));}
}
main().catch(()=>{process.exitCode=1;});
