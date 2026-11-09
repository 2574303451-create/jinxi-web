const https = require('node:https'), http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { cleanEnv } = require('../scripts/run-clean.cjs');
const { localSettings } = require('../member-local/identity.cjs');
const { handlers: createServiceHandlers } = require('../service-adapter/handlers.cjs');
const { publicContract } = require('./public-contract.cjs');

async function serveIntegration(db, openssl) {
  localSettings(db.settings, {});
  if (!path.isAbsolute(openssl) || !fs.existsSync(openssl)) throw Error('LOCAL_OPENSSL_REQUIRED');
  const key = path.join(db.folder, 'integration-key.private'), certificate = path.join(db.folder, 'integration-cert.pem');
  const result = spawnSync(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',certificate], { env: cleanEnv(), encoding: 'utf8', timeout: 15000, windowsHide: true });
  if (result.status !== 0) throw Error('LOCAL_TLS_UNAVAILABLE');
  const services = createServiceHandlers({ settings: db.settings, env: cleanEnv(), clientAddress: e => e.localClientAddress,
    connections: { member: db.connect, community: db.connectBusiness, attendance: db.connectAttendance, points: db.connectPoints, operations: db.connectOperations } });
  const handlers = Object.fromEntries(Object.entries(services).map(([name,handler]) => ['/api/' + name,handler]));
  const fixtures = {
    '/fixtures/community-cover.jpg': ['public/placeholder.jpg','image/jpeg'],
    '/fixtures/community-demo.mp4': ['artifacts/b2-a-8/video-demo/synthetic-motion.mp4','video/mp4'],
    '/fixtures/operations-cover.svg': ['artifacts/b2-a-8/video-demo/synthetic-cover.svg','image/svg+xml'],
    '/fixtures/operations-motion.mp4': ['artifacts/b2-a-8/video-demo/synthetic-motion.mp4','video/mp4'],
  };
  const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(certificate) }, async (req, res) => {
    const common = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
    // Next development needs inline HMR bootstrap; this policy is NEVER a production CSP.
    const policy = "default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval';style-src 'self' 'unsafe-inline';img-src 'self' data: blob:;media-src 'self';connect-src 'self';font-src 'self';object-src 'none';base-uri 'none';frame-ancestors 'none';form-action 'self'";
    const send = (status, body, type = 'application/json; charset=utf-8', headers = {}) => { res.writeHead(status, { ...common, 'Content-Security-Policy': policy, 'Content-Type': type, ...headers }); res.end(body); };
    try {
      if (req.headers.host !== '127.0.0.1:3069' || !['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(403, '{"code":"LOCAL_HOST_REQUIRED"}');
      if (!req.url.startsWith('/') || req.url.startsWith('//')) return send(400, '{"code":"RELATIVE_PATH_REQUIRED"}');
      const url = new URL(req.url, db.settings.origin);
      if ([...url.searchParams.keys()].some(k => url.searchParams.getAll(k).length > 1)) return send(400, '{"code":"DUPLICATE_QUERY"}');
      if (Object.hasOwn(handlers, url.pathname)) {
        if (Number(req.headers['content-length']) > 65536) return send(413, '{"code":"BODY_REJECTED"}');
        const chunks = []; let bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 65536) { req.resume(); return send(413, '{"code":"BODY_REJECTED"}'); } chunks.push(chunk); }
        const r = await handlers[url.pathname]({ httpMethod: req.method, headers: req.headers, queryStringParameters: Object.fromEntries(url.searchParams), body: Buffer.concat(chunks).toString('utf8'), localClientAddress: req.socket.remoteAddress });
        if (url.pathname === '/api/member' && r.headers['Set-Cookie']) r.headers['Set-Cookie'] = [r.headers['Set-Cookie'], '__Host-jinxi_points_epoch=' + crypto.randomUUID() + '; Path=/; Secure; SameSite=Strict'];
        return send(r.statusCode, r.body, undefined, r.headers);
      }
      if (url.pathname.startsWith('/.netlify/')) {
        if (req.method !== 'GET') return send(410, '{"code":"LEGACY_WRITES_FROZEN"}');
        const body = await publicContract(url.pathname.replace('/.netlify/functions/',''), Object.fromEntries(url.searchParams), handlers);
        return send(body === null ? 404 : 200, JSON.stringify(body || { code: 'NOT_FOUND' }));
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, '{"code":"METHOD_NOT_ALLOWED"}');
      if (Object.hasOwn(fixtures, url.pathname)) {
        const [file, type] = fixtures[url.pathname]; return send(200, fs.readFileSync(path.join(__dirname,'..',file)), type);
      }
      if (url.pathname.startsWith('/fixtures/')) return send(404, '{"code":"FIXTURE_MISSING"}');
      // Only the two real website routes, Next assets and public assets can be proxied.
      const asset = path.resolve(__dirname, '../public', '.' + decodeURIComponent(url.pathname));
      const publicRoot = path.resolve(__dirname, '../public') + path.sep;
      const types = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp4':'video/mp4', '.woff':'font/woff', '.woff2':'font/woff2' };
      if (asset.startsWith(publicRoot) && Object.hasOwn(types,path.extname(asset)) && fs.existsSync(asset) && fs.statSync(asset).isFile()) {
        const value = fs.readFileSync(asset), type = types[path.extname(asset)];
        if (req.headers.range) {
          const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range), start = Number(match?.[1]), end = match?.[2] ? Number(match[2]) : value.length-1;
          if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= value.length) return send(416,'',type);
          return send(206,value.subarray(start,end+1),type,{ 'Content-Range': `bytes ${start}-${end}/${value.length}`, 'Accept-Ranges':'bytes' });
        }
        return send(200,value,type);
      }
      if (!['/','/guides','/guides/'].includes(url.pathname) && !url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/__nextjs_font/')) return send(404, '{"code":"NOT_FOUND"}');
      // Never send session cookies or CSRF headers to the React renderer/HMR service.
      const upstream = http.request({ host: '127.0.0.1', port: 3070, path: req.url, method: req.method, headers: { host: '127.0.0.1:3070', accept: req.headers.accept || '*/*' } }, response => {
        res.writeHead(response.statusCode, { ...common, 'Content-Security-Policy': policy, 'Content-Type': response.headers['content-type'] || 'application/octet-stream' }); response.pipe(res);
      }); upstream.on('error', () => { if (!res.headersSent) send(503, '{"code":"LOCAL_RENDERER_UNAVAILABLE"}'); else res.destroy(); }); upstream.end();
    } catch { if (!res.headersSent) send(503, '{"code":"LOCAL_INTEGRATION_UNAVAILABLE"}'); else res.destroy(); }
  });
  const upgrades = new Set();
  server.on('upgrade',(req,socket,head)=>{
    if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:3069' || req.headers.origin !== db.settings.origin || !['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || req.url.split('?')[0] !== '/_next/hmr') return socket.destroy();
    const upstream = http.request({ host:'127.0.0.1', port:3070, path:req.url, headers:{ host:'127.0.0.1:3070', connection:'Upgrade', upgrade:'websocket', origin:db.settings.origin, 'sec-websocket-key':req.headers['sec-websocket-key'], 'sec-websocket-version':req.headers['sec-websocket-version'] } });
    upgrades.add(socket); socket.on('close',()=>upgrades.delete(socket));
    upstream.on('upgrade',(response,target,targetHead)=>{
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' + Object.entries(response.headers).map(([k,v])=>k+': '+v).join('\r\n') + '\r\n\r\n');
      if (head.length) target.write(head); if (targetHead.length) socket.write(targetHead);
      socket.pipe(target); target.pipe(socket); socket.on('error',()=>target.destroy()); target.on('error',()=>socket.destroy()); socket.on('close',()=>target.destroy()); target.on('close',()=>socket.destroy());
    });
    upstream.on('response',()=>socket.destroy()); upstream.on('error',()=>socket.destroy()); upstream.end();
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.timeout = 120000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3069, '127.0.0.1', resolve); });
  return { handlers, cert: fs.readFileSync(certificate), close: () => new Promise(resolve => { for(const socket of upgrades)socket.destroy(); server.closeAllConnections(); server.close(resolve); }) };
}
module.exports = { serveIntegration };
