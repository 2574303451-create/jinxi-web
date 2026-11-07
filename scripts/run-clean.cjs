// Local commands inherit only OS/toolchain settings, never database/cloud keys.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
function cleanEnv(extra = {}) {
  const env = {};
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS']) {
    if (typeof process.env[key] === 'string') env[key] = process.env[key];
  }
  env.PATH = path.dirname(process.execPath) + path.delimiter + (process.env.PATH || process.env.Path || '');
  return { ...env, NEXT_TELEMETRY_DISABLED: '1', ...extra };
}
function npmCliPath(executable = process.execPath) {
  const directory = path.dirname(fs.realpathSync(executable));
  const candidates = [
    path.join(directory,'node_modules/npm/bin/npm-cli.js'),
    path.resolve(directory,'../lib/node_modules/npm/bin/npm-cli.js'),
  ];
  const cli = candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!cli) throw Error('NPM_CLI_NOT_FOUND');
  return fs.realpathSync(cli);
}
function npm(args, options = {}) {
  return spawnSync(process.execPath, [npmCliPath(), ...args], {
    env: cleanEnv(), stdio: 'inherit', ...options,
  });
}
if (require.main === module) {
  const result = npm(process.argv.slice(2));
  process.exitCode = result.status ?? 1;
}
module.exports = { cleanEnv, npm, npmCliPath };
