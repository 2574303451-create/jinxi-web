import type {
  MediaFile,
  Strategy,
  StrategyComment,
  StrategySearchParams,
} from "../types/strategy-wall";
export type HomeGuideFeed = "latest" | "video" | "pinned";

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
  | "status"
> & {
  createdAt: string;
  updatedAt: string;
  excerpt: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  imageUrl: string | null;
  hasVideo: boolean | null;
  videoCount: number | null;
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
  params: StrategySearchParams & { feed?: HomeGuideFeed },
  signal?: AbortSignal,
): Promise<{
  strategies: GuideSummary[];
  pagination: { total: number; hasMore: boolean };
  contract?: string;
  appliedFeed?: HomeGuideFeed | null;
}> {
  const query = new URLSearchParams({ summary: "1", status: "published" });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const body = await read(`${endpoint}?${query}`, signal);
  if (!Array.isArray(body.strategies) || !body.pagination)
    throw Error("攻略暂时无法读取，请稍后重试。");
  // The independent reader can consume an old full DTO deployment. The homepage
  // still requires v2 + appliedFeed and never treats this as a global filter.
  if (body.contract !== "jinxi.guides.summary.v2") {
    body.strategies = body.strategies
      .filter((row: Strategy) => row.status === "published")
      .map((row: Strategy & Partial<GuideSummary>) => ({
        id: String(row.id),
        title: row.title,
        excerpt:
          typeof row.excerpt === "string"
            ? row.excerpt
            : String(row.content || "").slice(0, 150),
        author: row.author,
        category: row.category,
        difficulty: row.difficulty,
        tags: Array.isArray(row.tags) ? row.tags : [],
        isPinned: row.isPinned === true,
        viewCount: row.viewCount,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        likeCount:
          row.likeCount ?? (Array.isArray(row.likes) ? row.likes.length : 0),
        favoriteCount:
          row.favoriteCount ??
          (Array.isArray(row.favorites) ? row.favorites.length : 0),
        commentCount:
          row.commentCount ??
          (Array.isArray(row.comments) ? row.comments.length : 0),
        imageUrl: null,
        hasVideo: null,
        videoCount: null,
      }));
  }
  return body;
}
export async function readGuide(
  id: string,
  signal?: AbortSignal,
): Promise<Strategy> {
  if (!/^[1-9]\d{0,9}$/.test(id)) throw new Error("攻略链接中的 ID 无效。");
  const body = await read(`${endpoint}?id=${encodeURIComponent(id)}`, signal);
  const source = body.strategy;
  const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
  const label = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value : fallback;
  return {
    ...source,
    author: label(source.author, "匿名署名"),
    createdAt: new Date(source.createdAt),
    updatedAt: new Date(source.updatedAt),
    // Historical JSONB may contain null/scalar entries. Normalize only the
    // reading DTO; no database repair, authorship claim, or invented timestamp.
    comments: (Array.isArray(source.comments) ? source.comments : []).flatMap(
      (value: unknown, index: number): StrategyComment[] => {
        const comment = object(value) ? value : null;
        if (!comment || typeof comment.content !== "string") return [];
        return [
          {
            id: label(comment.id, `legacy-comment-${index}`),
            userId: typeof comment.userId === "string" ? comment.userId : "",
            userName: label(comment.userName, "匿名署名"),
            content: comment.content,
            timestamp: new Date(
              typeof comment.timestamp === "string" ||
                typeof comment.timestamp === "number"
                ? comment.timestamp
                : NaN,
            ),
          },
        ];
      },
    ),
    mediaFiles: (Array.isArray(source.mediaFiles) ? source.mediaFiles : []).map(
      (value: unknown, index: number): MediaFile => {
        const media = object(value) ? value : {};
        return {
          ...media,
          id: label(media.id, `legacy-media-${index}`),
          type: media.type === "video" ? "video" : "image",
          url: typeof media.url === "string" ? media.url : "",
          title: label(media.title, "攻略附件"),
          thumbnail:
            typeof media.thumbnail === "string" ? media.thumbnail : undefined,
        };
      },
    ),
  };
}
