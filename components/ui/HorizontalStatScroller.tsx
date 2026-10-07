"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export default function HorizontalStatScroller({
  children,
  loop = false,
}: {
  children: ReactNode;
  loop?: boolean;
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

  const [
    hasOverflow,
    setHasOverflow,
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

    const overflow =
      maxScroll > 3;

    setHasOverflow(
      overflow
    );

    setCanScrollLeft(
      overflow &&
      track.scrollLeft >
        3
    );

    setCanScrollRight(
      overflow &&
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

    const maxScroll =
      track.scrollWidth -
      track.clientWidth;

    if (
      loop &&
      direction < 0 &&
      track.scrollLeft <= 4
    ) {
      track.scrollTo({
        left: maxScroll,
        behavior: "smooth",
      });
      return;
    }

    if (
      loop &&
      direction > 0 &&
      track.scrollLeft >=
        maxScroll - 4
    ) {
      track.scrollTo({
        left: 0,
        behavior: "smooth",
      });
      return;
    }

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
          !hasOverflow ||
          (!loop &&
            !canScrollLeft)
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
        onTouchStart={(event) => {
          const track =
            trackRef.current;

          if (!loop || !track) {
            return;
          }

          track.dataset.touchStartX =
            String(
              event.touches[0]
                ?.clientX ?? 0
            );

          track.dataset.touchStartScroll =
            String(
              track.scrollLeft
            );
        }}
        onTouchEnd={(event) => {
          const track =
            trackRef.current;

          if (!loop || !track) {
            return;
          }

          const startX =
            Number(
              track.dataset
                .touchStartX ?? 0
            );

          const startScroll =
            Number(
              track.dataset
                .touchStartScroll ?? 0
            );

          delete track.dataset
            .touchStartX;

          delete track.dataset
            .touchStartScroll;

          const endX =
            event.changedTouches[0]
              ?.clientX;

          if (endX == null) {
            return;
          }

          const delta =
            endX - startX;

          if (
            Math.abs(delta) <
            42
          ) {
            return;
          }

          const maxScroll =
            track.scrollWidth -
            track.clientWidth;

          if (
            startScroll <= 4 &&
            delta > 0
          ) {
            track.scrollTo({
              left: maxScroll,
              behavior: "smooth",
            });
            return;
          }

          if (
            startScroll >=
              maxScroll - 4 &&
            delta < 0
          ) {
            track.scrollTo({
              left: 0,
              behavior: "smooth",
            });
          }
        }}
      >
        {children}
      </div>

      <button
        type="button"
        className="taste-hero-stat-scroll-button taste-hero-stat-scroll-button-right"
        aria-label="Posunout statistiky doprava"
        disabled={
          !hasOverflow ||
          (!loop &&
            !canScrollRight)
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
