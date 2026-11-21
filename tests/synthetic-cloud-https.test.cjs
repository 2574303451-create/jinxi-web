const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const https = require('node:https');
const tls = require('node:tls');
const fs = require('node:fs');
const path = require('node:path');
const { httpClient } = require('./integration-local-support.cjs');
const { toolsFromArgs, startRehearsal, loopbackTls, withEnv, evidence } = require('./synthetic-cloud-support.cjs');
const { createEntry } = require('../synthetic-cloud/entry.cjs');
const { credentialNames } = require('../synthetic-cloud/binding.cjs');
const { freezeRoles } = require('../synthetic-cloud/database/initialize.cjs');

test('packaged Netlify Fetch function + static export + TLS PostgreSQL', async t => {
  const app = await startRehearsal(toolsFromArgs(process.argv.slice(2)));
  const { db, server, bundle } = app;
  const { admin, request, login, mutate } = httpClient(app,{Authorization:bundle.authorization});
  const counters = async () => (await admin(`
    SELECT (SELECT count(*)::int FROM community_lab.items) AS items,
           (SELECT count(*)::int FROM attendance_lab.records) AS facts,
           (SELECT count(*)::int FROM points_lab.ledger) AS ledger,
           (SELECT count(*)::int FROM points_lab.orders) AS orders,
           (SELECT count(*)::int FROM operations_lab.documents) AS documents,
           (SELECT count(*)::int FROM operations_lab.teams) AS teams
  `)).rows[0];
  let a,b,staff,reviewer,orderId;
  try {
    await loopbackTls({ cert:db.cert }, async () => {
      await t.test('only the approved bundled routes and static content are served; TLS validates', async () => {
        await assert.rejects(new Promise((resolve,reject) => {
          https.get(server.origin, { agent:false, ca:tls.getCACertificates('bundled'), rejectUnauthorized:true },
            res => { res.resume(); resolve(); }).on('error',reject);
        }), { code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE' });
        const home = await request('/');
        assert.equal(home.status,200);
        assert.match(home.raw,/独立合成 TEST/);
        assert.match(home.headers['content-security-policy'],/script-src 'self' 'sha256-/);
        assert.doesNotMatch(home.headers['content-security-policy'],/unsafe-eval|script-src[^;]*unsafe-inline/);
        assert.equal((await request('/guides/')).status,200);
        assert.equal((await request('/fixtures/operations-motion.mp4')).status,200);
        for (const route of ['/activation.json','/api/','/api/member/','/.netlify/functions/auth-login','/unknown-route']) {
          assert.equal((await request(route)).status,404,route);
        }
        assert.equal((await request('/.netlify/functions/messages',{body:{op:'login'}})).status,410);
        assert.equal((await request('/api/member?op=me&op=profile')).status,400);
        assert.equal((await request('/api/member',{method:'PUT'})).status,405);
        const forbidden = [
          bundle.approval.siteId, bundle.approval.host, bundle.approval.fingerprint, bundle.approval.schemaFingerprint,
          ...Object.values(bundle.envAtRuntime).filter(value => /^[a-f0-9]{64}$/.test(value)),
          bundle.accessPassword, bundle.authorization,
          ...Object.values(db.accounts).flatMap(({ account, memberId, nickname, password }) =>
            [account, memberId, nickname, password]),
          'jinxi_synthetic_write_v1','JINXI_SERVICE_APPROVAL','127.0.0.1:3069','ADMIN_PASSWORD',
        ];
        const checkPublicText = value => {
          assert(!forbidden.some(marker => value.includes(marker)), 'private fixture or server binding in static export');
          assert(!/[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,24}\b/i.test(value), 'contact address in static export');
          assert(!/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(value), 'private key in static export');
        };
        assert.throws(() => checkPublicText(db.accounts.normal.memberId), /private fixture/);
        assert.throws(() => checkPublicText('synthetic-contact@fixture.invalid'), /contact address/);
        const { staticExport, publish } = require('../synthetic-cloud/build.cjs');
        assert.deepEqual(fs.readdirSync(publish),[]);
        const entries = fs.readdirSync(staticExport,{recursive:true,withFileTypes:true});
        assert(entries.every(entry => entry.isFile() || entry.isDirectory()), 'non-file entry in static export');
        const exportedFiles = entries.filter(entry => entry.isFile())
          .map(entry => path.relative(staticExport,path.join(entry.parentPath,entry.name)).split(path.sep).join('/'));
        const publicFiles = exportedFiles.filter(file => /\.(js|html|json|txt|css|map|rsc)$/.test(file));
        assert(publicFiles.length > 10);
        for (const file of publicFiles) checkPublicText(fs.readFileSync(path.join(staticExport,file),'utf8'));
        const approvedMedia = new Set([
          'fixtures/community-cover.jpg', 'fixtures/community-demo.mp4', 'fixtures/operations-cover.svg',
          'fixtures/operations-motion.mp4', 'fixtures/placeholder-user.jpg',
          'logo.png', 'placeholder.jpg', 'placeholder-user.jpg', 'placeholder.svg',
        ]);
        const media = exportedFiles.filter(file => /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp|mp4|webm|mp3|ogg|wav)$/i.test(file));
        assert(media.length === approvedMedia.size && media.every(file => approvedMedia.has(file)),
          'media outside the synthetic export allowlist');
        fs.writeFileSync(path.join(evidence,'last-artifact-scan.json'),JSON.stringify({ publicTextFiles:publicFiles.length,foundPrivateMarkers:0 },null,2)+'\n');
      });

      await t.test('anonymous visitor and direct API attempts stop before opening member sessions', async () => {
        const visitor = httpClient(app).request;
        const countSessions = () => admin('SELECT count(*)::int AS n FROM b2_lab.member_sessions_v2');
        const before = await counters(), beforeSessions = await countSessions();
        const body = {op:'login',account:db.accounts.normal.account,password:db.accounts.normal.password};
        const home = await request('/');
        const scriptPath = home.raw.match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
        assert(scriptPath, 'a real JavaScript resource from the packaged home page');
        assert.equal((await request(scriptPath)).status,200);
        for (const route of ['/',scriptPath,'/guides','/logo.png','/fixtures/operations-motion.mp4','/404.html',
          '/unrecognized','/.netlify/functions/jinxi-service','/.netlify/functions/messages','/api/member']) {
          const denied = await visitor(route);
          assert.equal(denied.status,401);
          assert.equal(denied.headers['netlify-cdn-cache-control'],'no-store');
          assert.equal(denied.headers['location'],undefined);
          assert.equal(denied.raw,'TEST_ACCESS_REQUIRED');
        }
        assert.equal((await visitor('/api/member',{body})).status,401);
        for (const route of ['/api/member','/.netlify/functions/jinxi-service','/.netlify/functions/messages']) {
          const denied = await bundle.entry(new Request(bundle.approval.origin+route,{
            method:'POST',headers:{ Origin:bundle.approval.origin,'Content-Type':'application/json' },
            body:JSON.stringify(body),
          }),bundle.context);
          assert.equal(denied.status,401);
          assert.equal(denied.headers.get('set-cookie'),null);
        }
        assert.equal((await request('/guides')).status,308);
        assert.equal((await request('/guides')).headers.location,'/guides/');
        const video = await request('/fixtures/operations-motion.mp4',{headers:{Range:'bytes=0-15'}});
        assert.equal(video.status,206);
        assert.equal(video.bytes,16);
        assert.deepEqual(await counters(),before);
        assert.deepEqual((await countSessions()).rows,beforeSessions.rows);
        assert.equal((await visitor('/guides/')).status,401);
      });

      await t.test('denied Context, credentials and DB proofs fail closed before login writes', async () => {
        const prior = await counters();
        const passwords = [bundle.envAtRuntime[credentialNames.member],db.accounts.normal.password];
        const attempt = {op:'login',account:db.accounts.normal.account,password:db.accounts.normal.password};
        const first = await admin('SELECT count(*)::int AS n FROM b2_lab.member_sessions_v2');
        for (const context of [
          { ...bundle.context, deploy:{ ...bundle.context.deploy,published:false } },
          { ...bundle.context, deploy:{ ...bundle.context.deploy,id:'e'.repeat(24) } },
          { ...bundle.context, site:{ ...bundle.context.site,id:crypto.randomUUID() } },
        ]) {
          server.setContext(context);
          const denied = await request('/api/member',{body:attempt,headers:{'x-nf-deploy-context':'production','x-jinxi-environment':'synthetic-test'}});
          assert.equal(denied.status,503);
          assert.equal(denied.raw,'TEST_ACCESS_UNAVAILABLE');
        }
        server.setContext(bundle.context);
        for (const [approvalChange,envChange] of [
          [{fingerprint:'0'.repeat(64)},{}], [{schemaFingerprint:'0'.repeat(64)},{}],
          [{serverAddresses:['192.0.2.1']},{}], [{expiresAt:'2000-01-01T00:00:00.000Z'},{}],
          [{},{[credentialNames.member]:crypto.randomBytes(32).toString('hex')}],
          [{},{[credentialNames.csrfKey]:undefined}], [{},{[credentialNames.points]:undefined}],
        ]) {
          const approval = {...bundle.approval,...approvalChange}, env = {...bundle.envAtRuntime,...envChange};
          const entry = createEntry({approval,deployId:bundle.deployId},env);
          const r = await withEnv({},()=>entry(new Request(approval.origin+'/api/member',{
            method:'POST',headers:{Origin:approval.origin,'Content-Type':'application/json',Authorization:bundle.authorization},
            body:JSON.stringify(attempt),
          }),bundle.context));
          assert.equal(r.status,503);
          assert.equal(r.headers.get('set-cookie'),null);
          const body = await r.text();
          for (const value of [approval.host,approval.database,...passwords]) assert(!body.includes(value));
        }
        assert.deepEqual(await counters(),prior);
        assert.deepEqual((await admin('SELECT count(*)::int AS n FROM b2_lab.member_sessions_v2')).rows,first.rows);
      });

      await t.test('one session, two secure cookies, request limits, CSRF and guest rejection', async () => {
        a = await login(); b = await login('same'); staff = await login('admin'); reviewer = await login('reviewer');
        assert.notEqual(a.memberId,b.memberId);
        assert.equal(db.accounts.normal.nickname,db.accounts.same.nickname);
        const session = await request('/api/member',{session:a});
        assert.equal(session.body.member.id,a.memberId);
        assert.equal(session.headers['cache-control'],'no-store, private');
        assert.equal(session.headers['access-control-allow-origin'],undefined);
        assert.match(a.cookie,/__Host-jinxi_member_local=.*; __Host-jinxi_points_epoch=/);
        for (const kind of ['locked','disabled']) {
          const account = db.accounts[kind];
          assert.equal((await request('/api/member',{body:{op:'login',account:account.account,password:account.password}})).status,401);
        }
        const content = { op:'message.create',requestId:crypto.randomUUID(),content:'不应落库',category:'闲聊',color:'#2360f5' };
        const before = await counters();
        assert.equal((await request('/api/community',{session:a,body:content,headers:{Origin:'https://other.invalid'}})).status,403);
        assert.equal((await request('/api/community',{session:{...a,csrf:'wrong'},body:content})).status,403);
        assert.equal((await request('/api/community',{body:content})).status,401);
        const data = JSON.stringify({...content,content:'a'.repeat(70000)});
        const chunked = await new Promise((resolve,reject) => {
          const req = https.request(server.origin+'/api/community',{ca:server.cert,method:'POST',
            headers:{Origin:server.origin,Authorization:bundle.authorization,
              'Content-Type':'application/json','Transfer-Encoding':'chunked'}},
            res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
          req.on('error',reject);req.write(data.slice(0,35000));req.end(data.slice(35000));
        });
        assert.equal(chunked,413);
        assert.deepEqual(await counters(),before);
      });

      await t.test('messages, private guide ownership, independent publication and frozen historical attribution', async () => {
        const m = await mutate('community',a,{op:'message.create',content:'合成云端预演留言',category:'闲聊',color:'#2360f5'});
        assert.equal(m.status,200,m.body?.code);
        const g = await mutate('community',a,{op:'guide.create',title:'独立预演攻略',content:'合成草稿正文',category:'PVE',difficulty:1,tags:[],mediaFiles:[]});
        assert.equal(g.status,200,g.body?.code);
        assert(!(await request('/api/community?kind=guide&scope=mine',{session:b})).body.items.some(item=>item.id===g.body.item.id));
        assert.equal((await mutate('community',b,{op:'item.delete',id:g.body.item.id,version:g.body.item.version})).status,404);
        const submitted = await mutate('community',a,{op:'item.submit',id:g.body.item.id,version:g.body.item.version});
        assert.equal(submitted.status,200);
        for (const item of [m.body.item,submitted.body.item]) {
          assert.equal((await mutate('community',a,{op:'item.review',id:item.id,version:item.version,decision:'approve'})).status,403);
          assert.equal((await mutate('community',reviewer,{op:'item.review',id:item.id,version:item.version,decision:'approve'})).status,200);
          const {rows:[row]} = await admin('SELECT owner_id,status FROM community_lab.items WHERE id=$1',[item.id]);
          assert.deepEqual(row,{owner_id:a.memberId,status:'published'});
        }
        const list = await request('/.netlify/functions/messages');
        assert(list.body.some(item=>item.id===m.body.item.id));
        assert(!list.raw.includes(a.memberId));
        const guide = await request('/.netlify/functions/strategies?id='+g.body.item.id);
        assert.equal(guide.body.strategy.id,g.body.item.id);
        assert.equal((await admin('SELECT count(*)::int AS n FROM community_lab.items WHERE legacy AND owner_id IS NOT NULL')).rows[0].n,0);
      });

      await t.test('concurrent attendance and settlement use one original event and one ledger row', async () => {
        const check = {op:'checkin',requestId:crypto.randomUUID()};
        for (const r of await Promise.all([mutate('attendance',a,check),mutate('attendance',a,check)])) assert.equal(r.status,200,r.body?.code);
        const points = await request('/api/points',{session:a});
        const event = points.body.events[0], eventId = event.eventId;
        assert.equal(event.status,'unsettled');
        for (const r of await Promise.all([mutate('points',a,{op:'settle',eventId}),mutate('points',a,{op:'settle',eventId})])) assert.equal(r.status,200,r.body?.code);
        const { rows:[actual] } = await admin(`
          SELECT (SELECT count(*)::int FROM attendance_lab.records WHERE member_id=$1) AS facts,
                 (SELECT count(*)::int FROM points_lab.settlements WHERE event_id=$2) AS settlements,
                 (SELECT count(*)::int FROM points_lab.ledger WHERE event_id=$2) AS awards,
                 (SELECT balance::text FROM points_lab.accounts WHERE member_id=$1) AS balance,
                 (SELECT settlement_state FROM attendance_lab.reward_events WHERE event_id=$2) AS event
        `,[a.memberId,eventId]);
        assert.deepEqual(actual,{facts:1,settlements:1,awards:1,balance:'1',event:'unsettled'});
        assert.equal((await request('/api/attendance',{session:b})).body.stats.totalDays,0);
        assert.equal((await mutate('points',b,{op:'settle',eventId})).status,403);
      });

      await t.test('pending order, replay, cross-account denial and one failure refund share the original debit', async () => {
        const item = (await request('/api/points',{session:a})).body.catalogue.find(row=>row.unitCost==='1');
        const redeem = {op:'redeem',itemId:item.id,quantity:1,requestId:crypto.randomUUID()};
        const result = await mutate('points',a,redeem);
        assert.equal(result.status,200,result.body?.code);
        orderId = result.body.orderId;
        assert.equal(result.body.status,'pending');
        assert.equal((await mutate('points',a,redeem)).body.orderId,orderId);
        assert.equal((await request('/api/points?receipt='+redeem.requestId,{session:b})).body.receipt.state,'unresolved');
        assert.equal((await request('/api/points?receipt='+redeem.requestId,{session:a})).body.receipt.state,'committed');
        assert.equal((await mutate('points',b,{op:'order.cancel',orderId})).status,403);
        assert.equal((await mutate('points',reviewer,{op:'order.process',orderId,status:'failed'})).status,403);
        assert.equal((await mutate('points',staff,{op:'order.process',orderId,status:'processing'})).body.status,'processing');
        const fail = {op:'order.process',orderId,status:'failed',requestId:crypto.randomUUID()};
        for (const r of await Promise.all([mutate('points',staff,fail),mutate('points',staff,fail)])) assert.equal(r.status,200,r.body?.code);
        const {rows} = await admin('SELECT kind,origin_id,id FROM points_lab.ledger WHERE order_id=$1 ORDER BY entry_no',[orderId]);
        assert.deepEqual(rows.map(r=>r.kind),['redeem','refund']);
        assert.equal(rows[1].origin_id,rows[0].id);
        assert.equal((await request('/api/points',{session:a})).body.account.balance,'1');
        await admin('SELECT points_lab.assert_account($1)',[a.memberId]);
      });

      await t.test('a real inventory lock rolls back the order, debit and stock; the original request can retry', async () => {
        const item = (await request('/api/points',{session:a})).body.catalogue.find(row=>row.unitCost==='1');
        const redeem = {op:'redeem',itemId:item.id,quantity:1,requestId:crypto.randomUUID()};
        const state = async () => ({
          counts:await counters(),
          balance:(await admin('SELECT balance::text FROM points_lab.accounts WHERE member_id=$1',[a.memberId])).rows[0].balance,
          stock:(await admin('SELECT available FROM points_lab.catalogue WHERE id=$1',[item.id])).rows[0].available,
          receipts:(await admin('SELECT count(*)::int AS n FROM points_lab.requests WHERE actor_id=$1 AND request_id=$2',
            [a.memberId,redeem.requestId])).rows[0].n,
        });
        const before = await state(), locked = await db.admin();
        try {
          await locked.query('BEGIN; LOCK TABLE points_lab.inventory IN SHARE MODE');
          assert.equal((await mutate('points',a,redeem)).status,503);
        } finally { await locked.query('ROLLBACK'); await locked.end(); }
        assert.deepEqual(await state(),before);
        const retried = await mutate('points',a,redeem);
        assert.equal(retried.status,200,retried.body?.code);
        assert.equal(retried.body.status,'pending');
        assert.equal((await state()).balance,'0');
        const id = retried.body.orderId;
        assert.equal((await mutate('points',a,{op:'order.process',orderId:id,status:'fulfilled'})).status,403);
        assert.equal((await mutate('points',staff,{op:'order.process',orderId:id,status:'processing'})).body.status,'processing');
        assert.equal((await mutate('points',staff,{op:'order.process',orderId:id,status:'fulfilled'})).status,200);
        assert.equal((await mutate('points',a,{op:'order.cancel',orderId:id})).status,409);
        assert.deepEqual((await admin('SELECT kind FROM points_lab.ledger WHERE order_id=$1',[id])).rows,[{kind:'redeem'}]);
        assert.equal((await admin('SELECT status FROM points_lab.orders WHERE id=$1',[id])).rows[0].status,'fulfilled');
      });

      await t.test('announcement review, sponsor management, team membership and privacy', async () => {
        const announce = {op:'announcement.create',title:'独立预演公告',contentHtml:'<p>合成正文</p>',expiresAt:null};
        assert.equal((await mutate('operations',a,announce)).status,403);
        const draft = await mutate('operations',staff,announce);
        assert.equal(draft.status,200,draft.body?.code);
        const submitted = await mutate('operations',staff,{op:'announcement.submit',id:draft.body.item.id,version:draft.body.item.version});
        assert.equal(submitted.status,200);
        const publish = {op:'announcement.publish',id:submitted.body.item.id,version:submitted.body.item.version};
        assert.equal((await mutate('operations',staff,publish)).status,403);
        assert.equal((await mutate('operations',reviewer,publish)).status,200);
        const feed = await request('/.netlify/functions/announcements');
        assert(feed.body.some(item=>item.title===announce.title));
        assert(!feed.raw.includes(staff.memberId));
        const sponsor = {op:'sponsor.create',sponsor:'仅合成测试赞助记录',sponsorTime:'2024-03-01T04:00:00.000Z'};
        assert.equal((await mutate('operations',reviewer,sponsor)).status,403);
        assert.equal((await mutate('operations',staff,sponsor)).status,200);
        assert.equal((await request('/.netlify/functions/sponsorship')).body.entries.length,1);
        const team = await mutate('operations',a,{op:'team.create',name:'独立预演队伍',icon:'⭐',color:'#2360f5',slogan:'',description:'',requirements:'',maxMembers:2});
        assert.equal(team.status,200,team.body?.code);
        const id=team.body.item.id;
        assert.equal((await mutate('operations',b,{op:'team.join',id,message:''})).status,200);
        assert.equal((await mutate('operations',staff,{op:'team.join',id,message:''})).status,409);
        const {rows:[row]} = await admin('SELECT member_count FROM operations_lab.teams WHERE id=$1',[id]);
        assert.equal(row.member_count,2);
        assert.equal((await admin('SELECT count(*)::int AS n FROM operations_lab.team_members WHERE team_id=$1 AND left_at IS NULL',[id])).rows[0].n,2);
      });

      await t.test('database schema drift fails closed even in a warm invocation', async () => {
        const before = await counters();
        await admin('ALTER TABLE attendance_lab.requests ADD COLUMN synthetic_drift boolean');
        try {
          const r = await mutate('attendance',a,{op:'checkin'});
          assert.equal(r.status,503);
          assert.doesNotMatch(r.raw,/synthetic_drift|jinxi_synthetic_write_v1/);
          assert.deepEqual(await counters(),before);
        } finally { await admin('ALTER TABLE attendance_lab.requests DROP COLUMN synthetic_drift'); }
      });

      await t.test('warm service rejects altered database defaults and non-origin trigger mode', async () => {
        const before = await counters();
        const root = await db.superuser();
        try {
          for (const [name,value] of [['timezone','UTC'],['session_replication_role','replica']]) {
            await root.query("ALTER DATABASE jinxi_synthetic_write_v1 SET " + name + " TO '" + value + "'");
            try {
              const r = await request('/api/member?op=me',{session:a});
              assert.equal(r.status,503,name);
              assert.equal(r.headers['set-cookie'],undefined);
              assert.doesNotMatch(r.raw,/replica|timezone|jinxi_synthetic_write_v1/);
              assert.deepEqual(await counters(),before);
            } finally { await root.query('ALTER DATABASE jinxi_synthetic_write_v1 RESET ' + name); }
          }
          assert.equal((await request('/api/member?op=me',{session:a})).status,200);
        } finally { await root.end(); }
      });

      await t.test('warm handler revalidates all roles when its credential set changes', async () => {
        const env = {...bundle.envAtRuntime};
        const entry = createEntry({approval:bundle.approval,deployId:bundle.deployId},env);
        const key = credentialNames.points;
        const original = env[key];
        const replacement = crypto.randomBytes(32).toString('hex');
        const call = () => withEnv({},()=>entry(new Request(bundle.approval.origin+'/api/member?op=me',{
          headers:{Authorization:bundle.authorization,Cookie:a.cookie},
        }),bundle.context));
        assert.equal((await call()).status,200);
        const before = await counters();
        env[key] = replacement;
        const refused = await call();
        assert.equal(refused.status,503);
        assert.equal(refused.headers.get('set-cookie'),null);
        const body = await refused.text();
        assert(!body.includes(original) && !body.includes(replacement) && !body.includes(a.memberId));
        assert.deepEqual(await counters(),before);
        env[key] = original;
        assert.equal((await call()).status,200);
      });

      await t.test('interrupted credential changes retire a previously approved warm startup', async () => {
        const env = {...bundle.envAtRuntime};
        const entry = createEntry({approval:bundle.approval,deployId:bundle.deployId},env);
        const key = credentialNames.points;
        const original = env[key];
        const { Client } = require('pg');
        const connect = Client.prototype.connect;
        const started = Promise.withResolvers(), resume = Promise.withResolvers();
        let pointsChecks = 0, holdConnection = false, pending;
        Client.prototype.connect = function (...args) {
          if (this.connectionParameters.application_name === 'jinxi-approved-test-points') {
            pointsChecks++;
            if (holdConnection) {
              holdConnection = false;
              started.resolve();
              return resume.promise.then(() => connect.apply(this,args));
            }
          }
          return connect.apply(this,args);
        };
        try {
          await withEnv({},async () => {
            const call = () => entry(new Request(bundle.approval.origin+'/api/member?op=me',{
              headers:{Authorization:bundle.authorization,Cookie:a.cookie},
            }),bundle.context);
            assert.equal((await call()).status,200);
            assert.equal(pointsChecks,1);
            assert.equal((await call()).status,200);
            assert.equal(pointsChecks,1,'same credentials reuse a completed startup');

            delete env[key];
            assert.equal((await call()).status,503);
            env[key] = original;
            holdConnection = true;
            pending = call();
            await Promise.race([started.promise,pending.then(() => assert.fail('points startup was not rechecked'))]);
            env[key] = crypto.randomBytes(32).toString('hex');
            resume.resolve();
            assert.equal((await pending).status,503);
            assert.equal(pointsChecks,2);

            env[key] = original;
            assert.equal((await call()).status,200);
            assert.equal(pointsChecks,3,'restoring the original credentials requires another startup');
          });
        } finally {
          resume.resolve();
          try { await pending; } finally { Client.prototype.connect = connect; }
        }
      });

      await t.test('logout, password change, expiry and disabled account block every write', async () => {
        async function denied(session) {
          const before = await counters();
          for (const [module,body] of Object.entries({
            community:{op:'message.create',content:'无权限',category:'闲聊',color:'#2360f5'}, attendance:{op:'checkin'},
            points:{op:'order.cancel',orderId}, operations:{op:'team.join',id:crypto.randomUUID(),message:''},
          })) assert.equal((await mutate(module,session,body)).status,401,module);
          assert.deepEqual(await counters(),before);
        }
        assert.equal((await request('/api/member',{session:a,body:{op:'logout'}})).status,200);
        await denied(a);
        assert.equal((await request('/api/member',{session:b,body:{op:'change-password',currentPassword:db.accounts.same.password,newPassword:crypto.randomBytes(20).toString('hex')+'A9!'}})).status,200);
        await denied(b);
        await admin("UPDATE b2_lab.member_sessions_v2 SET idle_expires_at=created_at+interval '1 millisecond' WHERE account_id=$1",[db.accounts.reviewer.accountId]);
        await denied(reviewer);
        await admin('UPDATE b2_lab.guild_member_profiles SET is_active=false WHERE employee_no=$1',['SYNTHETIC-admin']);
        await denied(staff);
        const fresh = await login('normal');
        await admin('UPDATE b2_lab.guild_member_accounts SET is_locked=true WHERE id=$1',[db.accounts.normal.accountId]);
        await denied(fresh);
      });

      await t.test('NOLOGIN stops the warm packaged handler without removing committed records', async () => {
        const before = await counters();
        const client = await db.admin();
        try { await freezeRoles(client,db.target); } finally { await client.end(); }
        assert.equal((await request('/.netlify/functions/messages')).status,503);
        assert.deepEqual(await counters(),before);
      });
    });
  } finally { await app.close(); }
});
