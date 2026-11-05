// Local throwaway cluster only. Refuses non-loopback endpoints and production database names.
const fs = require("node:fs"),
  path = require("node:path"),
  { Client } = require("../../node_modules/pg");
function config() {
  const value = JSON.parse(
    fs.readFileSync(
      path.join(process.env.TEMP, "jinxi-005r-db-tools", "runtime.json"),
      "utf8",
    ),
  );
  if (
    value.host !== "127.0.0.1" ||
    value.port !== 55432 ||
    value.database !== "jinxi_005r_test" ||
    value.user !== "jinxi_005r"
  )
    throw new Error("Refusing non-isolated database configuration");
  return value;
}
async function connect() {
  const client = new Client(config());
  await client.connect();
  return client;
}
function adapter(client, calls = []) {
  const sql = async (strings, ...values) => {
    const text = strings.reduce(
      (t, part, i) => t + (i ? "$" + i : "") + part,
      "",
    );
    calls.push({ text, values });
    return (await client.query(text, values)).rows;
  };
  sql.query = async (text, values) => {
    calls.push({ text, values });
    return (await client.query(text, values)).rows;
  };
  return sql;
}
async function seed(client) {
  await client.query(
    "DROP TABLE IF EXISTS strategies; DROP TABLE IF EXISTS messages;",
  );
  await client.query(
    `CREATE TABLE strategies(id SERIAL PRIMARY KEY,title TEXT NOT NULL,content TEXT NOT NULL,author TEXT DEFAULT '匿名',category TEXT DEFAULT 'PVE',difficulty INTEGER DEFAULT 1,tags TEXT[] DEFAULT '{}',likes JSONB DEFAULT '[]',favorites JSONB DEFAULT '[]',comments JSONB DEFAULT '[]',is_pinned BOOLEAN DEFAULT false,image_url TEXT,media_files JSONB DEFAULT '[]',view_count INTEGER DEFAULT 0,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());CREATE INDEX idx_strategies_status ON strategies(status,created_at DESC);CREATE INDEX idx_strategies_pinned ON strategies(is_pinned DESC,created_at DESC);CREATE INDEX idx_strategies_category ON strategies(category,created_at DESC);CREATE INDEX idx_strategies_created_at ON strategies(created_at DESC);CREATE INDEX idx_strategies_difficulty ON strategies(difficulty,created_at DESC);CREATE INDEX idx_strategies_likes ON strategies USING GIN(likes);CREATE TABLE messages(id SERIAL PRIMARY KEY,name TEXT,content TEXT,replies JSONB DEFAULT '[]',reactions JSONB DEFAULT '[]',is_pinned BOOLEAN DEFAULT false);`,
  );
  for (let i = 1; i <= 36; i++)
    await client.query(
      "INSERT INTO strategies(id,title,content,author,category,difficulty,tags,likes,favorites,comments,status,is_pinned,view_count,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        i,
        `合成SQL攻略${i}`,
        `中文 Search 正文 ${i}`,
        "合成作者",
        i % 2 ? "PVE" : "PVP",
        (i % 5) + 1,
        ["合成"],
        JSON.stringify(
          i === 1
            ? { invalid: true }
            : i === 2
              ? "not-array"
              : ["synthetic-like"],
        ),
        JSON.stringify(i === 1 ? null : []),
        JSON.stringify(i === 2 ? 42 : []),
        i === 35 ? "draft" : i === 36 ? "archived" : "published",
        i === 1,
        i,
        `2026-10-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
      ],
    );
  await client.query(
    "INSERT INTO messages(id,name,content) VALUES(1,'合成作者','本机测试留言')",
  );
}
module.exports = { connect, adapter, seed };
