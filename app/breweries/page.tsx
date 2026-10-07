import Link from "next/link";
import { BreweryBrowseProvider, BreweryBrowseLink } from "@/components/navigation/BreweryBrowse";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getNewsRange } from "@/lib/navigation-news";
import { fetchCatalogueRows, getNewCatalogueIds } from "@/lib/catalogue-news";
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


type BreweryAggregateStats = {
  beerCount: number;
  tastedBeerCount: number;
  brandCount: number;
  brandIds: number[];
  brandNames: string[];
  consumedCount: number;
  userStats: BreweryTableRow["userStats"];
};

function parseBreweryCatalogStats(
  value: unknown
) {
  const result =
    new Map<
      number,
      BreweryAggregateStats
    >();

  if (!Array.isArray(value)) {
    return result;
  }

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      continue;
    }

    const row =
      item as Record<string, unknown>;
    const breweryId =
      Number(row.brewery_id);

    if (
      !Number.isInteger(
        breweryId
      ) ||
      breweryId < 1
    ) {
      continue;
    }

    const brandIds =
      Array.isArray(row.brand_ids)
        ? row.brand_ids
            .map(Number)
            .filter(
              (id) =>
                Number.isInteger(id) &&
                id > 0
            )
        : [];

    const brandNames =
      Array.isArray(
        row.brand_names
      )
        ? row.brand_names
            .filter(
              (
                name
              ): name is string =>
                typeof name === "string" &&
                Boolean(
                  name.trim()
                )
            )
            .sort(
              (a, b) =>
                a.localeCompare(
                  b,
                  "cs",
                  {
                    sensitivity:
                      "base",
                  }
                )
            )
        : [];

    const userStats:
      BreweryTableRow["userStats"] =
        {};

    if (
      row.user_stats &&
      typeof row.user_stats ===
        "object" &&
      !Array.isArray(
        row.user_stats
      )
    ) {
      for (
        const [
          userId,
          rawStats,
        ] of Object.entries(
          row.user_stats as
            Record<
              string,
              unknown
            >
        )
      ) {
        if (
          !rawStats ||
          typeof rawStats !==
            "object" ||
          Array.isArray(
            rawStats
          )
        ) {
          continue;
        }

        const stats =
          rawStats as
            Record<
              string,
              unknown
            >;

        userStats[userId] = {
          beerCount:
            Math.max(
              0,
              Number(
                stats.beerCount
              ) || 0
            ),
          brandCount:
            Math.max(
              0,
              Number(
                stats.brandCount
              ) || 0
            ),
          consumedCount:
            Math.max(
              0,
              Number(
                stats.consumedCount
              ) || 0
            ),
        };
      }
    }

    result.set(
      breweryId,
      {
        beerCount:
          Math.max(
            0,
            Number(
              row.beer_count
            ) || 0
          ),
        tastedBeerCount:
          Math.max(
            0,
            Number(
              row.tasted_beer_count
            ) || 0
          ),
        brandCount:
          Math.max(
            0,
            Number(
              row.brand_count
            ) || 0
          ),
        brandIds,
        brandNames,
        consumedCount:
          Math.max(
            0,
            Number(
              row.consumed_count
            ) || 0
          ),
        userStats,
      }
    );
  }

  return result;
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
    {
      data: breweryStatsRows,
      error: breweryStatsError,
    },
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
    supabase.rpc(
      "get_brewery_catalog_stats"
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

  if (breweryStatsError) {
    throw new Error(
      breweryStatsError.message
    );
  }

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

  const breweryStats =
    parseBreweryCatalogStats(
      breweryStatsRows
    );

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

      const userStats =
        stats?.userStats ??
        {};

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
        beerCount: stats?.beerCount ?? 0,
        tastedBeerCount: stats?.tastedBeerCount ?? 0,
        brandCount: stats?.brandCount ?? 0,
        brandIds: stats?.brandIds ?? [],
        brandNames: stats?.brandNames ?? [],
        beers: [],
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

          <BreweryLazyMapsClient
            newSince={newsRange?.since}
            newUntil={newsRange?.until}
          />
        </>
      )}
    </main>
  );
}
