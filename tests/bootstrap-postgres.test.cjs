const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const pg = require('./support/test-environment-postgres.cjs');
const { buildBootstrap, APPROVED_TARGET } = require('../scripts/prepare-test-bootstrap.cjs');

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
    await assert.rejects(c.query(sql), e => pattern.test(e.message));
    await c.query('ROLLBACK');
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
