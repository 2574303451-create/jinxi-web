// Shared lexical URI policy. It never fetches a URL or asserts playability.
const label = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const octet = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";
const host = `(?:(?=[^/?#:]*[a-z])${label}(?:\\.${label})*|${octet}(?:\\.${octet}){3})`;
const port =
  "(?::(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?";
const tail = '[^\\s\\\\<>"`\\x01-\\x1f\\x7f]*';
const EXTRA_WHITESPACE_PATTERN =
  "[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]";
const ATTACHMENT_URL_PATTERN = `^(?:https?://${host}${port}(?:[/?#]${tail})?|/(?!/)${tail})$`;
const pattern = new RegExp(ATTACHMENT_URL_PATTERN, "i");
const SITE_ORIGIN_PATTERN =
  "^https?://jinxi-web[.]netlify[.]app(?::(?:80|443))?";
// Decode only the ASCII characters relevant to path traversal/promo exclusion.
const PATH_ESCAPES = [
  ["2e", "."],
  ["2f", "/"],
  ["5c", "\\"],
  ["31", "1"],
  ["32", "2"],
  ["6d", "m"],
  ["4d", "m"],
  ["70", "p"],
  ["50", "p"],
  ["34", "4"],
];
function isPublicAttachmentUrl(value, excludePromos = false) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\0") ||
    new TextEncoder().encode(value).length > 2048 ||
    value !== value.trim() ||
    !pattern.test(value) ||
    /%(?![a-f0-9]{2})/i.test(value)
  )
    return false;
  let urlPath = value
    .toLowerCase()
    .split(/[?#]/, 1)[0]
    .replace(/^https?:\/\/[^/]*/, "");
  for (const [code, replacement] of PATH_ESCAPES)
    urlPath = urlPath.replace(new RegExp("%" + code, "gi"), replacement);
  if (urlPath.includes("\\") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(urlPath))
    return false;
  const ownSite =
    value.startsWith("/") ||
    new RegExp(SITE_ORIGIN_PATTERN + "(?:[/?#]|$)", "i").test(value);
  return !(excludePromos && ownSite && /^\/[12]\.mp4$/.test(urlPath));
}
module.exports = {
  ATTACHMENT_URL_PATTERN,
  EXTRA_WHITESPACE_PATTERN,
  SITE_ORIGIN_PATTERN,
  PATH_ESCAPES,
  isPublicAttachmentUrl,
};
