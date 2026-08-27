export type ProfileActivityPoint = {
  key: string;
  count: number;
};

export type ProfileNumericSummary = {
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
};

export type ProfileStats = {
  totalQuantity: number;
  uniqueBeers: number;
  uniqueBreweries: number;
  uniqueStyles: number;
  uniqueCountries: number;
  uniqueHops: number;
  firstTasting: string | null;
  lastTasting: string | null;
  monthlyActivity: ProfileActivityPoint[];
  yearlyActivity: ProfileActivityPoint[];
  mostActiveMonth: ProfileActivityPoint | null;
  mostActiveYear: ProfileActivityPoint | null;
  averagePerMonth: number;
  abv: ProfileNumericSummary;
  ibu: ProfileNumericSummary;
  plato: ProfileNumericSummary;
};

type ProfileStatsTasting = {
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  beers: {
    id: number;
    breweries: {
      id: number;
      country: string | null;
    } | null;
    beer_styles: {
      id: number;
    } | null;
    beer_hops:
      | {
          hops: {
            id: number;
          } | null;
        }[]
      | null;
  } | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getTastingDate(
  tasting: ProfileStatsTasting
) {
  return (
    tasting.tasted_on ??
    tasting.tasted_at?.slice(0, 10) ??
    null
  );
}

function buildNumericSummary(
  tastings: ProfileStatsTasting[],
  field: "abv" | "ibu" | "plato"
): ProfileNumericSummary {
  let weightedTotal = 0;
  let quantityTotal = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (const tasting of tastings) {
    const value = tasting[field];

    if (
      value == null ||
      !Number.isFinite(value)
    ) {
      continue;
    }

    const quantity =
      tasting.quantity ?? 1;

    weightedTotal +=
      value * quantity;

    quantityTotal += quantity;

    min =
      min == null
        ? value
        : Math.min(min, value);

    max =
      max == null
        ? value
        : Math.max(max, value);
  }

  return {
    average:
      quantityTotal > 0
        ? weightedTotal /
          quantityTotal
        : null,
    min,
    max,
    count: quantityTotal,
  };
}

export function buildProfileStats(
  tastings: ProfileStatsTasting[]
): ProfileStats {
  const uniqueBeerIds =
    new Set<number>();

  const uniqueBreweryIds =
    new Set<number>();

  const uniqueStyleIds =
    new Set<number>();

  const uniqueCountries =
    new Set<string>();

  const uniqueHopIds =
    new Set<number>();

  const monthlyMap =
    new Map<string, number>();

  const yearlyMap =
    new Map<string, number>();

  let totalQuantity = 0;

  const dates: string[] = [];

  for (const tasting of tastings) {
    const quantity =
      tasting.quantity ?? 1;

    totalQuantity += quantity;

    const beer =
      tasting.beers;

    if (beer) {
      uniqueBeerIds.add(
        beer.id
      );

      if (beer.breweries) {
        uniqueBreweryIds.add(
          beer.breweries.id
        );

        const country =
          beer.breweries.country?.trim();

        if (country) {
          uniqueCountries.add(
            normalizeText(country)
          );
        }
      }

      if (beer.beer_styles) {
        uniqueStyleIds.add(
          beer.beer_styles.id
        );
      }

      for (
        const beerHop
        of beer.beer_hops ?? []
      ) {
        if (beerHop.hops) {
          uniqueHopIds.add(
            beerHop.hops.id
          );
        }
      }
    }

    const date =
      getTastingDate(tasting);

    if (!date) {
      continue;
    }

    dates.push(date);

    const month =
      date.slice(0, 7);

    const year =
      date.slice(0, 4);

    monthlyMap.set(
      month,
      (monthlyMap.get(month) ?? 0) +
        quantity
    );

    yearlyMap.set(
      year,
      (yearlyMap.get(year) ?? 0) +
        quantity
    );
  }

  dates.sort();

  const monthlyActivity =
    Array.from(
      monthlyMap.entries()
    )
      .map(([key, count]) => ({
        key,
        count,
      }))
      .sort((a, b) =>
        a.key.localeCompare(b.key)
      );

  const yearlyActivity =
    Array.from(
      yearlyMap.entries()
    )
      .map(([key, count]) => ({
        key,
        count,
      }))
      .sort((a, b) =>
        a.key.localeCompare(b.key)
      );

  const mostActiveMonth =
    monthlyActivity.reduce<
      ProfileActivityPoint | null
    >(
      (best, item) =>
        !best ||
        item.count > best.count
          ? item
          : best,
      null
    );

  const mostActiveYear =
    yearlyActivity.reduce<
      ProfileActivityPoint | null
    >(
      (best, item) =>
        !best ||
        item.count > best.count
          ? item
          : best,
      null
    );

  let monthSpan = 0;

  if (dates.length > 0) {
    const first =
      dates[0];

    const last =
      dates[dates.length - 1];

    const firstYear =
      Number(first.slice(0, 4));

    const firstMonth =
      Number(first.slice(5, 7));

    const lastYear =
      Number(last.slice(0, 4));

    const lastMonth =
      Number(last.slice(5, 7));

    monthSpan =
      (lastYear - firstYear) * 12 +
      (lastMonth - firstMonth) +
      1;
  }

  return {
    totalQuantity,
    uniqueBeers:
      uniqueBeerIds.size,
    uniqueBreweries:
      uniqueBreweryIds.size,
    uniqueStyles:
      uniqueStyleIds.size,
    uniqueCountries:
      uniqueCountries.size,
    uniqueHops:
      uniqueHopIds.size,
    firstTasting:
      dates[0] ?? null,
    lastTasting:
      dates[dates.length - 1] ??
      null,
    monthlyActivity,
    yearlyActivity,
    mostActiveMonth,
    mostActiveYear,
    averagePerMonth:
      monthSpan > 0
        ? totalQuantity /
          monthSpan
        : 0,
    abv:
      buildNumericSummary(
        tastings,
        "abv"
      ),
    ibu:
      buildNumericSummary(
        tastings,
        "ibu"
      ),
    plato:
      buildNumericSummary(
        tastings,
        "plato"
      ),
  };
}
