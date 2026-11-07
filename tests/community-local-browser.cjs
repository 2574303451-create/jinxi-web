// Browser evidence is local-only and uses completely synthetic accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {freshCommunity}=require('../community-local/database.cjs'),{serveCommunity}=require('../community-local/server.cjs');
async function main(){
 const args=process.argv.slice(2);assert(args.length===6&&args[0]==='--pg-bin'&&args[2]==='--openssl'&&args[4]==='--playwright-module');
 const {chromium}=require(args[5]);
 const directory=path.join(__dirname,'../artifacts/phase3-community/browser',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(directory,{recursive:true});
 const record={passed:false,pageErrors:[],csp:[],externalRequests:0,viewports:[],startedAtUtc:new Date().toISOString()};
 let lastPage;
 let db,server,browser;
 try{
  db=await freshCommunity(args[1]);server=await serveCommunity(db,args[3]);browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const contexts=[];
  async function pageFor(kind){
   record.stage='open-'+(kind||'guest');
   const c=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'});contexts.push(c);
   await c.route('**/*',route=>{if(new URL(route.request().url()).origin!==db.settings.origin){record.externalRequests++;return route.abort();}return route.continue();});
   await c.addInitScript(()=>{window.executedXss=false;window.csp=[];document.addEventListener('securitypolicyviolation',e=>window.csp.push(e.effectiveDirective));});
   const p=await c.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>record.pageErrors.push(e.name));
   if(kind){await p.goto(db.settings.origin,{waitUntil:'networkidle'});await p.locator('#account').selectOption(db.accounts[kind].account);await p.locator('#password').fill(db.accounts[kind].password);await p.locator('#login button').click();await p.locator('#member').waitFor({state:'visible'});}
   await p.goto(db.settings.origin+'/community',{waitUntil:'networkidle'});return p;
  }
  const a=await pageFor('normal'),b=await pageFor('same'),r=await pageFor('reviewer'),guest=await pageFor();lastPage=guest;
  record.stage='create-message';
  assert((await a.locator('#session').innerText()).includes('合成伙伴'));
  await a.locator('#body').fill('浏览器合成留言');
  let response=a.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');
  await a.locator('#compose button[type=submit]').click();let created=await (await response).json();const messageId=created.item.id;assert.equal(created.item.status,'submitted');
  await guest.locator('#reload').click();await guest.waitForLoadState('networkidle');assert.equal(await guest.locator('[data-id="'+messageId+'"]').count(),0);
  record.stage='review-message';
  await r.locator('#scope').selectOption('review');await r.locator('#reload').click();await r.locator('[data-id="'+messageId+'"]').waitFor();
  response=r.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');await r.locator('[data-id="'+messageId+'"] [data-action="approve"]').click();assert.equal((await (await response).json()).item.status,'published');
  record.stage='reply-and-ownership';
  await b.locator('#reload').click();let card=b.locator('[data-id="'+messageId+'"]');await card.waitFor();
  await card.locator('textarea').fill('不同成员的合成回复');await card.locator('button[data-action="reply"]').click();await card.getByText('不同成员的合成回复',{exact:true}).waitFor();
  response=b.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');await card.locator('button[data-action="delete"]').click();assert.equal((await response).status(),403);await b.locator('#notice').filter({hasText:'NOT_OWNER'}).waitFor();
  record.stage='guide-workflow';
  await a.locator('#kind').selectOption('guide');await a.locator('#title').fill('浏览器合成攻略');await a.locator('#body').fill('合成攻略正文');await a.locator('#fixture-media').check();
  response=a.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');await a.locator('#compose button[type=submit]').click();created=await (await response).json();const guideId=created.item.id;assert.equal(created.item.status,'draft');
  response=a.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');await a.locator('[data-id="'+guideId+'"] button[data-action="submit"]').click();assert.equal((await (await response).json()).item.status,'submitted');
  await r.locator('#kind').selectOption('guide');await r.locator('#reload').click();await r.locator('[data-id="'+guideId+'"]').waitFor();
  response=r.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');await r.locator('[data-id="'+guideId+'"] button[data-action="approve"]').click();assert.equal((await (await response).json()).item.status,'published');
  await guest.locator('#kind').selectOption('guide');await guest.locator('#reload').click();await guest.locator('[data-id="'+guideId+'"]').waitFor();
  record.stage='uncertain-response-retry-and-account-switch';
  let heldCreateId,retryRequestId,createPosts=0,abortOnce=true;
  const retryContent='响应丢失后保留且只写一次的合成留言';
  await a.route('**/api/community',async route=>{
   const request=route.request();
   if(request.method()==='POST'){
    const data=JSON.parse(request.postData());
    if(data.op==='message.create'&&data.content===retryContent){
     createPosts++;
     if(abortOnce){abortOnce=false;retryRequestId=data.requestId;const actual=await route.fetch();assert.equal(actual.status(),200);heldCreateId=(await actual.json()).item.id;return route.abort('failed');}
     assert.equal(data.requestId,retryRequestId,'Retry must retain the original request ID');
    }
   }
   return route.continue();
  });
  await a.locator('#kind').selectOption('message');await a.locator('#body').fill(retryContent);
  await a.locator('#compose button[type=submit]').click();
  await a.getByText('网络中断，结果待确认；请重试原请求。',{exact:true}).waitFor();
  assert.equal(await a.locator('#body').inputValue(),retryContent);
  const switchAccount=async kind=>{const account=db.accounts[kind];const changed=await a.context().request.post(db.settings.origin+'/api/member',{headers:{Origin:db.settings.origin,'Content-Type':'application/json'},data:{op:'login',account:account.account,password:account.password}});assert.equal(changed.status(),200);};
  await switchAccount('same');await a.locator('#retry').click();
  await a.locator('#notice').filter({hasText:'ACCOUNT_CHANGED_REQUEST_NOT_REPLAYED'}).waitFor();
  assert.equal(createPosts,1,'A request must not be replayed under another member');assert.equal(await a.locator('#retry').isVisible(),true);
  assert.equal(await a.locator('#body').inputValue(),'','A pending draft must not remain visible to B');
  assert.equal(await a.locator('[data-id="'+heldCreateId+'"]').count(),0,'Changing the member must clear the previous private feed');
  await switchAccount('normal');await a.locator('#retry').click();
  await a.locator('[data-id="'+heldCreateId+'"]').waitFor();
  const mine=await a.context().request.get(db.settings.origin+'/api/community?kind=message&scope=mine');assert.equal(mine.status(),200);
  assert.equal((await mine.json()).items.filter(x=>x.content===retryContent).length,1);assert.equal(createPosts,2);
  record.uncertainRetry={sameRequestId:true,oneStoredItem:true,crossAccountReplayDenied:true,draftPreserved:true};
  record.stage='signed-out-private-content-cleared';
  await a.locator('[data-id="'+heldCreateId+'"] .item-actions button').filter({hasText:'修订'}).click();
  assert.equal(await a.locator('#body').inputValue(),retryContent);
  const session=await (await a.context().request.get(db.settings.origin+'/api/member?op=me')).json();
  const exited=await a.context().request.post(db.settings.origin+'/api/member',{headers:{Origin:db.settings.origin,'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},data:{op:'logout'}});assert.equal(exited.status(),200);
  await a.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await a.locator('#session').filter({hasText:'游客'}).waitFor();await a.waitForLoadState('networkidle');
  assert.equal(await a.locator('#items article').count(),0,'A signed-out private feed must not retain the previous member\'s items');
  assert.equal(await a.locator('#body').inputValue(),'','Private content loaded into the editor must clear when its member signs out');
  await switchAccount('same');await a.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await a.locator('#session').filter({hasText:'服务器核验'}).waitFor();await a.waitForLoadState('networkidle');
  assert.equal(await a.locator('[data-id="'+heldCreateId+'"]').count(),0);assert.equal(await a.locator('#body').inputValue(),'');
  record.signedOutPrivateContentCleared=true;
  record.stage='review-cross-account-form-snapshot';
  await switchAccount('normal');await a.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await a.locator('[data-id="'+heldCreateId+'"]').waitFor();
  await a.locator('[data-id="'+heldCreateId+'"] .item-actions button').filter({hasText:'修订'}).click();
  response=a.waitForResponse(x=>x.url().endsWith('/api/community')&&x.request().method()==='POST');
  await a.locator('#compose button[type=submit]').click();assert.equal((await response).status(),200);await a.waitForLoadState('networkidle');
  assert.equal(await a.locator('#body').inputValue(),retryContent,'Saved editor source remains an A-bound snapshot');
  let businessPosts=0;const countPosts=req=>{if(req.url().endsWith('/api/community')&&req.method()==='POST')businessPosts++;};a.on('request',countPosts);
  await switchAccount('same');await a.locator('#compose').evaluate(form=>form.requestSubmit());
  await a.locator('#notice').filter({hasText:'ACCOUNT_CHANGED_REQUEST_NOT_REPLAYED'}).waitFor();await a.waitForLoadState('networkidle');
  assert.equal(businessPosts,0,'Discovering B must reject an A-bound body before any business POST');assert.equal(await a.locator('#body').inputValue(),'');
  const bMine=await a.context().request.get(db.settings.origin+'/api/community?kind=message&scope=mine');assert.equal(bMine.status(),200);assert(!(await bMine.json()).items.some(x=>x.content===retryContent));
  a.off('request',countPosts);record.crossAccountFormSnapshotRejected=true;
  record.stage='review-broadcast-password-change-delayed-read';
  await switchAccount('normal');await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await a.locator('[data-id="'+heldCreateId+'"]').waitFor();
  await a.locator('[data-id="'+heldCreateId+'"] .item-actions button').filter({hasText:'修订'}).click();
  const identityPage=await a.context().newPage();identityPage.on('pageerror',e=>record.pageErrors.push(e.name));await identityPage.goto(db.settings.origin,{waitUntil:'networkidle'});await identityPage.locator('#member').waitFor({state:'visible'});
  let startRead,releaseRead,holdNext=true;const reading=new Promise(r=>{startRead=r;}),heldRead=new Promise(r=>{releaseRead=r;});
  const holdPrivate=async route=>{
   const u=new URL(route.request().url());if(holdNext&&u.searchParams.get('scope')==='mine'){
    holdNext=false;const old=await route.fetch();assert.equal(old.status(),200);startRead();await heldRead;return route.fulfill({response:old});
   }
   return route.continue();
  };
  await a.route('**/api/community?**',holdPrivate);await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await reading;
  try{
   const nextPassword=crypto.randomBytes(20).toString('hex')+'A9!';
   await identityPage.locator('#current').fill(db.accounts.normal.password);await identityPage.locator('#next').fill(nextPassword);
   response=identityPage.waitForResponse(x=>x.url().endsWith('/api/member')&&x.request().method()==='POST');await identityPage.locator('#change button').click();assert.equal((await response).status(),200);db.accounts.normal.password=nextPassword;
   await a.locator('#session').filter({hasText:'游客'}).waitFor();assert.equal(await a.locator('#body').inputValue(),'');
  }finally{releaseRead();}
  await a.waitForLoadState('networkidle');assert.equal(await a.locator('#items article').count(),0,'The old A private response must not render after the password-change broadcast');
  await a.unroute('**/api/community?**',holdPrivate);
  record.stage='review-broadcast-login-logout-unsent-draft';
  await identityPage.locator('#account').selectOption(db.accounts.same.account);await identityPage.locator('#password').fill(db.accounts.same.password);
  await identityPage.locator('#login button').click();await a.locator('#session').filter({hasText:'服务器核验'}).waitFor();await a.waitForLoadState('networkidle');
  assert.equal(await a.locator('[data-id="'+heldCreateId+'"]').count(),0);assert.equal(await a.locator('#body').inputValue(),'');
  await a.locator('#body').fill('B尚未提交的本机合成草稿');
  response=identityPage.waitForResponse(x=>x.url().endsWith('/api/member')&&x.request().method()==='POST');await identityPage.locator('#logout').click();assert.equal((await response).status(),200);
  await a.locator('#session').filter({hasText:'游客'}).waitFor();assert.equal(await a.locator('#body').inputValue(),'');assert.equal(await a.locator('#items article').count(),0);
  record.identityBroadcasts={passwordChange:true,delayedPrivateReadDiscarded:true,memberSwitch:true,logout:true,unsentDraftCleared:true};
  record.csp.push(...await identityPage.evaluate(()=>window.csp));await identityPage.close();
  // Historical-shaped malicious source is never claimed or rendered as HTML.
  record.stage='stored-xss-and-viewports';
  let historicalId;const admin=await db.admin();try{historicalId=(await admin.query("INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status,legacy) VALUES('message',NULL,'合成历史',$1,'published',true) RETURNING id",[{content:'<img src=x onerror="window.executedXss=true"><script>window.executedXss=true</script>',category:'闲聊',color:'#2360f5'}])).rows[0].id;}finally{await admin.end();}
  await guest.locator('#kind').selectOption('message');await guest.locator('#reload').click();await guest.waitForLoadState('networkidle');
  await guest.locator('[data-id="'+historicalId+'"]').waitFor();
  record.xss={executed:await guest.evaluate(()=>window.executedXss),injectedNodes:await guest.locator('#items script,#items img[src="x"]').count(),literalTextVisible:(await guest.locator('[data-id="'+historicalId+'"] .body').innerText()).includes('<script>')};
  assert.equal(record.xss.executed,false);assert.equal(record.xss.injectedNodes,0);assert.equal(record.xss.literalTextVisible,true);
  for(const width of [1440,1024,768,390,320]){
   await guest.setViewportSize({width,height:1000});assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   record.viewports.push({width,passed:true});await guest.screenshot({path:path.join(directory,'community-'+width+'.png')});
  }
  await guest.keyboard.press('Tab');const focus=await guest.locator(':focus').evaluate(n=>getComputedStyle(n).outlineWidth);assert.equal(focus,'3px');
  for(const c of contexts){for(const p of c.pages())record.csp.push(...await p.evaluate(()=>window.csp));await c.close();}
  assert.deepEqual(record.pageErrors,[]);assert.deepEqual(record.csp,[]);assert.equal(record.externalRequests,0);record.passed=true;
 }catch(error){record.errorType=error.name;record.testLocation=String(error.stack).match(/community-local-browser\.cjs:\d+:\d+/g)||[];if(lastPage){record.notice=await lastPage.locator('#notice').innerText().catch(()=>null);await lastPage.screenshot({path:path.join(directory,'failure-390.png')}).catch(()=>{});}throw error;}
 finally{await browser?.close();await server?.close();await db?.stop();record.completedAtUtc=new Date().toISOString();fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({passed:record.passed,directory,viewports:record.viewports}));}
}
main().catch(()=>{process.exitCode=1;});
