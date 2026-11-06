// Loopback only. Run the actual wrappers from the selected independent build
// with the already-authorized synthetic role adapter. No Netlify control plane.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const variants = require('./variants.cjs');

const [stage, mode] = process.argv.slice(2);
if (!Object.hasOwn(variants, stage) || (mode && mode !== '--tls-only')) throw Error('Unknown local preview variant');
const { build, site, port } = variants[stage];
const source = file => require(path.join(build, file));
const b2 = source('tests/support/b2-postgres.cjs');
const { handler } = source('tests/support/function-handler.cjs');
const { createSessionLabHandler } = source('netlify/functions/_shared/session-lab.js');
const csp = JSON.parse(fs.readFileSync(path.join(site, 'csp-manifest.json'))).policy;
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.css':'text/css',
  '.json':'application/json', '.txt':'text/plain; charset=utf-8', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp4':'video/mp4', '.ico':'image/x-icon',
};
const publicEnv = b2.environment();
const session = createSessionLabHandler({
  env: b2.environment('session-lab'), connect: () => b2.connect('session'),
  clientAddress: event => event.localAddress,
});
const cache = new Map();
const reader = {
  async transaction(...args) {
    const client = await b2.connect('reader');
    try { return await b2.adapter(client).transaction(...args); }
    finally { await client.end(); }
  },
};

async function request(req, res) {
  try {
    const url = new URL(req.url, 'https://localhost:3048');
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const name = url.pathname.slice('/.netlify/functions/'.length);
      if (!/^[a-z-]+$/.test(name) || !fs.existsSync(path.join(build, 'netlify/functions', name + '.js'))) {
        res.writeHead(404); return res.end();
      }
      if (name === 'session-lab' && !req.socket.encrypted) {
        res.writeHead(503); return res.end();
      }
      let size = 0, body = '';
      for await (const part of req) {
        size += part.length;
        if (size > 8192) { res.writeHead(413); return res.end(); }
        body += part.toString('utf8');
      }
      const event = {
        httpMethod:req.method, headers:req.headers, body, isBase64Encoded:false,
        queryStringParameters:Object.fromEntries(url.searchParams), localAddress:req.socket.remoteAddress,
      };
      if (name !== 'session-lab' && !cache.has(name)) cache.set(name, handler(name, publicEnv, () => reader));
      const reply = await (name === 'session-lab' ? session : cache.get(name))(event);
      res.writeHead(reply.statusCode, reply.headers);
      return res.end(reply.body);
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(site, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(path.resolve(site) + path.sep)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {
      'Content-Security-Policy':csp, 'Content-Type':mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(503);
    res.end('Synthetic local preview unavailable');
  }
}

if (mode === '--tls-only') {
  const tmp = path.dirname(b2.runtimeFile);
  const tls = { key:fs.readFileSync(path.join(tmp, 'tls-key.pem')), cert:fs.readFileSync(path.join(tmp, 'tls-cert.pem')) };
  https.createServer(tls, request).listen(3048, '127.0.0.1', () => console.log(stage + ' HTTPS on 3048'));
} else {
  http.createServer(request).listen(port, '127.0.0.1', () => console.log(stage + ' HTTP on ' + port));
}
