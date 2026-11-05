const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const { connect, adapter, seed } = require("./postgres-runtime.cjs");
function load(file, sql, env, onConnect) {
  const shared = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync("netlify/functions/_shared/admin-password.js", "utf8"),
    {
      module: shared,
      exports: shared.exports,
      process: { env },
      require: (name) => {
        if (name === "crypto") return crypto;
        throw new Error("Blocked module");
      },
    },
  );
  const sandbox = {
    exports: {},
    process: { env },
    console: { log() {}, error() {}, warn() {} },
    require: (name) =>
      name === "@neondatabase/serverless"
        ? {
            neon: () => {
              onConnect();
              return sql;
            },
          }
        : name === "./_shared/admin-password"
          ? shared.exports
          : name === "crypto"
            ? crypto
            : (() => {
                throw new Error("Blocked module");
              })(),
  };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, {
    filename: file,
  });
  return sandbox.exports.handler;
}
(async () => {
  const c = await connect(),
    results = [];
  try {
    const password = crypto.randomBytes(32).toString("base64url");
    for (const kind of ["strategy", "message"])
      for (const action of ["pin", "delete"])
        for (const mode of ["missing", "blank", "wrong", "valid"]) {
          await seed(c);
          const calls = [],
            sql = adapter(c, calls);
          let connected = 0;
          const env =
            mode === "missing"
              ? {}
              : { ADMIN_PASSWORD: mode === "blank" ? "" : password };
          const handler = load(
            `netlify/functions/${kind === "strategy" ? "strategy-actions" : "message-actions"}.js`,
            sql,
            env,
            () => connected++,
          );
          const payload = {
            action,
            [kind === "strategy" ? "strategyId" : "messageId"]: "1",
            password:
              mode === "valid"
                ? password
                : crypto.randomBytes(16).toString("hex"),
          };
          const response = await handler({
            httpMethod: "POST",
            body: JSON.stringify(payload),
            queryStringParameters: {},
          });
          assert.equal(response.statusCode, mode === "valid" ? 200 : 401);
          if (mode !== "valid") {
            assert.equal(connected, 0);
            assert.equal(calls.length, 0);
            assert.equal(JSON.parse(response.body).error, "管理验证失败");
          } else if (action === "delete") {
            assert.equal(
              (
                await c.query(
                  `SELECT COUNT(*)::int AS n FROM ${kind === "strategy" ? "strategies" : "messages"} WHERE id=1`,
                )
              ).rows[0].n,
              0,
            );
          } else {
            assert.equal(
              (
                await c.query(
                  `SELECT is_pinned FROM ${kind === "strategy" ? "strategies" : "messages"} WHERE id=1`,
                )
              ).rows[0].is_pinned,
              kind === "strategy" ? false : true,
            );
          }
          assert(!response.body.includes(password));
          results.push({
            kind,
            action,
            mode,
            status: response.statusCode,
            sqlCalls: calls.length,
          });
        }
    for (const kind of ["strategy", "message"]) {
      let connected = 0;
      const handler = load(
        `netlify/functions/${kind === "strategy" ? "strategy-actions" : "message-actions"}.js`,
        adapter(c),
        { ADMIN_PASSWORD: password },
        () => connected++,
      );
      const response = await handler({
        httpMethod: "GET",
        queryStringParameters: { password },
        body: "{}",
      });
      assert.equal(response.statusCode, 405);
      assert.equal(connected, 0);
      results.push({
        kind,
        mode: "GET password ignored",
        status: response.statusCode,
      });
    }
    fs.writeFileSync(
      path.join(__dirname, "admin-results.json"),
      JSON.stringify(
        {
          passed: true,
          results,
          scope:
            "Actual modified handlers loaded in isolated VM; randomly generated password injected only into that controlled runtime environment, never output or committed. Valid cases execute real UPDATE/DELETE on synthetic local PostgreSQL tables. Invalid/missing/blank cases reject before any database client or SQL. No production secret, account or database used.",
        },
        null,
        2,
      ),
    );
    console.log("PASS " + results.length + " admin authorization cases");
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
