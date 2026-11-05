// One bounded READ ONLY snapshot per logical request; no persistent DB settings.
const STATEMENT_TIMEOUT_MS = 3000;
async function readBatch(sql, queries) {
  const rows = await sql.transaction(
    (tx) => [
      tx.query("SELECT set_config('statement_timeout',$1,true)", [
        String(STATEMENT_TIMEOUT_MS),
      ]),
      ...queries.map(({ text, values = [] }) => tx.query(text, values)),
    ],
    {
      readOnly: true,
      isolationLevel: "RepeatableRead",
      fetchOptions: { signal: AbortSignal.timeout(5000) },
    },
  );
  return rows.slice(1);
}
function publicReadError(error) {
  const timedOut =
    error?.code === "57014" ||
    ["TimeoutError", "AbortError"].some((name) =>
      [error?.name, error?.sourceError?.name, error?.cause?.name].includes(
        name,
      ),
    );
  return {
    status: timedOut ? 504 : 503,
    body: {
      error: timedOut
        ? "攻略读取超时，请稍后重试。"
        : "攻略暂时无法读取，请稍后重试。",
    },
  };
}
module.exports = { readBatch, publicReadError, STATEMENT_TIMEOUT_MS };
