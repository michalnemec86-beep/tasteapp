"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export type BeerCatalogItem = {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
  brewery: { id: number; name: string; country: string | null } | null;
  style: { id: number; name: string } | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  isNonAlcoholic: boolean;
  hops: Array<{ id: number; name: string }>;
  totalQuantity: number;
  myQuantity: number;
};

type FilterMode = "all" | "tasted" | "mine";

const PAGE_SIZE = 60;

export default function BeerCatalogClient({ beers }: { beers: BeerCatalogItem[] }) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("cs");

    return beers.filter((beer) => {
      if (filter === "tasted" && beer.totalQuantity === 0) return false;
      if (filter === "mine" && beer.myQuantity === 0) return false;
      if (!needle) return true;

      return [
        beer.name,
        beer.brand?.name,
        beer.brewery?.name,
        beer.brewery?.country,
        beer.style?.name,
        ...beer.hops.map((hop) => hop.name),
      ].some((value) => value?.toLocaleLowerCase("cs").includes(needle));
    });
  }, [beers, filter, search]);

  function selectFilter(next: FilterMode) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section>
      <div className="taste-beer-catalog-controls">
        <div role="group" aria-label="Filtr piv" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {([[
            "all", "Všechna piva",
          ], [
            "tasted", "Ochutnaná piva",
          ], [
            "mine", "Moje piva",
          ]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectFilter(key)}
              aria-pressed={filter === key}
              className="taste-button-secondary"
              style={{
                borderColor: filter === key ? "rgba(245,184,63,0.55)" : undefined,
                background: filter === key ? "rgba(231,166,47,0.14)" : undefined,
                color: filter === key ? "var(--taste-amber-bright)" : undefined,
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Hledat pivo, značku nebo pivovar"
          aria-label="Hledat v pivním lístku"
        />
      </div>

      <div style={{ marginBottom: "12px", color: "var(--taste-text-muted)", fontSize: "12px" }}>
        {filtered.length} {filtered.length === 1 ? "pivo" : "piv"}
      </div>

      {filtered.length === 0 ? (
        <div className="taste-card" style={{ padding: "32px", textAlign: "center", color: "var(--taste-text-muted)" }}>
          Tomuto výběru neodpovídá žádné pivo.
        </div>
      ) : (
        <div className="taste-beer-catalog-grid">
          {filtered.slice(0, visibleCount).map((beer) => (
            <article
              key={beer.id}
              className="taste-card taste-beer-catalog-card"
              style={{
                padding: "17px",
                border: beer.myQuantity > 0
                  ? "1px solid rgba(156,173,71,0.42)"
                  : "1px solid var(--taste-border)",
                background: beer.myQuantity > 0
                  ? "linear-gradient(145deg, rgba(156,173,71,0.08), transparent 62%), var(--taste-surface)"
                  : "var(--taste-surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/beers/${beer.id}`} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "18px", lineHeight: 1.15, fontWeight: 850 }}>
                    {beer.name}
                  </Link>
                  {beer.brand && (
                    <div style={{ marginTop: "5px", fontSize: "11px" }}>
                      <Link href={`/brands/${beer.brand.id}`} className="taste-entity-link">{beer.brand.name}</Link>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <strong style={{ color: "var(--taste-amber-bright)", fontSize: "19px" }}>{beer.totalQuantity}</strong>
                  <div style={{ color: "var(--taste-text-muted)", fontSize: "9px" }}>vypito</div>
                  {beer.myQuantity > 0 && <div style={{ marginTop: "3px", color: "var(--taste-green)", fontSize: "9px", fontWeight: 800 }}>Ty: {beer.myQuantity}×</div>}
                </div>
              </div>

              <div style={{ marginTop: "12px", color: "var(--taste-text-soft)", fontSize: "11px", lineHeight: 1.5 }}>
                {beer.brewery ? (
                  <Link href={`/breweries/${beer.brewery.id}`} className="taste-entity-link">{beer.brewery.name}</Link>
                ) : "Neznámý pivovar"}
                {beer.brewery?.country ? ` · ${beer.brewery.country}` : ""}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                {beer.style && <InfoChip>{beer.style.name}</InfoChip>}
                {beer.plato != null && <InfoChip>{beer.plato} °P</InfoChip>}
                {beer.abv != null && <InfoChip>{beer.abv} %</InfoChip>}
                {beer.ibu != null && <InfoChip>IBU {beer.ibu}</InfoChip>}
                {beer.isNonAlcoholic && <InfoChip>Nealkoholické</InfoChip>}
              </div>

              {beer.hops.length > 0 && (
                <div style={{ marginTop: "11px", color: "var(--taste-text-muted)", fontSize: "10px", lineHeight: 1.45 }}>
                  Chmely: {beer.hops.map((hop) => hop.name).join(", ")}
                </div>
              )}

              <Link
                href={`/tastings/new?beer=${beer.id}`}
                className="taste-button-secondary"
                style={{
                  display: "inline-flex",
                  marginTop: "13px",
                  padding: "7px 10px",
                  fontSize: "10px",
                  fontWeight: 750,
                }}
              >
                + Zapsat ochutnávku
              </Link>
            </article>
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="taste-button-secondary"
          style={{ display: "block", margin: "20px auto 0", cursor: "pointer", fontSize: "12px", fontWeight: 750 }}
        >
          Zobrazit další piva
        </button>
      )}
    </section>
  );
}

function InfoChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        padding: "5px 8px",
        border: "1px solid rgba(231,166,47,0.18)",
        borderRadius: "999px",
        background: "rgba(231,166,47,0.055)",
        color: "var(--taste-text-soft)",
        fontSize: "10px",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}
