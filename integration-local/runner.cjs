const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), net = require('node:net');
const { spawn } = require('node:child_process');
const { cleanEnv } = require('../scripts/run-clean.cjs');
const { freshOperations } = require('../operations-local/database.cjs');
const { serveIntegration } = require('./server.cjs');

async function freePort(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port,'127.0.0.1',resolve); });
  await new Promise(resolve => { probe.close(resolve); });
}
async function renderer(folder) {
  await freePort(3070);
  const log = fs.openSync(path.join(folder,'renderer.private.log'),'wx',0o600);
  const child = spawn(process.execPath, [path.resolve(__dirname,'../node_modules/next/dist/bin/next'), 'dev', path.join(__dirname,'site'), '--hostname','127.0.0.1','--port','3070','--webpack'], {
    cwd: path.resolve(__dirname,'..'), env: cleanEnv({ NODE_ENV: 'development', JINXI_INTEGRATION_RENDERER: 'local-synthetic-v1' }), stdio: ['ignore',log,log], windowsHide: true,
  });
  fs.closeSync(log);
  const close = async () => {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32') {
      const { spawnSync } = require('node:child_process');
      spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{ windowsHide: true, stdio: 'ignore', env: cleanEnv() });
    } else child.kill('SIGTERM');
    await new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once('exit',resolve); setTimeout(resolve,4000).unref(); } });
  };
  try {
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      if (child.exitCode !== null) throw Error('LOCAL_RENDERER_EXITED');
      ready = await new Promise(resolve => { const req = http.get('http://127.0.0.1:3070/', res => { res.resume(); resolve(res.statusCode === 200); }); req.setTimeout(1500,() => req.destroy()); req.on('error',() => resolve(false)); });
      if (!ready) await new Promise(resolve => { setTimeout(resolve,500); });
    }
    if (!ready) throw Error('LOCAL_RENDERER_NOT_READY');
    return { close };
  } catch (e) { await close(); throw e; }
}
async function startIntegration(pgBin, openssl) {
  // Every launch creates a NEW, fingerprinted, loopback PostgreSQL cluster.
  // No existing DB, .env or inherited connection string is accepted.
  await freePort(3069); await freePort(3070);
  const db = await freshOperations(pgBin); let ui, server;
  try {
    const admin = await db.admin();
    try {
      await admin.query("SELECT set_config('points.actor',$1,false)",[db.accounts.admin.memberId]);
      await admin.query("INSERT INTO points_lab.catalogue(name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) VALUES('集成用虚构纸签（仅合成）',1,2,2,2,0,'1900-01-01T00:00:00Z','2199-12-31T00:00:00Z','enabled')");
    } finally { await admin.end(); }
    fs.writeFileSync(path.join(db.folder,'integration-accounts.private.json'),JSON.stringify(Object.values(db.accounts).map(({ kind, account, password }) => ({ kind, account, password })),null,2),{ flag: 'wx', mode: 0o600 });
    ui = await renderer(db.folder); server = await serveIntegration(db,openssl);
    return { db, server, close: async () => { await server.close(); await ui.close(); await db.stop(); } };
  } catch (e) { await server?.close(); await ui?.close(); await db.stop(); throw e; }
}
module.exports = { startIntegration };
