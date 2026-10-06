import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  filterBeerCatalogItems,
  getBeerCatalogFacets,
  type BeerCatalogFacets,
  type BeerCatalogFilterMode,
  type BeerCatalogItem,
  type BeerCatalogSortMode,
  type BeerCatalogSummary,
} from "@/lib/beer-catalog-page";
import {
  isBeerAvailableForTasting,
} from "@/lib/beerPortfolio";
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

type BreweryRef = {
  id: number;
  name: string;
  country:
    | string
    | null;
};

type StyleRef = {
  id: number;
  name: string;
};

type HopRef = {
  id: number;
  name: string;
};

type IndexBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  brands: Relation<{
    id: number;
    name: string;
  }>;
  breweries:
    Relation<BreweryRef>;
  beer_styles:
    Relation<StyleRef>;
  beer_hops:
    | Array<{
        hops:
          Relation<HopRef>;
      }>
    | null;
  beer_versions:
    | Array<{
        id: number;
        is_current: boolean;
        plato:
          | number
          | null;
        abv:
          | number
          | null;
        breweries:
          Relation<BreweryRef>;
        beer_styles:
          Relation<StyleRef>;
        beer_version_hops:
          | Array<{
              hops:
                Relation<HopRef>;
            }>
          | null;
      }>
    | null;
};

type DetailBeer =
  IndexBeer & {
    ibu: number | null;
    is_non_alcoholic:
      | boolean
      | null;
    portfolio_status:
      | string
      | null;
    breweries: Relation<
      BreweryRef & {
        closed_year:
          | number
          | null;
      }
    >;
    beer_versions:
      | Array<
          NonNullable<
            IndexBeer[
              "beer_versions"
            ]
          >[number] & {
            ibu:
              | number
              | null;
          }
        >
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
    (
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

async function loadIndexRows(
  supabase: SupabaseClient,
  selectedIds:
    | number[]
    | null
) {
  if (
    selectedIds &&
    selectedIds.length === 0
  ) {
    return [] as IndexBeer[];
  }

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
              brands (
                id,
                name
              ),
              breweries (
                id,
                name,
                country
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

  return rows as unknown as
    IndexBeer[];
}

function toIndexItem(
  beer: IndexBeer,
  scope: CatalogueScope,
  totalByBeer:
    Map<number, number>,
  mineByBeer:
    Map<number, number>
): BeerCatalogItem {
  const match =
    getCatalogueMatch(
      beer,
      scope
    );

  const current =
    beer.beer_versions
      ?.find(
        (version) =>
          version.is_current
      ) ??
    null;

  const brewery =
    one(
      current?.breweries
    ) ??
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
        ): hop is HopRef =>
          Boolean(hop)
      );

  const brand =
    one(
      beer.brands
    );

  const plato =
    current?.plato ??
    beer.plato;

  const abv =
    current?.abv ??
    beer.abv;

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
      plato,
      abv,
    });

  return {
    historicalMatch:
      match.historicalOnly,
    id: beer.id,
    name: beer.name,
    brand,
    brewery,
    style,
    plato,
    abv,
    ibu: null,
    isNonAlcoholic:
      false,
    canTaste: false,
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
  };
}

async function loadDetailedRows(
  supabase: SupabaseClient,
  ids: number[]
) {
  if (
    ids.length === 0
  ) {
    return [] as DetailBeer[];
  }

  const rows =
    await fetchCatalogueRows(
      (
        from,
        to,
        selectedIds
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

        if (selectedIds) {
          query =
            query.in(
              "id",
              selectedIds
            );
        }

        return query
          .order("id")
          .range(
            from,
            to
          );
      },
      ids
    );

  return rows as unknown as
    DetailBeer[];
}

function mergeDetail(
  detail: DetailBeer,
  indexItem: BeerCatalogItem
): BeerCatalogItem {
  const current =
    detail.beer_versions
      ?.find(
        (version) =>
          version.is_current
      ) ??
    null;

  const brewery =
    one(
      current?.breweries
    ) ??
    one(
      detail.breweries
    );

  const identityBrewery =
    one(
      detail.breweries
    );

  const style =
    one(
      current?.beer_styles
    ) ??
    one(
      detail.beer_styles
    );

  const hopRows =
    current
      ? current
          .beer_version_hops ??
        []
      : detail.beer_hops ??
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
        ): hop is HopRef =>
          Boolean(hop)
      );

  const brand =
    one(
      detail.brands
    );

  return {
    ...indexItem,
    brand,
    brewery,
    style,
    plato:
      current?.plato ??
      detail.plato,
    abv:
      current?.abv ??
      detail.abv,
    ibu:
      current?.ibu ??
      detail.ibu,
    isNonAlcoholic:
      Boolean(
        detail.is_non_alcoholic
      ),
    canTaste:
      Boolean(
        brand &&
        identityBrewery
      ) &&
      isBeerAvailableForTasting(
        detail.portfolio_status,
        identityBrewery
          ?.closed_year
      ),
    hops,
  };
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
  const [
    indexRows,
    tastingCounts,
  ] =
    await Promise.all([
      loadIndexRows(
        supabase,
        selectedIds
      ),
      selectedIds &&
      selectedIds.length ===
        0
        ? Promise.resolve({
            totalByBeer:
              new Map<
                number,
                number
              >(),
            mineByBeer:
              new Map<
                number,
                number
              >(),
          })
        : loadTastingCounts(
            supabase,
            userId
          ),
    ]);

  const scopedItems =
    indexRows
      .filter(
        (beer) =>
          getCatalogueMatch(
            beer,
            scope
          ).matches
      )
      .map(
        (beer) =>
          toIndexItem(
            beer,
            scope,
            tastingCounts.totalByBeer,
            tastingCounts.mineByBeer
          )
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

  const pageIndexItems =
    filtered.slice(
      offset,
      offset + limit
    );

  const detailRows =
    await loadDetailedRows(
      supabase,
      pageIndexItems.map(
        (beer) =>
          beer.id
      )
    );

  const detailById =
    new Map(
      detailRows.map(
        (beer) => [
          beer.id,
          beer,
        ]
      )
    );

  const items =
    pageIndexItems.flatMap(
      (indexItem) => {
        const detail =
          detailById.get(
            indexItem.id
          );

        return detail
          ? [
              mergeDetail(
                detail,
                indexItem
              ),
            ]
          : [];
      }
    );

  return {
    items,
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
