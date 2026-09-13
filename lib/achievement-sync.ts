import {
  createClient,
} from "@/lib/supabase/server";

import {
  ACHIEVEMENTS,
  getAchievementByKey,
  type AchievementDefinition,
  type AchievementMetric,
  type AchievementSeries,
} from "@/lib/achievements";

type AchievementMetricSnapshot =
  Record<AchievementMetric, number>;

type AchievementMetricsRow = {
  current_tastings: number | string | null;
  current_beers: number | string | null;
  current_breweries: number | string | null;
  current_brewery_of_day: number | string | null;
  current_styles: number | string | null;
  current_countries: number | string | null;
  current_hops: number | string | null;
  historical_tastings: number | string | null;
  historical_beers: number | string | null;
  historical_breweries: number | string | null;
  historical_styles: number | string | null;
  historical_countries: number | string | null;
  historical_hops: number | string | null;
};

function asNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getHighestUnlockedBySeries(
  metrics: AchievementMetricSnapshot
) {
  const highest =
    new Map<
      AchievementSeries,
      AchievementDefinition
    >();

  for (const achievement of ACHIEVEMENTS) {
    if (
      !achievement.series ||
      achievement.level === null ||
      metrics[achievement.metric] <
        achievement.target
    ) {
      continue;
    }

    const current =
      highest.get(
        achievement.series
      );

    if (
      !current ||
      (
        current.level ?? 0
      ) < achievement.level
    ) {
      highest.set(
        achievement.series,
        achievement
      );
    }
  }

  return highest;
}

function getUnlockedKeys(
  metrics: AchievementMetricSnapshot
) {
  return new Set(
    ACHIEVEMENTS
      .filter(
        (achievement) =>
          metrics[achievement.metric] >=
          achievement.target
      )
      .map(
        (achievement) =>
          achievement.key
      )
  );
}

// ==================================================
// SYNCHRONIZACE ODZNAKŮ UŽIVATELE
//
// Výpočty metrik probíhají přímo v PostgreSQL přes
// get_achievement_metrics(). Do aplikace se vrací jen
// agregované počty místo stovek kompletních tastingů.
// ==================================================

export async function syncUserAchievements(
  userId: string
) {
  const supabase =
    await createClient();

  const {
    data: metricRows,
    error: metricsError,
  } = await supabase.rpc(
    "get_achievement_metrics",
    {
      target_user_id:
        userId,
    }
  );

  if (metricsError) {
    throw new Error(
      metricsError.message
    );
  }

  const row =
    (
      metricRows?.[0] ??
      null
    ) as AchievementMetricsRow | null;

  if (!row) {
    throw new Error(
      "Nepodařilo se načíst metriky achievementů."
    );
  }

  const currentMetrics:
    AchievementMetricSnapshot = {
    tastings:
      asNumber(
        row.current_tastings
      ),
    beers:
      asNumber(
        row.current_beers
      ),
    breweries:
      asNumber(
        row.current_breweries
      ),
    brewery_of_day:
      asNumber(
        row.current_brewery_of_day
      ),
    styles:
      asNumber(
        row.current_styles
      ),
    countries:
      asNumber(
        row.current_countries
      ),
    hops:
      asNumber(
        row.current_hops
      ),
  };

  const historicalMetrics:
    AchievementMetricSnapshot = {
    tastings:
      asNumber(
        row.historical_tastings
      ),
    beers:
      asNumber(
        row.historical_beers
      ),
    breweries:
      asNumber(
        row.historical_breweries
      ),
    brewery_of_day: 0,
    styles:
      asNumber(
        row.historical_styles
      ),
    countries:
      asNumber(
        row.historical_countries
      ),
    hops:
      asNumber(
        row.historical_hops
      ),
  };

  const currentHighest =
    getHighestUnlockedBySeries(
      currentMetrics
    );

  const historicalUnlockedKeys =
    getUnlockedKeys(
      historicalMetrics
    );

  const {
    data: existingAchievements,
    error:
      existingAchievementsError,
  } =
    await supabase
      .from(
        "user_achievements"
      )
      .select(`
        id,
        achievement_key,
        unlocked_at,
        show_in_timeline
      `)
      .eq(
        "user_id",
        userId
      );

  if (
    existingAchievementsError
  ) {
    throw new Error(
      existingAchievementsError.message
    );
  }

  const existing =
    existingAchievements ?? [];

  // Dosažené medaile jsou permanentní. Proto porovnáváme
  // právě vypočítaný stav s nejvyšším už uloženým stupněm.
  const storedHighest =
    new Map<
      AchievementSeries,
      AchievementDefinition
    >();

  for (const stored of existing) {
    const definition =
      getAchievementByKey(
        stored.achievement_key
      );

    if (
      !definition?.series ||
      definition.level === null
    ) {
      continue;
    }

    const current =
      storedHighest.get(
        definition.series
      );

    if (
      !current ||
      (
        current.level ?? 0
      ) < definition.level
    ) {
      storedHighest.set(
        definition.series,
        definition
      );
    }
  }

  const desiredBySeries =
    new Map<
      AchievementSeries,
      AchievementDefinition
    >();

  const seriesList:
    AchievementSeries[] = [
    "beers",
    "breweries",
    "brewery_of_day",
    "styles",
    "countries",
    "hops",
  ];

  for (const series of seriesList) {
    const calculated =
      currentHighest.get(series);
    const stored =
      storedHighest.get(series);

    if (calculated && stored) {
      desiredBySeries.set(
        series,
        (
          (
            calculated.level ?? 0
          ) >=
          (
            stored.level ?? 0
          )
        )
          ? calculated
          : stored
      );
      continue;
    }

    if (calculated) {
      desiredBySeries.set(
        series,
        calculated
      );
      continue;
    }

    if (stored) {
      desiredBySeries.set(
        series,
        stored
      );
    }
  }

  const desiredDefinitions =
    Array.from(
      desiredBySeries.values()
    );

  const hasStoredFirstTasting =
    existing.some(
      (stored) =>
        stored.achievement_key ===
        "first_tasting"
    );

  if (
    hasStoredFirstTasting ||
    currentMetrics.tastings >= 1
  ) {
    const first =
      getAchievementByKey(
        "first_tasting"
      );

    if (first) {
      desiredDefinitions.push(
        first
      );
    }
  }

  const existingKeys =
    new Set(
      existing.map(
        (stored) =>
          stored.achievement_key
      )
    );

  const missing =
    desiredDefinitions.filter(
      (achievement) =>
        !existingKeys.has(
          achievement.key
        )
    );

  if (missing.length === 0) {
    return [];
  }

  const rows =
    missing.map(
      (achievement) => ({
        user_id:
          userId,
        achievement_key:
          achievement.key,
        show_in_timeline:
          !historicalUnlockedKeys.has(
            achievement.key
          ),
      })
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "user_achievements"
      )
      .insert(rows)
      .select(`
        id,
        achievement_key,
        unlocked_at,
        show_in_timeline
      `);

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data ?? [];
}
