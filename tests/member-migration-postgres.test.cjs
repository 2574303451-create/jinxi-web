const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {seedSessionLab}=require('./support/session-fixtures.cjs'),{connect}=require('./support/postgres.cjs');
test('reviewable session DDL rehearses only synthetic mappings and rolls back completely',async t=>{
 await seedSessionLab();const c=await connect('admin'),names=['member_account_security_v2','member_sessions_v2','member_session_limits_v2'];let transaction=false;
 try{
  for(const name of names)assert.equal((await c.query('SELECT to_regclass($1) AS existing',['b2_lab.'+name])).rows[0].existing,null,'Never replace existing tables');
  assert.equal(Number((await c.query("SELECT count(*) n FROM b2_lab.guild_member_profiles WHERE source='synthetic-b2-lab'")).rows[0].n),2);
  const source=fs.readFileSync('database-b2-member-session-draft.sql','utf8');assert(source.includes('DRAFT_NOT_APPROVED'));
  const ddl=source.split('-- BEGIN REVIEWABLE DDL')[1].split('-- END REVIEWABLE DDL')[0].replaceAll('__APPROVED_SCHEMA__','b2_lab');
  await c.query('BEGIN');transaction=true;await c.query('SET LOCAL ROLE jinxi_b2_owner');await c.query(ddl);
  await t.test('mapping uses verified account/profile join, never nickname',async()=>{const r=await c.query('INSERT INTO b2_lab.member_account_security_v2(account_id,member_id) SELECT a.id,p.member_id FROM b2_lab.guild_member_accounts a JOIN b2_lab.guild_member_profiles p USING(employee_no) RETURNING account_id');assert.equal(r.rowCount,2);});
  const parameters=[Buffer.alloc(32,1),Buffer.alloc(32,2)],insert="INSERT INTO b2_lab.member_sessions_v2(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at) VALUES(2,$1,$2,'synthetic-key',1,now()+interval '7 days',now()+interval '30 minutes')";
  await t.test('new session accepts digests and stores no raw token column',async()=>{await c.query(insert,parameters);const columns=(await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='b2_lab' AND table_name='member_sessions_v2'")).rows.map(r=>r.column_name);assert(!columns.includes('token'));assert(!columns.includes('password'));assert(columns.includes('token_hash'));});
  async function denied(sql,values,code){await c.query('SAVEPOINT negative');try{await assert.rejects(c.query(sql,values),e=>e.code===code);}finally{await c.query('ROLLBACK TO SAVEPOINT negative');}}
  await t.test('duplicate digest, wrong hash length and invalid expiry reject',async()=>{await denied(insert,parameters,'23505');await denied(insert,[Buffer.alloc(31),Buffer.alloc(32)],'23514');await denied(insert.replace("now()+interval '7 days'","now()-interval '1 day'"),[Buffer.alloc(32,3),Buffer.alloc(32,4)],'23514');});
  await t.test('unknown account and duplicate member identity reject',async()=>{await denied(insert.replace('VALUES(2,','VALUES(9999,'),[Buffer.alloc(32,5),Buffer.alloc(32,6)],'23503');await denied('INSERT INTO b2_lab.member_account_security_v2(account_id,member_id) SELECT account_id,member_id FROM b2_lab.member_account_security_v2 LIMIT 1',[],'23505');});
  await c.query('ROLLBACK');transaction=false;
  await t.test('rehearsal leaves no proposed tables or real-member data changes',async()=>{for(const name of names)assert.equal((await c.query('SELECT to_regclass($1) AS remaining',['b2_lab.'+name])).rows[0].remaining,null);assert.equal(Number((await c.query('SELECT count(*) n FROM b2_lab.guild_member_accounts')).rows[0].n),2);});
 }finally{if(transaction)await c.query('ROLLBACK');await c.end();}
});
