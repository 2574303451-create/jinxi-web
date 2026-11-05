const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
// Only the database transport/configuration is substituted, not handler or SQL.
function loadHandler(file, factory) {
  const absolute = path.resolve(__dirname, "../../netlify/functions", file),
    actualRequire = createRequire(absolute),
    module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(absolute, "utf8"),
    {
      module,
      exports: module.exports,
      require: (name) =>
        name === "@neondatabase/serverless"
          ? { neon: factory }
          : actualRequire(name),
      process: { env: { DATABASE_URL: "isolated-transport-only" } },
      console: { error: () => {}, log: () => {} },
      AbortSignal,
    },
    { filename: absolute },
  );
  return module.exports.handler;
}
module.exports = { loadHandler };
