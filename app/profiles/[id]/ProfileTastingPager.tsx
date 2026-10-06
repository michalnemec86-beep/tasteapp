"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type ProfileTastingPagerProps = {
  currentPage: number;
  pageCount: number;
};

export default function ProfileTastingPager({
  currentPage,
  pageCount,
}: ProfileTastingPagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  if (pageCount <= 1) {
    return null;
  }

  function goToPage(
    nextPage: number
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set(
      "view",
      "beers"
    );

    if (nextPage <= 1) {
      params.delete(
        "page"
      );
    } else {
      params.set(
        "page",
        String(nextPage)
      );
    }

    router.replace(
      `${pathname}?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }

  return (
    <div
      aria-label="Stránkování ochutnávek"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        gap: "10px",
        marginTop: "18px",
      }}
    >
      <button
        type="button"
        className="taste-button-secondary"
        disabled={
          currentPage <= 1
        }
        onClick={() =>
          goToPage(
            currentPage - 1
          )
        }
        style={{
          opacity:
            currentPage <= 1
              ? 0.4
              : 1,
        }}
      >
        ← Předchozí
      </button>

      <span
        style={{
          color:
            "var(--taste-text-muted)",
          fontSize: "11px",
          minWidth: "70px",
          textAlign:
            "center",
        }}
      >
        {currentPage} / {pageCount}
      </span>

      <button
        type="button"
        className="taste-button-secondary"
        disabled={
          currentPage >=
          pageCount
        }
        onClick={() =>
          goToPage(
            currentPage + 1
          )
        }
        style={{
          opacity:
            currentPage >=
            pageCount
              ? 0.4
              : 1,
        }}
      >
        Další →
      </button>
    </div>
  );
}
