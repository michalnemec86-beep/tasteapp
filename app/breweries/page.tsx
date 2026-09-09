import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import BeerWorldMap from "../stats/BeerWorldMap";
import BreweryCzechMapClient from "./BreweryCzechMapClient";
import BreweryTableClient, {
  type BreweryTableRow,
} from "./BreweryTableClient";
import BreweryCreateModalClient from "./BreweryCreateModalClient";
import {
  createBrewery,
  updateBrewery,
} from "./actions";

type BreweriesPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    focus?: string | string[];
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

  const [
    { data: breweries, error },
    { data: profiles, error: profilesError },
    { data: countries, error: countriesError },
  ] = await Promise.all([
    supabase
      .from("breweries")
      .select(`
        id,
        name,
        city,
        country,
        website,
        address,
        founded_year,
        closed_year,
        latitude,
        longitude,
        beers (
          id,
          name,
          plato,
          abv,
          ibu,
          beer_styles (
            id,
            name
          ),
          tastings (
            id,
            user_id,
            quantity
          )
        ),
        brewery_name_history (
          id,
          previous_name,
          from_year,
          changed_year
        )
      `)
      .order("name", {
        ascending: true,
      }),
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

  if (error) {
    throw new Error(error.message);
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

  const breweryCountryItems = Array.from(
    allBreweries.reduce(
      (map, brewery) => {
        const country = brewery.country?.trim();

        if (!country) {
          return map;
        }

        map.set(
          country,
          (map.get(country) ?? 0) + 1
        );

        return map;
      },
      new Map<string, number>()
    )
  )
    .map(([name, count]) => ({
      id: name,
      name,
      count,
    }))
    .sort((a, b) =>
      b.count !== a.count
        ? b.count - a.count
        : a.name.localeCompare(b.name, "cs", {
            sensitivity: "base",
          })
    );

  const czechBreweryMapItems = allBreweries.flatMap(
    (brewery) => {
      if (
        brewery.country !== "Česko" ||
        brewery.latitude == null ||
        brewery.longitude == null
      ) {
        return [];
      }

      return [
        {
          id: brewery.id,
          name: brewery.name,
          city: brewery.city,
          latitude: brewery.latitude,
          longitude: brewery.longitude,
        },
      ];
    }
  );

  const recordedBeerCount = allBreweries.reduce(
    (sum, brewery) =>
      sum + (brewery.beers?.length ?? 0),
    0
  );

  const tableRows: BreweryTableRow[] = allBreweries.map(
    (brewery) => {
      const consumedCount = (brewery.beers ?? []).reduce(
        (sum, beer) =>
          sum +
          (beer.tastings ?? []).reduce(
            (beerSum, tasting) =>
              beerSum + (tasting.quantity ?? 1),
            0
          ),
        0
      );

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

      const userStats: BreweryTableRow["userStats"] = {};

      const beerItems = (brewery.beers ?? []).map(
        (beer) => {
          const userTastingCounts: Record<string, number> = {};

          for (const tasting of beer.tastings ?? []) {
            const userId = tasting.user_id;

            if (!userId) {
              continue;
            }

            userTastingCounts[userId] =
              (userTastingCounts[userId] ?? 0) + 1;
          }

          const beerStyle = Array.isArray(
            beer.beer_styles
          )
            ? beer.beer_styles[0] ?? null
            : beer.beer_styles ?? null;

          return {
            id: beer.id,
            name: beer.name,
            styleName: beerStyle?.name ?? null,
            plato: beer.plato,
            abv: beer.abv,
            ibu: beer.ibu,
            tastingCount: beer.tastings?.length ?? 0,
            userTastingCounts,
          };
        }
      );

      for (const beer of brewery.beers ?? []) {
        const usersWithBeer = new Set<string>();

        for (const tasting of beer.tastings ?? []) {
          const userId = tasting.user_id;

          if (!userId) {
            continue;
          }

          usersWithBeer.add(userId);

          if (!userStats[userId]) {
            userStats[userId] = {
              beerCount: 0,
              consumedCount: 0,
            };
          }

          userStats[userId].consumedCount +=
            tasting.quantity ?? 1;
        }

        for (const userId of usersWithBeer) {
          userStats[userId].beerCount += 1;
        }
      }

      return {
        id: brewery.id,
        name: brewery.name,
        city: brewery.city,
        country: brewery.country,
        address: brewery.address,
        website: brewery.website,
        latitude: brewery.latitude,
        longitude: brewery.longitude,
        beerCount: brewery.beers?.length ?? 0,
        foundedYear: brewery.founded_year,
        historyFromYear,
        consumedCount,
        closedYear: brewery.closed_year,
        historyText:
          history.length > 0
            ? history
                .map((item) => item.previous_name)
                .join("\n")
            : "—",
        historySortYear: historyFromYear,
        beers: beerItems,
        userStats,
      };
    }
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

  const visibleRecordedBeerCount = visibleTableRows.reduce(
    (sum, brewery) => sum + brewery.beerCount,
    0
  );

  return (
    <main
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow={
          isFocusedDrilldown
            ? "Země původu"
            : "Pivovarský adresář"
        }
        imageUrl="/images/heroes/breweries.jpg"
        imagePosition="58% 48%"
        visualVariant="catalog"
        title={
          isFocusedDrilldown
            ? `Pivovary · ${selectedCountry}`
            : "Katalog pivovarů"
        }
        subtitle={
          isFocusedDrilldown
            ? "Čistý přehled evidovaných pivovarů pro vybranou zemi."
            : "Společná databáze pivovarů, jejich původu, historie a piv zaznamenaných v TasteAppu."
        }
        action={
          selectedCountry ? (
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
            icon: <AppIcon name="brewery" size={18} />,
            accent: "#f2b63f",
            value: isFocusedDrilldown
              ? visibleTableRows.length
              : allBreweries.length,
            label: "Pivovarů",
          },
          {
            icon: "●",
            accent: "#9cad47",
            value: isFocusedDrilldown
              ? visibleActiveBreweryCount
              : activeBreweryCount,
            label: "Aktivních",
          },
          {
            icon: <AppIcon name="beer" size={18} />,
            accent: "#e88835",
            value: isFocusedDrilldown
              ? visibleRecordedBeerCount
              : recordedBeerCount,
            label: "Zaznamenaných piv",
          },
          {
            icon: <AppIcon name="globe" size={18} />,
            accent: "#d65b42",
            value: isFocusedDrilldown ? 1 : countryCount,
            label: "Států",
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
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {visibleTableRows.map((brewery) => (
                  <Link
                    key={brewery.id}
                    href={`/breweries/${brewery.id}`}
                    className="taste-card"
                    style={{
                      display: "block",
                      padding: "17px 18px",
                      color: "inherit",
                      textDecoration: "none",
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
                            color: "var(--taste-text)",
                            fontSize: "16px",
                            fontWeight: 750,
                          }}
                        >
                          {brewery.name}
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
                  </Link>
                ))}
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
                    : "Všechny pivovary"}
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
              />
            )}
          </section>

          <div style={{ marginTop: "30px" }}>
            {breweryCountryItems.length > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <BeerWorldMap
                  items={breweryCountryItems}
                  eyebrow="Pivovarský svět"
                  title="Mapa evidovaných pivovarů"
                  countLabel="států s pivovary"
                  focusEurope
                />
              </div>
            )}

            {czechBreweryMapItems.length > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <BreweryCzechMapClient
                  items={czechBreweryMapItems}
                />
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
