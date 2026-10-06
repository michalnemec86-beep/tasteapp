import { NextResponse } from "next/server";

import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";
import { createClient } from "@/lib/supabase/server";

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const beersPromise = fetchAllRows((from, to) =>
    supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        is_catalog,
        portfolio_status,
        is_non_alcoholic,
        brands (
          id,
          name
        ),
        breweries (
          id,
          name,
          country,
          logo_url,
          closed_year
        ),
        beer_styles (
          id,
          name
        )
      `)
      .order("is_catalog", { ascending: false })
      .order("name")
      .order("id")
      .range(from, to)
  );

  const breweriesPromise = supabase
    .from("breweries")
    .select(`
      id,
      name,
      country,
      logo_url,
      closed_year,
      brewery_name_history (
        previous_name
      ),
      brewery_brands (
        brands (id, name)
      )
    `)
    .order("name");

  const countriesPromise = supabase
    .from("countries")
    .select("id, name")
    .order("name");

  const stylesPromise = supabase
    .from("beer_styles")
    .select("id, name, aliases")
    .order("name");

  const hopsPromise = supabase
    .from("hops")
    .select("id, name, aliases")
    .order("name");

  const [
    beers,
    breweriesResult,
    countriesResult,
    stylesResult,
    hopsResult,
  ] = await Promise.all([
    beersPromise,
    breweriesPromise,
    countriesPromise,
    stylesPromise,
    hopsPromise,
  ]);

  const {
    data: breweries,
    error: breweriesError,
  } = breweriesResult;

  const {
    data: countries,
    error: countriesError,
  } = countriesResult;

  const {
    data: styles,
    error: stylesError,
  } = stylesResult;

  const {
    data: hops,
    error: hopsError,
  } = hopsResult;

  const error =
    breweriesError ??
    countriesError ??
    stylesError ??
    hopsError;

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  const normalizedBeers = beers.map((beer) => ({
    ...beer,
    breweries: singleRelation(beer.breweries),
    brands: singleRelation(beer.brands),
    beer_styles: singleRelation(beer.beer_styles),
  }));

  const availableBeers = normalizedBeers.filter(
    (beer) =>
      isBeerAvailableForTasting(
        beer.portfolio_status,
        beer.breweries?.closed_year
      ) &&
      Boolean(
        beer.brands &&
        beer.breweries
      )
  );

  const availableBreweries = (breweries ?? [])
    .filter(
      (brewery) =>
        brewery.closed_year == null
    )
    .map((brewery) => ({
      id: brewery.id,
      name: brewery.name,
      aliases:
        (
          brewery.brewery_name_history ??
          []
        )
          .map(
            (item) =>
              item.previous_name
          )
          .filter(
            (
              alias
            ): alias is string =>
              Boolean(alias)
          ),
    }));

  const brandsByBrewery = (breweries ?? [])
    .flatMap((brewery) =>
      (
        brewery.brewery_brands ??
        []
      ).flatMap((link) => {
        const brand =
          singleRelation(
            link.brands
          );

        return brand
          ? [
              {
                breweryId:
                  brewery.id,
                brand,
              },
            ]
          : [];
      })
    );

  return NextResponse.json(
    {
      beers: availableBeers,
      breweries: availableBreweries,
      brandsByBrewery,
      countries: countries ?? [],
      styles: styles ?? [],
      hops: hops ?? [],
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
