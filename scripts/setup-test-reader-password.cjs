// User-operated first password setup. Secrets stay in local process memory;
// no connection URL, credential argument, password file or SQL literal input.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { Writable } = require('node:stream');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { cleanEnv } = require('./run-clean.cjs');
const { readerFiles } = require('./prepare-test-reader.cjs');
const host = 'ep-dry-queen-bd6q46s6.c-8.us-east-2.aws.neon.tech';
const loggingSql = `/* jinxi secret-setting logging policy: metadata only */
SELECT current_setting('log_statement') AS statements,
 current_setting('log_min_duration_statement') AS duration,
 current_setting('log_min_duration_sample') AS sample,
 current_setting('log_parameter_max_length_on_error') AS error_parameters,
 current_setting('log_min_messages') AS minimum_messages,
 current_setting('debug_print_parse') AS debug_parse,
 current_setting('debug_print_rewritten') AS debug_rewrite,
 current_setting('debug_print_plan') AS debug_plan,
 current_setting('pg_stat_statements.track',true) AS stats,
 current_setting('pgaudit.log',true) AS audit,
 current_setting('pgaudit.role',true) AS audit_role,
 current_setting('auto_explain.log_min_duration',true) AS explain`;

function passwordGuard(target) {
  const activation = readerFiles(target).activate;
  const begin = activation.indexOf('\nBEGIN;\n') + 1;
  const end = activation.indexOf('ALTER ROLE jinxi_test_reader LOGIN;');
  const original = 'IF u.rolcanlogin OR u.rolinherit OR';
  if (begin < 1 || end <= begin || activation.split(original).length !== 2) {
    throw Error('REVIEWED_PASSWORD_GUARD_CHANGED');
  }
  // Password provisioning accepts this existing role either before or after
  // LOGIN activation. Every identity, ACL and other-role guard is unchanged.
  return activation.slice(begin,end).replace(original,'IF u.rolinherit OR');
}
function safeLogging(p) {
  return p?.statements === 'none' && p.duration === '-1' && p.sample === '-1'
    && p.error_parameters === '0' && [null,'top','none'].includes(p.stats)
    && ['warning','error','log','fatal','panic'].includes(p.minimum_messages)
    && p.debug_parse === 'off' && p.debug_rewrite === 'off' && p.debug_plan === 'off'
    && [null,'','none'].includes(p.audit) && [null,'','none'].includes(p.audit_role)
    && [null,'-1'].includes(p.explain);
}
function validNewPassword(password) {
  return typeof password === 'string' && password.length >= 32 && password.length <= 128
    && !/^postgres(?:ql)?:\/\//i.test(password)
    && /^[\x21-\x7e]+$/.test(password)
    && [/[a-z]/,/[A-Z]/,/[0-9]/,/[^a-zA-Z0-9]/].filter(re=>re.test(password)).length >= 3;
}
async function checkScope(client,target) {
  try {
    await client.query(passwordGuard(target));
    if (!safeLogging((await client.query(loggingSql)).rows[0])) throw Error('TEST_PASSWORD_LOGGING_POLICY_UNPROVEN');
    await client.query('ROLLBACK');
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
}
async function setReaderPassword(client,password,target) {
  if (!validNewPassword(password)) throw Error('TEST_READER_NEW_PASSWORD_REQUIREMENTS');
  let committing = false;
  try {
    await client.query(passwordGuard(target));
    if (!safeLogging((await client.query(loggingSql)).rows[0])) throw Error('TEST_PASSWORD_LOGGING_POLICY_UNPROVEN');
    await client.query("SET LOCAL password_encryption='scram-sha-256'");
    // The password is a bind parameter, never part of submitted SQL text.
    await client.query("SELECT set_config('jinxi_test.reader_password_input',$1,true)",[password]);
    await client.query(`DO $secret$
BEGIN
  BEGIN
    EXECUTE format('ALTER ROLE jinxi_test_reader PASSWORD %L',current_setting('jinxi_test.reader_password_input'));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST_READER_INITIAL_PASSWORD_REJECTED';
  END;
END $secret$`);
    await client.query("SELECT set_config('jinxi_test.reader_password_input','',true)");
    await client.query('ALTER ROLE jinxi_test_reader LOGIN');
    // Recheck effective permissions before COMMIT, including any provider hook
    // effects. This is still the same transaction; do not nest a new BEGIN.
    await client.query(passwordGuard(target).replace(/^BEGIN;\n/,''));
    const roles = (await client.query(`SELECT rolname,rolcanlogin,rolinherit,rolsuper,
      rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles
      WHERE rolname IN('jinxi_test_owner','jinxi_test_reader','jinxi_test_writer') ORDER BY rolname`)).rows;
    committing = true;
    await client.query('COMMIT');
    return roles;
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    if (committing) throw Error('TEST_READER_PASSWORD_COMMIT_UNCERTAIN');
    if (error.message === 'TEST_PASSWORD_LOGGING_POLICY_UNPROVEN') throw error;
    // Never echo a database exception or bind-parameter details with secrets.
    throw Error('TEST_READER_PASSWORD_SETUP_REJECTED');
  }
}
function secretPrompt(label) {
  process.stdout.write(label+'（不回显，输入后回车）: ');
  const silent = new Writable({write(_chunk,_encoding,done){done();}});
  const rl = readline.createInterface({input:process.stdin,output:silent,terminal:true,historySize:0});
  return new Promise((resolve,reject)=>{
    let answered = false;
    rl.once('close',()=>{if(!answered)reject(Error('TEST_PASSWORD_SETUP_CANCELLED'));});
    rl.once('SIGINT',()=>{rl.close();process.stdout.write('\n');reject(Error('TEST_PASSWORD_SETUP_CANCELLED'));});
    rl.question('',answer=>{answered=true;rl.close();process.stdout.write('\n');resolve(answer);});
  });
}
async function interactive() {
  if (process.execArgv.length || process.env.NODE_OPTIONS) throw Error('CLEAN_PASSWORD_CLIENT_REQUIRED');
  const root = path.resolve(__dirname,'..');
  const gate = JSON.parse(fs.readFileSync(path.join(root,'artifacts/f03-f05/results.json'),'utf8')).gate2Execution;
  if (gate?.initializationAccepted !== true || gate?.credentialIncident?.status !== 'user-confirmed-rotated'
    || gate?.readerHandoff?.endpoint?.directHost !== host) throw Error('APPROVED_PASSWORD_TARGET_REQUIRED');
  const receiptFile = path.join(root,'artifacts/f03-f05/cloud-reader.provisioning.local.json');
  if (fs.existsSync(receiptFile) || fs.existsSync(path.join(root,'artifacts/f03-f05/cloud-reader.proof.local.json'))) {
    throw Error('EXISTING_PASSWORD_SETUP_RECEIPT_PRESERVED');
  }
  const target = {...gate.bootstrap.target,environmentId:gate.bootstrap.environmentId};
  console.log('仅设置 jinxi-test 的 jinxi_test_reader；不创建角色、不修改其他角色权限。');
  let adminPassword = await secretPrompt('请输入已重置的 TEST neondb_owner 密码');
  if (!adminPassword) throw Error('TEST_PASSWORD_ADMIN_INPUT_EMPTY');
  if (/^postgres(?:ql)?:\/\//i.test(adminPassword)) throw Error('TEST_PASSWORD_ADMIN_INPUT_MUST_BE_PASSWORD_ONLY');
  const client = new Client({host,port:5432,database:'neondb',user:'neondb_owner',password:adminPassword,
    ssl:{rejectUnauthorized:true,servername:host},enableChannelBinding:true,connectionTimeoutMillis:10000});
  client.on('error',()=>{});
  client.on('notice',()=>{});
  let password,confirm;
  try {
    await client.connect(); adminPassword = undefined;
    await checkScope(client,target);
    console.log('TEST 身份、角色权限和所查 PostgreSQL 日志配置已核对。新密码请预先私下保存：32至128位随机可见英文字符，大小写/数字/符号至少3类。');
    password = await secretPrompt('请输入新的 jinxi_test_reader 专用密码');
    confirm = await secretPrompt('再次输入新的 reader 密码');
    if (password !== confirm) throw Error('TEST_READER_PASSWORD_CONFIRMATION_MISMATCH');
    if (!validNewPassword(password)) throw Error('TEST_READER_NEW_PASSWORD_REQUIREMENTS');
    const roles = await setReaderPassword(client,password,target);
    password = undefined; confirm = undefined;
    fs.writeFileSync(receiptFile,JSON.stringify({kind:'jinxi-test-reader-provisioned-v1',host,
      environmentId:target.environmentId,projectId:target.projectId,branchId:target.branchId,
      endpointId:target.endpointId,roles,completedAtUtc:new Date().toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});
  } finally { adminPassword = undefined; password = undefined; confirm = undefined; await client.end().catch(()=>{}); }
  console.log('reader 密码设置及 LOGIN 已提交。接下来请在原生 psql 提示处输入刚设置的 reader 密码。');
  const result = spawnSync(process.execPath,[path.join(__dirname,'run-test-reader-proof.cjs')],{env:cleanEnv(),stdio:'inherit'});
  if (result.status !== 0) throw Error('TEST_READER_PASSWORD_SET_BUT_PROOF_PENDING');
}
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('USER_INTERACTIVE_TERMINAL_REQUIRED');
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--clean-child') return interactive();
  if (args.length) throw Error('NO_PASSWORD_OR_CONNECTION_ARGUMENTS_ACCEPTED');
  const result = spawnSync(process.execPath,[__filename,'--clean-child'],{env:cleanEnv(),stdio:'inherit'});
  process.exitCode = result.status === 0 ? 0 : 1;
}
if (require.main === module) main().catch(error=>{
  console.error(/^(USER_|CLEAN_|APPROVED_|EXISTING_|NO_PASSWORD_|TEST_PASSWORD_|TEST_READER_)/.test(error.message)
    ? error.message : 'TEST_READER_PASSWORD_SETUP_UNAVAILABLE');
  process.exitCode=1;
});
module.exports={passwordGuard,safeLogging,validNewPassword,checkScope,setReaderPassword,secretPrompt};
