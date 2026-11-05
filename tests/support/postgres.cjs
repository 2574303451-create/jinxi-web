const fs = require("node:fs"),
  path = require("node:path"),
  { Client } = require("pg");
function settings(role = "reader") {
  const file = path.join(
    process.env.TEMP || process.env.TMPDIR || "/tmp",
    "jinxi-005s-b1-postgres/runtime.json",
  );
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    value.host !== "127.0.0.1" ||
    value.port !== 55433 ||
    value.database !== "jinxi_005s_b1_test" ||
    !["admin", "reader"].includes(role) ||
    value[role]?.user !== `jinxi_005sb1_${role}`
  )
    throw Error("Refusing non-isolated PostgreSQL configuration");
  return {
    host: value.host,
    port: value.port,
    database: value.database,
    ...value[role],
    connectionTimeoutMillis: 2000,
    application_name: "jinxi-b1-isolated-test",
  };
}
async function connect(role = "reader") {
  const c = new Client(settings(role));
  await c.connect();
  return c;
}
function adapter(client, calls = []) {
  return {
    async query(text, values = []) {
      calls.push({ text, values });
      return (await client.query(text, values)).rows;
    },
    async transaction(queriesOrFn, options) {
      if (!options.readOnly || options.isolationLevel !== "RepeatableRead")
        throw Error("Read transaction protection missing");
      const tx = { query: (text, values = []) => ({ text, values }) },
        queries =
          typeof queriesOrFn === "function" ? queriesOrFn(tx) : queriesOrFn;
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      try {
        const result = [];
        for (const q of queries) {
          calls.push({ text: q.text, values: q.values });
          result.push((await client.query(q.text, q.values)).rows);
        }
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    },
  };
}
async function seed(client) {
  // The caller was connected through settings('admin')'s hard loopback/name guard.
  await client.query("DROP TABLE IF EXISTS strategies");
  await client.query(
    `CREATE TABLE strategies(id SERIAL PRIMARY KEY,title TEXT NOT NULL,content TEXT NOT NULL,author TEXT,category TEXT,difficulty INTEGER,tags TEXT[],likes JSONB,favorites JSONB,comments JSONB,is_pinned BOOLEAN,image_url TEXT,media_files JSONB,view_count INTEGER,status TEXT,created_at TIMESTAMPTZ,updated_at TIMESTAMPTZ DEFAULT NOW());CREATE INDEX idx_strategies_status ON strategies(status,created_at DESC);CREATE INDEX idx_strategies_created_at ON strategies(created_at DESC);CREATE INDEX idx_strategies_pinned ON strategies(is_pinned DESC,created_at DESC);CREATE INDEX idx_strategies_category ON strategies(category,created_at DESC);CREATE INDEX idx_strategies_difficulty ON strategies(difficulty,created_at DESC);CREATE INDEX idx_strategies_likes ON strategies USING GIN(likes);GRANT SELECT ON strategies TO jinxi_005sb1_reader`,
  );
  for (const r of require("../fixtures/guides.cjs").rows)
    await client.query(
      "INSERT INTO strategies(id,title,content,author,category,difficulty,tags,likes,favorites,comments,is_pinned,image_url,media_files,view_count,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
      [
        r.id,
        r.title,
        r.content,
        r.author,
        r.category,
        r.difficulty,
        r.tags,
        JSON.stringify(r.likes),
        JSON.stringify(r.favorites),
        JSON.stringify(r.comments),
        r.is_pinned,
        r.image_url,
        r.media_files === undefined ? null : JSON.stringify(r.media_files),
        r.view_count,
        r.status,
        r.created_at,
      ],
    );
}
module.exports = { settings, connect, adapter, seed };
