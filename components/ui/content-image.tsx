"use client";

import { useEffect, useRef, useState } from "react";

export function ContentImage({
  src,
  alt,
  fallback = "notice",
  loading = "lazy",
}: {
  src: string;
  alt: string;
  fallback?: "brand" | "notice";
  loading?: "lazy" | "eager";
}) {
  const image = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [source, setSource] = useState(src);
  useEffect(() => {
    setSource(src);
    setState("loading");
  }, [src]);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth > 0)
      setState("ready");
    else if (image.current?.complete) fail();
  }, [source]);
  function fail() {
    if (fallback === "brand" && source !== "/logo.png") {
      setSource("/logo.png");
      setState("loading");
    } else setState("error");
  }
  return (
    <span
      className={`content-image ${source === "/logo.png" ? "is-fallback" : ""}`}
      data-state={state}
    >
      {state !== "error" && (
        <img
          ref={image}
          src={source || "/logo.png"}
          alt={alt}
          loading={loading}
          onLoad={() => setState("ready")}
          onError={fail}
        />
      )}
      {state === "loading" && (
        <span className="image-status" role="status">
          图片加载中…
        </span>
      )}
      {state === "error" && (
        <span className="image-status" role="status">
          图片暂不可用
        </span>
      )}
      {state === "ready" && source === "/logo.png" && (
        <span className="image-fallback-note">原图暂不可用 · 今夕公会</span>
      )}
    </span>
  );
}
