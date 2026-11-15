const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DATABASE, REVISION } = require('../binding.cjs');
const { namespaces, owners, appRoles, verifyTarget, verifyInventory, schemaFingerprint, roleState } = require('./guard.cjs');
const { loggingSql, safeLogging } = require('../../scripts/setup-test-reader-password.cjs');

const sourcePins = {
  'member-local/schema.sql': 'f23ba0cd01020e256f07a2ff89bbdc7967873d0bda04c930ceeb52dcb975e50d',
  'community-local/schema.sql': 'b055be18ed97de97e56e7e0f91a2dfc6e3d978dc7df5c536b30452322ecd9c2e',
  'attendance-local/schema.sql': '14bf4348de437d982ae0890614554b6556a1f4451991f26757950e8ad48857f3',
  'points-local/schema.sql': '17f85e8cbe242f3e98c1dc3ebc05bd606b098229f80dddd2caeb4df448ce17c3',
  'points-local/invariants.sql': 'fb4817d9715590093a95da57b65df8749600e4086f53a11b2f662c6b33cbb862',
  'operations-local/schema.sql': 'bb0f52b6cc836761adf24f4958bdd401c1ca6b50b60f7bf890e30c91caa5321a',
  'operations-local/teams.sql': 'e5103377c42b22d4ade130d7260d2f70b6657d46889a80b88ea6f7068c8ed40a',
};
const lockLifecycle = client => client.query("SELECT pg_advisory_xact_lock(hashtext('jinxi.synthetic-write.v1'))");
function readSource(file) {
  const sql = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8').replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(sql).digest('hex') !== sourcePins[file]) throw Error('SYNTHETIC_SCHEMA_SOURCE_CHANGED');
  return sql;
}

function schemaSteps() {
  return Object.keys(sourcePins).map(file => {
    let sql = readSource(file).replace(/\nCOMMIT;\s*$/, '');
    if (file.endsWith('/schema.sql')) {
      // The host guard is replaced by verifyTarget + verifyInventory in the same
      // outer transaction. The seven original SQL sources stay unchanged.
      const start = sql.indexOf('\nCREATE ROLE ');
      if (start < 0) throw Error('SYNTHETIC_SCHEMA_SOURCE_CHANGED');
      const owner = owners.find(name => sql.includes('CREATE ROLE ' + name + ' '));
      if (!owner) throw Error('SYNTHETIC_SCHEMA_SOURCE_CHANGED');
      sql = sql.slice(start).replaceAll('ON DATABASE jinxi_member_local', 'ON DATABASE ' + DATABASE);
      sql = sql.replace(/(CREATE ROLE jinxi_[a-z]+_owner [^\n]+;\n)/,
        '$1GRANT ' + owner + ' TO CURRENT_USER WITH INHERIT TRUE, SET TRUE;\n');
      if (owner === owners[0]) sql = sql.replace("CHECK(classification='synthetic-local')", "CHECK(classification='synthetic-test')");
    }
    return sql;
  });
}

async function transaction(client, action) {
  try {
    await client.query("BEGIN; SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='2s'");
    const result = await action();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function boundEnvironment(client, target) {
  await verifyTarget(client, target);
  const { rows: [record] } = await client.query('SELECT environment_id,classification FROM jinxi_guard.environment_registration WHERE id=1');
  if (!record || record.environment_id !== target.environmentId || record.classification !== 'synthetic-test') {
    throw Error('SYNTHETIC_DATABASE_TARGET_REJECTED');
  }
}

async function boundSchema(client, target, expected) {
  await boundEnvironment(client, target);
  if (!/^[a-f0-9]{64}$/.test(expected || '') || await schemaFingerprint(client) !== expected) {
    throw Error('SYNTHETIC_SCHEMA_FINGERPRINT_MISMATCH');
  }
}

async function boundChange(client, target, expected) {
  await boundEnvironment(client,target);
  await lockLifecycle(client);
  await boundSchema(client,target,expected);
}

async function initialize(client, target) {
  return transaction(client, async () => {
    const actual = await verifyTarget(client, target);
    await lockLifecycle(client);
    await verifyInventory(client);
    const initialAcl = (await client.query(`
      SELECT d.datacl::text AS database_acl,n.nspacl::text AS public_acl
      FROM pg_database d,pg_namespace n WHERE d.datname=current_database() AND n.nspname='public'
    `)).rows[0];
    for (const sql of schemaSteps()) await client.query(sql);
    await client.query("INSERT INTO jinxi_guard.environment_registration VALUES (1,$1,'synthetic-test')", [target.environmentId]);
    await roleState(client, false);
    return { revision: REVISION, fingerprint: target.fingerprint, schemaFingerprint: await schemaFingerprint(client),
      postgresVersion: actual.version, initialAcl };
  });
}

async function activateRoles(client, target, expected, secrets) {
  return transaction(client, async () => {
    await boundChange(client, target, expected);
    await roleState(client, false);
    const values = appRoles.map(role => secrets[role]);
    if (values.some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) ||
        new Set(values).size !== values.length) throw Error('SYNTHETIC_ROLE_SECRET_REJECTED');
    const logging = (await client.query(loggingSql)).rows[0];
    const parameters = (await client.query("SELECT current_setting('log_parameter_max_length') AS length, current_setting('log_min_error_statement') AS errors")).rows[0];
    if (!safeLogging(logging) || parameters.length !== '0' ||
        !['fatal','panic'].includes(parameters.errors)) throw Error('SYNTHETIC_ROLE_LOGGING_UNPROVEN');
    await client.query("SET LOCAL password_encryption='scram-sha-256'");
    // Never put a password in submitted SQL. The role names are fixed source
    // constants and the protected password setting lasts only this transaction.
    for (const [index, role] of appRoles.entries()) {
      await client.query("SELECT set_config('jinxi_synthetic.password_input',$1,true)", [values[index]]);
      await client.query(`
        DO $role_password$ BEGIN
          BEGIN
            EXECUTE format('ALTER ROLE %I PASSWORD %L', '${role}',current_setting('jinxi_synthetic.password_input'));
          EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'SYNTHETIC_ROLE_PASSWORD_REJECTED';
          END;
        END $role_password$
      `);
      await client.query("SELECT set_config('jinxi_synthetic.password_input','',true)");
      await client.query('ALTER ROLE ' + role + ' LOGIN CONNECTION LIMIT 4');
    }
    return roleState(client, true);
  });
}

async function freezeRoles(client, target) {
  await transaction(client, async () => {
    await boundEnvironment(client, target);
    await lockLifecycle(client);
    await boundEnvironment(client, target);
    for (const role of appRoles) await client.query('ALTER ROLE ' + role + ' NOLOGIN PASSWORD NULL');
    // An excessive grant must not roll back an emergency stop.
    const { rows } = await client.query('SELECT rolcanlogin FROM pg_roles WHERE rolname=ANY($1::text[])', [appRoles]);
    if (rows.length !== appRoles.length || rows.some(row => row.rolcanlogin !== false)) throw Error('SYNTHETIC_FREEZE_FAILED');
  });
}

async function rollbackEmpty(client, target, expected) {
  await transaction(client, async () => {
    await boundChange(client, target, expected);
    await roleState(client, false);
    await verifyInventory(client, true);
    const { rows } = await client.query(`
      SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=ANY($1::text[]) AND c.relkind='r'
    `, [namespaces]);
    const initialRows = new Set(['jinxi_guard.environment_registration', 'business_disabled.points',
      'attendance_lab.clock', 'points_lab.mutex', 'operations_lab.mutex']);
    for (const row of rows) {
      if (!/^[a-z_][a-z0-9_]*$/.test(row.name) || !namespaces.includes(row.schema)) throw Error('SYNTHETIC_ROLLBACK_SCHEMA_UNEXPECTED');
      if (initialRows.has(row.schema + '.' + row.name)) continue;
      const result = await client.query('SELECT EXISTS(SELECT 1 FROM ' + row.schema + '.' + row.name + ') AS occupied');
      if (result.rows[0].occupied) throw Error('SYNTHETIC_ROLLBACK_DATA_PRESENT');
    }
    const constraints = (await client.query(`
      SELECT n.nspname AS schema,r.relname AS relation,c.conname AS name
      FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE c.contype='f' AND n.nspname=ANY($1::text[])
    `,[namespaces])).rows;
    const identifier = name => '"' + name.replaceAll('"','""') + '"';
    // Remove the reviewed foreign keys first, then drop only the named model.
    // RESTRICT leaves everything in place if an external dependency exists.
    for (const row of constraints) {
      await client.query('ALTER TABLE ' + identifier(row.schema) + '.' + identifier(row.relation) +
        ' DROP CONSTRAINT ' + identifier(row.name) + ' RESTRICT');
    }
    await client.query('DROP TABLE ' + rows.map(row => identifier(row.schema) + '.' + identifier(row.name)).join(',') + ' RESTRICT');
    const functions = (await client.query(`
      SELECT n.nspname AS schema,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname=ANY($1::text[]) AND p.prokind='f'
    `,[namespaces])).rows;
    await client.query('DROP FUNCTION ' + functions.map(row =>
      identifier(row.schema) + '.' + identifier(row.name) + '(' + row.arguments + ')').join(',') + ' RESTRICT');
    await client.query('DROP SCHEMA ' + namespaces.map(identifier).join(',') + ' RESTRICT');
    for (const role of appRoles) await client.query('REVOKE CONNECT ON DATABASE ' + DATABASE + ' FROM ' + role);
    for (const role of [...appRoles, ...owners].reverse()) await client.query('DROP ROLE ' + role);
  });
}

module.exports = { initialize, activateRoles, freezeRoles, rollbackEmpty, boundSchema, boundChange, sourcePins };
