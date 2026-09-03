import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildTasteStats,
} from "@/lib/stats";

import {
  getPackagingMeta,
  type Packaging,
} from "@/lib/packaging";

import {
  getAchievementByKey,
  type AchievementDefinition,
} from "@/lib/achievements";

import {
  syncUserAchievements,
} from "@/lib/achievement-sync";

import TastingModal from "./TastingModal";
import EditTastingModalClient from "./EditTastingModalClient";

import StatsRankingCard from "@/components/stats/StatsRankingCard";
import BreweryOfDayCard from "@/components/home/BreweryOfDayCard";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import { getTimelineVisual } from "@/lib/timeline-visual";

import {
  updateTastingInModal,
  deleteTastingInModal,
} from "./tastings/actions";

// ==================================================
// TYPY
// ==================================================

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type BreweryRow = {
  id: number;
  name: string;
  country: string | null;
};

type CountryRow = {
  id: number;
  name: string;
};

type BeerStyleRow = {
  id: number;
  name: string;
  aliases: string[];
};

type HopRow = {
  id: number;
  name: string;
  aliases: string[];
};

type CatalogBeerRow = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;

  breweries:
    | BreweryRow
    | null;

  beer_styles:
    | BeerStyleRow
    | null;
};

type TastingBeerRow = {
  id: number;
  name: string;

  breweries:
    | BreweryRow
    | null;

  beer_styles:
    | BeerStyleRow
    | null;

  beer_hops:
    | {
        hops:
          | HopRow
          | null;
      }[]
    | null;
};

type TastingRow = {
  id: number;
  user_id: string;

  tasted_at: string;
  tasted_on: string;

  packaging:
    | Packaging
    | null;

  quantity:
    | number
    | null;

  plato:
    | number
    | null;

  abv:
    | number
    | null;

  ibu:
    | number
    | null;

  place:
    | string
    | null;

  notes:
    | string
    | null;

  beers:
    | TastingBeerRow
    | null;
};

type AchievementRow = {
  id: number;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
  show_in_timeline: boolean;
};

type TimelineEvent =
  | {
      type: "tasting";
      sortAt: number;
      tasting: TastingRow;
    }
  | {
      type: "achievement";
      sortAt: number;
      achievement: AchievementRow;
    };

// ==================================================
// PIVOVAR DNE
// ==================================================

function getPragueDateKey(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Prague",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new Error(
      "Nepodařilo se určit dnešní datum."
    );
  }

  return `${year}-${month}-${day}`;
}

// ==================================================
// HOMEPAGE
// ==================================================

export default async function HomePage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  // ==================================================
  // DATA
  // ==================================================

  const profilesPromise =
    supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url"
      )
      .order(
        "display_name"
      );

  const tastingsPromise =
    supabase
      .from("tastings")
      .select(`
        id,
        user_id,
        tasted_at,
        tasted_on,
        packaging,
        quantity,
        plato,
        abv,
        ibu,
        place,
        notes,
        beers (
          id,
          name,
          breweries (
            id,
            name,
            country
          ),
          beer_styles (
            id,
            name
          ),
          beer_hops (
            hops (
              id,
              name
            )
          )
        )
      `)
      .order(
        "tasted_on",
        {
          ascending: false,
        }
      )
      .order(
        "tasted_at",
        {
          ascending: false,
        }
      );

  const achievementsPromise =
    supabase
      .from(
        "user_achievements"
      )
      .select(`
        id,
        user_id,
        achievement_key,
        unlocked_at,
        show_in_timeline
      `)
      .eq(
        "show_in_timeline",
        true
      )
      .order(
        "unlocked_at",
        {
          ascending: false,
        }
      );

  const beersPromise =
    supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        breweries (
          id,
          name,
          country
        ),
        beer_styles (
          id,
          name
        )
      `)
      .order("name");

  const breweriesPromise =
    supabase
      .from("breweries")
      .select(
        "id, name, country"
      )
      .order("name");

  const countriesPromise =
    supabase
      .from("countries")
      .select(
        "id, name"
      )
      .order("name");

  const stylesPromise =
    supabase
      .from("beer_styles")
      .select(
        "id, name, aliases"
      )
      .order("name");

  const hopsPromise =
    supabase
      .from("hops")
      .select(
        "id, name, aliases"
      )
      .order("name");

  const [
    profilesResult,
    tastingsResult,
    achievementsResult,
    beersResult,
    breweriesResult,
    countriesResult,
    stylesResult,
    hopsResult,
  ] =
    await Promise.all([
      profilesPromise,
      tastingsPromise,
      achievementsPromise,
      beersPromise,
      breweriesPromise,
      countriesPromise,
      stylesPromise,
      hopsPromise,
    ]);

  const {
    data: profiles,
    error: profilesError,
  } =
    profilesResult;

  const {
    data: tastings,
    error: tastingsError,
  } =
    tastingsResult;

  const {
    data: achievements,
    error: achievementsError,
  } =
    achievementsResult;

  const {
    data: beers,
    error: beersError,
  } =
    beersResult;

  const {
    data: breweries,
    error: breweriesError,
  } =
    breweriesResult;

  const {
    data: countries,
    error: countriesError,
  } =
    countriesResult;

  const {
    data: styles,
    error: stylesError,
  } =
    stylesResult;

  const {
    data: hops,
    error: hopsError,
  } =
    hopsResult;

  if (profilesError) {
    throw new Error(
      profilesError.message
    );
  }

  if (tastingsError) {
    throw new Error(
      tastingsError.message
    );
  }

  if (achievementsError) {
    throw new Error(
      achievementsError.message
    );
  }

  if (beersError) {
    throw new Error(
      beersError.message
    );
  }

  if (breweriesError) {
    throw new Error(
      breweriesError.message
    );
  }

  if (countriesError) {
    throw new Error(
      countriesError.message
    );
  }

  if (stylesError) {
    throw new Error(
      stylesError.message
    );
  }

  if (hopsError) {
    throw new Error(
      hopsError.message
    );
  }

  const allProfiles =
    (profiles ??
      []) as ProfileRow[];

  const allTastings =
    (tastings ??
      []) as unknown as
      TastingRow[];

  const allAchievements =
    (achievements ??
      []) as AchievementRow[];

  const allBeers =
    (beers ??
      []) as unknown as
      CatalogBeerRow[];

  const allBreweries =
    (breweries ??
      []) as BreweryRow[];

  const allStyles =
    (styles ??
      []) as BeerStyleRow[];

  const allHops =
    (hops ??
      []) as HopRow[];

  const currentProfile =
    allProfiles.find(
      (profile) =>
        profile.id ===
        user.id
    );

  const todayKey =
    getPragueDateKey();

  const {
    data: breweryOfDayHistory,
    error: breweryOfDayHistoryError,
  } =
    await supabase
      .from("brewery_of_day")
      .select(
        "day, brewery_id"
      )
      .order(
        "day",
        {
          ascending: false,
        }
      );

  if (breweryOfDayHistoryError) {
    throw new Error(
      breweryOfDayHistoryError.message
    );
  }

  let breweryOfDayId =
    breweryOfDayHistory?.find(
      (row) =>
        row.day ===
        todayKey
    )?.brewery_id ?? null;

  if (
    breweryOfDayId == null &&
    allBreweries.length > 0
  ) {
    const usedBreweryIds =
      new Set(
        (
          breweryOfDayHistory ??
          []
        ).map(
          (row) =>
            row.brewery_id
        )
      );

    let candidates =
      allBreweries.filter(
        (brewery) =>
          !usedBreweryIds.has(
            brewery.id
          )
      );

    if (
      candidates.length === 0
    ) {
      candidates =
        allBreweries;
    }

    const selected =
      candidates[
        Math.floor(
          Math.random() *
            candidates.length
        )
      ];

    const {
      error: insertError,
    } =
      await supabase
        .from(
          "brewery_of_day"
        )
        .insert({
          day: todayKey,
          brewery_id:
            selected.id,
        });

    if (!insertError) {
      breweryOfDayId =
        selected.id;
    } else if (
      insertError.code ===
      "23505"
    ) {
      const {
        data: existingDay,
        error:
          existingDayError,
      } =
        await supabase
          .from(
            "brewery_of_day"
          )
          .select(
            "brewery_id"
          )
          .eq(
            "day",
            todayKey
          )
          .single();

      if (
        existingDayError
      ) {
        throw new Error(
          existingDayError.message
        );
      }

      breweryOfDayId =
        existingDay.brewery_id;
    } else {
      throw new Error(
        insertError.message
      );
    }
  }

  const breweryOfDay =
    allBreweries.find(
      (brewery) =>
        brewery.id ===
        breweryOfDayId
    ) ?? null;

  const newlyUnlockedAchievements =
    await syncUserAchievements(
      user.id
    );

  if (
    newlyUnlockedAchievements.length >
    0
  ) {
    allAchievements.push(
      ...newlyUnlockedAchievements
        .filter(
          (achievement) =>
            achievement.show_in_timeline
        )
        .map(
          (achievement) => ({
            ...achievement,
            user_id:
              user.id,
          })
        )
    );
  }

  // ==================================================
  // STATISTIKY
  // ==================================================

  const globalStats =
    buildTasteStats(
      allTastings
    );

  const totalTastings =
    allTastings.reduce(
      (
        sum,
        tasting
      ) =>
        sum +
        (
          tasting.quantity ??
          1
        ),
      0
    );

  const totalBrands =
    new Set(
      allTastings
        .map(
          (tasting) =>
            tasting.beers
              ?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const totalBreweries =
    new Set(
      allTastings
        .map(
          (tasting) =>
            tasting.beers
              ?.breweries
              ?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const totalStyles =
    new Set(
      allTastings
        .map(
          (tasting) =>
            tasting.beers
              ?.beer_styles
              ?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const totalCountries =
    new Set(
      allTastings
        .map(
          (tasting) =>
            tasting.beers
              ?.breweries
              ?.country
              ?.normalize(
                "NFD"
              )
              .replace(
                /[\u0300-\u036f]/g,
                ""
              )
              .toLowerCase()
              .trim()
        )
        .filter(Boolean)
    ).size;

  // ==================================================
  // TIMELINE
  // ==================================================

  const timeline:
    TimelineEvent[] = [
    ...allTastings.map(
      (tasting) => ({
        type:
          "tasting" as const,

        sortAt:
          getTastingTimelineTime(
            tasting
          ),

        tasting,
      })
    ),

    ...allAchievements.map(
      (achievement) => ({
        type:
          "achievement" as const,

        sortAt:
          new Date(
            achievement.unlocked_at
          ).getTime(),

        achievement,
      })
    ),
  ];

  timeline.sort(
    (a, b) =>
      b.sortAt -
      a.sortAt
  );

  const visibleTimeline =
    timeline.slice(
      0,
      30
    );

  function getProfile(
    userId: string
  ) {
    return (
      allProfiles.find(
        (profile) =>
          profile.id ===
          userId
      ) ?? null
    );
  }

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <main
      style={{
        maxWidth:
          "1500px",

        margin:
          "0 auto",

        padding:
          "24px 24px 72px",
      }}
    >
      {/* ==================================================
          HERO
      ================================================== */}

      <PageHero
        eyebrow="Pivní deník"
        imageUrl="/images/heroes/home.jpg"
        imagePosition="68% 30%"
        title={
          <>
            Na zdraví
            {currentProfile
              ? `, ${currentProfile.display_name}`
              : ""}
            .
          </>
        }
        subtitle="Zapiš další ochutnávku, sleduj svoje pivní objevy a nech TasteApp skládat příběh z pivovarů, stylů, zemí a chmelů."
        action={
          <div
            style={{
              width: "100%",
              display: "grid",
              gap: "9px",
            }}
          >
            <BreweryOfDayCard
              brewery={
                breweryOfDay
              }
            />

            <TastingModal
              beers={
                allBeers
              }
              breweries={
                allBreweries
              }
              countries={
                countries ?? []
              }
              styles={
                allStyles
              }
              hops={
                allHops
              }
            />
          </div>
        }
        stats={[
          {
            icon: (
              <AppIcon
                name="beer"
                size={18}
              />
            ),
            accent: "#f2b63f",
            value: totalTastings,
            label: "Vypitých piv",
          },
          {
            icon: (
              <AppIcon
                name="brewery"
                size={18}
              />
            ),
            accent: "#e88835",
            value: totalBreweries,
            label: "Pivovarů",
          },
          {
            icon: (
              <AppIcon
                name="hop"
                size={18}
              />
            ),
            accent: "#9cad47",
            value: totalStyles,
            label: "Stylů",
          },
          {
            icon: (
              <AppIcon
                name="globe"
                size={18}
              />
            ),
            accent: "#d65b42",
            value: totalCountries,
            label: "Států",
          },
        ]}
      />

      {/* ==================================================
          DASHBOARD
      ================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

        {/* LEVÁ STRANA */}

        <aside className="order-2 grid gap-4 md:grid-cols-2 xl:order-1 xl:col-span-3 xl:grid-cols-1">

          <StatsRankingCard
            title="Nejčastější pivovary"
            subtitle="Podle počtu vypitých piv"
            icon={
              <AppIcon
                name="brewery"
                size={20}
              />
            }
            accent="#e88835"
            items={
              globalStats.breweries
            }
            getItemHref={(item) =>
              `/breweries/${item.id}`
            }
          />

          <StatsRankingCard
            title="Pivní styly"
            subtitle="Nejčastější styly"
            icon={
              <AppIcon
                name="hop"
                size={20}
              />
            }
            accent="#9cad47"
            items={
              globalStats.styles
            }
          />


        </aside>

        {/* ==================================================
            TIMELINE
        ================================================== */}

        <section className="order-1 xl:order-2 xl:col-span-6">

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-end",

              gap:
                "16px",

              marginBottom:
                "15px",
            }}
          >
            <div>
              <div
                className="taste-label"
                style={{
                  marginBottom:
                    "5px",
                }}
              >
                Komunita
              </div>

              <h2
                style={{
                  margin: 0,

                  fontSize:
                    "24px",

                  letterSpacing:
                    "-0.02em",
                }}
              >
                Timeline
              </h2>
            </div>

            <span
              style={{
                fontSize:
                  "12px",

                color:
                  "var(--taste-text-muted)",
              }}
            >
              Nejnovější aktivita
            </span>
          </div>

          {visibleTimeline.length ===
            0 && (
            <div
              className="taste-card"
              style={{
                padding:
                  "36px",

                textAlign:
                  "center",

                color:
                  "var(--taste-text-muted)",
              }}
            >
              Zatím tu není
              žádná aktivita.
            </div>
          )}

          <div
            style={{
              display:
                "grid",

              gap:
                "10px",
            }}
          >
            {visibleTimeline.map(
              (event) => {
                // ==========================================
                // ODZNAK
                // ==========================================

                if (
                  event.type ===
                  "achievement"
                ) {
                  const row =
                    event.achievement;

                  const profile =
                    getProfile(
                      row.user_id
                    );

                  const achievement =
                    getAchievementByKey(
                      row.achievement_key
                    );

                  if (!achievement) {
                    return null;
                  }

                  return (
                    <AchievementTimelineCard
                      key={`achievement-${row.id}`}
                      row={
                        row
                      }
                      profile={
                        profile
                      }
                      achievement={
                        achievement
                      }
                    />
                  );
                }

                // ==========================================
                // OCHUTNÁVKA
                // ==========================================

                const tasting =
                  event.tasting;

                const profile =
                  getProfile(
                    tasting.user_id
                  );

                const isOwn =
                  tasting.user_id ===
                  user.id;

                return (
                  <TastingTimelineCard
                    key={`tasting-${tasting.id}`}
                    tasting={
                      tasting
                    }
                    profile={
                      profile
                    }
                    isOwn={
                      isOwn
                    }
                    beers={
                      allBeers
                    }
                    breweries={
                      allBreweries
                    }
                    countries={countries ?? []}
                styles={
                      allStyles
                    }
                    hops={
                      allHops
                    }
                  />
                );
              }
            )}
          </div>
        </section>

        {/* PRAVÁ STRANA */}

        <aside className="order-3 grid gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-1">

          <StatsRankingCard
            title="Nejčastější piva"
            subtitle="Konkrétní značky"
            icon={
              <AppIcon
                name="label"
                size={20}
              />
            }
            accent="#e7a62f"
            items={
              globalStats.brands
            }
          />

          <StatsRankingCard
            title="Státy"
            subtitle="Země původu pivovarů"
            icon={
              <AppIcon
                name="globe"
                size={20}
              />
            }
            accent="#d37f43"
            items={
              globalStats.countries
            }
          />

        </aside>
      </div>
    </main>
  );
}

// ==================================================
// KARTA OCHUTNÁVKY V TIMELINE
// ==================================================

function TastingTimelineCard({
  tasting,
  profile,
  isOwn,
  beers,
  breweries,
  countries,
  styles,
  hops,
}: {
  tasting: TastingRow;
  profile: ProfileRow | null;
  isOwn: boolean;
  beers: CatalogBeerRow[];
  breweries: BreweryRow[];
  countries: CountryRow[];
  styles: BeerStyleRow[];
  hops: HopRow[];
}) {
  const packaging =
    getPackagingMeta(
      tasting.packaging
    );

  const quantity =
    tasting.quantity ??
    1;

  const visual =
    getTimelineVisual(
      tasting.id
    );

  const beerName =
    tasting.beers
      ?.name ??
    "Neznámé pivo";

  const breweryName =
    tasting.beers
      ?.breweries
      ?.name ??
    null;

  const breweryId =
    tasting.beers
      ?.breweries
      ?.id ??
    null;

  const metadata = [
    tasting.beers
      ?.beer_styles
      ?.name ??
      null,

    tasting.plato !== null
      ? `${tasting.plato} °P`
      : null,

    tasting.abv !== null
      ? `${tasting.abv} %`
      : null,

    tasting.ibu !== null
      ? `IBU ${tasting.ibu}`
      : null,

    tasting.beers
      ?.breweries
      ?.country ??
      null,

    packaging
      ? packaging.label
      : null,
  ].filter(
    (value): value is string =>
      Boolean(value)
  );

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: "20px",
      }}
    >
      {/* SVISLÁ LINKA TIMELINE */}

      <div
        style={{
          position: "absolute",
          left: "5px",
          top: "-10px",
          bottom: "-10px",
          width: "1px",
          background:
            "linear-gradient(180deg, rgba(231,166,47,0.10), rgba(231,166,47,0.50), rgba(231,166,47,0.10))",
        }}
      />

      {/* BOD TIMELINE */}

      <div
        style={{
          position: "absolute",
          left: 0,
          top: "27px",
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          border:
            `2px solid ${visual.accent}`,
          background:
            "var(--taste-bg-deep)",
          boxShadow:
            `0 0 11px ${visual.glow}`,
          zIndex: 2,
        }}
      />

      <article
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "12px 14px",
          border:
            "1px solid rgba(231,166,47,0.20)",
          borderRadius: "13px",
          background: `
            linear-gradient(
              145deg,
              rgba(231,166,47,0.055),
              transparent 42%
            ),
            var(--taste-surface)
          `,
          boxShadow:
            "0 8px 24px rgba(0,0,0,0.20)",
        }}
      >
        {/* ==================================================
            1. ŘÁDEK: UŽIVATEL + DATUM
        ================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <Link
              href={`/profiles/${tasting.user_id}`}
              style={{
                width: "24px",
                height: "24px",
                flexShrink: 0,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  "7px",
                border:
                  "1px solid rgba(231,166,47,0.25)",
                background:
                  "rgba(231,166,47,0.08)",
                color:
                  "var(--taste-amber-bright)",
                textDecoration:
                  "none",
                fontSize: "10px",
                fontWeight: 850,
              }}
            >
              {profile
                ?.display_name
                ?.charAt(0)
                .toUpperCase() ??
                "?"}
            </Link>

            <div
              style={{
                minWidth: 0,
                display: "flex",
                alignItems:
                  "baseline",
                gap: "5px",
                fontSize: "10px",
              }}
            >
              <Link
                href={`/profiles/${tasting.user_id}`}
                style={{
                  overflow:
                    "hidden",
                  color:
                    "var(--taste-amber-bright)",
                  fontWeight: 750,
                  textDecoration:
                    "none",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {profile
                  ?.display_name ??
                  "Neznámý uživatel"}
              </Link>

              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                }}
              >
                přidal ochutnávku
              </span>
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems:
                "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                color:
                  "var(--taste-text-muted)",
                fontSize: "10px",
                whiteSpace:
                  "nowrap",
              }}
            >
              {formatTastingDate(
                tasting.tasted_on
              )}
            </span>

            {isOwn && (
              <EditTastingModalClient
                tasting={
                  tasting
                }
                beers={
                  beers
                }
                breweries={
                  breweries
                }
                countries={
                  countries ?? []
                }
                styles={
                  styles
                }
                hops={
                  hops
                }
                updateTastingAction={
                  updateTastingInModal
                }
                deleteTastingAction={
                  deleteTastingInModal
                }
              />
            )}
          </div>
        </div>

        {/* ==================================================
            HLAVNÍ OBSAH
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "42px minmax(0,1fr)",
            gap: "11px",
            alignItems: "start",
          }}
        >
          {/* IKONA */}

          <div
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              border:
                `1px solid ${visual.border}`,
              borderRadius:
                "11px",
              background: `
                radial-gradient(
                  circle at 28% 22%,
                  ${visual.glow},
                  transparent 68%
                ),
                ${visual.background}
              `,
              color:
                visual.accent,
              boxShadow: `
                inset 0 1px 0 rgba(255,255,255,0.035),
                0 0 18px ${visual.glow}
              `,
            }}
          >
            <AppIcon
              name={visual.icon}
              size={24}
              strokeWidth={1.85}
            />
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            {/* ==============================================
                2. ŘÁDEK: PIVO
            ============================================== */}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems:
                  "center",
                gap: "7px",
              }}
            >
              <div
                style={{
                  color:
                    "var(--taste-text)",
                  fontSize:
                    "16px",
                  lineHeight: 1.2,
                  fontWeight: 800,
                  letterSpacing:
                    "-0.02em",
                }}
              >
                {breweryName &&
                breweryId ? (
                  <>
                    <Link
                      href={`/breweries/${breweryId}`}
                      style={{
                        color: "inherit",
                        textDecoration:
                          "none",
                        borderBottom:
                          "1px solid rgba(231,166,47,0.28)",
                      }}
                    >
                      {breweryName}
                    </Link>
                    {" – "}
                    {beerName}
                  </>
                ) : (
                  beerName
                )}
              </div>

              {quantity > 1 && (
                <span
                  style={{
                    padding:
                      "2px 6px",
                    border:
                      "1px solid rgba(231,166,47,0.28)",
                    borderRadius:
                      "999px",
                    background:
                      "rgba(231,166,47,0.08)",
                    color:
                      "var(--taste-amber-bright)",
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                  }}
                >
                  ×{quantity}
                </span>
              )}
            </div>

            {/* ==============================================
                3. ŘÁDEK: PARAMETRY
            ============================================== */}

            {metadata.length >
              0 && (
              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  alignItems:
                    "center",
                  gap: "4px",
                  marginTop:
                    "5px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "10px",
                  lineHeight:
                    1.35,
                }}
              >
                {metadata.map(
                  (
                    item,
                    index
                  ) => (
                    <span
                      key={`${item}-${index}`}
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                      }}
                    >
                      {index >
                        0 && (
                        <span
                          style={{
                            margin:
                              "0 5px 0 1px",
                            color:
                              "rgba(231,166,47,0.48)",
                          }}
                        >
                          •
                        </span>
                      )}

                      {item}
                    </span>
                  )
                )}
              </div>
            )}

            {/* ==============================================
                4. ŘÁDEK: POZNÁMKA / MÍSTO
            ============================================== */}

            {(tasting.notes ||
              tasting.place) && (
              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  alignItems:
                    "baseline",
                  gap: "6px",
                  marginTop:
                    "7px",
                  color:
                    "var(--taste-text-soft)",
                  fontSize:
                    "11px",
                  lineHeight:
                    1.4,
                }}
              >
                {tasting.place && (
                  <span
                    style={{
                      color:
                        "var(--taste-text-muted)",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    📍{" "}
                    {tasting.place}
                  </span>
                )}

                {tasting.place &&
                  tasting.notes && (
                    <span
                      style={{
                        color:
                          "rgba(231,166,47,0.42)",
                      }}
                    >
                      •
                    </span>
                  )}

                {tasting.notes && (
                  <span>
                    {tasting.notes}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

// ==================================================
// ODZNAK V TIMELINE
// ==================================================

function AchievementTimelineCard({
  row,
  profile,
  achievement,
}: {
  row: AchievementRow;
  profile: ProfileRow | null;
  achievement:
    AchievementDefinition;
}) {
  return (
    <article
      style={{
        position:
          "relative",

        overflow:
          "hidden",

        padding:
          "16px",

        border:
          "1px solid rgba(231,166,47,0.40)",

        borderRadius:
          "var(--taste-radius-lg)",

        background: `
          radial-gradient(
            circle at 88% 20%,
            rgba(231,166,47,0.17),
            transparent 15rem
          ),
          linear-gradient(
            145deg,
            rgba(231,166,47,0.09),
            rgba(168,98,33,0.025)
          ),
          var(--taste-surface)
        `,

        boxShadow:
          "0 15px 42px rgba(0,0,0,0.24)",
      }}
    >
      {/* ZLATÁ LINKA */}

      <div
        style={{
          position:
            "absolute",

          left: 0,

          top:
            "14px",

          bottom:
            "14px",

          width:
            "3px",

          borderRadius:
            "999px",

          background:
            "linear-gradient(180deg, var(--taste-amber-bright), var(--taste-copper))",
        }}
      />

      {/* AUTOR */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            "9px",

          marginBottom:
            "13px",
        }}
      >
        <Link
          href={`/profiles/${row.user_id}`}
          style={{
            width:
              "36px",

            height:
              "36px",

            flexShrink:
              0,

            borderRadius:
              "11px",

            border:
              "1px solid rgba(231,166,47,0.38)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            background:
              "rgba(231,166,47,0.10)",

            color:
              "var(--taste-amber-bright)",

            textDecoration:
              "none",

            fontWeight:
              800,
          }}
        >
          {profile
            ?.display_name
            ?.charAt(0)
            .toUpperCase() ??
            "?"}
        </Link>

        <div>
          <Link
            href={`/profiles/${row.user_id}`}
            style={{
              color:
                "var(--taste-text)",

              fontWeight:
                700,

              fontSize:
                "14px",

              textDecoration:
                "none",
            }}
          >
            {profile
              ?.display_name ??
              "Neznámý uživatel"}
          </Link>

          <div
            style={{
              marginTop:
                "2px",

              color:
                "var(--taste-amber-soft)",

              fontSize:
                "11px",

              fontWeight:
                650,
            }}
          >
            získal nový odznak
          </div>
        </div>
      </div>

      {/* ODZNAK */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            "11px",
        }}
      >
        <div
          style={{
            width:
              "48px",

            height:
              "48px",

            flexShrink:
              0,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            border:
              "1px solid rgba(231,166,47,0.46)",

            borderRadius:
              "14px",

            background:
              "linear-gradient(145deg, rgba(231,166,47,0.18), rgba(168,98,33,0.06))",

            fontSize:
              "24px",

            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 25px rgba(0,0,0,0.18)",
          }}
        >
          {
            achievement.icon
          }
        </div>

        <div
          style={{
            minWidth:
              0,
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom:
                "4px",

              color:
                "var(--taste-amber)",
            }}
          >
            Nový odznak
          </div>

          <h3
            style={{
              margin:
                0,

              color:
                "var(--taste-text)",

              fontSize:
                "18px",

              lineHeight:
                1.15,

              fontWeight:
                800,

              letterSpacing:
                "-0.025em",
            }}
          >
            {
              achievement.name
            }
          </h3>

          <p
            style={{
              margin:
                "4px 0 0",

              color:
                "var(--taste-text-soft)",

              fontSize:
                "11px",

              lineHeight:
                1.5,
            }}
          >
            {
              achievement.description
            }
          </p>
        </div>
      </div>

      {/* PATIČKA */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "14px",

          flexWrap:
            "wrap",

          marginTop:
            "12px",

          paddingTop:
            "9px",

          borderTop:
            "1px solid rgba(231,166,47,0.12)",
        }}
      >
        <span
          style={{
            color:
              "var(--taste-amber-bright)",

            fontSize:
              "10px",

            fontWeight:
              750,
          }}
        >
          ✓ Splněno
        </span>

        <Link
          href={`/profiles/${row.user_id}`}
          style={{
            color:
              "var(--taste-text-muted)",

            textDecoration:
              "none",

            fontSize:
              "10px",
          }}
        >
          {formatAchievementDate(
            row.unlocked_at
          )}
          {" · "}
          Zobrazit odznaky →
        </Link>
      </div>
    </article>
  );
}

// ==================================================
// CELKOVÁ STATISTIKA
// ==================================================

function TotalCard({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: string;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        position:
          "relative",

        overflow:
          "hidden",

        padding:
          "17px 18px",

        border:
          accent
            ? "1px solid rgba(231,166,47,0.36)"
            : "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-md)",

        background:
          accent
            ? `
              linear-gradient(
                145deg,
                rgba(231,166,47,0.11),
                rgba(231,166,47,0.025)
              ),
              var(--taste-surface)
            `
            : "var(--taste-surface)",

        boxShadow:
          "var(--taste-shadow-soft)",
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            "11px",
        }}
      >
        <div
          style={{
            width:
              "38px",

            height:
              "38px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            flexShrink:
              0,

            borderRadius:
              "11px",

            background:
              "rgba(231,166,47,0.07)",

            fontSize:
              "19px",
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              color:
                accent
                  ? "var(--taste-amber-bright)"
                  : "var(--taste-text)",

              fontSize:
                "27px",

              lineHeight: 1,

              fontWeight:
                800,

              letterSpacing:
                "-0.03em",
            }}
          >
            {value}
          </div>

          <div
            style={{
              marginTop:
                "5px",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "11px",
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// BADGE PARAMETRU
// ==================================================

function ParameterBadge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        padding:
          "3px 7px",

        borderRadius:
          "999px",

        border:
          "1px solid rgba(231,166,47,0.17)",

        background:
          "rgba(231,166,47,0.045)",

        color:
          "var(--taste-text-soft)",

        fontSize:
          "10px",
      }}
    >
      {children}
    </span>
  );
}

// ==================================================
// ŘAZENÍ OCHUTNÁVKY V TIMELINE
//
// Primárně zachováváme skutečné datum ochutnávky.
// Čas vytvoření použijeme jen pro pořadí v rámci dne.
// ==================================================

function getTastingTimelineTime(
  tasting: TastingRow
) {
  const fallback =
    new Date(
      tasting.tasted_at
    ).getTime();

  if (
    !tasting.tasted_on
  ) {
    return fallback;
  }

  const activityDate =
    new Date(
      tasting.tasted_at
    );

  const hours =
    activityDate.getHours();

  const minutes =
    activityDate.getMinutes();

  const seconds =
    activityDate.getSeconds();

  const [
    year,
    month,
    day,
  ] =
    tasting.tasted_on
      .split("-")
      .map(Number);

  const value =
    new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds
    ).getTime();

  return Number.isFinite(
    value
  )
    ? value
    : fallback;
}

// ==================================================
// DATUM OCHUTNÁVKY
// ==================================================

function formatTastingDate(
  dateString: string
) {
  const [
    year,
    month,
    day,
  ] =
    dateString.split(
      "-"
    );

  return `${Number(
    day
  )}. ${Number(
    month
  )}. ${year}`;
}

// ==================================================
// DATUM ODZNAKU
// ==================================================

function formatAchievementDate(
  dateString: string
) {
  const date =
    new Date(
      dateString
    );

  return new Intl.DateTimeFormat(
    "cs-CZ",
    {
      day:
        "numeric",

      month:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    date
  );
}