// Real loopback HTTPS responses; no cloud connection and no replacement identity DTO.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {freshDatabase}=require('../member-local/database.cjs');
const {serve}=require('../member-local/server.cjs');
const origin='https://127.0.0.1:3069';

async function main(){
  const args=process.argv.slice(2);
  assert((args.length===4||args.length===6&&args[4]==='--playwright-module'&&path.isAbsolute(args[5]))&&args[0]==='--pg-bin'&&args[2]==='--openssl','Explicit local tools required');
  const {chromium}=require(args[5]||'C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
  const directory=path.join(__dirname,'../artifacts/phase3-member/restore-race',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(directory,{recursive:true});
  const results={classification:'synthetic-local',startedAtUtc:new Date().toISOString(),passed:false,scenarios:[],pageErrors:[],externalRequests:0,cspViolations:[]};
  results.demoSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../member-local/demo.js'),'utf8').replace(/\r\n/g,'\n')).digest('hex');
  const releases=[];let db,server,browser;
  async function signal(gate){
    let timeout;
    try{await Promise.race([gate.promise,new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('LOCAL_BROWSER_SIGNAL_TIMEOUT')),12000);})]);}
    finally{clearTimeout(timeout);}
  }
  const gate=()=>{
    let release;
    const promise=new Promise(resolve=>{release=resolve;});
    releases.push(release);
    return {promise,release};
  };
  try{
    db=await freshDatabase(args[1]);server=await serve(db,args[3]);
    browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    results.edge=browser.version();
    async function context(){
      const c=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},reducedMotion:'reduce'});
      await c.addInitScript(()=>{window.localCsp=[];document.addEventListener('securitypolicyviolation',e=>window.localCsp.push(e.effectiveDirective));});
      return c;
    }
    async function open(c){
      const page=await c.newPage();page.setDefaultTimeout(8000);
      page.on('pageerror',error=>results.pageErrors.push(error.name));
      return page;
    }
    async function allowed(route){
      if(new URL(route.request().url()).origin!==origin){results.externalRequests++;await route.abort();return false;}
      return true;
    }
    async function finish(c,page,row){
      results.cspViolations.push(...await page.evaluate(()=>window.localCsp));
      row.passed=true;await c.close();
    }
    {
      const account=(await db.seed()).find(a=>a.kind==='normal'),c=await context();
      const held=gate(),seen=gate(),row={name:'old401-before-new-login',passed:false};results.scenarios.push(row);
      let first=true;
      await c.route('**/*',async route=>{
        if(!await allowed(route))return;
        if(first&&route.request().url()===origin+'/api/member?op=me'){
          first=false;const response=await route.fetch();row.heldStatus=response.status();assert.equal(response.status(),401);
          seen.release();await held.promise;return route.fulfill({response});
        }
        return route.continue();
      });
      const page=await open(c);await page.goto(origin,{waitUntil:'domcontentloaded'});
      await signal(seen);
      await page.locator('#password').fill(account.password);await page.locator('#login button').click();
      await page.getByText('合成成员登录成功。',{exact:true}).waitFor();
      held.release();await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('#member').isVisible(),true);
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),200);
      await finish(c,page,row);
    }
    {
      const account=(await db.seed()).find(a=>a.kind==='normal'),c=await context();
      const heldLogin=gate(),loginSeen=gate(),verified=gate();
      const row={name:'online-and-focus-during-login',passed:false,prematureChecks:0,queuedChecks:0};results.scenarios.push(row);
      let holdLogin=true,loginHeld=false,watchRecovery=false;
      await c.route('**/*',async route=>{
        if(!await allowed(route))return;
        const request=route.request();
        if(holdLogin&&request.method()==='POST'&&request.url()===origin+'/api/member'&&JSON.parse(request.postData()).op==='login'){
          holdLogin=false;loginHeld=true;loginSeen.release();await heldLogin.promise;loginHeld=false;return route.continue();
        }
        if(watchRecovery&&request.url()===origin+'/api/member?op=me'){
          if(loginHeld)row.prematureChecks++;
          row.queuedChecks++;
          const response=await route.fetch();row.recoveryStatus=response.status();
          await route.fulfill({response});verified.release();return;
        }
        return route.continue();
      });
      const page=await open(c);await page.goto(origin,{waitUntil:'networkidle'});
      await page.locator('#draft').fill('竞态验证保留的合成草稿');
      await page.locator('#password').fill(account.password);await page.locator('#login button').click();await signal(loginSeen);
      watchRecovery=true;
      await page.evaluate(()=>{for(let n=0;n<10;n++){window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));}});
      // Keep the login request blocked while browser event/network queues drain.
      await page.waitForTimeout(150);
      assert.equal(row.prematureChecks,0,'Recovery must not query with the pre-login cookie');
      heldLogin.release();await signal(verified);await page.waitForLoadState('networkidle');
      assert.equal(row.queuedChecks,1,'Recovery events during the action must coalesce');
      assert.equal(row.recoveryStatus,200);
      assert.equal(await page.locator('#member').isVisible(),true);
      assert.equal(await page.locator('#status').innerText(),'合成成员登录成功。');
      assert.equal(await page.locator('#draft').inputValue(),'竞态验证保留的合成草稿');
      await page.locator('#profile').click();await page.getByText('仅已登录成员的本人资料。',{exact:true}).waitFor();
      assert((await page.locator('#profile-data').innerText()).includes('2018-02-10'));
      await page.screenshot({path:path.join(directory,'online-during-login-390.png')});
      await finish(c,page,row);
    }
    {
      const account=(await db.seed()).find(a=>a.kind==='normal'),c=await context();
      const oldHeld=gate(),oldSeen=gate(),logoutHeld=gate(),logoutSeen=gate(),verified=gate();
      const row={name:'queued-recovery-after-logout-and-delayed-old200',passed:false,prematureChecks:0};results.scenarios.push(row);
      let holdOld=false,holdLogout=false,logoutBlocked=false,watchRecovery=false;
      await c.route('**/*',async route=>{
        if(!await allowed(route))return;
        const request=route.request();
        if(holdOld&&request.url()===origin+'/api/member?op=me'){
          holdOld=false;const response=await route.fetch();assert.equal(response.status(),200);
          oldSeen.release();await oldHeld.promise;return route.fulfill({response});
        }
        if(holdLogout&&request.url()===origin+'/api/member'&&request.method()==='POST'&&JSON.parse(request.postData()).op==='logout'){
          holdLogout=false;logoutBlocked=true;logoutSeen.release();await logoutHeld.promise;logoutBlocked=false;return route.continue();
        }
        if(watchRecovery&&request.url()===origin+'/api/member?op=me'){
          if(logoutBlocked)row.prematureChecks++;
          const response=await route.fetch();row.recoveryStatus=response.status();
          await route.fulfill({response});verified.release();return;
        }
        return route.continue();
      });
      const page=await open(c);await page.goto(origin,{waitUntil:'networkidle'});
      await page.locator('#password').fill(account.password);await page.locator('#login button').click();
      await page.locator('#member').waitFor({state:'visible'});
      holdOld=true;await page.locator('#refresh').click();await signal(oldSeen);
      holdLogout=true;await page.locator('#logout').click();await signal(logoutSeen);watchRecovery=true;
      await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(150);
      assert.equal(row.prematureChecks,0);
      logoutHeld.release();await signal(verified);
      assert.equal(row.recoveryStatus,401);
      oldHeld.release();await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('#member').isVisible(),false);
      assert.equal(await page.locator('#status').innerText(),'此会话已撤销，草稿保留。');
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),401);
      await finish(c,page,row);
    }
    {
      const accounts=Object.fromEntries((await db.seed()).map(a=>[a.kind,a])),c=await context();
      const oldHeld=gate(),oldSeen=gate(),logoutHeld=gate(),logoutSeen=gate(),anonymousHeld=gate(),anonymousSeen=gate();
      const row={name:'rapid-A-to-B-duplicate-submits-and-late-responses',passed:false,loginPosts:0,logoutPosts:0};results.scenarios.push(row);
      let holdOld=false,holdLogout=false,holdAnonymous=false;
      await c.route('**/*',async route=>{
        if(!await allowed(route))return;
        const request=route.request(),op=request.method()==='POST'?JSON.parse(request.postData()).op:null;
        if(op==='login')row.loginPosts++;
        if(op==='logout')row.logoutPosts++;
        if(holdOld&&request.url()===origin+'/api/member?op=me'){
          holdOld=false;const response=await route.fetch();assert.equal(response.status(),200);
          assert.equal((await response.json()).member.id,accounts.normal.memberId);
          oldSeen.release();await oldHeld.promise;return route.fulfill({response});
        }
        if(holdLogout&&op==='logout'){
          holdLogout=false;logoutSeen.release();await logoutHeld.promise;return route.continue();
        }
        if(holdAnonymous&&request.url()===origin+'/api/member?op=me'){
          holdAnonymous=false;const response=await route.fetch();assert.equal(response.status(),401);
          anonymousSeen.release();await anonymousHeld.promise;return route.fulfill({response});
        }
        return route.continue();
      });
      const page=await open(c);await page.goto(origin,{waitUntil:'networkidle'});
      await page.locator('#password').fill(accounts.normal.password);
      await page.evaluate(()=>{document.getElementById('login').requestSubmit();document.getElementById('login').requestSubmit();});
      await page.getByText('合成成员登录成功。',{exact:true}).waitFor();
      holdOld=true;await page.locator('#refresh').click();await signal(oldSeen);
      holdLogout=true;
      await page.evaluate(()=>{for(let n=0;n<2;n++)document.getElementById('logout').dispatchEvent(new MouseEvent('click'));});
      await signal(logoutSeen);
      await page.evaluate(()=>window.dispatchEvent(new Event('online')));
      holdAnonymous=true;logoutHeld.release();await signal(anonymousSeen);
      await page.locator('#account').selectOption(accounts.same.account);await page.locator('#password').fill(accounts.same.password);
      await page.evaluate(()=>{document.getElementById('login').requestSubmit();document.getElementById('login').requestSubmit();});
      await page.getByText('合成成员登录成功。',{exact:true}).waitFor();
      oldHeld.release();anonymousHeld.release();await page.waitForLoadState('networkidle');
      assert.equal(row.loginPosts,2,'Duplicate submits must send one login per account');
      assert.equal(row.logoutPosts,1,'Repeated clicks must send one logout');
      assert.equal(await page.locator('#member').isVisible(),true);
      await page.locator('#profile').click();await page.getByText('仅已登录成员的本人资料。',{exact:true}).waitFor();
      const text=await page.locator('#profile-data').innerText();
      assert(text.includes(accounts.same.memberId));assert(!text.includes(accounts.normal.memberId));
      const actual=await c.request.get(origin+'/api/member?op=me');assert.equal(actual.status(),200);
      assert.equal((await actual.json()).member.id,accounts.same.memberId);
      row.sameNicknameDifferentIds=accounts.same.memberId!==accounts.normal.memberId;
      row.uiAndServerRemainB=true;
      await finish(c,page,row);
    }
    {
      const account=(await db.seed()).find(a=>a.kind==='normal'),c=await context();
      const row={name:'failed-operations-duplicate-submit-and-retry',passed:false,logoutPosts:0,passwordPosts:0};results.scenarios.push(row);
      let abortLogout=true;
      await c.route('**/*',async route=>{
        if(!await allowed(route))return;
        const request=route.request(),op=request.method()==='POST'?JSON.parse(request.postData()).op:null;
        if(op==='change-password')row.passwordPosts++;
        if(op==='logout'){
          row.logoutPosts++;
          if(abortLogout){abortLogout=false;return route.abort('failed');}
        }
        return route.continue();
      });
      const page=await open(c);await page.goto(origin,{waitUntil:'networkidle'});
      const login=async password=>{await page.locator('#password').fill(password);await page.locator('#login button').click();await page.locator('#member').waitFor({state:'visible'});};
      await login(account.password);
      const passwordResponse=page.waitForResponse(r=>r.url()===origin+'/api/member'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()).op==='change-password');
      await page.locator('#current').fill('wrong-synthetic-password');await page.locator('#next').fill('Synthetic-Review-Changed-123!');
      await page.evaluate(()=>{document.getElementById('change').requestSubmit();document.getElementById('change').requestSubmit();});
      assert.equal((await passwordResponse).status(),403);
      await page.getByText('请求未获授权或输入无效。',{exact:true}).waitFor();
      assert.equal(await page.locator('#member').isVisible(),true);assert.equal(row.passwordPosts,1);
      assert.equal(await page.locator('#current').inputValue(),'wrong-synthetic-password');
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),200);
      await page.locator('#logout').click();
      await page.getByText('网络中断，身份尚未核验；草稿保留。',{exact:true}).waitFor();
      assert.equal(await page.locator('#member').isVisible(),false);
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),200,'Aborted request must not claim server logout');
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.locator('#member').waitFor({state:'visible'});
      await page.locator('#logout').click();await page.getByText('此会话已撤销，草稿保留。',{exact:true}).waitFor();
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),401);
      await login(account.password);
      await page.locator('#current').fill(account.password);await page.locator('#next').fill('Synthetic-Review-Changed-123!');
      await page.evaluate(()=>{document.getElementById('change').requestSubmit();document.getElementById('change').requestSubmit();});
      await page.getByText('密码已修改，所有旧会话已撤销，请重新登录。',{exact:true}).waitFor();
      assert.equal(await page.locator('#member').isVisible(),false);
      assert.equal(await page.locator('#current').inputValue(),'');assert.equal(row.passwordPosts,2);assert.equal(row.logoutPosts,2);
      await login('Synthetic-Review-Changed-123!');await page.waitForLoadState('networkidle');
      assert.equal((await c.request.get(origin+'/api/member?op=profile')).status(),200);
      row.rejectedPasswordStatus=403;row.abortedLogoutRemainsUnknown=true;row.retriesVerified=true;
      await finish(c,page,row);
    }
    assert.deepEqual(results.pageErrors,[]);assert.deepEqual(results.cspViolations,[]);assert.equal(results.externalRequests,0);
    results.passed=true;
  }catch(error){results.errorType=error.name;throw error;}
  finally{
    for(const release of releases)release();
    await browser?.close();await server?.close();await db?.stop();
    results.completedAtUtc=new Date().toISOString();
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify({passed:results.passed,evidence:directory,scenarios:results.scenarios}));
  }
}
main().catch(()=>{process.exitCode=1;});
