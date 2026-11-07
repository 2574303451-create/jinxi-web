// Actual browser, original identity page and fresh local synthetic database.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshAttendance}=require('../attendance-local/database.cjs'),{serveAttendance}=require('../attendance-local/server.cjs');
async function main(){
 const args=process.argv.slice(2);assert(args.length===6&&args[0]==='--pg-bin'&&args[2]==='--openssl'&&args[4]==='--playwright-module');
 const {chromium}=require(args[5]),directory=path.join(__dirname,'../artifacts/phase3-attendance/browser',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(directory,{recursive:true});
 const record={passed:false,startedAtUtc:new Date().toISOString(),pageErrors:[],csp:[],externalRequests:0,viewports:[]};let db,server,browser,lastPage;
 try{
  db=await freshAttendance(args[1]);await db.setClock('2024-02-29T15:59:59.999Z');server=await serveAttendance(db,args[3]);browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const origin=db.settings.origin,contexts=[];
  async function pageFor(kind){
   const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'});contexts.push(context);
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){record.externalRequests++;return route.abort();}return route.continue();});
   await context.addInitScript(()=>{window.executedXss=false;window.csp=[];document.addEventListener('securitypolicyviolation',e=>window.csp.push(e.effectiveDirective));});
   const p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>record.pageErrors.push(e.name));
   if(kind){await p.goto(origin,{waitUntil:'networkidle'});await p.locator('#account').selectOption(db.accounts[kind].account);await p.locator('#password').fill(db.accounts[kind].password);await p.locator('#login button').click();await p.locator('#member').waitFor({state:'visible'});}
   await p.goto(origin+'/attendance',{waitUntil:'networkidle'});return p;
  }
  const a=await pageFor('normal'),b=await pageFor('same'),guest=await pageFor();lastPage=a;
  record.stage='initial-private-isolation';assert((await a.locator('#stats').innerText()).includes('0 天'));assert.equal(await guest.locator('#private').isHidden(),true);assert.equal(await guest.locator('#checkin').isDisabled(),true);
  let posts=0,firstRequestId,firstRecordId,abortOnce=true;
  await a.route('**/api/attendance',async route=>{
   if(route.request().method()==='POST'){
    const body=JSON.parse(route.request().postData());posts++;
    if(abortOnce){abortOnce=false;firstRequestId=body.requestId;const response=await route.fetch();assert.equal(response.status(),200);firstRecordId=(await response.json()).recordId;return route.abort('failed');}
    if(posts===2)assert.equal(body.requestId,firstRequestId);if(posts===3)assert.notEqual(body.requestId,firstRequestId);
   }
   return route.continue();
  });
  record.stage='lost-response-double-click-and-day-replay';
  await a.locator('#checkin').evaluate(button=>{button.dispatchEvent(new MouseEvent('click',{bubbles:true}));button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await a.locator('#checkin').filter({hasText:'重试原签到请求'}).waitFor();assert.equal(posts,1);await a.waitForLoadState('networkidle');assert.equal(await a.locator('#state').innerText(),'今日已签到');
  await b.locator('#reload').click();await b.locator('#private').waitFor({state:'visible'});assert((await b.locator('#stats').innerText()).includes('0 天'));
  await db.setClock('2024-02-29T16:00:00.000Z');await a.locator('#checkin').click();
  await a.locator('#notice').filter({hasText:'原请求已确认：2024-02-29'}).waitFor();await a.waitForLoadState('networkidle');assert.equal(await a.locator('#state').innerText(),'今日未签到');assert.equal(posts,2);
  const admin=await db.admin();try{assert.equal((await admin.query('SELECT count(*)::int AS n FROM attendance_lab.records')).rows[0].n,1);}finally{await admin.end();}
  await a.locator('#checkin').click();await a.locator('#state').filter({hasText:'今日已签到'}).waitFor();await a.waitForLoadState('networkidle');assert.equal(posts,3);assert((await a.locator('#stats').innerText()).includes('2 天'));
  record.retry={sameRequestId:true,noAutomaticPost:true,oldDateNotMisreportedAsToday:true,newDayRequiresNewId:true,rapidRepeatIgnored:true};
  record.stage='same-nickname-ownership';lastPage=b;await b.locator('#reload').click();await b.waitForLoadState('networkidle');await b.locator('#checkin').click();await b.locator('#state').filter({hasText:'今日已签到'}).waitFor();
  assert.equal((await b.context().request.get(origin+'/api/attendance?memberId='+db.accounts.normal.memberId)).status(),403);
  const bState=await b.context().request.get(origin+'/api/attendance');assert.equal(bState.status(),200);const other=await bState.json();assert.equal(other.memberId,db.accounts.same.memberId);assert.equal(other.stats.totalDays,1);assert(!other.history.some(x=>x.id===firstRecordId));record.sameNicknameIsolated=true;
  record.stage='account-change-before-submit';lastPage=a;await db.setClock('2024-03-02T04:00:00.000Z');await a.locator('#reload').click();await a.locator('#state').filter({hasText:'今日未签到'}).waitFor();await a.waitForLoadState('networkidle');
  const switched=await a.context().request.post(origin+'/api/member',{headers:{Origin:origin,'Content-Type':'application/json'},data:{op:'login',account:db.accounts.same.account,password:db.accounts.same.password}});assert.equal(switched.status(),200);
  await a.locator('#checkin').evaluate(button=>button.click());await a.waitForLoadState('networkidle');assert.equal(posts,3,'The A-bound click must not sign B');assert.equal(await a.locator('[data-id="'+firstRecordId+'"]').count(),0);
  const aNowB=await (await a.context().request.get(origin+'/api/attendance')).json();assert.equal(aNowB.memberId,db.accounts.same.memberId);assert.equal(aNowB.stats.totalDays,1);record.changedActorClickRejected=true;
  record.stage='actual-broadcast-login-and-private-response';
  const identityPage=await a.context().newPage();identityPage.on('pageerror',e=>record.pageErrors.push(e.name));await identityPage.goto(origin,{waitUntil:'networkidle'});await identityPage.locator('#member').waitFor({state:'visible'});
  await identityPage.locator('#logout').click();await a.locator('#session').filter({hasText:'游客'}).waitFor();assert.equal(await a.locator('#private').isHidden(),true);
  await identityPage.locator('#account').selectOption(db.accounts.normal.account);await identityPage.locator('#password').fill(db.accounts.normal.password);await identityPage.locator('#login button').click();await a.locator('[data-id="'+firstRecordId+'"]').waitFor();
  let entered,release,holdNext=true;const reading=new Promise(r=>{entered=r;}),held=new Promise(r=>{release=r;});
  const holdPrivate=async route=>{if(holdNext&&route.request().method()==='GET'){holdNext=false;const old=await route.fetch();assert.equal(old.status(),200);entered();await held;return route.fulfill({response:old});}return route.fallback();};
  await a.route('**/api/attendance**',holdPrivate);await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await reading;
  try{
   const next=crypto.randomBytes(20).toString('hex')+'A9!';await identityPage.locator('#current').fill(db.accounts.normal.password);await identityPage.locator('#next').fill(next);await identityPage.locator('#change button').click();await a.locator('#session').filter({hasText:'游客'}).waitFor();db.accounts.normal.password=next;assert.equal(await a.locator('#private').isHidden(),true);
  }finally{release();}
  await a.waitForLoadState('networkidle');assert.equal(await a.locator('#history article').count(),0);assert.equal(await a.locator('#private').isHidden(),true);await a.unroute('**/api/attendance**',holdPrivate);
  record.broadcasts={login:true,logout:true,passwordChange:true,oldPrivateResponseDiscarded:true};record.csp.push(...await identityPage.evaluate(()=>window.csp));await identityPage.close();
  record.stage='first-reset-and-safe-nickname';const first=await pageFor('first');assert.equal(await first.locator('#private').isHidden(),true);assert.equal(await first.locator('#checkin').isDisabled(),true);
  const malicious='<img src=x onerror="window.executedXss=true"><script>window.executedXss=true</script>',c=await db.admin();try{await c.query('UPDATE b2_lab.guild_member_profiles SET nickname=$1 WHERE employee_no=$2',[malicious,db.accounts.same.employeeNo]);}finally{await c.end();}
  lastPage=b;await b.locator('#reload').click();await b.locator('#session').filter({hasText:'<script>'}).waitFor();assert.equal(await b.evaluate(()=>window.executedXss),false);assert.equal(await b.locator('#session img,#session script').count(),0);record.nicknameRenderedAsText=true;
  record.stage='five-widths';for(const width of [1440,1024,768,390,320]){await b.setViewportSize({width,height:1000});await b.evaluate(()=>window.scrollTo(0,0));assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width);record.viewports.push({width,passed:true});await b.screenshot({path:path.join(directory,'attendance-'+width+'.png'),fullPage:true});}
  await b.keyboard.press('Tab');assert.equal(await b.locator(':focus').evaluate(n=>getComputedStyle(n).outlineWidth),'3px');
  for(const context of contexts){for(const p of context.pages())record.csp.push(...await p.evaluate(()=>window.csp));await context.close();}
  assert.deepEqual(record.pageErrors,[]);assert.deepEqual(record.csp,[]);assert.equal(record.externalRequests,0);record.passed=true;
 }catch(error){record.errorType=error.name;record.testLocation=String(error.stack).match(/attendance-local-browser\.cjs:\d+:\d+/g)||[];if(lastPage)await lastPage.screenshot({path:path.join(directory,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await browser?.close();await server?.close();await db?.stop();record.completedAtUtc=new Date().toISOString();fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({passed:record.passed,directory,stage:record.stage,viewports:record.viewports}));}
}
main().catch(()=>{process.exitCode=1;});
