const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Client}=require('pg');
const {freshPoints}=require('../points-local/database.cjs'),{localSettings}=require('../member-local/identity.cjs');
async function freshOperations(pgBin){
 const db=await freshPoints(pgBin);
 try{
  const password=crypto.randomBytes(32).toString('hex'),c=await db.admin();
  try{
   const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');let refused=false;
   try{await c.query(sql.slice(0,sql.indexOf('CREATE ROLE')));}catch(e){if(e.code==='P0001')refused=true;else throw e;}finally{await c.query('ROLLBACK');}if(!refused)throw Error('OPERATIONS_APPROVAL_GUARD_FAILED');
   await c.query("SELECT set_config('operations.local_approval','checkpoint5-synthetic-v1',false)");await c.query(sql.replace(/COMMIT;\s*$/,'')+fs.readFileSync(path.join(__dirname,'teams.sql'),'utf8'));
   if(!/^[a-f0-9]{64}$/.test(password))throw Error('SYNTHETIC_PASSWORD_INVALID');await c.query("ALTER ROLE jinxi_operations_app LOGIN PASSWORD '"+password+"'");
   await c.query("INSERT INTO operations_legacy.announcements VALUES(1,'未核实归属的合成旧公告','<p>旧结构合成样本，不自动认领</p>','合成旧署名','2020-01-01T00:00Z','2020-01-01T00:00Z')");
   await c.query("INSERT INTO operations_legacy.guild_sponsorship_entries VALUES(1,'同名合成感谢','2020-01-01T00:00Z','2020-01-01T00:00Z'),(2,'同名合成感谢','2020-01-02T00:00Z','2020-01-02T00:00Z')");
  }finally{await c.end();}
  async function connectOperations(){localSettings(db.settings,{});const c=new Client({host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_operations_app',password,connectionTimeoutMillis:2000,application_name:'jinxi-operations-local-only'});await c.connect();return c;}
  async function financialSnapshot(){const original=await db.financialSnapshot(),c=await db.admin();try{return {...original,announcements:(await c.query('SELECT * FROM operations_legacy.announcements ORDER BY id')).rows,sponsorship:(await c.query('SELECT * FROM operations_legacy.guild_sponsorship_entries ORDER BY id')).rows};}finally{await c.end();}}
  return {...db,connectOperations,financialSnapshot};
 }catch(e){await db.stop();throw e;}
}
module.exports={freshOperations};
