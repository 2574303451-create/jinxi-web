"use client";

import { useEffect, useState, type RefObject } from "react";

/** A component is active only while its own surface and the document are visible. */
export function useElementActivity(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const visibility = () => setPageVisible(!document.hidden);
    const hide = () => setPageVisible(false);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("pagehide", hide);
    const observer = new IntersectionObserver((entries) => {
      // Rapid scrolling/resizing can queue multiple transitions for this one target.
      // Apply the newest observation rather than leaving the surface in the first state.
      const latest = entries.reduce<IntersectionObserverEntry | undefined>(
        (previous, entry) =>
          !previous || entry.time >= previous.time ? entry : previous,
        undefined,
      );
      if (latest) setInView(latest.isIntersecting);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", visibility);
      window.removeEventListener("pagehide", hide);
    };
  }, [ref]);
  return { inView, pageVisible, active: inView && pageVisible };
}
