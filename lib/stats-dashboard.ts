import {
  getCountryFlag,
  normalizeCountryName,
} from "@/lib/country-flags";
import type {
  RankingItem,
  TasteStats,
} from "@/lib/stats";

export type StatsDashboardScope = {
  units: number;
  stats: TasteStats;
};

export type StatsDashboardLabels = {
  beer?: string;
  brand?: string;
  brewery?: string;
  style?: string;
  country?: string;
  hop?: string;
};

export type StatsDashboardPayload = {
  primary: StatsDashboardScope;
  comparison: StatsDashboardScope;
  personal: StatsDashboardScope;
  labels: StatsDashboardLabels;
};

const EMPTY_STATS: TasteStats = {
  beers: [],
  brands: [],
  breweries: [],
  styles: [],
  countries: [],
  hops: [],
  packaging: [],
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function parseRankingItems(
  value: unknown,
  country = false
): RankingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const rawId = entry.id;
    const id =
      typeof rawId === "number" ||
      typeof rawId === "string"
        ? rawId
        : null;
    const count = Number(entry.count);

    if (
      id == null ||
      !Number.isFinite(count)
    ) {
      return [];
    }

    const name =
      typeof entry.name === "string"
        ? entry.name
        : "";
    const logoUrl =
      typeof entry.logoUrl === "string" &&
      entry.logoUrl.trim()
        ? entry.logoUrl
        : undefined;

    const item: RankingItem = {
      id:
        country && name
          ? normalizeCountryName(name)
          : id,
      name,
      count,
      ...(logoUrl
        ? { logoUrl }
        : {}),
    };

    if (country && name) {
      item.flag = getCountryFlag(name);
    }

    return [item];
  });
}

function parseStats(
  value: unknown
): TasteStats {
  if (!isRecord(value)) {
    return {
      ...EMPTY_STATS,
    };
  }

  return {
    beers: parseRankingItems(value.beers),
    brands: parseRankingItems(value.brands),
    breweries: parseRankingItems(value.breweries),
    styles: parseRankingItems(value.styles),
    countries: parseRankingItems(
      value.countries,
      true
    ),
    hops: parseRankingItems(value.hops),
    packaging: parseRankingItems(
      value.packaging
    ),
  };
}

function parseScope(
  value: unknown
): StatsDashboardScope {
  if (!isRecord(value)) {
    return {
      units: 0,
      stats: {
        ...EMPTY_STATS,
      },
    };
  }

  const units = Number(value.units);

  return {
    units:
      Number.isFinite(units)
        ? units
        : 0,
    stats: parseStats(value.stats),
  };
}

function parseLabels(
  value: unknown
): StatsDashboardLabels {
  if (!isRecord(value)) {
    return {};
  }

  const labels: StatsDashboardLabels = {};

  for (const key of [
    "beer",
    "brand",
    "brewery",
    "style",
    "country",
    "hop",
  ] as const) {
    const item = value[key];

    if (
      typeof item === "string" &&
      item.trim()
    ) {
      labels[key] = item;
    }
  }

  return labels;
}

export function parseStatsDashboardPayload(
  value: unknown
): StatsDashboardPayload {
  if (!isRecord(value)) {
    throw new Error(
      "Statistická data mají neplatný formát."
    );
  }

  return {
    primary: parseScope(value.primary),
    comparison: parseScope(
      value.comparison
    ),
    personal: parseScope(value.personal),
    labels: parseLabels(value.labels),
  };
}
