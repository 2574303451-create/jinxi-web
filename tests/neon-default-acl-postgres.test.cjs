const {test}=require('node:test'),assert=require('node:assert/strict');
const pg=require('./support/test-environment-postgres.cjs');
const {guardedDatabase}=require('../netlify/functions/_shared/function-security');
const defaults=`SELECT pg_get_userbyid(d.defaclrole) AS owner,n.nspname AS schema,d.defaclobjtype AS kind,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 CROSS JOIN LATERAL aclexplode(d.defaclacl) a ORDER BY 1,2,3,4,5,6`;
test('observed Neon platform defaults remain unchanged across TEST lifecycle',async t=>{
 const c=await pg.connect();let reader;
 async function rejected(){await assert.rejects(c.query(pg.sql('01-initialize')),e=>/TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED/.test(e.message));await c.query('ROLLBACK');assert.equal((await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE 'jinxi_test_%'")).rows[0].n,0);}
 try{
  // Synthetic roles and grants in a brand-new local cluster, never a cloud role.
  await c.query('CREATE ROLE cloud_admin NOLOGIN;CREATE ROLE neon_superuser NOLOGIN;CREATE ROLE unapproved_default_reader NOLOGIN;GRANT neon_superuser TO jinxi_f03_admin;ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE,MAINTAIN ON TABLES TO neon_superuser WITH GRANT OPTION;ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO neon_superuser WITH GRANT OPTION');
  const baseline=(await c.query(defaults)).rows,identity=await pg.approval(c);
  await t.test('unexpected grantee is rejected before any TEST role exists',async()=>{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT ON TABLES TO unapproved_default_reader');try{await rejected();}finally{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public REVOKE SELECT ON TABLES FROM unapproved_default_reader');}});
  await t.test('global default grant is not mistaken for the reviewed public template',async()=>{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin GRANT SELECT ON TABLES TO unapproved_default_reader');try{await rejected();}finally{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin REVOKE SELECT ON TABLES FROM unapproved_default_reader');}});
  await t.test('defaults of the actual initializer still reject',async()=>{await c.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO unapproved_default_reader');try{await rejected();}finally{await c.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM unapproved_default_reader');}});
  await t.test('changed grantability still rejects',async()=>{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public REVOKE GRANT OPTION FOR SELECT ON TABLES FROM neon_superuser');try{await rejected();}finally{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT ON TABLES TO neon_superuser WITH GRANT OPTION');}});
  await t.test('incomplete platform privilege set still rejects',async()=>{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public REVOKE MAINTAIN ON TABLES FROM neon_superuser');try{await rejected();}finally{await c.query('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT MAINTAIN ON TABLES TO neon_superuser WITH GRANT OPTION');}});
  assert.deepEqual((await c.query(defaults)).rows,baseline);
  // This must succeed only for the precise observed foreign-creator template.
  await c.query(pg.sql('01-initialize'));
  await t.test('initialization leaves provider defaults byte-for-byte equivalent as metadata',async()=>{assert.deepEqual((await c.query(defaults)).rows,baseline);});
  await t.test('foreign creator defaults do not become grants on new application tables',async()=>{const r=await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relkind='r' AND a.grantee IN('neon_superuser'::regrole,'unapproved_default_reader'::regrole)");assert.equal(r.rows[0].n,0);});
  await c.query(pg.sql('02-seed'));await c.query(pg.sql('03-verify'));await c.query('ALTER ROLE jinxi_test_reader LOGIN');reader=await pg.connect('jinxi_test_reader');
  const f=pg.resources(identity),factory=()=>pg.adapter(reader);
  await t.test('reader identity and authorized reads pass; writes remain denied',async()=>{assert.equal((await guardedDatabase(f.env,factory,'public-read',f.resources).query('SELECT count(*)::int n FROM public.messages'))[0].n,2);await assert.rejects(reader.query("UPDATE public.messages SET content='blocked'"),e=>['25006','42501'].includes(e.code));});
  await t.test('platform template recognition never permits reader role inheritance',async()=>{await c.query('GRANT neon_superuser TO jinxi_test_reader');try{await assert.rejects(guardedDatabase(f.env,factory,'public-read',f.resources).query('SELECT 1'),e=>e.code==='DATABASE_PERMISSION_UNSAFE');}finally{await c.query('REVOKE neon_superuser FROM jinxi_test_reader');}});
  await reader.end();reader=null;
  await t.test('rollback removes only TEST resources and preserves provider grants/roles',async()=>{await c.query(pg.sql('04-rollback'));assert.deepEqual((await c.query(defaults)).rows,baseline);assert.equal((await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname IN('cloud_admin','neon_superuser')")).rows[0].n,2);assert.equal((await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE 'jinxi_test_%'")).rows[0].n,0);});
 }finally{await reader?.end().catch(()=>{});await c.end();}
});
