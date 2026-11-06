const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { resolvePlayback } = require('./policy.cjs');

const nativePath = '/guide-videos/synthetic-motion.mp4';
const cover = '/synthetic-cover.svg';
const missingCover = '/missing-cover.svg';
const watchUrl = 'https://www.bilibili.com/video/BV0A8JX0TEST';
const youtubeUrl = 'https://www.youtube.com/watch?v=A8GuideDemo';
const videos = [
  { id: 'external', type: 'video', playbackMode: 'external', url: watchUrl, thumbnail: cover,
    title: '副本路线演示', description: '使用平台观看页的合成链接，点击后在新标签打开。' },
  { id: 'native', type: 'video', playbackMode: 'native', url: nativePath, thumbnail: cover,
    title: '走位时机演示', description: '用本机测试短片演示主动加载与播放。' },
  { id: 'legacy', type: 'video', url: youtubeUrl, thumbnail: missingCover,
    title: '旧版攻略附件', description: '保留旧附件字段。封面不可用时显示统一占位。' },
  { id: 'unavailable', type: 'video', playbackMode: 'external', url: 'https://not-approved.invalid/watch',
    title: '待复核的来源', description: '保留标题和说明，等待管理员核对视频来源。' },
];

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/ui.js', ['ui.js', 'text/javascript; charset=utf-8']],
  ['/paper.css', ['paper.css', 'text/css; charset=utf-8']],
  [cover, ['synthetic-cover.svg', 'image/svg+xml']],
  [nativePath, ['synthetic-motion.mp4', 'video/mp4']],
].map(([url, [file, mime]]) => [url, { bytes: readFileSync(path.join(__dirname, file)), mime }]));
const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; media-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
};

function send(req, res, { bytes, mime }) {
  let status = 200;
  res.setHeader('Content-Type', mime);
  if (mime === 'video/mp4') {
    res.setHeader('Accept-Ranges', 'bytes');
    if (req.headers.range) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      const start = range ? Number(range[1]) : bytes.length;
      const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end) return res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end();
      res.setHeader('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
      bytes = bytes.subarray(start, end + 1);
      status = 206;
    }
  }
  res.writeHead(status, { 'Content-Length': bytes.length });
  res.end(req.method === 'HEAD' ? undefined : bytes);
}

function startDemo(port = 3086) {
  const server = createServer((req, res) => {
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    const authority = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== authority) return res.writeHead(421).end();
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    if (req.url === '/fixtures.json') {
      const items = videos.map(({ id, type, title, description, thumbnail, ...media }) => ({
        id, title, description, thumbnail,
        playback: resolvePlayback({ type, ...media }, `http://${authority}`, new Set([nativePath])),
      }));
      return send(req, res, { bytes: Buffer.from(JSON.stringify(items)), mime: 'application/json; charset=utf-8' });
    }
    const resource = staticFiles.get(req.url);
    if (resource) return send(req, res, resource);
    return res.writeHead(404).end();
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (require.main === module) {
  startDemo().then(server => console.log(`Synthetic video demo: http://127.0.0.1:${server.address().port}/`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { startDemo };
