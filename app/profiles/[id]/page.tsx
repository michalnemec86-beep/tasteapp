import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";

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
} from "@/lib/achievements";

import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import EditTastingModalClient from "@/app/EditTastingModalClient";
import ProfileActivityCard from "./ProfileActivityCard";
import ProfileBeerDnaCard from "./ProfileBeerDnaCard";
import ProfileTechnicalCard from "./ProfileTechnicalCard";
import ProfilePackagingCard from "./ProfilePackagingCard";
import ProfileBreweriesCard from "./ProfileBreweriesCard";
import ProfileBrandsCard from "./ProfileBrandsCard";
import ProfileWorldCard from "./ProfileWorldCard";
import ProfileHopsCard from "./ProfileHopsCard";
import ProfileRecordsCard from "./ProfileRecordsCard";
import ProfileAchievementJourneys from "./ProfileAchievementJourneys";
import ProfileHeroIdentity from "./ProfileHeroIdentity";
import ProfileTastingControls, {
  type TastingSort,
} from "./ProfileTastingControls";
import ProfileBreweriesView from "./ProfileBreweriesView";

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
  searchParams: Promise<{
    view?: string | string[];
    sort?: string | string[];
    country?: string | string[];
    q?: string | string[];
    letter?: string | string[];
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
  searchParams,
}: ProfilePageProps) {
  const { id } =
    await params;
  const resolvedSearchParams = await searchParams;
  const requestedView = resolvedSearchParams.view;
  const view =
    requestedView === "beers" ||
    requestedView === "breweries" ||
    requestedView === "medals"
      ? requestedView
      : "stats";
  const requestedSort = resolvedSearchParams.sort;
  const tastingSort: TastingSort =
    requestedSort === "oldest" ||
    requestedSort === "alpha" ||
    requestedSort === "country"
      ? requestedSort
      : "newest";
  const selectedCountry =
    typeof resolvedSearchParams.country === "string"
      ? resolvedSearchParams.country
      : "";
  const tastingQuery =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const selectedLetter =
    typeof resolvedSearchParams.letter === "string"
      ? resolvedSearchParams.letter.toLocaleUpperCase("cs")
      : "";

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
        real_name,
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

  const tastingsPromise = fetchAllRows((from, to) =>
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
        beer_versions (
          id,
          version_year,
          brewery_id,
          breweries (
            id,
            name,
            country
          ),
          beer_styles (
            id,
            name
          ),
          beer_version_hops (
            hops (
              id,
              name
            )
          ),
          beer_version_collaborators (
            display_order,
            breweries (
              id,
              name,
              country
            )
          )
        ),
        beers (
          id,
          brewery_id,
          name,
          is_non_alcoholic,
          brands (
            id,
            name
          ),
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
      .eq("user_id", id)
      .order("id")
      .range(from, to));

  const beersPromise = fetchAllRows((from, to) =>
    supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        is_catalog,
        brands (
          id,
          name
        ),
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
      .order("is_catalog", { ascending: false })
      .order("name")
      .order("id")
      .range(from, to));

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

  const tastings = tastingsResult;
  const beers = beersResult;

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

  const breweriesById = new Map(
    (breweries ?? []).map((brewery) => [String(brewery.id), brewery])
  );

  const globalTastings =
    (tastings ?? []).map(
      (tasting) => {
        const beer =
          singleRelation(
            tasting.beers
          );

        const beerVersion =
          singleRelation(
            tasting.beer_versions
          );

        return {
          ...tasting,

          beer_versions:
            beerVersion
              ? {
                  ...beerVersion,
                  breweries:
                    singleRelation(
                      beerVersion.breweries
                    ) ??
                    (
                      beerVersion.brewery_id != null
                        ? breweriesById.get(String(beerVersion.brewery_id)) ?? null
                        : null
                    ),
                  beer_styles:
                    singleRelation(
                      beerVersion.beer_styles
                    ),
                  beer_version_hops:
                    (
                      beerVersion.beer_version_hops ??
                      []
                    ).map(
                      (versionHop) => ({
                        ...versionHop,
                        hops:
                          singleRelation(
                            versionHop.hops
                          ),
                      })
                    ),
                  beer_version_collaborators:
                    (beerVersion.beer_version_collaborators ?? [])
                      .map((item) => ({
                        ...item,
                        breweries: singleRelation(item.breweries),
                      })),
                }
              : null,

          beers: beer
            ? {
                ...beer,

                brands:
                  singleRelation(
                    beer.brands
                  ),

                breweries:
                  singleRelation(
                    beer.breweries
                  ) ??
                  (
                    beer.brewery_id != null
                      ? breweriesById.get(String(beer.brewery_id)) ?? null
                      : null
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

  const allTastings = globalTastings;

  const normalizedBeers =
    (beers ?? []).map(
      (beer) => ({
        ...beer,

        breweries:
          singleRelation(
            beer.breweries
          ),

        brands:
          singleRelation(
            beer.brands
          ),

        beer_styles:
          singleRelation(
            beer.beer_styles
          ),
      })
    );

  const tastingCountries = Array.from(
    new Set(
      allTastings
        .map(
          (tasting) =>
            (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)
              ?.country
        )
        .filter((country): country is string => Boolean(country))
    )
  ).sort((a, b) => a.localeCompare(b, "cs"));

  function tastingInitial(name: string | null | undefined) {
    const first = name?.trim().charAt(0).toLocaleUpperCase("cs") ?? "";
    const normalized = first.normalize("NFD").replace(/\p{M}/gu, "");

    return /^[A-Z]$/.test(normalized) ? normalized : "#";
  }

  const tastingLetters = Array.from(
    new Set(allTastings.map((tasting) => tastingInitial(tasting.beers?.name)))
  ).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "cs");
  });

  const normalizedTastingQuery = tastingQuery.toLocaleLowerCase("cs");

  const visibleTastings = allTastings
    .filter((tasting) => {
      const brewery =
        tasting.beer_versions?.breweries ?? tasting.beers?.breweries;

      if (selectedCountry && brewery?.country !== selectedCountry) {
        return false;
      }

      if (
        selectedLetter &&
        tastingInitial(tasting.beers?.name) !== selectedLetter
      ) {
        return false;
      }

      if (normalizedTastingQuery) {
        const searchableValues = [
          tasting.beers?.name,
          tasting.beers?.brands?.name,
          brewery?.name,
          brewery?.country,
          tasting.beers?.beer_styles?.name,
          tasting.place,
          tasting.notes,
        ];

        if (
          !searchableValues.some((value) =>
            value?.toLocaleLowerCase("cs").includes(normalizedTastingQuery)
          )
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const beerA = a.beers?.name ?? "";
      const beerB = b.beers?.name ?? "";
      const countryA =
        (a.beer_versions?.breweries ?? a.beers?.breweries)?.country ?? "";
      const countryB =
        (b.beer_versions?.breweries ?? b.beers?.breweries)?.country ?? "";
      const dateA = Date.parse(a.tasted_at ?? a.tasted_on ?? "") || 0;
      const dateB = Date.parse(b.tasted_at ?? b.tasted_on ?? "") || 0;

      if (tastingSort === "alpha") {
        return beerA.localeCompare(beerB, "cs", { sensitivity: "base" });
      }

      if (tastingSort === "oldest") return dateA - dateB;
      if (tastingSort === "newest") return dateB - dateA;

      return (
        countryA.localeCompare(countryB, "cs", { sensitivity: "base" }) ||
        beerA.localeCompare(beerB, "cs", { sensitivity: "base" })
      );
    });

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

  const breweryCountriesById = new Map(
    (breweries ?? []).map((brewery) => [String(brewery.id), brewery.country])
  );
  const profileBreweryItems = tasteStats.breweries.map((brewery) => ({
    ...brewery,
    country: breweryCountriesById.get(String(brewery.id)) ?? null,
  }));

  const quickProfileItems = [
    {
      label: "Top styl",
      href: tasteStats.styles[0]
        ? `/stats?user=${profile.id}&locked=1&style=${tasteStats.styles[0].id}`
        : `/stats?user=${profile.id}&locked=1&focus=styles`,
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
      label: "Top značka",
      href: tasteStats.brands[0]
        ? `/stats?user=${profile.id}&locked=1&brand=${tasteStats.brands[0].id}`
        : `/stats?user=${profile.id}&locked=1&focus=brands`,
      value:
        tasteStats.brands[0]
          ?.name ?? "—",
      detail:
        tasteStats.brands[0]
          ? `${tasteStats.brands[0].count}× v ochutnávkách`
          : "Zatím bez dat",
      accent: "#d98a43",
      border: "rgba(217,138,67,0.38)",
      glow: "rgba(217,138,67,0.16)",
      wash: "rgba(217,138,67,0.075)",
    },
    {
      label: "Top pivovar",
      href: tasteStats.breweries[0]
        ? `/stats?user=${profile.id}&locked=1&brewery=${tasteStats.breweries[0].id}`
        : `/stats?user=${profile.id}&locked=1&focus=breweries`,
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
      href: tasteStats.countries[0]
        ? `/stats?user=${profile.id}&locked=1&country=${encodeURIComponent(tasteStats.countries[0].name)}`
        : `/stats?user=${profile.id}&locked=1&focus=countries`,
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
      href: tasteStats.packaging[0]
        ? `/stats?user=${profile.id}&locked=1&packaging=${tasteStats.packaging[0].id}`
        : `/stats?user=${profile.id}&locked=1`,
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
      href: `/stats?user=${profile.id}&locked=1&focus=hops`,
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

  const achievements =
    buildAchievementProgress(
      allTastings as unknown as
        AchievementTasting[],
      {
        breweryOfDayIds,
      }
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
    "brewery_of_day",
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
    brewery_of_day:
      "pivovarů dne",
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
          levels,
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
          <ProfileHeroIdentity
            displayName={
              profile.display_name
            }
            realName={
              profile.real_name
            }
            avatarUrl={
              profile.avatar_url
            }
            profileId={
              profile.id
            }
            isMe={
              isMe
            }
          />
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
            href: `/stats?user=${profile.id}&locked=1&focus=beers&metric=quantity`,
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
            href: `/stats?user=${profile.id}&locked=1&focus=beers`,
          },
          {
            icon: (
              <AppIcon
                name="label"
                size={18}
              />
            ),
            accent: "#d98945",
            value: profileStats.uniqueBrands,
            label: "Značek",
            href: `/stats?user=${profile.id}&locked=1&focus=brands`,
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
            href: `/stats?user=${profile.id}&locked=1&focus=breweries`,
          },
          {
            icon: "◐",
            accent: "#8ea348",
            value: profileStats.uniqueStyles,
            label: "Pivních stylů",
            href: `/stats?user=${profile.id}&locked=1&focus=styles`,
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
            href: `/stats?user=${profile.id}&locked=1&focus=countries`,
          },
          {
            icon: (
              <AppIcon
                name="hop"
                size={18}
              />
            ),
            accent: "#879a43",
            value: profileStats.uniqueHops,
            label: "Chmelů",
            href: `/stats?user=${profile.id}&locked=1&focus=hops`,
          },
        ]}
      />
      <nav
        aria-label="Části pivního deníku"
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        {[
          { key: "stats", label: "Moje statistiky", href: `/profiles/${profile.id}` },
          { key: "beers", label: "Co jsem vypil", href: `/profiles/${profile.id}?view=beers` },
          { key: "breweries", label: "Moje pivovary", href: `/profiles/${profile.id}?view=breweries` },
          { key: "medals", label: "Hospodské ocenění", href: `/profiles/${profile.id}?view=medals` },
        ].map((item) => {
          const active = view === item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              className="taste-button-secondary"
              aria-current={active ? "page" : undefined}
              style={{
                background: active
                  ? "linear-gradient(180deg, rgba(231,166,47,0.20), rgba(168,98,33,0.10))"
                  : undefined,
                borderColor: active ? "rgba(245,184,63,0.52)" : undefined,
                color: active ? "var(--taste-amber-bright)" : undefined,
                fontSize: "12px",
                fontWeight: 750,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {view === "stats" && <>
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
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {quickProfileItems.map(
            (item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "block",
                  color: "inherit",
                  textDecoration: "none",
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
              </Link>
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

      <ProfileBeerDnaCard
        styles={
          tasteStats.styles
        }
        profileId={
          profile.id
        }
      />

      <ProfileTechnicalCard
        plato={
          profileStats.plato
        }
        abv={
          profileStats.abv
        }
        ibu={
          profileStats.ibu
        }
      />

      <ProfilePackagingCard
        items={
          tasteStats.packaging
        }
        profileId={
          profile.id
        }
      />

      <ProfileBrandsCard
        items={tasteStats.brands}
        profileId={
          profile.id
        }
      />

      <ProfileBreweriesCard
        items={
          tasteStats.breweries
        }
        profileId={
          profile.id
        }
      />

      <ProfileWorldCard
        items={
          tasteStats.countries
        }
        profileId={
          profile.id
        }
      />

      <ProfileHopsCard
        items={
          tasteStats.hops
        }
        profileId={
          profile.id
        }
      />

      <ProfileRecordsCard
        strongestBeer={
          profileStats.strongestBeer
        }
        bitterestBeer={
          profileStats.bitterestBeer
        }
        highestPlatoBeer={
          profileStats.highestPlatoBeer
        }
        mostActiveMonth={
          profileStats.mostActiveMonth
        }
        mostActiveYear={
          profileStats.mostActiveYear
        }
        firstTasting={
          profileStats.firstTasting
        }
      />
      </>}

      {view === "breweries" && (
        <ProfileBreweriesView items={profileBreweryItems} profileId={profile.id} />
      )}

      {/* ==================================================
          MEDAILOVÉ CESTY
      ================================================== */}

      {view === "medals" && <ProfileAchievementJourneys
        series={
          achievementSeries
        }
        earnedSeriesCount={
          earnedSeriesCount
        }
      />}

      {/* ==================================================
          HISTORIE
      ================================================== */}

      {view === "beers" && <section>
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
              visibleTastings.length
            }{" "}
            {visibleTastings.length ===
            1
              ? "záznam"
              : "záznamů"}
          </div>
        </div>

        <ProfileTastingControls
          sort={tastingSort}
          country={selectedCountry}
          countries={tastingCountries}
          query={tastingQuery}
          letter={selectedLetter}
          letters={tastingLetters}
        />

        {visibleTastings.length ===
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
            {selectedCountry || selectedLetter || tastingQuery
              ? "Tomuto výběru neodpovídá žádná ochutnávka."
              : "Tento uživatel zatím nemá žádnou ochutnávku."}
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
          {visibleTastings.map(
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
                          {tasting.beers?.id ? (
                            <Link href={`/beers/${tasting.beers.id}`} className="taste-entity-link" style={{ color: "inherit" }}>
                              {tasting.beers.name}
                            </Link>
                          ) : "Neznámé pivo"}
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
                        {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries) ? (
                          <Link
                            href={`/breweries/${(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.id}`}
                            className="taste-entity-link"
                            style={{ color: "inherit" }}
                          >
                            {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.name}
                          </Link>
                        ) : (
                          "Neznámý pivovar"
                        )}

                        {(tasting.beer_versions?.beer_version_collaborators ?? [])
                          .filter((item) => item.breweries)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((item) => (
                            <span key={item.breweries!.id} style={{ marginLeft: "5px", fontSize: "10px" }}>
                              +{" "}
                              <Link href={`/breweries/${item.breweries!.id}`} className="taste-entity-link" style={{ color: "inherit" }}>
                                {item.breweries!.name}
                              </Link>
                            </span>
                          ))}

                        {tasting
                          .beers
                          ?.beer_styles
                          ?.name
                          ? ` · ${tasting.beers.beer_styles.name}`
                          : ""}

                        {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)?.country
                          ? ` · ${(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.country}`
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
      </section>}
    </main>
  );
}

// ==================================================
// ODZNAK
// ==================================================

// ==================================================
// VZHLED MEDAILÍ
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
