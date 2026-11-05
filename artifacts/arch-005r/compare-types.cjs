const fs = require("node:fs"),
  path = require("node:path");
function diagnostics(name) {
  const text = fs
    .readFileSync(path.join(__dirname, name), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
  const parts = text.split(/(?=^[^\n]+\(\d+,\d+\): error TS\d+:)/m);
  return parts
    .map((block) => {
      const m = block.match(/^(.+)\(\d+,\d+\): error (TS\d+): ([\s\S]*)/);
      return m
        ? {
            file: m[1],
            code: m[2],
            message: m[3]
              .trim()
              .replaceAll('"member" | "founder"', '"founder" | "member"'),
          }
        : null;
    })
    .filter(Boolean);
}
const before = diagnostics("types-before.txt"),
  after = diagnostics("types-after.txt");
const key = (d) => JSON.stringify(d);
const remaining = before.map(key),
  added = [];
for (const diagnostic of after) {
  const index = remaining.indexOf(key(diagnostic));
  if (index < 0) added.push(diagnostic);
  else remaining.splice(index, 1);
}
const result = {
  baseline: "80737413d3bb981b3a3287c603893eb6c09decf2",
  before: before.length,
  after: after.length,
  added,
  resolved: remaining.map(JSON.parse),
  method:
    "Compare file + TS code + complete diagnostic text; ignore line/column shifts and canonicalize only the equivalent member/founder literal-union display order. Raw comparison retained separately.",
  passed: added.length === 0,
};
fs.writeFileSync(
  path.join(__dirname, "type-comparison.json"),
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    before: result.before,
    after: result.after,
    added: added.length,
    resolved: remaining.length,
  }),
);
if (added.length) process.exit(1);
