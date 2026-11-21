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
          const orderStage='manual-redemption-admin-queue-'+outcome;
          record.stage=orderStage+'-new-receipt';
          await resetVisitQuota();
          await close(a);
          await a.getByRole('button',{name:'恢复未确认操作',exact:true}).click();
          const receipt = a.locator('[data-request-id="'+previousRequest+'"]');
          await receipt.filter({hasText:'服务端确认已提交'}).getByRole('button',{name:'确认已完成，允许新操作',exact:true}).click();
          await receipt.waitFor({state:'hidden'});
          const verifyReceipts=a.getByRole('button',{name:'核对服务端回执',exact:true});
          await verifyReceipts.and(a.locator('button:enabled')).waitFor();
          assert.equal(await receipt.count(),0);
          record.stage=orderStage+'-place';
          await points(a);
          const [placed] = await Promise.all([command(a,'points','redeem'),
            a.locator('[data-catalogue-id="'+itemId+'"]').getByRole('button',{name:'兑换虚构商品',exact:true}).click()]);
          assert.equal(placed.status(),200);
          assert.notEqual(placed.request().postDataJSON().requestId,previousRequest);
          previousRequest = placed.request().postDataJSON().requestId;
          const { orderId: id } = await placed.json();
          const ownOrder = a.locator('[data-order-id="'+id+'"]');
          await ownOrder.getByText(/凭订单号联系公会管理员/).waitFor();
          await a.getByTestId('balance').filter({hasText:/^0$/}).waitFor();
          assert.equal(await a.getByRole('heading',{name:'待处理兑换',exact:true}).count(),0);

          record.stage=orderStage+'-lookup';
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
          record.stage=orderStage+'-claim';
          const mirror = await pageFor(adminContext);
          await navigate(mirror);
          await ready(mirror);
          await points(mirror);
          if (outcome === 'failed') {
            const mirrorInput = mirror.getByRole('searchbox',{name:'完整订单号',exact:true});
            await mirrorInput.fill(id);
            await mirrorInput.press('Enter');
            await mirror.getByRole('button',{name:'返回待处理列表',exact:true}).waitFor();
          }
          const mirrorRow = mirror.locator('[data-admin-order-id="'+id+'"]');
          await mirrorRow.getByRole('button',{name:'认领订单',exact:true}).waitFor();
          const claimOrder = row.getByRole('button',{name:'认领订单',exact:true}).and(row.locator('button:enabled'));
          const [claim] = await Promise.all([command(staff,'points','order.process'),
            claimOrder.press('Enter')]);
          assert.equal(claim.status(),200);
          assert.equal((await claim.json()).status,'processing');
          await row.getByText(/已由你认领/).waitFor();
          record.stage=orderStage+'-cross-tab-claim';
          await mirrorRow.getByText(/已由你认领/).waitFor();
          await a.getByRole('button',{name:'刷新积分记录',exact:true}).click();
          await ownOrder.getByText(/管理员正在核验和处理此订单/).waitFor();
          assert.equal(await ownOrder.getByRole('button',{name:'取消并按原流水退款',exact:true}).isDisabled(),true);
          const action = row.getByRole('button',{name:outcome === 'failed' ? '确认未开通，退回积分' : '确认已人工开通',exact:true})
            .and(row.locator('button:enabled'));
          record.stage=orderStage+'-cross-tab-close';
          const release = Promise.withResolvers();
          const isOrderRead = url => url.pathname === '/api/points' && url.searchParams.get('view') === 'admin' &&
            (outcome === 'failed' ? url.searchParams.get('orderId') === id : url.searchParams.get('queue') === 'all');
          await mirror.route(isOrderRead, async route => {
            await release.promise;
            await route.continue();
          }, {times:1});
          try {
            const [decision] = await Promise.all([
              command(staff,'points','order.process'), action.press('Enter'),
              mirror.waitForRequest(request=>request.method()==='GET'&&isOrderRead(new URL(request.url()))),
              mirrorRow.waitFor({state:'hidden'}),
            ]);
            assert.equal(decision.status(),200);
            assert.equal((await decision.json()).status,outcome);
            assert.equal(await mirrorRow.getByRole('button').count(),0);
          } finally {
            release.resolve();
          }
          if (outcome === 'failed') {
            await mirrorRow.getByText(/未履约 · 已退款/).waitFor();
            assert.equal(await mirrorRow.getByRole('button').count(),0);
          } else {
            await mirror.getByText('暂无本人处理中订单。',{exact:true}).waitFor();
            assert.equal(await mirrorRow.count(),0);
          }
          await mirror.close();
          await row.getByText(outcome === 'failed' ? /未履约 · 已退款/ : /已完成/).waitFor();
          assert.equal(await row.getByRole('button').count(),0);
          record.stage=orderStage+'-reconcile';
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
        record.scenarios.push('same-admin-tabs-refresh-claims-and-hide-obsolete-fulfilment-actions');

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

        record.stage='announcement-history';
        await resetVisitQuota();
        const announcementOwner = await session(staff);
        const announcementReviewer = await session(reviewer);
        const archiveDraft = await api.mutate('operations',announcementOwner,{
          op:'announcement.create',title:'早期合成公告草稿',contentHtml:'<p>旧稿正文</p>',expiresAt:null,
        });
        assert.equal(archiveDraft.status,200);
        const archiveId = archiveDraft.body.item.id;
        const seededAnnouncements = await api.admin(async c=>{
          await c.query('BEGIN');
          const owner = announcementOwner.memberId;
          await c.query("SELECT set_config('operations.actor',$1,true)",[owner]);
          const {rows} = await c.query(`INSERT INTO operations_lab.documents(kind,owner_id,last_editor,payload,status)
            SELECT 'announcement',$1,$1,jsonb_build_object('title','合成公告历史 '||entry,'contentHtml','<p>合成历史正文</p>'),'draft'
            FROM generate_series(1,51) AS entry RETURNING id`,[owner]);
          const ids = rows.map(row=>row.id);
          await c.query("UPDATE operations_lab.documents SET status='submitted',version=2 WHERE id=ANY($1::uuid[])",[ids]);
          await c.query("SELECT set_config('operations.actor',$1,true)",[announcementReviewer.memberId]);
          await c.query("UPDATE operations_lab.documents SET status='published',version=3 WHERE id=ANY($1::uuid[])",[ids]);
          await c.query('COMMIT');
          return ids.length;
        });
        assert.equal(seededAnnouncements,51);
        const publishedHistory = (await api.admin(`SELECT id FROM operations_lab.documents WHERE kind='announcement' AND status='published'
          ORDER BY published_at DESC,id DESC`)).rows.map(row=>row.id);
        const announcementIds = (page,list) => page.getByTestId(list).locator('[data-item-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.itemId));
        const archiveRow = page => page.getByTestId('managed-announcements').locator(`[data-item-id="${archiveId}"]`);
        const publicAnnPager = a.getByRole('navigation',{name:'已公开公告分页',exact:true});
        await a.getByRole('button',{name:'刷新公告',exact:true}).click();
        await publicAnnPager.waitFor();
        assert.deepEqual(await announcementIds(a,'public-announcements'),publishedHistory.slice(0,50));
        await publicAnnPager.getByRole('button',{name:'查看更早记录',exact:true}).press('Enter');
        await a.getByTestId('public-announcements').locator(`[data-item-id="${publishedHistory[50]}"]`).waitFor();
        assert.deepEqual(await announcementIds(a,'public-announcements'),publishedHistory.slice(50));
        assert(await a.getByRole('heading',{name:'已公开公告',exact:true}).evaluate(node=>node===document.activeElement));
        assert.equal(await a.getByTestId('managed-announcements').count(),0);

        const manageAnn = page => page.getByRole('region',{name:'公告审核与修订',exact:true});
        const manageAnnPager = page => page.getByRole('navigation',{name:'公告审核与修订分页',exact:true});
        const openAnnArchive = async page => {
          await manageAnn(page).getByRole('button',{name:'刷新管理公告',exact:true}).click();
          await manageAnnPager(page).getByRole('button',{name:'查看更早记录',exact:true}).click();
          await archiveRow(page).waitFor();
        };
        const recoverAnnFirstPage = async page => {
          await manageAnn(page).getByRole('alert').getByText('公告已更新，请返回第一页。',{exact:true}).waitFor();
          assert.deepEqual(await announcementIds(page,'managed-announcements'),[]);
          await manageAnnPager(page).getByRole('button',{name:'返回第一页',exact:true}).click();
          await page.getByTestId('managed-announcements').locator('li').first().waitFor();
        };
        record.stage='announcement-history-edit';
        await openAnnArchive(staff);
        await archiveRow(staff).getByRole('button',{name:'修订此公告',exact:true}).click();
        assert.equal(await staff.getByLabel('公告标题',{exact:true}).inputValue(),'早期合成公告草稿');
        await staff.getByRole('button',{name:'取消公告修订',exact:true}).click();
        assert.equal(await staff.getByLabel('公告标题',{exact:true}).inputValue(),'');
        assert.equal(await staff.getByLabel('公告富文本源',{exact:true}).inputValue(),'');
        await archiveRow(staff).getByRole('button',{name:'修订此公告',exact:true}).click();
        await staff.getByLabel('公告富文本源',{exact:true}).fill('<p>早期公告修订正文</p>');
        const [archiveEdited] = await Promise.all([command(staff,'operations','announcement.edit'),staff.getByRole('button',{name:'保存公告草稿',exact:true}).click()]);
        assert.equal(archiveEdited.status(),200);
        await recoverAnnFirstPage(staff);
        await manageAnnPager(staff).getByRole('button',{name:'查看更早记录',exact:true}).click();
        const [archiveSubmitted] = await Promise.all([command(staff,'operations','announcement.submit'),archiveRow(staff).getByRole('button',{name:'提交公告审核',exact:true}).click()]);
        assert.equal(archiveSubmitted.status(),200);
        await recoverAnnFirstPage(staff);
        record.stage='announcement-history-review';
        await openAnnArchive(reviewer);
        const [archivePublished] = await Promise.all([command(reviewer,'operations','announcement.publish'),archiveRow(reviewer).getByRole('button',{name:'独立审核并发布',exact:true}).click()]);
        assert.equal(archivePublished.status(),200);
        await a.getByRole('button',{name:'刷新公告',exact:true}).click();
        await a.getByRole('region',{name:'已公开公告',exact:true}).getByRole('alert').getByText('公告已更新，请返回第一页。',{exact:true}).waitFor();
        await publicAnnPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        const visitorArchive = a.getByTestId('public-announcements').locator(`[data-item-id="${archiveId}"]`);
        await visitorArchive.getByText('早期公告修订正文',{exact:true}).waitFor();
        record.stage='announcement-history-withdraw';
        await manageAnn(staff).getByRole('button',{name:'刷新管理公告',exact:true}).click();
        const [archiveWithdrawn] = await Promise.all([command(staff,'operations','announcement.withdraw'),archiveRow(staff).getByRole('button',{name:'撤回公告',exact:true}).click()]);
        assert.equal(archiveWithdrawn.status(),200);
        const [withdrawnPublicPage] = await Promise.all([a.waitForResponse(response=>{
          const url = new URL(response.url());
          return response.request().method()==='GET' && url.pathname==='/api/operations' &&
            url.searchParams.get('kind')==='announcement' && url.searchParams.get('view')==='public' && !url.searchParams.has('cursor');
        }),a.getByRole('button',{name:'刷新公告',exact:true}).click()]);
        assert.equal(withdrawnPublicPage.status(),200);
        assert(!(await withdrawnPublicPage.json()).items.some(item=>item.id===archiveId));
        await visitorArchive.waitFor({state:'detached'});
        await a.getByTestId('public-announcements').locator(`[data-item-id="${publishedHistory[0]}"]`).waitFor();
        assert.equal(await visitorArchive.count(),0);
        const {rows:archiveRevisions} = await api.admin(`SELECT data->>'status' AS status,actor_id FROM operations_lab.revisions
          WHERE item_id=$1 ORDER BY version`,[archiveId]);
        assert.deepEqual(archiveRevisions,[
          {status:'draft',actor_id:announcementOwner.memberId},{status:'draft',actor_id:announcementOwner.memberId},
          {status:'submitted',actor_id:announcementOwner.memberId},{status:'published',actor_id:announcementReviewer.memberId},
          {status:'withdrawn',actor_id:announcementOwner.memberId},
        ]);
        record.scenarios.push('announcement-history-finds-revises-reviews-and-withdraws-an-older-draft');

        record.stage='announcement-expiry';
        await resetVisitQuota();
        for (const page of [a,staff,reviewer]) {
          await close(page);
          await page.getByRole('button',{name:announcementButton,exact:true}).click();
        }
        const {rows:[clock]} = await api.admin(`SELECT synthetic_now,
          date_trunc('minute',attendance_lab.business_now())+interval '30 minutes' AS deadline FROM attendance_lab.clock`);
        const deadline = clock.deadline.toISOString();
        const shanghaiDeadline = new Date(clock.deadline.getTime()+8*60*60*1000).toISOString().slice(0,16);
        const expiryInput = staff.getByLabel('到期时间（上海）',{exact:true});
        await staff.getByLabel('公告标题',{exact:true}).fill('合成定时公告');
        await staff.getByLabel('公告富文本源',{exact:true}).fill('<p>合成定时正文</p>');
        await expiryInput.fill(shanghaiDeadline);
        const [scheduled] = await Promise.all([command(staff,'operations','announcement.create'),staff.getByRole('button',{name:'保存公告草稿',exact:true}).click()]);
        assert.equal(scheduled.status(),200);
        const {item:scheduledItem} = await scheduled.json();
        assert.equal(scheduledItem.expiresAt,deadline);
        const scheduledRow = page => page.getByTestId('managed-announcements').locator(`[data-item-id="${scheduledItem.id}"]`);
        await scheduledRow(staff).getByRole('button',{name:'修订此公告',exact:true}).click();
        assert.equal((await expiryInput.inputValue()).slice(0,16),shanghaiDeadline);
        await staff.getByRole('button',{name:'取消公告修订',exact:true}).click();
        assert.equal(await expiryInput.inputValue(),'');
        for (const [input, expected] of [['',null],[shanghaiDeadline,deadline]]) {
          await scheduledRow(staff).getByRole('button',{name:'修订此公告',exact:true}).click();
          await expiryInput.fill(input);
          const [editedExpiry] = await Promise.all([command(staff,'operations','announcement.edit'),
            staff.getByRole('button',{name:'保存公告草稿',exact:true}).click()]);
          assert.equal(editedExpiry.status(),200);
          const savedExpiry = (await api.admin('SELECT expires_at FROM operations_lab.documents WHERE id=$1',[scheduledItem.id])).rows[0].expires_at;
          assert.equal(savedExpiry?.toISOString() ?? null,expected);
        }
        const [scheduledSubmit] = await Promise.all([command(staff,'operations','announcement.submit'),scheduledRow(staff).getByRole('button',{name:'提交公告审核',exact:true}).click()]);
        assert.equal(scheduledSubmit.status(),200);
        await reviewer.getByRole('button',{name:'刷新管理公告',exact:true}).click();
        const [scheduledPublished] = await Promise.all([command(reviewer,'operations','announcement.publish'),scheduledRow(reviewer).getByRole('button',{name:'独立审核并发布',exact:true}).click()]);
        assert.equal(scheduledPublished.status(),200);
        const publishedVersion = (await scheduledPublished.json()).item.version;
        assert.equal(publishedVersion,5);
        await scheduledRow(reviewer).getByText(`published · 版本 ${publishedVersion}`,{exact:true}).waitFor();
        assert.equal(await scheduledRow(reviewer).getByRole('button',{name:'删除公告',exact:true}).count(),0);
        await a.getByRole('button',{name:'刷新公告',exact:true}).click();
        const publicScheduledRow = a.getByTestId('public-announcements').locator(`[data-item-id="${scheduledItem.id}"]`);
        await publicScheduledRow.getByText('合成定时正文',{exact:true}).waitFor();
        try {
          await api.admin('UPDATE attendance_lab.clock SET synthetic_now=$1 WHERE id=1',[deadline]);
          const [expiredPublicPage] = await Promise.all([a.waitForResponse(response=>{
            const url = new URL(response.url());
            return url.pathname==='/api/operations' && response.request().method()==='GET' &&
              url.searchParams.get('kind')==='announcement' && url.searchParams.get('view')==='public' && !url.searchParams.has('cursor');
          }),a.getByRole('button',{name:'刷新公告',exact:true}).click()]);
          assert.equal(expiredPublicPage.status(),200);
          assert(!(await expiredPublicPage.json()).items.some(item=>item.id===scheduledItem.id));
          await publicScheduledRow.waitFor({state:'detached'});
          await staff.getByRole('button',{name:'刷新管理公告',exact:true}).click();
          await scheduledRow(staff).getByText(`expired · 版本 ${publishedVersion}`,{exact:true}).waitFor();
          const [reviewerPage] = await Promise.all([reviewer.waitForResponse(response=>{
            const url = new URL(response.url());
            return url.pathname==='/api/operations' && response.request().method()==='GET' &&
              url.searchParams.get('kind')==='announcement' && url.searchParams.get('view')==='private';
          }),reviewer.getByRole('button',{name:'刷新管理公告',exact:true}).click()]);
          assert.equal(reviewerPage.status(),200);
          assert(!(await reviewerPage.json()).items.some(item=>item.id===scheduledItem.id));
          await scheduledRow(reviewer).waitFor({state:'detached'});
          assert.equal((await api.mutate('operations',announcementReviewer,{
            op:'announcement.delete',id:scheduledItem.id,version:publishedVersion,
          })).status,403);

          record.stage='announcement-soft-delete';
          await scheduledRow(staff).getByRole('button',{name:'删除公告',exact:true}).click();
          await scheduledRow(staff).getByRole('button',{name:'取消删除',exact:true}).click();
          assert(await scheduledRow(staff).getByRole('button',{name:'删除公告',exact:true}).evaluate(node=>node===document.activeElement));
          const {rows:[stillPublished]} = await api.admin('SELECT status,version,expires_at FROM operations_lab.documents WHERE id=$1',[scheduledItem.id]);
          assert.deepEqual(stillPublished,{status:'published',version:publishedVersion,expires_at:clock.deadline});
          await scheduledRow(staff).getByRole('button',{name:'删除公告',exact:true}).click();
          const [deleted] = await Promise.all([command(staff,'operations','announcement.delete'),scheduledRow(staff).getByRole('button',{name:'确认删除公告',exact:true}).click()]);
          assert.equal(deleted.status(),200);
          assert(await staff.getByRole('heading',{name:'公告审核与修订',exact:true}).evaluate(node=>node===document.activeElement));
          await scheduledRow(staff).getByText(`deleted · 版本 ${publishedVersion+1}`,{exact:true}).waitFor();
          assert.equal(await scheduledRow(staff).getByRole('button',{name:'删除公告',exact:true}).count(),0);
          const {rows:scheduledRevisions} = await api.admin(`SELECT data->>'status' AS status,actor_id FROM operations_lab.revisions
            WHERE item_id=$1 ORDER BY version`,[scheduledItem.id]);
          assert.deepEqual(scheduledRevisions,[
            ...Array.from({length:3},()=>({status:'draft',actor_id:announcementOwner.memberId})),
            {status:'submitted',actor_id:announcementOwner.memberId},
            {status:'published',actor_id:announcementReviewer.memberId},{status:'deleted',actor_id:announcementOwner.memberId},
          ]);
        } finally { await api.admin('UPDATE attendance_lab.clock SET synthetic_now=$1 WHERE id=1',[clock.synthetic_now]); }
        record.scenarios.push('announcement-expires-on-the-server-and-admin-deletion-retains-revisions');

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

        record.stage='sponsorship-pagination';
        await resetVisitQuota();
        const adminSession = await session(staff);
        const seededSponsors = await api.admin(async c=>{
          await c.query('BEGIN');
          await c.query("SELECT set_config('operations.actor',$1,true)",[adminSession.memberId]);
          const seeded = await c.query(`INSERT INTO operations_lab.documents(kind,owner_id,last_editor,payload,status,occurred_at)
            SELECT 'sponsor',$1,$1,jsonb_build_object('sponsor','虚构历史感谢 '||day),'visible',
              TIMESTAMPTZ '2025-01-01 12:00:00+08' + make_interval(days => day)
            FROM generate_series(0,51) AS day`,[adminSession.memberId]);
          await c.query('COMMIT');
          return seeded.rowCount;
        });
        assert.equal(seededSponsors,52);
        const {rows:sponsorRecords} = await api.admin(`SELECT id,status,(occurred_at AT TIME ZONE 'Asia/Shanghai')::date::text AS day FROM operations_lab.documents
          WHERE kind='sponsor' ORDER BY occurred_at DESC,id DESC`);
        const sponsorPublicIds = sponsorRecords.filter(row=>row.status==='visible').map(row=>row.id);
        const sponsorManagedIds = sponsorRecords.map(row=>row.id);
        const olderSponsor = sponsorPublicIds[50];
        const manageSponsorship = staff.getByRole('region',{name:'感谢记录管理',exact:true});
        const publicSponsorIdsOn = page => page.locator('[data-sponsor-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.sponsorId));
        const managedSponsorIdsOn = () => manageSponsorship.locator('[data-managed-sponsor-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.managedSponsorId));
        await publicSponsorship.getByRole('button',{name:'刷新感谢记录',exact:true}).click();
        const publicSponsorPager = reviewer.getByRole('navigation',{name:'公开感谢记录分页',exact:true});
        await publicSponsorPager.waitFor();
        assert.deepEqual(await publicSponsorIdsOn(reviewer),sponsorPublicIds.slice(0,50));
        await publicSponsorPager.getByRole('button',{name:'查看更早记录',exact:true}).press('Enter');
        await reviewer.locator(`[data-sponsor-id="${olderSponsor}"]`).waitFor();
        assert.deepEqual(await publicSponsorIdsOn(reviewer),sponsorPublicIds.slice(50));
        assert(await reviewer.getByRole('heading',{name:'公开感谢记录',exact:true}).evaluate(node=>node===document.activeElement));
        assert.equal(await reviewer.getByRole('navigation',{name:'感谢记录管理分页',exact:true}).count(),0);

        await staff.getByRole('button',{name:'刷新感谢记录',exact:true}).click();
        await staff.locator(`[data-sponsor-id="${sponsorPublicIds[0]}"]`).waitFor();
        const manageSponsorPager = staff.getByRole('navigation',{name:'感谢记录管理分页',exact:true});
        await manageSponsorship.getByRole('button',{name:'刷新管理记录',exact:true}).click();
        await manageSponsorPager.waitFor();
        assert.deepEqual(await managedSponsorIdsOn(),sponsorManagedIds.slice(0,50));
        const managedPage = staff.waitForResponse(response=>{
          const url = new URL(response.url());
          return url.pathname==='/api/operations' && response.request().method()==='GET' &&
            url.searchParams.get('kind')==='sponsor' && url.searchParams.get('view')==='private' && url.searchParams.has('cursor');
        });
        await manageSponsorPager.getByRole('button',{name:'查看更早记录',exact:true}).click();
        const managedReply = await managedPage;
        assert.equal(managedReply.status(),200);
        const privateCursor = new URL(managedReply.url()).searchParams.get('cursor');
        assert.equal((await api.request(`/api/operations?kind=sponsor&view=public&cursor=${encodeURIComponent(privateCursor)}`)).status,400);
        const hiddenRow = manageSponsorship.locator(`[data-managed-sponsor-id="${sponsorId}"]`);
        await hiddenRow.getByRole('button',{name:'恢复感谢展示',exact:true}).waitFor();
        assert((await managedSponsorIdsOn()).includes(sponsorId));
        assert.deepEqual(await managedSponsorIdsOn(),sponsorManagedIds.slice(50));
        assert.deepEqual(await publicSponsorIdsOn(staff),sponsorPublicIds.slice(0,50));

        const olderSponsorRow = manageSponsorship.locator(`[data-managed-sponsor-id="${olderSponsor}"]`);
        await olderSponsorRow.getByRole('button',{name:'编辑感谢记录',exact:true}).click();
        const sponsorDate = staff.getByLabel('发生时间（上海）',{exact:true});
        assert.equal((await sponsorDate.inputValue()).slice(0,10),sponsorRecords.find(row=>row.id===olderSponsor).day);
        await staff.getByRole('button',{name:'取消修订',exact:true}).click();
        assert.equal(await sponsorDate.inputValue(),'2024-03-01T12:00');
        assert.equal((await Promise.all([command(staff,'operations','sponsor.hide'),
          olderSponsorRow.getByRole('button',{name:'隐藏感谢记录',exact:true}).click()]))[0].status(),200);
        assert.equal((await api.admin('SELECT status FROM operations_lab.documents WHERE id=$1',[olderSponsor])).rows[0].status,'hidden');
        await manageSponsorship.getByRole('alert').getByText('感谢记录已更新，请返回第一页。',{exact:true}).waitFor();
        assert.deepEqual(await managedSponsorIdsOn(),[]);
        await manageSponsorPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        await manageSponsorship.locator(`[data-managed-sponsor-id="${sponsorManagedIds[0]}"]`).waitFor();
        assert.deepEqual(await managedSponsorIdsOn(),sponsorManagedIds.slice(0,50));
        await staff.locator(`[data-sponsor-id="${sponsorPublicIds[0]}"]`).waitFor();
        assert.deepEqual(await publicSponsorIdsOn(staff),sponsorPublicIds.slice(0,50));
        await publicSponsorship.getByRole('button',{name:'刷新感谢记录',exact:true}).click();
        await publicSponsorship.getByRole('alert').getByText('感谢记录已更新，请返回第一页。',{exact:true}).waitFor();
        assert.deepEqual(await publicSponsorIdsOn(reviewer),[]);
        await publicSponsorPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        await reviewer.locator(`[data-sponsor-id="${sponsorPublicIds[0]}"]`).waitFor();
        assert.deepEqual(await publicSponsorIdsOn(reviewer),sponsorPublicIds.slice(0,50));
        await publicSponsorPager.getByRole('button',{name:'查看更早记录',exact:true}).click();
        await reviewer.locator(`[data-sponsor-id="${sponsorPublicIds[51]}"]`).waitFor();
        assert.deepEqual(await publicSponsorIdsOn(reviewer),sponsorPublicIds.slice(51));
        record.scenarios.push('sponsorship-paginates-public-and-admin-records-and-recovers-a-stale-cursor');

        record.stage='sponsorship-soft-delete';
        await manageSponsorPager.getByRole('button',{name:'查看更早记录',exact:true}).click();
        await hiddenRow.getByRole('button',{name:'删除感谢记录',exact:true}).click();
        const [sponsorDeleted] = await Promise.all([command(staff,'operations','sponsor.delete'),
          hiddenRow.getByRole('button',{name:'确认删除感谢记录',exact:true}).click()]);
        assert.equal(sponsorDeleted.status(),200);
        assert(await manageSponsorship.getByRole('heading',{name:'感谢记录管理',exact:true}).evaluate(node=>node===document.activeElement));
        await manageSponsorship.getByRole('alert').getByText('感谢记录已更新，请返回第一页。',{exact:true}).waitFor();
        await manageSponsorPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        await manageSponsorPager.getByRole('button',{name:'查看更早记录',exact:true}).click();
        await hiddenRow.getByText(/^deleted ·/).waitFor();
        assert.equal(await hiddenRow.getByRole('button').count(),0);
        const {rows:sponsorRevisions} = await api.admin(`SELECT data->>'status' AS status,actor_id FROM operations_lab.revisions
          WHERE item_id=$1 ORDER BY version`,[sponsorId]);
        assert.deepEqual(sponsorRevisions,['visible','hidden','deleted'].map(status=>({status,actor_id:adminSession.memberId})));
        record.scenarios.push('sponsorship-admin-deletion-retains-the-original-record-and-revisions');

        record.stage='team-capacity-and-leave';
        await resetVisitQuota();
        for (const page of [a,staff,reviewer]) {
          await close(page);
          await page.getByRole('button',{name:'可信组队',exact:true}).click();
        }
        await a.getByLabel('队伍名称',{exact:true}).fill('独立 TEST 合成队');
        await a.getByLabel('人数上限',{exact:true}).fill('2');
        await a.getByLabel('队伍简介',{exact:true}).fill('合成队伍周末协作');
        await a.getByLabel('入队条件',{exact:true}).fill('欢迎了解合成测试流程的成员');
        result = command(a,'operations','team.create');
        await a.getByRole('button',{name:'创建合成队伍',exact:true}).click();
        const formed = await result;
        assert.equal(formed.status(),200);
        const {item:formedTeam} = await formed.json();
        const teamId = formedTeam.id;
        assert.equal(formedTeam.description,'合成队伍周末协作');
        assert.equal(formedTeam.requirements,'欢迎了解合成测试流程的成员');
        const teamCard = page => page.getByTestId('team-list').locator(`[data-team-id="${teamId}"]`);
        await a.getByTestId('own-team').getByText(/leader · 1\/2/).waitFor();
        const descriptionInput = a.getByLabel('队伍简介',{exact:true});
        const requirementsInput = a.getByLabel('入队条件',{exact:true});
        assert.equal(await descriptionInput.inputValue(),formedTeam.description);
        assert.equal(await requirementsInput.inputValue(),formedTeam.requirements);
        const description = '合成队伍改为工作日晚间协作', requirements = '请先阅读合成点数与签到说明';
        await descriptionInput.fill(description);
        await requirementsInput.fill(requirements);
        const join = async page => {
          await page.getByRole('button',{name:'刷新队伍',exact:true}).click();
          const [joined] = await Promise.all([command(page,'operations','team.join'),
            teamCard(page).getByRole('button',{name:'加入此合成队伍',exact:true}).click()]);
          return joined;
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
        record.stage='team-leader-details';
        assert.equal(await reviewer.getByRole('form',{name:'本人队伍管理',exact:true}).count(),0);
        const saveTeam = a.getByRole('button',{name:'保存本人队伍',exact:true});
        const failedTeamRead = url => url.pathname==='/api/operations' &&
          url.searchParams.get('kind')==='team' && url.searchParams.get('view')==='private' && url.searchParams.get('limit')==='1';
        await a.route(failedTeamRead,route=>route.fulfill({status:503,json:{code:'OPERATIONS_UNAVAILABLE'}}),{times:1});
        const [conflict] = await Promise.all([command(a,'operations','team.edit'),saveTeam.click()]);
        assert.equal(conflict.status(),409);
        assert.equal((await conflict.json()).code,'VERSION_CONFLICT');
        await a.getByRole('alert').getByText('OPERATIONS_UNAVAILABLE',{exact:true}).waitFor();
        await a.getByRole('form',{name:'本人队伍管理',exact:true}).waitFor({state:'detached'});
        await a.getByRole('button',{name:'刷新我的队伍',exact:true}).click();
        await a.getByTestId('own-team').getByText(/leader · 2\/2/).waitFor();
        const currentTeam = a.getByRole('region',{name:'队伍最新版',exact:true});
        await currentTeam.getByText(formedTeam.description,{exact:true}).waitFor();
        assert.equal(await descriptionInput.inputValue(),description);
        assert.equal(await requirementsInput.inputValue(),requirements);
        assert(await saveTeam.isDisabled());
        assert.equal(await a.getByLabel('人数上限',{exact:true}).getAttribute('min'),'2');
        await currentTeam.getByRole('button',{name:'核对完成，保留修改',exact:true}).click();
        await a.getByRole('button',{name:'刷新我的队伍',exact:true}).click();
        const publicTeamRead = url => url.pathname==='/api/operations' &&
          url.searchParams.get('kind')==='team' && url.searchParams.get('view')==='public';
        await a.route(publicTeamRead,route=>route.fulfill({status:503,json:{code:'OPERATIONS_UNAVAILABLE'}}),{times:1});
        await a.getByRole('button',{name:'刷新队伍',exact:true}).click();
        await a.getByText('暂时无法读取队伍，请刷新。',{exact:true}).waitFor();
        const [teamUpdated] = await Promise.all([command(a,'operations','team.edit'),saveTeam.click()]);
        assert.equal(teamUpdated.status(),200);
        const {item:updatedTeam} = await teamUpdated.json();
        assert.equal(updatedTeam.description,description);
        assert.equal(updatedTeam.requirements,requirements);
        await reviewer.getByRole('button',{name:'刷新队伍',exact:true}).click();
        await teamCard(reviewer).getByText(description,{exact:true}).waitFor();
        await teamCard(reviewer).getByText(requirements,{exact:false}).waitFor();
        assert.equal(await reviewer.getByRole('form',{name:'本人队伍管理',exact:true}).count(),0);
        const acceptedFields = teamUpdated.request().postDataJSON();
        const {requestId:usedTeamRequest,...currentTeamEdit} = acceptedFields;
        assert(usedTeamRequest);
        const memberEdit = await api.mutate('operations',await session(reviewer),{
          ...currentTeamEdit,version:updatedTeam.version,description:'普通成员不可覆盖',
        });
        assert.equal(memberEdit.status,403);
        assert.equal(memberEdit.body.code,'LEADER_REQUIRED');
        const staleEdit = await api.mutate('operations',other,{...currentTeamEdit,description:'旧版本不可覆盖'});
        assert.equal(staleEdit.status,409);
        assert.equal(staleEdit.body.code,'VERSION_CONFLICT');
        const lowerCapacity = await api.mutate('operations',other,{...currentTeamEdit,version:updatedTeam.version,maxMembers:1});
        assert.equal(lowerCapacity.status,409);
        assert.equal(lowerCapacity.body.code,'TEAM_CAPACITY_CONFLICT');
        const {rows:[savedTeam]} = await api.admin(`SELECT leader_id,member_count,max_members,version,
          payload->>'description' AS description,payload->>'requirements' AS requirements FROM operations_lab.teams WHERE id=$1`,[teamId]);
        assert.deepEqual(savedTeam,{leader_id:other.memberId,member_count:2,max_members:2,version:updatedTeam.version,description,requirements});
        record.scenarios.push('team-description-and-entry-conditions-are-editable-only-by-the-current-leader');

        record.stage='team-member-leave';
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

        record.stage='team-pagination';
        await resetVisitQuota();
        await api.admin(`
          DO $$ DECLARE employee text; account bigint; member uuid; team uuid; slot uuid;
          BEGIN
            FOR i IN 1..51 LOOP
              employee := 'SYNTHETIC-team-page-' || i;
              INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,source)
                VALUES(employee,employee,employee,'synthetic-write-v1');
              INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,is_locked)
                VALUES(employee,employee,'!',true) RETURNING id INTO account;
              INSERT INTO b2_lab.member_account_security_v2(account_id) VALUES(account) RETURNING member_id INTO member;
              PERFORM set_config('operations.actor',member::text,true);
              team := gen_random_uuid();
              slot := gen_random_uuid();
              INSERT INTO operations_lab.teams(id,leader_id,leader_slot,payload,max_members)
                VALUES(team,member,slot,jsonb_build_object('name','合成分页队伍 ' || i,
                  'icon','⭐','color','#2360f5','slogan','','description','','requirements',''),2);
              INSERT INTO operations_lab.team_members(id,team_id,member_id,role)
                VALUES(slot,team,member,'leader');
            END LOOP;
          END $$;
        `);
        const {rows:orderedTeams} = await api.admin('SELECT id FROM operations_lab.teams ORDER BY created_at DESC,id DESC');
        assert.equal(orderedTeams.length,52);
        assert.equal(orderedTeams.at(-1).id,teamId);
        const panel = staff.getByRole('region',{name:'公开队伍',exact:true});
        const pager = staff.getByRole('navigation',{name:'公开队伍分页'});
        const reloadList = panel.getByRole('button',{name:'刷新队伍',exact:true});
        const olderTeams = pager.getByRole('button',{name:'查看更早记录',exact:true});
        const firstTeams = pager.getByRole('button',{name:'返回第一页',exact:true});
        const readTeamIds = () => panel.locator('[data-team-id]').evaluateAll(rows=>rows.map(row=>row.dataset.teamId));
        const checkTeamPage = async expected => {
          await panel.locator('[data-team-id]').nth(expected.length-1).waitFor();
          assert.deepEqual(await readTeamIds(),expected.map(row=>row.id));
        };
        await reloadList.click();
        await olderTeams.waitFor();
        await checkTeamPage(orderedTeams.slice(0,50));
        assert(await firstTeams.isDisabled());
        await olderTeams.focus();
        await staff.keyboard.press('Enter');
        await checkTeamPage(orderedTeams.slice(50));
        assert(await panel.getByRole('heading',{name:'公开队伍',exact:true}).evaluate(node=>document.activeElement===node));
        assert(await olderTeams.isDisabled());
        await teamCard(staff).getByText(/1\/2/).waitFor();

        const competingMember = await session(reviewer);
        const competingJoin = await api.mutate('operations',competingMember,{op:'team.join',id:teamId,message:''});
        assert.equal(competingJoin.status,200);
        assert.equal(competingJoin.body.item.memberCount,2);
        const joinOlderTeam = async () => {
          const [response] = await Promise.all([command(staff,'operations','team.join'),
            teamCard(staff).getByRole('button',{name:'加入此合成队伍',exact:true}).click()]);
          return response;
        };
        const fullFromStalePage = await joinOlderTeam();
        assert.equal(fullFromStalePage.status(),409);
        assert.equal((await fullFromStalePage.json()).code,'TEAM_FULL');
        const staffSession = await session(staff);
        const staffMembership = () => api.admin('SELECT team_id,role FROM operations_lab.team_members WHERE member_id=$1 AND left_at IS NULL',[staffSession.memberId]);
        assert.deepEqual((await staffMembership()).rows,[]);
        await reloadList.click();
        await panel.getByText('队伍已更新，请返回第一页。',{exact:true}).waitFor();
        const competingLeave = await api.mutate('operations',competingMember,{op:'team.leave',id:teamId});
        assert.equal(competingLeave.status,200);
        assert.equal(competingLeave.body.item.memberCount,1);
        await firstTeams.click();
        await checkTeamPage(orderedTeams.slice(0,50));
        await olderTeams.click();
        await checkTeamPage(orderedTeams.slice(50));
        assert.equal((await joinOlderTeam()).status(),200);
        await staff.getByTestId('own-team').getByText(/member · 2\/2/).waitFor();
        await panel.getByText('队伍已更新，请返回第一页。',{exact:true}).waitFor();
        const secondTeam = await api.mutate('operations',staffSession,{op:'team.join',id:orderedTeams[0].id,message:''});
        assert.equal(secondTeam.status,409);
        assert.equal(secondTeam.body.code,'ALREADY_IN_TEAM');
        assert.deepEqual((await staffMembership()).rows,[{team_id:teamId,role:'member'}]);
        const staffLeft = command(staff,'operations','team.leave');
        await staff.getByRole('button',{name:'退出本人队伍',exact:true}).click();
        assert.equal((await staffLeft).status(),200);
        assert.deepEqual((await staffMembership()).rows,[]);
        record.scenarios.push('packed-team-pagination-reaches-older-teams-and-keeps-membership-independent-of-a-stale-list');

        record.stage='points-pagination';
        await resetVisitQuota();
        const reviewerSession = await session(reviewer);
        for (const participant of [other,reviewerSession,await session(staff)]) {
          const attendance = await api.mutate('attendance',participant,{op:'checkin'});
          assert.equal(attendance.status,200);
          const eventId = attendance.body.history[0].rewardEventId;
          assert.equal((await api.mutate('points',participant,{op:'settle',eventId})).status,200);
          assert.equal((await api.mutate('points',participant,{op:'visibility',listed:true})).status,200);
        }
        const orders = [];
        for (let order = 0; order < 3; order++) {
          const purchase = await api.mutate('points',other,{op:'redeem',itemId,quantity:1});
          assert.equal(purchase.status,200);
          orders.unshift(purchase.body.orderId);
          assert.equal((await api.mutate('points',other,{op:'order.cancel',orderId:purchase.body.orderId})).status,200);
        }
        const {rows:entries} = await api.admin('SELECT id FROM points_lab.ledger WHERE member_id=$1 ORDER BY entry_no DESC',[other.memberId]);
        assert.equal(entries.length,7);
        // Use the existing server limit parameter to exercise several genuine pages.
        // Every row and cursor still comes from the packed HTTPS handler and PostgreSQL.
        let heldLedger;
        const rankRequests = [];
        await a.route('**/api/points**',async route=>{
          const requested = new URL(route.request().url());
          if (requested.pathname !== '/api/points' || route.request().method() !== 'GET' ||
              requested.searchParams.get('view') === 'admin' || requested.searchParams.has('receipt')) return route.continue();
          requested.searchParams.set('limit','2');
          if (requested.searchParams.get('view') === 'board') {
            rankRequests.push({metric:requested.searchParams.get('metric'),cursor:requested.searchParams.has('cursor')});
          }
          if (heldLedger && requested.searchParams.has('beforeLedger')) {
            const hold = heldLedger;
            heldLedger = null;
            const response = await api.request(requested.pathname+requested.search,{session:other});
            hold.received.resolve(response.status);
            await hold.release.promise;
            await route.fulfill({status:response.status,body:response.raw,
              headers:{'content-type':'application/json','cache-control':'no-store','x-jinxi-rehearsal':'held-ledger'}});
            return;
          }
          return route.continue({url:requested.href});
        });
        await points(a);
        const ids = (selector,attribute) => a.locator(selector).evaluateAll((nodes,key)=>nodes.map(node=>node.getAttribute(key)),attribute);
        const orderPager = a.getByRole('navigation',{name:'订单分页',exact:true});
        const ledgerPager = a.getByRole('navigation',{name:'流水分页',exact:true});
        const boardPager = a.getByRole('navigation',{name:'排行分页',exact:true});
        const boardList = a.getByTestId('points-board');
        assert.deepEqual(await ids('[data-order-id]','data-order-id'),orders.slice(0,2));
        await orderPager.getByRole('button',{name:'查看更早订单',exact:true}).press('Enter');
        assert.equal(await a.evaluate(()=>document.activeElement?.textContent),'本人订单');
        await a.locator(`[data-order-id="${orders[2]}"]`).waitFor();
        assert.deepEqual(await ids('[data-order-id]','data-order-id'),orders.slice(2));
        await ledgerPager.getByRole('button',{name:'查看更早流水',exact:true}).click();
        await a.locator(`[data-ledger-id="${entries[2].id}"]`).waitFor();
        assert.deepEqual(await ids('[data-ledger-id]','data-ledger-id'),entries.slice(2,4).map(row=>row.id));
        assert.deepEqual(await ids('[data-order-id]','data-order-id'),orders.slice(2));
        await orderPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        await a.locator(`[data-order-id="${orders[0]}"]`).waitFor();
        assert.deepEqual(await ids('[data-order-id]','data-order-id'),orders.slice(0,2));
        assert.deepEqual(await ids('[data-ledger-id]','data-ledger-id'),entries.slice(2,4).map(row=>row.id));
        await a.evaluate(()=>{
          const read = Response.prototype.json;
          Response.prototype.json = async function () {
            const data = await read.call(this);
            if (this.headers.get('x-jinxi-rehearsal') === 'held-ledger') {
              Response.prototype.json = read;
              requestAnimationFrame(()=>requestAnimationFrame(()=>{ document.documentElement.dataset.heldLedgerRead='yes'; }));
            }
            return data;
          };
        });
        const hold = { received:Promise.withResolvers(), release:Promise.withResolvers() };
        heldLedger = hold;
        try {
          await ledgerPager.getByRole('button',{name:'查看更早流水',exact:true}).click();
          assert.equal(await Promise.race([hold.received.promise,a.waitForEvent('close',{timeout:15000})]),200);
          await ledgerPager.getByRole('button',{name:'返回第一页',exact:true}).click();
          await a.locator(`[data-ledger-id="${entries[0].id}"]`).waitFor();
        } finally { hold.release.resolve(); }
        await a.waitForFunction(()=>document.documentElement.dataset.heldLedgerRead === 'yes');
        assert.deepEqual(await ids('[data-ledger-id]','data-ledger-id'),entries.slice(0,2).map(row=>row.id));

        await boardPager.getByRole('button',{name:'查看后续排名',exact:true}).click();
        await boardList.getByText(/^#3 /).waitFor();
        assert.equal(await boardList.locator('li').count(),1);
        await a.getByRole('combobox',{name:/排行指标/}).selectOption('balance');
        await boardList.getByText(/^#1 /).waitFor();
        assert.deepEqual(rankRequests.at(-1),{metric:'balance',cursor:false});
        assert.equal((await api.mutate('points',reviewerSession,{op:'visibility',listed:false})).status,200);
        await boardPager.getByRole('button',{name:'查看后续排名',exact:true}).click();
        await a.getByRole('alert').filter({hasText:'排行已更新，请返回第一页。'}).waitFor();
        assert.deepEqual(await ids('[data-order-id]','data-order-id'),orders.slice(0,2));
        await boardPager.getByRole('button',{name:'返回第一页',exact:true}).click();
        await boardList.getByText(/^#2 /).waitFor();
        assert.equal(await boardList.locator('li').count(),2);
        await a.unroute('**/api/points**');
        record.scenarios.push('packed-points-pagination-is-independent-and-stale-rankings-can-restart');

        record.stage='message-reaction-ownership';
        await resetVisitQuota();
        const openMessages = async page => {
          await close(page);
          await page.locator('button.community-door').filter({hasText:'留下你的声音'}).click();
        };
        const memberFeed = '/api/community?kind=message&scope=member-feed';
        assert.equal((await api.request(memberFeed)).status,401);
        assert.equal((await api.request('/api/community?kind=guide&scope=member-feed',{session:other})).status,400);
        await openMessages(a);
        await a.getByLabel(/想说的话/).fill('独立 TEST 合成回应留言');
        result = command(a,'community','message.create');
        await a.getByRole('button',{name:'发布留言',exact:true}).click();
        const submitted = await result;
        assert.equal(submitted.status(),200);
        const {item:{id:messageId}} = await submitted.json();
        await openMessages(reviewer);
        const moderation = reviewer.getByTestId('manage-message');
        await moderation.getByText('暂无本人内容，历史同名记录不会自动认领。',{exact:true}).waitFor();
        const approveMessage = moderation.locator(`[data-review-id="${messageId}"]`).getByRole('button',{name:'审核通过',exact:true});
        const [approval] = await Promise.all([command(reviewer,'community','item.review'),approveMessage.click()]);
        assert.equal(approval.status(),200);
        assert.equal(approval.request().postDataJSON().id,messageId);
        const reaction = page => page.locator(`.message-feed [data-message-id="${messageId}"]`)
          .getByRole('button',{name:'回应 👍',exact:true});
        const respond = async (page, active, stage) => {
          record.stage=stage;
          const management = page.getByTestId('manage-message');
          await management.getByRole('button',{name:'刷新本人内容',exact:true}).and(management.locator('button:enabled')).waitFor();
          const button = reaction(page).and(page.locator('button:enabled'));
          await button.waitFor();
          const [response] = await Promise.all([command(page,'community','reaction.set'),button.press('Space')]);
          assert.equal(response.status(),200);
          assert.equal(response.request().postDataJSON().id,messageId);
          assert.equal(response.request().postDataJSON().active,active);
          await reaction(page).and(page.locator(`[aria-pressed="${active}"]`)).waitFor();
        };
        record.stage='message-reaction-published-feed';
        await navigate(a);
        await ready(a);
        const [freshFeed] = await Promise.all([
          a.waitForResponse(response=>{
            const url=new URL(response.url());
            return url.pathname==='/api/community'&&url.searchParams.get('kind')==='message'&&
              url.searchParams.get('scope')==='member-feed'&&response.request().method()==='GET';
          }),
          openMessages(a),
        ]);
        assert.equal(freshFeed.status(),200);
        const freshMessages = await freshFeed.json();
        assert.equal(freshMessages.memberId,other.memberId);
        assert.equal(freshMessages.items.find(item=>item.id===messageId)?.status,'published');
        await respond(a,true,'message-reaction-first-member');
        await navigate(a);
        await ready(a);
        await openMessages(a);
        await reaction(a).and(a.locator('[aria-pressed="true"]')).waitFor();

        await login(staff,'normal');
        const sameNickname = await session(staff);
        assert.equal(sameNickname.memberId,db.accounts.normal.memberId);
        assert.equal(db.accounts.normal.nickname,db.accounts.same.nickname);
        await openMessages(staff);
        await reaction(staff).and(staff.locator('[aria-pressed="false"]')).waitFor();
        await reaction(staff).locator('span').filter({hasText:/^1$/}).waitFor();
        await respond(staff,true,'message-reaction-second-member');
        await a.getByRole('button',{name:'刷新留言',exact:true}).click();
        await reaction(a).locator('span').filter({hasText:/^2$/}).waitFor();
        await respond(a,false,'message-reaction-first-member-removal');
        const {rows:reactions} = await api.admin('SELECT member_id,active FROM community_lab.reactions WHERE item_id=$1 AND type=$2',[messageId,'👍']);
        assert.deepEqual(Object.fromEntries(reactions.map(row=>[row.member_id,row.active])),{
          [other.memberId]:false,[sameNickname.memberId]:true,
        });
        const publicMessages = await api.request('/.netlify/functions/messages');
        assert.equal(publicMessages.status,200);
        assert.deepEqual(publicMessages.body.find(item=>item.id===messageId).reactions,[{type:'👍',count:1,users:[]}]);
        const scopedFeed = await api.request(memberFeed,{session:other});
        assert.equal(scopedFeed.status,200);
        assert.equal(scopedFeed.body.memberId,other.memberId);
        assert.deepEqual(scopedFeed.body.items.find(item=>item.id===messageId).reactions,[{type:'👍',count:1,mine:false,users:[]}]);
        assert(!scopedFeed.raw.includes(sameNickname.memberId));
        record.scenarios.push('packed-message-reactions-toggle-and-isolate-same-nickname-members');

        record.stage='guide-reactions-and-comment-privacy';
        await resetVisitQuota();
        const guideLink = `/guides/?id=${guideId}`;
        const guideMemberRead = `/api/community?kind=guide&scope=member-feed&id=${guideId}`;
        assert.equal((await api.request(guideMemberRead)).status,401);
        const missingGuide = await api.request('/api/community?kind=guide&scope=member-feed&id=3ceceb19-8d98-474f-95d2-2abbdc6d668a',{session:other});
        assert.equal(missingGuide.status,200);
        assert.deepEqual(missingGuide.body.items,[]);
        await navigate(a,guideLink);
        await ready(a);
        const discussion = page => page.getByRole('region',{name:'攻略交流',exact:true});
        const guideButton = (page, name) => discussion(page).getByRole('button',{name,exact:true});
        const hasPressed = (page,name,active) => guideButton(page,name).and(page.locator(`[aria-pressed="${active}"]`)).waitFor();
        const guideReaction = async (page,name,type,active) => {
          const [changed] = await Promise.all([command(page,'community','reaction.set'),guideButton(page,name).click()]);
          assert.equal(changed.status(),200);
          assert.deepEqual({type:changed.request().postDataJSON().type,active:changed.request().postDataJSON().active},{type,active});
          await hasPressed(page,name,active);
        };
        const guideComment = '独立 TEST 合成攻略评论';
        const editor = a.getByLabel('攻略评论',{exact:true});
        record.stage='guide-draft-after-read-failure';
        await editor.fill(guideComment);
        let failedRead = false;
        await a.route('**/api/community?**',async route=>{
          const request = route.request(), query = new URL(request.url()).searchParams;
          if (!failedRead && request.method()==='GET' && query.get('scope')==='member-feed' && query.get('id')===guideId) {
            failedRead = true;
            await route.fulfill({status:503,json:{code:'COMMUNITY_UNAVAILABLE'}});
          } else await route.fallback();
        });
        const [liked] = await Promise.all([command(a,'community','reaction.set'),guideButton(a,'点赞攻略').click()]);
        assert.equal(liked.status(),200);
        await a.getByRole('button',{name:'重试',exact:true}).click();
        assert(failedRead);
        await hasPressed(a,'点赞攻略',true);
        await a.unroute('**/api/community?**');
        assert.equal(await editor.inputValue(),guideComment);
        record.stage='guide-favorite';
        await guideReaction(a,'收藏攻略','favorite',true);
        record.stage='guide-delayed-comment';
        const committed = Promise.withResolvers(), release = Promise.withResolvers();
        const nextDraft = '上一条攻略评论提交期间输入的新草稿';
        const holdCommentResponse = async route=>{
          const request = route.request();
          if (request.method()!=='POST' || request.postDataJSON().op!=='reply.create') return route.fallback();
          let response;
          try {
            const headers = await request.allHeaders();
            response = await api.request('/api/community',{body:request.postDataJSON(),headers:{
              Cookie:headers.cookie,'X-CSRF-Token':headers['x-csrf-token'],
            }});
          } catch (error) {
            committed.reject(error);
            await route.abort();
            return;
          }
          committed.resolve(response.status);
          await release.promise;
          await route.fulfill({status:response.status,body:response.raw,
            headers:{'content-type':'application/json','cache-control':'no-store'}});
        };
        await a.route('**/api/community',holdCommentResponse);
        let timeout;
        let posted;
        try {
          const committedStatus = Promise.race([committed.promise,new Promise((_,reject)=>{
            timeout = setTimeout(()=>reject(Error('Expected comment transaction did not complete')),15000);
          })]);
          const [status] = await Promise.all([committedStatus,guideButton(a,'发布攻略评论').click()]);
          assert.equal(status,200);
          await editor.fill(nextDraft);
          const response = command(a,'community','reply.create');
          release.resolve();
          posted = await response;
          await posted.finished();
        } finally {
          clearTimeout(timeout);
          release.resolve();
          await a.unroute('**/api/community',holdCommentResponse);
        }
        assert.equal(posted.status(),200);
        const {replyId:guideCommentId} = await posted.json();
        await discussion(a).getByText(guideComment,{exact:true}).waitFor();
        const {rows:[savedReply]} = await api.admin('SELECT author_id,item_id,content FROM community_lab.replies WHERE id=$1',[guideCommentId]);
        assert.deepEqual(savedReply,{author_id:other.memberId,item_id:guideId,content:guideComment});
        assert.equal(await editor.inputValue(),nextDraft);
        record.stage='guide-next-comment';
        const [nextPosted] = await Promise.all([command(a,'community','reply.create'),guideButton(a,'发布攻略评论').click()]);
        assert.equal(nextPosted.status(),200);
        await discussion(a).getByText(nextDraft,{exact:true}).waitFor();
        await a.waitForFunction(() => document.querySelector('section[aria-label="攻略交流"] textarea')?.value === '');
        assert.equal(await editor.inputValue(),'');

        record.stage='guide-reactions-and-comment-privacy';
        await navigate(a,guideLink);
        await ready(a);
        await hasPressed(a,'点赞攻略',true);
        await hasPressed(a,'收藏攻略',true);
        await navigate(staff,guideLink);
        await ready(staff);
        await hasPressed(staff,'点赞攻略',false);
        await hasPressed(staff,'收藏攻略',false);
        await discussion(staff).getByText(guideComment,{exact:true}).waitFor();
        await guideReaction(a,'点赞攻略','like',false);
        await guideReaction(a,'收藏攻略','favorite',false);
        const publicGuide = await api.request(`/.netlify/functions/strategies?id=${guideId}`);
        assert.equal(publicGuide.status,200);
        const guideDto = publicGuide.body.strategy;
        assert.equal(guideDto.likeCount,0);
        assert.equal(guideDto.favoriteCount,0);
        assert(!Object.hasOwn(guideDto,'viewerReactions'));
        assert.equal(guideDto.comments.find(item=>item.id===guideCommentId).userId,'');
        assert(!publicGuide.raw.includes(other.memberId));
        const legacyGuide = (await api.request('/api/community?kind=guide&scope=public')).body.items.find(item=>item.ownership==='unverified-legacy');
        await navigate(staff,`/guides/?id=${legacyGuide.id}`);
        await discussion(staff).getByText('这篇历史攻略仅供阅读。',{exact:true}).waitFor();
        assert.equal(await guideButton(staff,'点赞攻略').count(),0);
        assert.equal(await discussion(staff).getByRole('textbox').count(),0);
        record.scenarios.push('packed-guide-reactions-and-live-comments-keep-member-ids-private');

        record.stage='community-management-pagination';
        await resetVisitQuota();
        const communityReviewer = await session(reviewer);
        const inserted = await api.admin(`
          INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status,created_at)
          SELECT 'guide',collection.owner_id,'合成分页作者',
            jsonb_build_object('title','合成分页攻略 ' || sample,'content','合成正文','category','PVE','difficulty',1),
            collection.status, TIMESTAMPTZ '2020-01-01 00:00:00Z'
          FROM (VALUES ($1::uuid,'submitted'),($2::uuid,'submitted')) AS collection(owner_id,status)
          CROSS JOIN generate_series(1,51) AS sample
        `,[other.memberId,communityReviewer.memberId]);
        assert.equal(inserted.rowCount,102);
        const ownGuideRows = (await api.admin(`SELECT id,version FROM community_lab.items
          WHERE kind='guide' AND owner_id=$1 ORDER BY created_at DESC,id DESC`,[communityReviewer.memberId])).rows;
        const reviewGuideRows = (await api.admin(`SELECT id,version FROM community_lab.items
          WHERE kind='guide' AND status='submitted' AND owner_id<>$1 ORDER BY created_at DESC,id DESC`,[communityReviewer.memberId])).rows;
        assert(ownGuideRows.length>50 && reviewGuideRows.length>50);
        await navigate(reviewer,'/guides/');
        await ready(reviewer);
        const guideManagement = reviewer.getByTestId('manage-guide');
        const ownerGuides = guideManagement.getByRole('region',{name:'本人内容',exact:true});
        const reviewGuides = guideManagement.getByRole('region',{name:'独立审核队列',exact:true});
        const ownOlder = ownerGuides.getByRole('button',{name:'查看更早记录',exact:true});
        const reviewOlder = reviewGuides.getByRole('button',{name:'查看更早记录',exact:true});
        const checkGuides = (key,expected) => reviewer.waitForFunction(({attribute,ids})=>{
          const rows = document.querySelectorAll(`[data-testid="manage-guide"] [${attribute}]`);
          return rows.length === ids.length && Array.from(rows).every((row,index)=>row.getAttribute(attribute)===ids[index]);
        },{attribute:`data-${key}-id`,ids:expected.map(row=>row.id)});
        await checkGuides('item',ownGuideRows.slice(0,50));
        await checkGuides('review',reviewGuideRows.slice(0,50));
        await ownOlder.focus();
        await reviewer.keyboard.press('Enter');
        await checkGuides('item',ownGuideRows.slice(50));
        assert(await ownerGuides.getByRole('heading',{name:'本人内容',exact:true}).evaluate(node=>document.activeElement===node));
        await checkGuides('review',reviewGuideRows.slice(0,50));
        await reviewOlder.click();
        await checkGuides('review',reviewGuideRows.slice(50));
        await checkGuides('item',ownGuideRows.slice(50));

        const oldSubmission = reviewGuideRows.at(-1);
        const [rejected] = await Promise.all([command(reviewer,'community','item.review'),
          reviewGuides.locator(`[data-review-id="${oldSubmission.id}"]`).getByRole('button',{name:'审核拒绝',exact:true}).click()]);
        assert.equal(rejected.status(),200);
        const {rows:[rejectedStored]} = await api.admin('SELECT owner_id,status,version FROM community_lab.items WHERE id=$1',[oldSubmission.id]);
        assert.deepEqual(rejectedStored,{owner_id:other.memberId,status:'rejected',version:oldSubmission.version+1});
        const {rows:[reviewAudit]} = await api.admin(`SELECT actor_id,operation FROM community_lab.audit
          WHERE item_id=$1 AND operation='item.review'`,[oldSubmission.id]);
        assert.deepEqual(reviewAudit,{actor_id:communityReviewer.memberId,operation:'item.review'});
        await reviewGuides.locator(`[data-review-id="${oldSubmission.id}"]`).waitFor({state:'detached'});
        const remainingOlder = reviewGuideRows.slice(50,-1);
        if (remainingOlder.length) await checkGuides('review',remainingOlder);
        else await reviewGuides.getByText('暂无待审核内容',{exact:true}).waitFor();
        const anchor = reviewGuideRows[49];
        const ownerDeleted = await api.mutate('community',other,{op:'item.delete',id:anchor.id,version:anchor.version});
        assert.equal(ownerDeleted.status,200);
        await reviewGuides.getByRole('button',{name:'刷新审核队列',exact:true}).click();
        await reviewGuides.getByText('独立审核队列已更新，请返回第一页。',{exact:true}).waitFor();
        await checkGuides('item',ownGuideRows.slice(50));
        const olderOwned = ownGuideRows.at(-1);
        await ownerGuides.locator(`[data-item-id="${olderOwned.id}"]`).getByRole('button',{name:'编辑本人内容',exact:true}).click();
        const ownedEditor = guideManagement.getByRole('form',{name:'编辑本人内容',exact:true});
        const amended = '合成旧稿从本人历史页更新';
        await ownedEditor.getByLabel('修改正文',{exact:true}).fill(amended);
        const [edited] = await Promise.all([command(reviewer,'community','item.edit'),
          ownedEditor.getByRole('button',{name:'保存本人修改',exact:true}).click()]);
        assert.equal(edited.status(),200);
        const {rows:[storedDraft]} = await api.admin(`SELECT owner_id,status,version,payload->>'content' AS content
          FROM community_lab.items WHERE id=$1`,[olderOwned.id]);
        assert.deepEqual(storedDraft,{owner_id:communityReviewer.memberId,status:'draft',version:olderOwned.version+1,content:amended});
        await reviewGuides.getByRole('button',{name:'返回第一页',exact:true}).click();
        await checkGuides('review',reviewGuideRows.filter(row=>![anchor.id,oldSubmission.id].includes(row.id)).slice(0,50));

        await reviewer.getByRole('button',{name:'退出统一会话',exact:true}).click();
        await reviewer.getByTestId('unified-session').filter({hasText:'anonymous'}).waitFor();
        await resetVisitQuota();
        await login(reviewer,'normal');
        assert.equal((await session(reviewer)).memberId,member.memberId);
        const newOwn = (await api.admin(`SELECT id FROM community_lab.items
          WHERE kind='guide' AND owner_id=$1 ORDER BY created_at DESC,id DESC`,[member.memberId])).rows;
        if (newOwn.length) await checkGuides('item',newOwn);
        else await ownerGuides.getByText('暂无本人内容，历史同名记录不会自动认领。',{exact:true}).waitFor();
        assert.equal(await reviewGuides.count(),0);
        assert.equal(await ownerGuides.getByRole('navigation',{name:'本人内容分页'}).count(),0);
        record.scenarios.push('community-management-paginates-private-guides-and-review-queues-independently');

        record.stage='published-community-moderation';
        await resetVisitQuota();
        assert.equal(await guideManagement.getByRole('button',{name:'管理已发布内容',exact:true}).count(),0);
        await login(staff,'admin');
        await navigate(staff);
        await ready(staff);
        await staff.getByTestId('unified-permissions').getByText('合成管理员',{exact:true}).waitFor();
        await openMessages(staff);
        const messageManagement = staff.getByTestId('manage-message');
        const waitForCommunityAdminLists = async management => {
          await management.getByText('暂无本人内容，历史同名记录不会自动认领。',{exact:true}).waitFor();
          await management.getByRole('button',{name:'刷新审核队列',exact:true}).and(management.locator('button:enabled')).waitFor();
        };
        await waitForCommunityAdminLists(messageManagement);
        record.stage='published-community-moderation-message-list';
        await messageManagement.getByRole('button',{name:'管理已发布内容',exact:true}).click();
        const publishedMessages = messageManagement.getByRole('region',{name:'已发布内容管理',exact:true});
        const messageRow = publishedMessages.locator(`[data-moderation-id="${messageId}"]`);
        const storedMessage = async () => (await api.admin('SELECT owner_id,status,is_pinned,version FROM community_lab.items WHERE id=$1',[messageId])).rows[0];
        const initialMessage = await storedMessage();
        assert.deepEqual(initialMessage,{owner_id:other.memberId,status:'published',is_pinned:false,version:initialMessage.version});
        const legacyMessage = (await api.admin("SELECT id FROM community_lab.items WHERE kind='message' AND legacy")).rows[0].id;
        await messageRow.waitFor();
        assert.equal(await publishedMessages.locator(`[data-moderation-id="${legacyMessage}"]`).count(),0);
        await staff.evaluate(() => {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (row, ...rest) {
            if (this.name === 'intents' && row?.op === 'item.pin' && row.state === 'confirmed') {
              IDBObjectStore.prototype.put = put;
              document.documentElement.dataset.pinReceiptStorage = 'aborted';
              this.transaction.abort();
              return;
            }
            return put.call(this, row, ...rest);
          };
        });
        for (const pinned of [true,false]) {
          record.stage=pinned?'published-community-moderation-pin-message':'published-community-moderation-unpin-message';
          const [pin] = await Promise.all([command(staff,'community','item.pin'),
            messageRow.getByRole('button',{name:pinned?'置顶':'取消置顶',exact:true}).click()]);
          assert.equal(pin.status(),200);
          assert.equal(pin.request().postDataJSON().pinned,pinned);
          assert.equal((await storedMessage()).is_pinned,pinned);
          const publicMessages = await api.request('/.netlify/functions/messages');
          assert.equal(publicMessages.body.find(message=>message.id===messageId).isPinned,pinned);
          await messageManagement.getByText('操作已由服务器确认。',{exact:true}).waitFor();
          await messageRow.getByRole('button',{name:pinned?'取消置顶':'置顶',exact:true,pressed:pinned}).waitFor();
          assert.equal(await staff.locator('html').getAttribute('data-pin-receipt-storage'),'aborted');
          await waitForCommunityAdminLists(messageManagement);
        }
        record.stage='published-community-moderation-remove-message';
        const versionAfterPins = (await storedMessage()).version;
        assert.equal(versionAfterPins,initialMessage.version+2);
        const removeMessage = messageRow.getByRole('button',{name:'删除已发布内容',exact:true});
        await removeMessage.click();
        await messageRow.getByRole('button',{name:'取消删除',exact:true}).click();
        assert(await removeMessage.evaluate(node=>document.activeElement===node));
        assert.equal((await storedMessage()).version,versionAfterPins);
        await removeMessage.click();
        const [removedMessage] = await Promise.all([command(staff,'community','item.delete'),
          messageRow.getByRole('button',{name:'确认删除已发布内容',exact:true}).click()]);
        assert.equal(removedMessage.status(),200);
        assert.deepEqual(await storedMessage(),{owner_id:other.memberId,status:'deleted',is_pinned:false,version:versionAfterPins+1});
        assert(!(await api.request('/.netlify/functions/messages')).body.some(message=>message.id===messageId));
        const actionAudit = (await api.admin(`SELECT operation,count(*)::int AS count FROM community_lab.audit
          WHERE item_id=$1 AND actor_id=$2 AND operation IN('item.pin','item.delete') GROUP BY operation ORDER BY operation`,[messageId,adminSession.memberId])).rows;
        assert.deepEqual(actionAudit,[{operation:'item.delete',count:1},{operation:'item.pin',count:2}]);

        record.stage='published-community-moderation-pin-guide';
        await navigate(staff,'/guides/');
        await ready(staff);
        const adminGuideManagement = staff.getByTestId('manage-guide');
        await waitForCommunityAdminLists(adminGuideManagement);
        await adminGuideManagement.getByRole('button',{name:'管理已发布内容',exact:true}).click();
        const guidePin = adminGuideManagement.locator(`[data-moderation-id="${guideId}"]`).getByRole('button',{name:'置顶',exact:true});
        assert.equal((await Promise.all([command(staff,'community','item.pin'),guidePin.click()]))[0].status(),200);
        const beforeArchive = (await api.admin('SELECT is_pinned,version FROM community_lab.items WHERE id=$1',[guideId])).rows[0];
        assert.equal(beforeArchive.is_pinned,true);
        record.stage='published-community-moderation-archive-guide';
        await navigate(a,'/guides/');
        await ready(a);
        const ownerRow = a.getByTestId('manage-guide').locator(`[data-item-id="${guideId}"]`);
        // The ordinary author's published guide is newer than the paging fixtures.
        await ownerRow.getByRole('button',{name:'归档本人攻略',exact:true}).click();
        const [archived] = await Promise.all([command(a,'community','item.archive'),
          ownerRow.getByRole('button',{name:'确认归档本人攻略',exact:true}).click()]);
        assert.equal(archived.status(),200);
        const archivedGuide = (await api.admin('SELECT owner_id,status,is_pinned,version FROM community_lab.items WHERE id=$1',[guideId])).rows[0];
        assert.deepEqual(archivedGuide,{owner_id:other.memberId,status:'archived',is_pinned:false,version:beforeArchive.version+1});
        assert(!(await api.request('/api/community?kind=guide&scope=public')).body.items.some(item=>item.id===guideId));
        const ownerAudit = (await api.admin("SELECT actor_id FROM community_lab.audit WHERE item_id=$1 AND operation='item.archive'",[guideId])).rows;
        assert.deepEqual(ownerAudit,[{actor_id:other.memberId}]);
        record.scenarios.push('published-community-admin-pin-and-soft-delete-and-owner-guide-archive');

        record.stage='attendance-history';
        await resetVisitQuota();
        const seededAttendance = await api.admin(`WITH records AS (
          INSERT INTO attendance_lab.records(member_id,signed_at)
          SELECT $1, TIMESTAMPTZ '2020-01-01 12:00:00+08' + make_interval(days => day)
          FROM generate_series(0,30) AS day RETURNING id,member_id
        ) INSERT INTO attendance_lab.reward_events(record_id,member_id) SELECT id,member_id FROM records`,[other.memberId]);
        assert.equal(seededAttendance.rowCount,31);
        const {rows:attendanceRows} = await api.admin(`SELECT id,business_date::text AS date FROM attendance_lab.records
          WHERE member_id=$1 ORDER BY business_date DESC`,[other.memberId]);
        assert(attendanceRows.length>30);
        const expectedFirst = attendanceRows.slice(0,30).map(row=>row.id);
        const expectedOlder = attendanceRows.slice(30).map(row=>row.id);
        await navigate(a);
        await ready(a);
        const openAttendance = page => page.getByRole('button',{name:'签到事实',exact:true}).click();
        const attendancePanel = page => page.getByRole('region',{name:'统一签到',exact:true});
        const attendanceIds = page => attendancePanel(page).locator('[data-record-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.recordId));
        const waitForRecord = (page,id) => attendancePanel(page).locator(`[data-record-id="${id}"]`).waitFor();
        await openAttendance(a);
        await waitForRecord(a,expectedFirst[0]);
        assert.deepEqual(await attendanceIds(a),expectedFirst);
        const summary = await attendancePanel(a).locator('dl').innerText();
        const attendancePager = a.getByRole('navigation',{name:'签到记录分页',exact:true});
        const older = attendancePager.getByRole('button',{name:'查看更早签到记录',exact:true});
        const latest = attendancePager.getByRole('button',{name:'返回第一页',exact:true});
        const pageRead = a.waitForResponse(response=>{
          const url = new URL(response.url());
          return url.pathname==='/api/attendance' && response.request().method()==='GET' &&
            url.searchParams.get('before')===attendanceRows[29].date;
        });
        await older.press('Enter');
        assert.equal((await pageRead).status(),200);
        await waitForRecord(a,expectedOlder[0]);
        assert.deepEqual(await attendanceIds(a),expectedOlder);
        assert.equal(await attendancePanel(a).locator('dl').innerText(),summary);
        assert(await attendancePanel(a).getByRole('heading',{name:'本人签到记录',exact:true}).evaluate(node=>node===document.activeElement));
        assert(await older.isDisabled());
        await latest.click();
        await waitForRecord(a,expectedFirst[0]);
        assert.deepEqual(await attendanceIds(a),expectedFirst);

        record.stage='attendance-history-delayed-page';
        const delayedPage = url => url.pathname==='/api/attendance' && url.searchParams.get('before')===attendanceRows[29].date;
        const releaseAttendance = Promise.withResolvers();
        await a.evaluate(()=>{
          const read = Response.prototype.json;
          Response.prototype.json = async function () {
            const body = await read.call(this);
            if (this.headers.get('x-jinxi-rehearsal') === 'delayed-attendance') {
              Response.prototype.json = read;
              requestAnimationFrame(()=>requestAnimationFrame(()=>{ document.documentElement.dataset.delayedAttendanceRead='yes'; }));
            }
            return body;
          };
        });
        await a.route(delayedPage,async route=>{
          const request = route.request(), {pathname,search} = new URL(request.url());
          const headers = await request.allHeaders();
          const response = await api.request(pathname+search,{headers:{Cookie:headers.cookie}});
          await releaseAttendance.promise;
          await route.fulfill({status:response.status,body:response.raw,headers:{
            'content-type':'application/json','cache-control':'no-store','x-jinxi-rehearsal':'delayed-attendance',
          }});
        },{times:1});
        let delayed;
        try {
          await Promise.all([a.waitForRequest(request=>delayedPage(new URL(request.url()))),older.click()]);
          assert.deepEqual(await attendanceIds(a),[]);
          await latest.click();
          await waitForRecord(a,expectedFirst[0]);
          const reply = a.waitForResponse(response=>response.headers()['x-jinxi-rehearsal']==='delayed-attendance');
          releaseAttendance.resolve();
          delayed = await reply;
        } finally { releaseAttendance.resolve(); }
        assert.equal(delayed.status(),200);
        assert.deepEqual((await delayed.json()).history.map(row=>row.id),expectedOlder);
        await a.waitForFunction(()=>document.documentElement.dataset.delayedAttendanceRead==='yes');
        assert.deepEqual(await attendanceIds(a),expectedFirst);
        await older.click();
        await waitForRecord(a,expectedOlder[0]);

        record.stage='attendance-history-account-switch';
        await close(a);
        await a.getByRole('button',{name:'退出统一会话',exact:true}).click();
        await a.getByTestId('unified-session').filter({hasText:'anonymous'}).waitFor();
        await resetVisitQuota();
        await login(a,'normal');
        const {rows:[normalAttendance]} = await api.admin('SELECT id FROM attendance_lab.records WHERE member_id=$1',[member.memberId]);
        await openAttendance(a);
        await waitForRecord(a,normalAttendance.id);
        assert.deepEqual(await attendanceIds(a),[normalAttendance.id]);
        assert.equal(await attendancePager.count(),0);
        record.scenarios.push('attendance-history-paginates-private-records-and-resets-on-account-switch');

        record.stage='manual-redemption-queue-pagination';
        await resetVisitQuota();
        const queueMember = await api.login('reviewer'), queueStaff = await session(staff);
        assert.equal(queueMember.memberId,db.accounts.reviewer.memberId);
        assert.notEqual(queueMember.memberId,member.memberId);
        const {rows:[queueClock]} = await api.admin(`
          SELECT GREATEST(attendance_lab.business_now(),
            (SELECT max(signed_at) FROM attendance_lab.records WHERE member_id=$1)) AS at
        `,[queueMember.memberId]);
        const queueProduct = await api.mutate('points',queueStaff,{op:'catalogue.create',name:'合成分页纸签',unitCost:1,stock:12,
          perMemberLimit:12,minEarned:0,startsAt:'1900-01-01T00:00:00.000Z',endsAt:'2199-12-31T00:00:00.000Z',status:'enabled'});
        assert.equal(queueProduct.status,200,'queue rehearsal catalogue created');
        const queueItem = queueProduct.body.itemId;
        // This is the last business scenario. Keep advancing the disposable
        // clock so the attendance facts created by earlier scenarios stay valid.
        for (let day=1;day<=7;day++) {
          await api.admin('UPDATE attendance_lab.clock SET synthetic_now=$1 WHERE id=1',[new Date(queueClock.at.getTime()+day*86400000)]);
          const checked = await api.mutate('attendance',queueMember,{op:'checkin'});
          assert.equal(checked.status,200,'queue rehearsal attendance fact created');
          const award = await api.mutate('points',queueMember,{op:'settle',eventId:checked.body.history[0].rewardEventId});
          assert.equal(award.status,200,'queue rehearsal attendance event settled');
        }
        for (let order=0;order<12;order++) {
          const placed = await api.mutate('points',queueMember,{op:'redeem',itemId:queueItem,quantity:1});
          assert.equal(placed.status,200,'queue rehearsal order debited');
        }
        const {rows:queued}=await api.admin('SELECT id FROM points_lab.orders WHERE item_id=$1 ORDER BY created_at,id',[queueItem]);
        assert.equal(queued.length,12);
        const claimedIds=queued.slice(0,6).map(row=>row.id),pendingIds=queued.slice(6).map(row=>row.id);
        for (const orderId of claimedIds) {
          const claimed=await api.mutate('points',queueStaff,{op:'order.process',orderId,status:'processing'});
          assert.equal(claimed.status,200);
        }
        await resetVisitQuota();
        await points(staff);
        const pendingQueue=staff.getByRole('region',{name:'待认领订单',exact:true});
        const queuePager=pendingQueue.getByRole('navigation',{name:'待认领订单分页'});
        const processingQueue=staff.getByRole('region',{name:'本人处理中订单',exact:true});
        const claimedPager=processingQueue.getByRole('navigation',{name:'本人处理中订单分页'});
        const waitForQueues=(pending,processing)=>staff.waitForFunction(({pending,processing})=>{
          const read=id=>Array.from(document.querySelectorAll('#'+id+' ~ ul [data-admin-order-id]'),row=>row.dataset.adminOrderId);
          return JSON.stringify([read('points-queue-pending'),read('points-queue-processing')])===JSON.stringify([pending,processing]);
        },{pending,processing});
        const nextQueue=queuePager.getByRole('button',{name:'查看下一页',exact:true}).and(queuePager.locator('button:enabled'));
        const nextClaimed=claimedPager.getByRole('button',{name:'查看下一页',exact:true}).and(claimedPager.locator('button:enabled'));
        const firstPending=pendingIds.slice(0,5),firstClaimed=claimedIds.slice(0,5);
        const lastPending=pendingIds.slice(5),lastClaimed=claimedIds.slice(5);
        await waitForQueues(firstPending,firstClaimed);
        await nextQueue.press('Enter');
        await waitForQueues(lastPending,firstClaimed);
        assert.equal(await pendingQueue.getByRole('heading').evaluate(node=>node===document.activeElement),true);
        await nextClaimed.press('Enter');
        await waitForQueues(lastPending,lastClaimed);
        await queuePager.getByRole('button',{name:'返回第一页',exact:true}).press('Enter');
        await waitForQueues(firstPending,lastClaimed);
        const closeOrder=processingQueue.getByRole('button',{name:'确认已人工开通',exact:true}).and(processingQueue.locator('button:enabled'));
        const [fulfilled]=await Promise.all([command(staff,'points','order.process'),closeOrder.press('Enter')]);
        assert.equal(fulfilled.status(),200);
        assert.equal(fulfilled.request().postDataJSON().orderId,lastClaimed[0]);
        const {rows:[finished]}=await api.admin('SELECT status FROM points_lab.orders WHERE id=$1',[lastClaimed[0]]);
        assert.equal(finished.status,'fulfilled');
        const {rows:[queueTotals]}=await api.admin(`
          SELECT count(*) FILTER(WHERE kind='redeem')::int AS charged,count(*) FILTER(WHERE kind='refund')::int AS refunds
          FROM points_lab.ledger WHERE order_id IN(SELECT id FROM points_lab.orders WHERE item_id=$1)
        `,[queueItem]);
        assert.deepEqual(queueTotals,{charged:12,refunds:0});
        record.scenarios.push('administrator-queues-page-independently-and-keep-fulfilment-linked-to-the-original-order');

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
  if (process.env.CI === 'true') {
    // Log only fixed categories and source locations. Browser error text may
    // contain page contents, URLs or request details.
    const kind = ['AssertionError','TimeoutError','TypeError','Error'].includes(error?.name) ? error.name : 'OtherError';
    const frames = /^\s*at [^\r\n]*[\\/]synthetic-cloud-browser\.cjs:(\d{1,5}:\d{1,4})\)?$/gm;
    const locations = Array.from(String(error?.stack).matchAll(frames), match=>match[1]).slice(0,4);
    console.error('Synthetic browser rehearsal failed: '+JSON.stringify({kind,locations}));
  } else {
    console.error(error.message);
  }
  process.exitCode=1;
});
