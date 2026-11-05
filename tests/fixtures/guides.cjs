// Only synthetic disposable-DB data. Never import into a deployed database.
const longContent = "【隔离测试正文】用于验证摘要不返回全文。".repeat(250);
const rows = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  title: `【隔离样本】攻略${i + 1}`,
  content: longContent,
  author: "隔离测试署名",
  category: i % 2 ? "PVP" : "PVE",
  difficulty: (i % 5) + 1,
  tags: ["隔离数据"],
  likes: ["fixture-private-like-id"],
  favorites: ["fixture-private-favorite-id"],
  comments: [
    {
      id: "fixture-comment",
      userId: "fixture-private-author",
      userName: "隔离评论署名",
      timestamp: "2026-10-01T00:00:00Z",
      content: "不应出现在摘要的评论全文",
    },
  ],
  is_pinned: i === 0 || i === 2,
  image_url: null,
  media_files: [],
  view_count: i,
  status: "published",
  created_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
}));
rows[0].media_files = [
  { type: "video", url: "/guides-media/one.mp4" },
  {
    type: "video",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
];
rows[0].image_url = "/bg.png";
rows[1].media_files = [
  null,
  42,
  "video",
  { type: "video", url: "/guides-media/one.mp4" },
  { type: "image", url: "/14.png" },
  { type: "video", url: "" },
  { type: "video", url: "javascript:alert(1)" },
  { type: "video", url: "ftp://example.com/a.mp4" },
  { type: "video", url: { invalid: true } },
];
rows[1].image_url = "javascript:alert(1)";
rows[2].media_files = { type: "video", url: "/guides-media/invalid-top.mp4" };
rows[3].media_files = null; // JSONB null, distinct from SQL NULL seeded separately.
rows[4].media_files = undefined;
rows[5].media_files = "not-an-array";
rows[6].media_files = 12;
rows[7].media_files = [
  null,
  1,
  "x",
  true,
  [],
  { type: "image", url: "/13.png" },
];
rows[10].media_files = [
  { type: "video", url: "/guides-media/中文.mp4" },
  ...[
    "/1.mp4",
    "/2.mp4?x=1",
    "https://jinxi-web.netlify.app/1.mp4",
    "/%31.mp4",
    "/../1.mp4",
    "//example.com/a.mp4",
    "https://user:secret@example.com/a.mp4",
    "https://example.com/a b.mp4",
    "   ",
  ].map((url) => ({ type: "video", url })),
];
rows[12].image_url = "/__missing_isolated_cover__.png";
rows[13].image_url = "/bg.png";
rows.push(
  ...["draft", "archived"].map((status, i) => ({
    ...rows[0],
    id: 90 + i,
    status,
    title: `PRIVATE-${status}-MUST-NOT-APPEAR`,
    created_at: "2026-11-05T00:00:00Z",
  })),
);
module.exports = {
  rows,
  expectedVideoEntries: 4,
  latestIDs: ["14", "13", "12"],
  videoIDs: ["11", "2", "1"],
  pinnedIDs: ["3", "1"],
};
