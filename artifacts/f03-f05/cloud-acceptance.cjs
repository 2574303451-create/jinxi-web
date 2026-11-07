// Real HTTP acceptance for the one authorized synthetic TEST origin.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { POLICIES } = require('../../netlify/functions/_shared/function-security');
const origin = 'https://jinxi-web-test.netlify.app';
const output = path.join(__dirname,'cloud-http.json');

async function main() {
  if (process.argv.length !== 2) throw Error('NO_TARGET_OR_CREDENTIAL_ARGUMENTS_ACCEPTED');
  const attempt = {origin,classification:'synthetic-test',startedAtUtc:new Date().toISOString(),checks:[],passed:false};
  async function check(name,action) {
    const row = {name,passed:false};attempt.checks.push(row);
    try { await action(row);row.passed=true; }
    catch { row.error='ASSERTION_OR_HTTP_FAILURE';throw Error(name); }
  }
  async function request(route,method='GET') {
    const response = await fetch(origin+route,{method,redirect:'error',cache:'no-store',
      headers:{...(method==='POST'?{'Content-Type':'application/json',Origin:'https://untrusted.invalid'}:{})},
      ...(method==='POST'?{body:JSON.stringify({userId:'synthetic-forged',account:'synthetic-forged',pointDelta:999999,pointCost:0})}:{}),
      signal:AbortSignal.timeout(15000),
    });
    const text = await response.text();
    assert(!/npg_[A-Za-z0-9]{10,}|postgres(?:ql)?:\/\//.test(text));
    return {response,text};
  }
  try {
    for (const route of ['/','/guides/','/profile-lab/','/session-lab/']) {
      await check('static '+route,async row=>{
        const {response,text}=await request(route);
        row.status=response.status;assert.equal(response.status,200);
        const policy=response.headers.get('content-security-policy')||'';
        const script=policy.split(';').find(value=>value.trim().startsWith('script-src '));
        assert(script);assert(!script.includes("'unsafe-inline'"));assert(!script.includes("'unsafe-eval'"));
        assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
        row.htmlSha256=crypto.createHash('sha256').update(text).digest('hex');row.cspPresent=true;
      });
    }
    await check('actual published synthetic strategies',async row=>{
      const {response,text}=await request('/.netlify/functions/strategies');row.status=response.status;assert.equal(response.status,200);
      const body=JSON.parse(text);assert.equal(body.pagination.total,4);assert.equal(body.strategies.length,4);
      assert(body.strategies.every(item=>item.status==='published'&&item.title.startsWith('【TEST】')));
      assert(!body.strategies.some(item=>item.id==='104'));row.ids=body.strategies.map(item=>item.id);
    });
    for (const [feed,expectedIds] of [['latest',['101','102','103']],['video',['102']],['pinned',['103']]]) {
      await check('server filter '+feed,async row=>{
        const {response,text}=await request('/.netlify/functions/strategies?summary=1&limit=3&feed='+feed);row.status=response.status;assert.equal(response.status,200);
        const body=JSON.parse(text);assert.equal(body.contract,'jinxi.guides.summary.v2');assert.equal(body.appliedFeed,feed);
        assert.deepEqual(body.strategies.map(item=>item.id),expectedIds);
        assert(body.strategies.every(item=>!Object.hasOwn(item,'content')&&!Object.hasOwn(item,'mediaFiles')));
        row.ids=expectedIds;
      });
    }
    await check('synthetic video aggregate',async row=>{
      const {response,text}=await request('/.netlify/functions/guide-video-stats');row.status=response.status;assert.equal(response.status,200);
      const body=JSON.parse(text);assert.equal(body.status,'ready');assert.equal(body.count,1);assert.equal(body.playabilityVerified,false);
      assert(Number.isFinite(Date.parse(body.calculatedAt)));row.count=body.count;row.playabilityVerified=false;
    });
    for (const [name,count] of [['messages',2],['announcements',1],['sponsorship',1]]) {
      await check('synthetic read '+name,async row=>{
        const {response,text}=await request('/.netlify/functions/'+name);row.status=response.status;assert.equal(response.status,200);
        const body=JSON.parse(text),items=name==='sponsorship'?body.entries:body;assert.equal(items.length,count);
        assert.equal(response.headers.get('cache-control'),'no-store');row.count=count;
      });
    }
    for (const [route,status] of [['strategies?status=draft',403],['strategies?id=104',404],['guide-video-stats?userId=synthetic-forged',400],['strategies?summary=1&feed=video&limit=50',400]]) {
      await check('invalid public query '+route,async row=>{
        const {response}=await request('/.netlify/functions/'+route);row.status=response.status;assert.equal(response.status,status);
      });
    }
    for (const [name,policy] of Object.entries(POLICIES)) {
      await check('closed write '+name,async row=>{
        const {response,text}=await request('/.netlify/functions/'+name,'POST');row.status=response.status;
        const expected=policy==='closed-identity'?401:name==='guide-video-stats'?405:403;assert.equal(response.status,expected);
        assert.equal(response.headers.get('access-control-allow-origin'),null);
        if (name!=='guide-video-stats')assert.match(JSON.parse(text).code,/^LEGACY_(ENDPOINT|WRITE)_DISABLED$/);
      });
    }
    attempt.passed=true;
  } finally {
    attempt.completedAtUtc=new Date().toISOString();
    const history=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):{attempts:[]};
    history.attempts.push(attempt);fs.writeFileSync(output,JSON.stringify(history,null,2)+'\n');
    console.log(JSON.stringify({origin,passed:attempt.passed,checks:attempt.checks.length,failed:attempt.checks.filter(row=>!row.passed).map(row=>row.name),evidence:output}));
  }
}
if(require.main===module)main().catch(()=>{process.exitCode=1;});
