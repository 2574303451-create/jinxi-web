const fs = require("node:fs"),
  path = require("node:path");
const root = __dirname,
  flags = [];
// Report locations only. Never print possible secret values.
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.(json|html|md|txt|cjs)$/i.test(file)) {
      const text = fs.readFileSync(file, "utf8");
      const patterns = {
        privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        githubToken: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{15,}/,
        bearer: /\bBearer [A-Za-z0-9._-]{20,}/,
        database: /\bpostgres(?:ql)?:\/\/[^\s"']+/,
        environmentSecret:
          /\b(?:DATABASE_URL|ADMIN_PASSWORD|GITHUB_TOKEN|OPENAI_API_KEY)\s*[:=]\s*["'][^"'\r\n]{5,}["']/,
      };
      for (const [kind, re] of Object.entries(patterns))
        if (re.test(text))
          flags.push({ file: path.relative(root, file), kind });
      if (file.endsWith(".json")) {
        try {
          const data = JSON.parse(text);
          const visit = (value, p) => {
            if (!value || typeof value !== "object") return;
            for (const [k, v] of Object.entries(value)) {
              if (
                /^(authorization|cookie|set-cookie|access_token|refresh_token|api_key)$/i.test(
                  k,
                ) &&
                typeof v === "string" &&
                v.length > 0
              )
                flags.push({
                  file: path.relative(root, file),
                  kind: "credential-field",
                  path: p + "." + k,
                  length: v.length,
                });
              else visit(v, p + "." + k);
            }
          };
          visit(data, "$");
        } catch (error) {
          flags.push({ file: path.relative(root, file), kind: "invalid-json" });
        }
      }
    }
  }
}
walk(root);
fs.writeFileSync(
  path.join(root, "artifact-scan.json"),
  JSON.stringify(
    {
      flags,
      method:
        "Pattern/JSON-field screening of task text artifacts only; potential matches require review. Does not certify absence of every possible secret.",
      filesRoot: "artifacts/rea-003",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ flags }));
if (flags.length) process.exitCode = 1;
