// Read-only SQL. All user values are bound parameters; identifiers come only from this allowlist.
const orderColumns = {
  created_at: "created_at",
  view_count: "view_count",
  likes: "jsonb_array_length(COALESCE(likes, '[]'::jsonb))",
};
const fullColumns =
  "id,title,content,author,category,difficulty,tags,likes,favorites,comments,is_pinned,image_url,media_files,view_count,status,created_at,updated_at";
const summaryColumns =
  "id,title,LEFT(content,150) AS excerpt,author,category,difficulty,tags,is_pinned,view_count,status,created_at,updated_at,jsonb_array_length(COALESCE(likes,'[]'::jsonb)) AS like_count,jsonb_array_length(COALESCE(favorites,'[]'::jsonb)) AS favorite_count,jsonb_array_length(COALESCE(comments,'[]'::jsonb)) AS comment_count";
function format(row, summary = false) {
  const base = {
    id: String(row.id),
    title: row.title,
    author: row.author,
    category: row.category,
    difficulty: row.difficulty,
    tags: row.tags || [],
    isPinned: row.is_pinned,
    viewCount: row.view_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return summary
    ? {
        ...base,
        excerpt: row.excerpt,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      }
    : {
        ...base,
        content: row.content,
        likes: row.likes || [],
        favorites: row.favorites || [],
        comments: row.comments || [],
        imageUrl: row.image_url,
        mediaFiles: row.media_files || [],
      };
}
async function readStrategies(sql, params) {
  if (params.id !== undefined) {
    if (!/^[1-9]\d{0,9}$/.test(params.id) || Number(params.id) > 2147483647)
      return { status: 400, body: { error: "攻略ID无效" } };
    const rows = await sql.query(
      `SELECT ${fullColumns} FROM strategies WHERE id=$1 AND status='published' LIMIT 1`,
      [Number(params.id)],
    );
    return rows[0]
      ? { status: 200, body: { strategy: format(rows[0]) } }
      : { status: 404, body: { error: "攻略不存在或暂未公开" } };
  }
  // The legacy list response remains available; the new page explicitly opts into summaries.
  const summary = params.summary === "1",
    limit = Math.min(50, Math.max(1, Number.parseInt(params.limit, 10) || 12)),
    offset = Math.min(
      100000,
      Math.max(0, Number.parseInt(params.offset, 10) || 0),
    );
  const values = [],
    where = [];
  const add = (clause, value) => {
    values.push(value);
    where.push(clause.replaceAll("?", `$${values.length}`));
  };
  // Preserve legacy status filtering for existing clients. New page always requests published.
  const status = summary ? "published" :
    typeof params.status === "string" ? params.status.trim() : "published";
  if (status && status !== "all") add("status=?", status);
  if (params.category && params.category !== "all")
    add("category=?", String(params.category).trim());
  if (params.difficulty && params.difficulty !== "all") {
    const d = Number(params.difficulty);
    if (!Number.isInteger(d) || d < 1 || d > 5)
      return { status: 400, body: { error: "难度无效" } };
    add("difficulty=?", d);
  }
  if (params.search?.trim())
    add(
      "(STRPOS(LOWER(title),?)>0 OR STRPOS(LOWER(content),?)>0)",
      String(params.search).trim().toLowerCase().slice(0, 200),
    );
  const predicate = where.length ? " WHERE " + where.join(" AND ") : "",
    sort = orderColumns[params.sortBy] || orderColumns.created_at,
    order = params.sortOrder === "ASC" ? "ASC" : "DESC";
  const counts = await sql.query(
    "SELECT COUNT(*)::int AS total FROM strategies" + predicate,
    values,
  );
  const rows = await sql.query(
    `SELECT ${summary ? summaryColumns : fullColumns} FROM strategies${predicate} ORDER BY is_pinned DESC, ${sort} ${order}, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  const total = Number(counts[0]?.total || 0);
  return {
    status: 200,
    body: {
      strategies: rows.map((r) => format(r, summary)),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    },
  };
}
module.exports = { readStrategies };
