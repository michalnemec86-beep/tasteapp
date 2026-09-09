import { getPackagingMeta } from "@/lib/packaging";

export type RankingItem = {
  id: number | string;
  name: string;
  count: number;
};

export type TasteStats = {
  breweries: RankingItem[];
  brands: RankingItem[];
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

type StatsTasting = {
  user_id: string;
  quantity: number | null;
  packaging: string | null;

  beer_versions?: {
    beer_styles: StatsStyle | null;
    beer_version_hops: StatsHopRow[] | null;
  } | null;

  beers: {
    id: number;
    name: string;

    breweries: {
      id: number;
      name: string;
      country: string | null;
    } | null;

    beer_styles: StatsStyle | null;

    beer_hops: StatsHopRow[] | null;
  } | null;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addToRanking(
  map: Map<number | string, RankingItem>,
  id: number | string,
  name: string,
  amount = 1
) {
  const existing = map.get(id);

  if (existing) {
    existing.count += amount;
    return;
  }

  map.set(id, {
    id,
    name,
    count: amount,
  });
}

function sortRanking(
  map: Map<number | string, RankingItem>
) {
  return Array.from(map.values()).sort(
    (a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.name.localeCompare(
        b.name,
        "cs"
      );
    }
  );
}

export function buildTasteStats(
  tastings: StatsTasting[],
  userId?: string
): TasteStats {
  const breweryMap =
    new Map<number, RankingItem>();

  const brandMap =
    new Map<number, RankingItem>();

  const styleMap =
    new Map<number, RankingItem>();

  const countryMap =
    new Map<string, RankingItem>();

  const hopMap =
    new Map<number, RankingItem>();

  const packagingMap =
    new Map<string, RankingItem>();

  const filteredTastings = userId
    ? tastings.filter(
        (tasting) =>
          tasting.user_id === userId
      )
    : tastings;

  for (const tasting of filteredTastings) {
    const quantity =
      tasting.quantity ?? 1;

    const packaging =
      getPackagingMeta(
        tasting.packaging
      );

    if (packaging) {
      addToRanking(
        packagingMap,
        packaging.value,
        packaging.label,
        quantity
      );
    }

    const beer =
      tasting.beers;

    if (!beer) {
      continue;
    }

    // Verze receptu nikdy nezvyšuje počet unikátních piv.
    addToRanking(
      brandMap,
      beer.id,
      beer.name,
      quantity
    );

    if (beer.breweries) {
      addToRanking(
        breweryMap,
        beer.breweries.id,
        beer.breweries.name,
        quantity
      );

      const country =
        beer.breweries.country?.trim();

      if (country) {
        addToRanking(
          countryMap,
          normalizeText(country),
          country,
          quantity
        );
      }
    }

    // Historická verze má přednost před dnešním katalogem.
    const style =
      tasting.beer_versions
        ?.beer_styles ??
      beer.beer_styles;

    if (style) {
      addToRanking(
        styleMap,
        style.id,
        style.name,
        quantity
      );
    }

    const hopRows =
      tasting.beer_versions
        ?.beer_version_hops ??
      beer.beer_hops ??
      [];

    for (const hopRow of hopRows) {
      const hop = hopRow.hops;

      if (!hop) {
        continue;
      }

      addToRanking(
        hopMap,
        hop.id,
        hop.name,
        quantity
      );
    }
  }

  return {
    breweries: sortRanking(breweryMap),
    brands: sortRanking(brandMap),
    styles: sortRanking(styleMap),
    countries: sortRanking(countryMap),
    hops: sortRanking(hopMap),
    packaging: sortRanking(packagingMap),
  };
}