const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { freshDatabase, toolsFromArgs } = require('./synthetic-cloud-support.cjs');
const { initialize, activateRoles, freezeRoles, rollbackEmpty } = require('../synthetic-cloud/database/initialize.cjs');
const { roleState, schemaFingerprint, verifyInventory, appRoles } = require('../synthetic-cloud/database/guard.cjs');
const { seed } = require('../synthetic-cloud/database/seed.cjs');

test('PG17 TLS bootstrap and rollback on a fresh local synthetic target', async t => {
  const db = await freshDatabase(toolsFromArgs(process.argv.slice(2)));
  let client;
  try {
    client = await db.admin();
    const { rows: [{ server_version_num: serverVersion }] } = await client.query('SHOW server_version_num');
    const postgresVersion = Number(serverVersion);
    const empty = async () => {
      const { rows: [row] } = await client.query("SELECT to_regnamespace('jinxi_guard') IS NULL AS no_schema, NOT EXISTS(SELECT FROM pg_roles WHERE rolname='jinxi_member_session') AS no_role");
      assert.deepEqual(row, { no_schema:true, no_role:true });
    };
    await t.test('refuse wrong fingerprint, nonempty DB and concurrent connection before DDL', async () => {
      await assert.rejects(initialize(client,{ ...db.target, fingerprint:'0'.repeat(64) }), /SYNTHETIC_DATABASE_TARGET_REJECTED/);
      await empty();
      await client.query('CREATE TABLE public.preexisting(id int)');
      await assert.rejects(initialize(client,db.target), /SYNTHETIC_DATABASE_NOT_EMPTY/);
      assert.equal((await client.query("SELECT to_regclass('public.preexisting') IS NOT NULL AS preserved")).rows[0].preserved,true);
      await client.query('DROP TABLE public.preexisting');
      const second = await db.admin();
      try { await assert.rejects(initialize(client,db.target), /SYNTHETIC_DATABASE_NOT_EMPTY/); }
      finally { await second.end(); }
      await empty();
    });
    await t.test('allow the Neon public bootstrap defaults and reject additional grants', async () => {
      const setDefaults = async sql => {
        const root = await db.superuser();
        try { await root.query(sql); }
        finally { await root.end(); }
      };
      await setDefaults(`
        CREATE ROLE cloud_admin NOLOGIN;
        CREATE ROLE neon_superuser NOLOGIN;
        ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;
        ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;
      `);
      await verifyInventory(client);
      await setDefaults('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT ON TABLES TO PUBLIC');
      await assert.rejects(initialize(client,db.target), /SYNTHETIC_DATABASE_NOT_EMPTY/);
      await empty();
      await setDefaults('ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public REVOKE SELECT ON TABLES FROM PUBLIC');
      await verifyInventory(client);
    });
    await t.test('mid-DDL failure rolls back all schema and roles', async () => {
      let attempted = false;
      const failing = { query: (sql,values) => {
        if (typeof sql === 'string' && sql.includes('CREATE ROLE jinxi_points_owner')) {
          attempted = true;
          return client.query('SELECT 1/0');
        }
        return client.query(sql,values);
      } };
      await assert.rejects(initialize(failing, db.target), { code:'22012' });
      assert.equal(attempted,true);
      await empty();
    });
    const initialized = await initialize(client,db.target);
    await t.test('owner is not superuser, initialized roles cannot log in, schema is repeatable', async () => {
      assert(Number.isInteger(postgresVersion) && postgresVersion >= 170000 && postgresVersion < 180000);
      assert.equal(initialized.postgresVersion,postgresVersion);
      assert.equal((await roleState(client,false)).length,5);
      await client.query('BEGIN READ ONLY');
      try { assert.equal(await schemaFingerprint(client),initialized.schemaFingerprint); }
      finally { await client.query('ROLLBACK'); }
      await assert.rejects(initialize(client,db.target), /SYNTHETIC_DATABASE_NOT_EMPTY/);
      await assert.rejects(db.connect(appRoles[0],randomBytes(32).toString('hex')));
      await client.query('CREATE DOMAIN public.unreviewed AS text');
      await assert.rejects(rollbackEmpty(client,db.target,initialized.schemaFingerprint), /SYNTHETIC_DATABASE_NOT_EMPTY/);
      assert.equal((await client.query("SELECT to_regtype('public.unreviewed') IS NOT NULL AS kept")).rows[0].kept,true);
      await client.query('DROP DOMAIN public.unreviewed');
      await rollbackEmpty(client,db.target,initialized.schemaFingerprint);
      await empty();
      assert.equal((await initialize(client,db.target)).schemaFingerprint,initialized.schemaFingerprint);
    });
    const accounts = await seed(client,db.target,initialized.schemaFingerprint);
    const secrets = Object.fromEntries(appRoles.map(role => [role,randomBytes(32).toString('hex')]));
    await t.test('seed, role secrets and column grants remain isolated', async () => {
      assert.equal(Object.keys(accounts).length,7);
      assert.equal(accounts.normal.nickname,accounts.same.nickname);
      assert.notEqual(accounts.normal.memberId,accounts.same.memberId);
      await assert.rejects(seed(client,db.target,initialized.schemaFingerprint),{code:'23505'});
      assert.equal((await client.query('SELECT count(*)::int AS n FROM b2_lab.guild_member_accounts')).rows[0].n,7);
      await assert.rejects(activateRoles(client,db.target,initialized.schemaFingerprint,{}), /SYNTHETIC_ROLE_SECRET_REJECTED/);
      await roleState(client,false);
      const unsafeLogging = { query: (sql,values) => {
        if (typeof sql === 'string' && sql.includes('jinxi secret-setting logging policy')) {
          return client.query(sql,values).then(result => ({
            rows:result.rows.map(row=>({...row,statements:'all'})),
          }));
        }
        return client.query(sql,values);
      } };
      await assert.rejects(activateRoles(unsafeLogging,db.target,initialized.schemaFingerprint,secrets), /SYNTHETIC_ROLE_LOGGING_UNPROVEN/);
      await roleState(client,false);
      await client.query('ALTER ROLE jinxi_member_owner LOGIN');
      await assert.rejects(activateRoles(client,db.target,initialized.schemaFingerprint,secrets), /SYNTHETIC_ROLE_STATE_REJECTED/);
      await client.query('ALTER ROLE jinxi_member_owner NOLOGIN');
      const grantAdmin = await db.superuser();
      try { await grantAdmin.query('GRANT CONNECT ON DATABASE template1 TO jinxi_member_session'); }
      finally { await grantAdmin.end(); }
      await assert.rejects(activateRoles(client,db.target,initialized.schemaFingerprint,secrets), /SYNTHETIC_ROLE_STATE_REJECTED/);
      const revokeAdmin = await db.superuser();
      try { await revokeAdmin.query('REVOKE CONNECT ON DATABASE template1 FROM jinxi_member_session'); }
      finally { await revokeAdmin.end(); }
      const lock = await db.admin();
      try {
        await lock.query("BEGIN; SELECT pg_advisory_xact_lock(hashtext('jinxi.synthetic-write.v1'))");
        await assert.rejects(activateRoles(client,db.target,initialized.schemaFingerprint,secrets),{code:'55P03'});
        await roleState(client,false);
      } finally { await lock.query('ROLLBACK'); await lock.end(); }
      await activateRoles(client,db.target,initialized.schemaFingerprint,secrets);
      const root = await db.superuser();
      try {
        assert.equal((await root.query("SELECT count(*)::int AS n FROM pg_authid WHERE rolname=ANY($1::text[]) AND rolpassword LIKE 'SCRAM-SHA-256$%'",[appRoles])).rows[0].n,5);
      } finally { await root.end(); }
      const unauthorized = [
        'SELECT * FROM points_lab.ledger',
        'SELECT password_hash FROM b2_lab.guild_member_accounts',
        'UPDATE attendance_lab.clock SET synthetic_now=now()',
        'DELETE FROM points_lab.ledger',
        'INSERT INTO community_lab.member_roles SELECT member_id,role FROM community_lab.member_roles',
      ];
      for (const [index,role] of appRoles.entries()) {
        const app = await db.connect(role,secrets[role]);
        try {
          const { rows: [info] } = await app.query("SELECT session_user AS role,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls");
          assert.deepEqual(info,{role,tls:true});
          await assert.rejects(app.query(unauthorized[index]),{code:'42501'});
          await assert.rejects(app.query('CREATE TEMP TABLE denied(id int)'),{code:'42501'});
        } finally { await app.end(); }
        await assert.rejects(db.connect(role,secrets[role],'postgres'),{code:'42501'});
        await assert.rejects(db.connect(role,secrets[role],'template1'),{code:'42501'});
      }
    });
    await t.test('emergency freeze succeeds after schema drift, preserves all records and invalidates role logins', async () => {
      await client.query('GRANT SELECT ON b2_lab.guild_member_accounts TO jinxi_community_app');
      await client.query('GRANT TEMP ON DATABASE jinxi_synthetic_write_v1 TO jinxi_community_app');
      await client.query('BEGIN READ ONLY');
      try { assert.notEqual(await schemaFingerprint(client),initialized.schemaFingerprint); }
      finally { await client.query('ROLLBACK'); }
      await freezeRoles(client,db.target);
      await assert.rejects(roleState(client,false), /SYNTHETIC_ROLE_STATE_REJECTED/);
      await assert.rejects(db.connect(appRoles[0],secrets[appRoles[0]]));
      await client.query('REVOKE TEMP ON DATABASE jinxi_synthetic_write_v1 FROM jinxi_community_app');
      await client.query('REVOKE SELECT ON b2_lab.guild_member_accounts FROM jinxi_community_app');
      await client.query('GRANT SELECT(id,employee_no,is_locked,force_reset_password) ON b2_lab.guild_member_accounts TO jinxi_community_app');
      await assert.rejects(rollbackEmpty(client,db.target,initialized.schemaFingerprint), /SYNTHETIC_ROLLBACK_DATA_PRESENT/);
      assert.equal((await client.query('SELECT count(*)::int AS n FROM b2_lab.guild_member_accounts')).rows[0].n,7);
    });
    t.diagnostic('PostgreSQL '+postgresVersion+' with TLS, five fixed roles and transaction cleanup verified on the disposable cluster');
  } finally { await client?.end(); db.stop(); }
});
