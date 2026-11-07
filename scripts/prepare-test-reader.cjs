// Offline, credential-free handoff after accepted synthetic initialization.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildBootstrap } = require('./prepare-test-bootstrap.cjs');
const { ATTESTATION_SQL } = require('../netlify/functions/_shared/function-security');

const reader = 'jinxi_test_reader';
const unsafe = ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls',
  'role_memberships','database_create','database_temp','schema_create','owns_objects',
  'writes_outside_scope','reads_outside_scope','unsafe_definer_access'];
const proofSql = ATTESTATION_SQL.replaceAll('$1', "''");

function readerFiles(target) {
  // Reuse the already-tested target guard, LOCAL parameters and original 03
  // invariants. Never rerun the initializer/seed in this activation batch.
  const bootstrap = buildBootstrap(target);
  const prefix = bootstrap.slice(bootstrap.indexOf('\nBEGIN;\n') + 1,
    bootstrap.indexOf('-- BEGIN REVIEWED SOURCE 01-initialize'));
  const verify = bootstrap.split('-- BEGIN REVIEWED SOURCE 03-verify\n')[1]
    .split('\n-- END REVIEWED SOURCE 03-verify')[0];
  const metadataProbe = proofSql.replace('r.rolname=current_user', `r.rolname='${reader}'`);
  if (metadataProbe === proofSql) throw Error('REVIEWED_ATTESTATION_CONTRACT_CHANGED');
  const unsafeSql = unsafe.map(key => `checked_proof.${key} IS DISTINCT FROM false`).join('\n    OR ');
  const activate = `-- Approved TEST only: enable LOGIN for the existing reader, without any grant.
-- Run WHOLE file once as neondb_owner on the signed jinxi-test target.
-- No password is read/set here. Provision it privately in this existing role's
-- Neon Roles menu afterwards. This metadata scan is NOT actual reader login.
${prefix}
${verify}
DO $reader_permissions$
DECLARE checked_proof record; u record;
BEGIN
  IF EXISTS(SELECT 1 FROM jinxi_guard.environment_registration WHERE id=1 AND
    (project_id IS DISTINCT FROM current_setting('jinxi_test.project_id')
      OR branch_id IS DISTINCT FROM current_setting('jinxi_test.branch_id')
      OR endpoint_id IS DISTINCT FROM current_setting('jinxi_test.endpoint_id')
      OR initializer IS DISTINCT FROM session_user))
    THEN RAISE EXCEPTION 'TEST_READER_REGISTRATION_MISMATCH'; END IF;
  SELECT rolcanlogin,rolinherit INTO STRICT u FROM pg_roles WHERE rolname='${reader}';
  IF u.rolcanlogin OR u.rolinherit OR
    (SELECT count(*) FROM pg_roles WHERE rolname IN('jinxi_test_owner','jinxi_test_writer')
      AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
      AND NOT rolreplication AND NOT rolbypassrls)<>2
    THEN RAISE EXCEPTION 'TEST_READER_ACTIVATION_STATE_UNSAFE'; END IF;
  SELECT * INTO STRICT checked_proof FROM (${metadataProbe}) metadata_probe;
  IF ${unsafeSql}
    THEN RAISE EXCEPTION 'TEST_READER_PERMISSIONS_UNSAFE'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['public.strategies','public.messages',
      'public.announcements','public.guild_sponsorship_entries']) name
    WHERE NOT has_table_privilege('${reader}',name,'SELECT'))
    THEN RAISE EXCEPTION 'TEST_READER_REQUIRED_SELECT_MISSING'; END IF;
END $reader_permissions$;
ALTER ROLE jinxi_test_reader LOGIN;
SELECT 'READER_LOGIN_READY_TO_COMMIT' AS status,rolname,rolcanlogin,rolinherit,
  rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
FROM pg_roles WHERE rolname IN('jinxi_test_owner','jinxi_test_reader','jinxi_test_writer') ORDER BY rolname;
COMMIT;
`;
  const identitySql = Object.entries({ environment_id: target.environmentId, classification: 'synthetic-test',
    cluster_id: target.clusterId, database_oid: target.databaseOid, database_name: target.databaseName })
    .map(([key,value]) => `checked_proof.${key} IS DISTINCT FROM '${value}'`).join('\n    OR ');
  const proof = `-- READ ONLY. Open a NEW connection authenticated as jinxi_test_reader.
-- Do not run as neondb_owner, SET ROLE or SET SESSION AUTHORIZATION.
-- Fixed original attestation query; no account data, password or hash is read.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL search_path=pg_catalog;
DO $reader_session$
DECLARE checked_proof record;
BEGIN
  IF current_user<>'${reader}' OR session_user<>current_user
    OR current_database()<>'${target.databaseName}'
    OR current_setting('server_version_num')<>'${target.serverVersionNum}'
    THEN RAISE EXCEPTION 'TEST_READER_SESSION_MISMATCH'; END IF;
  SELECT * INTO STRICT checked_proof FROM (${proofSql}) actual_reader;
  IF ${identitySql}
    OR checked_proof.default_read_only IS DISTINCT FROM 'on'
    OR ${unsafeSql}
    THEN RAISE EXCEPTION 'TEST_READER_PROOF_REJECTED'; END IF;
END $reader_session$;
SELECT jsonb_agg(to_jsonb(actual_reader)) AS proof FROM (${proofSql}) actual_reader;
SELECT 'SYNTHETIC_PUBLIC_READS' AS fixture,
  (SELECT count(*) FROM public.strategies) AS strategies,
  (SELECT count(*) FROM public.messages) AS messages,
  (SELECT count(*) FROM public.announcements) AS announcements,
  (SELECT count(*) FROM public.guild_sponsorship_entries) AS sponsorship;
ROLLBACK;
`;
  return { activate, proof };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw Error('NO_ARGUMENTS_ACCEPTED');
    const report = JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/f03-f05/results.json'),'utf8'));
    const gate = report.gate2Execution;
    if (gate?.initializationAccepted !== true) throw Error('ACCEPTED_INITIALIZATION_REQUIRED');
    const content = readerFiles({ ...gate.bootstrap.target, environmentId: gate.bootstrap.environmentId });
    const files = { activate: 'cloud-enable-reader.local.sql', proof: 'cloud-reader-proof.local.sql' };
    const outputs = {};
    for (const [key,name] of Object.entries(files)) {
      const file = path.join(__dirname,'../test-environment/sql',name);
      if (fs.existsSync(file)) throw Error('EXISTING_READER_FILES_PRESERVED');
    }
    for (const [key,name] of Object.entries(files)) {
      const file = path.join(__dirname,'../test-environment/sql',name);
      fs.writeFileSync(file,content[key],{flag:'wx',mode:0o600});
      outputs[key] = { file, sha256:crypto.createHash('sha256').update(content[key]).digest('hex') };
    }
    console.log(JSON.stringify(outputs,null,2));
  } catch (error) {
    console.error(/^(NO_ARGUMENTS_|ACCEPTED_|EXISTING_|REVIEWED_)/.test(error.message)
      ? error.message : 'TEST_READER_PREPARATION_FAILED');
    process.exitCode = 1;
  }
}
module.exports = { readerFiles };
