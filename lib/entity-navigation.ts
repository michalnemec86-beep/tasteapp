/** Names open their object or catalogue; numeric controls keep their analytics context. */
export function getBeerHref(beerId: number | string, breweryId?: number | string | null) {
  return breweryId
    ? `/breweries/${breweryId}?beer=${beerId}&portfolio=all#beer-${beerId}`
    : `/beers/${beerId}`;
}

export function getBrandHref(brandId: number | string, breweryId?: number | string | null) {
  return breweryId
    ? `/breweries/${breweryId}?brand=${brandId}&portfolio=all#brand-${brandId}`
    : `/brands/${brandId}`;
}

export function getStyleHref(styleId: number | string) {
  return `/beers?style=${encodeURIComponent(String(styleId))}`;
}

export function getHopHref(hopId: number | string) {
  return `/beers?hop=${encodeURIComponent(String(hopId))}`;
}

export function getCountryHref(country: string) {
  return `/stats/country/${encodeURIComponent(country)}`;
}

export function getRankingEntityHref(title: string, item: { id: number | string; name: string }) {
  switch (title) {
    case "Piva": return getBeerHref(item.id);
    case "Značky": return getBrandHref(item.id);
    case "Pivovary": return `/breweries/${item.id}`;
    case "Pivní styly": return getStyleHref(item.id);
    case "Chmely": return getHopHref(item.id);
    case "Státy": return getCountryHref(item.name);
    default: return null;
  }
}

export const beerHref = getBeerHref;
export const brandHref = getBrandHref;
export const styleHref = getStyleHref;
export const hopHref = getHopHref;
export const countryHref = getCountryHref;
