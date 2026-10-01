"use client";

import {
  Children,
  type ReactNode,
  useRef,
} from "react";

export default function ProfileLoopCarousel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const trackRef =
    useRef<HTMLDivElement>(null);
  const touchStartRef =
    useRef<{
      x: number;
      scrollLeft: number;
    } | null>(null);

  const itemCount =
    Children.count(children);

  function getStep() {
    const track =
      trackRef.current;

    if (!track) {
      return 0;
    }

    const first =
      track.firstElementChild as HTMLElement | null;

    if (!first) {
      return Math.max(
        220,
        Math.round(
          track.clientWidth * 0.82
        )
      );
    }

    const styles =
      window.getComputedStyle(
        track
      );

    const gap =
      Number.parseFloat(
        styles.columnGap ||
          styles.gap ||
          "0"
      ) || 0;

    return (
      first.getBoundingClientRect()
        .width + gap
    );
  }

  function move(
    direction: -1 | 1
  ) {
    const track =
      trackRef.current;

    if (!track) {
      return;
    }

    const maxScroll =
      Math.max(
        0,
        track.scrollWidth -
          track.clientWidth
      );

    if (
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
        getStep() * direction,
      behavior: "smooth",
    });
  }

  return (
    <div
      className={[
        "taste-profile-loop-carousel",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="taste-profile-loop-carousel-arrow taste-profile-loop-carousel-arrow-left"
        aria-label="Předchozí karta"
        onClick={() => move(-1)}
      >
        ‹
      </button>

      <div
        ref={trackRef}
        className="taste-profile-loop-carousel-track"
        onTouchStart={(event) => {
          const track =
            trackRef.current;

          touchStartRef.current = {
            x:
              event.touches[0]
                ?.clientX ?? 0,
            scrollLeft:
              track?.scrollLeft ??
              0,
          };
        }}
        onTouchEnd={(event) => {
          const track =
            trackRef.current;
          const start =
            touchStartRef.current;

          touchStartRef.current =
            null;

          if (
            !track ||
            !start
          ) {
            return;
          }

          const endX =
            event.changedTouches[0]
              ?.clientX;

          if (
            endX == null
          ) {
            return;
          }

          const delta =
            endX - start.x;

          if (
            Math.abs(delta) <
            42
          ) {
            return;
          }

          const maxScroll =
            Math.max(
              0,
              track.scrollWidth -
                track.clientWidth
            );

          if (
            start.scrollLeft <=
              4 &&
            delta > 0
          ) {
            track.scrollTo({
              left: maxScroll,
              behavior:
                "smooth",
            });
            return;
          }

          if (
            start.scrollLeft >=
              maxScroll - 4 &&
            delta < 0
          ) {
            track.scrollTo({
              left: 0,
              behavior:
                "smooth",
            });
          }
        }}
      >
        {children}
      </div>

      <button
        type="button"
        className="taste-profile-loop-carousel-arrow taste-profile-loop-carousel-arrow-right"
        aria-label="Další karta"
        onClick={() => move(1)}
      >
        ›
      </button>

      {itemCount > 1 && (
        <div
          className="taste-profile-loop-carousel-hint"
          aria-hidden="true"
        >
          posun
        </div>
      )}
    </div>
  );
}
