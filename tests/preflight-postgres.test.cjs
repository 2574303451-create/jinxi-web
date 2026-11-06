const {test}=require('node:test'),assert=require('node:assert/strict');
const {connect,sql}=require('./support/test-environment-postgres.cjs');
const selects=results=>results.filter(result=>result.command==='SELECT');
const hasColumn=(result,name)=>result.fields.some(field=>field.name===name);
test('Gate 1 preflight is metadata-only, describes effective membership and fails closed',async t=>{
 const c=await connect();
 try{
  await t.test('original transaction exposes only the intended metadata columns',async()=>{
   const results=await c.query(sql('00-preflight'));
   assert(results.every(result=>['BEGIN','SET','SELECT','ROLLBACK'].includes(result.command)));
   const identity=selects(results).find(result=>hasColumn(result,'cluster_id')).rows[0];
   assert.equal(identity.database_name,'neondb');assert(/^\d+$/.test(identity.cluster_id));
   const forbidden=['rolpassword','password_hash','subconninfo','srvoptions','umoptions','query','client_addr'];
   for(const result of selects(results))for(const field of result.fields)assert(!forbidden.includes(field.name));
   assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
  });
  await t.test('unknown views and side-effect functions are listed but never evaluated',async()=>{
   await c.query('CREATE TABLE public.preflight_canary(id int);INSERT INTO public.preflight_canary VALUES(1);CREATE FUNCTION public.preflight_effect() RETURNS int LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.preflight_canary VALUES(2);RETURN 2;END $$;CREATE VIEW public.preflight_unknown_view AS SELECT public.preflight_effect() AS id');
   const results=selects(await c.query(sql('00-preflight')));
   assert(results.find(result=>hasColumn(result,'relkind')).rows.some(row=>row.relname==='preflight_unknown_view'&&row.relkind==='v'));
   assert(results.find(result=>hasColumn(result,'prosecdef')).rows.some(row=>row.proname==='preflight_effect'));
   assert.equal((await c.query('SELECT count(*)::int n FROM public.preflight_canary')).rows[0].n,1);
  });
  await t.test('per-grant INHERIT and SET are distinguishable from role defaults',async()=>{
   await c.query('CREATE ROLE preflight_parent NOLOGIN;CREATE ROLE preflight_member_off NOLOGIN INHERIT;CREATE ROLE preflight_member_on NOLOGIN INHERIT;GRANT preflight_parent TO preflight_member_off WITH INHERIT FALSE,SET FALSE;GRANT preflight_parent TO preflight_member_on WITH INHERIT TRUE,SET TRUE');
   const results=selects(await c.query(sql('00-preflight')));
   const memberships=results.find(result=>hasColumn(result,'granted_role')).rows;
   const off=memberships.find(row=>row.member==='preflight_member_off'),on=memberships.find(row=>row.member==='preflight_member_on');
   assert.equal(off.inherit_option,false);assert.equal(off.set_option,false);
   assert.equal(on.inherit_option,true);assert.equal(on.set_option,true);
   const roles=results.find(result=>hasColumn(result,'rolinherit')).rows;
   assert(roles.filter(row=>row.rolname.startsWith('preflight_member_')).every(row=>row.rolinherit===true));
  });
  await t.test('denied control metadata aborts the transaction until explicit rollback',async()=>{
   await c.query('CREATE ROLE preflight_limited LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;REVOKE EXECUTE ON FUNCTION pg_catalog.pg_control_system() FROM PUBLIC;SET SESSION AUTHORIZATION preflight_limited');
   try{await assert.rejects(c.query(sql('00-preflight')),error=>error.code==='42501');await assert.rejects(c.query('SELECT 1'),error=>error.code==='25P02');}
   finally{await c.query('ROLLBACK');await c.query('RESET SESSION AUTHORIZATION');}
   assert.equal((await c.query('SELECT count(*)::int n FROM public.preflight_canary')).rows[0].n,1);
  });
 }finally{await c.end();}
});
