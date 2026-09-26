import { createClient } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import TastingForm from "./TastingForm";

import { saveTastingAndRedirect } from "../actions";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";

// ==================================================
// JEDNA RELACE ZE SUPABASE
// ==================================================

function singleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(value)) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

// ==================================================
// NOVÁ OCHUTNÁVKA
// ==================================================

export default async function NewTastingPage({
  searchParams,
}: {
  searchParams: Promise<{ beer?: string | string[] }>;
}) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  const requestedBeer = (await searchParams).beer;
  const initialBeerId =
    typeof requestedBeer === "string" && Number.isInteger(Number(requestedBeer))
      ? Number(requestedBeer)
      : undefined;

  // ==================================================
  // PIVA
  // ==================================================

  const beers = await fetchAllRows((from, to) =>
    supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        is_non_alcoholic,
        is_catalog,
        portfolio_status,
        brands (
          id,
          name
        ),
        breweries (
          id,
          name,
          country,
          closed_year
        ),
        beer_styles (
          id,
          name
        ),
        beer_hops (
          hops (
            id,
            name
          )
        )
      `)
      .order("is_catalog", { ascending: false })
      .order("name")
      .order("id")
      .range(from, to));

  const normalizedBeers =
    (beers ?? []).map(
      (beer) => ({
        ...beer,

        brands:
          singleRelation(
            beer.brands
          ),

        breweries:
          singleRelation(
            beer.breweries
          ),

        beer_styles:
          singleRelation(
            beer.beer_styles
          ),

        beer_hops:
          (beer.beer_hops ?? []).map((row) => ({
            ...row,
            hops: singleRelation(row.hops),
          })),
      })
    ).filter(
      (beer) =>
        isBeerAvailableForTasting(
          beer.portfolio_status,
          beer.breweries?.closed_year
        ) &&
        Boolean(beer.brands && beer.breweries)
    );

  // ==================================================
  // PIVOVARY
  // ==================================================

  const {
    data: breweries,
    error: breweriesError,
  } =
    await supabase
      .from("breweries")
      .select(`
        id,
        name,
        country,
        closed_year,
        brewery_name_history (
          previous_name
        ),
        brewery_brands (
          brands (id, name)
        )
      `)
      .order("name");

  if (breweriesError) {
    throw new Error(
      breweriesError.message
    );
  }

  const availableBreweries = (breweries ?? []).filter(
    (brewery) => brewery.closed_year == null
  );

  if (
    initialBeerId != null &&
    !normalizedBeers.some((beer) => beer.id === initialBeerId)
  ) {
    redirect("/tastings/new");
  }

  // ==================================================
  // ZEMĚ
  // ==================================================

  const {
    data: countries,
    error: countriesError,
  } =
    await supabase
      .from("countries")
      .select(
        "id, name"
      )
      .order("name");

  if (countriesError) {
    throw new Error(
      countriesError.message
    );
  }

  // ==================================================
  // STYLY
  // ==================================================

  const {
    data: styles,
    error: stylesError,
  } =
    await supabase
      .from("beer_styles")
      .select(
        "id, name, aliases"
      )
      .order("name");

  if (stylesError) {
    throw new Error(
      stylesError.message
    );
  }

  // ==================================================
  // CHMELY
  // ==================================================

  const {
    data: hops,
    error: hopsError,
  } =
    await supabase
      .from("hops")
      .select(
        "id, name, aliases"
      )
      .order("name");

  if (hopsError) {
    throw new Error(
      hopsError.message
    );
  }

  return (
    <main
      style={{
        padding:
          "40px",

        maxWidth:
          "650px",

        margin:
          "0 auto",
      }}
    >
      <h1>
        🍺 Zapsat ochutnávku
      </h1>

      <TastingForm
        saveTastingAction={
          saveTastingAndRedirect
        }
        beers={
          normalizedBeers
        }
        breweries={
          availableBreweries.map((brewery) => ({
            id: brewery.id,
            name: brewery.name,
            country: brewery.country,
            aliases: (brewery.brewery_name_history ?? [])
              .map((item) => item.previous_name)
              .filter(Boolean),
          }))
        }
        brandsByBrewery={availableBreweries.flatMap((brewery) =>
          (brewery.brewery_brands ?? []).flatMap((link) => {
            const brand = singleRelation(link.brands);
            return brand ? [{ breweryId: brewery.id, brand }] : [];
          })
        )}
        countries={
          countries ?? []
        }
        styles={
          styles ?? []
        }
        hops={
          hops ?? []
        }
        key={initialBeerId ?? "new"}
        initialBeerId={initialBeerId}
      />
    </main>
  );
}
