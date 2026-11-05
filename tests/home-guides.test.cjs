const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
require.extensions[".ts"] = (m, file) =>
  m._compile(
    ts.transpileModule(require("node:fs").readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    file,
  );
const row = (id = "1", video = true, pinned = true) => ({
  id,
  title: "隔离测试攻略",
  excerpt: "真实接口形状的合成摘要",
  author: "合成署名",
  category: "PVE",
  difficulty: 1,
  tags: [],
  isPinned: pinned,
  imageUrl: "/bg.png",
  hasVideo: video,
  videoCount: video ? 1 : 0,
  viewCount: 0,
  likeCount: 0,
  favoriteCount: 0,
  commentCount: 0,
  status: "published",
  createdAt: "2026-11-05T00:00:00Z",
  updatedAt: "2026-11-05T00:00:00Z",
});
function fresh() {
  for (const file of [
    "home-guides",
    "guide-video-stats",
    "public-read-cache",
    "guide-service",
  ])
    delete require.cache[require.resolve("../services/" + file + ".ts")];
  return {
    ...require("../services/home-guides.ts"),
    ...require("../services/guide-video-stats.ts"),
    ...require("../services/guide-service.ts"),
  };
}
const response = (body) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  list = (feed, rows = [row()]) => ({
    contract: "jinxi.guides.summary.v2",
    appliedFeed: feed,
    strategies: rows,
    pagination: { total: rows.length, hasMore: false },
  });
test("frontend readonly contracts and bounded cache (network fixtures only)", async (t) => {
  const previous = global.fetch,
    clock = Date.now;
  try {
    await t.test(
      "feeds are sent to server, coalesced and cached separately",
      async () => {
        const urls = [];
        global.fetch = async (url) => {
          urls.push(url);
          const feed = new URL(url, "http://localhost").searchParams.get(
            "feed",
          );
          return response(
            list(feed, [
              row(
                feed === "video" ? "11" : feed === "pinned" ? "3" : "14",
                feed === "video",
                feed === "pinned",
              ),
            ]),
          );
        };
        const s = fresh(),
          [a, b] = await Promise.all([
            s.readHomeGuides("latest"),
            s.readHomeGuides("latest"),
          ]);
        assert.equal(a[0].id, "14");
        assert.deepEqual(a, b);
        assert.equal(urls.length, 1);
        await s.readHomeGuides("latest");
        assert.equal(urls.length, 1);
        assert.equal((await s.readHomeGuides("video"))[0].id, "11");
        assert.equal((await s.readHomeGuides("pinned"))[0].id, "3");
        assert.equal(urls.length, 3);
        assert(
          urls.every(
            (u) =>
              u.includes("limit=3") &&
              u.includes("summary=1") &&
              u.includes("status=published"),
          ),
        );
      },
    );
    await t.test(
      "old backend cannot masquerade as working homepage filters",
      async () => {
        global.fetch = async () =>
          response({
            strategies: [
              { ...row(), content: "old-full-body", likes: ["private"] },
            ],
            pagination: { total: 1, hasMore: false },
          });
        const s = fresh();
        await assert.rejects(
          s.readHomeGuides("video"),
          (e) => e.reason === "upgrade-required",
        );
        const old = await s.readGuideList({ limit: 3 });
        assert.equal(old.strategies[0].excerpt, "真实接口形状的合成摘要");
        assert.equal(old.strategies[0].hasVideo, null);
        assert(!("content" in old.strategies[0]));
        assert(!("likes" in old.strategies[0]));
      },
    );
    await t.test(
      "v2 acknowledgement, media fields and public status fail closed",
      async () => {
        for (const body of [
          { ...list("latest"), appliedFeed: "video" },
          list("video", [{ ...row(), hasVideo: false, videoCount: 0 }]),
          list("latest", [{ ...row(), status: "draft" }]),
          list("latest", [{ ...row(), content: "must-not-be-an-excerpt" }]),
          list("latest", [{ ...row(), videoCount: null }]),
        ]) {
          global.fetch = async () => response(body);
          await assert.rejects(
            fresh().readHomeGuides(
              body.strategies[0]?.hasVideo === false ? "video" : "latest",
            ),
          );
        }
      },
    );
    await t.test(
      "success expires60s, failure drops stale cache; no polling",
      async () => {
        let now = 1000,
          calls = 0,
          fail = false;
        Date.now = () => now;
        global.fetch = async () => {
          calls++;
          return fail
            ? new Response("{}", { status: 503 })
            : response(list("latest"));
        };
        const s = fresh();
        await s.readHomeGuides();
        now += 59000;
        await s.readHomeGuides();
        assert.equal(calls, 1);
        now += 1001;
        await s.readHomeGuides();
        assert.equal(calls, 2);
        fail = true;
        await assert.rejects(s.readHomeGuides("latest", true));
        fail = false;
        await s.readHomeGuides();
        assert.equal(calls, 4);
        Date.now = clock;
      },
    );
    await t.test(
      "stats distinguishes real0 from errors, stale/unknown contracts and null",
      async () => {
        let calls = 0;
        global.fetch = async () => {
          calls++;
          return response({
            contract: "jinxi.guides.video-stats.v1",
            count: 0,
            countType: "published-valid-url-video-attachments-v1",
            calculatedAt: "2026-11-05T00:00:00Z",
            status: "ready",
          });
        };
        const s = fresh();
        assert.equal((await s.readGuideVideoStats()).count, 0);
        await s.readGuideVideoStats();
        assert.equal(calls, 1);
        for (const bad of [
          { count: 0, status: "ready" },
          {
            contract: "jinxi.guides.video-stats.v1",
            count: null,
            status: "unavailable",
          },
        ]) {
          global.fetch = async () => response(bad);
          await assert.rejects(s.readGuideVideoStats(true));
        }
      },
    );
    await t.test(
      "an unavailable stats endpoint never fabricates zero",
      async () => {
        global.fetch = async () =>
          new Response('{"error":"not found"}', { status: 404 });
        await assert.rejects(fresh().readGuideVideoStats());
      },
    );
  } finally {
    global.fetch = previous;
    Date.now = clock;
  }
});
