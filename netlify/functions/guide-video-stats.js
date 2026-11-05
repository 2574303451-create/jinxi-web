const { neon } = require("@neondatabase/serverless");
const { videoAggregate } = require("./_shared/strategy-media");
const { readBatch, publicReadError } = require("./_shared/strategy-query");
const {withFunctionSecurity,requestDatabase}=require("./_shared/function-security");
const COUNT_TYPE = "published-valid-url-video-attachments-v1";
exports.handler = withFunctionSecurity("guide-video-stats",neon,process.env,async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const response = (statusCode, body) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
  });
  const unavailable = {
    contract: "jinxi.guides.video-stats.v1",
    count: null,
    countType: COUNT_TYPE,
    calculatedAt: null,
    status: "unavailable",
  };
  if (event.httpMethod !== "GET")
    return response(405, { ...unavailable, error: "仅支持只读GET请求。" });
  if (Object.keys(event.queryStringParameters || {}).length)
    return response(400, {
      ...unavailable,
      error: "统计接口不接受筛选或身份参数。",
    });
  try {
    const [[row]] = await readBatch(requestDatabase(), [
      { text: videoAggregate },
    ]);
    const count = Number(row?.video_count),
      date = new Date(row?.calculated_at);
    if (
      !row ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isFinite(date.getTime())
    )
      throw Error("Invalid aggregate");
    return response(200, {
      contract: "jinxi.guides.video-stats.v1",
      count,
      countType: COUNT_TYPE,
      calculatedAt: date.toISOString(),
      status: "ready",
      playabilityVerified: false,
    });
  } catch (error) {
    const result = publicReadError(error);
    return response(result.status, { ...unavailable, ...result.body });
  }
});
