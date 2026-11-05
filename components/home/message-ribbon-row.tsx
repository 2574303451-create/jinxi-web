"use client";

import { useEffect, useRef, useState } from "react";
import { RibbonCard, type PublicMessageSummary } from "./ribbon-card";
import { RIBBON_SPEED, useRibbonMotion } from "./use-ribbon-motion";

export function MessageRibbonRow({
  items,
  direction,
  paused,
  reduced,
  allowLoop,
  rowIndex,
  onLoopChange,
  onPause,
  onOpen,
}: {
  items: PublicMessageSummary[];
  direction: "left" | "right";
  paused: boolean;
  reduced: boolean;
  allowLoop: boolean;
  onPause: () => void;
  onOpen: (id: string) => void;
  rowIndex: number;
  onLoopChange: (index: number, loop: boolean) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null),
    track = useRef<HTMLDivElement>(null),
    group = useRef<HTMLUListElement>(null);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const { running, loop, distance } = useRibbonMotion(viewport, track, group, {
    direction,
    paused,
    reduced,
    hovered,
    focused,
    allowLoop,
  });
  useEffect(() => onLoopChange(rowIndex, loop), [rowIndex, loop, onLoopChange]);
  const open = (id: string) => {
    const original = Array.from(
      viewport.current?.querySelectorAll<HTMLButtonElement>(
        "[data-public-message]",
      ) || [],
    ).find((button) => button.dataset.publicMessage === id);
    original?.focus({ preventScroll: true });
    onOpen(id);
  };
  return (
    <div
      ref={viewport}
      className="message-ribbon"
      role="region"
      tabIndex={0}
      aria-label={`${direction === "left" ? "上行" : "下行"}公开留言，可左右浏览`}
      data-running={running}
      data-loop={loop}
      data-direction={direction}
      data-speed={RIBBON_SPEED}
      data-distance={distance}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onTouchStart={onPause}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") onPause();
      }}
      onWheel={(event) => {
        if (event.deltaX || event.shiftKey) onPause();
      }}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        onPause();
        // Wait for the running transform to become a native scroll position before moving.
        queueMicrotask(() =>
          viewport.current?.scrollBy({
            left: event.key === "ArrowLeft" ? -300 : 300,
            behavior: "instant",
          }),
        );
      }}
    >
      <div ref={track} className="message-ribbon-track">
        <ul ref={group} className="message-ribbon-group">
          {items.map((item) => (
            <RibbonCard
              key={item.id}
              item={item}
              duplicate={false}
              onOpen={open}
            />
          ))}
        </ul>
        {loop && (
          <ul className="message-ribbon-group" aria-hidden="true">
            {items.map((item) => (
              <RibbonCard key={item.id} item={item} duplicate onOpen={open} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
