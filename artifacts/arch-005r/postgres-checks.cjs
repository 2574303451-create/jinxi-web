const { connect, adapter, seed } = require("./postgres-runtime.cjs"),
  { readStrategies } = require("../../netlify/functions/_shared/strategy-read"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const c = await connect(),
    checks = [],
    calls = [],
    sql = adapter(c, calls);
  try {
    await seed(c);
    const version = (await c.query("SELECT version()")).rows[0].version;
    const schema = (
      await c.query(
        "SELECT column_name,data_type,udt_name FROM information_schema.columns WHERE table_name='strategies' ORDER BY ordinal_position",
      )
    ).rows;
    const indexes = (
      await c.query(
        "SELECT indexname,indexdef FROM pg_indexes WHERE tablename='strategies' ORDER BY indexname",
      )
    ).rows;
    let result = await readStrategies(sql, {});
    assert.equal(result.status, 200);
    assert.equal(result.body.strategies.length, 12);
    assert.equal(result.body.pagination.total, 34);
    assert(result.body.strategies.every((r) => r.status === "published"));
    assert.equal(result.body.strategies[0].id, "1");
    assert.deepEqual(result.body.strategies[0].likes, []);
    checks.push(
      "normal published list, legacy DTO and malformed JSONB normalization",
    );
    for (const params of [
      { status: "all" },
      { status: "draft" },
      { status: "archived" },
      { summary: "1", status: "all" },
      { id: "35" },
      { id: "36" },
      { id: "35", status: "published" },
      { id: "35", status: "draft" },
      { status: "all", role: "admin", password: "not-a-credential" },
    ]) {
      const r = await readStrategies(sql, params);
      assert([403, 404].includes(r.status));
      assert(!r.body.strategies && !r.body.strategy);
    }
    for (const params of [
      { search: "合成SQL攻略35" },
      { summary: "1", search: "合成SQL攻略36" },
    ])
      assert.equal(
        (await readStrategies(sql, params)).body.pagination.total,
        0,
      );
    checks.push(
      "anonymous full/summary/search/id/direct status and forged role cannot read draft or archived",
    );
    const vm = require("node:vm"),
      { createRequire } = require("node:module"),
      source = path.resolve("netlify/functions/strategies.js"),
      localRequire = createRequire(source),
      sandbox = {
        exports: {},
        process: { env: { DATABASE_URL: "isolated-adapter-only" } },
        console: { log() {}, error() {} },
        require: (name) =>
          name === "@neondatabase/serverless"
            ? { neon: () => sql }
            : localRequire(name),
      };
    vm.runInNewContext(fs.readFileSync(source, "utf8"), sandbox, {
      filename: source,
    });
    for (const params of [
      {},
      { summary: "1", category: "PVE", difficulty: "2" },
      { id: "2" },
      { id: "35" },
      { status: "all" },
      { search: "合成SQL攻略35" },
    ]) {
      const response = await sandbox.exports.handler({
        httpMethod: "GET",
        queryStringParameters: params,
      });
      assert.equal(
        response.statusCode,
        params.status ? 403 : params.id === "35" ? 404 : 200,
      );
      const body = JSON.parse(response.body);
      if (body.strategies)
        assert(body.strategies.every((r) => r.status === "published"));
    }
    checks.push(
      "actual strategies.handler GET delegates into real PostgreSQL through an isolated Neon-shaped adapter",
    );
    for (const params of [
      { search: "Search", category: "PVE", difficulty: "2" },
      { search: "不存在" },
      { search: "' OR 1=1--" },
      { sortBy: "created_at", sortOrder: "ASC" },
      { sortBy: "view_count", sortOrder: "DESC" },
      { sortBy: "likes", summary: "1" },
    ]) {
      const r = await readStrategies(sql, params);
      assert.equal(r.status, 200);
      assert(r.body.strategies.every((row) => row.status === "published"));
    }
    checks.push(
      "real SQL search/category/difficulty/ASC/DESC/all sort columns including guarded jsonb_array_length",
    );
    const first = await readStrategies(sql, { limit: "12", offset: "0" }),
      next = await readStrategies(sql, { limit: "12", offset: "12" });
    assert(
      first.body.strategies.every(
        (row) => !next.body.strategies.some((n) => n.id === row.id),
      ),
    );
    const detail = await readStrategies(sql, { id: "2" });
    assert.equal(detail.body.strategy.title, "合成SQL攻略2");
    assert.deepEqual(detail.body.strategy.comments, []);
    checks.push(
      "stable nonoverlapping pages and bounded ID detail, scalar JSONB safe",
    );
    for (const params of [
      { limit: "-1" },
      { limit: "2x" },
      { offset: "NaN" },
      { offset: "-5" },
      { difficulty: "wrong" },
      { sortBy: "constructor" },
      { sortBy: "title;DROP" },
      { sortOrder: "DESC;DROP" },
      { id: "1 OR 1=1" },
      { id: "2147483648" },
    ])
      assert.equal((await readStrategies(sql, params)).status, 400);
    checks.push("invalid parameters rejected without executable SQL fragments");
    calls.length = 0;
    await readStrategies(sql, {
      summary: "1",
      sortBy: "likes",
      search: "Search",
      limit: "12",
    });
    const listCall = calls.find((call) => call.text.startsWith("SELECT id,"));
    const plan = (
      await c.query(
        "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + listCall.text,
        listCall.values,
      )
    ).rows;
    await c.query("TRUNCATE strategies");
    assert.equal((await readStrategies(sql, {})).body.strategies.length, 0);
    assert.equal((await readStrategies(sql, { id: "1" })).status, 404);
    checks.push("real EXPLAIN ANALYZE and empty table behavior");
    fs.writeFileSync(
      path.join(__dirname, "postgres-results.json"),
      JSON.stringify(
        {
          passed: true,
          version,
          schema,
          indexes,
          checks,
          plan,
          scope:
            "Native PostgreSQL 17.11, dedicated fresh cluster on127.0.0.1:55432 and database jinxi_005r_test. Tables recreated only in this disposable DB from an explicit minimal schema, not historical seed scripts. Actual repository readStrategies SQL executed through pg parameter binding, NOT fake SQL. Neon HTTP transport and deployed production schema are not tested.",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ version, checks }));
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
