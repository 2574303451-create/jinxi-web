// Isolated, read-only static review. Public guide snapshot replay, NEVER forwards API writes.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(process.argv[2] || "out"),
  port = Number(process.argv[3] || 3027),
  snapshot = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../arch-005s/public-guides-snapshot.json"),
      "utf8",
    ),
  );
const messages = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../ui-004-a/public-fixture.json"),
    "utf8",
  ),
);
const csp = fs
  .readFileSync(path.join(root, "../netlify.toml"), "utf8")
  .match(/Content-Security-Policy = "([^"]+)"/)[1];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".md": "text/plain; charset=utf-8",
};
const wrapper = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A+只读预览</title><style>body{max-width:760px;margin:48px auto;padding:20px;background:#f8f9fb;color:#151515;font:16px/1.8 system-ui}a{display:inline-block;padding:12px;margin:8px;border:2px solid;border-radius:12px;background:#ffe528;color:inherit;box-shadow:4px 4px 0}a:focus-visible{outline:3px solid #2360f5}</style><h1>今夕 A+ · 只读预览</h1><p>攻略为真实公开快照，留言为合成演示；写入被拒绝。请勿输入真实账号。在线/视频数量尚未接入，未部署生产。</p><a href="/">打开首页</a><a href="/review/">截图与验收报告</a></html>';
http
  .createServer(async (req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const json = (code, value) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    };
    if (u.pathname.startsWith("/.netlify/functions/")) {
      if (req.method !== "GET")
        return json(503, { error: "只读预览禁止写入，未连接真实服务" });
      const name = u.pathname.split("/").pop();
      if (name === "messages") return json(200, messages);
      if (name === "strategies") {
        if (
          u.searchParams.has("status") &&
          u.searchParams.get("status") !== "published"
        )
          return json(403, { error: "只读公开列表" });
        if (u.searchParams.has("id")) {
          const r = snapshot.rows.find(
            (x) => x.id === u.searchParams.get("id"),
          );
          return r
            ? json(200, {
                strategy: { ...r, likes: [], favorites: [], comments: [] },
              })
            : json(404, { error: "快照未收录此公开攻略" });
        }
        return json(200, {
          strategies: snapshot.rows,
          pagination: { total: snapshot.rows.length, hasMore: false },
          reviewSnapshot: snapshot.fetchedAt,
        });
      }
      return json(503, { error: "隔离预览未连接真实服务" });
    }
    if (req.method === "POST" && u.pathname === "/__review/reset")
      return json(200, { readOnly: true });
    if (!["GET", "HEAD"].includes(req.method))
      return json(405, { error: "只读预览" });
    if (u.pathname === "/review-preview/") {
      res.writeHead(200, { "Content-Type": mime[".html"] });
      return res.end(wrapper);
    }
    const review = u.pathname.startsWith("/review/"),
      dir = review ? __dirname : root;
    let rel;
    try {
      rel = decodeURIComponent(
        review ? u.pathname.slice(8) : u.pathname.slice(1),
      );
    } catch {
      return json(400, { error: "无效路径" });
    }
    let file = path.resolve(dir, rel || "index.html");
    if (!file.startsWith(dir + path.sep))
      return json(403, { error: "无效路径" });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": mime[".html"] });
      return res.end(fs.readFileSync(path.join(root, "404.html")));
    }
    if (!review && ["/", "/guides/", "/profile-lab/"].includes(u.pathname))
      res.setHeader("Content-Security-Policy", csp);
    // Captured third-party DOM is evidence text, never executable content on this origin.
    const referenceDom =
      review && rel.startsWith("reference/") && path.extname(file) === ".html";
    const cache = process.env.REVIEW_CACHE === "legacy" ? "no-store" :
      /\.(png|jpg|gif|mp4)$/.test(file) ? "public,max-age=2592000" :
      /\.woff2?$/.test(file) ? "public,max-age=31536000" : "no-store";
    if (path.extname(file) === ".mp4") {
      const size = fs.statSync(file).size;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", cache);
      res.setHeader("Content-Type", mime[".mp4"]);
      if (req.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        const start = match ? Number(match[1]) : size;
        const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if (start >= size || end < start) {
          res.writeHead(416, { "Content-Range": "bytes */" + size });
          return res.end();
        }
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + size, "Content-Length": end - start + 1 });
        if (req.method === "HEAD") return res.end();
        return fs.createReadStream(file, {start, end}).pipe(res);
      }
      res.setHeader("Content-Length", size);
    }
    res.writeHead(200, {
      "Content-Type": referenceDom
        ? "text/plain; charset=utf-8"
        : mime[path.extname(file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": u.pathname.startsWith("/_next/static/")
        ? "public,max-age=31536000,immutable"
        : cache,
      ...(referenceDom
        ? { "Content-Security-Policy": "default-src 'none'; sandbox" }
        : {}),
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Read-only snapshot review http://127.0.0.1:${port}/review-preview/`,
    ),
  );
