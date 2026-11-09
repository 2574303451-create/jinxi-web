const {ATTESTATION_SQL,validateProof}=require('../netlify/functions/_shared/function-security');
const resource=require('../service-adapter/resource.cjs');
const auth={
 guild_member_accounts:{select:['id','employee_no','is_locked','force_reset_password'],update:['last_login_at']},
 guild_member_profiles:{select:['employee_no','nickname','is_active'],update:[]},
 member_account_security_v2:{select:['account_id','member_id','auth_version','disabled_at'],update:[]},
 member_sessions_v2:{select:['account_id','token_hash','csrf_hash','csrf_key_id','auth_version','expires_at','idle_expires_at','revoked_at','last_seen_at'],update:['last_seen_at']}
};
const business={clock:[],records:['member_id'],reward_events:['record_id','member_id'],requests:['member_id','request_id','record_id']};
const relation="WITH relation_scope AS (SELECT c.oid,c.relkind,(c.relkind='r' AND NOT EXISTS(SELECT 1 FROM pg_inherits h WHERE h.inhparent=c.oid OR h.inhrelid=c.oid) AND ((n.nspname='b2_lab' AND c.relname IN('guild_member_accounts','guild_member_profiles','member_account_security_v2','member_sessions_v2')) OR (n.nspname='attendance_lab' AND c.relname IN('clock','records','reward_events','requests')))) AS in_scope FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema') SELECT i.*";
const PROOF=ATTESTATION_SQL.replace(/WITH relation_scope AS \([\s\S]*?\)\nSELECT i\.\*/,relation);
if(PROOF===ATTESTATION_SQL)throw Error('ATTENDANCE_PROOF_TEMPLATE_CHANGED');
async function verify(c,settings){
 const rows=(await c.query(PROOF,['b2_lab'])).rows;
 validateProof({mode:'attendance-local',policy:resource.policy(settings,'attendance')},rows);
 if(rows[0].session_role!=='jinxi_attendance_app'||rows[0].database_temp!==false||rows[0].database_name!==resource.databaseName(settings))throw Error('ATTENDANCE_RESOURCE_REJECTED');
 const address=(await c.query('SELECT host(inet_server_addr()) AS host,inet_server_port() AS port')).rows[0];if(!resource.addressMatches(settings,address))throw Error('ATTENDANCE_RESOURCE_REJECTED');
 const permissions=(await c.query("SELECT n.nspname AS schema,c.relname AS name,a.attname AS column,has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AS sel,has_column_privilege(current_user,c.oid,a.attnum,'INSERT') AS ins,has_column_privilege(current_user,c.oid,a.attnum,'UPDATE') AS upd,has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS excess,c.relrowsecurity AS rls,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE n.nspname IN('b2_lab','attendance_lab') AND c.relkind IN('r','p','v','m','f')")).rows;
 for(const p of permissions){
  if(p.excess||p.relkind!=='r')throw Error('ATTENDANCE_PERMISSION_REJECTED');
  if(p.schema==='b2_lab'){
   const rule=auth[p.name];if(!rule){if(p.sel||p.ins||p.upd)throw Error('ATTENDANCE_PERMISSION_REJECTED');continue;}
   if(p.sel!==rule.select.includes(p.column)||p.ins||p.upd!==rule.update.includes(p.column))throw Error('ATTENDANCE_PERMISSION_REJECTED');
  }else if(!Object.hasOwn(business,p.name)||!p.sel||p.ins!==business[p.name].includes(p.column)||p.upd||p.rls!==(p.name!=='clock'))throw Error('ATTENDANCE_PERMISSION_REJECTED');
 }
}
module.exports={verify};
