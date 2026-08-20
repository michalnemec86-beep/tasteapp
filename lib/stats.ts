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

type StatsTasting = {
  user_id: string;
  quantity: number | null;
  packaging: string | null;

  beers: {
    id: number;
    name: string;

    breweries: {
      id: number;
      name: string;
      country: string | null;
    } | null;

    beer_styles: {
      id: number;
      name: string;
    } | null;

    beer_hops:
      | {
          hops: {
            id: number;
            name: string;
          } | null;
        }[]
      | null;
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

    // ==================================================
    // PODÁNÍ / OBAL
    // ==================================================

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

    // ==================================================
    // ZNAČKA
    // ==================================================

    addToRanking(
      brandMap,
      beer.id,
      beer.name,
      quantity
    );

    // ==================================================
    // PIVOVAR + STÁT
    // ==================================================

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

    // ==================================================
    // STYL
    // ==================================================

    if (beer.beer_styles) {
      addToRanking(
        styleMap,
        beer.beer_styles.id,
        beer.beer_styles.name,
        quantity
      );
    }

    // ==================================================
    // CHMELY
    // ==================================================

    for (
      const beerHop
      of beer.beer_hops ?? []
    ) {
      const hop =
        beerHop.hops;

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
    breweries:
      sortRanking(
        breweryMap
      ),

    brands:
      sortRanking(
        brandMap
      ),

    styles:
      sortRanking(
        styleMap
      ),

    countries:
      sortRanking(
        countryMap
      ),

    hops:
      sortRanking(
        hopMap
      ),

    packaging:
      sortRanking(
        packagingMap
      ),
  };
}