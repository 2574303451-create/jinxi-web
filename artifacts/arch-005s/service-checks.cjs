const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript"),
  assert = require("node:assert/strict");
function load(file, requireHook, globals = {}) {
  const mod = { exports: {} },
    source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;
  vm.runInNewContext(
    source,
    {
      module: mod,
      exports: mod.exports,
      require: requireHook,
      URL,
      Set,
      AbortController,
      Date,
      JSON,
      setTimeout,
      clearTimeout,
      ...globals,
    },
    { filename: file },
  );
  return mod.exports;
}
(async () => {
  const results = [],
    media = load("lib/guide-media-policy.ts", () => {
      throw Error("unexpected import");
    });
  let calls = 0,
    resolve;
  const service = load("services/home-guides.ts", (name) =>
    name.includes("guide-media-policy")
      ? media
      : {
          readGuideList: () => {
            calls++;
            return new Promise((r) => (resolve = r));
          },
        },
  );
  const row = {
    id: "1",
    status: "published",
    title: "公开真实DTO",
    author: "署名",
    category: "PVE",
    content: "原有正文",
    viewCount: 0,
    mediaFiles: [
      null,
      42,
      { type: "video", url: "/1.mp4" },
      { type: "video", url: "/other.mp4" },
    ],
    comments: [],
    tags: ["真实标签"],
  };
  for (const value of [
    null,
    42,
    [],
    {},
    { ...row, status: "draft" },
    { ...row, status: "archived" },
    { ...row, id: "1 OR 1=1" },
    { ...row, id: "2147483648" },
    { ...row, title: "" },
  ])
    assert.equal(service.toHomeGuide(value), null);
  results.push({
    name: "only valid published ID/title rows accepted; draft/archived/malformed rows rejected",
    passed: true,
  });
  const card = service.toHomeGuide(row);
  assert.equal(card.hasVideo, true);
  assert.equal(card.views, 0);
  assert.equal(card.comments, 0);
  assert.equal(card.excerpt, "原有正文");
  for (const bad of [null, 42, { type: "video" }, "not-json"]) {
    const normalized = service.toHomeGuide({ ...row, mediaFiles: bad });
    assert.equal(normalized.hasVideo, null);
  }
  assert.equal(service.toHomeGuide({ ...row, mediaFiles: [] }).hasVideo, false);
  assert.equal(
    service.toHomeGuide({ ...row, mediaFiles: undefined }).hasVideo,
    null,
  );
  for (const image of [
    "javascript:alert(1)",
    "data:image/svg+xml;base64,aaa",
    "blob:test",
    "https://user:password@example.org/image.jpg",
  ])
    assert.equal(service.toHomeGuide({ ...row, imageUrl: image }).image, null);
  assert.equal(
    service.toHomeGuide({ ...row, imageUrl: "/bg.png" }).image,
    "/bg.png",
  );
  results.push({
    name: "legacy media arrays and malformed structures distinguish true/false/unknown; invalid covers rejected, zero metadata preserved",
    passed: true,
  });
  const first = service.readHomeGuides(),
    second = service.readHomeGuides();
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolve({
    strategies: [
      row,
      { ...row, title: "同ID不得重复" },
      { ...row, id: "2", status: "draft" },
    ],
  });
  assert.equal((await first).length, 1);
  assert.equal((await service.readHomeGuides()).length, 1);
  assert.equal(calls, 1);
  const retry = service.readHomeGuides(true);
  assert.equal(calls, 2);
  resolve({ strategies: [] });
  assert.equal((await retry).length, 0);
  results.push({
    name: "concurrent consumers share one request, cache does not poll, duplicate ID and draft excluded, explicit force reload works",
    passed: true,
  });
  let onTimeout,
    cleared = 0;
  const timeoutService = load(
    "services/home-guides.ts",
    (name) =>
      name.includes("guide-media-policy")
        ? media
        : {
            readGuideList: (_params, signal) =>
              new Promise((_, reject) =>
                signal.addEventListener("abort", () =>
                  reject(new Error("controlled abort")),
                ),
              ),
          },
    {
      setTimeout: (fn) => {
        onTimeout = fn;
        return 1;
      },
      clearTimeout: () => cleared++,
    },
  );
  const pending = timeoutService.readHomeGuides();
  const rejected = assert.rejects(pending, /controlled abort/);
  onTimeout();
  await rejected;
  assert.equal(cleared, 1);
  results.push({
    name: "12s abort path rejects and clears owned deadline; controlled timer test, not measured network timeout",
    passed: true,
  });
  fs.writeFileSync(
    path.join(__dirname, "service-results.json"),
    JSON.stringify(
      {
        results,
        scope:
          "Actual TypeScript source transpiled in isolated VM, controlled HTTP promise/clock. Exercises projection, cache and abort logic; not a database, authentication or live API integration test.",
      },
      null,
      2,
    ),
  );
  console.log("PASS " + results.length + " projection/cache/error groups");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
