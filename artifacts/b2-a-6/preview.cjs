// Local synthetic preview with the same asset cache policy and gzip transport
// on every variant. API/session responses and HTML always remain no-store.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const variants = require('./variants.cjs');
const [stage, mode] = process.argv.slice(2);
if (!Object.hasOwn(variants, stage) || (mode && mode !== '--tls-only')) throw Error('Unknown preview');
const { build, site, port } = variants[stage];
const load = file => require(path.join(build, file));
const b2 = load('tests/support/b2-postgres.cjs');
const { handler } = load('tests/support/function-handler.cjs');
const { createSessionLabHandler } = load('netlify/functions/_shared/session-lab.js');
const policy = JSON.parse(fs.readFileSync(path.join(site, 'csp-manifest.json'))).policy;
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.css':'text/css', '.json':'application/json',
  '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp4':'video/mp4',
};
const cache = new Map();
const session = createSessionLabHandler({
  env:b2.environment('session-lab'), connect:() => b2.connect('session'),
  clientAddress:event => event.localAddress,
});
const reader = { async transaction(...args) {
  const client = await b2.connect('reader');
  try { return await b2.adapter(client).transaction(...args); }
  finally { await client.end(); }
} };
async function request(req, res) {
  try {
    const url = new URL(req.url, 'https://localhost:3048');
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const name = url.pathname.slice('/.netlify/functions/'.length);
      if (!/^[a-z-]+$/.test(name) || !fs.existsSync(path.join(build,'netlify/functions',name+'.js'))) {
        res.writeHead(404); return res.end();
      }
      if (name === 'session-lab' && !req.socket.encrypted) { res.writeHead(503); return res.end(); }
      let size = 0, body = '';
      for await (const part of req) {
        size += part.length;
        if (size > 8192) { res.writeHead(413); return res.end(); }
        body += part.toString('utf8');
      }
      if (name !== 'session-lab' && !cache.has(name)) cache.set(name,handler(name,b2.environment(),()=>reader));
      const event = {
        httpMethod:req.method, headers:req.headers, body, isBase64Encoded:false,
        queryStringParameters:Object.fromEntries(url.searchParams), localAddress:req.socket.remoteAddress,
      };
      const reply = await (name === 'session-lab' ? session : cache.get(name))(event);
      res.writeHead(reply.statusCode,reply.headers);
      return res.end(reply.body);
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(site, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(path.resolve(site)+path.sep)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file), immutable = url.pathname.startsWith('/_next/static/');
    const headers = {
      'Content-Type':mime[ext] || 'application/octet-stream', 'Content-Security-Policy':policy,
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':immutable ? 'public, max-age=31536000, immutable' : 'no-store',
    };
    const compress = ['.js','.css','.html','.txt','.json'].includes(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (compress) {
      const key = file + ':gzip';
      if (!cache.has(key)) cache.set(key,zlib.gzipSync(fs.readFileSync(file)));
      const bytes = cache.get(key);
      res.writeHead(200,{...headers,'Content-Encoding':'gzip','Content-Length':bytes.length,'Vary':'Accept-Encoding'});
      return res.end(req.method === 'HEAD' ? undefined : bytes);
    }
    res.writeHead(200,headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(503,{'Cache-Control':'no-store'});
    res.end('Synthetic preview unavailable');
  }
}
if (mode === '--tls-only') {
  const tls = path.dirname(b2.runtimeFile);
  https.createServer({
    key:fs.readFileSync(path.join(tls,'tls-key.pem')), cert:fs.readFileSync(path.join(tls,'tls-cert.pem')),
  },request).listen(3048,'127.0.0.1',()=>console.log(stage+' local HTTPS on 3048'));
} else {
  http.createServer(request).listen(port,'127.0.0.1',()=>console.log(stage+' gzip/cache preview on '+port));
}
