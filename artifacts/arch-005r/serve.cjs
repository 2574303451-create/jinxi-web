// Isolated local review only. Never forwards to Netlify or a database.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const { strategies } = require("../arch-005/fixture.cjs");
let records = structuredClone(strategies);
const root = path.resolve(process.argv[2] || "out"),
  port = Number(process.argv[3] || 3025);
const csp = fs
  .readFileSync(path.join(root, "../netlify.toml"), "utf8")
  .match(/Content-Security-Policy = "([^"]+)"/)[1];
const messages = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../ui-004-a/public-fixture.json"),
    "utf8",
  ),
);
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
  '<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px system-ui;margin:0}header{padding:12px;background:#ffe528;border-bottom:2px solid;display:flex;gap:24px;flex-wrap:wrap}iframe{border:0;width:100%;height:calc(100dvh - 66px)}a{color:inherit}</style><header><b>ARCH-005R 修复验收 · 全部留言/攻略为合成数据，写操作仅在本机内存</b><a href="/guides/">攻略中心</a><a href="/profile-lab/">头像原型</a><a href="/review/">报告与截图</a></header><iframe title="今夕首页隔离预览" src="/home-preview/"></iframe></html>';
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const json = (code, value) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    };
    if (url.pathname === "/__review/reset" && req.method === "POST") {
      records = structuredClone(strategies);
      return json(200, { syntheticOnly: true, reset: true });
    }
    if (url.pathname.startsWith("/.netlify/functions/")) {
      const name = url.pathname.split("/").pop();
      if (req.method === "GET" && name === "messages")
        return json(200, messages);
      if (name === "strategies" && req.method === "GET") {
        if (
          url.searchParams.get("status") &&
          url.searchParams.get("status") !== "published"
        )
          return json(403, { error: "公开接口仅提供已发布攻略" });
        const id = url.searchParams.get("id");
        if (id)
          return records.some((r) => r.id === id)
            ? json(200, { strategy: records.find((r) => r.id === id) })
            : json(404, { error: "攻略不存在" });
        let list = records.filter(
          (r) =>
            (!url.searchParams.get("category") ||
              r.category === url.searchParams.get("category")) &&
            (!url.searchParams.get("difficulty") ||
              r.difficulty === Number(url.searchParams.get("difficulty"))) &&
            (!url.searchParams.get("search") ||
              (r.title + r.content).includes(url.searchParams.get("search"))),
        );
        const sort = url.searchParams.get("sortBy");
        list.sort(
          (a, b) =>
            Number(b.isPinned) - Number(a.isPinned) ||
            (sort === "likes"
              ? b.likes.length - a.likes.length
              : sort === "view_count"
                ? b.viewCount - a.viewCount
                : new Date(b.createdAt) - new Date(a.createdAt)) ||
            Number(b.id) - Number(a.id),
        );
        const offset = Number(url.searchParams.get("offset") || 0),
          limit = Number(url.searchParams.get("limit") || 12),
          total = list.length;
        list = list.slice(offset, offset + limit);
        if (url.searchParams.get("summary") === "1")
          list = list.map(
            ({ content, comments, mediaFiles, likes, favorites, ...r }) => ({
              ...r,
              excerpt: content.slice(0, 150),
              commentCount: comments.length,
              likeCount: likes.length,
              favoriteCount: favorites.length,
            }),
          );
        return json(200, {
          strategies: list,
          pagination: { total, limit, offset, hasMore: offset + limit < total },
        });
      }
      if (
        req.method === "POST" &&
        ["strategy-actions", "strategies"].includes(name)
      ) {
        let body = "";
        for await (const chunk of req) body += chunk;
        if (body.length > 300000) return json(413, { error: "测试请求超限" });
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          return json(400, { error: "Invalid JSON" });
        }
        if (name === "strategies") {
          const row = {
            ...structuredClone(strategies[0]),
            ...data,
            id: String(Date.now()),
            likes: [],
            favorites: [],
            comments: [],
            isPinned: false,
          };
          records.unshift(row);
          return json(201, { success: true, strategy: row });
        }
        const row = records.find((r) => r.id === data.strategyId);
        if (!row) return json(404, { error: "攻略不存在" });
        if (data.action === "comment") {
          const comment = {
            id: String(Date.now()),
            userName: data.data.userName,
            userId: data.userId,
            content: data.data.content,
            timestamp: new Date().toISOString(),
          };
          row.comments.push(comment);
          return json(200, { success: true, comment });
        }
        if (data.action === "like" || data.action === "favorite") {
          const key = data.action === "like" ? "likes" : "favorites";
          const index = row[key].indexOf(data.userId);
          if (index < 0) row[key].push(data.userId);
          else row[key].splice(index, 1);
          return json(200, {
            success: true,
            liked: row.likes.includes(data.userId),
            favorited: row.favorites.includes(data.userId),
          });
        }
        return json(403, { error: "本机原型不执行管理员操作" });
      }
      return json(503, { error: "隔离预览未连接真实服务" });
    }
    if (!["GET", "HEAD"].includes(req.method))
      return json(405, { error: "禁止非测试写入" });
    if (url.pathname === "/review-preview/") {
      res.writeHead(200, { "Content-Type": mime[".html"] });
      return res.end(wrapper);
    }
    const review = url.pathname.startsWith("/review/"),
      dir = review ? __dirname : root;
    let rel;
    try {
      rel = decodeURIComponent(
        review
          ? url.pathname.slice(8)
          : url.pathname === "/home-preview/"
            ? ""
            : url.pathname.slice(1),
      );
    } catch {
      return json(400, { error: "路径无效" });
    }
    let file = path.resolve(dir, rel || "index.html");
    if (!file.startsWith(dir + path.sep))
      return json(403, { error: "无效路径" });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": mime[".html"] });
      return res.end(
        fs.existsSync(path.join(root, "404.html"))
          ? fs.readFileSync(path.join(root, "404.html"))
          : "Not found",
      );
    }
    if (url.pathname === "/guides/" || url.pathname === "/profile-lab/")
      res.setHeader("Content-Security-Policy", csp);
    if (path.extname(file) === ".mp4" && req.headers.range) {
      const size = fs.statSync(file).size,
        match = req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
      if (!match) {
        res.writeHead(416);
        return res.end();
      }
      const start = Number(match[1]),
        end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { "Content-Range": `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": url.pathname.startsWith("/_next/static/")
        ? "public, max-age=31536000, immutable"
        : "no-store",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Isolated review http://127.0.0.1:${port}/review-preview/ ; ${root}`,
    ),
  );
