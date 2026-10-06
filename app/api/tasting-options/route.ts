import { NextRequest, NextResponse } from "next/server";

import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";
import { createClient } from "@/lib/supabase/server";

const RECENT_BEER_LIMIT = 12;
const FREQUENT_BEER_LIMIT = 12;
const RECOMMENDED_BEER_LIMIT = 24;
const TASTING_HISTORY_LIMIT = 5000;

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function GET(request: NextRequest) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const requestedBeerValue =
    request.nextUrl.searchParams.get("beerId");
  const requestedBeerId =
    requestedBeerValue &&
    Number.isInteger(Number(requestedBeerValue)) &&
    Number(requestedBeerValue) > 0
      ? Number(requestedBeerValue)
      : null;

  const tastingsPromise =
    fetchAllRows(
      (from, to) =>
        supabase
          .from(
            "tastings"
          )
          .select(
            "id, beer_id, tasted_on"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "tasted_on",
            {
              ascending:
                false,
            }
          )
          .order(
            "id",
            {
              ascending:
                false,
            }
          )
          .range(
            from,
            to
          ),
      500,
      TASTING_HISTORY_LIMIT
    );

  const countriesPromise =
    supabase
      .from("countries")
      .select(
        "id, name"
      )
      .order("name");

  const stylesPromise =
    supabase
      .from(
        "beer_styles"
      )
      .select(
        "id, name, aliases"
      )
      .order("name");

  const hopsPromise =
    supabase
      .from("hops")
      .select(
        "id, name, aliases"
      )
      .order("name");

  const [
    tastingRows,
    countriesResult,
    stylesResult,
    hopsResult,
  ] =
    await Promise.all([
      tastingsPromise,
      countriesPromise,
      stylesPromise,
      hopsPromise,
    ]);

  const {
    data: countries,
    error: countriesError,
  } =
    countriesResult;

  const {
    data: styles,
    error: stylesError,
  } =
    stylesResult;

  const {
    data: hops,
    error: hopsError,
  } =
    hopsResult;

  const referenceError =
    countriesError ??
    stylesError ??
    hopsError;

  if (
    referenceError
  ) {
    return NextResponse.json(
      {
        error:
          referenceError.message,
      },
      {
        status: 500,
      }
    );
  }

  const recentIds:
    number[] =
    [];

  const seenRecent =
    new Set<number>();

  const frequency =
    new Map<
      number,
      number
    >();

  for (
    const tasting of
    tastingRows
  ) {
    const beerId =
      tasting.beer_id;

    if (
      beerId == null
    ) {
      continue;
    }

    frequency.set(
      beerId,
      (
        frequency.get(
          beerId
        ) ??
        0
      ) + 1
    );

    if (
      recentIds.length <
        RECENT_BEER_LIMIT &&
      !seenRecent.has(
        beerId
      )
    ) {
      recentIds.push(
        beerId
      );

      seenRecent.add(
        beerId
      );
    }
  }

  const recentRank =
    new Map(
      recentIds.map(
        (
          beerId,
          index
        ) => [
          beerId,
          index,
        ]
      )
    );

  const frequentIds =
    Array.from(
      frequency.entries()
    )
      .sort(
        (
          [aId, aCount],
          [bId, bCount]
        ) =>
          bCount -
            aCount ||
          (
            recentRank.get(
              aId
            ) ??
            Number.MAX_SAFE_INTEGER
          ) -
            (
              recentRank.get(
                bId
              ) ??
              Number.MAX_SAFE_INTEGER
            ) ||
          aId -
            bId
      )
      .slice(
        0,
        FREQUENT_BEER_LIMIT
      )
      .map(
        ([beerId]) =>
          beerId
      );

  const recommendationIds =
    [
      ...new Set([
        ...(requestedBeerId != null ? [requestedBeerId] : []),
        ...recentIds,
        ...frequentIds,
      ]),
    ].slice(
      0,
      RECOMMENDED_BEER_LIMIT + (requestedBeerId != null ? 1 : 0)
    );

  let recommendedBeerRows:
    Record<
      string,
      unknown
    >[] =
    [];

  if (
    recommendationIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
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
        .in(
          "id",
          recommendationIds
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            500,
        }
      );
    }

    recommendedBeerRows =
      (
        data ??
        []
      ) as unknown as Record<
        string,
        unknown
      >[];
  }

  const normalizedBeers =
    recommendedBeerRows.map(
      (rawBeer) => {
        const beer =
          rawBeer as {
            id: number;
            name: string;
            plato: number | null;
            abv: number | null;
            ibu: number | null;
            is_catalog: boolean;
            portfolio_status: string | null;
            is_non_alcoholic: boolean;
            brands:
              | {
                  id: number;
                  name: string;
                }
              | {
                  id: number;
                  name: string;
                }[]
              | null;
            breweries:
              | {
                  id: number;
                  name: string;
                  country: string | null;
                  closed_year: number | null;
                }
              | {
                  id: number;
                  name: string;
                  country: string | null;
                  closed_year: number | null;
                }[]
              | null;
            beer_styles:
              | {
                  id: number;
                  name: string;
                }
              | {
                  id: number;
                  name: string;
                }[]
              | null;
            beer_hops:
              | {
                  hops:
                    | {
                        id: number;
                        name: string;
                      }
                    | {
                        id: number;
                        name: string;
                      }[]
                    | null;
                }[]
              | null;
          };

        return {
          ...beer,
          breweries:
            singleRelation(
              beer.breweries
            ),
          brands:
            singleRelation(
              beer.brands
            ),
          beer_styles:
            singleRelation(
              beer.beer_styles
            ),
          beer_hops:
            (
              beer.beer_hops ??
              []
            ).map(
              (row) => ({
                ...row,
                hops:
                  singleRelation(
                    row.hops
                  ),
              })
            ),
        };
      }
    );

  const beerById =
    new Map(
      normalizedBeers.map(
        (beer) => [
          beer.id,
          beer,
        ]
      )
    );

  const availableBeers =
    recommendationIds
      .map(
        (beerId) =>
          beerById.get(
            beerId
          )
      )
      .filter(
        (
          beer
        ): beer is NonNullable<
          typeof beer
        > =>
          Boolean(
            beer &&
              isBeerAvailableForTasting(
                beer.portfolio_status,
                beer.breweries?.closed_year
              ) &&
              beer.brands &&
              beer.breweries
          )
      );

  const breweryMap =
    new Map<
      number,
      {
        id: number;
        name: string;
        country: string | null;
        aliases: string[];
      }
    >();

  const brandsByBreweryMap =
    new Map<
      string,
      {
        breweryId: number;
        brand: {
          id: number;
          name: string;
        };
      }
    >();

  for (
    const beer of
    availableBeers
  ) {
    const brewery =
      beer.breweries;

    const brand =
      beer.brands;

    if (
      brewery
    ) {
      breweryMap.set(
        brewery.id,
        {
          id:
            brewery.id,
          name:
            brewery.name,
          country:
            brewery.country,
          aliases:
            [],
        }
      );
    }

    if (
      brewery &&
      brand
    ) {
      brandsByBreweryMap.set(
        `${brewery.id}:${brand.id}`,
        {
          breweryId:
            brewery.id,
          brand: {
            id:
              brand.id,
            name:
              brand.name,
          },
        }
      );
    }
  }

  return NextResponse.json(
    {
      beers:
        availableBeers,
      breweries:
        Array.from(
          breweryMap.values()
        ),
      brandsByBrewery:
        Array.from(
          brandsByBreweryMap.values()
        ),
      countries:
        countries ?? [],
      styles:
        styles ?? [],
      hops:
        hops ?? [],
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
