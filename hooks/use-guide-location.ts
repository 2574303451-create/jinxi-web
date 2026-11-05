"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  guideHref,
  parseGuideLocation,
  type GuideLocation,
} from "../lib/guide-location";

export function useGuideLocation() {
  const [route, setRoute] = useState<GuideLocation | null>(null);
  const scroll = useRef<number | "list" | null>(null);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const read = () => {
      scroll.current = history.state?.jinxiGuideScroll ?? 0;
      setRoute(parseGuideLocation(location.search));
    };
    const initial = parseGuideLocation(location.search),
      canonical = guideHref(initial);
    if (location.pathname + location.search !== canonical)
      history.replaceState(history.state, "", canonical);
    setRoute(initial);
    window.addEventListener("popstate", read);
    return () => {
      history.scrollRestoration = previous;
      window.removeEventListener("popstate", read);
    };
  }, []);
  const navigate = useCallback(
    (patch: Partial<GuideLocation>, target: number | "list" = 0) => {
      const current = parseGuideLocation(location.search),
        next = { ...current, ...patch },
        href = guideHref(next);
      if (href === location.pathname + location.search) return;
      history.replaceState(
        { ...history.state, jinxiGuideScroll: window.scrollY },
        "",
        location.href,
      );
      history.pushState(
        { jinxiGuideScroll: target === "list" ? 0 : target },
        "",
        href,
      );
      scroll.current = target;
      setRoute(next);
    },
    [],
  );
  const restoreScroll = useCallback(() => {
    const target = scroll.current;
    if (target === null) return;
    scroll.current = null;
    window.scrollTo({
      top:
        target === "list"
          ? (document.querySelector(".guide-browser")?.getBoundingClientRect()
              .top || 0) +
            window.scrollY -
            24
          : target,
      behavior: "instant",
    });
  }, []);
  return { route, navigate, restoreScroll };
}
