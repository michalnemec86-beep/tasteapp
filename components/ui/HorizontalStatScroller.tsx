"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export default function HorizontalStatScroller({
  children,
}: {
  children: ReactNode;
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

    const amount =
      Math.max(
        190,
        Math.round(
          track.clientWidth *
            0.72
        )
      );

    track.scrollBy({
      left:
        amount *
        direction,
      behavior:
        "smooth",
    });
  }

  useEffect(() => {
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
  }, []);

  return (
    <div className="taste-hero-stat-scroller">
      <button
        type="button"
        className="taste-hero-stat-scroll-button taste-hero-stat-scroll-button-left"
        aria-label="Posunout statistiky doleva"
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
        className="taste-hero-stat-scroll-track"
      >
        {children}
      </div>

      <button
        type="button"
        className="taste-hero-stat-scroll-button taste-hero-stat-scroll-button-right"
        aria-label="Posunout statistiky doprava"
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
