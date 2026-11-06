const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://127.0.0.1:3050',results=[];
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 async function fresh(){const c=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'}),p=await c.newPage();await c.route('https://cdn.jsdelivr.net/**',r=>r.abort());await c.addInitScript(()=>{window.__cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.__cspErrors.push(e.effectiveDirective));});return{c,p};}
 {const {c,p}=await fresh();await p.goto(base,{waitUntil:'networkidle'});await p.getByRole('button',{name:'查看公告',exact:true}).click();await p.getByRole('button',{name:'编辑本机草稿',exact:true}).click();const e=p.getByRole('textbox',{name:'公告草稿内容'});await e.focus();await e.evaluate(el=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain','<b>仅作普通文字</b>');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData}));});assert((await e.innerText()).includes('<b>仅作普通文字</b>'));assert.equal(await e.locator('b').count(),0);await e.fill('A'.repeat(600000));await e.evaluate(el=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain','B'.repeat(500000));el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData}));});assert.equal((await e.innerText()).length,600000);await p.getByText('内容过大，原草稿已保留。',{exact:true}).waitFor();await e.fill('');const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);return c.toDataURL('image/png').split(',')[1]});await p.locator('input[type=file]').setInputFiles({name:'synthetic-eight-pixels.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await e.locator('img[src^="data:image/png"]').waitFor();await p.getByTitle('插入图片 URL',{exact:true}).click();await p.getByPlaceholder('粘贴图片 URL（https://...）').fill('/14.png');await p.getByRole('button',{name:'插入',exact:true}).click();await e.locator('img[src="/14.png"]').waitFor();const rejected=await e.evaluate(el=>{const dataTransfer=new DataTransfer();dataTransfer.setData('text/html','<img src=x onerror="window.__dropMarker=1">');return !el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));});assert(rejected);assert.equal(await e.locator('[onerror]').count(),0);assert.equal(await p.evaluate(()=>window.__dropMarker||0),0);assert.deepEqual(await p.evaluate(()=>window.__cspErrors),[]);results.push({name:'plain clipboard, actual raster file, safe URL insertion and blocked HTML drop',passed:true});await c.close();}
 {const {c,p}=await fresh();let scriptLoads=0,mailPosts=0,otherMailRequests=0;const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'emailjs-public-metadata.json')));await c.route(meta.url,r=>{scriptLoads++;return r.fulfill({body:fs.readFileSync('E:/Recovery/.jinxi-research/b2-0-publication/emailjs-4.4.1.min.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}})});await c.route('https://api.emailjs.com/**',r=>{if(r.request().method()==='POST')mailPosts++;return r.fulfill({status:200,body:'OK',headers:{'access-control-allow-origin':base,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type'}})});await c.route('https://formsubmit.co/**',r=>{otherMailRequests++;return r.abort()});await p.goto(base,{waitUntil:'networkidle'});assert.equal(scriptLoads,0);await p.locator('#top').getByRole('button',{name:'加入今夕',exact:true}).click();await p.getByRole('textbox',{name:'游戏昵称',exact:true}).fill('合成入会测试_未发送');await p.getByRole('textbox',{name:'联系方式 (QQ/微信/邮箱)',exact:true}).fill('synthetic@example.invalid');await p.getByRole('button',{name:'提交申请',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(scriptLoads,1);assert.equal(mailPosts,1);assert.equal(otherMailRequests,0);assert.equal(await p.evaluate(()=>!!window.emailjs),true);assert.deepEqual(await p.evaluate(()=>window.__cspErrors),[]);results.push({name:'real pinned EmailJS bytes and SRI work under no-eval CSP; all email API traffic intercepted',passed:true,actualMessagesSent:0});await c.close();}
 {const {c,p}=await fresh();let writes=0;await c.route('**/.netlify/functions/**',r=>{if(r.request().method()!=='GET'){writes++;return r.abort()}return r.continue()});await p.goto(base,{waitUntil:'networkidle'});await p.getByRole('button',{name:'打开导航',exact:true}).click();await p.getByRole('navigation',{name:'主导航',exact:true}).getByRole('button',{name:'登录',exact:true}).click();await p.getByText('正式登录与改密正在安全升级，旧入口暂未开放。阅读与本机草稿仍可使用。',{exact:true}).waitFor();assert(await p.locator('dialog[open] form').getByRole('button',{name:'登录',exact:true}).isDisabled());await p.keyboard.press('Escape');await p.getByRole('button',{name:'查看任务',exact:true}).click();await p.getByText('任务进度仅保存在此浏览器。正式奖励领取暂停；本机历史记录不作为服务器积分余额。',{exact:true}).waitFor();assert(await p.locator('dialog[open]').getByText('本机历史积分',{exact:true}).isVisible());await p.screenshot({path:path.join(__dirname,'legacy-upgrade-390.png')});await p.keyboard.press('Escape');await p.getByRole('button',{name:'打开组队',exact:true}).click();await p.getByText('本机组队演示：申请和退出仅影响此浏览器，不会通知其他成员，也不代表正式加入战队。',{exact:true}).waitFor();assert.equal(writes,0);assert.deepEqual(await p.evaluate(()=>window.__cspErrors),[]);results.push({name:'legacy auth paused visibly, task points accurate, team clearly local-only; no writes',passed:true});await c.close();}
 {
  const {c,p}=await fresh();
  const blocked=[];
  await c.route('**/.netlify/functions/**',route=>{
   if(route.request().method()==='GET')return route.continue();
   blocked.push(new URL(route.request().url()).pathname);
   return route.abort();
  });
  await p.goto(base,{waitUntil:'networkidle'});
  for(const [button,notice] of [
   ['去签到','签到和历史记录查询正在安全升级。'],
   ['查看排行','积分余额、兑换和排行榜正在安全升级。'],
   ['赞助公会','赞助登记暂未开放。'],
  ]){
   await p.getByRole('button',{name:button,exact:true}).click();
   await p.getByRole('status').filter({hasText:notice}).waitFor();
   await p.keyboard.press('Escape');
  }
  await p.locator('button.community-door').click();
  await p.getByText('留言、回复和表情回应暂未开放。',{exact:false}).waitFor();
  await p.getByText('写一条留言',{exact:true}).click();
  const draft=p.getByRole('textbox',{name:/想说的话/});
  await draft.fill('合成留言草稿');
  assert(await p.getByRole('button',{name:'发布暂未开放',exact:true}).isDisabled());
  assert(await p.getByRole('button',{name:'回应 👍',exact:true}).first().isDisabled());
  assert.equal(await draft.inputValue(),'合成留言草稿');
  await p.goto(base+'/guides/?id=14',{waitUntil:'networkidle'});
  await p.locator('.guide-reader h1').waitFor();
  await p.getByRole('status').filter({hasText:'点赞、收藏和评论暂未开放。'}).waitFor();
  assert(await p.getByRole('button',{name:'收藏',exact:true}).isDisabled());
  await p.locator('#guide-comment').fill('合成评论草稿');
  assert(await p.getByRole('button',{name:'发布评论暂未开放',exact:true}).isDisabled());
  await p.goto(base+'/guides/',{waitUntil:'networkidle'});
  await p.getByRole('button',{name:/写一篇攻略/}).click();
  await p.locator('#guide-content').fill('合成攻略草稿');
  assert(await p.getByRole('button',{name:'投稿暂未开放',exact:true}).isDisabled());
  await p.getByRole('button',{name:'预览正文',exact:true}).click();
  assert(await p.locator('.guide-body-preview').getByText('合成攻略草稿',{exact:true}).isVisible());
  assert.deepEqual(blocked,[]);
  assert.deepEqual(await p.evaluate(()=>window.__cspErrors),[]);
  results.push({name:'legacy check-in, points, sponsorship and community writes show pause; readable and editable drafts, zero POST',passed:true});
  await c.close();
 }
 fs.writeFileSync(path.join(__dirname,'compatibility-browser-results.json'),JSON.stringify({passed:true,results,scope:'Only local static build/synthetic browser data. Email library is public exact bytes, API POST fulfilled locally before network; no real messages, production writes or new member auth.'},null,2));console.log(JSON.stringify({passed:results.length}));
}catch(e){fs.writeFileSync(path.join(__dirname,'compatibility-browser-failure.json'),JSON.stringify({results,error:e.message,stack:e.stack},null,2));console.error(e.stack);process.exitCode=1}finally{await browser.close()}})();
