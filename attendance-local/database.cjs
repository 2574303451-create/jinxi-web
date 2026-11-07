const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('pg');
const {freshCommunity}=require('../community-local/database.cjs');
const {localSettings}=require('../member-local/identity.cjs');
async function freshAttendance(pgBin){
 const db=await freshCommunity(pgBin);
 try{
  const password=crypto.randomBytes(32).toString('hex'),c=await db.admin();
  try{
   const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');let refused=false;
   try{await c.query(sql.slice(0,sql.indexOf('CREATE ROLE')));}catch(e){if(e.code==='P0001')refused=true;else throw e;}finally{await c.query('ROLLBACK');}
   if(!refused)throw Error('ATTENDANCE_APPROVAL_GUARD_FAILED');
   await c.query("SELECT set_config('attendance.local_approval','checkpoint3-synthetic-v1',false)");await c.query(sql);
   if(!/^[a-f0-9]{64}$/.test(password))throw Error('SYNTHETIC_PASSWORD_INVALID');
   await c.query("ALTER ROLE jinxi_attendance_app LOGIN PASSWORD '"+password+"'");
   await c.query("INSERT INTO attendance_legacy.checkin_records VALUES(1,'synthetic-normal',$1,'2024-02-28','2024-02-28T00:00:00Z',3,true,9)",[db.accounts.normal.nickname]);
   await c.query("INSERT INTO attendance_legacy.point_account VALUES('synthetic-normal',314,314,0)");
   await c.query("INSERT INTO attendance_legacy.point_ledger VALUES(1,'synthetic-normal','legacy-synthetic-checkin',3)");
  }finally{await c.end();}
  async function connectAttendance(){localSettings(db.settings,{});const c=new Client({host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_attendance_app',password,connectionTimeoutMillis:2000,application_name:'jinxi-attendance-local-only'});await c.connect();return c;}
  async function setClock(value){
   if(value!==null&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value))throw Error('EXPLICIT_SYNTHETIC_INSTANT_REQUIRED');
   const c=await db.admin();try{await c.query('UPDATE attendance_lab.clock SET synthetic_now=$1 WHERE id=1',[value]);}finally{await c.end();}
  }
  async function financialSnapshot(){const c=await db.admin();try{return {
   disabled:(await c.query('SELECT * FROM business_disabled.points ORDER BY id')).rows,
   legacyRecords:(await c.query('SELECT * FROM attendance_legacy.checkin_records ORDER BY id')).rows,
   pointAccount:(await c.query('SELECT * FROM attendance_legacy.point_account ORDER BY user_id')).rows,
   pointLedger:(await c.query('SELECT * FROM attendance_legacy.point_ledger ORDER BY id')).rows
  };}finally{await c.end();}}
  return {...db,connectAttendance,setClock,financialSnapshot};
 }catch(error){await db.stop();throw error;}
}
module.exports={freshAttendance};
