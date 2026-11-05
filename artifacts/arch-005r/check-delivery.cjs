const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { execFileSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const baseline = "80737413d3bb981b3a3287c603893eb6c09decf2";
const original = (file) =>
  execFileSync("git", ["show", `${baseline}:${file}`], {
    maxBuffer: 15e6,
    stdio: ["ignore", "pipe", "ignore"],
  });
const hash = (b) =>
  crypto
    .createHash("sha256")
    .update(b.toString().replace(/\r\n/g, "\n"))
    .digest("hex");
const protectedFiles = [
  "app/page.tsx",
  "components/home/guild-hero.tsx",
  "components/home/message-showcase.tsx",
  "components/home/ribbon-card.tsx",
  "hooks/use-public-messages.ts",
  "components/message-wall.tsx",
  "components/magicui/member-grid.tsx",
  "components/magicui/3d-carousel.tsx",
  "components/member-detail-modal.tsx",
  "components/guild-uptime-terminal.tsx",
  "components/guild-uptime-terminal.module.css",
  "config/guild-terminal.config.json",
  "lib/guild-terminal-utils.ts",
  "components/profile/member-avatar.tsx",
  "styles/profile-lab.css",
  "netlify/functions/points.js",
  "netlify/functions/auth-login.js",
  "netlify/functions/auth-change-password.js",
  "netlify/functions/strategies.js",
  "database-strategy-schema.sql",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
];
const invariants = protectedFiles.map((file) => {
  const before = hash(original(file)),
    after = hash(fs.readFileSync(file));
  assert.equal(after, before, file);
  return { file, sha256: after, unchanged: true };
});
const css = fs.readFileSync("styles/community-components.css", "utf8"),
  oldCss = original("styles/community-components.css").toString();
for (const selector of [
  ".paper-avatar",
  ".paper-avatar i",
  ".message-replies .paper-avatar",
  ".ribbon-card-top .paper-avatar",
]) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    pattern = new RegExp("(?:^|\\n)" + escaped + "\\s*\\{[^}]*\\}");
  const before = oldCss.match(pattern)?.[0],
    after = css.match(pattern)?.[0];
  assert(before && after, selector);
  assert.equal(after.replaceAll("\r\n", "\n"), before.replaceAll("\r\n", "\n"));
  invariants.push({ selector, unchanged: true });
}
const csp = (txt) => txt.match(/Content-Security-Policy = "([^"]+)"/)[1];
const beforeCsp = csp(original("netlify.toml").toString()),
  afterCsp = csp(fs.readFileSync("netlify.toml", "utf8"));
assert.equal(
  afterCsp.replace(
    "media-src 'self' https://interactive-examples.mdn.mozilla.net; ",
    "",
  ),
  beforeCsp,
);
invariants.push({
  check: "CSP differs only by exact media-src allowlist; script-src unchanged",
  unchanged: true,
});
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
    .filter(Boolean);
const files = [...new Set([...tracked, ...untracked])];
const findings = [];
for (const file of files) {
  if (/\.(?:png|jpe?g|webp|gz)$/i.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const [name, re] of [
    [
      "GitHub credential",
      /\b(?:gh[pousr]_[A-Za-z\d]{25,}|github_pat_[A-Za-z\d_]{25,})/,
    ],
    ["connection string", /postgres(?:ql)?:\/\/[^\s"<>]+@/i],
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ])
    if (re.test(text)) findings.push({ file, name });
  if (/(?:^|\/)(?:\.env(?:\..*)?|runtime\.json|pg-password\.txt)$/i.test(file))
    findings.push({ file, name: "forbidden credential filename" });
}
assert.deepEqual(findings, []);
const changes = files
  .filter((f) => !f.startsWith("artifacts/"))
  .map((file) => {
    let before;
    try {
      before = original(file).length;
    } catch {
      before = 0;
    }
    return { file, beforeBytes: before, afterBytes: fs.statSync(file).size };
  });
fs.writeFileSync(
  path.join(__dirname, "invariants.json"),
  JSON.stringify(
    {
      baseline,
      invariants,
      passed: true,
      method:
        "Normalized line-ending hashes for protected files, exact original avatar-frame blocks, CSP directive comparison. No content or business changes permitted in protected files.",
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
      scope:
        "Only current modified/untracked delivery files, no environment files read; heuristic credential scan plus explicit filename restrictions, not a full security certification.",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    protected: invariants.length,
    sourceFiles: changes.length,
    filesChecked: files.length,
    findings,
  }),
);
