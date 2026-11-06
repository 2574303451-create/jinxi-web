const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const {a6}=require('./variants.cjs');
const out=path.join(__dirname,'browser');fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 try{
  for(const width of[1440,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   let writes=0;const errors=[];
   await context.addInitScript(()=>{
    localStorage.setItem('jinxi-auth-account','synthetic-a6-stale');
    localStorage.setItem('jinxi-auth-nickname','合成旧缓存');
   });
   await context.route('**/*',r=>{
    if(new URL(r.request().url()).origin!==a6.origin)return r.abort();
    if(!['GET','HEAD'].includes(r.request().method())){writes++;return r.abort();}
    return r.continue();
   });
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.name+': '+e.message));
   await p.goto(a6.origin,{waitUntil:'networkidle'});
   assert.equal(await p.getByText('欢迎回来，选一件今天想做的事。',{exact:true}).count(),0);
   const cases=[
    ['去签到','每日签到'],['查看任务','每日任务'],['查看排行','积分与排行'],
    ['打开组队','寻找队伍'],['打开面板','游戏数据'],
    ['查看全部','公会成员'],['打开轮播展示','成员精彩展示'],
    ['查看公告','公会动态'],['赞助公会','公会赞助'],
   ];
   for(let i=0;i<cases.length;i++){
    const [label,title]=cases[i],button=p.getByRole('button',{name:label,exact:true}).first();
    await button.click();
    const dialog=p.getByRole('dialog',{name:title,exact:true});
    await dialog.waitFor({state:'visible'});
    assert.equal(await p.evaluate(()=>document.body.style.overflow),'hidden');
    assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),title+' overflow');
    await dialog.getByRole('button',{name:'关闭弹窗',exact:true}).focus();
    await p.keyboard.press('Shift+Tab');
    assert(await dialog.evaluate(el=>el.contains(document.activeElement)),title+' backward focus');
    await p.keyboard.press('Tab');
    assert(await dialog.evaluate(el=>el.contains(document.activeElement)),title+' forward focus');
    if(title==='成员精彩展示'){
     const next=dialog.getByRole('button',{name:'下一张',exact:true});
     await next.click();
     await dialog.getByLabel(/^第 2 张/).waitFor({state:'visible'});
     await dialog.getByRole('button',{name:'查看成员详情',exact:true}).click();
     assert.equal(await p.locator('dialog[open]').count(),2);
     await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),1);
    }
    if(i%3===0)await p.keyboard.press('Escape');
    else if(i%3===1)await dialog.getByRole('button',{name:'关闭弹窗',exact:true}).click();
    else await p.mouse.click(2,2);
    await dialog.waitFor({state:'hidden'});
    assert.equal(await p.locator('dialog[open]').count(),0);
    assert.notEqual(await p.evaluate(()=>document.body.style.overflow),'hidden');
    assert.equal(await button.evaluate(el=>document.activeElement===el),true,title+' return focus');
   }
   await p.locator('button.community-door').click();
   await p.getByRole('dialog',{name:'留下你的声音',exact:true}).waitFor({state:'visible'});
   if(width<=800)await p.locator('dialog[open] details > summary').filter({hasText:'写一条留言'}).click();
   const nickname=p.getByRole('textbox',{name:/你的昵称/});
   await nickname.waitFor({state:'visible'});
   assert.equal(await nickname.getAttribute('readonly'),null);
   assert.equal(await p.getByText('使用当前账号的展示昵称',{exact:true}).count(),0);
   await p.keyboard.press('Escape');
   await p.evaluate(()=>scrollTo(0,0));
   if(width<=768)await p.getByRole('button',{name:'打开导航',exact:true}).click();
   const nav=p.getByRole('navigation',{name:'主导航',exact:true});
   await nav.getByRole('button',{name:'登录',exact:true}).click();
   const login=p.getByRole('dialog',{name:'账号登录',exact:true});
   assert(await login.locator('form').getByRole('button',{name:'登录',exact:true}).isDisabled());
   await login.getByRole('button',{name:'需要修改密码？',exact:true}).click();
   const password=p.getByRole('dialog',{name:'修改密码',exact:true});
   await password.waitFor({state:'visible'});
   assert(await password.locator('form').getByRole('button',{name:'确认修改',exact:true}).isDisabled());
   await p.keyboard.press('Escape');
   await p.locator('#top').getByRole('button',{name:'加入今夕',exact:true}).click();
   await p.getByRole('dialog',{name:'加入今夕公会',exact:true}).waitFor({state:'visible'});
   await p.keyboard.press('Escape');
   const member=p.locator('#members-page button').first();await member.click();
   await p.locator('dialog[open]').waitFor({state:'visible'});await p.keyboard.press('Escape');
   assert(await member.evaluate(el=>document.activeElement===el));
   await p.getByRole('button',{name:'展开同行时光',exact:true}).click();
   await p.locator('#guild-member-lookup').fill('2020-01-01');
   await p.getByRole('button',{name:'查询',exact:true}).click();
   await p.getByRole('status').filter({hasText:'未绑定成员档案'}).waitFor();
   await p.getByRole('button',{name:'收起同行时光',exact:true}).click();
   assert.equal(await p.locator('#guild-member-lookup').count(),0);
   assert.equal(writes,0);assert.deepEqual(errors,[]);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(width===390||width===1440){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'home-'+width+'.png')});}
   results.push({width,dialogCases:cases.length+5,keyboard:true,backdrop:true,bodyLock:true,
    stableAvatarAndArchiveEntry:true,legacyCacheDoesNotAuthenticate:true,writes,errors});
   await context.close();console.log('PASS all reachable dialogs and legacy identity '+width);
  }
  fs.writeFileSync(path.join(out,'interaction-results.json'),JSON.stringify({edge:browser.version(),results},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(e=>{fs.writeFileSync(path.join(out,'interaction-failure.json'),JSON.stringify({error:e.message,stack:e.stack},null,2));console.error(e.stack);process.exitCode=1;});
