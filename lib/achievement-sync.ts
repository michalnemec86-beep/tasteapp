import {
  createClient,
} from "@/lib/supabase/server";

import {
  ACHIEVEMENTS_LAUNCH_AT,
  buildAchievementProgress,
  getAchievementByKey,
  getHighestUnlockedBySeries,
  type AchievementDefinition,
  type AchievementSeries,
  type AchievementTasting,
} from "@/lib/achievements";

// ==================================================
// SYNCHRONIZACE ODZNAKŮ UŽIVATELE
//
// Pravidla V2:
// - v každé progresivní kategorii evidujeme pouze
//   nejvyšší dosažený stupeň
// - dosažený stupeň je permanentní
// - při vyšším stupni se starší řádek odstraní
// - první ochutnávka zůstává samostatný speciální odznak
// ==================================================

export async function syncUserAchievements(
  userId: string
) {
  const supabase =
    await createClient();

  // ==================================================
  // OCHUTNÁVKY UŽIVATELE
  // ==================================================

  const {
    data: tastings,
    error: tastingsError,
  } =
    await supabase
      .from("tastings")
      .select(`
        id,
        tasted_at,
        beers (
          id,
          breweries (
            id,
            country
          ),
          beer_styles (
            id
          ),
          beer_hops (
            hops (
              id,
              name
            )
          )
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .order(
        "tasted_at",
        {
          ascending: true,
        }
      );

  if (tastingsError) {
    throw new Error(
      tastingsError.message
    );
  }

  const allTastings =
    (tastings ??
      []) as unknown as
      AchievementTastingWithDate[];

  const {
    data: breweryOfDayRows,
    error: breweryOfDayError,
  } =
    await supabase
      .from(
        "brewery_of_day"
      )
      .select(
        "brewery_id"
      );

  if (breweryOfDayError) {
    throw new Error(
      breweryOfDayError.message
    );
  }

  const breweryOfDayIds =
    [
      ...new Set(
        (
          breweryOfDayRows ??
          []
        ).map(
          (row) =>
            row.brewery_id
        )
      ),
    ];

  // ==================================================
  // HISTORICKÝ STAV
  // ==================================================

  const historicalTastings =
    allTastings.filter(
      (tasting) => {
        if (
          !tasting.tasted_at
        ) {
          return false;
        }

        return (
          new Date(
            tasting.tasted_at
          ).getTime() <
          ACHIEVEMENTS_LAUNCH_AT.getTime()
        );
      }
    );

  const currentProgress =
    buildAchievementProgress(
      allTastings,
      {
        breweryOfDayIds,
      }
    );

  const historicalProgress =
    buildAchievementProgress(
      historicalTastings
    );

  const currentHighest =
    getHighestUnlockedBySeries(
      currentProgress
    );

  const historicalUnlockedKeys =
    new Set(
      historicalProgress
        .filter(
          (achievement) =>
            achievement.unlocked
        )
        .map(
          (achievement) =>
            achievement.key
        )
    );

  const firstTastingProgress =
    currentProgress.find(
      (achievement) =>
        achievement.key ===
        "first_tasting"
    );

  // ==================================================
  // UŽ ULOŽENÉ ODZNAKY
  // ==================================================

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
    existingAchievements ??
    [];

  // ==================================================
  // NEJVYŠŠÍ PERMANENTNĚ ULOŽENÝ STUPEŇ
  // ==================================================

  const storedHighest =
    new Map<
      AchievementSeries,
      AchievementDefinition
    >();

  for (
    const row of
    existing
  ) {
    const definition =
      getAchievementByKey(
        row.achievement_key
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
        current.level ??
        0
      ) <
        definition.level
    ) {
      storedHighest.set(
        definition.series,
        definition
      );
    }
  }

  // ==================================================
  // CÍLOVÝ STAV
  //
  // Vybereme vyšší hodnotu z:
  // - aktuálně vypočítané
  // - historicky uložené
  //
  // Díky tomu smazání ochutnávky nikdy nesníží
  // už jednou získanou medaili.
  // ==================================================

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

  for (
    const series of
    seriesList
  ) {
    const calculated =
      currentHighest.get(
        series
      );

    const stored =
      storedHighest.get(
        series
      );

    if (
      calculated &&
      stored
    ) {
      desiredBySeries.set(
        series,
        (
          (
            calculated.level ??
            0
          ) >=
          (
            stored.level ??
            0
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

  // ==================================================
  // SPECIÁLNÍ PRVNÍ OCHUTNÁVKA
  // ==================================================

  const hasStoredFirstTasting =
    existing.some(
      (row) =>
        row.achievement_key ===
        "first_tasting"
    );

  const shouldKeepFirstTasting =
    hasStoredFirstTasting ||
    Boolean(
      firstTastingProgress
        ?.unlocked
    );

  // ==================================================
  // KLÍČE, KTERÉ MAJÍ V DB ZŮSTAT
  // ==================================================

  const desiredDefinitions =
    Array.from(
      desiredBySeries.values()
    );

  if (
    shouldKeepFirstTasting
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

  const desiredKeys =
    new Set(
      desiredDefinitions.map(
        (achievement) =>
          achievement.key
      )
    );

  const existingKeys =
    new Set(
      existing.map(
        (achievement) =>
          achievement.achievement_key
      )
    );

  // ==================================================
  // NOVÉ / VYŠŠÍ MEDAILE
  // ==================================================

  const missing =
    desiredDefinitions.filter(
      (achievement) =>
        !existingKeys.has(
          achievement.key
        )
    );

  let inserted:
    {
      id: number;
      achievement_key: string;
      unlocked_at: string;
      show_in_timeline: boolean;
    }[] = [];

  if (
    missing.length > 0
  ) {
    const rows =
      missing.map(
        (achievement) => ({
          user_id:
            userId,

          achievement_key:
            achievement.key,

          /*
           * Co bylo splněno před spuštěním V2,
           * uložíme bez nové Timeline události.
           */
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
        .insert(
          rows
        )
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

    inserted =
      data ?? [];
  }

  // ==================================================
  // HISTORIE MEDAILÍ
  // ==================================================
  //
  // Starší dosažené stupně z databáze nemažeme.
  // Díky tomu zůstává zachována historie povýšení
  // pro Timeline.
  //
  // Profil si z uložených stupňů vždy vybere jen
  // nejvyšší dosaženou medaili.
  //
  // ==================================================

  return inserted;
}

// ==================================================
// INTERNÍ TYP
// ==================================================

type AchievementTastingWithDate =
  AchievementTasting & {
    tasted_at?:
      | string
      | null;
  };
