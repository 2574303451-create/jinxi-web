// Deploy previews must be given an explicitly separate read database. Never
// silently reuse production DATABASE_URL in branch/deploy-preview contexts.
function publicReadDatabaseUrl(env) {
  const preview = ["deploy-preview", "branch-deploy"].includes(env.CONTEXT);
  const value = preview ? env.JINXI_PREVIEW_DATABASE_URL : env.DATABASE_URL;
  if (typeof value !== "string" || !value) throw Error("Read database unavailable");
  if (preview) {
    const candidate = new URL(value);
    const production = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null;
    if (production && candidate.hostname === production.hostname && candidate.port === production.port && candidate.pathname === production.pathname)
      throw Error("Preview database must be isolated");
  }
  return value;
}
module.exports = { publicReadDatabaseUrl };
