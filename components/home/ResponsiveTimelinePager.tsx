"use client";

import {
  Children,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

const MOBILE_PAGE_SIZE = 5;
const DESKTOP_PAGE_SIZE = 15;

export default function ResponsiveTimelinePager({
  children,
  serverPage,
  hasOlderServerPage,
  totalEntries,
}: {
  children: ReactNode;
  serverPage: number;
  hasOlderServerPage: boolean;
  totalEntries: number;
}) {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const items = useMemo(
    () =>
      Children.toArray(
        children
      ),
    [children]
  );

  const [
    isMobile,
    setIsMobile,
  ] = useState(false);

  const [
    localPage,
    setLocalPage,
  ] = useState(0);

  useEffect(() => {
    const media =
      window.matchMedia(
        "(max-width: 760px)"
      );

    const sync = () =>
      setIsMobile(
        media.matches
      );

    sync();
    media.addEventListener(
      "change",
      sync
    );

    return () =>
      media.removeEventListener(
        "change",
        sync
      );
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setLocalPage(0);
      return;
    }

    const requestedSlice =
      Number(
        searchParams.get(
          "timelineSlice"
        ) ?? 1
      );

    const safeSlice =
      Number.isFinite(
        requestedSlice
      )
        ? Math.max(
            1,
            Math.min(
              3,
              Math.trunc(
                requestedSlice
              )
            )
          )
        : 1;

    setLocalPage(
      safeSlice - 1
    );
  }, [
    isMobile,
    searchParams,
    serverPage,
  ]);

  const pageSize =
    isMobile
      ? MOBILE_PAGE_SIZE
      : DESKTOP_PAGE_SIZE;

  const localPageCount =
    Math.max(
      1,
      Math.ceil(
        items.length /
          pageSize
      )
    );

  const safeLocalPage =
    Math.min(
      localPage,
      localPageCount - 1
    );

  const visibleItems =
    items.slice(
      safeLocalPage *
        pageSize,
      (safeLocalPage + 1) *
        pageSize
    );

  const totalPages =
    isMobile
      ? Math.max(
          1,
          Math.min(
            15,
            Math.ceil(
              totalEntries /
                MOBILE_PAGE_SIZE
            )
          )
        )
      : Math.max(
          1,
          Math.min(
            5,
            Math.ceil(
              totalEntries /
                DESKTOP_PAGE_SIZE
            )
          )
        );

  const currentPage =
    isMobile
      ? (serverPage - 1) *
          3 +
        safeLocalPage +
        1
      : serverPage;

  function goToServerPage(
    nextServerPage: number,
    mobileSlice = 1
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      nextServerPage <= 1
    ) {
      params.delete(
        "timelinePage"
      );
    } else {
      params.set(
        "timelinePage",
        String(
          nextServerPage
        )
      );
    }

    if (
      isMobile &&
      mobileSlice > 1
    ) {
      params.set(
        "timelineSlice",
        String(
          mobileSlice
        )
      );
    } else {
      params.delete(
        "timelineSlice"
      );
    }

    const query =
      params.toString();

    router.push(
      `/${query ? `?${query}` : ""}#timeline`
    );
  }

  function goNewer() {
    if (
      isMobile &&
      safeLocalPage > 0
    ) {
      setLocalPage(
        safeLocalPage - 1
      );
      return;
    }

    if (
      serverPage > 1
    ) {
      goToServerPage(
        serverPage - 1,
        isMobile ? 3 : 1
      );
    }
  }

  function goOlder() {
    if (
      isMobile &&
      safeLocalPage <
        localPageCount - 1
    ) {
      setLocalPage(
        safeLocalPage + 1
      );
      return;
    }

    if (
      hasOlderServerPage
    ) {
      goToServerPage(
        serverPage + 1,
        1
      );
    }
  }

  const canGoNewer =
    safeLocalPage > 0 ||
    serverPage > 1;

  const canGoOlder =
    safeLocalPage <
      localPageCount - 1 ||
    hasOlderServerPage;

  return (
    <>
      <div className="taste-timeline-list">
        {visibleItems}
      </div>

      <nav
        aria-label="Stránkování časové osy"
        className="taste-timeline-pagination flex items-center justify-between gap-4 pt-5"
      >
        {canGoNewer ? (
          <button
            type="button"
            className="taste-button-secondary"
            onClick={
              goNewer
            }
          >
            ← Novější příspěvky
          </button>
        ) : (
          <span />
        )}

        {items.length >
          0 && (
          <span className="taste-timeline-page">
            {Math.min(
              currentPage,
              totalPages
            )}{" "}
            / {totalPages}
          </span>
        )}

        {canGoOlder && (
          <button
            type="button"
            className="taste-button-secondary"
            onClick={
              goOlder
            }
          >
            Starší příspěvky →
          </button>
        )}
      </nav>
    </>
  );
}
