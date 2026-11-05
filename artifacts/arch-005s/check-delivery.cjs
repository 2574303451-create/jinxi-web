const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { execFileSync, spawnSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const baseline = "2836ed13cc5f7da7ffcbce52755063dfbe80b55d",
  norm = (s) => s.toString().replaceAll("\r\n", "\n"),
  hash = (s) => crypto.createHash("sha256").update(norm(s)).digest("hex"),
  original = (file) =>
    execFileSync("git", ["show", `${baseline}:${file}`], {
      maxBuffer: 20e6,
      stdio: ["ignore", "pipe", "ignore"],
    });
const protectedFiles = [
  "components/home/guild-hero.tsx",
  "components/home/guild-members.tsx",
  "components/home/message-showcase.tsx",
  "components/home/ribbon-card.tsx",
  "components/home/community-updates.tsx",
  "hooks/use-public-messages.ts",
  "components/message-wall.tsx",
  "components/magicui/member-grid.tsx",
  "components/magicui/3d-carousel.tsx",
  "components/member-detail-modal.tsx",
  "components/guild-time/runtime-clock.tsx",
  "components/guild-uptime-terminal.module.css",
  "config/guild-terminal.config.json",
  "lib/guild-terminal-utils.ts",
  "lib/guild-terminal-config.ts",
  "components/ui/paper.tsx",
  "styles/community-components.css",
  "styles/profile-lab.css",
  "components/profile/avatar-editor.tsx",
  "netlify/functions/points.js",
  "netlify/functions/auth-login.js",
  "netlify/functions/auth-change-password.js",
  "netlify/functions/strategies.js",
  "netlify/functions/_shared/strategy-read.js",
  "netlify/functions/_shared/admin-password.js",
  "netlify/functions/strategy-actions.js",
  "netlify/functions/message-actions.js",
  "database-strategy-schema.sql",
  "database-member-auth-schema.sql",
  "package-lock.json",
  "next.config.mjs",
  "netlify.toml",
  "styles/guild-theme.css",
];
const invariants = protectedFiles.map((file) => {
  const before = hash(original(file)),
    after = hash(fs.readFileSync(file));
  assert.equal(after, before, file);
  return { file, sha256: after, unchanged: true };
});
const pageFile = "app/page.tsx",
  page = norm(fs.readFileSync(pageFile));
assert.equal(
  page
    .replace(
      'import { GuildFacts } from "../components/home/guild-facts"\n',
      "",
    )
    .replace(
      'import { FeaturedGuides } from "../components/home/featured-guides"\n',
      "",
    )
    .replace("        <GuildFacts />\n", "")
    .replace("        <FeaturedGuides />\n", ""),
  norm(original(pageFile)),
);
invariants.push({
  file: pageFile,
  onlyAdditions: "two imports and two new module mounts",
  passed: true,
});
const timeFile = "components/guild-uptime-terminal.tsx";
assert.equal(
  norm(fs.readFileSync(timeFile)).replace('      id="guild-time-anchor"\n', ""),
  norm(original(timeFile)),
);
invariants.push({
  file: timeFile,
  onlyAddition: "stable aside anchor ID",
  passed: true,
});
const section = "components/home/guild-sections.tsx";
assert.equal(
  norm(fs.readFileSync(section))
    .replace("  id,\n", "")
    .replace("  id?: string;\n", "")
    .replace("<h2 id={id}>", "<h2>"),
  norm(original(section)),
);
invariants.push({
  file: section,
  onlyAddition: "optional heading ID, no existing layout/content changes",
  passed: true,
});
const packageBefore = JSON.parse(original("package.json")),
  packageAfter = JSON.parse(fs.readFileSync("package.json"));
assert.equal(
  packageAfter.scripts.prebuild,
  "node scripts/generate-guild-summary.cjs",
);
delete packageAfter.scripts.prebuild;
assert.deepEqual(packageAfter, packageBefore);
invariants.push({
  file: "package.json",
  onlyAddition:
    "prebuild aggregate generation; dependencies and framework unchanged",
  passed: true,
});
const facts = JSON.parse(fs.readFileSync("lib/guild-home-facts.json")),
  archive = JSON.parse(fs.readFileSync("config/guild-terminal.config.json"));
assert.equal(facts.archiveCount, Object.keys(archive.members).length);
assert.equal(facts.foundedDate, archive.guildFoundedDate);
assert.equal(
  facts.sourceRevision,
  hash(fs.readFileSync("config/guild-terminal.config.json")),
);
const tracked = execFileSync("git", ["diff", "--name-only", "-z", baseline], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean),
  untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean),
  files = [...new Set([...tracked, ...untracked])],
  findings = [];
for (const file of files) {
  if (/\.(?:png|jpe?g|webp|gz)$/i.test(file)) continue;
  const t = fs.readFileSync(file, "utf8");
  for (const [name, re] of [
    [
      "GitHub token",
      /\b(?:gh[pousr]_[A-Za-z\d]{25,}|github_pat_[A-Za-z\d_]{25,})/,
    ],
    ["database connection", /postgres(?:ql)?:\/\/[^\s"<>]+@/i],
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    [
      "unredacted signed image URL",
      /(?:OSSAccessKeyId|Signature|X-Amz-Signature)=(?!\[redacted)[A-Za-z\d%+/]{8,}/i,
    ],
  ])
    if (re.test(t)) findings.push({ file, name });
  if (/(?:^|\/)(?:\.env(?:\..*)?|runtime\.json|pg-password\.txt)$/i.test(file))
    findings.push({ file, name: "credential filename" });
}
assert.deepEqual(findings, []);
const changes = files
  .filter((f) => !f.startsWith("artifacts/"))
  .map((file) => {
    let beforeBytes = 0;
    try {
      beforeBytes = original(file).length;
    } catch {}
    return { file, beforeBytes, afterBytes: fs.statSync(file).size };
  });
const checks = files
  .filter((f) => f.endsWith(".cjs"))
  .map((file) => {
    const r = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    return { file, exit: r.status, error: r.stderr || "" };
  });
assert(checks.every((r) => r.exit === 0));
fs.writeFileSync(
  path.join(__dirname, "invariants.json"),
  JSON.stringify(
    {
      baseline,
      invariants,
      passed: true,
      scope:
        "Protected source hashes, exact whitelist of homepage/anchor/heading/prebuild additions. No production API, schema, identity or visual baseline rewrites.",
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(__dirname, "file-changes.json"),
  JSON.stringify(changes, null, 2),
);
fs.writeFileSync(
  path.join(__dirname, "artifact-scan.json"),
  JSON.stringify(
    {
      filesChecked: files.length,
      findings,
      method:
        "Heuristic scan of delivery text only, no environment files read. Signed third-party image URL parameters redacted; originals outside Git. Not a full security certification.",
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(__dirname, "syntax-results.json"),
  JSON.stringify({ checks, passed: true }, null, 2),
);
console.log(
  JSON.stringify({
    protected: invariants.length,
    sourceFiles: changes.length,
    syntax: checks.length,
    filesChecked: files.length,
    findings,
  }),
);
