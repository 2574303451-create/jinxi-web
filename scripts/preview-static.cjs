// Local static-export preview. Functions use their separate authorized harness.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../out');
const port = Number(process.argv[2] || 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Use a local port between 1024 and 65535');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'csp-manifest.json'), 'utf8'));
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript',
  '.json':'application/json', '.txt':'text/plain; charset=utf-8', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.mp4':'video/mp4', '.woff2':'font/woff2', '.ico':'image/x-icon',
};
http.createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/.netlify/functions/')) {
      res.writeHead(503, {'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(req.method === 'HEAD' ? undefined : '{"error":"Local static preview has no Functions."}');
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {
      'Content-Type':types[path.extname(file)] || 'application/octet-stream',
      'Content-Security-Policy':manifest.policy, 'X-Content-Type-Options':'nosniff',
      'Cache-Control':url.pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-store',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch {
    res.writeHead(400); res.end();
  }
}).listen(port, '127.0.0.1', () => console.log('Static export preview at http://127.0.0.1:' + port));
