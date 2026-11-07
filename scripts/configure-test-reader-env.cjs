// User-operated credential configuration for the one approved TEST site.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { cleanEnv } = require('./run-clean.cjs');
const { secretPrompt, validNewPassword } = require('./setup-test-reader-password.cjs');
const { validateBinding } = require('../netlify/functions/_shared/test-resource');
const { verify } = require('./verify-test-role.cjs');

const siteId = '17885134-a57c-4589-83d3-39e30be9e0cf';
const accountId = '689e1405e8627000726e883c';
const host = 'ep-dry-queen-bd6q46s6.c-8.us-east-2.aws.neon.tech';
const branch = 'codex/jinxi-f03-f05-test-foundation';
const key = 'JINXI_TEST_READ_DATABASE_URL';
const safeErrors = new Set(['USER_INTERACTIVE_TERMINAL_REQUIRED','NO_CREDENTIAL_ARGUMENTS_ACCEPTED',
  'CLEAN_CLIENT_REQUIRED','APPROVED_TEST_STATE_REQUIRED','EXISTING_ENV_RECEIPT_PRESERVED',
  'TEST_SITE_SETTINGS_REJECTED','TEST_READER_PASSWORD_FORMAT_REJECTED','TEST_ENV_CONFIGURATION_REJECTED',
  'TEST_ENV_RESULT_UNCONFIRMED','TEST_PASSWORD_SETUP_CANCELLED']);

function assertSite(site, binding) {
  validateBinding(binding);
  const settings = site?.build_settings;
  if (binding.siteId !== siteId || binding.hosts[0] !== host || site?.id !== siteId || site.account_id !== accountId
      || site.name !== 'jinxi-web-test' || settings?.repo_path !== '2574303451-create/jinxi-web'
      || settings.repo_branch !== branch || settings.stop_builds !== true || settings.skip_prs !== true
      || !Array.isArray(settings.allowed_branches) || settings.allowed_branches.length !== 1
      || settings.allowed_branches[0] !== branch
      || Object.keys(settings.env || {}).some(name => name !== 'DEPRECATED')
      || (site.plugins || []).length) throw Error('TEST_SITE_SETTINGS_REJECTED');
}

function makeVariable(password, binding) {
  validateBinding(binding);
  if (binding.siteId !== siteId || binding.hosts[0] !== host || !validNewPassword(password)) throw Error('TEST_READER_PASSWORD_FORMAT_REJECTED');
  const url = new URL(`postgresql://${binding.readerRole}@${host}:5432/neondb?sslmode=require&channel_binding=require`);
  url.password = encodeURIComponent(password);
  // Netlify excludes post-processing from secret variables, including on Free.
  return { key, is_secret: true, scopes: ['builds','functions','runtime'],
    values: [{ context: 'production', value: url.toString() }] };
}

async function provision(site, binding, prompt, submit) {
  assertSite(site, binding);
  let password, variable;
  try {
    password = await prompt('请输入已设置的 jinxi_test_reader 密码');
    variable = makeVariable(password, binding);
    const result = await submit(variable);
    const values = Array.isArray(result?.values) ? result.values : [];
    if (result?.key !== key || result.is_secret !== true || values.length !== 1
        || values[0].context !== 'production') throw Error('TEST_ENV_RESULT_UNCONFIRMED');
    return { kind: 'jinxi-test-reader-environment-v1', siteId, accountId, key,
      isSecret: true, contexts: ['production'], scopes: result.scopes,
      completedAtUtc: new Date().toISOString() };
  } finally { password = undefined; variable = undefined; }
}

async function interactive() {
  if (process.execArgv.length || process.env.NODE_OPTIONS) throw Error('CLEAN_CLIENT_REQUIRED');
  const root = path.resolve(__dirname,'..');
  const binding = JSON.parse(fs.readFileSync(path.join(root,'netlify/functions/_shared/test-resource-binding.json'),'utf8'));
  const gate = JSON.parse(fs.readFileSync(path.join(root,'artifacts/f03-f05/results.json'),'utf8')).gate2Execution;
  const proof = JSON.parse(fs.readFileSync(path.join(root,'artifacts/f03-f05/cloud-reader.proof.local.json'),'utf8'));
  if (gate.netlifySiteId !== siteId || gate.cloudReaderAcceptance?.accepted !== true) throw Error('APPROVED_TEST_STATE_REQUIRED');
  verify(proof.proof,binding);
  const receipt = path.join(root,'artifacts/f03-f05/netlify-reader-env.provisioning.local.json');
  if (fs.existsSync(receipt)) throw Error('EXISTING_ENV_RECEIPT_PRESERVED');

  const cli = path.dirname(require.resolve('netlify-cli/package.json'));
  const { default: BaseCommand } = await import(pathToFileURL(path.join(cli,'dist/commands/base-command.js')).href);
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-test-env-'));
  let command;
  try {
    process.chdir(temporaryDirectory);
    command = new BaseCommand('api');
    command.setOptionValue('offline',true);
    command.setOptionValue('offlineEnv',true);
    await command.init(command);
  } finally { process.chdir(originalDirectory); }
  const headers = command.netlify.api.defaultHeaders;
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`,
    { headers, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const error = Error('TEST_SITE_SETTINGS_REJECTED');
    error.status = response.status;
    throw error;
  }
  const site = await response.json();
  console.log('配置目标为 jinxi-web-test，仅设置专用 reader 的 production context 秘密变量。');
  const result = await provision(site,binding,secretPrompt,async variable => {
    let response;
    try {
      response = await fetch(`https://api.netlify.com/api/v1/accounts/${accountId}/env?site_id=${siteId}`, {
        method: 'POST', headers: { ...headers, 'Content-Type':'application/json' },
        body: JSON.stringify([variable]), redirect:'error', signal:AbortSignal.timeout(15000),
      });
    } catch { throw Error('TEST_ENV_RESULT_UNCONFIRMED'); }
    if (!response.ok) {
      await response.body?.cancel();
      const error = Error('TEST_ENV_CONFIGURATION_REJECTED');
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  });
  try { fs.writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600}); }
  catch { throw Error('TEST_ENV_RESULT_UNCONFIRMED'); }
  console.log('TEST reader 秘密变量已配置。构建继续保持暂停，等待指定提交验收。');
  console.log('非秘密回执：'+receipt);
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('USER_INTERACTIVE_TERMINAL_REQUIRED');
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--clean-child') return interactive();
  if (args.length) throw Error('NO_CREDENTIAL_ARGUMENTS_ACCEPTED');
  const result = spawnSync(process.execPath,[__filename,'--clean-child'],{
    env:cleanEnv({NETLIFY_CLI_TELEMETRY_DISABLED:'1'}),stdio:'inherit',
  });
  process.exitCode = result.status === 0 ? 0 : 1;
}

if (require.main === module) main().catch(error => {
  const reason = safeErrors.has(error?.message) ? error.message : 'TEST_ENV_CONFIGURATION_UNAVAILABLE';
  const httpStatus = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : undefined;
  console.error(JSON.stringify({reason,...(httpStatus?{httpStatus}:{})}));
  process.exitCode = 1;
});
module.exports = { assertSite, makeVariable, provision };
