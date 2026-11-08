const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Client}=require('pg');
const {freshAttendance}=require('../attendance-local/database.cjs'),{localSettings}=require('../member-local/identity.cjs');
async function freshPoints(pgBin){
 const db=await freshAttendance(pgBin);
 try{
  const password=crypto.randomBytes(32).toString('hex'),c=await db.admin();let fixtures;
  try{
   const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'),invariants=fs.readFileSync(path.join(__dirname,'invariants.sql'),'utf8');let refused=false;
   try{await c.query(schema.slice(0,schema.indexOf('CREATE ROLE')));}catch(e){if(e.code==='P0001')refused=true;else throw e;}finally{await c.query('ROLLBACK');}
   if(!refused)throw Error('POINTS_APPROVAL_GUARD_FAILED');
   await c.query("SELECT set_config('points.local_approval','checkpoint4-synthetic-v1',false)");await c.query(schema+invariants);
   if(!/^[a-f0-9]{64}$/.test(password))throw Error('SYNTHETIC_PASSWORD_INVALID');await c.query("ALTER ROLE jinxi_points_app LOGIN PASSWORD '"+password+"'");
   await c.query("SELECT set_config('points.actor',$1,false)",[db.accounts.admin.memberId]);
   const rule=(await c.query("INSERT INTO points_lab.rules(code,version,day1,day3,day7,daily_cap,total_cap,starts_at,ends_at,status) VALUES('SYNTHETIC.checkin',1,1,2,3,100,1000,'1900-01-01T00:00:00Z','2199-12-31T00:00:00Z','enabled') RETURNING id")).rows[0];
   const item=(await c.query("INSERT INTO points_lab.catalogue(name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) VALUES('虚构纸星（仅合成）',2,3,3,2,0,'1900-01-01T00:00:00Z','2199-12-31T00:00:00Z','enabled') RETURNING id")).rows[0];fixtures={ruleId:rule.id,itemId:item.id};
   await c.query("INSERT INTO points_legacy.point_account VALUES('synthetic-normal',314,324,10)");
   await c.query("INSERT INTO points_legacy.point_ledger VALUES(1,'synthetic-normal','old-synthetic-award',1,324),(2,'synthetic-normal','old-synthetic-spend',2,10)");
   await c.query("INSERT INTO points_legacy.point_rule VALUES('old-synthetic',1,3,'inactive','2020-01-01T00:00:00Z','2021-01-01T00:00:00Z')");
   await c.query("INSERT INTO points_legacy.point_redeem_order VALUES('old-synthetic-order','synthetic-normal','fictional-legacy',10,'cancelled')");
  }finally{await c.end();}
  async function connectPoints(){localSettings(db.settings,{});const c=new Client({host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_points_app',password,connectionTimeoutMillis:2000,application_name:'jinxi-points-local-only'});await c.connect();return c;}
  async function financialSnapshot(){const prior=await db.financialSnapshot(),c=await db.admin();try{return {...prior,oldPointAccount:(await c.query('SELECT * FROM points_legacy.point_account ORDER BY user_id')).rows,oldPointLedger:(await c.query('SELECT * FROM points_legacy.point_ledger ORDER BY id')).rows,oldPointRules:(await c.query('SELECT * FROM points_legacy.point_rule ORDER BY rule_code')).rows,oldOrders:(await c.query('SELECT * FROM points_legacy.point_redeem_order ORDER BY order_no')).rows};}finally{await c.end();}}
  return {...db,fixtures,connectPoints,financialSnapshot};
 }catch(e){await db.stop();throw e;}
}
module.exports={freshPoints};
