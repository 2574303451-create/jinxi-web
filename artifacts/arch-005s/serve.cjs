// Isolated, read-only static review. Public guide snapshot replay, NEVER forwards API writes.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(process.argv[2] || "out"),
  port = Number(process.argv[3] || 3027),
  snapshot = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "public-guides-snapshot.json"),
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
const wrapper =
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px system-ui;margin:0}header{padding:12px;background:#ffe528;border-bottom:2px solid;display:flex;gap:20px;flex-wrap:wrap}iframe{border:0;width:100%;height:calc(100dvh - 100px)}a{color:inherit}</style><header><b>005S A阶段 · 公开攻略快照回放 / 留言为合成数据 / 禁止生产写入</b><a href="/">查看首页</a><a href="/review/">截图与报告</a><span>在线、视频总数仍未接入；攻略快照时间 ' +
  snapshot.fetchedAt +
  '</span></header><iframe title="今夕只读首页" src="/"></iframe></html>';
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
    res.writeHead(200, {
      "Content-Type": referenceDom
        ? "text/plain; charset=utf-8"
        : mime[path.extname(file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": u.pathname.startsWith("/_next/static/")
        ? "public,max-age=31536000,immutable"
        : "no-store",
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
