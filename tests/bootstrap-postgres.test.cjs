const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const pg = require('./support/test-environment-postgres.cjs');
const { buildBootstrap, APPROVED_TARGET } = require('../scripts/prepare-test-bootstrap.cjs');
const { readerFiles } = require('../scripts/prepare-test-reader.cjs');
const { validateProof, fingerprint } = require('../netlify/functions/_shared/function-security');
const { parseOutput } = require('../scripts/run-test-reader-proof.cjs');
const { setReaderPassword,checkScope,safeLogging } = require('../scripts/setup-test-reader-password.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

test('one administrator batch atomically initializes and verifies only its approved TEST', async t => {
  const c = await pg.connect();
  const acl = `SELECT (SELECT nspacl::text FROM pg_namespace WHERE nspname='public') AS schema_acl,
    (SELECT datacl::text FROM pg_database WHERE datname=current_database()) AS database_acl,
    (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d) AS defaults`;
  // REVOKE/GRANT materializes NULL (implicit default) database ACLs. Compare
  // every expanded grantor/grantee/privilege/grant-option for final restoration;
  // keep the raw comparison above for an aborted batch, which must change none.
  const effectiveAcl = `SELECT
    (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable)
      FROM pg_database d CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a
      WHERE d.datname=current_database()) AS database_grants,
    (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable)
      FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
      WHERE n.nspname='public') AS schema_grants,
    (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d) AS defaults`;
  async function absent() {
    assert.equal((await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE 'jinxi_test_%'")).rows[0].n, 0);
    assert.equal((await c.query("SELECT count(*)::int n FROM pg_namespace WHERE nspname IN('b2_lab','jinxi_guard')")).rows[0].n, 0);
    assert.equal((await c.query("SELECT to_regclass('public.messages') IS NULL AS absent")).rows[0].absent, true);
  }
  async function rejected(sql, pattern) {
    try { await assert.rejects(c.query(sql), e => pattern.test(e.message)); }
    finally { await c.query('ROLLBACK'); }
  }
  try {
    // Provider names below are synthetic roles in this fresh local cluster.
    await c.query(`CREATE ROLE cloud_admin NOLOGIN; CREATE ROLE neon_superuser NOLOGIN;
      ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public
        GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE,MAINTAIN ON TABLES TO neon_superuser WITH GRANT OPTION;
      ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public
        GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO neon_superuser WITH GRANT OPTION;
      CREATE ROLE neondb_owner LOGIN CREATEROLE NOSUPERUSER NOCREATEDB NOREPLICATION NOBYPASSRLS;
      ALTER DATABASE neondb OWNER TO neondb_owner;
      GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO neondb_owner;
      SET SESSION AUTHORIZATION neondb_owner`);
    const identity = (await c.query(`SELECT current_user AS initializer_role,
      current_setting('server_version_num') AS server_version_num,
      (SELECT system_identifier::text FROM pg_control_system()) AS cluster_id,
      (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid`)).rows[0];
    const target = { ...APPROVED_TARGET, projectId: 'project-synthetic-local', branchId: 'br-synthetic-local',
      endpointId: 'ep-synthetic-local', initializerRole: identity.initializer_role,
      clusterId: identity.cluster_id, databaseOid: identity.database_oid,
      serverVersionNum: identity.server_version_num, environmentId: crypto.randomUUID() };
    const before = (await c.query(acl)).rows;
    const beforeEffective = (await c.query(effectiveAcl)).rows;
    const batch = buildBootstrap(target);

    await t.test('cloud-bound file rejects another cluster before creating any TEST object or role', async () => {
      await rejected(buildBootstrap({ ...APPROVED_TARGET, environmentId: target.environmentId }), /APPROVED_BOOTSTRAP_TARGET_MISMATCH/);
      await absent();
      assert.deepEqual((await c.query(acl)).rows, before);
    });
    await t.test('wrong database OID is rejected even when its name and cluster match', async () => {
      await rejected(buildBootstrap({ ...target, databaseOid: '1' }), /APPROVED_BOOTSTRAP_TARGET_MISMATCH/);
      await absent();
    });
    await t.test('wrong initializer and unexpected server version refuse before DDL', async () => {
      for (const override of [{ initializerRole: 'different_initializer' }, { serverVersionNum: '999999' }]) {
        await rejected(buildBootstrap({ ...target, ...override }), /APPROVED_BOOTSTRAP_TARGET_MISMATCH/);
        await absent();
      }
    });
    await t.test('existing unknown object is preserved and blocks the whole batch', async () => {
      await c.query('CREATE TABLE public.keep_unknown(id int)');
      await rejected(batch, /TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED/);
      assert.equal((await c.query("SELECT to_regclass('public.keep_unknown') IS NOT NULL AS present")).rows[0].present, true);
      await absent();
      await c.query('DROP TABLE public.keep_unknown');
    });
    await t.test('late verification-stage failure rolls back seeded rows, roles and ACL changes together', async () => {
      const marker = '-- BEGIN REVIEWED SOURCE 03-verify';
      assert(batch.includes(marker));
      await rejected(batch.replace(marker, 'SELECT 1/0;\n' + marker), /division by zero/);
      await absent();
      assert.deepEqual((await c.query(acl)).rows, before);
    });
    await t.test('non-superuser owner executes initialization, seed and original verification in one commit', async () => {
      const result = await c.query(batch);
      assert.equal(result.at(-1).command, 'COMMIT');
      const counts = result.find(x => x.rows?.[0]?.fixture === 'synthetic-test-v1').rows[0];
      assert.deepEqual(counts, { fixture: 'synthetic-test-v1', strategies: '5', messages: '2', synthetic_accounts: '4', cloud_sessions: '0' });
      const receipt = result.find(x => x.rows?.[0]?.status === 'READY_TO_COMMIT').rows[0];
      assert.equal(receipt.environment_id, target.environmentId);
      assert.equal(receipt.cluster_id, target.clusterId);
      assert.equal(receipt.initializer, 'neondb_owner');
      assert.equal(receipt.roles.length, 3);
      for (const role of receipt.roles) for (const key of ['can_login', 'superuser', 'create_db', 'create_role', 'replication', 'bypass_rls']) assert.equal(role[key], false);
      assert.equal((await c.query("SELECT count(*)::int n FROM pg_auth_members WHERE member IN('jinxi_test_reader'::regrole,'jinxi_test_writer'::regrole)")).rows[0].n, 0);
      assert.equal((await c.query("SELECT COALESCE(current_setting('jinxi_test.approval',true),'') AS approval")).rows[0].approval, '');
    });
    await t.test('repeat whole batch refuses without overwriting committed synthetic records', async () => {
      await rejected(batch, /TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED/);
      assert.equal((await c.query('SELECT count(*)::int n FROM public.strategies')).rows[0].n, 5);
      assert.equal((await c.query('SELECT environment_id::text FROM jinxi_guard.environment_registration')).rows[0].environment_id, target.environmentId);
    });
    await t.test('reader activation refuses mismatched registration, effective column writes and role inheritance', async () => {
      await rejected(readerFiles({...target,environmentId:crypto.randomUUID()}).activate,/TEST_VERIFICATION_TARGET_REJECTED/);
      await c.query('GRANT UPDATE(content) ON public.messages TO jinxi_test_reader');
      try { await rejected(readerFiles(target).activate,/TEST_READER_PERMISSIONS_UNSAFE/); }
      finally { await c.query('REVOKE UPDATE(content) ON public.messages FROM jinxi_test_reader'); }
      await c.query('GRANT jinxi_test_writer TO jinxi_test_reader');
      try { await rejected(readerFiles(target).activate,/TEST_READER_PERMISSIONS_UNSAFE/); }
      finally { await c.query('REVOKE jinxi_test_writer FROM jinxi_test_reader'); }
      assert.equal((await c.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='jinxi_test_reader'")).rows[0].rolcanlogin,false);
    });
    await t.test('only the existing least-privilege reader is enabled; administrator cannot impersonate its proof', async () => {
      const result=await c.query(readerFiles(target).activate);
      assert.equal(result.at(-1).command,'COMMIT');
      const roles=result.find(x=>x.rows?.[0]?.status==='READER_LOGIN_READY_TO_COMMIT').rows;
      for(const role of roles)assert.equal(role.rolcanlogin,role.rolname==='jinxi_test_reader');
      await rejected(readerFiles(target).activate,/TEST_READER_ACTIVATION_STATE_UNSAFE/);
      await rejected(readerFiles(target).proof,/TEST_READER_SESSION_MISMATCH/);
    });
    await t.test('new reader connection proves real session, exact identity, ACL and four permitted reads', async () => {
      const reader=await pg.connect('jinxi_test_reader');
      try{
        const result=await reader.query(readerFiles(target).proof);
        assert.equal(result.at(-1).command,'ROLLBACK');
        const proof=result.find(x=>x.rows?.[0]?.proof).rows[0].proof;
        validateProof({mode:'public-read',resourceEnvironment:'synthetic-test',policy:{classification:'synthetic-test',environmentId:target.environmentId,role:'jinxi_test_reader',fingerprint:fingerprint(target.clusterId,target.databaseOid,'neondb')}},proof);
        assert.equal(proof[0].session_role,'jinxi_test_reader');
        const text=JSON.stringify(proof)+'\nSYNTHETIC_PUBLIC_READS|5|2|1|1\n';
        assert.equal(parseOutput(text,target,target.environmentId).proof[0].role,'jinxi_test_reader');
        const tampered=structuredClone(proof);tampered[0].session_role='neondb_owner';
        assert.throws(()=>parseOutput(JSON.stringify(tampered)+'\nSYNTHETIC_PUBLIC_READS|5|2|1|1',target,target.environmentId));
        assert.deepEqual(result.find(x=>x.rows?.[0]?.fixture==='SYNTHETIC_PUBLIC_READS').rows[0],{fixture:'SYNTHETIC_PUBLIC_READS',strategies:'5',messages:'2',announcements:'1',sponsorship:'1'});
        await reader.query('SET default_transaction_read_only=off');
        await assert.rejects(reader.query("UPDATE public.messages SET content=content WHERE false"),e=>e.code==='42501');
        await reader.query('SET default_transaction_read_only=on');
      }finally{await reader.end();}
    });
    await t.test('first password setup refuses an unsafe logging policy before binding any secret', async () => {
      await c.query('ALTER ROLE jinxi_test_reader NOLOGIN');
      assert.equal(safeLogging({statements:'all',duration:'-1',sample:'-1',error_parameters:'0',stats:null,audit:null,audit_role:null,explain:null}),false);
      let bound=false;
      const client={query:async(sql,values)=>{
        if(values)bound=true;
        if(sql.includes('jinxi secret-setting logging policy'))return {rows:[{statements:'all'}]};
        return c.query(sql,values);
      }};
      await assert.rejects(setReaderPassword(client,crypto.randomBytes(24).toString('hex')+'Aa!',target),/TEST_PASSWORD_LOGGING_POLICY_UNPROVEN/);
      assert.equal(bound,false);
    });
    await t.test('sensitive-stage failure returns no secret and clears the transient parameter', async () => {
      const password=crypto.randomBytes(24).toString('hex')+'Aa!';
      const client={query:(sql,values)=>{
        if(sql.includes('DO $secret$'))throw Error(password);
        return c.query(sql,values);
      }};
      await assert.rejects(setReaderPassword(client,password,target),e=>e.message==='TEST_READER_PASSWORD_SETUP_REJECTED');
      assert.equal((await c.query("SELECT COALESCE(current_setting('jinxi_test.reader_password_input',true),'') value")).rows[0].value,'');
      assert.equal((await c.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='jinxi_test_reader'")).rows[0].rolcanlogin,false);
    });
    await t.test('first password setup rejects another registration and changes only reader authentication', async () => {
      const password=crypto.randomBytes(24).toString('hex')+'Aa!';
      await assert.rejects(setReaderPassword(c,password,{...target,environmentId:crypto.randomUUID()}),/TEST_READER_PASSWORD_SETUP_REJECTED/);
      await checkScope(c,target);
      const submitted=[];
      const client={query:(sql,values)=>{submitted.push(sql);return c.query(sql,values);}};
      await c.query("SET password_encryption='md5'");
      const roles=await setReaderPassword(client,password,target);
      await c.query("SET password_encryption='scram-sha-256'");
      assert(!submitted.some(sql=>sql.includes(password)));
      for(const role of roles)assert.equal(role.rolcanlogin,role.rolname==='jinxi_test_reader');
      assert.equal((await c.query("SELECT COALESCE(current_setting('jinxi_test.reader_password_input',true),'') value")).rows[0].value,'');
      // Require SCRAM in this fresh loopback cluster for the real new connection.
      const m=pg.settings(),hba=path.join(m.folder,'data/pg_hba.conf'),original=fs.readFileSync(hba,'utf8');
      const root=await pg.connect();let authenticated;
      try{
        fs.writeFileSync(hba,'host neondb jinxi_test_reader 127.0.0.1/32 scram-sha-256\n'+original);
        await root.query('SELECT pg_reload_conf()');
        authenticated=new Client({host:m.host,port:m.port,database:m.database,user:'jinxi_test_reader',password,ssl:false,connectionTimeoutMillis:2000});
        await authenticated.connect();
        assert.equal((await authenticated.query('SELECT current_user AS role,session_user AS session_role')).rows[0].session_role,'jinxi_test_reader');
        await authenticated.query(readerFiles(target).proof);
        const wrong=new Client({host:m.host,port:m.port,database:m.database,user:'jinxi_test_reader',password:crypto.randomBytes(32).toString('hex'),ssl:false,connectionTimeoutMillis:2000});
        try{await assert.rejects(wrong.connect(),e=>e.code==='28P01');}finally{await wrong.end().catch(()=>{});}
        assert(!fs.readFileSync(path.join(m.folder,'postgres.log'),'utf8').includes(password));
      }finally{
        await authenticated?.end().catch(()=>{});
        fs.writeFileSync(hba,original);await root.query('SELECT pg_reload_conf()');await root.end();
      }
    });
    await t.test('original rollback restores identical effective grants and preserves platform default ACL metadata', async () => {
      await pg.approval(c, target.environmentId);
      await c.query(pg.sql('04-rollback'));
      await absent();
      assert.deepEqual((await c.query(effectiveAcl)).rows, beforeEffective);
    });
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    await c.end();
  }
});
