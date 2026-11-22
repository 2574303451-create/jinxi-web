const { Client } = require('pg');
const { fingerprint } = require('../../netlify/functions/_shared/function-security');
const { cleanEnv } = require('../../scripts/run-clean.cjs');
const { checkTarget, inspectTarget, verifyInventory, schemaFingerprint, roleState, appRoles } = require('./guard.cjs');
const { initialize, activateRoles, freezeRoles, rollbackEmpty, boundSchema } = require('./initialize.cjs');
const { seed, checkPasswords } = require('./seed.cjs');
const { exactKeys, resourceKeys } = require('../binding.cjs');
const approval = require('./admin-approval.disabled.json');

const operations = ['inspect', 'initialize', 'verify', 'seed', 'activate', 'freeze', 'rollback-empty'];

function verifyAdminApproval(record, target, action, expectedSchema, now = Date.now()) {
  const keys = [...resourceKeys, 'initializer'];
  const expiry = Date.parse(record?.expiresAt);
  if (record?.version !== 1 || record.enabled !== true || !Number.isFinite(expiry) ||
      (action !== 'freeze' && expiry <= now) || !exactKeys(record.target,keys) ||
      keys.some(key => JSON.stringify(record.target[key]) !== JSON.stringify(target[key]))) {
    throw Error('SYNTHETIC_ADMIN_APPROVAL_REQUIRED');
  }
  if (['seed','activate','rollback-empty','verify'].includes(action) &&
      (!/^[a-f0-9]{64}$/.test(record.schemaFingerprint || '') || expectedSchema !== record.schemaFingerprint)) {
    throw Error('SYNTHETIC_ADMIN_SCHEMA_APPROVAL_REQUIRED');
  }
}

async function administer({ action, target, password, expectedSchema, rolePasswords, fixturePasswords }) {
  if (!operations.includes(action) || typeof password !== 'string' || !password || password.length > 1024) {
    throw Error('SYNTHETIC_ADMIN_INPUT_REJECTED');
  }
  checkTarget(action === 'inspect' ? { ...target, fingerprint: target?.fingerprint ?? '0'.repeat(64) } : target);
  const checkApproval = action === 'inspect' ? undefined : () => verifyAdminApproval(approval,target,action,expectedSchema);
  checkApproval?.();
  if (action === 'seed') checkPasswords(fixturePasswords);
  if (Object.keys(process.env).some(key => /^PG[A-Z]/.test(key)) ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error('SYNTHETIC_ADMIN_INHERITED_CONFIGURATION_REJECTED');
  const client = new Client({
    host: target.host, port: 5432, database: target.database, user: target.initializer, password,
    ssl: { rejectUnauthorized: true }, application_name: 'jinxi-synthetic-schema-admin', connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    checkApproval?.();
    if (action === 'initialize') return await initialize(client, target, checkApproval);
    if (action === 'seed') {
      const accounts = await seed(client, target, expectedSchema, fixturePasswords, checkApproval);
      return { seededAccounts: Object.values(accounts).map(({ account }) => account) };
    }
    if (action === 'activate') return { enabledRoles: await activateRoles(client, target, expectedSchema, rolePasswords || {}, checkApproval) };
    if (action === 'freeze') return await freezeRoles(client, target);
    if (action === 'rollback-empty') { await rollbackEmpty(client, target, expectedSchema, checkApproval); return { schemaRemoved: true }; }

    await client.query("BEGIN READ ONLY; SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='5s'");
    if (action === 'inspect') {
      const actual = await inspectTarget(client, target);
      await verifyInventory(client);
      return { database: actual.database, postgresVersion: actual.version, address: actual.address, tls: true,
        fingerprint: fingerprint(actual.cluster_id, actual.database_oid, actual.database), empty: true };
    }
    await boundSchema(client, target, expectedSchema);
    const { rows } = await client.query('SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname=ANY($1::text[])', [appRoles]);
    const enabled = rows.every(row => row.rolcanlogin === true);
    return { schemaFingerprint: await schemaFingerprint(client), roles: await roleState(client, enabled), enabled };
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  }
}

module.exports = { administer, verifyAdminApproval };

if (require.main === module) {
  (async () => {
    if (process.argv.length !== 2 || process.stdin.isTTY ||
        Object.keys(process.env).some(key => /^PG[A-Z]/.test(key)) ||
        process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error('SYNTHETIC_ADMIN_INPUT_REJECTED');
    process.env = cleanEnv();
    const chunks = [];
    let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > 16384) throw Error('SYNTHETIC_ADMIN_INPUT_REJECTED');
      chunks.push(chunk);
    }
    const result = await administer(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    process.stdout.write(JSON.stringify(result) + '\n');
  })().catch(() => {
    console.error('Synthetic database command stopped. Check the approved target, privileges and schema before retrying.');
    process.exitCode = 1;
  });
}
