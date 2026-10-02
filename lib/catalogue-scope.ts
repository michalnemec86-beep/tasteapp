type Relation<T> = T | T[] | null | undefined;
type Style = { id: number };
type HopRow = { hops: Relation<{ id: number }> };
type Parameters = {
  beer_styles: Relation<Style>;
  beer_hops?: HopRow[] | null;
  beer_version_hops?: HopRow[] | null;
};
type Beer = Parameters & {
  id: number;
  beer_versions?: (Parameters & { is_current: boolean })[] | null;
};
export type CatalogueScope = { styleId?: number | null; hopId?: number | null; beerId?: number | null };
const one = <T,>(value: Relation<T>): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

function matchesParameters(parameters: Parameters, scope: CatalogueScope) {
  return (!scope.styleId || one(parameters.beer_styles)?.id === scope.styleId) &&
    (!scope.hopId || (parameters.beer_version_hops ?? parameters.beer_hops ?? []).some(row => one(row.hops)?.id === scope.hopId));
}

/** Combined criteria must occur together in a single version, never across different years. */
export function getCatalogueMatch(beer: Beer, scope: CatalogueScope) {
  if (scope.beerId && beer.id !== scope.beerId) return { matches: false, historicalOnly: false };
  const versions = beer.beer_versions ?? [];
  const current = versions.find(version => version.is_current);
  const currentMatches = matchesParameters(current ? { ...current, beer_styles: one(current.beer_styles) ?? beer.beer_styles } : beer, scope);
  const historicalMatches = versions.some(version => !version.is_current && matchesParameters({ ...version, beer_styles: one(version.beer_styles) ?? beer.beer_styles }, scope));
  return { matches: currentMatches || historicalMatches, historicalOnly: !currentMatches && historicalMatches };
}
