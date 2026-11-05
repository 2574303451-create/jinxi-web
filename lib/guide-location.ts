import { STRATEGY_CONFIG, type StrategyCategory } from "../types/strategy-wall";

export type GuideLocation = {
  q: string;
  category: StrategyCategory | "";
  difficulty: string;
  sort: "created_at" | "view_count" | "likes";
  page: number;
  id: string | null;
};
export function parseGuideLocation(search: string): GuideLocation {
  const params = new URLSearchParams(search),
    category = params.get("category") || "",
    sort = params.get("sort") || "created_at";
  const rawPage = params.get("page") || "1";
  return {
    q: (params.get("q") || "").trim().slice(0, 200),
    category: STRATEGY_CONFIG.CATEGORIES.some((c) => c.key === category)
      ? (category as StrategyCategory)
      : "",
    difficulty: /^[1-5]$/.test(params.get("difficulty") || "")
      ? params.get("difficulty")!
      : "",
    sort: ["created_at", "view_count", "likes"].includes(sort)
      ? (sort as GuideLocation["sort"])
      : "created_at",
    page: /^\d+$/.test(rawPage)
      ? Math.min(8334, Math.max(1, Number(rawPage)))
      : 1,
    id: params.get("id"),
  };
}
export function guideHref(
  route: GuideLocation,
  patch: Partial<GuideLocation> = {},
) {
  const next = { ...route, ...patch },
    params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.difficulty) params.set("difficulty", next.difficulty);
  if (next.sort !== "created_at") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.id !== null) params.set("id", next.id);
  return "/guides/" + (params.size ? "?" + params : "");
}
