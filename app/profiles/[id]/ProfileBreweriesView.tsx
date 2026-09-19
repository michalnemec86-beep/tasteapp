"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ProfileBreweryItem = {
  id: number | string;
  name: string;
  count: number;
  country: string | null;
};

type BrewerySort = "alpha" | "most" | "least" | "country";

export default function ProfileBreweriesView({
  items,
}: {
  items: ProfileBreweryItem[];
}) {
  const [sort, setSort] = useState<BrewerySort>("most");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [showCountries, setShowCountries] = useState(false);

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.country)
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "cs")),
    [items]
  );

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("cs");

    return items
      .filter((item) => {
        if (country && item.country !== country) return false;
        if (!needle) return true;

        return [item.name, item.country].some((value) =>
          value?.toLocaleLowerCase("cs").includes(needle)
        );
      })
      .sort((a, b) => {
        if (sort === "alpha") {
          return a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
        }

        if (sort === "least") {
          return a.count - b.count || a.name.localeCompare(b.name, "cs");
        }

        if (sort === "country") {
          return (
            (a.country ?? "").localeCompare(b.country ?? "", "cs", {
              sensitivity: "base",
            }) || a.name.localeCompare(b.name, "cs", { sensitivity: "base" })
          );
        }

        return b.count - a.count || a.name.localeCompare(b.name, "cs");
      });
  }, [country, items, query, sort]);

  function selectSort(nextSort: BrewerySort) {
    setSort(nextSort);
    if (nextSort !== "country") {
      setCountry("");
      setShowCountries(false);
    }
  }

  return (
    <section style={{ marginBottom: "38px" }}>
      <div style={{ marginBottom: "14px" }}>
        <div className="taste-label" style={{ marginBottom: "5px" }}>
          Pivovarská evidence
        </div>
        <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.025em" }}>
          Moje pivovary
        </h2>
      </div>

      <div className="taste-tasting-sort" aria-label="Filtrování pivovarů">
        <div className="taste-tasting-search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hledat pivovar nebo zemi"
            aria-label="Hledat v mých pivovarech"
          />
          {query && (
            <button
              type="button"
              className="taste-button-secondary"
              onClick={() => setQuery("")}
            >
              Zrušit
            </button>
          )}
        </div>

        <div className="taste-tasting-sort-buttons">
          {([
            ["alpha", "Abecedně"],
            ["most", "Nejvíce"],
            ["least", "Nejméně"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="taste-button-secondary"
              aria-pressed={sort === key && !country}
              onClick={() => selectSort(key)}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            className="taste-button-secondary"
            aria-expanded={showCountries}
            aria-pressed={sort === "country" || Boolean(country)}
            onClick={() => {
              const nextVisible = !showCountries;
              setShowCountries(nextVisible);
              if (nextVisible) setSort("country");
            }}
          >
            Podle států
          </button>
        </div>

        {showCountries && (
          <label className="taste-tasting-country-select">
            <span>Stát</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
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

      <div style={{ marginBottom: "12px", color: "var(--taste-text-muted)", fontSize: "11px" }}>
        {visibleItems.length} {visibleItems.length === 1 ? "pivovar" : "pivovarů"}
      </div>

      {visibleItems.length > 0 ? (
        <div className="taste-profile-brewery-grid">
          {visibleItems.map((item) => (
            <article key={item.id} className="taste-card taste-profile-brewery-item">
              <div style={{ minWidth: 0 }}>
                <Link
                  href={`/breweries/${item.id}`}
                  className="taste-entity-link"
                  style={{ color: "var(--taste-text)", fontSize: "16px", fontWeight: 850 }}
                >
                  {item.name}
                </Link>
                <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px" }}>
                  {item.country ?? "Země neuvedena"}
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <strong style={{ color: "var(--taste-amber-bright)", fontSize: "20px" }}>
                  {item.count}×
                </strong>
                <div style={{ marginTop: "2px", color: "var(--taste-text-muted)", fontSize: "9px" }}>
                  v deníku
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="taste-card" style={{ padding: "32px", textAlign: "center", color: "var(--taste-text-muted)", fontSize: "12px" }}>
          Tomuto výběru neodpovídá žádný pivovar.
        </div>
      )}
    </section>
  );
}
