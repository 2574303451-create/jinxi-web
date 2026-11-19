const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { X509Certificate } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { toolsFromArgs, startRehearsal, loopbackTls, evidence } = require('./synthetic-cloud-support.cjs');
const { httpClient } = require('./integration-local-support.cjs');
const { cleanEnv } = require('../scripts/run-clean.cjs');

async function withCertificate(cert, use) {
  // Trust the generated, name-constrained CA only during the Edge run. Its
  // signing key is already destroyed. Normal name and chain checks stay on.
  const thumbprint = new X509Certificate(cert).fingerprint.replaceAll(':','');
  const file = path.join(evidence, 'browser-ca.public.cer');
  fs.writeFileSync(file,new X509Certificate(cert).raw);
  const ps = (command,args) => spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command,...args],
    { env:cleanEnv(),windowsHide:true,encoding:'utf8',timeout:20000 });
  const certutil = (args) => spawnSync('certutil.exe',['-user',...args],
    { env:cleanEnv(),windowsHide:true,encoding:'utf8',timeout:20000 });
  const store = 'Cert:\\CurrentUser\\Root\\'+thumbprint;
  const verify = () => ps("if (Test-Path -LiteralPath '"+store+"') { exit 0 } else { exit 1 }",[]).status === 0;
  assert.equal(verify(),false,'test certificate unexpectedly already trusted');
  let added = false;
  try {
    const result = certutil(['-addstore','Root',file]);
    added = verify();
    assert.equal(result.status,0,'could not provision disposable browser trust');
    assert.equal(added,true);
    return await use();
  } finally {
    if (added) assert.equal(certutil(['-delstore','Root',thumbprint]).status,0,'test certificate cleanup failed');
    assert.equal(verify(),false,'test certificate remains in the user store');
  }
}

async function withFirefox(firefox, origin, cert, use) {
  const untrusted = await firefox.launch({ env:cleanEnv() });
  try {
    const page = await untrusted.newPage();
    await assert.rejects(page.goto(origin,{timeout:10000}), /SEC_ERROR_UNKNOWN_ISSUER/);
  } finally {
    await untrusted.close();
  }

  // Firefox reads this policy only in the test process. Its temporary profile
  // trusts the single rehearsal CA while retaining chain and hostname checks.
  const temp = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temp,'jinxi-firefox-policy-'));
  const certificate = path.join(directory,'rehearsal-ca.pem');
  const policy = path.join(directory,'policies.json');
  try {
    fs.writeFileSync(certificate,cert,{flag:'wx'});
    fs.writeFileSync(policy,JSON.stringify({policies:{Certificates:{Install:[certificate]}}}),{flag:'wx'});
    const browser = await firefox.launch({ env:cleanEnv({PLAYWRIGHT_FIREFOX_POLICIES_JSON:policy}) });
    await use(browser);
  } finally {
    assert.equal(path.dirname(fs.realpathSync(directory)),temp);
    fs.rmSync(directory,{recursive:true,force:true,maxRetries:2});
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useFirefox = args.length === 7 && args[6] === '--firefox';
  assert(args[4] === '--playwright-module' && path.isAbsolute(args[5]) &&
    (useFirefox || args.length === 8 && args[6] === '--edge' && path.isAbsolute(args[7])));
  const { chromium, firefox } = require(args[5]);
  const app = await startRehearsal(toolsFromArgs(args.slice(0,4)));
  const { db, server, bundle } = app, api = httpClient(app,{Authorization:bundle.authorization});
  const record = { commit:app.bundle.packageRecord.commit, browser:useFirefox?'Firefox':'Edge',
    passed:false, scenarios:[], widths:[], pageErrors:[], cspErrors:[], stage:'browser-certificate-setup' };
  const origin = server.origin;
  const runWithBrowser = useFirefox
    ? use => withFirefox(firefox,origin,db.cert,use)
    : use => withCertificate(db.cert,async () => use(await chromium.launch({
      executablePath:args[7], args:['--no-proxy-server'],
    })));
  try {
    await loopbackTls({cert:db.cert}, () => runWithBrowser(async browser => {
      try {
        if (useFirefox) record.scenarios.push('browser-rejects-the-local-server-without-the-rehearsal-root');
        const options={viewport:{width:1440,height:1000},reducedMotion:'reduce',
          httpCredentials:{username:bundle.accessUser,password:bundle.accessPassword,origin}};
        const context = await browser.newContext(options);
        const reviewerContext = await browser.newContext(options);
        const adminContext = await browser.newContext(options);
        for (const c of [context,reviewerContext,adminContext]) {
          await c.route('**/*',route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        }
        async function pageFor(c) {
          const p = await c.newPage();
          p.setDefaultTimeout(15000);
          p.on('pageerror',error=>record.pageErrors.push(error.name));
          p.on('response',response=>{
            if(response.status()===429) (record.rateLimits ??= []).push({stage:record.stage,path:new URL(response.url()).pathname});
          });
          p.on('console',message=>{
            if (/Content Security Policy|Refused to execute/i.test(message.text())) {
              record.cspErrors.push(message.text().slice(0,250));
            }
          });
          return p;
        }
        const a=await pageFor(context), reviewer=await pageFor(reviewerContext), staff=await pageFor(adminContext);
        async function navigate(p, route = '/') {
          const r = await p.goto(origin+route,{waitUntil:'domcontentloaded'});
          assert.equal(r.status(),200);
          assert.equal((await r.securityDetails()).protocol,'TLS 1.3');
        }
        async function close(p) {
          while (await p.locator('dialog[open]').count()) {
            await p.locator('dialog[open]').last().getByRole('button',{name:'关闭弹窗',exact:true}).click();
          }
        }
        const ready = p => p.locator('[data-testid="unified-session"]').filter({hasText:'ready'}).waitFor();
        async function login(p, kind) {
          await close(p);
          await p.getByRole('button',{name:'合成登录',exact:true}).click();
          await p.getByLabel('合成账号',{exact:true}).fill(db.accounts[kind].account);
          await p.getByLabel('合成密码',{exact:true}).fill(db.accounts[kind].password);
          await p.getByRole('button',{name:'登录合成账号',exact:true}).click();
          await ready(p);
          await p.getByRole('dialog',{name:'合成成员登录',exact:true}).waitFor({state:'hidden'});
        }
        async function session(p) {
          const cookies = await p.context().cookies(origin);
          const secure = cookies.find(cookie=>cookie.name==='__Host-jinxi_member_local');
          assert(secure?.secure && secure.httpOnly && secure.sameSite==='Lax');
          const cookie = cookies.map(c=>c.name+'='+c.value).join('; ');
          const me = await api.request('/api/member',{headers:{Cookie:cookie}});
          assert.equal(me.status,200);
          return {cookie,csrf:me.body.csrfToken,memberId:me.body.member.id};
        }
        const command = (p,module,op) => p.waitForResponse(response=>{
          const request = response.request();
          return new URL(response.url()).pathname === '/api/'+module &&
            request.method()==='POST' && request.postDataJSON().op===op;
        });
        // Independent browser visits use the same loopback IP in this fixture.
        const resetVisitQuota = () => api.admin('TRUNCATE b2_lab.member_session_limits_v2');
        async function points(p) {
          await close(p);
          await p.getByRole('button',{name:'账户与兑换',exact:true}).click();
          await p.getByTestId('balance').waitFor();
        }

        record.stage='static-login';
        await navigate(a);
        await a.getByRole('heading',{name:'独立合成 TEST',exact:true}).waitFor();
        await login(a,'normal');
        const member = await session(a);
        assert.equal(member.memberId,db.accounts.normal.memberId);
        record.scenarios.push('static-page-uses-one-secure-member-session');

        record.stage='attendance-and-award';
        await a.getByRole('button',{name:'签到事实',exact:true}).click();
        let result = command(a,'attendance','checkin');
        await a.getByRole('button',{name:'立即签到',exact:true}).click();
        assert.equal((await result).status(),200);
        await points(a);
        const eventId = await a.locator('[data-event-id]').first().getAttribute('data-event-id');
        result = command(a,'points','settle');
        await a.getByRole('button',{name:'结算此签到事件',exact:true}).click();
        assert.equal((await result).status(),200);
        await a.getByTestId('balance').filter({hasText:/^1$/}).waitFor();
        assert.equal((await api.admin('SELECT count(*)::int AS n FROM points_lab.settlements WHERE event_id=$1',[eventId])).rows[0].n,1);
        record.scenarios.push('one-attendance-event-settled-into-one-point');

        record.stage='redeem-disconnect-and-refresh';
        const product = a.locator('[data-catalogue-id]').filter({hasText:'集成用虚构纸签'});
        const itemId = await product.getAttribute('data-catalogue-id');
        let lostRequest, committedOrder;
        await a.route('**/api/points',async route=>{
          const req = route.request();
          if (req.method() !== 'POST' || req.postDataJSON().op !== 'redeem' || lostRequest) return route.continue();
          lostRequest = req.postDataJSON().requestId;
          const headers = await req.allHeaders();
          const r = await api.request('/api/points',{body:req.postDataJSON(),headers:{
            Cookie:headers.cookie,'X-CSRF-Token':headers['x-csrf-token'],
          }});
          committedOrder = r.status===200 ? r.body.orderId : null;
          await route.abort('failed');
        });
        await product.getByRole('button',{name:'兑换虚构商品',exact:true}).click();
        await a.getByRole('status').filter({hasText:'响应丢失'}).waitFor();
        assert(lostRequest && committedOrder,'response fault must follow a real commit');
        await a.unroute('**/api/points');
        await a.reload({waitUntil:'domcontentloaded'});
        await ready(a);
        await a.getByRole('button',{name:'恢复未确认操作',exact:true}).click();
        await a.locator('[data-request-id="'+lostRequest+'"]').filter({hasText:'服务端确认已提交'}).waitFor();
        await points(a);
        result = command(a,'points','redeem');
        await a.locator('[data-catalogue-id="'+itemId+'"]').getByRole('button',{name:'兑换虚构商品',exact:true}).click();
        const replay = await result;
        assert.equal(replay.status(),200);
        assert.equal(replay.request().postDataJSON().requestId,lostRequest);
        assert.equal((await replay.json()).orderId,committedOrder);
        assert.equal((await api.admin('SELECT count(*)::int AS n FROM points_lab.orders WHERE member_id=$1',[member.memberId])).rows[0].n,1);
        record.scenarios.push('lost-committed-debit-recovered-after-full-refresh-with-the-original-request');

        record.stage='refund-and-account-switch';
        result = command(a,'points','order.cancel');
        await a.locator('[data-order-id="'+committedOrder+'"]').getByRole('button',{name:'取消并按原流水退款',exact:true}).click();
        assert.equal((await result).status(),200);
        await a.getByTestId('balance').filter({hasText:/^1$/}).waitFor();
        const {rows:ledger} = await api.admin('SELECT kind,id,origin_id FROM points_lab.ledger WHERE order_id=$1 ORDER BY entry_no',[committedOrder]);
        assert.deepEqual(ledger.map(row=>row.kind),['redeem','refund']);
        assert.equal(ledger[1].origin_id,ledger[0].id);

        record.stage='manual-redemption-admin-queue';
        await navigate(staff);
        await login(staff,'admin');
        await navigate(reviewer);
        await login(reviewer,'reviewer');
        let previousRequest = lostRequest;
        for (const outcome of ['failed','fulfilled']) {
          record.stage='manual-redemption-admin-queue-'+outcome;
          await resetVisitQuota();
          await close(a);
          await a.getByRole('button',{name:'恢复未确认操作',exact:true}).click();
          const receipt = a.locator('[data-request-id="'+previousRequest+'"]').filter({hasText:'服务端确认已提交'});
          await receipt.getByRole('button',{name:'确认已完成，允许新操作',exact:true}).click();
          await receipt.waitFor({state:'hidden'});
          await points(a);
          result = command(a,'points','redeem');
          await a.locator('[data-catalogue-id="'+itemId+'"]').getByRole('button',{name:'兑换虚构商品',exact:true}).click();
          const placed = await result;
          assert.equal(placed.status(),200);
          previousRequest = placed.request().postDataJSON().requestId;
          const { orderId: id } = await placed.json();
          const ownOrder = a.locator('[data-order-id="'+id+'"]');
          await ownOrder.getByText(/凭订单号联系公会管理员/).waitFor();
          await a.getByTestId('balance').filter({hasText:/^0$/}).waitFor();
          assert.equal(await a.getByRole('heading',{name:'待处理兑换',exact:true}).count(),0);

          await points(reviewer);
          assert.equal(await reviewer.getByRole('heading',{name:'待处理兑换',exact:true}).count(),0);
          assert.equal((await api.request('/api/points?view=admin',{session:await session(reviewer)})).status,403);
          await points(staff);
          const input = staff.getByRole('searchbox',{name:'完整订单号',exact:true});
          if(outcome === 'failed') {
            await input.fill(id.slice(0,8));
            await input.press('Enter');
            await staff.getByText('请输入成员提供的完整订单号。',{exact:true}).waitFor();
          }
          const row = staff.locator('[data-admin-order-id="'+id+'"]');
          await row.getByText('集成用虚构纸签（仅合成） · 1 件 · '+id,{exact:true}).waitFor();
          assert(!(await row.innerText()).includes(member.memberId));
          if(outcome === 'failed') {
            for (const width of [320,768,1024,1440]) {
              await staff.setViewportSize({width,height:1000});
              assert(await row.evaluate(element=>element.scrollWidth<=element.clientWidth),'queue row overflows at '+width);
            }
          }
          assert.equal(await row.getByRole('button',{name:'确认已人工开通',exact:true}).count(),0);
          await input.fill(id.toUpperCase());
          await input.press('Enter');
          await staff.getByRole('button',{name:'返回待处理列表',exact:true}).waitFor();
          await row.getByRole('button',{name:'认领订单',exact:true}).waitFor();
          if(outcome === 'failed') {
            await input.fill(id.slice(0,8));
            await row.waitFor({state:'hidden'});
            await input.press('Enter');
            await staff.getByText('请输入成员提供的完整订单号。',{exact:true}).waitFor();
            assert.equal(await row.getByRole('button').count(),0);
            const {rows:[pending]}=await api.admin('SELECT status,claimed_by FROM points_lab.orders WHERE id=$1',[id]);
            assert.deepEqual(pending,{status:'pending',claimed_by:null});
            await input.fill(id);
            await input.press('Enter');
            await row.getByRole('button',{name:'认领订单',exact:true}).waitFor();
          }
          const claim = command(staff,'points','order.process');
          await row.getByRole('button',{name:'认领订单',exact:true}).click();
          assert.equal((await (await claim).json()).status,'processing');
          await row.getByText(/已由你认领/).waitFor();
          await a.getByRole('button',{name:'刷新积分记录',exact:true}).click();
          await ownOrder.getByText(/管理员正在核验和处理此订单/).waitFor();
          assert.equal(await ownOrder.getByRole('button',{name:'取消并按原流水退款',exact:true}).isDisabled(),true);
          const action = row.getByRole('button',{name:outcome === 'failed' ? '确认未开通，退回积分' : '确认已人工开通',exact:true});
          result = command(staff,'points','order.process');
          await action.focus();
          await action.press('Enter');
          const decision = await result;
          assert.equal(decision.status(),200);
          assert.equal((await decision.json()).status,outcome);
          await row.getByText(outcome === 'failed' ? /未履约 · 已退款/ : /已完成/).waitFor();
          assert.equal(await row.getByRole('button').count(),0);
          await staff.getByRole('button',{name:'返回待处理列表',exact:true}).click();
          await staff.getByText('暂无待处理订单。',{exact:true}).waitFor();
          await a.getByRole('button',{name:'刷新积分记录',exact:true}).click();
          await ownOrder.getByText(outcome === 'failed' ? /未履约 · 已退款/ : /已完成/).waitFor();
          await a.getByTestId('balance').filter({hasText:outcome === 'failed' ? /^1$/ : /^0$/}).waitFor();
          const {rows:[actual]} = await api.admin(`
            SELECT (SELECT status FROM points_lab.orders WHERE id=$1) AS status,
                   (SELECT count(*)::int FROM points_lab.ledger WHERE order_id=$1 AND kind='redeem') AS charges,
                   (SELECT count(*)::int FROM points_lab.ledger WHERE order_id=$1 AND kind='refund') AS refunds,
                   (SELECT available FROM points_lab.catalogue WHERE id=$2) AS available
          `,[id,itemId]);
          assert.deepEqual(actual,{status:outcome,charges:1,refunds:outcome === 'failed' ? 1 : 0,available:outcome === 'failed' ? 2 : 1});
        }
        record.scenarios.push('manual-admin-queue-keyboard-fulfilment-and-failure-refund-with-member-and-reviewer-isolation');
        record.scenarios.push('administrator-exact-order-lookup-keeps-closed-orders-visible-without-actions');

        record.stage='refund-and-account-switch';
        await close(a);
        await a.getByRole('button',{name:'退出统一会话',exact:true}).click();
        await a.getByTestId('unified-session').filter({hasText:'anonymous'}).waitFor();
        await login(a,'same');
        const other = await session(a);
        assert.notEqual(other.memberId,member.memberId);
        assert.equal((await api.request('/api/points?receipt='+lostRequest,{session:other})).body.receipt.state,'unresolved');
        assert.equal((await api.request('/api/points',{session:member})).status,401);
        await points(a);
        assert.equal(await a.locator('[data-order-id="'+committedOrder+'"]').count(),0);
        await a.getByTestId('balance').filter({hasText:/^0$/}).waitFor();
        await close(a);
        record.scenarios.push('one-linked-refund-and-no-private-order-after-member-switch');

        record.stage='guide-and-public-review';
        await resetVisitQuota();
        await navigate(a,'/guides/');
        await ready(a);
        await a.getByRole('button',{name:'写一篇攻略',exact:false}).click();
        await a.getByLabel('攻略标题',{exact:true}).fill('独立 TEST 浏览器合成攻略');
        await a.getByLabel('攻略正文',{exact:true}).fill('仅合成的攻略正文');
        result = command(a,'community','guide.create');
        await a.getByRole('button',{name:'保存本人草稿',exact:true}).click();
        const draft = await result;
        assert.equal(draft.status(),200);
        const guideId = (await draft.json()).item.id;
        await a.locator('[data-item-id="'+guideId+'"]').getByRole('button',{name:'提交攻略审核',exact:true}).click();
        await navigate(reviewer,'/guides/');
        await ready(reviewer);
        result = command(reviewer,'community','item.review');
        await reviewer.locator('[data-review-id="'+guideId+'"]').getByRole('button',{name:'审核通过',exact:true}).click();
        assert.equal((await result).status(),200);
        const {rows:[guide]} = await api.admin('SELECT owner_id,status FROM community_lab.items WHERE id=$1',[guideId]);
        assert.deepEqual(guide,{owner_id:other.memberId,status:'published'});
        await a.reload({waitUntil:'domcontentloaded'});
        await a.locator('.guide-card').filter({hasText:'独立 TEST 浏览器合成攻略'}).waitFor();
        record.scenarios.push('shared-guide-components-show-independently-approved-content');

        record.stage='announcement-publish';
        await resetVisitQuota();
        for (const page of [a,staff,reviewer]) {
          await navigate(page);
          await ready(page);
        }
        const announce = '独立 TEST 合成公会通知';
        const announcementButton = '公告发布与审核';
        const announcementCard = a.locator('.announcement-list').getByRole('button',{name:announce,exact:true});
        await staff.getByRole('button',{name:announcementButton,exact:true}).click();
        await staff.getByLabel('公告标题',{exact:true}).fill(announce);
        await staff.getByLabel('公告富文本源',{exact:true}).fill('<p><strong>合成公告正文</strong></p>');
        result = command(staff,'operations','announcement.create');
        await staff.getByRole('button',{name:'保存公告草稿',exact:true}).click();
        const created = await result;
        assert.equal(created.status(),200);
        const {item:{id:announcementId}} = await created.json();
        const managed = page => page.getByTestId('managed-announcements').locator(`[data-item-id="${announcementId}"]`);
        await managed(staff).getByRole('button',{name:'提交公告审核',exact:true}).click();
        await managed(staff).getByText(/submitted/).waitFor();
        assert.equal(await managed(staff).getByRole('button',{name:'独立审核并发布',exact:true}).count(),0);
        await navigate(a);
        await ready(a);
        await a.locator('.announcement-preview').getByText(/暂无公告/).waitFor();
        await reviewer.getByRole('button',{name:announcementButton,exact:true}).click();
        result = command(reviewer,'operations','announcement.publish');
        await managed(reviewer).getByRole('button',{name:'独立审核并发布',exact:true}).click();
        assert.equal((await result).status(),200);
        const {rows:[announcement]} = await api.admin(`
          SELECT d.status,d.owner_id,r.actor_id AS reviewer_id
          FROM operations_lab.documents d JOIN operations_lab.revisions r
            ON r.item_id=d.id AND r.version=d.version WHERE d.id=$1
        `,[announcementId]);
        assert.deepEqual(announcement,{status:'published',owner_id:db.accounts.admin.memberId,
          reviewer_id:db.accounts.reviewer.memberId});
        await navigate(a);
        await ready(a);
        await announcementCard.click();
        await a.getByTestId('public-announcements').locator('strong').filter({hasText:/^合成公告正文$/}).waitFor();
        assert.equal(await a.getByLabel('公告标题',{exact:true}).count(),0);
        record.scenarios.push('packed-home-announcement-visible-after-independent-review');

        record.stage='sponsorship-visibility';
        await resetVisitQuota();
        for (const page of [staff,reviewer]) {
          await close(page);
          await page.getByRole('button',{name:'合成感谢记录',exact:true}).click();
        }
        const sponsor = '独立 TEST 合成感谢对象';
        await staff.getByLabel('合成感谢对象',{exact:true}).fill(sponsor);
        result = command(staff,'operations','sponsor.create');
        await staff.getByRole('button',{name:'登记合成感谢',exact:true}).click();
        const registered = await result;
        assert.equal(registered.status(),200);
        const {item:{id:sponsorId}} = await registered.json();
        const sponsorRow = reviewer.locator(`[data-sponsor-id="${sponsorId}"]`);
        await reviewer.getByRole('button',{name:'刷新感谢记录',exact:true}).click();
        await sponsorRow.getByText(sponsor,{exact:true}).waitFor();
        const publicSponsorship = reviewer.getByRole('dialog',{name:'合成感谢记录',exact:true});
        assert.equal(await publicSponsorship.getByLabel('合成感谢对象',{exact:true}).count(),0,'reviewer cannot maintain sponsorships');
        result = command(staff,'operations','sponsor.hide');
        await staff.locator('.integration-record').filter({hasText:sponsor}).getByRole('button',{name:'隐藏感谢记录',exact:true}).click();
        assert.equal((await result).status(),200);
        const refreshed = reviewer.waitForResponse(response=>{
          const url = new URL(response.url());
          return response.request().method() === 'GET' && url.pathname === '/api/operations' &&
            url.searchParams.get('kind') === 'sponsor' && url.searchParams.get('view') === 'public';
        });
        await publicSponsorship.getByRole('button',{name:'刷新感谢记录',exact:true}).click();
        const publicFeed = await refreshed;
        assert.equal(publicFeed.status(),200);
        assert(!(await publicFeed.json()).items.some(item=>item.id===sponsorId));
        await sponsorRow.waitFor({state:'hidden'});
        assert.equal(await publicSponsorship.getByRole('alert').count(),0,'sponsorship panel completed its refresh');
        const {rows:[sponsorship]} = await api.admin('SELECT status,owner_id,occurred_at FROM operations_lab.documents WHERE id=$1',[sponsorId]);
        assert.deepEqual(sponsorship,{status:'hidden',owner_id:db.accounts.admin.memberId,occurred_at:new Date('2024-03-01T04:00:00Z')});
        record.scenarios.push('administrator-maintained-synthetic-sponsorship-obeys-public-visibility');

        record.stage='team-capacity-and-leave';
        await resetVisitQuota();
        for (const page of [a,staff,reviewer]) {
          await close(page);
          await page.getByRole('button',{name:'可信组队',exact:true}).click();
        }
        await a.getByLabel('队伍名称',{exact:true}).fill('独立 TEST 合成队');
        await a.getByLabel('人数上限',{exact:true}).fill('2');
        result = command(a,'operations','team.create');
        await a.getByRole('button',{name:'创建合成队伍',exact:true}).click();
        const formed = await result;
        assert.equal(formed.status(),200);
        const {item:{id:teamId}} = await formed.json();
        const join = async page => {
          await page.getByRole('button',{name:'刷新队伍',exact:true}).click();
          const joined = command(page,'operations','team.join');
          await page.locator(`[data-team-id="${teamId}"]`).getByRole('button',{name:'加入此合成队伍',exact:true}).click();
          return await joined;
        };
        assert.equal((await join(reviewer)).status(),200);
        await reviewer.getByTestId('own-team').getByText(/member · 2\/2/).waitFor();
        const full = await join(staff);
        assert.equal(full.status(),409);
        assert.equal((await full.json()).code,'TEAM_FULL');
        const {rows:activeMembers} = await api.admin(`
          SELECT member_id,role FROM operations_lab.team_members WHERE team_id=$1 AND left_at IS NULL ORDER BY role
        `,[teamId]);
        assert.deepEqual(activeMembers,[{member_id:other.memberId,role:'leader'},{member_id:db.accounts.reviewer.memberId,role:'member'}]);
        result = command(reviewer,'operations','team.leave');
        await reviewer.getByRole('button',{name:'退出本人队伍',exact:true}).click();
        assert.equal((await result).status(),200);
        await reviewer.getByTestId('own-team').waitFor({state:'hidden'});
        const {rows:[team]} = await api.admin(`
          SELECT t.leader_id,t.member_count,m.left_at IS NOT NULL AS member_left
          FROM operations_lab.teams t JOIN operations_lab.team_members m ON m.team_id=t.id
          WHERE t.id=$1 AND m.member_id=$2
        `,[teamId,db.accounts.reviewer.memberId]);
        assert.deepEqual(team,{leader_id:other.memberId,member_count:1,member_left:true});
        record.scenarios.push('packed-team-membership-enforces-capacity-and-ordinary-member-exit');

        record.stage='viewports';
        await navigate(a);
        await ready(a);
        for (const width of [1440,1024,768,390,320]) {
          await a.setViewportSize({width,height:1000});
          assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'layout overflows at '+width);
          record.widths.push(width);
        }
        const confirmed = await api.admin('SELECT points_lab.assert_account($1)',[member.memberId]);
        assert.equal(confirmed.rowCount,1);
        assert.deepEqual(record.pageErrors,[]);
        assert.deepEqual(record.cspErrors,[]);
        record.passed=true;
        record.stage='complete';
      } finally { await browser.close(); }
    }));
  } finally {
    if (!record.passed && process.env.CI === 'true') console.error('Synthetic browser stage: '+record.stage);
    fs.writeFileSync(path.join(evidence,'last-browser.json'),JSON.stringify(record,null,2)+'\n');
    await app.close();
  }
  console.log(JSON.stringify(record));
}
main().catch(error=>{
  console.error(process.env.CI === 'true' ? 'Synthetic browser rehearsal failed' : error.message);
  process.exitCode=1;
});
