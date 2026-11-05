import { readGuideList, type HomeGuideFeed } from "./guide-service";
import { isPublicAttachmentUrl } from "../lib/guide-attachment-policy";
import { publicReadCache } from "./public-read-cache";
export type { HomeGuideFeed } from "./guide-service";
export type HomeGuide = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  image: string | null;
  hasVideo: boolean | null;
  isPinned: boolean;
  views: number | null;
  comments: number | null;
  updatedAt: string | null;
  tags: string[];
};
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
function array(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.length < 65536) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
function image(value: unknown) {
  const src = text(value, 2049);
  return isPublicAttachmentUrl(src) ? src : null;
}
export function toHomeGuide(value: unknown): HomeGuide | null {
  const row = record(value);
  if (!row || row.status !== "published") return null;
  const id = String(row.id || "");
  if (
    !/^[1-9]\d{0,9}$/.test(id) ||
    Number(id) > 2147483647 ||
    !text(row.title, 100)
  )
    return null;
  const media = array(row.mediaFiles),
    files = media?.map(record).filter((r): r is Record<string, unknown> => !!r),
    firstImage = files?.find((m) => m.type === "image"),
    firstVideo = files?.find((m) => m.type === "video");
  const date = text(row.updatedAt || row.createdAt, 60);
  return {
    id,
    title: text(row.title, 100),
    excerpt: text(row.excerpt || row.content, 600)
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*|`/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 150),
    author: text(row.author, 40) || "匿名署名",
    category: text(row.category, 30) || "攻略",
    image:
      image(row.imageUrl) ||
      image(firstImage?.url) ||
      image(firstVideo?.thumbnail),
    hasVideo:
      typeof row.hasVideo === "boolean"
        ? row.hasVideo
        : count(row.videoCount) !== null
          ? Number(row.videoCount) > 0
          : media
            ? !!firstVideo
            : null,
    isPinned: row.isPinned === true,
    views: count(row.viewCount),
    comments: count(row.commentCount) ?? array(row.comments)?.length ?? null,
    updatedAt: date && Number.isFinite(Date.parse(date)) ? date : null,
    tags: [
      ...new Set(
        (array(row.tags) || [])
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim().slice(0, 20))
          .filter(Boolean),
      ),
    ].slice(0, 2),
  };
}
export class HomeGuideReadError extends Error {
  constructor(public readonly reason: "upgrade-required" | "invalid-response") {
    super("首页攻略暂不可用");
  }
}
const cachedRead = publicReadCache<HomeGuideFeed, HomeGuide[]>(
  async (feed, signal) => {
    const body = await readGuideList(
      {
        limit: 3,
        offset: 0,
        sortBy: "created_at",
        sortOrder: "DESC",
        feed,
      },
      signal,
    );
    if (
      body.contract !== "jinxi.guides.summary.v2" ||
      body.appliedFeed !== feed
    )
      throw new HomeGuideReadError("upgrade-required");
    if (!Array.isArray(body.strategies) || body.strategies.length > 3)
      throw new HomeGuideReadError("invalid-response");
    for (const row of body.strategies) {
      if (
        row.status !== "published" ||
        typeof row.hasVideo !== "boolean" ||
        typeof row.videoCount !== "number" ||
        !Number.isSafeInteger(row.videoCount) ||
        row.videoCount < 0 ||
        row.hasVideo !== row.videoCount > 0 ||
        (row.imageUrl !== null && typeof row.imageUrl !== "string") ||
        ["content", "comments", "likes", "favorites"].some(
          (key) => key in row,
        ) ||
        (feed === "video" && !row.hasVideo) ||
        (feed === "pinned" && !row.isPinned)
      )
        throw new HomeGuideReadError("invalid-response");
    }
    const seen = new Set<string>(),
      items = body.strategies
        .map(toHomeGuide)
        .filter(
          (item): item is HomeGuide =>
            !!item && !seen.has(item.id) && !!seen.add(item.id),
        );
    if (items.length !== body.strategies.length)
      throw new HomeGuideReadError("invalid-response");
    return items;
  },
);
export function readHomeGuides(feed: HomeGuideFeed = "latest", force = false) {
  if (!["latest", "video", "pinned"].includes(feed))
    return Promise.reject(new HomeGuideReadError("invalid-response"));
  return cachedRead(feed, force);
}
