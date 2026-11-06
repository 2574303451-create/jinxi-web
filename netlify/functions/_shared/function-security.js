const {AsyncLocalStorage}=require('node:async_hooks');
const crypto=require('node:crypto');
const {testDatabaseConfig,ResourceError,PROTECTED_SITE_ID}=require('./test-resource');
const requestScope=new AsyncLocalStorage();
const POLICIES=Object.freeze({
  'strategies':'public-read','guide-video-stats':'public-read','messages':'public-read',
  'announcements':'public-read','sponsorship':'public-read',
  'auth-login':'closed-identity','auth-change-password':'closed-identity',
  'points':'closed-identity','checkin':'closed-identity',
  'message-actions':'closed-write','strategy-actions':'closed-write',
  'leaderboard':'closed-private-projection','points-board':'closed-private-projection',
});
class IsolationError extends Error {
  constructor(code){super('Database isolation unavailable');this.name='IsolationError';this.code=code;}
}
const reject=code=>{throw new IsolationError(code)};
const fingerprint=(clusterId,databaseOid,database)=>crypto.createHash('sha256').update([clusterId,databaseOid,database].join('\0')).digest('hex');
function databaseConfig(env,mode='public-read',resources){
  if(env.JINXI_RESOURCE_ENVIRONMENT==='synthetic-test')return testDatabaseConfig(env,mode,resources);
  // A hosted non-production site cannot opt into the legacy production path.
  if(env.SITE_ID&&env.SITE_ID!==PROTECTED_SITE_ID)reject('HOSTED_RESOURCE_BINDING_REQUIRED');
  const context=env.JINXI_RUNTIME_CONTEXT;
  if(!['production','deploy-preview','branch-deploy','local'].includes(context))reject('CONTEXT_MISSING_OR_UNKNOWN');
  if(context!=='local'&&(context!=='production'||env.SITE_ID!==PROTECTED_SITE_ID||env.JINXI_RESOURCE_ENVIRONMENT!=='production'))reject('HOSTED_RESOURCE_BINDING_REQUIRED');
  if(env.CONTEXT&&env.CONTEXT!==context)reject('CONTEXT_CONFLICT');
  if(mode==='session-lab'&&context!=='local')reject('LAB_IS_LOCAL_ONLY');
  const prefix=context==='production'?'PRODUCTION':context==='local'?'LOCAL':'PREVIEW';
  const suffix=mode==='session-lab'?'SESSION':'READ';
  let policy;try{policy=JSON.parse(env[`JINXI_${prefix}_${suffix}_POLICY`]||'null')}catch{reject('POLICY_INVALID')}
  if(!policy||policy.context!==context||!policy.role||!policy.environmentId||!/^[a-f0-9]{64}$/.test(policy.fingerprint||''))reject('POLICY_MISSING_OR_WRONG_CONTEXT');
  const classification=context==='production'?'production':context==='local'?'synthetic-local':'synthetic-test';
  if(policy.classification!==classification)reject('CLASSIFICATION_MISMATCH');
  if(context!=='local'&&env.JINXI_CLOUD_ISOLATION_APPROVAL!=='approved')reject('CLOUD_ISOLATION_UNVERIFIED');
  const value=env[`JINXI_${prefix}_${suffix}_DATABASE_URL`];
  if(typeof value!=='string'||!value)reject('DATABASE_CONFIGURATION_MISSING');
  let url;try{url=new URL(value)}catch{reject('DATABASE_CONFIGURATION_INVALID')}
  if(!['postgres:','postgresql:'].includes(url.protocol)||decodeURIComponent(url.username)!==policy.role)reject('DATABASE_ROLE_MISMATCH');
  if(context==='local'&&(url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/jinxi_005s_b1_test'))reject('LOCAL_TARGET_NOT_AUTHORIZED');
  if(mode==='session-lab'&&policy.allowedSchema!=='b2_lab')reject('LAB_SCHEMA_MISMATCH');
  return {context,policy,url:value,mode};
}
// Actual cluster/database identity comes from a fixed, read-only SECURITY DEFINER
// function owned by the test administrator; runtime roles cannot relabel it.
const ATTESTATION_SQL=`/* jinxi database identity and effective permissions */
WITH relation_scope AS (
 SELECT c.oid,c.relkind,
   (c.relkind='r' AND NOT EXISTS(SELECT 1 FROM pg_inherits h WHERE h.inhparent=c.oid OR h.inhrelid=c.oid)
      AND (CASE WHEN $1='b2_lab' THEN n.nspname='b2_lab' AND c.relname IN(
        'guild_member_accounts','guild_member_profiles','sessions','rate_limits','point_account','point_catalog','point_rule','point_ledger')
        ELSE n.nspname='public' AND c.relname IN('strategies','messages','announcements','guild_sponsorship_entries') END))
    OR ($1='b2_lab' AND n.nspname='b2_lab' AND c.relkind='S' AND c.relname='point_ledger_id_seq') AS in_scope
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema'
)
SELECT i.*,current_user AS role,session_user AS session_role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
 current_setting('default_transaction_read_only') AS default_read_only,
 EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS role_memberships,
 has_database_privilege(r.oid,(SELECT oid FROM pg_database WHERE datname=current_database()),'CREATE') AS database_create,
 has_database_privilege(r.oid,(SELECT oid FROM pg_database WHERE datname=current_database()),'TEMP') AS database_temp,
 EXISTS(SELECT 1 FROM pg_namespace n WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND has_schema_privilege(r.oid,n.oid,'CREATE')) AS schema_create,
 (EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND c.relowner=r.oid) OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND p.proowner=r.oid)) AS owns_objects,
 EXISTS(SELECT 1 FROM relation_scope c WHERE CASE
   WHEN c.relkind IN('r','p','v','m','f') THEN
     (NOT ($1='b2_lab' AND c.in_scope) AND (has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE,REFERENCES')))
     OR (CASE WHEN current_setting('server_version_num')::int>=170000 THEN has_table_privilege(r.oid,c.oid,'MAINTAIN') ELSE false END)
   WHEN c.relkind='S' THEN NOT c.in_scope AND has_sequence_privilege(r.oid,c.oid,'USAGE,UPDATE')
   ELSE false END) AS writes_outside_scope,
 EXISTS(SELECT 1 FROM relation_scope c WHERE NOT c.in_scope AND CASE
   WHEN c.relkind IN('r','p','v','m','f') THEN has_table_privilege(r.oid,c.oid,'SELECT') OR has_any_column_privilege(r.oid,c.oid,'SELECT')
   WHEN c.relkind='S' THEN has_sequence_privilege(r.oid,c.oid,'SELECT') ELSE false END) AS reads_outside_scope,
 EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef AND left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND p.oid<>'jinxi_guard.environment_identity()'::regprocedure AND has_function_privilege(r.oid,p.oid,'EXECUTE')) AS unsafe_definer_access
FROM jinxi_guard.environment_identity() i JOIN pg_roles r ON r.rolname=current_user`;
function validateProof(config,rows){
  if(!Array.isArray(rows)||rows.length!==1)reject('IDENTITY_PROOF_MISSING');
  const p=rows[0],expected=config.policy;
  if(p.environment_id!==expected.environmentId||p.classification!==expected.classification||p.role!==expected.role||fingerprint(p.cluster_id,p.database_oid,p.database_name)!==expected.fingerprint)reject('ACTUAL_DATABASE_IDENTITY_MISMATCH');
  if(config.resourceEnvironment==='synthetic-test'&&(p.session_role!==expected.role||p.database_temp!==false))reject('TEST_SESSION_OR_TEMP_PERMISSION_UNSAFE');
  for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','role_memberships','database_create','schema_create','owns_objects','writes_outside_scope','reads_outside_scope','unsafe_definer_access'])if(p[key]!==false)reject('DATABASE_PERMISSION_UNSAFE');
  if(config.mode==='public-read'&&p.default_read_only!=='on')reject('READ_ROLE_NOT_READ_ONLY');
}
function guardedDatabase(env,factory,mode='public-read',resources){
  const config=databaseConfig(env,mode,resources);let pending,raw;
  async function verified(){
    if(!pending)pending=(async()=>{
      raw=factory(config.url);
      const [proof]=await raw.transaction(tx=>[tx.query("SELECT set_config('statement_timeout',$1,true)",['3000']),tx.query(ATTESTATION_SQL,[mode==='session-lab'?'b2_lab':''])],{readOnly:true,isolationLevel:'RepeatableRead',fetchOptions:{signal:AbortSignal.timeout(5000)}}).then(rows=>rows.slice(1));
      validateProof(config,proof);return raw;
    })();
    return pending;
  }
  const sql=async(strings,...values)=>{
    if(!Array.isArray(strings)||!Object.hasOwn(strings,'raw'))throw Error('Parameterized template required');
    return sql.query(strings.map((s,i)=>s+(i<values.length?'$'+(i+1):'')).join(''),values);
  };
  sql.query=async(text,values=[])=>{
    const client=await verified();
    const rows=await client.transaction(tx=>[tx.query("SELECT set_config('statement_timeout',$1,true)",['3000']),tx.query(text,values)],{readOnly:mode==='public-read',isolationLevel:'RepeatableRead',fetchOptions:{signal:AbortSignal.timeout(5000)}});
    return rows[1];
  };
  sql.transaction=async(queries,options)=>{
    if(mode==='public-read'&&options?.readOnly!==true)reject('READ_TRANSACTION_REQUIRED');
    return (await verified()).transaction(queries,options);
  };
  return sql;
}
function response(statusCode,error,code){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify({error,code})};}
function withFunctionSecurity(name,factory,env,handler,resources){
  if(!Object.hasOwn(POLICIES,name))throw Error('Unregistered Function');
  return async(event)=>{
    const policy=POLICIES[name];
    if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:{'Cache-Control':'no-store'},body:''};
    if(policy!=='public-read')return response(policy==='closed-identity'?401:403,'此接口正在进行服务器身份安全升级，暂不接受旧身份或写入。','LEGACY_ENDPOINT_DISABLED');
    if(event.httpMethod!=='GET')return response(name==='guide-video-stats'?405:403,'内容写入正在安全升级，原有草稿请保留。','LEGACY_WRITE_DISABLED');
    try{
      const sql=guardedDatabase(env,factory,'public-read',resources);
      const result=await requestScope.run(sql,()=>handler(event));
      const headers={...result.headers,'Cache-Control':'no-store'};
      for(const key of Object.keys(headers))if(key.toLowerCase().startsWith('access-control-'))delete headers[key];
      if(result.statusCode>=500&&name!=='guide-video-stats')return response(result.statusCode,'服务暂不可用，请稍后重试。','READ_UNAVAILABLE');
      return {...result,headers};
    }catch(error){
      if(name==='guide-video-stats')return{statusCode:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({contract:'jinxi.guides.video-stats.v1',count:null,countType:'published-valid-url-video-attachments-v1',calculatedAt:null,status:'unavailable',playabilityVerified:false,error:'统计暂不可用'})};
      return response(503,'环境隔离未通过，服务暂不可用。',error instanceof IsolationError||error instanceof ResourceError?error.code:'DATABASE_UNAVAILABLE');
    }
  };
}
function requestDatabase(){const sql=requestScope.getStore();if(!sql)throw new IsolationError('NO_VERIFIED_REQUEST_CONTEXT');return sql;}
function suspendedEndpoint(name,env){
  if(POLICIES[name]==='public-read'||!Object.hasOwn(POLICIES,name))throw Error('Expected a suspended legacy endpoint');
  return withFunctionSecurity(name,null,env,async()=>response(403,'接口未启用','DISABLED'));
}
module.exports={POLICIES,IsolationError,fingerprint,databaseConfig,ATTESTATION_SQL,validateProof,guardedDatabase,withFunctionSecurity,requestDatabase,suspendedEndpoint};
