const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  crypto = require("node:crypto");
const file = "config/guild-terminal.config.json",
  raw = fs.readFileSync(file, "utf8"),
  config = JSON.parse(raw),
  syntax = ts.parseJsonText(file, raw),
  properties = syntax.statements[0].expression.properties.find(
    (p) => p.name.text === "members",
  ).initializer.properties;
const ids = properties.map((p) => p.name.text),
  rows = Object.entries(config.members),
  seen = new Map(),
  names = new Map(),
  validDate = (s) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s + "T00:00:00Z")) &&
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
for (const [id, m] of rows) {
  const name = m.name.trim().normalize("NFC");
  names.set(name, [...(names.get(name) || []), id]);
}
const numeric = ids.map(Number).sort((a, b) => a - b),
  missing = [];
for (let n = numeric[0]; n <= numeric.at(-1); n++)
  if (!ids.includes(String(n))) missing.push(String(n));
const result = {
  source: file,
  sha256Raw: crypto.createHash("sha256").update(raw).digest("hex"),
  sha256Lf: crypto
    .createHash("sha256")
    .update(raw.replaceAll("\r\n", "\n"))
    .digest("hex"),
  checkedAt: new Date().toISOString(),
  guildFoundedDate: config.guildFoundedDate,
  syntaxMemberProperties: ids.length,
  uniqueArchiveIDs: seen.size,
  duplicateJsonIDs: [...seen]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({ id, occurrences: n })),
  founder: rows.filter(([, m]) => m.role === "founder").length,
  ordinary: rows.filter(([, m]) => m.role === "member").length,
  founderIdMatches: config.members[config.founderMemberId]?.role === "founder",
  invalidIDs: ids.filter((id) => !/^\d+$/.test(id)),
  numericRange: [numeric[0], numeric.at(-1)],
  missingInNumericRange: missing,
  duplicateNicknameGroups: [...names.values()].filter(
    (group) => group.length > 1,
  ),
  invalidDates: rows
    .filter(([, m]) => !validDate(m.joinDate))
    .map(([id, m]) => ({ id, date: m.joinDate })),
  beforeFoundation: rows
    .filter(([, m]) => m.joinDate < config.guildFoundedDate)
    .map(([id]) => id),
  futureDates: rows
    .filter(([, m]) => m.joinDate > new Date().toISOString().slice(0, 10))
    .map(([id]) => id),
  explicitActiveField: rows.some(
    ([, m]) => "is_active" in m || "isActive" in m,
  ),
  joinDateRange: [...rows.map(([, m]) => m.joinDate)]
    .sort()
    .filter((_, i, a) => i === 0 || i === a.length - 1),
  countMeaning:
    "Archive records keyed by unique archive ID, not nickname, current membership or online members. Real guild_member_profiles/is_active/import coverage not read.",
};
fs.writeFileSync(
  path.join(__dirname, "member-audit.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
