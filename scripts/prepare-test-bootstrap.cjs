// Offline handoff only: no network client, environment secrets or cloud SDK.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SOURCE_HEAD = '316ae73c9de885ad4ec08c7a70c5a3cd0650d374';
const SOURCES = Object.freeze({
  '01-initialize': '63bde599cb6d7d403fa70f7077439cb21c6a44fffbb0c15fa5c35ce3597a7dfc',
  '02-seed': '4af8dd665d0ae46e463c7781b21ae91b796517cc5aa1b987b1cadf320d1f5dbf',
  '03-verify': 'c0a60a1247a1365d7d0e590ff427932343294e6296fcfebe533919b7c6bc75e3',
});
const APPROVED_TARGET = Object.freeze({
  projectId: 'restless-salad-74668264',
  branchId: 'br-red-pond-bdtrjpmy',
  endpointId: 'ep-dry-queen-bd6q46s6',
  databaseName: 'neondb',
  clusterId: '7704950029723409949',
  databaseOid: '16397',
  initializerRole: 'neondb_owner',
  serverVersionNum: '180006',
});

function reviewedBody(name) {
  const sql = fs.readFileSync(path.join(__dirname, '../test-environment/sql', name + '.sql'), 'utf8')
    .replace(/\r\n/g, '\n').trimEnd() + '\n';
  if (crypto.createHash('sha256').update(sql).digest('hex') !== SOURCES[name]) {
    throw Error('REVIEWED_SQL_CHANGED');
  }
  const lines = sql.trimEnd().split('\n');
  const begin = lines.findIndex(line => /^BEGIN(?: READ ONLY)?;$/.test(line));
  const ending = name === '03-verify' ? 'ROLLBACK;' : 'COMMIT;';
  if (begin < 0 || lines.at(-1) !== ending
    || lines.slice(0, begin).some(line => line && !line.startsWith('--'))
    || lines.filter(line => /^(?:BEGIN(?: READ ONLY)?|COMMIT|ROLLBACK);$/.test(line)).length !== 2) {
    throw Error('REVIEWED_TRANSACTION_BOUNDARY_CHANGED');
  }
  // Only the three known outer transaction boundaries are removed. Every
  // guard, DDL, grant, fixture and verification statement remains unchanged.
  lines.splice(begin, 1);
  lines.pop();
  return lines.join('\n');
}

function buildBootstrap(target) {
  const keys = [...Object.keys(APPROVED_TARGET), 'environmentId'].sort();
  if (!target || Object.keys(target).sort().join(',') !== keys.join(',')
    || Object.values(target).some(value => typeof value !== 'string')
    || ['projectId', 'branchId', 'endpointId', 'initializerRole'].some(key => !/^[a-zA-Z0-9_-]{3,100}$/.test(target[key]))
    || target.databaseName !== 'neondb'
    || ['clusterId', 'databaseOid', 'serverVersionNum'].some(key => !/^[1-9][0-9]*$/.test(target[key]))
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(target.environmentId)) {
    throw Error('NON_SECRET_REVIEWED_TARGET_REQUIRED');
  }
  const config = {
    approval: 'synthetic-test-v1', project_id: target.projectId, branch_id: target.branchId,
    endpoint_id: target.endpointId, expected_cluster_id: target.clusterId,
    expected_database_oid: target.databaseOid, environment_id: target.environmentId,
  };
  const settingSql = Object.entries(config).map(([key, value]) =>
    `  PERFORM set_config('jinxi_test.${key}','${value}',true);`).join('\n');
  const bodies = Object.keys(SOURCES).map(name =>
    `-- BEGIN REVIEWED SOURCE ${name}\n${reviewedBody(name)}\n-- END REVIEWED SOURCE ${name}`).join('\n\n');
  return `-- ADMINISTRATOR HANDOFF: approved synthetic TEST only; run the WHOLE file once.
-- Select jinxi-test / production / neondb in Neon SQL Editor, as neondb_owner.
-- Project ${target.projectId}; branch ${target.branchId}; endpoint ${target.endpointId}.
-- SQL cannot authenticate provider project/branch IDs: confirm the console first.
-- Reviewed implementation ${SOURCE_HEAD}; source SHA256 values checked offline.
-- No password, DSN, usable account credential or session token is included.
-- One transaction replaces only the outer BEGIN/COMMIT/ROLLBACK of 01/02/03.
-- All original target, unknown-object, permission, seed and invariant guards remain.
-- On ANY error: STOP; issue only ROLLBACK if needed; do not retry or add privileges.
-- READY_TO_COMMIT is provisional: accept only with NO errors and final COMMIT.
-- Reader/owner/writer stay NOLOGIN. Website deployment is NOT enabled here.

BEGIN;
SET LOCAL statement_timeout='10000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL search_path=pg_catalog;
DO $bootstrap_target$
BEGIN
  IF current_database()<>'${target.databaseName}'
    OR session_user<>current_user OR session_user<>'${target.initializerRole}'
    OR current_setting('server_version_num')<>'${target.serverVersionNum}'
    OR (SELECT system_identifier::text FROM pg_control_system())<>'${target.clusterId}'
    OR (SELECT oid::text FROM pg_database WHERE datname=current_database())<>'${target.databaseOid}'
    THEN RAISE EXCEPTION 'APPROVED_BOOTSTRAP_TARGET_MISMATCH'; END IF;
${settingSql}
END $bootstrap_target$;

${bodies}

-- Non-secret resource receipt; no account rows, hashes or credential values.
SELECT 'READY_TO_COMMIT' AS status,environment_id::text,classification,
  project_id,branch_id,endpoint_id,database_name,database_oid,cluster_id,initializer,
  current_setting('server_version_num') AS server_version_num,seed_version,
  (SELECT jsonb_agg(jsonb_build_object('role',rolname,'can_login',rolcanlogin,
    'superuser',rolsuper,'create_db',rolcreatedb,'create_role',rolcreaterole,
    'replication',rolreplication,'bypass_rls',rolbypassrls) ORDER BY rolname)
    FROM pg_roles WHERE rolname IN('jinxi_test_owner','jinxi_test_reader','jinxi_test_writer')) AS roles
FROM jinxi_guard.environment_registration WHERE id=1;
COMMIT;
`;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw Error('NO_ARGUMENTS_OR_CONNECTION_STRINGS_ACCEPTED');
    const environmentId = crypto.randomUUID();
    const sql = buildBootstrap({ ...APPROVED_TARGET, environmentId });
    const file = path.resolve(__dirname, '../test-environment/sql/cloud-bootstrap.local.sql');
    fs.writeFileSync(file, sql, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ file, environmentId, sourceHead: SOURCE_HEAD, sourceSha256: SOURCES,
      sha256: crypto.createHash('sha256').update(sql).digest('hex'), bytes: Buffer.byteLength(sql) }, null, 2));
  } catch (error) {
    console.error(error.code === 'EEXIST' ? 'EXISTING_BOOTSTRAP_PRESERVED_DO_NOT_REGENERATE'
      : /^(REVIEWED_|NON_SECRET_|NO_ARGUMENTS_)/.test(error.message) ? error.message : 'BOOTSTRAP_PREPARATION_FAILED');
    process.exitCode = 1;
  }
}
module.exports = { buildBootstrap, APPROVED_TARGET, SOURCE_HEAD };
