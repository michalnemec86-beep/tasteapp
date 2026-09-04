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

export default async function BreweriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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
      .map((brewery) =>
        brewery.country
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      )
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
        : a.name.localeCompare(
            b.name,
            "cs",
            {
              sensitivity: "base",
            }
          )
    );

  const czechBreweryMapItems =
    allBreweries.flatMap(
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
    (sum, brewery) => sum + (brewery.beers?.length ?? 0),
    0
  );

  const tableRows: BreweryTableRow[] = allBreweries.map(
    (brewery) => {
      const consumedCount = (brewery.beers ?? []).reduce(
        (sum, beer) =>
          sum +
          (beer.tastings ?? []).reduce(
            (beerSum, tasting) =>
              beerSum +
              (tasting.quantity ?? 1),
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

      const historyFromYear =
        history.reduce<number | null>(
          (earliest, item) => {
            if (item.from_year == null) {
              return earliest;
            }

            return earliest == null ||
              item.from_year < earliest
              ? item.from_year
              : earliest;
          },
          null
        );

      const currentNameFromYear =
        brewery.founded_year ??
        history[history.length - 1]
          ?.changed_year ??
        null;

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

          const beerStyle =
            Array.isArray(
              beer.beer_styles
            )
              ? beer.beer_styles[0] ??
                null
              : beer.beer_styles ??
                null;

          return {
            id: beer.id,
            name: beer.name,
            styleName:
              beerStyle?.name ?? null,
            plato: beer.plato,
            abv: beer.abv,
            ibu: beer.ibu,
            tastingCount:
              beer.tastings?.length ?? 0,
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
                .map(
                  (item) =>
                    item.previous_name
                )
                .join("\n")
            : "—",
        historySortYear:
          historyFromYear,
        beers: beerItems,
        userStats,
      };
    }
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
        eyebrow="Pivovarský adresář"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title="Katalog pivovarů"
        subtitle="Společná databáze pivovarů, jejich původu, historie a piv zaznamenaných v TasteAppu."
        action={
          <Link
            href="/"
            className="taste-button-secondary"
            style={{
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            ← Timeline
          </Link>
        }
        stats={[
          {
            icon: <AppIcon name="brewery" size={18} />,
            accent: "#f2b63f",
            value: allBreweries.length,
            label: "Pivovarů",
          },
          {
            icon: "●",
            accent: "#9cad47",
            value: activeBreweryCount,
            label: "Aktivních",
          },
          {
            icon: <AppIcon name="beer" size={18} />,
            accent: "#e88835",
            value: recordedBeerCount,
            label: "Zaznamenaných piv",
          },
          {
            icon: <AppIcon name="globe" size={18} />,
            accent: "#d65b42",
            value: countryCount,
            label: "Států",
          },
        ]}
      />

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
              style={{
                marginBottom: "5px",
              }}
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
              Všechny pivovary
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
              {allBreweries.length}{" "}
              {allBreweries.length === 1
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

        {tableRows.length === 0 ? (
          <div
            className="taste-card"
            style={{
              padding: "34px",
              textAlign: "center",
              color: "var(--taste-text-muted)",
              fontSize: "13px",
            }}
          >
            V katalogu zatím není žádný pivovar.
          </div>
        ) : (
          <BreweryTableClient
            rows={tableRows}
            profiles={profiles ?? []}
            countries={countries ?? []}
            updateBreweryAction={updateBrewery}
          />
        )}
      </section>
      <div
        style={{
          marginTop: "30px",
        }}
      >
      {breweryCountryItems.length > 0 && (
        <div
          style={{
            marginBottom: "30px",
          }}
        >
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
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <BreweryCzechMapClient
            items={czechBreweryMapItems}
          />
        </div>
      )}

      </div>

    </main>
  );
}
