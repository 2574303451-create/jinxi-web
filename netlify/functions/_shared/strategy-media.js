const {
  ATTACHMENT_URL_PATTERN,
  EXTRA_WHITESPACE_PATTERN,
  SITE_ORIGIN_PATTERN,
  PATH_ESCAPES,
} = require("../../../lib/guide-attachment-policy");
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
const jsonArray = (column) =>
  `CASE WHEN jsonb_typeof(${column})='array' THEN ${column} ELSE '[]'::jsonb END`;
// Expressions/regexes here are internal constants, never request SQL identifiers.
function urlPredicate(url, excludePromos = false) {
  const rawPath = `regexp_replace(split_part(split_part(lower(${url}),'?',1),'#',1),'^https?://[^/]*','')`;
  let decodedPath = rawPath;
  for (const [code, replacement] of PATH_ESCAPES)
    decodedPath = `replace(${decodedPath},'%${code}',${literal(replacement)})`;
  return `(${url} IS NOT NULL AND octet_length(${url}) BETWEEN 1 AND 2048 AND ${url} ~* ${literal(ATTACHMENT_URL_PATTERN)} AND ${url} !~ ${literal(EXTRA_WHITESPACE_PATTERN)} AND ${url} !~* '%(?![a-f0-9]{2})' AND strpos(${decodedPath},${literal("\\")})=0 AND ${decodedPath} !~ '(^|/)[.]{1,2}(/|$)'${excludePromos ? ` AND NOT ((${url} LIKE '/%' OR ${url} ~* ${literal(SITE_ORIGIN_PATTERN + "(?:[/?#]|$)")}) AND ${decodedPath} ~ '^/[12][.]mp4$')` : ""})`;
}
const validVideo = `jsonb_typeof(m.value)='object' AND m.value->>'type'='video' AND jsonb_typeof(m.value->'url')='string' AND ${urlPredicate("m.value->>'url'", true)}`;
const videoCount = `(SELECT count(*) FROM jsonb_array_elements(${jsonArray("s.media_files")}) AS m(value) WHERE ${validVideo})`;
const hasVideo = `EXISTS (SELECT 1 FROM jsonb_array_elements(${jsonArray("s.media_files")}) AS m(value) WHERE ${validVideo})`;
const cover = `COALESCE(CASE WHEN ${urlPredicate("s.image_url")} THEN s.image_url END,(SELECT m.value->>'url' FROM jsonb_array_elements(${jsonArray("s.media_files")}) WITH ORDINALITY AS m(value,position) WHERE jsonb_typeof(m.value)='object' AND m.value->>'type'='image' AND jsonb_typeof(m.value->'url')='string' AND ${urlPredicate("m.value->>'url'")} ORDER BY m.position LIMIT 1))`;
const videoAggregate = `SELECT count(*)::text AS video_count, statement_timestamp() AS calculated_at FROM strategies AS s CROSS JOIN LATERAL jsonb_array_elements(${jsonArray("s.media_files")}) AS m(value) WHERE s.status='published' AND ${validVideo}`;
module.exports = {
  jsonArray,
  urlPredicate,
  videoCount,
  hasVideo,
  cover,
  videoAggregate,
};
