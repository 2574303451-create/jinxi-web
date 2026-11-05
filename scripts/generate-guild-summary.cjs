// Publish aggregate archive facts only; never member names, IDs, accounts or active status.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  ts = require("typescript"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  file = "config/guild-terminal.config.json",
  raw = fs.readFileSync(path.join(root, file), "utf8"),
  config = JSON.parse(raw);
// This checked-in record binds the verified Git timestamp to these exact source
// bytes. Shallow clones and source archives must not invent a modification date.
const provenance = JSON.parse(
  fs.readFileSync(path.join(root, "config/guild-archive-source.json"), "utf8"),
);
const sourceRevision = crypto
  .createHash("sha256")
  .update(raw.replaceAll("\r\n", "\n"))
  .digest("hex");
if (
  provenance.sourceFile !== file ||
  provenance.sourceRevision !== sourceRevision ||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(
    provenance.sourceUpdatedAt,
  ) ||
  !Number.isFinite(Date.parse(provenance.sourceUpdatedAt))
)
  throw Error(
    "Archive provenance missing or stale: verify source SHA-256 and last source commit timestamp before building.",
  );
const git = (args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
  }).trim();
let fullHistory = false;
try {
  fullHistory = git(["rev-parse", "--is-shallow-repository"]) === "false";
} catch {
  // Source archives or a missing Git executable use hash-bound provenance.
}
if (fullHistory) {
  const updatedAt = git(["log", "-1", "--format=%cI", "--", file]);
  if (updatedAt !== provenance.sourceUpdatedAt)
    throw Error(
      "Archive provenance differs from full Git history; review and update the hash-bound source record.",
    );
}
const syntax = ts.parseJsonText(file, raw);
if (syntax.parseDiagnostics.length) throw Error("Archive JSON syntax invalid");
const members = syntax.statements[0].expression.properties.find(
  (p) => p.name.text === "members",
)?.initializer;
const identifiers = members?.properties.map((p) => p.name.text) || [];
if (!identifiers.length || new Set(identifiers).size !== identifiers.length)
  throw Error("Archive has missing or duplicate record IDs");
const rows = Object.entries(config.members);
if (rows.length !== identifiers.length)
  throw Error("Archive record count mismatch");
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
if (
  !validDate(config.guildFoundedDate) ||
  rows.some(
    ([id, m]) =>
      !/^\d+$/.test(id) ||
      !validDate(m.joinDate) ||
      m.joinDate < config.guildFoundedDate,
  )
)
  throw Error("Archive identifier or date needs review");
const facts = {
  archiveCount: identifiers.length,
  founderCount: rows.filter(([, m]) => m.role === "founder").length,
  ordinaryCount: rows.filter(([, m]) => m.role === "member").length,
  foundedDate: config.guildFoundedDate,
  sourceFile: file,
  sourceRevision,
  sourceUpdatedAt: provenance.sourceUpdatedAt,
};
fs.writeFileSync(
  path.join(root, "lib/guild-home-facts.json"),
  JSON.stringify(facts, null, 2) + "\n",
);
console.log(
  `Archive facts: ${facts.archiveCount} unique records; no active/online inference.`,
);
console.log(
  fullHistory
    ? "Archive date verified against full Git history."
    : "Archive date from checked-in hash-bound provenance (Git history unavailable or shallow).",
);
