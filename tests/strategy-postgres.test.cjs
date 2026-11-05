const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { connect, adapter, seed } = require("./support/postgres.cjs"),
  { loadHandler } = require("./support/handler.cjs"),
  fixture = require("./fixtures/guides.cjs");
const {
    readStrategies,
  } = require("../netlify/functions/_shared/strategy-read"),
  {
    videoAggregate,
    urlPredicate,
    videoCount,
  } = require("../netlify/functions/_shared/strategy-media"),
  { readBatch } = require("../netlify/functions/_shared/strategy-query"),
  { isPublicAttachmentUrl } = require("../lib/guide-attachment-policy");
test("actual isolated PostgreSQL read path", async (t) => {
  const admin = await connect("admin"),
    reader = await connect(),
    calls = [],
    sql = adapter(reader, calls);
  let locked = false;
  try {
    await seed(admin);
    const stats = loadHandler("guide-video-stats.js", () => sql),
      api = loadHandler("strategies.js", () => sql);
    const get = (handler, params = {}) =>
      handler({ httpMethod: "GET", queryStringParameters: params });
    await t.test(
      "published video attachments are4, duplicateURLs counted, not playability",
      async () => {
        const r = await get(stats),
          b = JSON.parse(r.body);
        assert.equal(r.statusCode, 200);
        assert.equal(b.count, fixture.expectedVideoEntries);
        assert.equal(b.status, "ready");
        assert.equal(b.countType, "published-valid-url-video-attachments-v1");
        assert.equal(b.playabilityVerified, false);
        assert(Number.isFinite(Date.parse(b.calculatedAt)));
        assert.equal(r.headers["Access-Control-Allow-Origin"], undefined);
      },
    );
    await t.test(
      "null/object/scalar JSONB and invalid array elements are safe",
      async () => {
        for (const id of [3, 4, 5, 6, 7, 8]) {
          const [[r]] = await readBatch(sql, [
            {
              text: `SELECT ${videoCount} AS n FROM strategies s WHERE id=$1`,
              values: [id],
            },
          ]);
          assert.equal(Number(r.n), 0);
        }
      },
    );
    await t.test(
      "URL policy SQL/JS parity: supported URI, unsafe schemes, promos, malformed values",
      async () => {
        const urls = [
          "/guides-media/中文.mp4",
          "/guides-media/😀.mp4",
          "https://example.com/a.mp4",
          "http://127.0.0.1:55433/a.mp4",
          "https://example.com:65535/a",
          "https://example.com:65536/a",
          "/1.mp4",
          "/2.mp4?a=1",
          "/%31.mp4",
          "https://jinxi-web.netlify.app/2.mp4#x",
          "https://example.com/1.mp4",
          "/folder/../1.mp4",
          "/folder/%2e%2e/1.mp4",
          "/folder/%5c1.mp4",
          "//evil.test/a",
          "javascript:alert(1)",
          "data:video/mp4;base64,eA==",
          "ftp://example.com/a.mp4",
          "https://user:secret@example.com/a.mp4",
          "https://example.com/a b",
          "https://example.com/a\u00a0b",
          "https://example.com/%xx",
          "",
          " ",
          "https://999.999.999.999/a",
          null,
        ];
        for (const url of urls) {
          const result = await reader.query(
            `SELECT ${urlPredicate("$1::text", true)} AS valid`,
            [url],
          );
          assert.equal(
            !!result.rows[0].valid,
            isPublicAttachmentUrl(url, true),
            JSON.stringify(url),
          );
        }
      },
    );
    await t.test(
      "server filters before LIMIT3, latest ignores old pinned priority",
      async () => {
        for (const [feed, expected] of [
          ["latest", fixture.latestIDs],
          ["video", fixture.videoIDs],
          ["pinned", fixture.pinnedIDs],
        ]) {
          const r = await readStrategies(sql, {
            summary: "1",
            feed,
            limit: "3",
          });
          assert.equal(r.status, 200);
          assert.equal(r.body.contract, "jinxi.guides.summary.v2");
          assert.equal(r.body.appliedFeed, feed);
          assert.deepEqual(
            r.body.strategies.map((s) => s.id),
            expected,
          );
        }
      },
    );
    await t.test(
      "summary has genuine covers/counts and no full/private author arrays",
      async () => {
        const r = await readStrategies(sql, { summary: "1", feed: "video" });
        const text = JSON.stringify(r.body);
        for (const privatePart of [
          "fixture-private",
          "不应出现在摘要的评论全文",
          "PRIVATE-draft",
          "PRIVATE-archived",
        ])
          assert(!text.includes(privatePart));
        for (const s of r.body.strategies) {
          for (const key of [
            "content",
            "comments",
            "likes",
            "favorites",
            "memberId",
            "account",
          ])
            assert(!Object.hasOwn(s, key));
          assert.equal(typeof s.hasVideo, "boolean");
          assert.equal(typeof s.videoCount, "number");
          assert(s.hasVideo);
          assert(s.excerpt.length <= 150);
        }
        assert.equal(
          r.body.strategies.find((s) => s.id === "2").imageUrl,
          "/14.png",
        );
        assert.equal(
          r.body.strategies.find((s) => s.id === "1").imageUrl,
          "/bg.png",
        );
      },
    );
    await t.test(
      "old full list and ID detail are retained, published only",
      async () => {
        const r = await get(api, { limit: "3" }),
          b = JSON.parse(r.body);
        assert.equal(r.statusCode, 200);
        assert.equal(b.strategies[0].id, "3");
        assert.equal(typeof b.strategies[0].content, "string");
        assert(Array.isArray(b.strategies[0].comments));
        assert(!b.strategies.some((s) => s.status !== "published"));
        const d = JSON.parse((await get(api, { id: "1" })).body).strategy;
        assert.equal(d.id, "1");
        assert.equal(d.mediaFiles.length, 2);
        assert.equal(d.content, fixture.rows[0].content);
      },
    );
    await t.test(
      "draft/archived/forgedadmin never grant public reads",
      async () => {
        for (const status of ["draft", "archived", "all"]) {
          const n = calls.length,
            r = await get(api, {
              status,
              role: "admin",
              password: "not-a-real-secret",
            });
          assert.equal(r.statusCode, 403);
          assert.equal(calls.length, n);
        }
        for (const id of ["90", "91"]) {
          const r = await get(api, { id, role: "admin" });
          assert.equal(r.statusCode, 404);
        }
        const search = await readStrategies(sql, {
          summary: "1",
          search: "PRIVATE-",
        });
        assert.equal(search.body.pagination.total, 0);
      },
    );
    await t.test(
      "pagination/sort/category rejected before SQL; search remains parameterized",
      async () => {
        for (const q of [
          { offset: "100001" },
          { offset: "-1" },
          { limit: "0" },
          { offset: "9007199254740992" },
          { sortBy: "created_at;DROP TABLE strategies" },
          { category: "PVE' OR 1=1--" },
          { feed: "unknown", summary: "1" },
          { feed: "video", summary: "1", limit: "4" },
          { feed: "video", summary: "1", offset: "1" },
          { difficulty: "6" },
          { id: "2147483648" },
        ]) {
          const n = calls.length;
          assert.equal((await readStrategies(sql, q)).status, 400);
          assert.equal(calls.length, n);
        }
        const r = await readStrategies(sql, {
          summary: "1",
          search: "'; DROP TABLE strategies;--",
        });
        assert.equal(r.body.pagination.total, 0);
      },
    );
    await t.test("normal category/search/sorts and stable pages", async () => {
      for (const sortBy of [
        "created_at",
        "updated_at",
        "likes",
        "view_count",
      ]) {
        const r = await readStrategies(sql, {
          summary: "1",
          category: "PVP",
          sortBy,
          limit: "2",
        });
        assert.equal(r.status, 200);
        assert(r.body.strategies.every((s) => s.category === "PVP"));
      }
      const a = await readStrategies(sql, { summary: "1", limit: "3" }),
        b = await readStrategies(sql, {
          summary: "1",
          limit: "3",
          offset: "3",
        });
      assert(
        !a.body.strategies.some((x) =>
          b.body.strategies.some((y) => x.id === y.id),
        ),
      );
    });
    await t.test("read-only database role cannot write", async () => {
      await assert.rejects(
        reader.query("UPDATE strategies SET view_count=0"),
        (e) => ["25006", "42501"].includes(e.code),
      );
    });
    await t.test(
      "stats rejects nonGET/identity parameters before DB factory",
      async () => {
        let factories = 0;
        const h = loadHandler("guide-video-stats.js", () => {
          factories++;
          return sql;
        });
        assert.equal(
          (await h({ httpMethod: "POST", body: "{}" })).statusCode,
          405,
        );
        assert.equal(
          (await get(h, { status: "draft", userId: "1" })).statusCode,
          400,
        );
        assert.equal(factories, 0);
      },
    );
    await t.test(
      "DB failure is503, countnull, no internal connection leakage",
      async () => {
        for (const file of ["strategies.js", "guide-video-stats.js"]) {
          const h = loadHandler(file, () => {
              throw Error("INTERNAL_PRIVATE_CONNECTION_MARKER");
            }),
            r = await get(h);
          assert.equal(r.statusCode, 503);
          assert(!r.body.includes("INTERNAL_PRIVATE"));
          if (file.startsWith("guide-video"))
            assert.equal(JSON.parse(r.body).count, null);
        }
      },
    );
    await t.test(
      "actual PG statement timeout returns504 and connection recovers",
      async () => {
        await admin.query("BEGIN");
        locked = true;
        await admin.query("LOCK TABLE strategies IN ACCESS EXCLUSIVE MODE");
        try {
          const start = Date.now(),
            r = await get(stats);
          assert.equal(r.statusCode, 504);
          assert.equal(JSON.parse(r.body).count, null);
          assert(Date.now() - start >= 2800);
          assert(!/password|statement_timeout|strategies|SELECT/.test(r.body));
        } finally {
          await admin.query("ROLLBACK");
          locked = false;
        }
        assert.equal((await get(stats)).statusCode, 200);
      },
    );
    await t.test(
      "concurrent readers have consistent counts and no mutation",
      async () => {
        const before = (
          await admin.query(
            "SELECT md5(string_agg(row_to_json(s)::text,'|' ORDER BY id)) AS h FROM strategies s",
          )
        ).rows[0].h;
        const readers = await Promise.all(
          Array.from({ length: 4 }, () => connect()),
        );
        try {
          const counts = await Promise.all(
            readers.map(async (r) => {
              const [[row]] = await readBatch(adapter(r), [
                { text: videoAggregate },
              ]);
              return Number(row.video_count);
            }),
          );
          assert.deepEqual(counts, [4, 4, 4, 4]);
        } finally {
          await Promise.all(readers.map((c) => c.end()));
        }
        const after = (
          await admin.query(
            "SELECT md5(string_agg(row_to_json(s)::text,'|' ORDER BY id)) AS h FROM strategies s",
          )
        ).rows[0].h;
        assert.equal(before, after);
      },
    );
    await t.test(
      "actual EXPLAIN ANALYZE BUFFERS and empty table0, not unknown",
      async () => {
        const explain = await reader.query(
          "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + videoAggregate,
        );
        assert(explain.rows[0]["QUERY PLAN"][0].Plan);
        await admin.query("TRUNCATE strategies");
        const r = await get(stats);
        assert.equal(JSON.parse(r.body).count, 0);
        assert.equal(JSON.parse(r.body).status, "ready");
        const list = await readStrategies(sql, { summary: "1", feed: "video" });
        assert.deepEqual(list.body.strategies, []);
        assert.equal(list.body.pagination.total, 0);
        await seed(admin);
      },
    );
  } finally {
    if (locked) await admin.query("ROLLBACK");
    await reader.end();
    await admin.end();
  }
});
