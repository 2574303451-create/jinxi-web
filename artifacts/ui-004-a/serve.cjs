const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const value = (name, fallback) => { const index=args.indexOf(name); return index>=0 ? args[index+1] || fallback : fallback; };
const root = path.resolve(value('--root', path.join(__dirname, '../../out')));
const port = Number(value('--port', '3013'));
const fixture = fs.readFileSync(path.join(__dirname, 'public-fixture.json'));
const wrapper='<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>今夕 UI-004 检查点A预览</title><style>body{margin:0;font:13px/1.6 system-ui;color:#101828}header{box-sizing:border-box;padding:10px 16px;border-bottom:2px solid #151515;background:#ffe528;display:flex;gap:16px;align-items:center;flex-wrap:wrap}a{color:inherit}iframe{display:block;width:100%;height:calc(100dvh - 68px);border:0}</style><header><b>JINXI-UI-004 · 检查点 A</b><span>留言为合成界面数据；未连接业务后端，写入禁用。</span><a href="/review/">前后截图与运行证据</a></header><iframe title="今夕只读界面预览（合成留言）" src="/preview-app/"></iframe></html>';
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.mp4':'video/mp4','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Content-Type':'application/json'});return res.end('{"error":"本机验收预览禁止写入"}');}
  const url = new URL(req.url, 'http://127.0.0.1');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(wrapper);}
  if(url.pathname.startsWith('/.netlify/functions/')){
    const messages = url.pathname.replace(/\/$/,'').endsWith('/messages');
    res.writeHead(messages?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Jinxi-Review':'UI-004-A-synthetic-data'});
    return res.end(messages?fixture:'{"error":"本机预览未连接真实业务服务"}');
  }
  const review = url.pathname.startsWith('/review/');
  const base = review ? __dirname : root;
  let relative;
  try{relative = decodeURIComponent(review ? url.pathname.slice(8) : url.pathname.replace(/^\/preview-app\//,'').slice(url.pathname.startsWith('/preview-app/')?0:1));}catch{res.writeHead(400);return res.end();}
  if(!relative)relative='index.html';
  let file = path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Read-only synthetic review: http://127.0.0.1:${port}/ (static root ${root})`));
