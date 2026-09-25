import { NextResponse } from "next/server";

import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [beers, breweriesResult, countriesResult, stylesResult, hopsResult] =
      await Promise.all([
        fetchAllRows((from, to) =>
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
            .range(from, to)
        ),
        supabase
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
          .order("name"),
        supabase.from("countries").select("id, name").order("name"),
        supabase.from("beer_styles").select("id, name, aliases").order("name"),
        supabase.from("hops").select("id, name, aliases").order("name"),
      ]);

    for (const result of [
      breweriesResult,
      countriesResult,
      stylesResult,
      hopsResult,
    ]) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    const normalizedBeers = (beers ?? []).map((beer) => ({
      ...beer,
      brands: singleRelation(beer.brands),
      breweries: singleRelation(beer.breweries),
      beer_styles: singleRelation(beer.beer_styles),
      beer_hops: (beer.beer_hops ?? []).map((row) => ({
        ...row,
        hops: singleRelation(row.hops),
      })),
    }));

    const breweries = breweriesResult.data ?? [];

    const availableBreweries = breweries
      .filter((brewery) => brewery.closed_year == null)
      .map((brewery) => ({
        id: brewery.id,
        name: brewery.name,
        country: brewery.country,
        aliases: (brewery.brewery_name_history ?? [])
          .map((item) => item.previous_name)
          .filter(Boolean),
      }));

    const brandsByBrewery = breweries.flatMap((brewery) =>
      (brewery.brewery_brands ?? []).flatMap((link) => {
        const brand = singleRelation(link.brands);
        return brand ? [{ breweryId: brewery.id, brand }] : [];
      })
    );

    const availableBeers = normalizedBeers.filter(
      (beer) =>
        Boolean(beer.is_catalog) &&
        isBeerAvailableForTasting(
          beer.portfolio_status,
          beer.breweries?.closed_year
        )
    );

    return NextResponse.json({
      beers: normalizedBeers,
      availableBeers,
      breweries: availableBreweries,
      brandsByBrewery,
      countries: countriesResult.data ?? [],
      styles: stylesResult.data ?? [],
      hops: hopsResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nepodařilo se načíst podklady pro formulář.",
      },
      { status: 500 }
    );
  }
}
