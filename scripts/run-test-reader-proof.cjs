// User-run native psql password prompt. This process never reads a password.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { cleanEnv } = require('./run-clean.cjs');
const { validateProof, fingerprint } = require('../netlify/functions/_shared/function-security');
const approvedHost = 'ep-dry-queen-bd6q46s6.c-8.us-east-2.aws.neon.tech';

function parseOutput(text, target, environmentId) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 2 || lines[1] !== 'SYNTHETIC_PUBLIC_READS|5|2|1|1') {
    throw Error('TEST_READER_READ_RESULTS_REJECTED');
  }
  const proof = JSON.parse(lines[0]);
  validateProof({mode:'public-read',resourceEnvironment:'synthetic-test',policy:{
    classification:'synthetic-test',environmentId,role:'jinxi_test_reader',
    fingerprint:fingerprint(target.clusterId,target.databaseOid,'neondb'),
  }}, proof);
  return { proof, counts:{strategies:5,messages:2,announcements:1,sponsorship:1} };
}

function run() {
  // A pipe/tool call cannot accidentally initiate a cloud password exchange.
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('USER_INTERACTIVE_TERMINAL_REQUIRED');
  if (process.argv.length !== 2) throw Error('NO_CONNECTION_OR_PASSWORD_ARGUMENTS_ACCEPTED');
  const root = path.resolve(__dirname,'..');
  const gate = JSON.parse(fs.readFileSync(path.join(root,'artifacts/f03-f05/results.json'),'utf8')).gate2Execution;
  if (gate?.initializationAccepted !== true || gate?.credentialIncident?.status !== 'user-confirmed-rotated'
    || gate?.readerHandoff?.endpoint?.directHost !== approvedHost) throw Error('APPROVED_TEST_READER_HANDOFF_REQUIRED');
  const file = path.join(root,'test-environment/sql/cloud-reader-proof.local.sql');
  if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== gate.readerHandoff.files.proof.sha256) {
    throw Error('REVIEWED_READER_SQL_CHANGED');
  }
  const bin = path.join(os.tmpdir(),'jinxi-005s-b1-postgres/pgsql/bin/psql.exe');
  if (process.platform !== 'win32' || !fs.existsSync(bin)) throw Error('REVIEWED_LOCAL_PSQL_MISSING');
  const output = path.join(root,'artifacts/f03-f05/cloud-reader.proof.local.json');
  if (fs.existsSync(output)) throw Error('EXISTING_READER_PROOF_PRESERVED');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-f03-reader-proof-'));
  const raw = path.join(temp,'readonly-results.txt');
  console.log('Enter ONLY the jinxi_test_reader password in the native psql prompt. Do not enter an administrator password.');
  const result = spawnSync(bin,['-X','-W','-q','-A','-t','-P','pager=off','-v','ON_ERROR_STOP=1',
    '-h',approvedHost,'-p','5432','-U','jinxi_test_reader','-d','neondb','-f',file,'-o',raw],{
    env:cleanEnv({PGSSLMODE:'require',PGCHANNELBINDING:'require',PGCONNECT_TIMEOUT:'10'}),stdio:'inherit',
  });
  if (result.status !== 0) throw Error('TEST_READER_CONNECTION_OR_SQL_FAILED');
  const validated = parseOutput(fs.readFileSync(raw,'utf8'),gate.bootstrap.target,gate.bootstrap.environmentId);
  fs.writeFileSync(output,JSON.stringify({kind:'jinxi-f03-reader-proof-v1',
    projectId:gate.bootstrap.target.projectId,branchId:gate.bootstrap.target.branchId,
    endpointId:gate.bootstrap.target.endpointId,host:approvedHost,collectedAtUtc:new Date().toISOString(),
    ...validated},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Reader database identity, effective ACL and four synthetic reads passed. Hosted isolation is still separate.');
  console.log('Non-secret evidence: '+output);
}
if (require.main === module) {
  try { run(); } catch (error) {
    const code = /^(USER_|NO_CONNECTION_|APPROVED_|REVIEWED_|EXISTING_|TEST_READER_)/.test(error.message)
      ? error.message : 'TEST_READER_PROOF_UNAVAILABLE';
    console.error(code);
    process.exitCode=1;
  }
}
module.exports={parseOutput};
