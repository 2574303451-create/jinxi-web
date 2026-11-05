"use client";

import { useEffect, useState, type RefObject } from "react";
import { useElementActivity } from "../../hooks/use-element-activity";

export const RIBBON_SPEED = 32;

export function useRibbonMotion(
  viewport: RefObject<HTMLDivElement>,
  track: RefObject<HTMLDivElement>,
  group: RefObject<HTMLUListElement>,
  options: {
    direction: "left" | "right";
    paused: boolean;
    focused: boolean;
    hovered: boolean;
    reduced: boolean;
    allowLoop: boolean;
  },
) {
  const { active } = useElementActivity(viewport);
  const [layout, setLayout] = useState({ distance: 0, overflows: false });
  useEffect(() => {
    const view = viewport.current,
      list = group.current,
      rail = track.current;
    if (!view || !list || !rail) return;
    const measure = () => {
      const width = list.getBoundingClientRect().width;
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 16;
      const next = {
        distance: width + gap,
        overflows: width > view.clientWidth + 1,
      };
      setLayout((previous) =>
        previous.distance === next.distance &&
        previous.overflows === next.overflows
          ? previous
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(list);
    measure();
    return () => observer.disconnect();
  }, [viewport, track, group]);
  const supported =
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function";
  const loop =
    options.allowLoop && layout.overflows && !options.reduced && supported;
  const running =
    loop && active && !options.paused && !options.focused && !options.hovered;
  useEffect(() => {
    const view = viewport.current,
      rail = track.current;
    if (
      !view ||
      !rail ||
      !running ||
      !layout.distance ||
      typeof rail.animate !== "function"
    )
      return;
    const distance = layout.distance,
      duration = (distance / RIBBON_SPEED) * 1000;
    const offset = view.scrollLeft % distance;
    const from = options.direction === "left" ? 0 : -distance;
    const to = options.direction === "left" ? -distance : 0;
    view.scrollLeft = 0;
    rail.style.willChange = "transform";
    const animation = rail.animate(
      [
        { transform: `translate3d(${from}px,0,0)` },
        { transform: `translate3d(${to}px,0,0)` },
      ],
      { duration, iterations: Infinity, easing: "linear" },
    );
    animation.id = `jinxi-ribbon-${options.direction}`;
    animation.currentTime =
      ((options.direction === "left" ? offset : distance - offset) /
        RIBBON_SPEED) *
      1000;
    return () => {
      const time = Number(animation.currentTime) || 0;
      const progress = (time % duration) / duration;
      const position =
        options.direction === "left"
          ? progress * distance
          : ((1 - progress) * distance) % distance;
      animation.cancel();
      rail.style.willChange = "";
      // Freeze at the same visual position, then let native horizontal scrolling take over.
      view.scrollLeft = position;
    };
  }, [running, layout.distance, options.direction, viewport, track]);
  useEffect(() => {
    const view = viewport.current;
    const target = document.activeElement;
    if (
      options.focused &&
      view?.contains(target) &&
      target instanceof HTMLElement &&
      target !== view
    ) {
      target.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
    }
  }, [options.focused, running, viewport]);
  return { running, loop, distance: layout.distance };
}
