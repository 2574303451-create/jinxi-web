"use client";

import { useEffect, useRef, type ImgHTMLAttributes } from "react";

function showFallback(image: HTMLImageElement) {
  if (image.getAttribute("src") !== "/logo.png") {
    image.src = "/logo.png";
  }
}

export function GuildImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    // A server-rendered image may fail before React attaches its error listener.
    if (image?.complete && image.naturalWidth === 0) showFallback(image);
  }, [props.src]);

  return (
    <img
      {...props}
      ref={imageRef}
      onError={(event) => showFallback(event.currentTarget)}
    />
  );
}
