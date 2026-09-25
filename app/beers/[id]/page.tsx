import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageHero from "@/components/ui/PageHero";
import ReferenceWarning from "@/components/ui/ReferenceWarning";
import { isAdminView } from "@/lib/adminView";
import { createClient } from "@/lib/supabase/server";
import { getBeerReferenceStatus } from "@/lib/referenceStatus";
import {
  beerPortfolioStatusLabel,
  isHistoricalBeerPortfolioStatus,
} from "@/lib/beerPortfolio";

type Props = { params: Promise<{ id: string }> };
type Relation<T> = T | T[] | null;

type BreweryRef = {
  id: number;
  name: string;
  country: string | null;
  closed_year: number | null;
};

type StyleRef = {
  id: number;
  name: string;
};

type HopRef = {
  id: number;
  name: string;
};

type Version = {
  id: number;
  version_year: number | null;
  valid_from: string | null;
  valid_to: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  is_current: boolean;
  breweries: BreweryRef | null;
  beer_styles: StyleRef | null;
  beer_version_hops: Array<{
    hops: HopRef | null;
  }>;
  beer_version_collaborators: Array<{
    display_order: number;
    breweries: BreweryRef | null;
  }>;
};

type HistoricalDifference = {
  brewery: BreweryRef | null;
  style: StyleRef | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  collaboratorNames: string[] | null;
};

type HistoricalGroup = {
  key: string;
  years: number[];
  hasUndatedVersion: boolean;
  differences: HistoricalDifference;
};

function one<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function sameNumber(a: number | null, b: number | null) {
  return a != null && b != null && Number(a) === Number(b);
}

function normalizedNames(names: string[]) {
  return [...names]
    .map((name) => name.trim().toLocaleLowerCase("cs"))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "cs"));
}

function sameNameSet(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return false;
  const left = normalizedNames(a);
  const right = normalizedNames(b);
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function formatYears(years: number[], hasUndatedVersion: boolean) {
  const sorted = [...years].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return "Dříve";
  }

  if (sorted.length === 1) {
    return hasUndatedVersion ? `${sorted[0]} a dříve` : String(sorted[0]);
  }

  const consecutive = sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1);
  const label = consecutive
    ? `${sorted[0]}–${sorted[sorted.length - 1]}`
    : sorted.join(", ");

  return hasUndatedVersion ? `${label} a dříve` : label;
}

export default async function BeerDetailPage({ params }: Props) {
  const { id } = await params;
  const beerId = Number(id);
  if (!Number.isInteger(beerId) || beerId < 1) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const adminView = await isAdminView(user.id);

  const { data: rawBeer, error } = await supabase
    .from("beers")
    .select(`
      id, name, plato, abv, ibu, is_non_alcoholic, is_catalog, portfolio_status,
      brands ( id, name ),
      breweries ( id, name, country, closed_year ),
      beer_styles ( id, name ),
      beer_hops (
        hops ( id, name )
      ),
      beer_versions (
        id, version_year, valid_from, valid_to, plato, abv, ibu, is_current,
        breweries ( id, name, country, closed_year ),
        beer_styles ( id, name ),
        beer_version_hops (
          hops ( id, name )
        ),
        beer_version_collaborators (
          display_order,
          breweries ( id, name, country, closed_year )
        )
      )
    `)
    .eq("id", beerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!rawBeer) notFound();

  const beer = rawBeer as unknown as {
    id: number;
    name: string;
    plato: number | null;
    abv: number | null;
    ibu: number | null;
    is_non_alcoholic: boolean;
    is_catalog: boolean | null;
    portfolio_status: string | null;
    brands: Relation<{ id: number; name: string }>;
    breweries: Relation<BreweryRef>;
    beer_styles: Relation<StyleRef>;
    beer_hops: Array<{
      hops: Relation<HopRef>;
    }> | null;
    beer_versions: Array<{
      id: number;
      version_year: number | null;
      valid_from: string | null;
      valid_to: string | null;
      plato: number | null;
      abv: number | null;
      ibu: number | null;
      is_current: boolean;
      breweries: Relation<BreweryRef>;
      beer_styles: Relation<StyleRef>;
      beer_version_hops: Array<{
        hops: Relation<HopRef>;
      }> | null;
      beer_version_collaborators: Array<{
        display_order: number;
        breweries: Relation<BreweryRef>;
      }> | null;
    }> | null;
  };

  const brand = one(beer.brands);
  const versions: Version[] = (beer.beer_versions ?? []).map((version) => ({
    ...version,
    breweries: one(version.breweries),
    beer_styles: one(version.beer_styles),
    beer_version_hops: (version.beer_version_hops ?? [])
      .map((item) => ({ hops: one(item.hops) })),
    beer_version_collaborators: (version.beer_version_collaborators ?? [])
      .map((item) => ({ ...item, breweries: one(item.breweries) }))
      .sort((a, b) => a.display_order - b.display_order),
  }));

  const current = versions.find((version) => version.is_current) ?? null;
  const brewery = current?.breweries ?? one(beer.breweries);
  const style = current?.beer_styles ?? one(beer.beer_styles);
  const currentPlato = current?.plato ?? beer.plato;
  const currentAbv = current?.abv ?? beer.abv;
  const currentIbu = current?.ibu ?? beer.ibu;
  const effectivePortfolioStatus =
    brewery?.closed_year != null ? "historical" : beer.portfolio_status;
  const isHistoricalBeer = isHistoricalBeerPortfolioStatus(
    effectivePortfolioStatus
  );
  const fallbackHopNames = (beer.beer_hops ?? [])
    .map((item) => one(item.hops)?.name)
    .filter((name): name is string => Boolean(name));
  const currentVersionHopNames = (current?.beer_version_hops ?? [])
    .map((item) => item.hops?.name)
    .filter((name): name is string => Boolean(name));
  const currentHopNames =
    currentVersionHopNames.length > 0
      ? currentVersionHopNames
      : fallbackHopNames;
  const referenceStatus = getBeerReferenceStatus({
    name: beer.name,
    brandId: brand?.id ?? null,
    breweryId: brewery?.id ?? null,
    styleId: style?.id ?? null,
    plato: currentPlato,
    abv: currentAbv,
    isCatalog: beer.is_catalog,
  });

  const currentCollaboratorNames = (current?.beer_version_collaborators ?? [])
    .map((item) => item.breweries?.name)
    .filter((name): name is string => Boolean(name));

  const historicalGroupsMap = new Map<string, HistoricalGroup>();

  for (const version of versions.filter((item) => !item.is_current)) {
    const historicalCollaboratorNames = version.beer_version_collaborators
      .map((item) => item.breweries?.name)
      .filter((name): name is string => Boolean(name));

    const differences: HistoricalDifference = {
      brewery:
        version.breweries && brewery && version.breweries.id !== brewery.id
          ? version.breweries
          : null,
      style:
        version.beer_styles && style && version.beer_styles.id !== style.id
          ? version.beer_styles
          : null,
      plato:
        version.plato != null && currentPlato != null && !sameNumber(version.plato, currentPlato)
          ? version.plato
          : null,
      abv:
        version.abv != null && currentAbv != null && !sameNumber(version.abv, currentAbv)
          ? version.abv
          : null,
      ibu:
        version.ibu != null && currentIbu != null && !sameNumber(version.ibu, currentIbu)
          ? version.ibu
          : null,
      collaboratorNames:
        historicalCollaboratorNames.length > 0 &&
        currentCollaboratorNames.length > 0 &&
        !sameNameSet(historicalCollaboratorNames, currentCollaboratorNames)
          ? historicalCollaboratorNames
          : null,
    };

    const hasMeaningfulDifference =
      differences.brewery != null ||
      differences.style != null ||
      differences.plato != null ||
      differences.abv != null ||
      differences.ibu != null ||
      differences.collaboratorNames != null;

    if (!hasMeaningfulDifference) continue;

    const key = JSON.stringify({
      breweryId: differences.brewery?.id ?? null,
      styleId: differences.style?.id ?? null,
      plato: differences.plato,
      abv: differences.abv,
      ibu: differences.ibu,
      collaborators: differences.collaboratorNames
        ? normalizedNames(differences.collaboratorNames)
        : null,
    });

    const existing = historicalGroupsMap.get(key);
    if (existing) {
      if (version.version_year != null && !existing.years.includes(version.version_year)) {
        existing.years.push(version.version_year);
      }
      if (version.version_year == null) {
        existing.hasUndatedVersion = true;
      }
      continue;
    }

    historicalGroupsMap.set(key, {
      key,
      years: version.version_year != null ? [version.version_year] : [],
      hasUndatedVersion: version.version_year == null,
      differences,
    });
  }

  const historicalGroups = [...historicalGroupsMap.values()].sort((a, b) => {
    const aYear = a.years.length > 0 ? Math.max(...a.years) : 0;
    const bYear = b.years.length > 0 ? Math.max(...b.years) : 0;
    return bYear - aYear;
  });

  const { data: tastingRows, error: tastingError } = await supabase
    .from("tastings")
    .select("quantity")
    .eq("beer_id", beerId);
  if (tastingError) throw new Error(tastingError.message);
  const quantity = (tastingRows ?? []).reduce((sum, row) => sum + (row.quantity ?? 1), 0);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Pivo"
        imageUrl="/images/heroes/catalog.jpg"
        title={beer.name}
        subtitle=""
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {adminView && !referenceStatus.ready && <ReferenceWarning missing={referenceStatus.missing} />}
            <Link href="/beers" className="taste-button-secondary">← Pivní lístek</Link>
          </div>
        }
        stats={[
          { icon: "◆", accent: "#d98945", value: brand?.name ?? "—", label: "Značka" },
          { icon: "●", accent: "#e88835", value: brewery?.name ?? "—", label: "Aktuální pivovar" },
          { icon: "◐", accent: "#9cad47", value: style?.name ?? "—", label: "Styl" },
          { icon: "◉", accent: "#f2b63f", value: quantity, label: "Vypitých" },
        ]}
      />

      <section
        className="taste-card taste-glow-honey"
        style={{
          padding: "20px",
          marginBottom: "18px",
        }}
      >
        <div className="taste-label">Aktuální parametry</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", marginTop: "12px", fontSize: "13px" }}>
          {brand && <Link className="taste-entity-link" href={`/brands/${brand.id}`}>Značka: <strong>{brand.name}</strong></Link>}
          {brewery && <Link className="taste-entity-link" href={`/breweries/${brewery.id}`}>Pivovar: <strong>{brewery.name}</strong></Link>}
          {style && <Link className="taste-entity-link" href={`/styles/${style.id}`}>Styl: <strong>{style.name}</strong></Link>}
          {currentPlato != null && <span>Stupňovitost: <strong>{currentPlato} °P</strong></span>}
          {currentAbv != null && <span>Alkohol: <strong>{currentAbv} %</strong></span>}
          {currentIbu != null && <span>Hořkost: <strong>IBU {currentIbu}</strong></span>}
          {currentHopNames.length > 0 && (
            <span>
              Chmely: <strong>{currentHopNames.join(", ")}</strong>
            </span>
          )}
          {beer.is_non_alcoholic && <span style={{ padding: "3px 8px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "10px", fontWeight: 800 }}>NEALKO</span>}
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "999px",
              border: "1px solid var(--taste-border)",
              color: isHistoricalBeer ? "#d9a15d" : "var(--taste-text-muted)",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {beerPortfolioStatusLabel(effectivePortfolioStatus)}
          </span>
        </div>
        {isHistoricalBeer && (
          <div
            style={{
              marginTop: "10px",
              padding: "9px 10px",
              borderRadius: "9px",
              border: "1px solid rgba(217,161,93,.28)",
              background: "rgba(217,161,93,.07)",
              color: "var(--taste-text-muted)",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            Historické pivo zůstává v katalogu a statistikách, ale není dostupné pro nový zápis ochutnávky.
          </div>
        )}
        {currentCollaboratorNames.length > 0 && (
          <div style={{ marginTop: "10px", color: "var(--taste-text-muted)", fontSize: "11px" }}>
            Spolupráce: {currentCollaboratorNames.join(", ")}
          </div>
        )}
      </section>

      {historicalGroups.length > 0 && (
        <section>
          <div className="taste-label" style={{ marginBottom: "6px" }}>Historie produktu</div>
          <h2 style={{ margin: "0 0 14px", fontSize: "24px" }}>Historické odlišnosti</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {historicalGroups.map((group) => {
              const differences = group.differences;
              const technical = [
                differences.plato != null ? `${differences.plato} °P` : null,
                differences.abv != null ? `${differences.abv} %` : null,
                differences.ibu != null ? `IBU ${differences.ibu}` : null,
              ].filter(Boolean);

              return (
                <article key={group.key} className="taste-card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <strong>{formatYears(group.years, group.hasUndatedVersion)}</strong>
                    {technical.length > 0 && (
                      <span style={{ color: "var(--taste-text-muted)", fontSize: "11px" }}>
                        {technical.join(" · ")}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: "7px", display: "flex", flexWrap: "wrap", gap: "6px 12px", color: "var(--taste-text-soft)", fontSize: "12px" }}>
                    {differences.brewery && (
                      <span>
                        Pivovar: <Link className="taste-entity-link" href={`/breweries/${differences.brewery.id}`}>{differences.brewery.name}</Link>
                      </span>
                    )}
                    {differences.style && (
                      <span>
                        Styl: <Link className="taste-entity-link" href={`/styles/${differences.style.id}`}>{differences.style.name}</Link>
                      </span>
                    )}
                    {differences.collaboratorNames && (
                      <span>Spolupráce: {differences.collaboratorNames.join(", ")}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
