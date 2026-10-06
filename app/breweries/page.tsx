import Link from "next/link";
import { BreweryBrowseProvider, BreweryBrowseLink } from "@/components/navigation/BreweryBrowse";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getNewsRange } from "@/lib/navigation-news";
import { fetchCatalogueRows, getNewCatalogueIds } from "@/lib/catalogue-news";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { getBreweryReferenceStatus } from "@/lib/referenceStatus";
import PageHero from "@/components/ui/PageHero";
import { isAdminView } from "@/lib/adminView";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import BreweryLazyMapsClient from "./BreweryLazyMapsClient";
import BreweryTableClient, {
  type BreweryTableRow,
} from "./BreweryTableClient";
import BreweryCreateModalClient from "./BreweryCreateModalClient";
import "./breweries-concept.css";
import {
  createBrewery,
  updateBrewery,
} from "./actions";

type BreweriesPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    focus?: string | string[];
    newSince?: string | string[];
    newUntil?: string | string[];
  }>;
};

function getStringParam(
  value: string | string[] | undefined
) {
  return typeof value === "string"
    ? value
    : undefined;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default async function BreweriesPage({
  searchParams,
}: BreweriesPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const selectedCountry =
    getStringParam(params.country)?.trim() || undefined;
  const requestedFocus =
    getStringParam(params.focus) === "1";
  let newsRange;
  try { newsRange = getNewsRange(params.newSince, params.newUntil); } catch { notFound(); }
  const newsIds = await getNewCatalogueIds(supabase, "breweries", user.id, newsRange);

  const [
    breweries,
    beerIndex,
    tastingIndex,
    { data: profiles, error: profilesError },
    { data: countries, error: countriesError },
  ] = await Promise.all([
    fetchCatalogueRows((from, to, selectedIds) => {
      let query = supabase
        .from("breweries")
        .select(`
          id,
          name,
          city,
          country,
          website,
          address,
          logo_url,
          is_nomadic,
          founded_year,
          closed_year,
          latitude,
          longitude,
          brewery_name_history (
            id,
            previous_name,
            from_year,
            changed_year
          )
        `);

      if (selectedIds) {
        query = query.in("id", selectedIds);
      }

      return query
        .order("name", { ascending: true })
        .order("id")
        .range(from, to);
    }, newsIds),
    fetchAllRows((from, to) =>
      supabase
        .from("beers")
        .select(`
          id,
          brewery_id,
          brand_id,
          brands (
            id,
            name
          )
        `)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("tastings")
        .select("beer_id, user_id, quantity")
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", {
        ascending: true,
      }),
    supabase
      .from("countries")
      .select("id, name")
      .order("name", {
        ascending: true,
      }),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (countriesError) {
    throw new Error(countriesError.message);
  }

  const allBreweries = breweries ?? [];

  const activeBreweryCount = allBreweries.filter(
    (brewery) => brewery.closed_year == null
  ).length;

  const countryCount = new Set(
    allBreweries
      .map((brewery) => normalizeText(brewery.country))
      .filter(Boolean)
  ).size;

  type MutableUserStats = {
    beerIds: Set<number>;
    brandIds: Set<number>;
    consumedCount: number;
  };

  type MutableBreweryStats = {
    beerIds: Set<number>;
    brandIds: Set<number>;
    brandNames: Set<string>;
    tastedBeerIds: Set<number>;
    consumedCount: number;
    users: Map<string, MutableUserStats>;
  };

  const breweryStats = new Map<number, MutableBreweryStats>();
  const beerMeta = new Map<
    number,
    {
      breweryId: number;
      brandId: number | null;
      brandName: string | null;
    }
  >();

  function getBreweryStats(breweryId: number) {
    let stats = breweryStats.get(breweryId);

    if (!stats) {
      stats = {
        beerIds: new Set<number>(),
        brandIds: new Set<number>(),
        brandNames: new Set<string>(),
        tastedBeerIds: new Set<number>(),
        consumedCount: 0,
        users: new Map<string, MutableUserStats>(),
      };
      breweryStats.set(breweryId, stats);
    }

    return stats;
  }

  for (const beer of beerIndex) {
    if (beer.brewery_id == null) {
      continue;
    }

    const brand = Array.isArray(beer.brands)
      ? beer.brands[0] ?? null
      : beer.brands ?? null;

    const brandId = beer.brand_id ?? brand?.id ?? null;
    const brandName = brand?.name?.trim() || null;

    beerMeta.set(beer.id, {
      breweryId: beer.brewery_id,
      brandId,
      brandName,
    });

    const stats = getBreweryStats(beer.brewery_id);
    stats.beerIds.add(beer.id);

    if (brandId != null) {
      stats.brandIds.add(brandId);
    }

    if (brandName) {
      stats.brandNames.add(brandName);
    }
  }

  for (const tasting of tastingIndex) {
    if (tasting.beer_id == null) {
      continue;
    }

    const meta = beerMeta.get(tasting.beer_id);

    if (!meta) {
      continue;
    }

    const quantity = tasting.quantity ?? 1;
    const stats = getBreweryStats(meta.breweryId);

    stats.tastedBeerIds.add(tasting.beer_id);
    stats.consumedCount += quantity;

    if (!tasting.user_id) {
      continue;
    }

    let userStats = stats.users.get(tasting.user_id);

    if (!userStats) {
      userStats = {
        beerIds: new Set<number>(),
        brandIds: new Set<number>(),
        consumedCount: 0,
      };
      stats.users.set(tasting.user_id, userStats);
    }

    userStats.beerIds.add(tasting.beer_id);
    userStats.consumedCount += quantity;

    if (meta.brandId != null) {
      userStats.brandIds.add(meta.brandId);
    }
  }

  const tableRows: BreweryTableRow[] = allBreweries.map(
    (brewery) => {
      const stats = breweryStats.get(brewery.id);

      const history = [
        ...(brewery.brewery_name_history ?? []),
      ].sort(
        (a, b) =>
          (a.from_year ??
            a.changed_year ??
            Number.MAX_SAFE_INTEGER) -
          (b.from_year ??
            b.changed_year ??
            Number.MAX_SAFE_INTEGER)
      );

      const historyFromYear = history.reduce<number | null>(
        (earliest, item) => {
          if (item.from_year == null) {
            return earliest;
          }

          return earliest == null || item.from_year < earliest
            ? item.from_year
            : earliest;
        },
        null
      );

      const userStats: BreweryTableRow["userStats"] =
        Object.fromEntries(
          Array.from(stats?.users.entries() ?? []).map(
            ([userId, item]) => [
              userId,
              {
                beerCount: item.beerIds.size,
                brandCount: item.brandIds.size,
                consumedCount: item.consumedCount,
              },
            ]
          )
        );

      const referenceStatus = getBreweryReferenceStatus({
        name: brewery.name,
        country: brewery.country,
      });

      return {
        id: brewery.id,
        name: brewery.name,
        city: brewery.city,
        country: brewery.country,
        address: brewery.address,
        website: brewery.website,
        logoUrl: brewery.logo_url,
        isNomadic: brewery.is_nomadic,
        latitude: brewery.latitude,
        longitude: brewery.longitude,
        beerCount: stats?.beerIds.size ?? 0,
        tastedBeerCount: stats?.tastedBeerIds.size ?? 0,
        brandCount: stats?.brandIds.size ?? 0,
        brandIds: Array.from(stats?.brandIds ?? []),
        brandNames: Array.from(stats?.brandNames ?? []).sort(
          (a, b) =>
            a.localeCompare(b, "cs", {
              sensitivity: "base",
            })
        ),
        foundedYear: brewery.founded_year,
        historyFromYear,
        consumedCount: stats?.consumedCount ?? 0,
        closedYear: brewery.closed_year,
        historyText:
          history.length > 0
            ? history
                .map((item) => item.previous_name)
                .join("\n")
            : "—",
        historySortYear: historyFromYear,
        userStats,
        referenceReady: referenceStatus.ready,
        referenceMissing: referenceStatus.missing,
      };
    }
  );

  const recordedBeerCount = tableRows.reduce(
    (sum, brewery) => sum + brewery.beerCount,
    0
  );

  const visibleTableRows = selectedCountry
    ? tableRows.filter(
        (row) =>
          normalizeText(row.country) ===
          normalizeText(selectedCountry)
      )
    : tableRows;

  const isFocusedDrilldown =
    requestedFocus && Boolean(selectedCountry);

  const visibleActiveBreweryCount = visibleTableRows.filter(
    (brewery) => brewery.closedYear == null
  ).length;

  const visibleTastedBeerCount = visibleTableRows.reduce(
    (sum, brewery) =>
      sum + brewery.tastedBeerCount,
    0
  );

  const visibleBrandCount = new Set(
    visibleTableRows.flatMap((brewery) => brewery.brandIds)
  ).size;

  return (
    <main
      className="taste-brewery-catalog-concept"
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow={
          isFocusedDrilldown
            ? "Státní evidence"
            : "Pivovarský adresář"
        }
        imageUrl="/images/heroes/breweries.jpg"
        imagePosition="58% 48%"
        visualVariant="catalog"
        title={
          isFocusedDrilldown
            ? `Pivovary · ${selectedCountry}`
            : newsRange ? "Nové pivovary" : "Katalog pivovarů"
        }
        subtitle={
          isFocusedDrilldown
            ? "Čistý přehled evidovaných pivovarů pro vybranou zemi."
            : "Společná databáze pivovarů, jejich původu, historie a piv zaznamenaných v Pivníku."
        }
        action={
          selectedCountry || newsRange ? (
            <Link
              href="/breweries"
              className="taste-button-secondary"
              style={{
                fontSize: "12px",
                fontWeight: 650,
              }}
            >
              Celý katalog
            </Link>
          ) : undefined
        }
        stats={[
          {
            icon: <HomeStatIcon kind="brewery" />,
            accent: "#f2b63f",
            value: isFocusedDrilldown
              ? visibleTableRows.length
              : allBreweries.length,
            label: "Pivovarů",
          },
          {
            icon: <HomeStatIcon kind="brewery" />,
            accent: "#9cad47",
            value: isFocusedDrilldown
              ? visibleActiveBreweryCount
              : activeBreweryCount,
            label: "Aktivních",
          },
          {
            icon: <HomeStatIcon kind="mug" />,
            accent: "#e88835",
            value: isFocusedDrilldown
              ? visibleTastedBeerCount
              : recordedBeerCount,
            label: isFocusedDrilldown
              ? "Ochutnaných piv"
              : "Zaznamenaných piv",
          },
          {
            icon: <HomeStatIcon kind={isFocusedDrilldown ? "crest" : "globe"} />,
            accent: "#d65b42",
            value: isFocusedDrilldown ? visibleBrandCount : countryCount,
            label: isFocusedDrilldown ? "Značek" : "Států",
          },
        ]}
      />

      {isFocusedDrilldown ? (
        <>
          <section
            className="taste-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "22px",
              padding: "13px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                flexWrap: "wrap",
              }}
            >
              <span
                className="taste-label"
                style={{ margin: 0 }}
              >
                Aktivní výběr
              </span>
              <span
                style={{
                  padding: "5px 9px",
                  border:
                    "1px solid rgba(231,166,47,0.20)",
                  borderRadius: "999px",
                  background:
                    "rgba(231,166,47,0.055)",
                  color: "var(--taste-text-soft)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {selectedCountry}
              </span>
            </div>

            <Link
              href="/breweries"
              style={{
                color: "var(--taste-amber-bright)",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              Změnit výběr
            </Link>
          </section>

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "16px",
                marginBottom: "15px",
              }}
            >
              <div>
                <div
                  className="taste-label"
                  style={{ marginBottom: "5px" }}
                >
                  Tematický přehled
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    lineHeight: 1.1,
                    fontWeight: 750,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Pivovary v zemi {selectedCountry}
                </h2>
              </div>

              <div
                style={{
                  color: "var(--taste-text-muted)",
                  fontSize: "11px",
                }}
              >
                {visibleTableRows.length}{" "}
                {visibleTableRows.length === 1
                  ? "položka"
                  : "položek"}
              </div>
            </div>

            {visibleTableRows.length === 0 ? (
              <div
                className="taste-card"
                style={{
                  padding: "34px",
                  textAlign: "center",
                  color: "var(--taste-text-muted)",
                  fontSize: "13px",
                }}
              >
                Pro tento stát zatím není evidovaný žádný pivovar.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
                  gap: "12px",
                }}
              >
                <BreweryBrowseProvider ids={visibleTableRows.map(row => row.id)} ownerId={user.id} label={selectedCountry ? `Pivovary · ${selectedCountry}` : "Katalog pivovarů"}>
                {visibleTableRows.map((brewery) => (
                  <BreweryBrowseLink
                    key={brewery.id}
                    href={`/breweries/${brewery.id}`}
                    className="taste-card"
                    style={{
                      display: "block",
                      padding: "17px 18px",
                      color: "inherit",
                      textDecoration: "none",
                      borderColor:
                        (brewery.userStats[user.id]?.consumedCount ?? 0) > 0
                          ? "rgba(242,182,63,0.48)"
                          : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            color:
                              (brewery.userStats[user.id]?.consumedCount ?? 0) > 0
                                ? "var(--taste-amber-bright)"
                                : "var(--taste-text)",
                            fontSize: "16px",
                            fontWeight: 750,
                          }}
                        >
                          {brewery.name}
                          {(brewery.userStats[user.id]?.consumedCount ?? 0) > 0 && (
                            <span
                              title="Máš ve své evidenci"
                              aria-label="Máš ve své evidenci"
                              style={{ marginLeft: "8px", fontSize: "14px" }}
                            >
                              🍺
                            </span>
                          )}
                        </h3>
                        <div
                          style={{
                            marginTop: "5px",
                            color: "var(--taste-text-muted)",
                            fontSize: "11px",
                          }}
                        >
                          {brewery.city || "Město neuvedeno"}
                        </div>
                      </div>

                      <span
                        style={{
                          color:
                            brewery.closedYear == null
                              ? "#9cad47"
                              : "var(--taste-text-muted)",
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        {brewery.closedYear == null
                          ? "AKTIVNÍ"
                          : `UZAVŘEN ${brewery.closedYear}`}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "13px",
                        color: "var(--taste-text-soft)",
                        fontSize: "10px",
                      }}
                    >
                      <span>{brewery.beerCount} piv v katalogu</span>
                      {brewery.foundedYear != null && (
                        <span>· založen {brewery.foundedYear}</span>
                      )}
                    </div>
                  </BreweryBrowseLink>
                ))}
                </BreweryBrowseProvider>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {selectedCountry && (
            <div
              className="taste-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "20px",
                padding: "13px 16px",
                color: "var(--taste-text-muted)",
                fontSize: "11px",
              }}
            >
              <span>
                Stát: {selectedCountry} · {visibleTableRows.length}{" "}
                {visibleTableRows.length === 1
                  ? "pivovar"
                  : "pivovarů"}
              </span>
              <Link
                href="/breweries"
                style={{
                  color: "var(--taste-amber-bright)",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Zobrazit všechny
              </Link>
            </div>
          )}

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "16px",
                marginBottom: "15px",
              }}
            >
              <div>
                <div
                  className="taste-label"
                  style={{ marginBottom: "5px" }}
                >
                  Databáze
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    lineHeight: 1.1,
                    fontWeight: 750,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {selectedCountry
                    ? `Pivovary · ${selectedCountry}`
                    : newsRange ? "Nové pivovary" : "Všechny pivovary"}
                </h2>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    color: "var(--taste-text-muted)",
                    fontSize: "11px",
                  }}
                >
                  {visibleTableRows.length}{" "}
                  {visibleTableRows.length === 1
                    ? "položka"
                    : "položek"}
                </div>

                <BreweryCreateModalClient
                  countries={countries ?? []}
                  showQuickImport={
                    user.id ===
                    "17be5dc3-a3f9-4fd2-ae90-dee7692034fc"
                  }
                  createBreweryAction={createBrewery}
                />
              </div>
            </div>

            {visibleTableRows.length === 0 ? (
              <div
                className="taste-card"
                style={{
                  padding: "34px",
                  textAlign: "center",
                  color: "var(--taste-text-muted)",
                  fontSize: "13px",
                }}
              >
                Pro tento stát zatím není evidovaný žádný pivovar.
              </div>
            ) : (
              <BreweryTableClient
                rows={visibleTableRows}
                profiles={profiles ?? []}
                countries={countries ?? []}
                updateBreweryAction={updateBrewery}
                currentUserId={user.id}
                adminView={await isAdminView(user.id)}
                key={newsRange?.since ?? "all"}
                initiallyVisible={Boolean(selectedCountry || newsRange)}
              />
            )}
          </section>

          <BreweryLazyMapsClient />
        </>
      )}
    </main>
  );
}
