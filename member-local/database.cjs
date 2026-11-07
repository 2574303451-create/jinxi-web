const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {Client}=require('pg');
const {spawnSync}=require('node:child_process');
const {promisify}=require('node:util');
const {cleanEnv}=require('../scripts/run-clean.cjs');
const {hashPassword}=require('../netlify/functions/_shared/password');
const {fingerprint}=require('../netlify/functions/_shared/function-security');
const {localSettings}=require('./identity.cjs');
const derive=promisify(crypto.pbkdf2);
function connection(settings,user,password,database=settings.database){return new Client({host:'127.0.0.1',port:55436,user,password,database,connectionTimeoutMillis:2000,application_name:'jinxi-member-local-synthetic'});}
async function freshDatabase(pgBin){
  if(!path.isAbsolute(pgBin))throw Error('EXPLICIT_LOCAL_PG_BIN_REQUIRED');
  const extension=process.platform==='win32'?'.exe':'';
  for(const name of ['initdb','pg_ctl','postgres'])if(!fs.existsSync(path.join(pgBin,name+extension)))throw Error('LOCAL_PG_TOOLS_MISSING');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-member-local-')),data=path.join(folder,'data');
  const adminPassword=crypto.randomBytes(32).toString('hex'),passwordFile=path.join(folder,'bootstrap-password.private');
  fs.writeFileSync(passwordFile,adminPassword,{flag:'wx',mode:0o600});
  let started=false;
  function pg(name,args){const r=spawnSync(path.join(pgBin,name+extension),args,{env:cleanEnv(),encoding:'utf8',timeout:30000,windowsHide:true});if(r.status!==0)throw Error('LOCAL_PG_'+name.toUpperCase()+'_FAILED');}
  const settings={kind:'jinxi-member-local-v1',host:'127.0.0.1',port:55436,database:'jinxi_member_local',user:'jinxi_member_session',password:crypto.randomBytes(32).toString('hex'),origin:'https://127.0.0.1:3069',environmentId:crypto.randomUUID(),fingerprint:'0'.repeat(64),csrfKey:crypto.randomBytes(32).toString('hex'),rateKey:crypto.randomBytes(32).toString('hex')};
  async function admin(){const c=connection(settings,'jinxi_member_admin',adminPassword);await c.connect();return c;}
  async function stop(){if(started){pg('pg_ctl',['-D',data,'-m','fast','-w','stop']);started=false;}}
  try{
    pg('initdb',['-D',data,'-U','jinxi_member_admin','--auth-local=trust','--auth-host=scram-sha-256','--pwfile='+passwordFile,'--encoding=UTF8','--no-locale']);
    pg('pg_ctl',['-D',data,'-l',path.join(folder,'postgres.log'),'-o','-h 127.0.0.1 -p 55436','-w','start']);started=true;
    const first=connection(settings,'jinxi_member_admin',adminPassword,'postgres');await first.connect();try{await first.query('CREATE DATABASE jinxi_member_local');}finally{await first.end();}
    const c=await admin();try{
      const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
      // Exercise the actual read-only guard without approval, before any role/DDL.
      // SQL NULL must refuse too, rather than quietly making IF evaluate unknown.
      let refused=false;
      try{await c.query(schema.slice(0,schema.indexOf('CREATE ROLE')));}catch(error){if(error.code==='P0001')refused=true;else throw error;}finally{await c.query('ROLLBACK');}
      if(!refused)throw Error('LOCAL_MISSING_APPROVAL_NOT_REJECTED');
      await c.query("SELECT set_config('jinxi_member.local_approval','fresh-synthetic-v1',false)");
      await c.query(schema);
      await c.query('INSERT INTO jinxi_guard.environment_registration VALUES(1,$1,\'synthetic-local\')',[settings.environmentId]);
      const identity=(await c.query('SELECT * FROM jinxi_guard.environment_identity()')).rows[0];
      settings.fingerprint=fingerprint(identity.cluster_id,identity.database_oid,identity.database_name);
      // Random synthetic-only password consists of validated hex; never a real key or arbitrary SQL input.
      if(!/^[a-f0-9]{64}$/.test(settings.password))throw Error('SYNTHETIC_ROLE_PASSWORD_INVALID');
      await c.query("ALTER ROLE jinxi_member_session LOGIN PASSWORD '"+settings.password+"'");
    }finally{await c.end();}
    localSettings(settings);
    async function connect(value=settings){localSettings(value);if(value.fingerprint!==settings.fingerprint||value.environmentId!==settings.environmentId)throw Error('LOCAL_RESOURCE_CHANGED');const client=connection(value,value.user,value.password);await client.connect();return client;}
    async function seed(){
      const c=await admin(),accounts=[];
      try{
        await c.query('BEGIN');
        await c.query('TRUNCATE b2_lab.member_sessions_v2,b2_lab.member_session_limits_v2,b2_lab.member_account_security_v2,b2_lab.guild_member_accounts,b2_lab.guild_member_profiles RESTART IDENTITY');
        const definitions=[['normal',false,false,true],['first',true,false,true],['locked',false,true,true],['disabled',false,false,false],['same',false,false,true],['unsupported',false,false,true]];
        for(const [kind,forceReset,locked,active]of definitions){
          const password=crypto.randomBytes(18).toString('base64url')+'A9!',employeeNo='SYNTHETIC-'+kind;
          let encoded=await hashPassword(password);
          if(kind==='first'){const salt=crypto.randomBytes(16).toString('hex');encoded=['pbkdf2_sha256','200000',salt,(await derive(password,salt,200000,32,'sha256')).toString('hex')].join('$');}
          if(kind==='unsupported')encoded='unsupported-synthetic-format';
          await c.query("INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,join_date,source,is_active) VALUES($1,$2,$3,'2018-02-10','synthetic-member-local',$4)",[employeeNo,'合成档案 '+kind,kind==='same'?'合成伙伴 normal':'合成伙伴 '+kind,active]);
          const a=(await c.query('INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,force_reset_password,is_locked) VALUES($1,$2,$3,$4,$5) RETURNING id',[employeeNo,'synthetic-'+kind,encoded,forceReset,locked])).rows[0];
          const s=(await c.query('INSERT INTO b2_lab.member_account_security_v2(account_id) VALUES($1) RETURNING member_id',[a.id])).rows[0];
          accounts.push({kind,account:'synthetic-'+kind,password,memberId:s.member_id,accountId:a.id,employeeNo});
        }
        await c.query('COMMIT');return accounts;
      }catch(error){await c.query('ROLLBACK');throw error;}finally{await c.end();}
    }
    return {folder,settings,admin,connect,seed,stop,missingApprovalGuardTested:true};
  }catch(error){await stop();throw error;}
}
module.exports={freshDatabase};
