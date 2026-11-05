// Only the already-authorized disposable local DB. Never loads .env or production URLs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Client}=require('pg');
const {connect:adminConnect}=require('./postgres.cjs');
const {fingerprint}=require('../../netlify/functions/_shared/function-security');
const runtimeDir=path.join(process.env.TEMP||process.env.TMPDIR||'/tmp','jinxi-b2-security');
const runtimeFile=path.join(runtimeDir,'runtime.json');
async function setup(){
 const admin=await adminConnect('admin');
 try{
  const a=(await admin.query("SELECT current_database() AS database,host(inet_server_addr()) AS host,inet_server_port() AS port,(SELECT system_identifier::text FROM pg_control_system()) AS cluster_id,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid")).rows[0];
  const githubService=process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&process.env.JINXI_CI_PG==='synthetic-55433'&&a.port===5432&&/^172\.(1[6-9]|2\d|3[01])\./.test(a.host);
  if(a.database!=='jinxi_005s_b1_test'||!githubService&&(a.host!=='127.0.0.1'||a.port!==55433))throw Error('Unauthorized local DB');
  if(fs.existsSync(runtimeFile)){
   const saved=JSON.parse(fs.readFileSync(runtimeFile));
   if(saved.fingerprint!==fingerprint(a.cluster_id,a.database_oid,a.database))throw Error('Disposable instance identity changed; inspect before reuse');
   await admin.query('GRANT SELECT ON public.strategies TO jinxi_b2_reader');
   return saved;
  }
  const collision=await admin.query("SELECT nspname FROM pg_namespace WHERE nspname IN('jinxi_guard','b2_lab','b2_forbidden')");
  if(collision.rowCount)throw Error('Unrecognized B2 schemas already exist');
  const readPassword=crypto.randomBytes(24).toString('hex'),sessionPassword=crypto.randomBytes(24).toString('hex'),environmentId=crypto.randomUUID();
  await admin.query('BEGIN');
  try{
   await admin.query(`CREATE ROLE jinxi_b2_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    CREATE ROLE jinxi_b2_reader LOGIN PASSWORD '${readPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    CREATE ROLE jinxi_b2_session LOGIN PASSWORD '${sessionPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    ALTER ROLE jinxi_b2_reader SET default_transaction_read_only=on;
    CREATE SCHEMA jinxi_guard AUTHORIZATION jinxi_b2_owner;
    CREATE SCHEMA b2_lab AUTHORIZATION jinxi_b2_owner;
    CREATE SCHEMA b2_forbidden AUTHORIZATION jinxi_b2_owner;
    CREATE TABLE jinxi_guard.environment_registration(id smallint PRIMARY KEY CHECK(id=1),environment_id uuid NOT NULL,classification text NOT NULL);
    ALTER TABLE jinxi_guard.environment_registration OWNER TO jinxi_b2_owner;
    CREATE TABLE b2_forbidden.production_like_canary(id int PRIMARY KEY,content text NOT NULL);
    INSERT INTO b2_forbidden.production_like_canary VALUES(1,'Synthetic protected resource, never production');
    ALTER TABLE b2_forbidden.production_like_canary OWNER TO jinxi_b2_owner;`);
   await admin.query("INSERT INTO jinxi_guard.environment_registration VALUES(1,$1,'synthetic-local')",[environmentId]);
   await admin.query(`CREATE FUNCTION jinxi_guard.environment_identity() RETURNS TABLE(environment_id text,classification text,cluster_id text,database_oid text,database_name text)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $f$
    SELECT e.environment_id::text,e.classification,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),current_database()::text FROM jinxi_guard.environment_registration e WHERE e.id=1 $f$;
    REVOKE ALL ON FUNCTION jinxi_guard.environment_identity() FROM PUBLIC;
    GRANT USAGE ON SCHEMA jinxi_guard TO jinxi_b2_reader,jinxi_b2_session;
    GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity() TO jinxi_b2_reader,jinxi_b2_session;
    GRANT USAGE ON SCHEMA public TO jinxi_b2_reader;
    GRANT SELECT ON public.strategies TO jinxi_b2_reader;
    GRANT USAGE ON SCHEMA b2_lab TO jinxi_b2_session;`);
   await admin.query('COMMIT');
  }catch(e){await admin.query('ROLLBACK');throw e}
  const value={host:"127.0.0.1",port:55433,database:a.database,environmentId,fingerprint:fingerprint(a.cluster_id,a.database_oid,a.database),reader:{user:'jinxi_b2_reader',password:readPassword},session:{user:'jinxi_b2_session',password:sessionPassword},csrfSecret:crypto.randomBytes(32).toString('hex'),rateSecret:crypto.randomBytes(32).toString('hex')};
  fs.mkdirSync(runtimeDir,{recursive:true});fs.writeFileSync(runtimeFile,JSON.stringify(value),{flag:'wx',mode:0o600});return value;
 }finally{await admin.end()}
}
function read(){const s=JSON.parse(fs.readFileSync(runtimeFile));if(s.host!=='127.0.0.1'||s.port!==55433||s.database!=='jinxi_005s_b1_test'||s.reader.user!=='jinxi_b2_reader'||s.session.user!=='jinxi_b2_session')throw Error('Invalid B2 local runtime');return s}
function environment(mode='public-read'){
 const s=read(),role=mode==='session-lab'?s.session:s.reader,suffix=mode==='session-lab'?'SESSION':'READ';
 return {JINXI_RUNTIME_CONTEXT:'local',[`JINXI_LOCAL_${suffix}_DATABASE_URL`]:`postgresql://${role.user}:${role.password}@${s.host}:${s.port}/${s.database}`,[`JINXI_LOCAL_${suffix}_POLICY`]:JSON.stringify({context:'local',classification:'synthetic-local',environmentId:s.environmentId,fingerprint:s.fingerprint,role:role.user,allowedSchema:mode==='session-lab'?'b2_lab':''}),JINXI_SESSION_ORIGIN:'https://localhost:3048',JINXI_SESSION_CSRF_SECRET:s.csrfSecret,JINXI_SESSION_RATE_SECRET:s.rateSecret};
}
async function connect(role='reader'){const s=read();if(!['reader','session'].includes(role))throw Error('Invalid B2 role');const c=new Client({host:s.host,port:s.port,database:s.database,...s[role],connectionTimeoutMillis:2000,application_name:'jinxi-b2-synthetic-only'});await c.connect();return c}
function adapter(c){return{async transaction(fn,options){const tx={query:(text,values=[])=>({text,values})},queries=typeof fn==='function'?fn(tx):fn;await c.query(options?.readOnly?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');try{const rows=[];for(const q of queries)rows.push((await c.query(q.text,q.values)).rows);await c.query('COMMIT');return rows}catch(e){await c.query('ROLLBACK');throw e}}}}
module.exports={setup,read,environment,connect,adapter,runtimeFile};
