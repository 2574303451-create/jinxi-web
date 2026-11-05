// Local read-only UI review. No credentials, database, Netlify forwarding or writes.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../../out"),
  artifacts = path.resolve(__dirname);
const port = Number(process.env.JINXI_PREVIEW_PORT || 3006);
const fixture = fs.readFileSync(path.join(__dirname, "ui-fixture.json"));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};
const wrapper =
  '<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>今夕第一批组件验收预览</title><style>body{margin:0;background:#fff;font:13px/1.6 system-ui;color:#101828}header{box-sizing:border-box;min-height:50px;padding:9px 16px;border-bottom:2px solid #151515;background:#ffe528;display:flex;gap:16px;align-items:center;flex-wrap:wrap}a{color:inherit}iframe{display:block;width:100%;height:calc(100dvh - 68px);border:0}</style><header><b>JINXI-REA-003 · 第一批</b><span>留言为合成测试数据；所有写入已禁用。</span><a href="/review/">截图与对照</a></header><iframe title="今夕公会组件预览（测试留言）" src="/preview-app/"></iframe></html>';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(
      JSON.stringify({ error: "此本机界面预览禁止写入。内容尚未发布。" }),
    );
  }
  if (url.pathname.startsWith("/.netlify/functions/")) {
    const messages = url.pathname.replace(/\/$/, "").endsWith("/messages");
    res.writeHead(messages ? 200 : 503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Jinxi-Preview": "synthetic-read-only",
    });
    return res.end(
      messages
        ? fixture
        : JSON.stringify({ error: "本机只读预览未连接此业务API。" }),
    );
  }
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(wrapper);
  }
  const review = url.pathname.startsWith("/review");
  const base = review ? artifacts : root;
  let relative = review
    ? url.pathname.replace(/^\/review\/?/, "")
    : url.pathname === "/preview-app/"
      ? "index.html"
      : url.pathname.slice(1);
  try {
    relative = decodeURIComponent(relative);
  } catch {
    res.writeHead(400);
    return res.end("Bad URL");
  }
  if (!relative) relative = "index.html";
  const file = path.resolve(base, relative);
  if (
    !file.startsWith(base + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404);
    return res.end("Not found");
  }
  const stat = fs.statSync(file);
  res.writeHead(200, {
    "Content-Type":
      mime[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Read-only UI preview: http://127.0.0.1:${port}/\nScreenshots: http://127.0.0.1:${port}/review/`,
  ),
);
