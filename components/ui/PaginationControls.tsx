"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function pageList(currentPage: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, null, totalPages];
  if (currentPage >= totalPages - 3) return [1, null, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
}

export default function PaginationControls({ currentPage, totalPages, queryParam = "page" }: { currentPage: number; totalPages: number; queryParam?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;
  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(queryParam); else params.set(queryParam, String(page));
    const query = params.toString();
    router.replace(query ? pathname + "?" + query : pathname, { scroll: false });
  }
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "14px" }}>
      <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className="taste-button-secondary" style={{ height: "34px", padding: "0 11px", fontSize: "10px", opacity: currentPage <= 1 ? 0.45 : 1 }}>← Předchozí</button>
      {pageList(currentPage, totalPages).map((page, index) => page == null ? (
        <span key={"ellipsis-" + index} style={{ padding: "0 3px", color: "var(--taste-text-muted)", fontSize: "11px" }}>…</span>
      ) : (
        <button key={page} type="button" onClick={() => goToPage(page)} aria-current={page === currentPage ? "page" : undefined} style={{ width: "34px", height: "34px", border: page === currentPage ? "1px solid var(--taste-amber-bright)" : "1px solid var(--taste-border)", borderRadius: "9px", background: page === currentPage ? "rgba(231,166,47,0.12)" : "var(--taste-surface)", color: page === currentPage ? "var(--taste-amber-bright)" : "var(--taste-text-soft)", fontSize: "11px", fontWeight: page === currentPage ? 750 : 600, cursor: "pointer" }}>{page}</button>
      ))}
      <button type="button" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} className="taste-button-secondary" style={{ height: "34px", padding: "0 11px", fontSize: "10px", opacity: currentPage >= totalPages ? 0.45 : 1 }}>Další →</button>
    </div>
  );
}
