// Creates a NEW loopback-only disposable cluster; never loads any DSN/.env.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { cleanEnv } = require('./run-clean.cjs');
async function run() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--pg-bin' || !path.isAbsolute(args[1])) throw Error('EXPLICIT_LOCAL_POSTGRES_BIN_REQUIRED');
  const bin = path.resolve(args[1]), ext = process.platform === 'win32' ? '.exe' : '';
  for (const name of ['initdb','pg_ctl','postgres']) if (!fs.existsSync(path.join(bin,name+ext))) throw Error('POSTGRES_TOOLS_MISSING');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jinxi-f03-f05-'));
  const data = path.join(folder,'data'), port = 55435, user = 'jinxi_f03_admin';
  let started = false;
  function pg(name, argv) {
    const result = spawnSync(path.join(bin,name+ext),argv,{env:cleanEnv(),encoding:'utf8',timeout:60000,windowsHide:true});
    fs.appendFileSync(path.join(folder,'tools.log'), (result.stdout || '') + (result.stderr || ''));
    if (result.status !== 0) throw Error('DISPOSABLE_POSTGRES_'+name.toUpperCase()+'_FAILED');
  }
  try {
    pg('initdb',['-D',data,'-U',user,'--auth=trust','--encoding=UTF8','--no-locale']);
    pg('pg_ctl',['-D',data,'-l',path.join(folder,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);
    started = true;
    const admin = new Client({host:'127.0.0.1',port,user,database:'postgres',connectionTimeoutMillis:2000});
    await admin.connect();
    try { await admin.query('CREATE DATABASE neondb'); } finally { await admin.end(); }
    const manifest = path.join(folder,'local-manifest.json');
    fs.writeFileSync(manifest,JSON.stringify({kind:'jinxi-f03-disposable-v1',folder,host:'127.0.0.1',port,user,database:'neondb'}),{mode:0o600,flag:'wx'});
    const result = spawnSync(process.execPath,['--test','--test-concurrency=1','tests/test-environment-postgres.test.cjs'],{
      cwd:path.resolve(__dirname,'..'),env:cleanEnv({JINXI_F03_LOCAL_MANIFEST:manifest}),encoding:'utf8',timeout:180000,
    });
    const output = (result.stdout || '') + (result.stderr || '');
    fs.writeFileSync(path.join(folder,'tests.log'),output);
    process.stdout.write(output);
    if (result.status !== 0) throw Error('DISPOSABLE_POSTGRES_TEST_FAILED');
    console.log('Disposable synthetic PostgreSQL passed; no cloud connection was used.');
  } finally {
    if (started) pg('pg_ctl',['-D',data,'-m','fast','-w','stop']);
    console.log('Local PostgreSQL evidence directory: '+folder);
  }
}
if (require.main === module) run().catch(error=>{console.error(/^(EXPLICIT|POSTGRES|DISPOSABLE)/.test(error.message)?error.message:'DISPOSABLE_TEST_UNAVAILABLE');process.exitCode=1});
