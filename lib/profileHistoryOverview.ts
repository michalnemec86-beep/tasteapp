import type {
  ProfileActivityPoint,
  ProfileStats,
} from "@/lib/profileStats";

type OverviewBrewery = {
  id: number;
  country: string | null;
};

type OverviewBeer = {
  id: number;
  brand_id: number | null;
  brewery_id: number | null;
  style_id: number | null;
  breweries: OverviewBrewery | null;
};

type OverviewVersion = {
  id: number;
  brewery_id: number | null;
  style_id: number | null;
  breweries: OverviewBrewery | null;
};

export type ProfileHistoryOverviewRow = {
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  beer_version_id: number | null;
  beers: OverviewBeer | null;
  beer_versions: OverviewVersion | null;
};

function normalizeCountry(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function emptyNumericSummary() {
  return {
    average: null,
    min: null,
    max: null,
    count: 0,
  };
}

export function buildProfileHistoryOverview(
  rows: ProfileHistoryOverviewRow[],
  uniqueHopCount: number
): ProfileStats {
  const beerIds = new Set<number>();
  const brandIds = new Set<number>();
  const breweryIds = new Set<number>();
  const styleIds = new Set<number>();
  const countries = new Set<string>();
  const monthly = new Map<string, number>();
  const yearly = new Map<string, number>();

  let totalQuantity = 0;
  const dates: string[] = [];

  for (const row of rows) {
    const quantity = row.quantity ?? 1;
    totalQuantity += quantity;

    const beer = row.beers;

    if (beer) {
      beerIds.add(beer.id);

      if (beer.brand_id != null) {
        brandIds.add(beer.brand_id);
      }

      const brewery =
        row.beer_versions?.breweries ??
        beer.breweries;

      if (brewery) {
        breweryIds.add(brewery.id);

        const country =
          brewery.country?.trim();

        if (country) {
          countries.add(
            normalizeCountry(country)
          );
        }
      }

      const styleId =
        row.beer_versions?.style_id ??
        beer.style_id;

      if (styleId != null) {
        styleIds.add(styleId);
      }
    }

    const date =
      row.tasted_on ??
      row.tasted_at?.slice(0, 10) ??
      null;

    if (!date) {
      continue;
    }

    dates.push(date);

    const month =
      date.slice(0, 7);
    const year =
      date.slice(0, 4);

    monthly.set(
      month,
      (monthly.get(month) ?? 0) +
        quantity
    );

    yearly.set(
      year,
      (yearly.get(year) ?? 0) +
        quantity
    );
  }

  dates.sort();

  const monthlyActivity:
    ProfileActivityPoint[] = [];

  if (dates.length > 0) {
    const first = dates[0];
    const last =
      dates[dates.length - 1];

    let year =
      Number(first.slice(0, 4));
    let month =
      Number(first.slice(5, 7));

    const lastYear =
      Number(last.slice(0, 4));
    const lastMonth =
      Number(last.slice(5, 7));

    while (
      year < lastYear ||
      (
        year === lastYear &&
        month <= lastMonth
      )
    ) {
      const key =
        `${year}-${String(month).padStart(2, "0")}`;

      monthlyActivity.push({
        key,
        count:
          monthly.get(key) ?? 0,
      });

      month += 1;

      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  const yearlyActivity =
    Array.from(
      yearly.entries()
    )
      .map(
        ([key, count]) => ({
          key,
          count,
        })
      )
      .sort(
        (a, b) =>
          a.key.localeCompare(
            b.key
          )
      );

  const mostActiveMonth =
    monthlyActivity.reduce<ProfileActivityPoint | null>(
      (best, item) =>
        !best ||
        item.count > best.count
          ? item
          : best,
      null
    );

  const mostActiveYear =
    yearlyActivity.reduce<ProfileActivityPoint | null>(
      (best, item) =>
        !best ||
        item.count > best.count
          ? item
          : best,
      null
    );

  const emptyNumeric =
    emptyNumericSummary();

  return {
    totalQuantity,
    uniqueBeers:
      beerIds.size,
    uniqueBrands:
      brandIds.size,
    uniqueBreweries:
      breweryIds.size,
    uniqueStyles:
      styleIds.size,
    uniqueCountries:
      countries.size,
    uniqueHops:
      uniqueHopCount,
    firstTasting:
      dates[0] ?? null,
    lastTasting:
      dates[
        dates.length - 1
      ] ?? null,
    monthlyActivity,
    yearlyActivity,
    mostActiveMonth,
    mostActiveYear,
    averagePerMonth:
      monthlyActivity.length > 0
        ? totalQuantity /
          monthlyActivity.length
        : 0,
    abv: {
      ...emptyNumeric,
    },
    ibu: {
      ...emptyNumeric,
    },
    plato: {
      ...emptyNumeric,
    },
    strongestBeer: null,
    bitterestBeer: null,
    highestPlatoBeer: null,
  };
}
