import type { Strategy, StrategySearchParams } from "../types/strategy-wall";

export type GuideSummary = Pick<
  Strategy,
  | "id"
  | "title"
  | "author"
  | "category"
  | "difficulty"
  | "tags"
  | "isPinned"
  | "viewCount"
  | "createdAt"
  | "updatedAt"
  | "status"
> & {
  excerpt: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
};
const endpoint = "/.netlify/functions/strategies";
async function read(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "这篇攻略不存在或暂未公开。"
        : "攻略暂时无法读取，请稍后重试。",
    );
  return body;
}
export async function readGuideList(
  params: StrategySearchParams,
  signal?: AbortSignal,
): Promise<{
  strategies: GuideSummary[];
  pagination: { total: number; hasMore: boolean };
}> {
  const query = new URLSearchParams({ summary: "1", status: "published" });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return read(`${endpoint}?${query}`, signal);
}
export async function readGuide(
  id: string,
  signal?: AbortSignal,
): Promise<Strategy> {
  if (!/^[1-9]\d{0,9}$/.test(id)) throw new Error("攻略链接中的 ID 无效。");
  const body = await read(`${endpoint}?id=${encodeURIComponent(id)}`, signal);
  return {
    ...body.strategy,
    createdAt: new Date(body.strategy.createdAt),
    updatedAt: new Date(body.strategy.updatedAt),
    comments: (body.strategy.comments || []).map(
      (c: Strategy["comments"][number]) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      }),
    ),
  };
}
