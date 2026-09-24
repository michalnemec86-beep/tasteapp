"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import CatalogConfirmButton from "./CatalogConfirmButton";
import ReferenceWarning from "@/components/ui/ReferenceWarning";

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
  isCatalog: boolean;
  hops: Array<{ id: number; name: string }>;
  totalQuantity: number;
  myQuantity: number;
  referenceReady: boolean;
  referenceMissing: string[];
};

type FilterMode = "all" | "tasted" | "mine";
type SortMode = "default" | "alpha" | "most" | "least" | "country";

const PAGE_SIZE = 60;

function initial(name: string) {
  const first = name.trim().charAt(0).toLocaleUpperCase("cs");
  const normalized = first.normalize("NFD").replace(/\p{M}/gu, "");

  return /^[A-Z]$/.test(normalized) ? normalized : "#";
}

export default function BeerCatalogClient({
  beers,
  isCatalogAdmin,
  adminView,
  confirmAction,
}: {
  beers: BeerCatalogItem[];
  isCatalogAdmin: boolean;
  adminView: boolean;
  confirmAction: (beerId: number) => Promise<{ success: boolean }>;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [letter, setLetter] = useState("");
  const [showLetters, setShowLetters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const letters = useMemo(
    () =>
      Array.from(new Set(beers.map((beer) => initial(beer.name)))).sort(
        (a, b) => {
          if (a === "#") return 1;
          if (b === "#") return -1;
          return a.localeCompare(b, "cs");
        }
      ),
    [beers]
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          beers
            .map((beer) => beer.brewery?.country)
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "cs", { sensitivity: "base" })),
    [beers]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("cs");

    return beers
      .filter((beer) => {
        if (filter === "tasted" && beer.totalQuantity === 0) return false;
        if (filter === "mine" && beer.myQuantity === 0) return false;
        if (country && beer.brewery?.country !== country) return false;
        if (letter && initial(beer.name) !== letter) return false;

        if (!needle) return true;

        return [
          beer.name,
          beer.brand?.name,
          beer.brewery?.name,
          beer.brewery?.country,
          beer.style?.name,
          ...beer.hops.map((hop) => hop.name),
        ].some((value) => value?.toLocaleLowerCase("cs").includes(needle));
      })
      .sort((a, b) => {
        const aCount = filter === "mine" ? a.myQuantity : a.totalQuantity;
        const bCount = filter === "mine" ? b.myQuantity : b.totalQuantity;

        if (sort === "most") {
          return bCount - aCount || a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
        }

        if (sort === "least") {
          return aCount - bCount || a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
        }

        if (sort === "country") {
          return (
            (a.brewery?.country ?? "").localeCompare(b.brewery?.country ?? "", "cs", {
              sensitivity: "base",
            }) ||
            a.name.localeCompare(b.name, "cs", { sensitivity: "base" })
          );
        }

        if (sort === "alpha") {
          return a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
        }

        return (
          Number(b.isCatalog) - Number(a.isCatalog) ||
          a.name.localeCompare(b.name, "cs", { sensitivity: "base" })
        );
      });
  }, [beers, country, filter, letter, search, sort]);

  function selectFilter(next: FilterMode) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  function selectSort(next: SortMode) {
    setSort(next);
    setVisibleCount(PAGE_SIZE);

    if (next !== "country") {
      setCountry("");
      setShowCountries(false);
    }

    if (next !== "alpha") {
      setLetter("");
      setShowLetters(false);
    }
  }

  return (
    <section>
      <div className="taste-tasting-sort" aria-label="Filtrování pivního lístku">
        <div role="group" aria-label="Rozsah piv" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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

        <div className="taste-tasting-search">
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
          {search && (
            <button
              type="button"
              className="taste-button-secondary"
              onClick={() => {
                setSearch("");
                setVisibleCount(PAGE_SIZE);
              }}
            >
              Zrušit
            </button>
          )}
        </div>

        <div className="taste-tasting-sort-buttons">
          <button
            type="button"
            className="taste-button-secondary"
            aria-expanded={showLetters}
            aria-pressed={sort === "alpha" || Boolean(letter)}
            onClick={() => {
              const nextVisible = !showLetters;
              setShowLetters(nextVisible);
              setVisibleCount(PAGE_SIZE);

              if (nextVisible) {
                setSort("alpha");
                setCountry("");
                setShowCountries(false);
              }
            }}
          >
            Abecedně
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={sort === "most"}
            onClick={() => selectSort("most")}
          >
            Nejvíce
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={sort === "least"}
            onClick={() => selectSort("least")}
          >
            Nejméně
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-expanded={showCountries}
            aria-pressed={sort === "country" || Boolean(country)}
            onClick={() => {
              const nextVisible = !showCountries;
              setShowCountries(nextVisible);
              setVisibleCount(PAGE_SIZE);

              if (nextVisible) {
                setSort("country");
                setLetter("");
                setShowLetters(false);
              }
            }}
          >
            Podle států
          </button>
        </div>

        {showLetters && (
          <div className="taste-tasting-letters" aria-label="Vybrat počáteční písmeno piva">
            <button
              type="button"
              className="taste-button-secondary"
              aria-pressed={!letter}
              onClick={() => {
                setLetter("");
                setVisibleCount(PAGE_SIZE);
              }}
            >
              Všechna
            </button>

            {letters.map((item) => (
              <button
                key={item}
                type="button"
                className="taste-button-secondary"
                aria-pressed={letter === item}
                onClick={() => {
                  setLetter(item);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {showCountries && (
          <label className="taste-tasting-country-select">
            <span>Stát</span>
            <select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <option value="">Všechny státy</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Link href={`/beers/${beer.id}`} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "18px", lineHeight: 1.15, fontWeight: 850 }}>
                      {beer.name}
                    </Link>
                    {adminView && !beer.referenceReady && <ReferenceWarning missing={beer.referenceMissing} />}
                  </div>
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

              {isCatalogAdmin && adminView && !beer.isCatalog && (
                <div style={{ marginTop: "10px" }}>
                  <CatalogConfirmButton beerId={beer.id} isCatalog={beer.isCatalog} confirmAction={confirmAction} />
                </div>
              )}
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
