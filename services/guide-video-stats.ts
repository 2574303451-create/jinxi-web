import { publicReadCache } from "./public-read-cache";
export type GuideVideoStats = {
  count: number;
  calculatedAt: string;
};
const cachedRead = publicReadCache<"stats", GuideVideoStats>(
  async (_, signal) => {
    const response = await fetch("/.netlify/functions/guide-video-stats", {
      signal,
      cache: "no-store",
    });
    const body = await response.json();
    if (
      !response.ok ||
      body.contract !== "jinxi.guides.video-stats.v1" ||
      body.countType !== "published-valid-url-video-attachments-v1" ||
      body.status !== "ready" ||
      !Number.isSafeInteger(body.count) ||
      body.count < 0 ||
      typeof body.calculatedAt !== "string" ||
      !Number.isFinite(Date.parse(body.calculatedAt))
    )
      throw Error("攻略视频统计暂不可用");
    return { count: body.count, calculatedAt: body.calculatedAt };
  },
);
export const readGuideVideoStats = (force = false) =>
  cachedRead("stats", force);
