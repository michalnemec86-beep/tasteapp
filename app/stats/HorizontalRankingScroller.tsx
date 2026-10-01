"use client";

import {
  type ReactNode,
  useRef,
} from "react";

export default function HorizontalRankingScroller({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const trackRef =
    useRef<HTMLDivElement>(null);

  function scroll(
    direction:
      | -1
      | 1
  ) {
    const track =
      trackRef.current;

    if (!track) {
      return;
    }

    const maxScroll =
      track.scrollWidth -
      track.clientWidth;

    const firstCard =
      track.querySelector<HTMLElement>(
        ".taste-ranking-card"
      );

    const cardWidth =
      firstCard?.getBoundingClientRect()
        .width ?? 390;

    const gap =
      Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = cardWidth + gap;

    const atStart =
      track.scrollLeft <= 4;

    const atEnd =
      track.scrollLeft >=
      maxScroll - 4;

    if (
      direction === -1 &&
      atStart
    ) {
      track.scrollTo({
        left:
          maxScroll,
        behavior:
          "smooth",
      });
      return;
    }

    if (
      direction === 1 &&
      atEnd
    ) {
      track.scrollTo({
        left: 0,
        behavior:
          "smooth",
      });
      return;
    }

    track.scrollBy({
      left:
        direction *
        step,
      behavior:
        "smooth",
    });
  }

  if (!enabled) {
    return (
      <div className="taste-stats-ranking-grid taste-stats-ranking-grid-single">
        {children}
      </div>
    );
  }

  return (
    <div className="taste-ranking-scroller">
      <button
        type="button"
        className="taste-ranking-scroll-button taste-ranking-scroll-button-left"
        aria-label="Posunout žebříčky doleva"
        onClick={() =>
          scroll(-1)
        }
      >
        ‹
      </button>

      <div
        ref={
          trackRef
        }
        className="taste-stats-ranking-grid taste-ranking-scroll-track"
      >
        {children}
      </div>

      <button
        type="button"
        className="taste-ranking-scroll-button taste-ranking-scroll-button-right"
        aria-label="Posunout žebříčky doprava"
        onClick={() =>
          scroll(1)
        }
      >
        ›
      </button>
    </div>
  );
}
