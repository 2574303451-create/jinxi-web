const path = require('node:path');
const { startIntegration } = require('../integration-local/runner.cjs');
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--pg-bin' || args[2] !== '--openssl') throw Error('EXPLICIT_LOCAL_TOOLS_REQUIRED');
  const app = await startIntegration(args[1],args[3]);
  try {
    console.log('Local synthetic integrated website: https://127.0.0.1:3069/');
    console.log('Private synthetic credentials: ' + path.join(app.db.folder,'integration-accounts.private.json'));
    console.log('Ctrl+C stops only this preview and its new synthetic database.');
    await new Promise(resolve => { process.once('SIGINT',resolve); process.once('SIGTERM',resolve); });
  } finally { await app.close(); }
}
if (require.main === module) main().catch(e => { console.error('LOCAL_INTEGRATION_UNAVAILABLE: ' + (e.code || e.message)); process.exitCode = 1; });
