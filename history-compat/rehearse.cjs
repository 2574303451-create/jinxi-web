const {localSettings}=require('../member-local/identity.cjs');
const {fingerprint}=require('../netlify/functions/_shared/function-security');
const {checkHistory}=require('./check.cjs');

async function rollbackAndClose(c,checkStaging){
  let problem;
  try{
    const result=await c.query('ROLLBACK').catch(()=>null);
    if(result?.command!=='ROLLBACK')throw Error('REHEARSAL_ROLLBACK_UNCONFIRMED');
    if(checkStaging){
      const {rows:[state]}=await c.query(`
        SELECT NOT EXISTS (SELECT 1 FROM pg_temp.compat_candidates)
          AND NOT EXISTS (SELECT 1 FROM pg_temp.compat_quarantine) AS empty
      `);
      if(state?.empty!==true)throw Error('REHEARSAL_STAGE_NOT_CLEARED');
    }
  }catch(error){problem=error;}
  try{await c.end();}catch(error){problem??=error;}
  if(problem)throw problem;
}
async function rehearse(db,data,anchors){
 // Only the disposable factory's LOCAL resource; never accept a URL or user SQL.
 localSettings(db.settings,{});
 if(db.settings.kind!=='jinxi-member-local-v1')throw Error('LOCAL_SYNTHETIC_REHEARSAL_REQUIRED');
 const report=checkHistory(data,anchors);
 const c=await db.admin();let result,before,checkStaging=false;
 try{
  await c.query('BEGIN');const proof=(await c.query("SELECT current_database() AS db,host(inet_server_addr()) AS host,inet_server_port() AS port,i.* FROM jinxi_guard.environment_identity() i")).rows[0];
  if(!proof||proof.db!=='jinxi_member_local'||proof.host!=='127.0.0.1'||proof.port!==55436||proof.environment_id!==db.settings.environmentId||proof.classification!=='synthetic-local'||fingerprint(proof.cluster_id,proof.database_oid,proof.database_name)!==db.settings.fingerprint)throw Error('REHEARSAL_RESOURCE_REJECTED');
  before=await db.financialSnapshot();
  // Commit only the empty, session-local tables. PostgreSQL then allows their
  // rows to be staged in READ ONLY while rejecting writes to permanent tables.
  await c.query(`
    CREATE TEMP TABLE compat_candidates(
      source_id text NOT NULL, kind text NOT NULL CHECK(kind IN('messages','strategies')),
      member_id uuid NOT NULL, UNIQUE(kind,source_id)
    ) ON COMMIT PRESERVE ROWS;
    CREATE TEMP TABLE compat_quarantine(
      entity text NOT NULL, source_id text NOT NULL, code text NOT NULL
    ) ON COMMIT PRESERVE ROWS
  `);
  await c.query('COMMIT');
  await c.query('BEGIN READ ONLY');
  checkStaging=true;
  for(const row of report.candidates)await c.query('INSERT INTO pg_temp.compat_candidates VALUES($1,$2,$3)',[row.sourceId,row.kind,row.memberId]);
  for(const row of report.findings)await c.query('INSERT INTO pg_temp.compat_quarantine VALUES($1,$2,$3)',[row.entity,row.ref,row.code]);
  result=(await c.query(`
    SELECT (SELECT count(*)::int FROM pg_temp.compat_candidates) AS candidates,
      (SELECT count(*)::int FROM pg_temp.compat_quarantine) AS quarantined
  `)).rows[0];
 }finally{
  await rollbackAndClose(c,checkStaging);
 }
 const after=await db.financialSnapshot();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('REHEARSAL_CHANGED_EXISTING_DATA');
 return {...result,rolledBack:true,legacyAndBusinessDataUnchanged:true};
}
module.exports={rehearse};
