const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const tls = require('node:tls');
const https = require('node:https');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { Client } = require('pg');
const { cleanEnv } = require('../scripts/run-clean.cjs');
const { fingerprint } = require('../netlify/functions/_shared/function-security');
const { roles } = require('../service-adapter/resource.cjs');
const { DATABASE, REVISION, resourceKeys, credentialNames } = require('../synthetic-cloud/binding.cjs');
const { root, publish, functions } = require('../synthetic-cloud/build.cjs');
const { initialize, activateRoles } = require('../synthetic-cloud/database/initialize.cjs');
const { seed } = require('../synthetic-cloud/database/seed.cjs');

const origin = 'https://synthetic-rehearsal.netlify.app';
const host = 'ep-synthetic-rehearsal.us-east-2.aws.neon.tech';
const initializer = 'jinxi_cloud_initializer';
const evidence = path.join(root, 'artifacts/phase4-synthetic-cloud/local');
const hex = () => crypto.randomBytes(32).toString('hex');

function toolsFromArgs(args) {
  if (args.length !== 4 || args[0] !== '--pg-bin' || args[2] !== '--openssl' ||
      !path.isAbsolute(args[1]) || !path.isAbsolute(args[3])) throw Error('LOCAL_TOOL_PATHS_REQUIRED');
  return { pgBin: args[1], openssl: args[3] };
}

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, env: cleanEnv(), encoding: 'utf8', windowsHide: true,
    timeout: 30000, ...options });
  if (result.error || result.status !== 0) {
    const error = Error('LOCAL_TOOL_FAILED_' + path.basename(executable) + '_' + (args[0] || ''));
    throw error;
  }
  return (result.stdout || '').trim();
}

async function useLoopbackMapping(port, use) {
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    if (args[1] === host && args[0] === 5432) {
      args[0] = port;
      args[1] = '127.0.0.1';
    }
    return Reflect.apply(connect,this,args);
  };
  try { return await use(); } finally { net.Socket.prototype.connect = connect; }
}

async function loopbackTls(options, use) {
  const original = tls.getCACertificates('default');
  tls.setDefaultCACertificates([...original, options.cert.toString('utf8')]);
  // Mapping is process-local. TLS still validates the fictional DNS endpoint.
  try { return await useLoopbackMapping(5432,use); } finally {
    tls.setDefaultCACertificates(original);
  }
}

async function freshDatabase({ pgBin, openssl }) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jinxi-cloud-rehearsal-'));
  const data = path.join(folder, 'data');
  const extension = process.platform === 'win32' ? '.exe' : '';
  const pg = (name, args) => run(path.join(pgBin, name + extension), args);
  const passwordFile = path.join(folder, 'bootstrap.private');
  const rootPassword = hex(), initializerPassword = hex();
  fs.writeFileSync(passwordFile, rootPassword, { flag: 'wx', mode: 0o600 });
  const keyFile = path.join(folder, 'key.private'), certFile = path.join(folder, 'cert.pem');
  const caFile = path.join(folder,'ca.pem'), caKey = path.join(folder,'ca-key.private');
  const csr = path.join(folder,'leaf.csr'), extensions = path.join(folder,'leaf.cnf');
  run(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=Jinxi temporary local rehearsal CA',
    '-addext','basicConstraints=critical,CA:TRUE,pathlen:0','-addext','keyUsage=critical,keyCertSign,cRLSign',
    '-addext','nameConstraints=critical,permitted;DNS:localhost,permitted;DNS:' + host + ',permitted;IP:127.0.0.1/255.255.255.255',
    '-keyout',caKey,'-out',caFile]);
  run(openssl, ['req','-new','-newkey','rsa:2048','-nodes','-subj','/CN=localhost','-keyout',keyFile,'-out',csr]);
  fs.writeFileSync(extensions,'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\n' +
    'extendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,DNS:' + host + ',IP:127.0.0.1\n');
  run(openssl, ['x509','-req','-in',csr,'-CA',caFile,'-CAkey',caKey,'-set_serial','0x'+crypto.randomBytes(16).toString('hex'),
    '-sha256','-days','1','-extfile',extensions,'-out',certFile]);
  fs.unlinkSync(caKey);
  const cert = fs.readFileSync(caFile), leaf = fs.readFileSync(certFile), key = fs.readFileSync(keyFile);
  const keyPath = keyFile.replaceAll('\\','/').replaceAll("'", "''");
  const certPath = certFile.replaceAll('\\','/').replaceAll("'", "''");
  let started = false;
  async function connect(user, password, database = DATABASE, ssl = { ca: cert, rejectUnauthorized: true }) {
    const client = new Client({ host: '127.0.0.1', port: 5432, user, password, database,
      ssl: { servername:'localhost', ...ssl },
      application_name: 'jinxi-synthetic-test-rehearsal', connectionTimeoutMillis: 2000 });
    try { await client.connect(); return client; } catch (error) { await client.end().catch(() => {}); throw error; }
  }
  function stop() {
    if (started) pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    started = false;
  }
  try {
    pg('initdb', ['-D',data,'-U','synthetic_rehearsal_root','--auth-local=trust','--auth-host=scram-sha-256',
      '--pwfile='+passwordFile,'--encoding=UTF8','--no-locale']);
    fs.unlinkSync(passwordFile);
    fs.appendFileSync(path.join(data, 'postgresql.conf'), "\nlisten_addresses = '127.0.0.1'\nport = 5432\n" +
      "ssl = on\nssl_key_file = '" + keyPath + "'\nssl_cert_file = '" + certPath + "'\n" +
      "log_parameter_max_length = 0\nlog_min_error_statement = 'fatal'\n");
    // On Windows the server may inherit the pg_ctl output pipes. A real file
    // lets pg_ctl return even while this temporary server keeps running.
    const log = fs.openSync(path.join(folder,'pg-ctl.private.log'),'a',0o600);
    try {
      run(path.join(pgBin,'pg_ctl' + extension), ['-D',data,'-l',path.join(folder,'postgres.private.log'),'-w','start'],
        { stdio:['ignore',log,log], timeout:45000 });
      started = true;
    } finally {
      fs.closeSync(log);
      if (!started && fs.existsSync(path.join(data,'postmaster.pid'))) started = true;
    }
    const root = await connect('synthetic_rehearsal_root', rootPassword, 'postgres');
    try {
      await root.query("CREATE ROLE " + initializer + " LOGIN CREATEROLE PASSWORD '" + initializerPassword + "'");
      await root.query('CREATE DATABASE ' + DATABASE + ' OWNER ' + initializer);
      await root.query('REVOKE CONNECT ON DATABASE postgres, template1 FROM PUBLIC');
    } finally { await root.end(); }
    const admin = () => connect(initializer, initializerPassword);
    const superuser = () => connect('synthetic_rehearsal_root', rootPassword);
    const bootstrap = await superuser();
    try { await bootstrap.query('GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO ' + initializer); }
    finally { await bootstrap.end(); }
    const client = await admin();
    let target;
    try {
      const { rows: [actual] } = await client.query('SELECT system_identifier::text AS cluster_id,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid FROM pg_control_system()');
      target = { projectId: 'synthetic-rehearsal-project', branchId: 'br-synthetic-rehearsal', endpointId: 'ep-synthetic-rehearsal',
        host, database: DATABASE, environmentId: crypto.randomUUID(),
        fingerprint: fingerprint(actual.cluster_id, actual.database_oid, DATABASE), serverAddresses: ['127.0.0.1'], initializer };
    } finally { await client.end(); }
    return { folder, cert, leaf, key, connect, admin, superuser, target, stop };
  } catch (error) { stop(); throw error; }
}

function makeApproval(database, schemaFingerprint, commit) {
  return { version: 1, enabled: true, classification: 'synthetic-test', schemaRevision: REVISION,
    ...Object.fromEntries(resourceKeys.map(key => [key, database.target[key]])), schemaFingerprint, origin,
    siteId: crypto.randomUUID(), teamId: crypto.randomBytes(12).toString('hex'), gitBranch: 'codex/jinxi-phase4-synthetic-cloud-local',
    commit, expiresAt: new Date(Date.now() + 3600000).toISOString() };
}
function buildEnv(approval, deployId) {
  return { NETLIFY:'true', CONTEXT:'production', BRANCH:approval.gitBranch, COMMIT_REF:approval.commit,
    SITE_ID:approval.siteId, ACCOUNT_ID:approval.teamId, URL:approval.origin, PULL_REQUEST:'false', DEPLOY_ID:deployId,
    REPOSITORY_URL:'https://github.com/2574303451-create/jinxi-web',
    JINXI_SYNTHETIC_BUILD_APPROVAL: JSON.stringify(approval) };
}
function runtimeEnv(approval, passwords) {
  return { SITE_ID: approval.siteId, URL: approval.origin, JINXI_SERVICE_APPROVAL: approval.commit,
    ...Object.fromEntries(Object.entries(credentialNames).map(([name,key]) => [key, roles[name] ? passwords[roles[name]] : hex()])) };
}
function contextFor(approval, deployId) {
  return { account: { id: approval.teamId }, site: { id: approval.siteId, url: approval.origin },
    deploy: { id: deployId, context: 'production', published: true }, ip: '127.0.0.1' };
}

async function withEnv(env, action) {
  // Never pass real cloud/DB variables to any part of the rehearsal.
  const saved = process.env;
  process.env = cleanEnv({ NODE_ENV: 'production', ...env });
  try { return await action(); } finally { process.env = saved; }
}

async function buildAndBundle(database, schemaFingerprint, passwords) {
  const commit = run('git', ['rev-parse', 'HEAD']);
  const approval = makeApproval(database, schemaFingerprint, commit), deployId = crypto.randomBytes(12).toString('hex');
  const env = buildEnv(approval, deployId);
  const cli = path.dirname(require.resolve('netlify-cli/package.json'));
  const { resolveConfig } = await import(pathToFileURL(path.join(cli, 'node_modules/@netlify/config/lib/index.js')).href);
  const { config, configPath } = await withEnv(env, () => resolveConfig({
    cwd: root, offline: true, packagePath: 'synthetic-cloud', context: 'production',
    repositoryRoot: root, env,
  }));
  assert.equal(path.normalize(configPath), path.join(root, 'synthetic-cloud/netlify.toml'));
  assert.equal(path.normalize(config.build.publish), publish);
  assert.equal(path.normalize(config.functionsDirectory), functions);
  assert.equal(config.build.command, 'node ./synthetic-cloud/build.cjs');
  assert.equal(config.build.ignore, 'node ./synthetic-cloud/build.cjs --check');
  assert.equal(config.build.environment.NPM_FLAGS,'--include=dev');
  assert.equal(config.build.environment.NODE_ENV,undefined);

  const build = spawnSync(process.execPath, [path.join(root,'synthetic-cloud/build.cjs')], {
    cwd: root, env: cleanEnv(env), encoding: 'utf8', timeout: 200000, windowsHide: true, maxBuffer: 2 * 1024 * 1024,
  });
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, 'last-static-build.log'), build.stdout + '\n' + build.stderr);
  if (build.status !== 0) throw Error('SYNTHETIC_BUILD_FAILED_SEE_LAST_STATIC_BUILD_LOG');

  const pkg = path.join(cli, 'node_modules/@netlify/zip-it-and-ship-it');
  const { zipFunctions } = await import(pathToFileURL(path.join(pkg,'dist/main.js')).href);
  const options = { basePath: root, repositoryRoot: root, config: { '*': { nodeVersion:'24' } } };
  const zip = await zipFunctions(functions, path.join(database.folder,'zip'), { ...options, archiveFormat:'zip' });
  assert.equal(zip.length,1);
  assert.equal(zip[0].runtimeAPIVersion,2);
  assert.equal(zip[0].invocationMode,'stream');
  const routes = zip[0].routes.map(route => route.literal).sort();
  assert(zip[0].routes.every(route => JSON.stringify(route.methods) === JSON.stringify(['GET','POST'])));
  assert.deepEqual(routes, [
    '/.netlify/functions/announcements','/.netlify/functions/guide-video-stats','/.netlify/functions/messages',
    '/.netlify/functions/sponsorship','/.netlify/functions/strategies','/api/attendance','/api/community',
    '/api/member','/api/operations','/api/points',
  ]);
  const envAtRuntime = runtimeEnv(approval, passwords);
  const unpacked = path.join(database.folder,'bundle');
  fs.mkdirSync(unpacked);
  run('tar.exe',['-xf',zip[0].path,'-C',unpacked]);
  const record = { commit, netlifyConfig: 'synthetic-cloud/netlify.toml', runtimeApi: 2, routes,
    bundler: zip[0].bundler, zipBytes: fs.statSync(zip[0].path).size, schemaFingerprint };
  fs.writeFileSync(path.join(evidence, 'last-package.json'), JSON.stringify(record, null, 2) + '\n');
  const files = fs.readdirSync(unpacked, { recursive: true });
  const runtimeFile = files.find(file => path.basename(file) === 'jinxi-service.mjs');
  if (!runtimeFile) throw Error('BUNDLED_FETCH_ENTRY_MISSING');
  const { default: entry } = await withEnv(envAtRuntime, () => import(pathToFileURL(path.join(unpacked, runtimeFile)).href));
  return { entry, approval, deployId, envAtRuntime, context: contextFor(approval, deployId), packageRecord: record };
}

function staticFile(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0')) return null;
  const direct = path.resolve(publish, '.' + pathname);
  if (!direct.startsWith(publish + path.sep) && direct !== publish) return null;
  const file = [direct, path.join(direct,'index.html')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return file && !path.basename(file).startsWith('.') ? file : null;
}

async function serve(database, bundle) {
  const headers = Object.fromEntries(fs.readFileSync(path.join(publish,'_headers'),'utf8').split(/\r?\n/)
    .filter(line => line.startsWith('  ') && !line.includes('Cache-Control'))
    .map(line => { const idx=line.indexOf(':');return [line.slice(0,idx).trim(),line.slice(idx+1).trim()]; }));
  const types = { '.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.txt':'text/plain',
    '.json':'application/json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp4':'video/mp4' };
  let context = bundle.context;
  let localOrigin;
  const server = https.createServer({ key: database.key, cert: database.leaf }, async (req,res) => {
    try {
      if (!req.url.startsWith('/') || req.url.startsWith('//')) { res.writeHead(400).end(); return; }
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) {
        const body = ['GET','HEAD'].includes(req.method) ? undefined : req;
        const requestHeaders = new Headers(req.headers);
        // Local TLS listener stands in for Netlify's canonical site. Rewrite
        // only its own Origin. Foreign Origin and all body bytes stay intact.
        if (requestHeaders.get('origin') === localOrigin) requestHeaders.set('origin', origin);
        const request = new Request(url, { method:req.method, headers:requestHeaders, body, duplex:'half' });
        const response = await bundle.entry(request, context);
        const values = Object.fromEntries(response.headers);
        if (response.headers.getSetCookie().length) values['set-cookie'] = response.headers.getSetCookie();
        res.writeHead(response.status, values).end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const file = staticFile(url);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
      if (!file) { res.writeHead(404, { ...headers, 'Content-Type':types['.html'] }).end(fs.readFileSync(path.join(publish,'404.html'))); return; }
      res.writeHead(200, { ...headers, 'Content-Type':types[path.extname(file)] || 'application/octet-stream' });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    } catch { if (!res.headersSent) res.writeHead(503).end('SYNTHETIC_REHEARSAL_UNAVAILABLE'); else res.destroy(); }
  });
  server.requestTimeout = 10000;
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  localOrigin = 'https://127.0.0.1:' + server.address().port;
  return { cert: database.cert, origin: localOrigin,
    setContext: value => { context = value; }, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

async function startRehearsal(tools) {
  const db = await freshDatabase(tools);
  let server;
  try {
    const client = await db.admin();
    let initialized, accounts;
    const passwords = Object.fromEntries(Object.values(roles).map(role => [role,hex()]));
    try {
      initialized = await initialize(client, db.target);
      accounts = await seed(client, db.target, initialized.schemaFingerprint);
      await activateRoles(client, db.target, initialized.schemaFingerprint, passwords);
    } finally { await client.end(); }
    const bundle = await buildAndBundle(db, initialized.schemaFingerprint, passwords);
    server = await serve(db,bundle);
    return { db: { ...db, accounts, settings:{ origin:server.origin } }, server, bundle, initialized,
      close: async () => { await server.close(); db.stop(); } };
  } catch (error) { await server?.close(); db.stop(); throw error; }
}

module.exports = { toolsFromArgs, freshDatabase, loopbackTls, makeApproval, buildEnv, runtimeEnv, contextFor, buildAndBundle, serve, startRehearsal, withEnv, evidence };
