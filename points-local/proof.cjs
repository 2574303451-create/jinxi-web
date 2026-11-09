const {ATTESTATION_SQL,validateProof}=require('../netlify/functions/_shared/function-security');
const resource=require('../service-adapter/resource.cjs');
const auth={guild_member_accounts:{select:['id','employee_no','is_locked','force_reset_password'],update:['last_login_at']},guild_member_profiles:{select:['employee_no','nickname','is_active'],update:[]},member_account_security_v2:{select:['account_id','member_id','auth_version','disabled_at'],update:[]},member_sessions_v2:{select:['account_id','token_hash','csrf_hash','csrf_key_id','auth_version','expires_at','idle_expires_at','revoked_at','last_seen_at'],update:['last_seen_at']}};
const business={
 mutex:{insert:[],update:['touched'],rls:false},rules:{insert:['code','version','day1','day3','day7','daily_cap','total_cap','starts_at','ends_at','status'],update:['status'],rls:false},
 catalogue:{insert:['name','unit_cost','stock_total','available','per_member_limit','min_earned','starts_at','ends_at','status'],update:['available','status'],rls:false},
 accounts:{insert:['member_id'],update:['balance','earned','spent','refunds','reversed','entries','listed'],rls:true},
 orders:{insert:['member_id','item_id','quantity','unit_cost','cost'],update:['status','charge_id'],rls:true},
 ledger:{insert:['member_id','entry_no','kind','biz_id','direction','point_delta','before_balance','after_balance','event_id','rule_id','order_id','origin_id'],update:[],rls:true},
 settlements:{insert:['event_id','member_id','rule_id','rule_code','rule_version','amount','business_date','streak','ledger_id'],update:[],rls:true},
 inventory:{insert:['order_id','item_id','kind','quantity'],update:[],rls:true},ranking:{insert:['member_id','public_id','net_earned','balance','listed'],update:['net_earned','balance','listed'],rls:true},
 requests:{insert:['actor_id','request_id','request_hash','response'],update:[],rls:true},audit:{insert:['actor_id','request_id','code','event_id'],update:[],rls:true}
};
const relation="WITH relation_scope AS (SELECT c.oid,c.relkind,(c.relkind='r' AND NOT EXISTS(SELECT 1 FROM pg_inherits h WHERE h.inhparent=c.oid OR h.inhrelid=c.oid) AND ((n.nspname='b2_lab' AND c.relname IN('guild_member_accounts','guild_member_profiles','member_account_security_v2','member_sessions_v2')) OR (n.nspname='attendance_lab' AND c.relname IN('clock','records','reward_events')) OR (n.nspname='community_lab' AND c.relname='member_roles') OR (n.nspname='points_lab' AND c.relname IN('mutex','rules','catalogue','accounts','orders','ledger','settlements','inventory','ranking','requests','audit')))) AS in_scope FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema') SELECT i.*";
const PROOF=ATTESTATION_SQL.replace(/WITH relation_scope AS \([\s\S]*?\)\nSELECT i\.\*/,relation);if(PROOF===ATTESTATION_SQL)throw Error('POINTS_PROOF_TEMPLATE_CHANGED');
const requiredTriggers=['rule_guard','catalogue_guard','account_consistent','ledger_account_consistent','account_ranking','ranking_guard','settlement_source','ledger_source','order_guard','order_consistent','inventory_guard','stock_consistent','movement_stock_consistent','ledger_immutable','settlement_immutable','inventory_immutable','request_immutable'];
async function verify(c,settings){
 const rows=(await c.query(PROOF,['b2_lab'])).rows;validateProof({mode:'points-local',policy:resource.policy(settings,'points')},rows);
 if(rows[0].session_role!=='jinxi_points_app'||rows[0].database_temp!==false||rows[0].database_name!==resource.databaseName(settings))throw Error('POINTS_RESOURCE_REJECTED');
 const address=(await c.query('SELECT host(inet_server_addr()) AS host,inet_server_port() AS port')).rows[0];if(!resource.addressMatches(settings,address))throw Error('POINTS_RESOURCE_REJECTED');
 const permissions=(await c.query("SELECT n.nspname AS schema,c.relname AS name,a.attname AS column,has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AS sel,has_column_privilege(current_user,c.oid,a.attnum,'INSERT') AS ins,has_column_privilege(current_user,c.oid,a.attnum,'UPDATE') AS upd,has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS excess,c.relrowsecurity AS rls,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE n.nspname IN('b2_lab','attendance_lab','community_lab','points_lab') AND c.relkind IN('r','p','v','m','f')")).rows;
 for(const p of permissions){
  if(p.excess||p.relkind!=='r')throw Error('POINTS_PERMISSION_REJECTED');
  if(p.schema==='b2_lab'){const rule=auth[p.name];if(!rule){if(p.sel||p.ins||p.upd)throw Error('POINTS_PERMISSION_REJECTED');}else if(p.sel!==rule.select.includes(p.column)||p.ins||p.upd!==rule.update.includes(p.column))throw Error('POINTS_PERMISSION_REJECTED');}
  else if(p.schema==='points_lab'){const rule=business[p.name];if(!rule||!p.sel||p.ins!==rule.insert.includes(p.column)||p.upd!==rule.update.includes(p.column)||p.rls!==rule.rls)throw Error('POINTS_PERMISSION_REJECTED');}
  else{const allowed=p.schema==='attendance_lab'&&['clock','records','reward_events'].includes(p.name)||p.schema==='community_lab'&&p.name==='member_roles';if(p.sel!==allowed||p.ins||p.upd)throw Error('POINTS_PERMISSION_REJECTED');}
 }
 const triggers=(await c.query("SELECT t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='points_lab' AND NOT t.tgisinternal")).rows;
 if(requiredTriggers.some(name=>!triggers.some(t=>t.tgname===name&&t.tgenabled==='O')))throw Error('POINTS_INVARIANTS_REJECTED');
}
module.exports={verify};
