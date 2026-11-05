// Read-only SQL. All user values are bound parameters; identifiers come only from this allowlist.
const jsonArray = (column) =>
  `CASE WHEN jsonb_typeof(${column})='array' THEN ${column} ELSE '[]'::jsonb END`;
const arrayCount = (column) => `jsonb_array_length(${jsonArray(column)})`;
const orderColumns = {
  created_at: "created_at",
  view_count: "view_count",
  likes: arrayCount("likes"),
};
const fullColumns =
  "id,title,content,author,category,difficulty,tags,likes,favorites,comments,is_pinned,image_url,media_files,view_count,status,created_at,updated_at";
const summaryColumns = `id,title,LEFT(content,150) AS excerpt,author,category,difficulty,tags,is_pinned,view_count,status,created_at,updated_at,${arrayCount("likes")} AS like_count,${arrayCount("favorites")} AS favorite_count,${arrayCount("comments")} AS comment_count`;
const asArray = (value) => (Array.isArray(value) ? value : []);
function format(row, summary = false) {
  const base = {
    id: String(row.id),
    title: row.title,
    author: row.author,
    category: row.category,
    difficulty: row.difficulty,
    tags: asArray(row.tags),
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
        likes: asArray(row.likes),
        favorites: asArray(row.favorites),
        comments: asArray(row.comments),
        imageUrl: row.image_url,
        mediaFiles: asArray(row.media_files),
      };
}
async function readStrategies(sql, params) {
  // This is the public read path. Client-supplied status/role/password never grant draft access.
  if (
    params.status !== undefined &&
    params.status !== "" &&
    params.status !== "published"
  )
    return {
      status: 403,
      body: { error: "公开接口仅提供已发布攻略；草稿读取需要服务端授权。" },
    };
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
  for (const [key, minimum] of [
    ["limit", 1],
    ["offset", 0],
  ]) {
    if (
      params[key] !== undefined &&
      (!/^\d+$/.test(String(params[key])) ||
        Number(params[key]) < minimum ||
        !Number.isSafeInteger(Number(params[key])))
    )
      return { status: 400, body: { error: "分页参数无效" } };
  }
  if (
    (params.sortBy && !Object.hasOwn(orderColumns, params.sortBy)) ||
    (params.sortOrder && !["ASC", "DESC"].includes(params.sortOrder))
  )
    return { status: 400, body: { error: "排序参数无效" } };
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
  add("status=?", "published");
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
