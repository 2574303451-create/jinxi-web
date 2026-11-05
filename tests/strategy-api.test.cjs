const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { loadHandler } = require("./support/handler.cjs");
test("read API safety without a database", async (t) => {
  await t.test("old credentials and unapproved previews fail closed without identity policy", () => {
    const { publicReadDatabaseUrl } = require("../netlify/functions/_shared/strategy-database");
    const production = "postgresql://production.invalid/guild";
    assert.throws(() => publicReadDatabaseUrl({ CONTEXT:"deploy-preview", DATABASE_URL:production }));
    assert.throws(() => publicReadDatabaseUrl({ CONTEXT:"branch-deploy", DATABASE_URL:production, JINXI_PREVIEW_DATABASE_URL:production }));
    assert.throws(()=>publicReadDatabaseUrl({ CONTEXT:"deploy-preview", DATABASE_URL:production, JINXI_PREVIEW_DATABASE_URL:"postgresql://isolated.invalid/test" }));
    assert.throws(()=>publicReadDatabaseUrl({ CONTEXT:"production", DATABASE_URL:production }));
    const env=require('./support/handler.cjs').contractEnvironment();
    Object.defineProperty(env,'DATABASE_URL',{get(){throw Error('Must not read inherited production credentials')}});
    assert.equal(publicReadDatabaseUrl(env),env.JINXI_LOCAL_READ_DATABASE_URL);
  });
  const forbidden = () => {
    throw Error("Database must not be queried");
  };
  await t.test(
    "invalid public queries rejected before transaction",
    async () => {
      const h = loadHandler("strategies.js", () => ({
        transaction: forbidden,
      }));
      for (const [params, code] of [
        [{ status: "draft" }, 403],
        [{ status: "all", role: "admin" }, 403],
        [{ id: "0" }, 400],
        [{ category: "unknown" }, 400],
        [{ offset: "100001" }, 400],
        [{ sortBy: "constructor" }, 400],
        [{ summary: "1", feed: "video", limit: "50" }, 400],
      ]) {
        const r = await h({ httpMethod: "GET", queryStringParameters: params });
        assert.equal(r.statusCode, code);
      }
    },
  );
  await t.test(
    "stats rejects POST and arbitrary identity/status input without factory",
    async () => {
      const h = loadHandler("guide-video-stats.js", forbidden);
      assert.equal((await h({ httpMethod: "POST" })).statusCode, 405);
      assert.equal(
        (
          await h({
            httpMethod: "GET",
            queryStringParameters: { userId: "forged" },
          })
        ).statusCode,
        400,
      );
    },
  );
  await t.test(
    "unavailable and timeout never become zero or leak raw errors",
    async () => {
      for (const code of ["XX000", "57014"]) {
        const error = Object.assign(
            Error("private-password-and-connection-marker"),
            { code },
          ),
          h = loadHandler("guide-video-stats.js", () => {
            throw error;
          }),
          r = await h({ httpMethod: "GET" }),
          b = JSON.parse(r.body);
        assert.equal(r.statusCode, code === "57014" ? 504 : 503);
        assert.equal(b.count, null);
        assert.equal(b.status, "unavailable");
        assert.equal(b.calculatedAt, null);
        assert(!r.body.includes("private-password"));
        assert.equal(r.headers["Cache-Control"], "no-store");
      }
    },
  );
  await t.test(
    "installed Neon driver really serializes bounded READ ONLY batch",
    async () => {
      const { neon, neonConfig } = require("@neondatabase/serverless"),
        previous = neonConfig.fetchFunction,
        { readBatch } = require("../netlify/functions/_shared/strategy-query");
      let captured;
      neonConfig.fetchFunction = async (url, options) => {
        captured = {
          url,
          body: JSON.parse(options.body),
          headers: options.headers,
          signal: options.signal,
        };
        return new Response(
          JSON.stringify({
            results: [
              {
                fields: [{ name: "set_config", dataTypeID: 25 }],
                rows: [["3000"]],
                rowCount: 1,
                command: "SELECT",
              },
              {
                fields: [{ name: "n", dataTypeID: 23 }],
                rows: [["1"]],
                rowCount: 1,
                command: "SELECT",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };
      try {
        const sql = neon(
            "postgresql://synthetic@127.0.0.1:55433/jinxi_005s_b1_test",
          ),
          rows = await readBatch(sql, [
            { text: "SELECT $1::int AS n", values: [1] },
          ]);
        assert.deepEqual(rows, [[{ n: 1 }]]);
        assert.equal(captured.body.queries.length, 2);
        assert.equal(
          captured.body.queries[0].query,
          "SELECT set_config('statement_timeout',$1,true)",
        );
        assert.deepEqual(captured.body.queries[0].params, ["3000"]);
        const headers = new Headers(captured.headers);
        assert.equal(headers.get("Neon-Batch-Read-Only"), "true");
        assert.equal(
          headers.get("Neon-Batch-Isolation-Level"),
          "RepeatableRead",
        );
        assert(captured.signal instanceof AbortSignal);
      } finally {
        neonConfig.fetchFunction = previous;
      }
    },
  );
});
