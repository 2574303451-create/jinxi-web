// Destructive only inside tests/support/postgres.cjs's guarded disposable database.
// Run alone: never alongside browser, preview interaction, or other DB tests.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {connect, adapter, seed} = require('../../../tests/support/postgres.cjs');
const {readStrategies} = require('../../../netlify/functions/_shared/strategy-read');
const {readBatch} = require('../../../netlify/functions/_shared/strategy-query');
const {videoAggregate} = require('../../../netlify/functions/_shared/strategy-media');
const report = {scope: 'Dedicated local synthetic PG; 80% published, 20% video, 2% pinned; not production capacity or Neon network latency', sizes: []};
const save = () => fs.writeFileSync(path.join(__dirname, 'scale-results.json'), JSON.stringify(report, null, 2));
(async () => {
  const admin = await connect('admin'), reader = await connect();
  try {
    await seed(admin);
    for (const size of [1000, 10000]) {
      await admin.query('TRUNCATE strategies');
      await admin.query(`INSERT INTO strategies(id,title,content,author,category,difficulty,tags,likes,favorites,comments,is_pinned,image_url,media_files,view_count,status,created_at)
        SELECT 1000+g,'【隔离规模样本】'||g,repeat('隔离规模正文。',400),'隔离合成作者','PVE',1,ARRAY['隔离规模'],'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,g%50=0,NULL,
        CASE WHEN g%5=0 THEN jsonb_build_array(jsonb_build_object('type','video','url','/guides-media/synthetic.mp4')) ELSE '[]'::jsonb END,
        g,CASE WHEN g%10=9 THEN 'archived' WHEN g%10=8 THEN 'draft' ELSE 'published' END,'2026-01-01'::timestamptz+g*interval '1 second'
        FROM generate_series(1,$1::int) g`, [size]);
      await admin.query('ANALYZE strategies');
      const row = {size, requests: [], plans: [], concurrent: []}; report.sizes.push(row); save();
      const hash = async () => (await admin.query("SELECT md5(string_agg(md5(row_to_json(s)::text),'|' ORDER BY id)) AS h FROM strategies s")).rows[0].h;
      const before = await hash();
      const queries = new Map([['stats', {text: videoAggregate}]]);
      for (const name of ['stats', 'latest', 'video', 'pinned']) for (let run = 1; run <= 3; run++) {
        const calls = [], sql = adapter(reader, calls), begin = performance.now();
        try {
          const result = name === 'stats' ? (await readBatch(sql, [{text: videoAggregate}]))[0][0] : await readStrategies(sql, {summary:'1', feed:name, limit:'3'});
          const body = name === 'stats' ? result : result.body;
          if (name === 'stats') assert.equal(Number(result.video_count), size / 5);
          else {assert.equal(result.status, 200); assert(body.strategies.length <= 3); assert(body.strategies.every(s => s.status === 'published'));}
          row.requests.push({name,run,ok:true,ms:performance.now()-begin,bytes:Buffer.byteLength(JSON.stringify(body)),ids:body.strategies?.map(s=>s.id)});
          if (name !== 'stats') for (const [index, q] of calls.filter(q=>!q.text.startsWith('SELECT set_config')).entries()) queries.set(name+'-'+index, q);
        } catch (e) {row.requests.push({name,run,ok:false,ms:performance.now()-begin,code:e.code,message:e.message});}
        save();
      }
      for (const [name, q] of queries) {
        await reader.query('BEGIN READ ONLY');
        try {
          await reader.query("SET LOCAL statement_timeout='3000ms'");
          const plan = await reader.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+q.text, q.values || []);
          row.plans.push({name,ok:true,plan:plan.rows[0]['QUERY PLAN'][0]});
        } catch(e) {row.plans.push({name,ok:false,code:e.code,message:e.message});}
        finally {await reader.query('ROLLBACK');}
        save();
      }
      const clients = await Promise.all(Array.from({length:4},()=>connect()));
      try {row.concurrent = await Promise.all(clients.map(async c=>{const begin=performance.now();try {const [[r]]=await readBatch(adapter(c),[{text:videoAggregate}]);return {ok:Number(r.video_count)===size/5,ms:performance.now()-begin,count:Number(r.video_count)}} catch(e){return {ok:false,ms:performance.now()-begin,code:e.code}}}));}
      finally {await Promise.all(clients.map(c=>c.end()));}
      row.dataUnchanged = before === await hash(); assert(row.dataUnchanged); save();
      console.log(JSON.stringify({size,failedRequests:row.requests.filter(x=>!x.ok).length,failedPlans:row.plans.filter(x=>!x.ok).length,concurrent:row.concurrent}));
    }
    assert(report.sizes.every(s=>s.requests.every(r=>r.ok)&&s.plans.every(p=>p.ok)&&s.concurrent.every(r=>r.ok)));
  } finally {
    await seed(admin); report.restoredFixtureRows = Number((await admin.query('SELECT COUNT(*) FROM strategies')).rows[0].count); save();
    await reader.end(); await admin.end();
  }
})().catch(e=>{report.failure=e.message;save();console.error(e.message);process.exitCode=1});
