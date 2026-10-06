import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  fetchCatalogueRows,
} from "@/lib/catalogue-news";
import {
  getCatalogueMatch,
  type CatalogueScope,
} from "@/lib/catalogue-scope";
import {
  fetchAllRows,
} from "@/lib/fetch-all-rows";
import {
  getBeerReferenceStatus,
} from "@/lib/referenceStatus";
import {
  isBeerAvailableForTasting,
} from "@/lib/beerPortfolio";
import {
  filterBeerCatalogItems,
  getBeerCatalogFacets,
  type BeerCatalogFacets,
  type BeerCatalogFilterMode,
  type BeerCatalogItem,
  type BeerCatalogSortMode,
  type BeerCatalogSummary,
} from "@/lib/beer-catalog-page";

type Relation<T> =
  | T
  | T[]
  | null;

function one<T>(
  value:
    | Relation<T>
    | undefined
): T | null {
  return Array.isArray(
    value
  )
    ? value[0] ?? null
    : value ?? null;
}

type RawBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  is_non_alcoholic:
    | boolean
    | null;
  is_catalog:
    | boolean
    | null;
  portfolio_status:
    | string
    | null;
  brands: Relation<{
    id: number;
    name: string;
  }>;
  breweries: Relation<{
    id: number;
    name: string;
    country:
      | string
      | null;
    closed_year:
      | number
      | null;
  }>;
  beer_styles: Relation<{
    id: number;
    name: string;
  }>;
  beer_hops:
    | Array<{
        hops: Relation<{
          id: number;
          name: string;
        }>;
      }>
    | null;
  beer_versions:
    | Array<{
        id: number;
        is_current:
          | boolean
          | null;
        plato:
          | number
          | null;
        abv:
          | number
          | null;
        ibu:
          | number
          | null;
        breweries: Relation<{
          id: number;
          name: string;
          country:
            | string
            | null;
        }>;
        beer_styles: Relation<{
          id: number;
          name: string;
        }>;
        beer_version_hops:
          | Array<{
              hops: Relation<{
                id: number;
                name: string;
              }>;
            }>
          | null;
      }>
    | null;
};

type TastingCountRow = {
  beer_id:
    | number
    | null;
  user_id: string;
  quantity:
    | number
    | null;
};

export type BeerCatalogPageResult = {
  items: BeerCatalogItem[];
  matchedCount: number;
  summary: BeerCatalogSummary;
  facets: BeerCatalogFacets;
};

async function loadTastingCounts(
  supabase: SupabaseClient,
  userId: string
) {
  const rows =
    await fetchAllRows(
      (from, to) =>
        supabase
          .from(
            "tastings"
          )
          .select(
            "beer_id, user_id, quantity"
          )
          .order("id")
          .range(
            from,
            to
          )
    ) as TastingCountRow[];

  const totalByBeer =
    new Map<
      number,
      number
    >();

  const mineByBeer =
    new Map<
      number,
      number
    >();

  for (
    const row of rows
  ) {
    if (
      row.beer_id == null
    ) {
      continue;
    }

    const quantity =
      row.quantity ?? 1;

    totalByBeer.set(
      row.beer_id,
      (
        totalByBeer.get(
          row.beer_id
        ) ??
        0
      ) + quantity
    );

    if (
      row.user_id ===
      userId
    ) {
      mineByBeer.set(
        row.beer_id,
        (
          mineByBeer.get(
            row.beer_id
          ) ??
          0
        ) + quantity
      );
    }
  }

  return {
    totalByBeer,
    mineByBeer,
  };
}

export async function loadBeerCatalogOverview(
  supabase: SupabaseClient,
  userId: string
): Promise<BeerCatalogSummary> {
  const [
    beerCountResult,
    tastingRows,
  ] =
    await Promise.all([
      supabase
        .from("beers")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        ),
      fetchAllRows(
        (from, to) =>
          supabase
            .from(
              "tastings"
            )
            .select(
              "beer_id, user_id"
            )
            .order("id")
            .range(
              from,
              to
            )
      ),
    ]);

  if (
    beerCountResult.error
  ) {
    throw new Error(
      beerCountResult.error.message
    );
  }

  const tasted =
    new Set<number>();

  const mine =
    new Set<number>();

  for (
    const row of
    tastingRows
  ) {
    if (
      row.beer_id == null
    ) {
      continue;
    }

    tasted.add(
      row.beer_id
    );

    if (
      row.user_id ===
      userId
    ) {
      mine.add(
        row.beer_id
      );
    }
  }

  return {
    total:
      beerCountResult.count ??
      0,
    tasted:
      tasted.size,
    mine:
      mine.size,
    breweries: 0,
    countries: 0,
  };
}

async function loadScopedItems(
  supabase: SupabaseClient,
  userId: string,
  scope: CatalogueScope,
  selectedIds:
    | number[]
    | null
) {
  const rows =
    await fetchCatalogueRows(
      (
        from,
        to,
        ids
      ) => {
        let query =
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
              ),
              beer_versions (
                id,
                is_current,
                plato,
                abv,
                ibu,
                breweries!beer_versions_brewery_id_fkey (
                  id,
                  name,
                  country
                ),
                beer_styles (
                  id,
                  name
                ),
                beer_version_hops (
                  hops (
                    id,
                    name
                  )
                )
              )
            `);

        if (ids) {
          query =
            query.in(
              "id",
              ids
            );
        }

        return query
          .order(
            "name",
            {
              ascending:
                true,
            }
          )
          .order("id")
          .range(
            from,
            to
          );
      },
      selectedIds
    );

  if (
    rows.length === 0
  ) {
    return [] as BeerCatalogItem[];
  }

  const {
    totalByBeer,
    mineByBeer,
  } =
    await loadTastingCounts(
      supabase,
      userId
    );

  return rows
    .filter(
      (raw) =>
        getCatalogueMatch(
          raw,
          scope
        ).matches
    )
    .map((raw) => {
      const beer =
        raw as RawBeer;

      const match =
        getCatalogueMatch(
          beer,
          scope
        );

      const current =
        beer.beer_versions
          ?.find(
            (version) =>
              Boolean(
                version.is_current
              )
          ) ??
        null;

      const brewery =
        one(
          current?.breweries
        ) ??
        one(
          beer.breweries
        );

      const identityBrewery =
        one(
          beer.breweries
        );

      const style =
        one(
          current?.beer_styles
        ) ??
        one(
          beer.beer_styles
        );

      const hopRows =
        current
          ? current
              .beer_version_hops ??
            []
          : beer.beer_hops ??
            [];

      const hops =
        hopRows
          .map(
            (row) =>
              one(
                row.hops
              )
          )
          .filter(
            (
              hop
            ): hop is {
              id: number;
              name: string;
            } =>
              Boolean(hop)
          );

      const brand =
        one(
          beer.brands
        );

      const referenceStatus =
        getBeerReferenceStatus({
          name: beer.name,
          brandId:
            brand?.id ??
            null,
          breweryId:
            brewery?.id ??
            null,
          styleId:
            style?.id ??
            null,
          plato:
            current?.plato ??
            beer.plato,
          abv:
            current?.abv ??
            beer.abv,
        });

      return {
        historicalMatch:
          match.historicalOnly,
        id: beer.id,
        name: beer.name,
        brand,
        brewery,
        style,
        plato:
          current?.plato ??
          beer.plato,
        abv:
          current?.abv ??
          beer.abv,
        ibu:
          current?.ibu ??
          beer.ibu,
        isNonAlcoholic:
          Boolean(
            beer.is_non_alcoholic
          ),
        canTaste:
          Boolean(
            brand &&
            identityBrewery
          ) &&
          isBeerAvailableForTasting(
            beer.portfolio_status,
            identityBrewery
              ?.closed_year
          ),
        hops,
        totalQuantity:
          totalByBeer.get(
            beer.id
          ) ??
          0,
        myQuantity:
          mineByBeer.get(
            beer.id
          ) ??
          0,
        referenceReady:
          referenceStatus.ready,
        referenceMissing:
          referenceStatus.missing,
      } satisfies
        BeerCatalogItem;
    });
}

function summarize(
  beers: BeerCatalogItem[]
): BeerCatalogSummary {
  return {
    total:
      beers.length,
    tasted:
      beers.filter(
        (beer) =>
          beer.totalQuantity >
          0
      ).length,
    mine:
      beers.filter(
        (beer) =>
          beer.myQuantity > 0
      ).length,
    breweries:
      new Set(
        beers
          .map(
            (beer) =>
              beer.brewery?.id
          )
          .filter(
            (
              value
            ): value is number =>
              value != null
          )
      ).size,
    countries:
      new Set(
        beers
          .map(
            (beer) =>
              beer.brewery
                ?.country
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      ).size,
  };
}

export async function loadBeerCatalogPage({
  supabase,
  userId,
  scope,
  selectedIds,
  filter,
  sort,
  search,
  country,
  letter,
  offset,
  limit,
}: {
  supabase: SupabaseClient;
  userId: string;
  scope: CatalogueScope;
  selectedIds:
    | number[]
    | null;
  filter: BeerCatalogFilterMode;
  sort: BeerCatalogSortMode;
  search: string;
  country: string;
  letter: string;
  offset: number;
  limit: number;
}): Promise<BeerCatalogPageResult> {
  const scopedItems =
    await loadScopedItems(
      supabase,
      userId,
      scope,
      selectedIds
    );

  const filtered =
    filterBeerCatalogItems(
      scopedItems,
      {
        filter,
        sort,
        search,
        country,
        letter,
      }
    );

  return {
    items:
      filtered.slice(
        offset,
        offset + limit
      ),
    matchedCount:
      filtered.length,
    summary:
      summarize(
        scopedItems
      ),
    facets:
      getBeerCatalogFacets(
        scopedItems
      ),
  };
}
