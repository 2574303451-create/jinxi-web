const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('pg');
const {freshDatabase}=require('../member-local/database.cjs');
const {localSettings}=require('../member-local/identity.cjs');
const {hashPassword}=require('../netlify/functions/_shared/password');
async function freshCommunity(pgBin){
 const db=await freshDatabase(pgBin);
 try{
  const accounts=Object.fromEntries((await db.seed()).map(a=>[a.kind,{...a,nickname:a.kind==='same'?'合成伙伴 normal':'合成伙伴 '+a.kind}]));
  const c=await db.admin(),password=crypto.randomBytes(32).toString('hex');
  try{
   for(const kind of ['reviewer','admin']){
    const pass=crypto.randomBytes(18).toString('base64url')+'A9!',employeeNo='SYNTHETIC-'+kind;
    await c.query('INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,source) VALUES($1,$2,$2,$3)',[employeeNo,'合成'+kind,'synthetic-community']);
    const a=(await c.query('INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,force_reset_password) VALUES($1,$2,$3,false) RETURNING id',[employeeNo,'synthetic-'+kind,await hashPassword(pass)])).rows[0];
    const m=(await c.query('INSERT INTO b2_lab.member_account_security_v2(account_id) VALUES($1) RETURNING member_id',[a.id])).rows[0];
    accounts[kind]={kind,account:'synthetic-'+kind,password:pass,memberId:m.member_id,accountId:a.id,employeeNo,nickname:'合成'+kind};
   }
   const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
   let refused=false;try{await c.query(sql.slice(0,sql.indexOf('CREATE ROLE')));}catch(e){if(e.code==='P0001')refused=true;else throw e;}finally{await c.query('ROLLBACK');}
   if(!refused)throw Error('COMMUNITY_APPROVAL_GUARD_FAILED');
   await c.query("SELECT set_config('community.local_approval','checkpoint2-synthetic-v1',false)");await c.query(sql);
   if(!/^[a-f0-9]{64}$/.test(password))throw Error('SYNTHETIC_PASSWORD_INVALID');
   await c.query("ALTER ROLE jinxi_community_app LOGIN PASSWORD '"+password+"'");
   for(const kind of ['reviewer','admin'])await c.query('INSERT INTO community_lab.member_roles VALUES($1,$2)',[accounts[kind].memberId,kind]);
   await c.query("INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status,legacy) VALUES('message',NULL,$1,$2,'published',true)",[accounts.normal.nickname,{content:'待核实归属的合成历史留言',category:'闲聊',color:'#2360f5'}]);
   await c.query("INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status,legacy) VALUES('guide',NULL,$1,$2,'published',true)",[accounts.normal.nickname,{title:'待核实合成历史攻略',content:'合成历史正文',category:'PVE',difficulty:1,tags:[],mediaFiles:[]}]);
  }finally{await c.end();}
  async function connectBusiness(){
   localSettings(db.settings,{});
   const c=new Client({host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_community_app',password,connectionTimeoutMillis:2000,application_name:'jinxi-community-local-only'});
   await c.connect();return c;
  }
  return {...db,accounts,connectBusiness};
 }catch(error){await db.stop();throw error;}
}
module.exports={freshCommunity};
