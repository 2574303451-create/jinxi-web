// Fresh, unauthenticated Edge contexts. Only the approved synthetic TEST origin.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright');
const origin = 'https://jinxi-web-test.netlify.app';
async function main() {
  if (process.argv.length !== 2) throw Error('NO_TARGET_OR_CREDENTIAL_ARGUMENTS_ACCEPTED');
  const directory = path.join(__dirname,'cloud-browser',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(directory,{recursive:true});
  const result = {origin,classification:'synthetic-test',startedAtUtc:new Date().toISOString(),passed:false,viewports:[]};
  const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  result.edge = browser.version();
  try {
    for (const width of [1440,390,320]) {
      const row = {width,passed:false,pageErrors:[],blockedWrites:0,videoRequestsBeforeInteraction:[],cspViolations:[]};
      result.viewports.push(row);
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(() => {
        localStorage.setItem('jinxi-auth-account','synthetic-f03-stale');
        window.cloudAuditCsp=[];
        document.addEventListener('securitypolicyviolation',event=>window.cloudAuditCsp.push(event.effectiveDirective));
      });
      await context.route('**/*',route=>{
        const request=route.request();
        if(new URL(request.url()).origin!==origin)return route.abort();
        if(!['GET','HEAD'].includes(request.method())){row.blockedWrites++;return route.abort();}
        return route.continue();
      });
      const page=await context.newPage();
      page.on('pageerror',error=>row.pageErrors.push({name:error.name,stage:row.stage,
        message:/^Minified React error #\d+;/.test(error.message)?error.message.slice(0,600):'BROWSER_ERROR_DETAILS_WITHHELD'}));
      page.on('request',request=>{
        const url=new URL(request.url());
        if(/\.(mp4|webm)(?:$|\?)/i.test(url.pathname))row.videoRequestsBeforeInteraction.push(url.pathname);
      });
      try {
        row.stage='home navigation';
        const response=await page.goto(origin+'/',{waitUntil:'networkidle'});
        row.stage='home state and layout';
        assert.equal(response.status(),200);
        assert.equal((await page.getByLabel('在线人数尚未接入').innerText()).trim(),'—');
        assert.equal((await page.locator('#guild-facts a[href="#members"]').innerText()).replace(/\s/g,'').includes('208份'),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(row.videoRequestsBeforeInteraction,[]);
        assert.equal(await page.getByText('synthetic-f03-stale',{exact:true}).count(),0);
        await page.screenshot({path:path.join(directory,'home-'+width+'.png')});
        row.stage='disabled login dialog';
        if(width<768)await page.getByRole('button',{name:'打开导航',exact:true}).click();
        const navigation=page.getByRole('navigation',{name:'主导航',exact:true});
        await navigation.getByRole('button',{name:'登录',exact:true}).click();
        assert.equal(await page.locator('dialog[open] form').getByRole('button',{name:'登录',exact:true}).isDisabled(),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('dialog[open]').count(),0);
        row.cspViolations.push(...await page.evaluate(()=>window.cloudAuditCsp));
        row.stage='guides navigation';
        await page.goto(origin+'/guides/',{waitUntil:'networkidle'});
        row.stage='guides state and layout';
        await page.getByRole('heading',{level:2,name:'【TEST】最新合成文字攻略'}).waitFor();
        assert.equal(await page.getByRole('heading',{level:2,name:'【TEST】不可公开的合成草稿'}).count(),0);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await page.screenshot({path:path.join(directory,'guides-'+width+'.png')});
        row.cspViolations.push(...await page.evaluate(()=>window.cloudAuditCsp));
        assert.deepEqual(row.pageErrors,[]);assert.deepEqual(row.cspViolations,[]);
        assert.equal(row.blockedWrites,0);
        assert.deepEqual(row.videoRequestsBeforeInteraction,[]);
        row.online='—';row.archiveCount=208;row.legacyLoginDisabled=true;row.passed=true;
      } catch (error) {
        row.error='BROWSER_ASSERTION_OR_NETWORK_FAILURE';
        row.failureType=error.name;
        if(error.code==='ERR_ASSERTION')row.assertionOperator=error.operator;
        await page.screenshot({path:path.join(directory,'failure-'+width+'.png')}).catch(()=>{});
        throw Error('TEST_BROWSER_FAILED');
      } finally {await context.close();}
    }
    result.passed=true;
  } finally {
    await browser.close();result.completedAtUtc=new Date().toISOString();
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({passed:result.passed,viewports:result.viewports.map(row=>({width:row.width,passed:row.passed})),evidence:directory}));
  }
}
if(require.main===module)main().catch(()=>{process.exitCode=1;});
