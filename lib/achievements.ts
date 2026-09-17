export const ACHIEVEMENTS_START_DATE = "2026-09-01";

export const ACHIEVEMENTS_LAUNCH_AT = new Date(
  "2026-09-01T00:00:00+02:00"
);

export type AchievementMetric =
  | "tastings"
  | "beers"
  | "breweries"
  | "brewery_of_day"
  | "styles"
  | "countries"
  | "hops";

export type AchievementSeries =
  | "beers"
  | "breweries"
  | "brewery_of_day"
  | "styles"
  | "countries"
  | "hops";

export type AchievementMedal =
  | "cloth"
  | "wood"
  | "bronze"
  | "silver"
  | "gold"
  | "diamond"
  | "master";

export type AchievementDefinition = {
  key: string;
  name: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
  series: AchievementSeries | null;
  seriesName: string | null;
  level: number | null;
  medal: AchievementMedal | null;
  medalName: string | null;
};

export type AchievementProgress = AchievementDefinition & {
  current: number;
  unlocked: boolean;
  progress: number;
};

type AchievementStyleRef = {
  id?: string | number | null;
} | null;

type AchievementHopRef = {
  hops?: {
    id?: string | number | null;
    name?: string | null;
  } | null;
};

export type AchievementTasting = {
  id?: string | number;
  tasted_on?: string | null;
  beer_versions?: {
    beer_styles?: AchievementStyleRef;
    beer_version_hops?: AchievementHopRef[] | null;
  } | null;
  beers?: {
    id?: string | number | null;
    breweries?: {
      id?: string | number | null;
      country?: string | null;
    } | null;
    beer_styles?: AchievementStyleRef;
    beer_hops?: AchievementHopRef[] | null;
  } | null;
};

type MedalDefinition = {
  medal: AchievementMedal;
  medalName: string;
};

const STANDARD_MEDALS: MedalDefinition[] = [
  { medal: "cloth", medalName: "Hadrová medaile" },
  { medal: "wood", medalName: "Dřevěná medaile" },
  { medal: "bronze", medalName: "Bronzová medaile" },
  { medal: "silver", medalName: "Stříbrná medaile" },
  { medal: "gold", medalName: "Zlatá medaile" },
  { medal: "diamond", medalName: "Diamantová medaile" },
  { medal: "master", medalName: "Mistrovská medaile" },
];

const COUNTRY_MEDALS: MedalDefinition[] = [
  STANDARD_MEDALS[0],
  STANDARD_MEDALS[1],
  STANDARD_MEDALS[2],
  STANDARD_MEDALS[3],
  STANDARD_MEDALS[4],
  STANDARD_MEDALS[6],
];

function createSeries({
  series,
  seriesName,
  targets,
  medals = STANDARD_MEDALS,
  unit,
}: {
  series: AchievementSeries;
  seriesName: string;
  targets: number[];
  medals?: MedalDefinition[];
  unit: string;
}): AchievementDefinition[] {
  if (targets.length !== medals.length) {
    throw new Error(
      `Achievement série ${series} nemá stejný počet met a medailí.`
    );
  }

  return targets.map((target, index) => {
    const medal = medals[index];

    return {
      key: `${series}_${target}`,
      name: `${seriesName} · ${medal.medalName}`,
      description: `Dosáhni ${target} ${unit}.`,
      icon: "◆",
      metric: series,
      target,
      series,
      seriesName,
      level: index + 1,
      medal: medal.medal,
      medalName: medal.medalName,
    };
  });
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "first_tasting",
    name: "První ochutnávka",
    description: "Zaznamenej svou první ochutnávku.",
    icon: "✦",
    metric: "tastings",
    target: 1,
    series: null,
    seriesName: null,
    level: null,
    medal: null,
    medalName: null,
  },

  ...createSeries({
    series: "beers",
    seriesName: "Pivní objevy",
    targets: [10, 25, 50, 100, 250, 500, 1000],
    unit: "různých piv",
  }),

  ...createSeries({
    series: "breweries",
    seriesName: "Pivovarský průzkumník",
    targets: [10, 25, 50, 100, 200, 350, 500],
    unit: "různých pivovarů",
  }),

  ...createSeries({
    series: "brewery_of_day",
    seriesName: "Lovec pivovarů dne",
    targets: [1, 3, 5, 10, 20, 40, 75],
    unit: "ochutnaných pivovarů dne",
  }),

  ...createSeries({
    series: "styles",
    seriesName: "Lovec stylů",
    targets: [5, 10, 20, 30, 50, 75, 100],
    unit: "různých pivních stylů",
  }),

  ...createSeries({
    series: "hops",
    seriesName: "Chmelový znalec",
    targets: [5, 10, 20, 35, 50, 75, 100],
    unit: "různých odrůd chmele",
  }),

  ...createSeries({
    series: "countries",
    seriesName: "Světoběžník",
    targets: [5, 10, 20, 30, 40, 50],
    medals: COUNTRY_MEDALS,
    unit: "různých zemí",
  }),
];

function isEligibleAchievementTasting(tasting: AchievementTasting) {
  const tastedOn = tasting.tasted_on?.slice(0, 10) ?? "";
  return tastedOn >= ACHIEVEMENTS_START_DATE;
}

export function buildAchievementProgress(
  tastings: AchievementTasting[],
  context: {
    breweryOfDayIds?: (string | number)[];
  } = {}
): AchievementProgress[] {
  const eligibleTastings = tastings.filter(isEligibleAchievementTasting);

  const beerIds = new Set<string | number>();
  const breweryIds = new Set<string | number>();
  const styleIds = new Set<string | number>();
  const countries = new Set<string>();
  const hopIds = new Set<string | number>();

  for (const tasting of eligibleTastings) {
    const beer = tasting.beers;
    if (!beer) continue;

    if (beer.id !== null && beer.id !== undefined) {
      beerIds.add(beer.id);
    }

    const brewery = beer.breweries;
    if (brewery?.id !== null && brewery?.id !== undefined) {
      breweryIds.add(brewery.id);
    }

    const country = normalizeCountry(brewery?.country);
    if (country) countries.add(country);

    const style = tasting.beer_versions?.beer_styles ?? beer.beer_styles;
    if (style?.id !== null && style?.id !== undefined) {
      styleIds.add(style.id);
    }

    const hopRows =
      tasting.beer_versions?.beer_version_hops ?? beer.beer_hops ?? [];

    for (const hopRow of hopRows) {
      const hop = hopRow.hops;
      if (hop?.id !== null && hop?.id !== undefined) {
        hopIds.add(hop.id);
      }
    }
  }

  const breweryOfDayIds = new Set(context.breweryOfDayIds ?? []);
  const breweryOfDayCount = [...breweryIds].filter((breweryId) =>
    breweryOfDayIds.has(breweryId)
  ).length;

  const metricValues: Record<AchievementMetric, number> = {
    tastings: eligibleTastings.length,
    beers: beerIds.size,
    breweries: breweryIds.size,
    brewery_of_day: breweryOfDayCount,
    styles: styleIds.size,
    countries: countries.size,
    hops: hopIds.size,
  };

  return ACHIEVEMENTS.map((achievement) => {
    const current = metricValues[achievement.metric];
    const unlocked = current >= achievement.target;
    const progress =
      achievement.target > 0
        ? Math.min(1, current / achievement.target)
        : 0;

    return {
      ...achievement,
      current,
      unlocked,
      progress,
    };
  });
}

export function getHighestUnlockedBySeries(
  progress: AchievementProgress[]
) {
  const highest = new Map<AchievementSeries, AchievementProgress>();

  for (const achievement of progress) {
    if (
      !achievement.unlocked ||
      !achievement.series ||
      achievement.level === null
    ) {
      continue;
    }

    const current = highest.get(achievement.series);
    if (!current || (current.level ?? 0) < achievement.level) {
      highest.set(achievement.series, achievement);
    }
  }

  return highest;
}

export function getAchievementByKey(key: string) {
  return ACHIEVEMENTS.find((achievement) => achievement.key === key) ?? null;
}

function normalizeCountry(country: string | null | undefined) {
  if (!country) return null;

  const normalized = country
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return normalized || null;
}
