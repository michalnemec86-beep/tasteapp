"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

import TasteLoader from "@/components/ui/TasteLoader";

export default function NavigationFeedback() {
  const pathname =
    usePathname();
  const searchParams =
    useSearchParams();

  const [
    active,
    setActive,
  ] = useState(false);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  function start() {
    setActive(true);

    if (
      timeoutRef.current
    ) {
      clearTimeout(
        timeoutRef.current
      );
    }

    timeoutRef.current =
      setTimeout(() => {
        setActive(false);
        timeoutRef.current =
          null;
      }, 8000);
  }

  useEffect(() => {
    setActive(false);

    if (
      timeoutRef.current
    ) {
      clearTimeout(
        timeoutRef.current
      );
      timeoutRef.current =
        null;
    }
  }, [
    pathname,
    searchParams,
  ]);

  useEffect(() => {
    function handleClick(
      event: MouseEvent
    ) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const anchor =
        target.closest(
          "a[href]"
        ) as HTMLAnchorElement | null;

      if (
        !anchor ||
        anchor.target ===
          "_blank" ||
        anchor.hasAttribute(
          "download"
        )
      ) {
        return;
      }

      const next =
        new URL(
          anchor.href,
          window.location.href
        );

      if (
        next.origin !==
          window.location.origin
      ) {
        return;
      }

      const current =
        new URL(
          window.location.href
        );

      if (
        next.pathname ===
          current.pathname &&
        next.search ===
          current.search &&
        next.hash
      ) {
        return;
      }

      if (
        next.pathname ===
          current.pathname &&
        next.search ===
          current.search
      ) {
        return;
      }

      start();
    }

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, []);

  if (!active) {
    return null;
  }

  return (
    <div
      className="taste-navigation-feedback"
      role="status"
      aria-live="polite"
      aria-label="Načítám stránku"
    >
      <TasteLoader
        label="Načítám"
        compact
      />
    </div>
  );
}
