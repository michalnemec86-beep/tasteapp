import { getPackagingMeta } from "@/lib/packaging";
import { getCountryFlag, normalizeCountryName } from "@/lib/country-flags";

export type RankingItem = {
  id: number | string;
  name: string;
  count: number;
  flag?: string;
  logoUrl?: string;
};

export type TasteStats = {
  beers: RankingItem[];
  brands: RankingItem[];
  breweries: RankingItem[];
  styles: RankingItem[];
  countries: RankingItem[];
  hops: RankingItem[];
  packaging: RankingItem[];
};

type StatsStyle = {
  id: number;
  name: string;
};

type StatsHopRow = {
  hops: {
    id: number;
    name: string;
  } | null;
};

type StatsBrewery = {
  id: number;
  name: string;
  country: string | null;
  logo_url?: string | null;
};

type StatsBrand = {
  id: number;
  name: string;
};

type StatsTasting = {
  user_id: string;
  quantity: number | null;
  packaging: string | null;

  beer_versions?: {
    breweries?: StatsBrewery | null;
    beer_styles: StatsStyle | null;
    beer_version_hops: StatsHopRow[] | null;
  } | null;

  beers: {
    id: number;
    name: string;
    brands?: StatsBrand | null;
    breweries: StatsBrewery | null;
    beer_styles: StatsStyle | null;
    beer_hops: StatsHopRow[] | null;
  } | null;
};

function addToRanking(
  map: Map<number | string, RankingItem>,
  id: number | string,
  name: string,
  amount = 1,
  flag?: string,
  logoUrl?: string
) {
  const existing = map.get(id);

  if (existing) {
    existing.count += amount;
    if (!existing.flag && flag) {
      existing.flag = flag;
    }
    if (!existing.logoUrl && logoUrl) {
      existing.logoUrl = logoUrl;
    }
    return;
  }

  map.set(id, {
    id,
    name,
    count: amount,
    ...(flag ? { flag } : {}),
    ...(logoUrl ? { logoUrl } : {}),
  });
}

function sortRanking(map: Map<number | string, RankingItem>) {
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.name.localeCompare(b.name, "cs");
  });
}

export function getTastingBrewery(tasting: StatsTasting) {
  return tasting.beer_versions?.breweries ?? tasting.beers?.breweries ?? null;
}

export function buildTasteStats(
  tastings: StatsTasting[],
  userId?: string
): TasteStats {
  const beerMap = new Map<number, RankingItem>();
  const brandMap = new Map<number, RankingItem>();
  const breweryMap = new Map<number, RankingItem>();
  const styleMap = new Map<number, RankingItem>();
  const countryMap = new Map<string, RankingItem>();
  const hopMap = new Map<number, RankingItem>();
  const packagingMap = new Map<string, RankingItem>();

  const filteredTastings = userId
    ? tastings.filter((tasting) => tasting.user_id === userId)
    : tastings;

  for (const tasting of filteredTastings) {
    const quantity = tasting.quantity ?? 1;
    const packaging = getPackagingMeta(tasting.packaging);

    if (packaging) {
      addToRanking(
        packagingMap,
        packaging.value,
        packaging.label,
        quantity
      );
    }

    const beer = tasting.beers;

    if (!beer) {
      continue;
    }

    addToRanking(beerMap, beer.id, beer.name, quantity);

    if (beer.brands) {
      addToRanking(
        brandMap,
        beer.brands.id,
        beer.brands.name,
        quantity
      );
    }

    // Kanonický výrobce patří konkrétní historické / současné
    // verzi piva. beer.brewery_id je pouze kompatibilní fallback.
    const brewery = getTastingBrewery(tasting);

    if (brewery) {
      addToRanking(
        breweryMap,
        brewery.id,
        brewery.name,
        quantity,
        undefined,
        brewery.logo_url ?? undefined
      );

      const country = brewery.country?.trim();

      if (country) {
        addToRanking(
          countryMap,
          normalizeCountryName(country),
          country,
          quantity,
          getCountryFlag(country)
        );
      }
    }

    // Historická verze má přednost před dnešním katalogem.
    const style = tasting.beer_versions?.beer_styles ?? beer.beer_styles;

    if (style) {
      addToRanking(styleMap, style.id, style.name, quantity);
    }

    const hopRows =
      tasting.beer_versions?.beer_version_hops ?? beer.beer_hops ?? [];

    for (const hopRow of hopRows) {
      const hop = hopRow.hops;

      if (!hop) {
        continue;
      }

      addToRanking(hopMap, hop.id, hop.name, quantity);
    }
  }

  return {
    beers: sortRanking(beerMap),
    brands: sortRanking(brandMap),
    breweries: sortRanking(breweryMap),
    styles: sortRanking(styleMap),
    countries: sortRanking(countryMap),
    hops: sortRanking(hopMap),
    packaging: sortRanking(packagingMap),
  };
}
