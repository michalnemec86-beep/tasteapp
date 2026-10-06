import { NextRequest, NextResponse } from "next/server";

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs")
    .trim();
}

function parsePositiveInteger(value: string | null) {
  if (!value) return null;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export async function GET(
  request: NextRequest
) {
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

  const { searchParams } =
    request.nextUrl;

  const type =
    searchParams.get("type")?.trim() ??
    "";

  const query =
    searchParams.get("q")?.trim().slice(0, 100) ??
    "";

  const breweryId =
    parsePositiveInteger(
      searchParams.get("breweryId")
    );

  const brandId =
    parsePositiveInteger(
      searchParams.get("brandId")
    );

  if (
    type === "beer"
  ) {
    if (
      !breweryId &&
      query.length < 3
    ) {
      return NextResponse.json(
        {
          beers: [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    const select = `
      id,
      name,
      plato,
      abv,
      ibu,
      is_non_alcoholic,
      is_catalog,
      portfolio_status,
      brand_id,
      brewery_id,
      brands (
        id,
        name
      ),
      breweries!inner (
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
    `;

    async function loadBeerRows(
      brandIds?: number[]
    ) {
      let beerQuery =
        supabase
          .from("beers")
          .select(select)
          .or(
            "portfolio_status.is.null,portfolio_status.in.(active,seasonal,limited)"
          )
          .is(
            "breweries.closed_year",
            null
          )
          .limit(40);

      if (breweryId) {
        beerQuery =
          beerQuery.eq(
            "brewery_id",
            breweryId
          );
      }

      if (brandId) {
        beerQuery =
          beerQuery.eq(
            "brand_id",
            brandId
          );
      } else if (
        brandIds &&
        brandIds.length > 0
      ) {
        beerQuery =
          beerQuery.in(
            "brand_id",
            brandIds
          );
      }

      if (query) {
        beerQuery =
          beerQuery.ilike(
            "name",
            `%${query}%`
          );
      }

      const {
        data,
        error,
      } =
        await beerQuery;

      if (error) {
        throw new Error(
          error.message
        );
      }

      return data ?? [];
    }

    let rows =
      await loadBeerRows();

    if (
      !breweryId &&
      !brandId &&
      query.length >= 3
    ) {
      const {
        data: matchingBrands,
        error: brandsError,
      } =
        await supabase
          .from("brands")
          .select("id")
          .ilike(
            "name",
            `%${query}%`
          )
          .limit(20);

      if (brandsError) {
        throw new Error(
          brandsError.message
        );
      }

      const brandIds =
        (
          matchingBrands ??
          []
        ).map(
          (brand) =>
            brand.id
        );

      if (
        brandIds.length > 0
      ) {
        let brandBeerQuery =
          supabase
            .from("beers")
            .select(select)
            .or(
              "portfolio_status.is.null,portfolio_status.in.(active,seasonal,limited)"
            )
            .is(
              "breweries.closed_year",
              null
            )
            .in(
              "brand_id",
              brandIds
            )
            .limit(40);

        const {
          data: brandBeerRows,
          error: brandBeerError,
        } =
          await brandBeerQuery;

        if (brandBeerError) {
          throw new Error(
            brandBeerError.message
          );
        }

        const byId =
          new Map(
            rows.map(
              (row) => [
                row.id,
                row,
              ]
            )
          );

        for (
          const row of
          brandBeerRows ??
          []
        ) {
          byId.set(
            row.id,
            row
          );
        }

        rows =
          Array.from(
            byId.values()
          );
      }
    }

    const normalizedQuery =
      normalizeText(
        query
      );

    const beers =
      rows
        .map((beer) => ({
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
        }))
        .filter(
          (beer) =>
            isBeerAvailableForTasting(
              beer.portfolio_status,
              beer.breweries?.closed_year
            ) &&
            Boolean(
              beer.brands &&
              beer.breweries
            )
        )
        .sort((a, b) => {
          if (
            !normalizedQuery
          ) {
            return a.name.localeCompare(
              b.name,
              "cs",
              {
                sensitivity:
                  "base",
              }
            );
          }

          const aName =
            normalizeText(
              a.name
            );

          const bName =
            normalizeText(
              b.name
            );

          const aBrand =
            normalizeText(
              a.brands?.name ??
                ""
            );

          const bBrand =
            normalizeText(
              b.brands?.name ??
                ""
            );

          const aRank =
            aName.startsWith(
              normalizedQuery
            )
              ? 0
              : aName.includes(
                    normalizedQuery
                  )
                ? 1
                : aBrand.startsWith(
                      normalizedQuery
                    )
                  ? 2
                  : 3;

          const bRank =
            bName.startsWith(
              normalizedQuery
            )
              ? 0
              : bName.includes(
                    normalizedQuery
                  )
                ? 1
                : bBrand.startsWith(
                      normalizedQuery
                    )
                  ? 2
                  : 3;

          return (
            aRank -
              bRank ||
            a.name.localeCompare(
              b.name,
              "cs",
              {
                sensitivity:
                  "base",
              }
            )
          );
        })
        .slice(
          0,
          30
        );

    return NextResponse.json(
      {
        beers,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }

  if (
    type ===
    "brewery"
  ) {
    if (
      query.length < 3
    ) {
      return NextResponse.json(
        {
          breweries: [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    const [
      currentResult,
      historyResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "breweries"
          )
          .select(
            "id, name, country, closed_year"
          )
          .is(
            "closed_year",
            null
          )
          .ilike(
            "name",
            `%${query}%`
          )
          .limit(
            25
          ),
        supabase
          .from(
            "brewery_name_history"
          )
          .select(
            "brewery_id, previous_name"
          )
          .ilike(
            "previous_name",
            `%${query}%`
          )
          .limit(
            25
          ),
      ]);

    if (
      currentResult.error
    ) {
      throw new Error(
        currentResult.error.message
      );
    }

    if (
      historyResult.error
    ) {
      throw new Error(
        historyResult.error.message
      );
    }

    const historyIds =
      [
        ...new Set(
          (
            historyResult.data ??
            []
          ).map(
            (row) =>
              row.brewery_id
          )
        ),
      ];

    let historicalBreweries:
      | {
          id: number;
          name: string;
          country: string | null;
          closed_year: number | null;
        }[] =
      [];

    if (
      historyIds.length > 0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "breweries"
          )
          .select(
            "id, name, country, closed_year"
          )
          .in(
            "id",
            historyIds
          )
          .is(
            "closed_year",
            null
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      historicalBreweries =
        data ?? [];
    }

    const byId =
      new Map<
        number,
        {
          id: number;
          name: string;
          country: string | null;
          aliases: string[];
        }
      >();

    for (
      const brewery of
      [
        ...(
          currentResult.data ??
          []
        ),
        ...historicalBreweries,
      ]
    ) {
      byId.set(
        brewery.id,
        {
          id:
            brewery.id,
          name:
            brewery.name,
          country:
            brewery.country,
          aliases: [],
        }
      );
    }

    for (
      const row of
      historyResult.data ??
      []
    ) {
      const brewery =
        byId.get(
          row.brewery_id
        );

      if (
        brewery &&
        row.previous_name
      ) {
        brewery.aliases.push(
          row.previous_name
        );
      }
    }

    const normalizedQuery =
      normalizeText(
        query
      );

    const breweries =
      Array.from(
        byId.values()
      )
        .sort(
          (a, b) => {
            const aName =
              normalizeText(
                a.name
              );

            const bName =
              normalizeText(
                b.name
              );

            const aAliasMatch =
              a.aliases.some(
                (alias) =>
                  normalizeText(
                    alias
                  ).startsWith(
                    normalizedQuery
                  )
              );

            const bAliasMatch =
              b.aliases.some(
                (alias) =>
                  normalizeText(
                    alias
                  ).startsWith(
                    normalizedQuery
                  )
              );

            const aRank =
              aName.startsWith(
                normalizedQuery
              )
                ? 0
                : aAliasMatch
                  ? 1
                  : 2;

            const bRank =
              bName.startsWith(
                normalizedQuery
              )
                ? 0
                : bAliasMatch
                  ? 1
                  : 2;

            return (
              aRank -
                bRank ||
              a.name.localeCompare(
                b.name,
                "cs",
                {
                  sensitivity:
                    "base",
                }
              )
            );
          }
        )
        .slice(
          0,
          30
        );

    return NextResponse.json(
      {
        breweries,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }

  if (
    type === "brand"
  ) {
    if (
      !breweryId &&
      query.length < 3
    ) {
      return NextResponse.json(
        {
          breweries: [],
          brandsByBrewery:
            [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    let brandIds:
      number[] =
      [];

    if (
      query.length >= 3
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from("brands")
          .select(
            "id, name"
          )
          .ilike(
            "name",
            `%${query}%`
          )
          .limit(
            30
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      brandIds =
        (
          data ?? []
        ).map(
          (brand) =>
            brand.id
        );
    }

    let linksQuery =
      supabase
        .from(
          "brewery_brands"
        )
        .select(
          "brewery_id, brand_id, brands (id, name)"
        )
        .limit(
          60
        );

    if (breweryId) {
      linksQuery =
        linksQuery.eq(
          "brewery_id",
          breweryId
        );
    }

    if (
      brandIds.length > 0
    ) {
      linksQuery =
        linksQuery.in(
          "brand_id",
          brandIds
        );
    } else if (
      query.length >= 3
    ) {
      return NextResponse.json(
        {
          breweries: [],
          brandsByBrewery:
            [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    const {
      data: links,
      error: linksError,
    } =
      await linksQuery;

    if (linksError) {
      throw new Error(
        linksError.message
      );
    }

    const breweryIds =
      [
        ...new Set(
          (
            links ?? []
          ).map(
            (link) =>
              link.brewery_id
          )
        ),
      ];

    let breweries:
      {
        id: number;
        name: string;
        country: string | null;
        aliases: string[];
      }[] =
      [];

    if (
      breweryIds.length > 0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "breweries"
          )
          .select(
            "id, name, country, closed_year"
          )
          .in(
            "id",
            breweryIds
          )
          .is(
            "closed_year",
            null
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      breweries =
        (
          data ?? []
        ).map(
          (brewery) => ({
            id:
              brewery.id,
            name:
              brewery.name,
            country:
              brewery.country,
            aliases: [],
          })
        );
    }

    const openBreweryIds =
      new Set(
        breweries.map(
          (brewery) =>
            brewery.id
        )
      );

    const normalizedQuery =
      normalizeText(
        query
      );

    const brandsByBrewery =
      (
        links ?? []
      )
        .flatMap(
          (link) => {
            if (
              !openBreweryIds.has(
                link.brewery_id
              )
            ) {
              return [];
            }

            const brand =
              singleRelation(
                link.brands
              );

            if (
              !brand
            ) {
              return [];
            }

            if (
              normalizedQuery &&
              !normalizeText(
                brand.name
              ).includes(
                normalizedQuery
              )
            ) {
              return [];
            }

            return [
              {
                breweryId:
                  link.brewery_id,
                brand,
              },
            ];
          }
        )
        .sort(
          (a, b) =>
            a.brand.name.localeCompare(
              b.brand.name,
              "cs",
              {
                sensitivity:
                  "base",
              }
            )
        )
        .slice(
          0,
          40
        );

    return NextResponse.json(
      {
        breweries,
        brandsByBrewery,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      error:
        "Unsupported search type",
    },
    {
      status: 400,
    }
  );
}
