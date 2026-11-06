const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {Client}=require('pg');
const {fingerprint}=require('../../netlify/functions/_shared/function-security');
const {fixture}=require('./test-resource.cjs');
const {digest}=require('../../netlify/functions/_shared/test-resource');
function settings(){
 const file=process.env.JINXI_F03_LOCAL_MANIFEST;
 if(typeof file!=='string'||!path.resolve(file).startsWith(path.join(os.tmpdir(),'jinxi-f03-f05-')))throw Error('FRESH_LOCAL_MANIFEST_REQUIRED');
 const m=JSON.parse(fs.readFileSync(file,'utf8'));
 if(m.kind!=='jinxi-f03-disposable-v1'||m.host!=='127.0.0.1'||m.port!==55435||m.user!=='jinxi_f03_admin'||m.database!=='neondb'||path.dirname(path.resolve(file))!==m.folder||!fs.existsSync(path.join(m.folder,'data/postmaster.pid')))throw Error('LOCAL_TARGET_REJECTED');
 return m;
}
async function connect(user){const m=settings();if(user&&!['jinxi_test_reader','jinxi_test_writer'].includes(user))throw Error('LOCAL_ROLE_REJECTED');const c=new Client({host:m.host,port:m.port,user:user||m.user,database:m.database,connectionTimeoutMillis:2000});await c.connect();return c;}
const sql=name=>fs.readFileSync(path.resolve(__dirname,'../../test-environment/sql/'+name+'.sql'),'utf8');
async function approval(c,environmentId=crypto.randomUUID()){
 const a=(await c.query("SELECT (SELECT system_identifier::text FROM pg_control_system()) AS cluster_id,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid,current_database() AS database_name")).rows[0];
 for(const [key,value]of Object.entries({approval:'synthetic-test-v1',project_id:'project-synthetic-local',branch_id:'br-synthetic-local',endpoint_id:'ep-synthetic-local',expected_cluster_id:a.cluster_id,expected_database_oid:a.database_oid,environment_id:environmentId}))await c.query('SELECT set_config($1,$2,false)',['jinxi_test.'+key,value]);
 return{...a,environmentId};
}
function resources(identity){const f=fixture();f.resources.binding.environmentId=identity.environmentId;f.resources.binding.fingerprint=fingerprint(identity.cluster_id,identity.database_oid,identity.database_name);f.resources.deploy.bindingDigest=digest(f.resources.binding);return f;}
function adapter(c){return{async transaction(fn,options){const tx={query:(text,values=[])=>({text,values})},queries=typeof fn==='function'?fn(tx):fn;await c.query(options?.readOnly?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');try{const out=[];for(const q of queries)out.push((await c.query(q.text,q.values)).rows);await c.query('COMMIT');return out}catch(e){await c.query('ROLLBACK');throw e}}};}
module.exports={settings,connect,sql,approval,resources,adapter};
