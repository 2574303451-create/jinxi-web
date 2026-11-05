import { readGuideList } from "./guide-service";
import { safeMediaUrl } from "../lib/guide-media-policy";
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
  return src.length <= 2048 &&
    /^(?:https?:\/\/|\/)/i.test(src) &&
    safeMediaUrl(src)
    ? src
    : null;
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
let cached: { at: number; items: HomeGuide[] } | null = null,
  pending: Promise<HomeGuide[]> | null = null;
export function readHomeGuides(force = false) {
  if (pending) return pending;
  if (!force && cached && Date.now() - cached.at < 60000)
    return Promise.resolve(cached.items);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  pending = readGuideList(
    {
      limit: 3,
      offset: 0,
      sortBy: "created_at",
      sortOrder: "DESC",
    },
    controller.signal,
  )
    .then((body) => {
      if (!Array.isArray(body.strategies)) throw Error("攻略响应暂不可用");
      const seen = new Set<string>(),
        items = body.strategies
          .slice(0, 3)
          .map(toHomeGuide)
          .filter(
            (item): item is HomeGuide =>
              !!item && !seen.has(item.id) && !!seen.add(item.id),
          );
      cached = { at: Date.now(), items };
      return items;
    })
    .finally(() => {
      clearTimeout(timeout);
      pending = null;
    });
  return pending;
}
