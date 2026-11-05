const fs = require("node:fs"),
  path = require("node:path");
const source = JSON.parse(
    fs.readFileSync(path.join(__dirname, "performance-results.json")),
  ),
  median = (ns) => [...ns].sort((a, b) => a - b)[Math.floor(ns.length / 2)],
  sum = (assets, type, key = "bytes") =>
    Object.values(assets)
      .filter((a) => a.type === type)
      .reduce((n, a) => n + (a[key] || 0), 0),
  summary = [];
for (const slow of [false, true])
  for (const stage of ["before", "after"]) {
    const rows = source.results.filter(
        (x) => x.stage === stage && x.slow === slow,
      ),
      first = rows[0];
    const imageTransfers = rows.map((row) => {
      const cutoff = row.initial.metrics.Timestamp,
        ids = new Set(
          row.waterfall
            .filter(
              (e) =>
                e.event === "request" && e.type === "Image" && e.time <= cutoff,
            )
            .map((e) => e.id),
        );
      return row.waterfall
        .filter(
          (e) => e.event === "complete" && ids.has(e.id) && e.time <= cutoff,
        )
        .reduce((n, e) => n + e.encodedBytes, 0);
    });
    summary.push({
      stage,
      slow,
      width: first.width,
      samples: rows.length,
      lcp: rows.map((x) => x.initial.vitals.lcp),
      lcpMedian: median(rows.map((x) => x.initial.vitals.lcp)),
      initialCls: rows.map((x) => x.initial.vitals.cls),
      afterScrollCls: rows.map((x) => x.content.vitals.cls),
      initialJs: sum(first.initial.assets, "script"),
      initialCss: sum(first.initial.assets, "stylesheet"),
      initialJsGzip: sum(first.initial.assets, "script", "gzip"),
      initialCssGzip: sum(first.initial.assets, "stylesheet", "gzip"),
      initialImageDecodedBytes: rows.map((r) => sum(r.initial.assets, "image")),
      initialImageEncodedBytes: imageTransfers,
      initialImageCounts: rows.map(
        (r) =>
          Object.values(r.initial.assets).filter((a) => a.type === "image")
            .length,
      ),
      imageEncodedMedian: median(imageTransfers),
      contentGuideApi: rows.map(
        (r) =>
          r.content.api.filter((a) => a.path.includes("strategies")).length,
      ),
      initialGuideApi: rows.map(
        (r) =>
          r.initial.api.filter((a) => a.path.includes("strategies")).length,
      ),
      fullGuideCode: Object.values(first.initial.assets).filter(
        (a) => a.type === "script" && a.fullGuideCode,
      ).length,
      errors: rows.flatMap((r) => r.errors),
    });
  }
fs.writeFileSync(
  path.join(__dirname, "performance-summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
