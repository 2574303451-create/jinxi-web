const {localSettings}=require('../member-local/identity.cjs');
const {fingerprint}=require('../netlify/functions/_shared/function-security');
async function rehearse(db,report){
 // Only the disposable factory's LOCAL resource; never accept a URL or user SQL.
 localSettings(db.settings,{});if(db.settings.kind!=='jinxi-member-local-v1'||report?.kind!=='jinxi-history-report-v1'||report.syntheticOnly!==true)throw Error('LOCAL_SYNTHETIC_REHEARSAL_REQUIRED');
 const c=await db.admin();let result,before;
 try{
  await c.query('BEGIN');const proof=(await c.query("SELECT current_database() AS db,host(inet_server_addr()) AS host,inet_server_port() AS port,i.* FROM jinxi_guard.environment_identity() i")).rows[0];
  if(proof.db!=='jinxi_member_local'||proof.host!=='127.0.0.1'||proof.port!==55436||proof.environment_id!==db.settings.environmentId||proof.classification!=='synthetic-local'||fingerprint(proof.cluster_id,proof.database_oid,proof.database_name)!==db.settings.fingerprint)throw Error('REHEARSAL_RESOURCE_REJECTED');
  before=await db.financialSnapshot();
  await c.query('CREATE TEMP TABLE compat_candidates(source_id text,kind text,member_id uuid,UNIQUE(kind,source_id)) ON COMMIT DROP;CREATE TEMP TABLE compat_quarantine(entity text,source_id text,code text) ON COMMIT DROP');
  for(const row of report.candidates)await c.query('INSERT INTO compat_candidates VALUES($1,$2,$3)',[row.sourceId,row.kind,row.memberId]);
  for(const row of report.findings)await c.query('INSERT INTO compat_quarantine VALUES($1,$2,$3)',[row.entity,row.ref,row.code]);
  result=(await c.query('SELECT (SELECT count(*)::int FROM compat_candidates) AS candidates,(SELECT count(*)::int FROM compat_quarantine) AS quarantined')).rows[0];
 }finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
 const after=await db.financialSnapshot();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('REHEARSAL_CHANGED_EXISTING_DATA');
 return {...result,rolledBack:true,legacyAndBusinessDataUnchanged:true};
}
module.exports={rehearse};
