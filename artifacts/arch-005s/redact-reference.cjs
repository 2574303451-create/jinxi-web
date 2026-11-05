// Full originals remain outside Git. Redact public signed asset URL parameters in report copies.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "reference"),
  privateRoot = "E:/Recovery/.jinxi-research/arch-005s-original-evidence";
fs.mkdirSync(privateRoot, { recursive: true });
const names = [
  "rea-desktop.json",
  "rea-mobile-observed.json",
  "rea-desktop.html",
  "rea-mobile.html",
  "card-dom.json",
];
const results = [];
const redact = (s) =>
  s.replace(
    /((?:OSSAccessKeyId|Signature|Expires|X-Amz-Signature|X-Amz-Credential)=)[^&\s"'<>\\]*/gi,
    "$1[redacted-public-signed-URL]",
  );
function walk(v) {
  if (typeof v === "string") {
    if (v.startsWith("{") && v.includes('"evidence_id"')) {
      try {
        return JSON.stringify(walk(JSON.parse(v)));
      } catch {}
    }
    return redact(v);
  }
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, value]) => [k, walk(value)]),
    );
  return v;
}
for (const name of names) {
  const p = path.join(root, name),
    original = path.join(privateRoot, name);
  if (!fs.existsSync(original)) fs.copyFileSync(p, original);
  const bytes = fs.readFileSync(original),
    source = bytes.toString("utf8");
  let output;
  if (name.endsWith(".json")) {
    const value = walk(JSON.parse(source));
    output = JSON.stringify(value, null, 2);
  } else output = redact(source);
  fs.writeFileSync(p, output);
  results.push({
    file: "reference/" + name,
    originalSHA256: crypto.createHash("sha256").update(bytes).digest("hex"),
    redactedCopySHA256: crypto
      .createHash("sha256")
      .update(output)
      .digest("hex"),
    changed: source !== output,
  });
}
fs.writeFileSync(
  path.join(root, "redaction-record.json"),
  JSON.stringify(
    {
      originalDirectory: privateRoot,
      scope:
        "No credential storage/header collection requested. Public page includes signed image asset URL parameters, which are redacted from repository copies. MCP Evidence IDs/digests refer to unchanged private original payload; repository redacted copy is not claimed byte-identical to original Evidence. Screenshot PNG unchanged.",
      results,
    },
    null,
    2,
  ),
);
console.log(
  "Redacted public signed URL parameters; originals retained outside Git.",
);
