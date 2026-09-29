"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
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

  const [
    canScrollLeft,
    setCanScrollLeft,
  ] = useState(false);

  const [
    canScrollRight,
    setCanScrollRight,
  ] = useState(false);

  function updateScrollState() {
    const track =
      trackRef.current;

    if (!track) {
      return;
    }

    const maxScroll =
      track.scrollWidth -
      track.clientWidth;

    setCanScrollLeft(
      track.scrollLeft >
        3
    );

    setCanScrollRight(
      track.scrollLeft <
        maxScroll - 3
    );
  }

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

    const firstCard =
      track.querySelector<HTMLElement>(
        ".taste-ranking-card"
      );

    const cardWidth =
      firstCard?.getBoundingClientRect()
        .width ?? 390;

    track.scrollBy({
      left:
        direction *
        (cardWidth +
          16),
      behavior:
        "smooth",
    });
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const track =
      trackRef.current;

    if (!track) {
      return;
    }

    updateScrollState();

    const observer =
      new ResizeObserver(
        updateScrollState
      );

    observer.observe(
      track
    );

    track.addEventListener(
      "scroll",
      updateScrollState,
      {
        passive: true,
      }
    );

    return () => {
      observer.disconnect();
      track.removeEventListener(
        "scroll",
        updateScrollState
      );
    };
  }, [enabled]);

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
        disabled={
          !canScrollLeft
        }
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
        disabled={
          !canScrollRight
        }
        onClick={() =>
          scroll(1)
        }
      >
        ›
      </button>
    </div>
  );
}
