"use client";

import {
  Children,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";

export default function MobileHomeStatsCarousel({
  children,
}: {
  children: ReactNode;
}) {
  const items = useMemo(
    () =>
      Children.toArray(
        children
      ),
    [children]
  );

  const [
    index,
    setIndex,
  ] = useState(0);

  const touchStartX =
    useRef<number | null>(
      null
    );

  if (
    items.length === 0
  ) {
    return null;
  }

  function move(
    direction:
      | -1
      | 1
  ) {
    setIndex(
      (current) =>
        (current +
          direction +
          items.length) %
        items.length
    );
  }

  return (
    <div className="taste-home-mobile-stats-carousel">
      <button
        type="button"
        className="taste-home-mobile-stats-arrow"
        aria-label="Předchozí statistika"
        onClick={() =>
          move(-1)
        }
      >
        ‹
      </button>

      <div
        className="taste-home-mobile-stats-viewport"
        onTouchStart={(
          event
        ) => {
          touchStartX.current =
            event.touches[0]
              ?.clientX ??
            null;
        }}
        onTouchEnd={(
          event
        ) => {
          const start =
            touchStartX.current;

          const end =
            event.changedTouches[0]
              ?.clientX;

          touchStartX.current =
            null;

          if (
            start == null ||
            end == null
          ) {
            return;
          }

          const delta =
            end - start;

          if (
            Math.abs(
              delta
            ) < 42
          ) {
            return;
          }

          move(
            delta < 0
              ? 1
              : -1
          );
        }}
      >
        <div
          key={
            index
          }
          className="taste-home-mobile-stats-slide"
        >
          {
            items[
              index
            ]
          }
        </div>
      </div>

      <button
        type="button"
        className="taste-home-mobile-stats-arrow"
        aria-label="Další statistika"
        onClick={() =>
          move(1)
        }
      >
        ›
      </button>

      <div className="taste-home-mobile-stats-counter">
        {index + 1} /{" "}
        {items.length}
      </div>
    </div>
  );
}
