import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getPackagingMeta,
} from "@/lib/packaging";

import {
  buildProfileStats,
} from "@/lib/profileStats";

import {
  buildTasteStats,
} from "@/lib/stats";

import {
  buildAchievementProgress,
  type AchievementTasting,
  type AchievementProgress,
  type AchievementSeries,
  type AchievementMedal,
} from "@/lib/achievements";

import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import EditTastingModalClient from "@/app/EditTastingModalClient";
import ProfileActivityCard from "./ProfileActivityCard";

import {
  updateTastingInModal,
  deleteTastingInModal,
} from "@/app/tastings/actions";

// ==================================================
// TYPY
// ==================================================

type ProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

// ==================================================
// STRÁNKA
// ==================================================

function singleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { id } =
    await params;

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
  // PROFIL
  // ==================================================

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        avatar_url,
        created_at
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  if (!profile) {
    notFound();
  }

  const isMe =
    user.id ===
    profile.id;

  // ==================================================
  // DATA
  // ==================================================

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
      .eq(
        "user_id",
        id
      )
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
    tastingsResult,
    beersResult,
    breweriesResult,
    countriesResult,
    stylesResult,
    hopsResult,
  ] =
    await Promise.all([
      tastingsPromise,
      beersPromise,
      breweriesPromise,
      countriesPromise,
      stylesPromise,
      hopsPromise,
    ]);

  const {
    data: tastings,
    error: tastingsError,
  } = tastingsResult;

  const {
    data: beers,
    error: beersError,
  } = beersResult;

  const {
    data: breweries,
    error: breweriesError,
  } = breweriesResult;

  const {
    data: countries,
    error: countriesError,
  } = countriesResult;

  const {
    data: styles,
    error: stylesError,
  } = stylesResult;

  const {
    data: hops,
    error: hopsError,
  } = hopsResult;

  if (tastingsError) {
    throw new Error(
      tastingsError.message
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

  const allTastings =
    (tastings ?? []).map(
      (tasting) => {
        const beer =
          singleRelation(
            tasting.beers
          );

        return {
          ...tasting,

          beers: beer
            ? {
                ...beer,

                breweries:
                  singleRelation(
                    beer.breweries
                  ),

                beer_styles:
                  singleRelation(
                    beer.beer_styles
                  ),

                beer_hops:
                  (
                    beer.beer_hops ??
                    []
                  ).map(
                    (beerHop) => ({
                      ...beerHop,

                      hops:
                        singleRelation(
                          beerHop.hops
                        ),
                    })
                  ),
              }
            : null,
        };
      }
    );

  const normalizedBeers =
    (beers ?? []).map(
      (beer) => ({
        ...beer,

        breweries:
          singleRelation(
            beer.breweries
          ),

        beer_styles:
          singleRelation(
            beer.beer_styles
          ),
      })
    );

  // ==================================================
  // STATISTIKY
  // ==================================================

  const profileStats =
    buildProfileStats(
      allTastings
    );

  const tasteStats =
    buildTasteStats(
      allTastings
    );

  const quickProfileItems = [
    {
      label: "Top styl",
      value:
        tasteStats.styles[0]
          ?.name ?? "—",
      detail:
        tasteStats.styles[0]
          ? `${tasteStats.styles[0].count}× v ochutnávkách`
          : "Zatím bez dat",
      accent: "#f2b544",
      border:
        "rgba(242,181,68,0.38)",
      glow:
        "rgba(242,181,68,0.16)",
      wash:
        "rgba(242,181,68,0.075)",
    },
    {
      label: "Top pivovar",
      value:
        tasteStats.breweries[0]
          ?.name ?? "—",
      detail:
        tasteStats.breweries[0]
          ? `${tasteStats.breweries[0].count}× v ochutnávkách`
          : "Zatím bez dat",
      accent: "#df7f32",
      border:
        "rgba(223,127,50,0.38)",
      glow:
        "rgba(223,127,50,0.16)",
      wash:
        "rgba(223,127,50,0.075)",
    },
    {
      label: "Top stát",
      value:
        tasteStats.countries[0]
          ?.name ?? "—",
      detail:
        tasteStats.countries[0]
          ? `${tasteStats.countries[0].count}× v ochutnávkách`
          : "Zatím bez dat",
      accent: "#c2553f",
      border:
        "rgba(194,85,63,0.38)",
      glow:
        "rgba(194,85,63,0.16)",
      wash:
        "rgba(194,85,63,0.075)",
    },
    {
      label: "Nejčastější podání",
      value:
        tasteStats.packaging[0]
          ?.name ?? "—",
      detail:
        tasteStats.packaging[0]
          ? `${tasteStats.packaging[0].count}× v ochutnávkách`
          : "Zatím bez dat",
      accent: "#a96f32",
      border:
        "rgba(169,111,50,0.38)",
      glow:
        "rgba(169,111,50,0.16)",
      wash:
        "rgba(169,111,50,0.075)",
    },
    {
      label: "Chmelový záběr",
      value:
        profileStats.uniqueHops,
      detail:
        "různých odrůd",
      accent: "#879a43",
      border:
        "rgba(135,154,67,0.40)",
      glow:
        "rgba(135,154,67,0.17)",
      wash:
        "rgba(135,154,67,0.075)",
    },
  ];

  // ==================================================
  // MEDAILOVÉ CESTY
  // ==================================================

  const achievements =
    buildAchievementProgress(
      allTastings as unknown as
        AchievementTasting[]
    );

  /*
   * Na profilu kombinujeme:
   * 1. aktuální stav z ochutnávek
   * 2. už permanentně získanou medaili z DB
   *
   * Díky tomu se získaná medaile nikdy vizuálně
   * nesníží ani po pozdější úpravě nebo smazání dat.
   */

  const {
    data: storedAchievementRows,
    error: storedAchievementsError,
  } =
    await supabase
      .from("user_achievements")
      .select("achievement_key")
      .eq(
        "user_id",
        id
      );

  if (storedAchievementsError) {
    throw new Error(
      storedAchievementsError.message
    );
  }

  const storedAchievementKeys =
    new Set(
      (
        storedAchievementRows ??
        []
      )
        .map(
          (row) =>
            row.achievement_key
        )
        .filter(
          (
            key
          ): key is string =>
            Boolean(key)
        )
    );

  const achievementSeriesOrder:
    AchievementSeries[] = [
    "beers",
    "breweries",
    "styles",
    "countries",
    "hops",
  ];

  const achievementUnits:
    Record<
      AchievementSeries,
      string
    > = {
    beers:
      "různých piv",
    breweries:
      "různých pivovarů",
    styles:
      "pivních stylů",
    countries:
      "států",
    hops:
      "odrůd chmele",
  };

  const achievementSeries =
    achievementSeriesOrder.map(
      (series) => {
        const levels =
          achievements
            .filter(
              (achievement) =>
                achievement.series ===
                series
            )
            .sort(
              (
                a,
                b
              ) =>
                (
                  a.level ??
                  0
                ) -
                (
                  b.level ??
                  0
                )
            );

        const current =
          levels[0]?.current ??
          0;

        const calculatedEarned =
          [...levels]
            .reverse()
            .find(
              (achievement) =>
                achievement.unlocked
            ) ??
          null;

        const storedEarned =
          [...levels]
            .reverse()
            .find(
              (achievement) =>
                storedAchievementKeys.has(
                  achievement.key
                )
            ) ??
          null;

        let earned:
          AchievementProgress |
          null =
          calculatedEarned;

        if (
          storedEarned &&
          (
            storedEarned.level ??
            0
          ) >
            (
              earned?.level ??
              0
            )
        ) {
          earned =
            storedEarned;
        }

        const earnedLevel =
          earned?.level ??
          0;

        const next =
          levels.find(
            (achievement) =>
              (
                achievement.level ??
                0
              ) >
              earnedLevel
          ) ??
          null;

        /*
         * Progress se po získání medaile vizuálně
         * nikdy nevrátí pod její dosaženou metu.
         */
        const progressCurrent =
          Math.max(
            current,
            earned?.target ??
              0
          );

        return {
          series,
          seriesName:
            levels[0]
              ?.seriesName ??
            series,
          unit:
            achievementUnits[
              series
            ],
          current,
          progressCurrent,
          earned,
          next,
        };
      }
    );

  const earnedSeriesCount =
    achievementSeries.filter(
      (series) =>
        series.earned !==
        null
    ).length;

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <main
      style={{
        maxWidth:
          "1250px",

        margin:
          "0 auto",

        padding:
          "34px 24px 80px",
      }}
    >
      {/* ==================================================
          PROFILOVÉ HERO
      ================================================== */}

      <PageHero
        eyebrow={
          isMe
            ? "Můj pivní profil"
            : "Pivní profil"
        }
        visualVariant="profile"
        imageUrl="/images/heroes/profile.jpg"
        visualText={
          profile.display_name
            .charAt(0)
            .toUpperCase()
        }
        title={
          <>
            {profile.display_name}
          </>
        }
        subtitle={
          isMe
            ? "Tvoje pivní cesta v TasteAppu. Ochutnávky, objevené pivovary, nové styly a odznaky na jednom místě."
            : `Pivní cesta uživatele ${profile.display_name}. Ochutnávky, objevené pivovary, styly a získané odznaky.`
        }
        action={
          <div
            style={{
              display: "grid",
              gap: "8px",
            }}
          >
            <Link
              href={`/stats?user=${profile.id}`}
              className="taste-button-primary"
              style={{
                fontSize: "12px",
              }}
            >
              Statistiky profilu
            </Link>

            <Link
              href="/profiles"
              className="taste-button-secondary"
              style={{
                fontSize: "11px",
              }}
            >
              ← Všichni uživatelé
            </Link>
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
            accent: "#f3b43f",
            value: profileStats.totalQuantity,
            label: "Vypitých piv",
          },
          {
            icon: (
              <AppIcon
                name="label"
                size={18}
              />
            ),
            accent: "#d98945",
            value: profileStats.uniqueBeers,
            label: "Různých piv",
          },
          {
            icon: (
              <AppIcon
                name="brewery"
                size={18}
              />
            ),
            accent: "#d5a13c",
            value: profileStats.uniqueBreweries,
            label: "Pivovarů",
          },
          {
            icon: "◐",
            value: profileStats.uniqueStyles,
            label: "Pivních stylů",
          },
          {
            icon: (
              <AppIcon
                name="globe"
                size={18}
              />
            ),
            accent: "#d37f43",
            value: profileStats.uniqueCountries,
            label: "Států",
          },
        ]}
      />
      {/* ==================================================
          PIVNÍ OTISK
      ================================================== */}

      <section
        style={{
          marginBottom: "38px",
        }}
      >
        <div
          style={{
            marginBottom: "14px",
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom: "5px",
            }}
          >
            Osobní profil
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              letterSpacing:
                "-0.025em",
            }}
          >
            Pivní otisk
          </h2>

          <p
            style={{
              maxWidth: "620px",
              margin:
                "6px 0 0",
              color:
                "var(--taste-text-muted)",
              fontSize: "11px",
              lineHeight: 1.55,
            }}
          >
            Rychlý pohled na to,
            co se v ochutnávkách
            tohoto profilu objevuje
            nejčastěji.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {quickProfileItems.map(
            (item) => (
              <article
                key={item.label}
                style={{
                  position:
                    "relative",
                  overflow:
                    "hidden",
                  minHeight:
                    "112px",
                  padding:
                    "15px 16px",
                  border:
                    `1px solid ${item.border}`,
                  borderRadius:
                    "var(--taste-radius-lg)",
                  background: `
                    radial-gradient(
                      circle at 100% 0%,
                      ${item.glow},
                      transparent 9rem
                    ),
                    linear-gradient(
                      145deg,
                      ${item.wash},
                      transparent 72%
                    ),
                    var(--taste-surface)
                  `,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,235,200,0.025)",
                }}
              >
                <div
                  style={{
                    width: "25px",
                    height: "3px",
                    marginBottom:
                      "13px",
                    borderRadius:
                      "999px",
                    background:
                      item.accent,
                    boxShadow:
                      `0 0 13px ${item.glow}`,
                  }}
                />

                <div
                  style={{
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "9px",
                    fontWeight:
                      750,
                    letterSpacing:
                      "0.075em",
                    textTransform:
                      "uppercase",
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",
                    color:
                      "var(--taste-text)",
                    fontSize:
                      "16px",
                    lineHeight:
                      1.2,
                    fontWeight:
                      800,
                    letterSpacing:
                      "-0.02em",
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "10px",
                  }}
                >
                  {item.detail}
                </div>
              </article>
            )
          )}
        </div>
      </section>

      <ProfileActivityCard
        monthlyActivity={
          profileStats.monthlyActivity
        }
        mostActiveMonth={
          profileStats.mostActiveMonth
        }
        mostActiveYear={
          profileStats.mostActiveYear
        }
        averagePerMonth={
          profileStats.averagePerMonth
        }
      />

      {/* ==================================================
          MEDAILOVÉ CESTY
      ================================================== */}

      <section
        style={{
          marginBottom:
            "42px",
        }}
      >
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
              Achievementy
            </div>

            <h2
              style={{
                margin:
                  0,
                fontSize:
                  "24px",
                letterSpacing:
                  "-0.025em",
              }}
            >
              Medailové cesty
            </h2>
          </div>

          <div
            style={{
              textAlign:
                "right",
            }}
          >
            <div
              style={{
                color:
                  "var(--taste-amber-bright)",
                fontSize:
                  "20px",
                lineHeight:
                  1,
                fontWeight:
                  800,
              }}
            >
              {
                earnedSeriesCount
              }
              /
              {
                achievementSeries.length
              }
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "9px",
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.06em",
              }}
            >
              cest s medailí
            </div>
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap:
              "11px",
          }}
        >
          {achievementSeries.map(
            (series) => (
              <AchievementSeriesCard
                key={
                  series.series
                }
                seriesName={
                  series.seriesName
                }
                unit={
                  series.unit
                }
                current={
                  series.current
                }
                progressCurrent={
                  series.progressCurrent
                }
                earned={
                  series.earned
                }
                next={
                  series.next
                }
              />
            )
          )}
        </div>
      </section>



      {/* ==================================================
          HISTORIE
      ================================================== */}

      <section>
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
              Historie
            </div>

            <h2
              style={{
                margin:
                  0,

                fontSize:
                  "24px",

                letterSpacing:
                  "-0.025em",
              }}
            >
              Ochutnávky
            </h2>
          </div>

          <div
            style={{
              color:
                "var(--taste-text-muted)",

              fontSize:
                "11px",
            }}
          >
            {
              allTastings.length
            }{" "}
            {allTastings.length ===
            1
              ? "záznam"
              : "záznamů"}
          </div>
        </div>

        {allTastings.length ===
          0 && (
          <div
            className="taste-card"
            style={{
              padding:
                "34px",

              textAlign:
                "center",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "13px",
            }}
          >
            Tento uživatel zatím
            nemá žádnou
            ochutnávku.
          </div>
        )}

        <div
          style={{
            display:
              "grid",

            gap:
              "13px",
          }}
        >
          {allTastings.map(
            (tasting) => {
              const packaging =
                getPackagingMeta(
                  tasting.packaging
                );

              const quantity =
                tasting.quantity ??
                1;

              const beerHops =
                tasting.beers
                  ?.beer_hops
                  ?.map(
                    (beerHop) =>
                      beerHop.hops
                        ?.name
                  )
                  .filter(
                    (
                      hopName
                    ): hopName is string =>
                      Boolean(
                        hopName
                      )
                  ) ?? [];

              return (
                <article
                  key={
                    tasting.id
                  }
                  style={{
                    position:
                      "relative",

                    overflow:
                      "hidden",

                    padding:
                      "19px 20px",

                    border:
                      "1px solid var(--taste-border)",

                    borderRadius:
                      "var(--taste-radius-lg)",

                    background: `
                      linear-gradient(
                        145deg,
                        rgba(231,166,47,0.025),
                        transparent 40%
                      ),
                      var(--taste-surface)
                    `,

                    boxShadow:
                      "var(--taste-shadow-soft)",
                  }}
                >
                  <div
                    style={{
                      position:
                        "absolute",

                      left:
                        0,

                      top:
                        "17px",

                      bottom:
                        "17px",

                      width:
                        "2px",

                      borderRadius:
                        "999px",

                      background:
                        "linear-gradient(180deg, var(--taste-amber), rgba(231,166,47,0.06))",
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "flex-start",

                      gap:
                        "15px",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          0,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          flexWrap:
                            "wrap",

                          alignItems:
                            "center",

                          gap:
                            "8px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "var(--taste-text)",

                            fontSize:
                              "21px",

                            lineHeight:
                              1.15,

                            fontWeight:
                              800,

                            letterSpacing:
                              "-0.025em",
                          }}
                        >
                          {tasting
                            .beers
                            ?.name ??
                            "Neznámé pivo"}
                        </div>

                        {quantity >
                          1 && (
                          <span
                            style={
                              quantityBadgeStyle
                            }
                          >
                            ×
                            {
                              quantity
                            }
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",

                          color:
                            "var(--taste-text-muted)",

                          fontSize:
                            "12px",
                        }}
                      >
                        {tasting.beers?.breweries ? (
                          <Link
                            href={`/breweries/${tasting.beers.breweries.id}`}
                            style={{
                              color: "inherit",
                              textDecoration:
                                "none",
                              borderBottom:
                                "1px solid rgba(231,166,47,0.28)",
                            }}
                          >
                            {tasting.beers.breweries.name}
                          </Link>
                        ) : (
                          "Neznámý pivovar"
                        )}

                        {tasting
                          .beers
                          ?.beer_styles
                          ?.name
                          ? ` · ${tasting.beers.beer_styles.name}`
                          : ""}

                        {tasting
                          .beers
                          ?.breweries
                          ?.country
                          ? ` · ${tasting.beers.breweries.country}`
                          : ""}
                      </div>
                    </div>

                    {isMe && (
                      <EditTastingModalClient
                        tasting={
                          tasting
                        }
                        beers={
                          normalizedBeers
                        }
                        breweries={
                          breweries ??
                          []
                        }
                        countries={
                          countries ??
                          []
                        }
                        styles={
                          styles ?? []
                        }
                        hops={
                          hops ?? []
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

                  {(packaging ||
                    tasting.plato !==
                      null ||
                    tasting.abv !==
                      null ||
                    tasting.ibu !==
                      null) && (
                    <div
                      style={{
                        display:
                          "flex",

                        flexWrap:
                          "wrap",

                        gap:
                          "7px",

                        marginTop:
                          "13px",
                      }}
                    >
                      {packaging && (
                        <ParameterBadge>
                          {
                            packaging.icon
                          }{" "}
                          {
                            packaging.label
                          }
                        </ParameterBadge>
                      )}

                      {tasting.plato !==
                        null && (
                        <ParameterBadge>
                          {
                            tasting.plato
                          }{" "}
                          °P
                        </ParameterBadge>
                      )}

                      {tasting.abv !==
                        null && (
                        <ParameterBadge>
                          {
                            tasting.abv
                          }{" "}
                          %
                        </ParameterBadge>
                      )}

                      {tasting.ibu !==
                        null && (
                        <ParameterBadge>
                          IBU{" "}
                          {
                            tasting.ibu
                          }
                        </ParameterBadge>
                      )}
                    </div>
                  )}

                  {beerHops.length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          "12px",

                        color:
                          "var(--taste-text-soft)",

                        fontSize:
                          "12px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "var(--taste-text-muted)",
                        }}
                      >
                        Chmely:{" "}
                      </span>

                      {beerHops.join(
                        ", "
                      )}
                    </div>
                  )}

                  {tasting.place && (
                    <div
                      style={{
                        marginTop:
                          "11px",

                        color:
                          "var(--taste-text-soft)",

                        fontSize:
                          "12px",
                      }}
                    >
                      📍{" "}
                      {
                        tasting.place
                      }
                    </div>
                  )}

                  {tasting.notes && (
                    <div
                      style={{
                        marginTop:
                          "12px",

                        padding:
                          "10px 12px",

                        borderLeft:
                          "2px solid rgba(231,166,47,0.32)",

                        borderRadius:
                          "0 9px 9px 0",

                        background:
                          "rgba(255,255,255,0.018)",

                        color:
                          "var(--taste-text-soft)",

                        fontSize:
                          "12px",

                        fontStyle:
                          "italic",

                        lineHeight:
                          1.55,
                      }}
                    >
                      „
                      {
                        tasting.notes
                      }
                      “
                    </div>
                  )}

                  <div
                    style={{
                      marginTop:
                        "13px",

                      paddingTop:
                        "11px",

                      borderTop:
                        "1px solid rgba(231,166,47,0.09)",

                      color:
                        "var(--taste-text-muted)",

                      fontSize:
                        "10px",
                    }}
                  >
                    {formatTastingDate(
                      tasting.tasted_on
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}

// ==================================================
// ODZNAK
// ==================================================

// ==================================================
// VZHLED MEDAILÍ
// ==================================================

const MEDAL_VISUALS = {
  cloth: {
    color: "#c8b494",
    border:
      "rgba(200,180,148,0.32)",
    soft:
      "rgba(200,180,148,0.10)",
    glow:
      "rgba(200,180,148,0.13)",
  },

  wood: {
    color: "#bc7d43",
    border:
      "rgba(188,125,67,0.36)",
    soft:
      "rgba(188,125,67,0.11)",
    glow:
      "rgba(188,125,67,0.15)",
  },

  bronze: {
    color: "#cf824f",
    border:
      "rgba(207,130,79,0.40)",
    soft:
      "rgba(207,130,79,0.12)",
    glow:
      "rgba(207,130,79,0.18)",
  },

  silver: {
    color: "#cbd2d8",
    border:
      "rgba(203,210,216,0.36)",
    soft:
      "rgba(203,210,216,0.09)",
    glow:
      "rgba(203,210,216,0.14)",
  },

  gold: {
    color: "#efb84d",
    border:
      "rgba(239,184,77,0.42)",
    soft:
      "rgba(239,184,77,0.12)",
    glow:
      "rgba(239,184,77,0.20)",
  },

  diamond: {
    color: "#8bdde4",
    border:
      "rgba(139,221,228,0.42)",
    soft:
      "rgba(139,221,228,0.10)",
    glow:
      "rgba(139,221,228,0.20)",
  },

  master: {
    color: "#ffc85c",
    border:
      "rgba(255,200,92,0.52)",
    soft:
      "rgba(255,200,92,0.14)",
    glow:
      "rgba(255,200,92,0.26)",
  },
} satisfies Record<
  AchievementMedal,
  {
    color: string;
    border: string;
    soft: string;
    glow: string;
  }
>;

// ==================================================
// MEDAILOVÁ CESTA
// ==================================================

function AchievementSeriesCard({
  seriesName,
  unit,
  current,
  progressCurrent,
  earned,
  next,
}: {
  seriesName: string;
  unit: string;
  current: number;
  progressCurrent: number;
  earned:
    | AchievementProgress
    | null;
  next:
    | AchievementProgress
    | null;
}) {
  const medal =
    earned?.medal ??
    next?.medal ??
    null;

  const unlocked =
    earned !== null;

  const finished =
    unlocked &&
    next === null;

  const visual =
    medal
      ? MEDAL_VISUALS[
          medal
        ]
      : {
          color:
            "#948879",
          border:
            "rgba(255,255,255,0.08)",
          soft:
            "rgba(255,255,255,0.025)",
          glow:
            "rgba(255,255,255,0.04)",
        };

  const percentage =
    finished
      ? 100
      : next
        ? Math.min(
            100,
            Math.round(
              (
                progressCurrent /
                next.target
              ) *
                100
            )
          )
        : 0;

  return (
    <article
      style={{
        position:
          "relative",
        overflow:
          "hidden",
        padding:
          "17px",
        border:
          `1px solid ${
            unlocked
              ? visual.border
              : "var(--taste-border)"
          }`,
        borderRadius:
          "var(--taste-radius-md)",
        background: `
          radial-gradient(
            circle at 100% 0%,
            ${
              unlocked
                ? visual.glow
                : "rgba(255,255,255,0.025)"
            },
            transparent 10rem
          ),
          linear-gradient(
            145deg,
            ${
              unlocked
                ? visual.soft
                : "rgba(255,255,255,0.012)"
            },
            transparent 60%
          ),
          var(--taste-surface)
        `,
        boxShadow:
          "var(--taste-shadow-soft)",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          gap:
            "13px",
        }}
      >
        <div
          style={{
            width:
              "52px",
            height:
              "52px",
            flexShrink:
              0,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            border:
              `1px solid ${
                unlocked
                  ? visual.border
                  : "rgba(255,255,255,0.07)"
              }`,
            borderRadius:
              "15px",
            background:
              unlocked
                ? visual.soft
                : "rgba(255,255,255,0.022)",
            boxShadow:
              unlocked
                ? `0 0 20px ${visual.glow}`
                : "none",
          }}
        >
          <AchievementMedalIcon
            medal={medal}
            locked={!unlocked}
          />
        </div>

        <div
          style={{
            minWidth:
              0,
            flex:
              1,
          }}
        >
          <div
            style={{
              color:
                "var(--taste-text)",
              fontSize:
                "14px",
              fontWeight:
                800,
              lineHeight:
                1.2,
            }}
          >
            {seriesName}
          </div>

          <div
            style={{
              marginTop:
                "5px",
              color:
                unlocked
                  ? visual.color
                  : "var(--taste-text-muted)",
              fontSize:
                "11px",
              fontWeight:
                750,
            }}
          >
            {earned
              ?.medalName ??
              "Zatím bez medaile"}
          </div>

          <div
            style={{
              marginTop:
                "4px",
              color:
                "var(--taste-text-muted)",
              fontSize:
                "10px",
              lineHeight:
                1.35,
            }}
          >
            {current} {unit}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "15px",
          paddingTop:
            "12px",
          borderTop:
            "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "10px",
            marginBottom:
              "7px",
            color:
              "var(--taste-text-muted)",
            fontSize:
              "9px",
          }}
        >
          {finished ? (
            <>
              <span
                style={{
                  color:
                    visual.color,
                  fontWeight:
                    750,
                }}
              >
                Nejvyšší úroveň dosažena
              </span>

              <span>
                Mistr
              </span>
            </>
          ) : (
            <>
              <span>
                {progressCurrent}
                {" / "}
                {next?.target ??
                  0}
              </span>

              <span>
                {next?.medalName ??
                  ""}
              </span>
            </>
          )}
        </div>

        <div
          style={{
            height:
              "5px",
            overflow:
              "hidden",
            borderRadius:
              "999px",
            background:
              "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width:
                `${percentage}%`,
              height:
                "100%",
              borderRadius:
                "999px",
              background:
                visual.color,
              opacity:
                unlocked
                  ? 1
                  : 0.48,
              boxShadow:
                unlocked
                  ? `0 0 12px ${visual.glow}`
                  : "none",
            }}
          />
        </div>

        {!finished &&
          next && (
            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "9px",
              }}
            >
              Ještě{" "}
              {
                Math.max(
                  0,
                  next.target -
                    progressCurrent
                )
              }{" "}
              do další medaile
            </div>
          )}
      </div>
    </article>
  );
}

// ==================================================
// SVG MEDAILE
// ==================================================

function AchievementMedalIcon({
  medal,
  locked,
}: {
  medal:
    | AchievementMedal
    | null;
  locked: boolean;
}) {
  const color =
    medal
      ? MEDAL_VISUALS[
          medal
        ].color
      : "#948879";

  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{
        color,
        opacity:
          locked
            ? 0.42
            : 1,
        filter:
          locked
            ? "grayscale(0.75)"
            : "none",
      }}
    >
      <path
        d="M14 4h8l4 13-8 4-4-17Z"
        fill="currentColor"
        opacity="0.52"
      />

      <path
        d="M34 4h-8l-4 13 8 4 4-17Z"
        fill="currentColor"
        opacity="0.72"
      />

      <circle
        cx="24"
        cy="29"
        r="13"
        fill="rgba(12,9,6,0.88)"
        stroke="currentColor"
        strokeWidth="2.2"
      />

      <circle
        cx="24"
        cy="29"
        r="9"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.48"
      />

      {medal ===
        "cloth" && (
        <>
          <circle
            cx="24"
            cy="29"
            r="6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <path
            d="M20 29h8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}

      {medal ===
        "wood" && (
        <>
          <path
            d="M19 27c3-3 7-3 10 0"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M20 31c2 2 6 2 8 0"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      )}

      {(medal ===
        "bronze" ||
        medal ===
          "silver" ||
        medal ===
          "gold") && (
        <path
          d="m24 22 2.1 4.2 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L24 22Z"
          fill="currentColor"
        />
      )}

      {medal ===
        "diamond" && (
        <path
          d="m24 21 6 5-6 10-6-10 6-5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}

      {medal ===
        "master" && (
        <>
          <path
            d="m18.5 31 1-7 4.5 3 4.5-3 1 7h-11Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M19 33h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}

      {!medal && (
        <path
          d="M20 29h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement:
    AchievementProgress;
}) {
  const percentage =
    Math.round(
      achievement.progress *
        100
    );

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
          achievement.unlocked
            ? "1px solid rgba(231,166,47,0.34)"
            : "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-md)",

        background:
          achievement.unlocked
            ? `
              radial-gradient(
                circle at 100% 0%,
                rgba(231,166,47,0.14),
                transparent 10rem
              ),
              linear-gradient(
                145deg,
                rgba(231,166,47,0.07),
                rgba(231,166,47,0.015)
              ),
              var(--taste-surface)
            `
            : "var(--taste-surface)",

        boxShadow:
          "var(--taste-shadow-soft)",

        opacity:
          achievement.unlocked
            ? 1
            : 0.82,
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          gap:
            "11px",
        }}
      >
        <div
          style={{
            width:
              "40px",

            height:
              "40px",

            flexShrink:
              0,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            border:
              achievement.unlocked
                ? "1px solid rgba(231,166,47,0.38)"
                : "1px solid rgba(255,255,255,0.07)",

            borderRadius:
              "12px",

            background:
              achievement.unlocked
                ? "rgba(231,166,47,0.10)"
                : "rgba(255,255,255,0.025)",

            fontSize:
              "20px",

            filter:
              achievement.unlocked
                ? "none"
                : "grayscale(0.75)",
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

            flex:
              1,
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "8px",
            }}
          >
            <h3
              style={{
                margin:
                  0,

                color:
                  achievement.unlocked
                    ? "var(--taste-text)"
                    : "var(--taste-text-soft)",

                fontSize:
                  "13px",

                fontWeight:
                  750,

                lineHeight:
                  1.2,
              }}
            >
              {
                achievement.name
              }
            </h3>

            {achievement.unlocked && (
              <span
                style={{
                  color:
                    "var(--taste-amber-bright)",

                  fontSize:
                    "10px",

                  fontWeight:
                    800,
                }}
              >
                ✓
              </span>
            )}
          </div>

          <p
            style={{
              margin:
                "5px 0 0",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "10px",

              lineHeight:
                1.45,
            }}
          >
            {
              achievement.description
            }
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "13px",
        }}
      >
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "10px",

            marginBottom:
              "6px",

            color:
              "var(--taste-text-muted)",

            fontSize:
              "9px",
          }}
        >
          <span>
            {achievement.unlocked
              ? "Splněno"
              : `${achievement.current} / ${achievement.target}`}
          </span>

          <span>
            {
              percentage
            }
            %
          </span>
        </div>

        <div
          style={{
            height:
              "5px",

            overflow:
              "hidden",

            borderRadius:
              "999px",

            background:
              "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width:
                `${percentage}%`,

              height:
                "100%",

              borderRadius:
                "999px",

              background:
                achievement.unlocked
                  ? "var(--taste-amber-bright)"
                  : "rgba(231,166,47,0.48)",

              boxShadow:
                achievement.unlocked
                  ? "0 0 12px rgba(231,166,47,0.18)"
                  : "none",
            }}
          />
        </div>
      </div>
    </article>
  );
}

// ==================================================
// KARTA STATISTIKY
// ==================================================

function StatCard({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "16px 17px",

        border:
          accent
            ? "1px solid rgba(231,166,47,0.34)"
            : "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-md)",

        background:
          accent
            ? `
              linear-gradient(
                145deg,
                rgba(231,166,47,0.10),
                rgba(231,166,47,0.02)
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
          color:
            accent
              ? "var(--taste-amber-bright)"
              : "var(--taste-text)",

          fontSize:
            "27px",

          lineHeight:
            1,

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
            "6px",

          color:
            "var(--taste-text-muted)",

          fontSize:
            "11px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ==================================================
// PARAMETR
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
          "4px 8px",

        borderRadius:
          "999px",

        border:
          "1px solid rgba(231,166,47,0.17)",

        background:
          "rgba(231,166,47,0.045)",

        color:
          "var(--taste-text-soft)",

        fontSize:
          "11px",
      }}
    >
      {children}
    </span>
  );
}

// ==================================================
// DATUM
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
// STYLY
// ==================================================

const quantityBadgeStyle = {
  padding:
    "3px 8px",

  borderRadius:
    "999px",

  border:
    "1px solid rgba(231,166,47,0.30)",

  background:
    "rgba(231,166,47,0.08)",

  color:
    "var(--taste-amber-bright)",

  fontSize:
    "11px",

  fontWeight:
    800,
};