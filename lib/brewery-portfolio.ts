import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isHistoricalBeerPortfolioStatus } from "@/lib/beerPortfolio";
import { getBeerReferenceStatus } from "@/lib/referenceStatus";

type Brand = { id: number; name: string };
type Relation<T> = T | T[] | null | undefined;
const one = <T,>(value: Relation<T>): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

// Most brewery datasets fit on one page. Only fan out once a full page proves
// more rows may exist; never cap quantities at the API's per-request limit.
async function loadRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, maxRows = Number.POSITIVE_INFINITY): Promise<T[]> {
  const pageSize = 500;
  const first = await fetchPage(0, Math.min(pageSize, maxRows) - 1);
  if (first.error) throw new Error(first.error.message);
  const rows = first.data ?? [];
  if (rows.length < pageSize || maxRows <= pageSize) return rows;
  const rest = await fetchAllRows((from, to) => fetchPage(from + pageSize, to + pageSize), pageSize, maxRows - pageSize);
  return [...rows, ...rest];
}

export type BreweryBeerIndex = {
  id: number;
  portfolio_status: string | null;
  brands: Relation<Brand>;
  isCommissionedForThisBrewery?: boolean;
};

type Options = {
  breweryId: number;
  closedYear: number | null;
  userId: string;
  adminView: boolean;
  portfolio: "current" | "all" | "historical";
  beerId: number | null;
  brandId: number | null;
};

export function selectPortfolioIds(index: BreweryBeerIndex[], options: Pick<Options, "portfolio" | "closedYear" | "beerId" | "brandId">) {
  return index.filter(beer => {
    // A direct link loads only its object context, not the whole history.
    if (options.beerId) return beer.id === options.beerId;
    if (options.brandId) return one(beer.brands)?.id === options.brandId;
    const historical = options.closedYear != null || isHistoricalBeerPortfolioStatus(beer.portfolio_status);
    return options.portfolio === "all" || (options.portfolio === "historical" ? historical : !historical);
  }).map(beer => beer.id);
}

/** Lightweight totals include history; recipe/row data is fetched only for the chosen view. */
export async function loadBreweryPortfolio(supabase: SupabaseClient, index: BreweryBeerIndex[], options: Options) {
  const uniqueIndex = [...new Map(index.map(beer => [beer.id, beer])).values()];
  const indexedIds = new Set(uniqueIndex.map(beer => beer.id));
  const ids = selectPortfolioIds(uniqueIndex, options);
  const contextualIds = new Set<number>();
  const contextBrands: Brand[] = [];

  if (options.brandId || (options.beerId && !indexedIds.has(options.beerId))) {
    const candidates = await loadRows((from, to) => {
      let query = supabase.from("beers").select("id, brewery_id, brands(id, name), beer_versions(brewery_id, brewed_for_brewery_id)");
      query = options.beerId ? query.eq("id", options.beerId) : query.eq("brand_id", options.brandId!);
      return query.order("id").range(from, to);
    }, options.beerId ? 1 : undefined);
    for (const beer of candidates) {
      const belongs = beer.brewery_id === options.breweryId || (beer.beer_versions ?? []).some(version => version.brewery_id === options.breweryId || version.brewed_for_brewery_id === options.breweryId);
      if (!belongs || indexedIds.has(beer.id)) continue;
      contextualIds.add(beer.id);
      ids.push(beer.id);
      const brand = one(beer.brands);
      if (brand) contextBrands.push(brand);
    }
  }

  const allIds = [...indexedIds, ...contextualIds];
  const editableBeerIds = ids.filter(id => !contextualIds.has(id) && options.closedYear == null
    && !isHistoricalBeerPortfolioStatus(uniqueIndex.find(beer => beer.id === id)?.portfolio_status));
  const [tastingTotalsResult, rows, editable] = await Promise.all([
    allIds.length
      ? supabase.rpc(
          "get_beer_tasting_totals",
          {
            p_beer_ids: allIds,
          }
        )
      : Promise.resolve({
          data: [],
          error: null,
        }),
    ids.length ? loadRows((from, to) => supabase.from("beers").select(`
      id, name, brewery_id, plato, abv, ibu, is_non_alcoholic, is_catalog, portfolio_status,
      brands(id, name), beer_styles(id, name), beer_hops(hops(id, name)),
      version_count:beer_versions(count),
      beer_versions(id, brewery_id, brewed_for_brewery_id, is_current, plato, abv, ibu, beer_styles(id, name), beer_version_hops(hops(id, name)))
    `).in("id", ids).eq("beer_versions.is_current", true).order("id").range(from, to), ids.length) : Promise.resolve([]),
    editableBeerIds.length && !options.adminView ? loadRows((from, to) => supabase.from("tastings")
      .select("id, beer_id").in("beer_id", editableBeerIds).eq("user_id", options.userId)
      .gte("tasted_on", "2026-09-01").order("id").range(from, to)) : Promise.resolve([]),
  ]);
  if (tastingTotalsResult.error) {
    throw new Error(
      tastingTotalsResult.error.message
    );
  }

  const editIds = new Set(editable.map(row => row.beer_id));
  const totals = new Map<number, { count: number; quantity: number }>();

  for (const row of tastingTotalsResult.data ?? []) {
    const beerId = Number(row.beer_id);

    if (!Number.isInteger(beerId) || beerId < 1) {
      continue;
    }

    totals.set(beerId, {
      count: Math.max(0, Number(row.tasting_count) || 0),
      quantity: Math.max(0, Number(row.quantity_total) || 0),
    });
  }

  const visibleBeers = rows.map(beer => {
    const brand = one(beer.brands);
    const current = beer.beer_versions?.find(version => version.is_current);
    const style = one(current?.beer_styles) ?? one(beer.beer_styles);
    const currentHops = (current?.beer_version_hops ?? []).map(row => one(row.hops)?.name).filter((name): name is string => Boolean(name));
    const fallbackHops = (beer.beer_hops ?? []).map(row => one(row.hops)?.name).filter((name): name is string => Boolean(name));
    const effectivePortfolioStatus = options.closedYear != null ? "historical" : beer.portfolio_status ?? "active";
    const total = totals.get(beer.id) ?? { count: 0, quantity: 0 };
    return {
      ...beer, brand,
      portfolioStatus: beer.portfolio_status ?? "active",
      effectivePortfolioStatus,
      isHistorical: isHistoricalBeerPortfolioStatus(effectivePortfolioStatus),
      isCommissionedForThisBrewery: uniqueIndex.find(row => row.id === beer.id)?.isCommissionedForThisBrewery ?? false,
      plato: current?.plato ?? beer.plato,
      abv: current?.abv ?? beer.abv,
      ibu: current?.ibu ?? beer.ibu,
      styleName: style?.name ?? "", styleId: style?.id ?? null,
      hopNames: currentHops.length ? currentHops : fallbackHops,
      versionCount: one(beer.version_count)?.count ?? beer.beer_versions?.length ?? 0,
      tastingCount: total.count, totalQuantity: total.quantity,
      canEdit: options.adminView || editIds.has(beer.id),
      referenceStatus: getBeerReferenceStatus({ name: beer.name, brandId: brand?.id ?? null,
        breweryId: current?.brewery_id ?? options.breweryId, styleId: style?.id ?? null,
        plato: current?.plato ?? beer.plato, abv: current?.abv ?? beer.abv }),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "cs", { sensitivity: "base" }));

  return {
    visibleBeers, contextualIds, contextBrands,
    totalBeerCount: uniqueIndex.length,
    consumedBeerCount: [...indexedIds].reduce((sum, id) => sum + (totals.get(id)?.quantity ?? 0), 0),
    brands: uniqueIndex.flatMap(beer => { const brand = one(beer.brands); return brand ? [brand] : []; }),
  };
}
