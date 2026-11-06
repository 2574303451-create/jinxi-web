// Generates a read-only psql script and checks the resulting non-secret proof.
// No network client, .env loading, or fallback credentials.
const fs = require('node:fs');
const { ATTESTATION_SQL, validateProof } = require('../../netlify/functions/_shared/function-security');

function sql() {
  const begin = String.raw`\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '3000ms';
SET LOCAL search_path = pg_catalog;
SELECT current_database() = :'test_database'
  AND current_user = :'test_role' AND session_user = current_user AS matched_target \gset
\if :matched_target
  SELECT environment_id = :'test_environment_id' AND classification = 'synthetic-test' AS matched_test
  FROM jinxi_guard.environment_identity() \gset
  \if :matched_test
    SELECT json_agg(proof) FROM (
`;
  const end = String.raw`
    ) proof;
  \else
    \echo TEST registration mismatch
    SELECT 1/0;
  \endif
\else
  \echo TEST role or database mismatch
  SELECT 1/0;
\endif
ROLLBACK;
`;
  return begin + ATTESTATION_SQL.replaceAll('$1', "''") + end;
}

function verify(file, expectedFile) {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
  if (!['deploy-preview', 'branch-deploy'].includes(expected.context) ||
    expected.classification !== 'synthetic-test' ||
    typeof expected.role !== 'string' || !expected.role ||
    typeof expected.environmentId !== 'string' || !expected.environmentId ||
    !/^[a-f0-9]{64}$/.test(expected.fingerprint)) {
    throw Error('REVIEWED_TEST_IDENTITY_REQUIRED');
  }
  validateProof({ policy: expected, mode: 'public-read' }, rows);
}

if (require.main === module) {
  const [mode, proof, expected] = process.argv.slice(2);
  try {
    if (mode === '--sql' && !proof) process.stdout.write(sql());
    else if (mode === '--verify' && proof && expected) {
      verify(proof, expected);
      console.log('One TEST read role matched its expected database identity and direct ACL. Review cloud and transitive evidence separately.');
    } else throw Error('EXPECTED_SQL_OR_VERIFY_MODE');
  } catch (error) {
    console.error(error.name === 'IsolationError' ? error.code : 'TEST_ROLE_PROOF_UNAVAILABLE');
    process.exitCode = 1;
  }
}
