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
import { getCzechVocative } from "@/lib/czech-vocative";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { parsePositivePage } from "@/lib/pagination";

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
  real_name: string | null;
  avatar_url: string | null;
};

type BreweryRow = {
  id: number;
  name: string;
  country: string | null;
  logo_url: string | null;
  aliases?: string[];
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
  is_non_alcoholic: boolean;
  is_catalog: boolean;

  brands:
    | { id: number; name: string }
    | null;

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

type TastingBeerRow = {
  id: number;
  name: string;

  brands:
    | { id: number; name: string }
    | null;

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
  show_in_timeline: boolean;

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

  beer_versions?:
    | {
        id: number;
        version_year: number | null;
        breweries: BreweryRow | null;
        beer_styles: BeerStyleRow | null;
        beer_version_hops:
          | { hops: HopRow | null }[]
          | null;
        beer_version_collaborators:
          | { display_order: number; breweries: BreweryRow | null }[]
          | null;
      }
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

type CatalogEventRow = {
  id: number;
  actor_user_id: string;
  event_type:
    | "beer_created"
    | "beer_version_created"
    | "brand_created"
    | "brewery_created"
    | "hop_created";
  created_at: string;
  beers: { id: number; name: string; brands: { id: number; name: string } | null } | null;
  breweries: { id: number; name: string } | null;
  brands: { id: number; name: string } | null;
  hops: { id: number; name: string } | null;
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
    }
  | {
      type: "catalog";
      sortAt: number;
      catalogEvent: CatalogEventRow;
    };

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ timelinePage?: string | string[] }>;
}) {
  const timelinePage = Math.min(
    parsePositivePage((await searchParams).timelinePage),
    1000
  );
  const timelinePageSize = 30;
  const timelineFetchLimit = timelinePage * timelinePageSize + 1;
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
        "id, display_name, real_name, avatar_url"
      )
      .order(
        "display_name"
      );

  const tastingsPromise = fetchAllRows((from, to) =>
    supabase
      .from("tastings")
      .select(`
        id,
        user_id,
        show_in_timeline,
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
          breweries (
            id,
            name,
            country,
            logo_url
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
            country,
            logo_url
          )
          )
        ),
        beers (
          id,
          name,
          brands (
            id,
            name
          ),
          breweries (
            id,
            name,
            country,
            logo_url
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
      )
      .order("id", { ascending: false })
      .eq("show_in_timeline", true)
      .range(from, to), 500, timelineFetchLimit);

  const statsTastingsPromise = fetchAllRows((from, to) =>
    supabase.from("tastings").select(`
      id, user_id, quantity, packaging,
      beer_versions (
        breweries (id, name, country, logo_url),
        beer_styles (id, name),
        beer_version_hops (hops (id, name))
      ),
      beers (
        id, name, brands (id, name),
        breweries (id, name, country, logo_url),
        beer_styles (id, name),
        beer_hops (hops (id, name))
      )
    `).order("id").range(from, to)
  );

  const achievementsPromise = fetchAllRows((from, to) =>
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
      )
      .order("id", { ascending: false })
      .range(from, to), 500, timelineFetchLimit);

  const catalogEventsPromise = fetchAllRows((from, to) => supabase
    .from("catalog_events")
    .select(`
      id, actor_user_id, event_type, created_at,
      beers ( id, name, brands ( id, name ) ),
      breweries ( id, name ),
      brands ( id, name ),
      hops ( id, name )
    `)
    .eq("show_in_timeline", true)
    .neq("event_type", "beer_confirmed")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to), 500, timelineFetchLimit);

  const beersPromise = fetchAllRows((from, to) =>
    supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        is_non_alcoholic,
        is_catalog,
        brands (
          id,
          name
        ),
        breweries (
            id,
            name,
            country,
            logo_url
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
      `)
      .order("is_catalog", { ascending: false })
      .order("name")
      .order("id")
      .range(from, to));

  const breweriesPromise =
    supabase
      .from("breweries")
      .select(`
        id,
        name,
        country,
        logo_url,
        brewery_name_history (
          previous_name
        )
      `)
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
    statsTastings,
    achievementsResult,
    catalogEventsResult,
    beersResult,
    breweriesResult,
    countriesResult,
    stylesResult,
    hopsResult,
  ] =
    await Promise.all([
      profilesPromise,
      tastingsPromise,
      statsTastingsPromise,
      achievementsPromise,
      catalogEventsPromise,
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

  const tastings = tastingsResult;
  const achievements = achievementsResult;
  const catalogEvents = catalogEventsResult;

  const beers = beersResult;

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

  const timelineTastings = (tastings ?? []) as unknown as TastingRow[];
  const allTastings = statsTastings as unknown as TastingRow[];

  const allAchievements =
    (achievements ??
      []) as AchievementRow[];

  const rawCatalogEvents = (catalogEvents ?? []) as unknown as Array<{
    id: number;
    actor_user_id: string;
    event_type: CatalogEventRow["event_type"];
    created_at: string;
    beers: ({ id: number; name: string; brands: { id: number; name: string } | Array<{ id: number; name: string }> | null } | Array<{ id: number; name: string; brands: { id: number; name: string } | Array<{ id: number; name: string }> | null }>) | null;
    breweries: { id: number; name: string } | Array<{ id: number; name: string }> | null;
    brands: { id: number; name: string } | Array<{ id: number; name: string }> | null;
    hops: { id: number; name: string } | Array<{ id: number; name: string }> | null;
  }>;
  const allCatalogEvents = rawCatalogEvents.map((event) => {
    const beer = singleRelation(event.beers);
    return {
      ...event,
      beers: beer ? { ...beer, brands: singleRelation(beer.brands) } : null,
      breweries: singleRelation(event.breweries),
      brands: singleRelation(event.brands),
      hops: singleRelation(event.hops),
    };
  }) as CatalogEventRow[];

  const allBeers =
    (beers ??
      []) as unknown as
      CatalogBeerRow[];

  const allBreweries =
    (breweries ?? []).map((brewery) => ({
      id: brewery.id,
      name: brewery.name,
      country: brewery.country,
      logo_url: brewery.logo_url,
      aliases: (brewery.brewery_name_history ?? [])
        .map((item) => item.previous_name)
        .filter(Boolean),
    })) as BreweryRow[];

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

  const totalBeers = new Set(
    allTastings.map((tasting) => tasting.beers?.id).filter((id) => id != null)
  ).size;

  const totalBrands = new Set(
    allTastings.map((tasting) => tasting.beers?.brands?.id).filter((id) => id != null)
  ).size;

  const totalBreweries = new Set(
    allTastings
      .map((tasting) => tasting.beer_versions?.breweries?.id ?? tasting.beers?.breweries?.id)
      .filter((id) => id != null)
  ).size;

  const totalStyles = new Set(
    allTastings
      .map((tasting) => (tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles)?.id)
      .filter((id) => id != null)
  ).size;

  const totalCountries = new Set(
    allTastings
      .map((tasting) => (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)?.country
        ?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim())
      .filter(Boolean)
  ).size;

  // ==================================================
  // TIMELINE
  // ==================================================

  const timeline:
    TimelineEvent[] = [
    ...timelineTastings
      .map(
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

    ...allCatalogEvents.map((catalogEvent) => ({
      type: "catalog" as const,
      sortAt: new Date(catalogEvent.created_at).getTime(),
      catalogEvent,
    })),
  ];

  timeline.sort(
    (a, b) =>
      b.sortAt -
      a.sortAt
  );

  const visibleTimeline = timeline.slice(
    (timelinePage - 1) * timelinePageSize,
    timelinePage * timelinePageSize
  );
  const hasOlderTimeline = timeline.length > timelinePage * timelinePageSize;

  const timelineUserAccents =
    buildTimelineUserAccentMap(
      visibleTimeline
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
        mobileCompact
        eyebrow="Pivní deník"
        imageUrl="/images/heroes/home.jpg"
        imagePosition="68% 30%"
        title={
          <>
            Na zdraví
            {currentProfile
              ? `, ${getCzechVocative(currentProfile.real_name ?? currentProfile.display_name)}`
              : ""}
            .
          </>
        }
        subtitle="Zapiš další ochutnávku, sleduj svoje pivní objevy a nech TasteApp skládat příběh z pivovarů, stylů, zemí a chmelů."
        action={
          <div className="taste-desktop-brewery-of-day">
            <BreweryOfDayCard brewery={breweryOfDay} />
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
            href: "/stats#piva",
          },
          {
            icon: (
              <AppIcon
                name="label"
                size={18}
              />
            ),
            accent: "#d98a43",
            value: totalBeers,
            label: "Různých piv",
            href: "/stats#piva",
          },
          {
            icon: (
              <AppIcon
                name="label"
                size={18}
              />
            ),
            accent: "#c46f38",
            value: totalBrands,
            label: "Značek",
            href: "/stats#znacky",
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
            href: "/stats#pivovary",
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
            href: "/stats#styly",
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
            href: "/stats#staty",
          },
        ]}
      />

      <div className="taste-mobile-brewery-of-day">
        <BreweryOfDayCard brewery={breweryOfDay} />
      </div>

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
            getItemHref={(item) => `/styles/${item.id}`}
          />


        </aside>

        {/* ==================================================
            TIMELINE
        ================================================== */}

        <section id="timeline" className="order-1 xl:order-2 xl:col-span-6">

          <div
            className="taste-label"
            style={{ marginBottom: "10px" }}
          >
            Hospoda
          </div>

          <div className="taste-timeline-actions">
            <TastingModal
              beers={allBeers}
              breweries={allBreweries}
              countries={countries ?? []}
              styles={allStyles}
              hops={allHops}
            />
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

                if (event.type === "catalog") {
                  return (
                    <CatalogTimelineCard
                      key={`catalog-${event.catalogEvent.id}`}
                      row={event.catalogEvent}
                      profile={getProfile(event.catalogEvent.actor_user_id)}
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
                    userAccent={
                      timelineUserAccents.get(
                        tasting.user_id
                      ) ??
                      getTimelineUserAccent(
                        tasting.user_id
                      )
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
          <nav aria-label="Stránkování časové osy" className="flex items-center justify-between gap-4 pt-5">
            {timelinePage > 1 ? (
              <Link href={`/?timelinePage=${timelinePage - 1}#timeline`} className="taste-button-secondary">
                ← Novější příspěvky
              </Link>
            ) : <span />}
            {hasOlderTimeline && (
              <Link href={`/?timelinePage=${timelinePage + 1}#timeline`} className="taste-button-secondary">
                Starší příspěvky →
              </Link>
            )}
          </nav>
        </section>

        {/* PRAVÁ STRANA */}

        <aside className="order-3 grid gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-1">

          <StatsRankingCard
            title="Nejčastější piva"
            subtitle="Konkrétní piva"
            icon={
              <AppIcon
                name="label"
                size={20}
              />
            }
            accent="#e7a62f"
            items={
              globalStats.beers
            }
            getItemHref={(item) => `/beers/${item.id}`}
          />

          <StatsRankingCard
            title="Značky"
            subtitle="Nejčastější produktové značky"
            icon={<AppIcon name="label" size={20} />}
            accent="#d98a43"
            items={globalStats.brands}
            getItemHref={(item) => `/brands/${item.id}`}
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
            getItemHref={(item) => `/breweries?focus=1&country=${encodeURIComponent(item.name)}`}
          />

        </aside>
      </div>
    </main>
  );
}

// ==================================================
// KARTA OCHUTNÁVKY V TIMELINE
// ==================================================

const TIMELINE_USER_ACCENTS = [
  "#f2b63f",
  "#8ea34a",
  "#d65b42",
  "#a86221",
  "#e88835",
  "#cf8f29",
] as const;

function getTimelineUserAccent(
  userId: string
) {
  let hash = 0;

  for (
    let index = 0;
    index < userId.length;
    index += 1
  ) {
    hash =
      Math.imul(hash, 31) +
      userId.charCodeAt(index);
    hash |= 0;
  }

  return TIMELINE_USER_ACCENTS[
    Math.abs(hash) %
      TIMELINE_USER_ACCENTS.length
  ];
}

function buildTimelineUserAccentMap(
  events: TimelineEvent[]
) {
  const assignments =
    new Map<string, string>();

  for (const event of events) {
    if (
      event.type !==
      "tasting"
    ) {
      continue;
    }

    const userId =
      event.tasting.user_id;

    if (
      assignments.has(
        userId
      )
    ) {
      continue;
    }

    const accent =
      TIMELINE_USER_ACCENTS[
        assignments.size %
          TIMELINE_USER_ACCENTS.length
      ];

    assignments.set(
      userId,
      accent
    );
  }

  return assignments;
}

function getTastingGlowVisual(
  tastingId: number
) {
  const variants = [
    {
      x: 82,
      y: 18,
      radius: "14rem",
      alpha: "46",
      shadow: "38",
    },
    {
      x: 18,
      y: 72,
      radius: "17rem",
      alpha: "3F",
      shadow: "34",
    },
    {
      x: 68,
      y: 82,
      radius: "15rem",
      alpha: "4C",
      shadow: "3D",
    },
    {
      x: 26,
      y: 20,
      radius: "16rem",
      alpha: "44",
      shadow: "36",
    },
    {
      x: 92,
      y: 58,
      radius: "18rem",
      alpha: "42",
      shadow: "3A",
    },
  ] as const;

  return variants[
    Math.abs(tastingId) %
      variants.length
  ];
}

function TastingTimelineCard({
  tasting,
  profile,
  userAccent,
  isOwn,
  beers,
  breweries,
  countries,
  styles,
  hops,
}: {
  tasting: TastingRow;
  profile: ProfileRow | null;
  userAccent: string;
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
    tasting.quantity ?? 1;

  const glowVisual =
    getTastingGlowVisual(
      tasting.id
    );

  const visual = {
    accent: userAccent,
    background:
      `${userAccent}12`,
    border:
      `${userAccent}52`,
    glow:
      `${userAccent}${glowVisual.alpha}`,
  };

  const packagingIcon =
    tasting.packaging === "bottle"
      ? "bottle"
      : tasting.packaging === "can"
        ? "can"
        : tasting.packaging === "pet"
          ? "pet"
          : tasting.packaging ===
                "other" ||
              tasting.packaging ===
                null
            ? "package"
            : "beer";

  const beerName =
    tasting.beers?.name ??
    "Neznámé pivo";

  const tastingBrewery =
    tasting.beer_versions
      ?.breweries ??
    tasting.beers
      ?.breweries ??
    null;

  const breweryName =
    tastingBrewery?.name ??
    null;

  const breweryId =
    tastingBrewery?.id ??
    null;

  const collaborators = [
    ...(tasting.beer_versions
      ?.beer_version_collaborators ??
      []),
  ]
    .sort(
      (a, b) =>
        a.display_order -
        b.display_order
    )
    .map(
      (item) =>
        item.breweries
    )
    .filter(
      (
        item
      ): item is BreweryRow =>
        Boolean(item)
    );

  const versionHops =
    tasting.beer_versions
      ?.beer_version_hops
      ?.map(
        (item) =>
          item.hops?.name
      )
      .filter(
        (
          name
        ): name is string =>
          Boolean(name)
      ) ?? [];

  const catalogHops =
    tasting.beers
      ?.beer_hops
      ?.map(
        (item) =>
          item.hops?.name
      )
      .filter(
        (
          name
        ): name is string =>
          Boolean(name)
      ) ?? [];

  const hopNames = [
    ...new Set(
      versionHops.length > 0
        ? versionHops
        : catalogHops
    ),
  ];

  const metadata = [
    tasting.beers
      ?.brands
      ?.name
      ? `Značka: ${tasting.beers.brands.name}`
      : null,
    tasting.beer_versions
      ?.beer_styles
      ?.name ??
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
    hopNames.length > 0
      ? `Chmel: ${hopNames.join(", ")}`
      : null,
    tastingBrewery?.country
      ? tastingBrewery.country
      : null,
    packaging
      ? packaging.label
      : null,
    quantity > 1
      ? `${quantity}×`
      : null,
  ].filter(
    (
      value
    ): value is string =>
      Boolean(value)
  );

  const displayName =
    profile
      ?.display_name ??
    "Neznámý uživatel";

  return (
    <div
      style={{
        position:
          "relative",
        paddingLeft:
          "20px",
      }}
    >
      <div
        style={{
          position:
            "absolute",
          left: "5px",
          top: "-10px",
          bottom: "-10px",
          width: "1px",
          background:
            `linear-gradient(180deg, ${userAccent}10, ${userAccent}66, ${userAccent}10)`,
        }}
      />

      <div
        style={{
          position:
            "absolute",
          left: 0,
          top: "27px",
          width: "11px",
          height: "11px",
          borderRadius:
            "50%",
          border:
            `2px solid ${visual.accent}`,
          background:
            "var(--taste-bg-deep)",
          boxShadow:
            `0 0 16px ${visual.glow}`,
          zIndex: 2,
        }}
      />

      <article
        style={{
          position:
            "relative",
          overflow:
            "hidden",
          padding:
            "14px",
          border:
            `1px solid ${visual.border}`,
          borderRadius:
            "14px",
          background: `
            radial-gradient(
              circle at ${glowVisual.x}% ${glowVisual.y}%,
              ${visual.glow},
              transparent ${glowVisual.radius}
            ),
            linear-gradient(
              145deg,
              ${visual.background},
              transparent 48%
            ),
            rgba(33,21,12,0.82)
          `,
          boxShadow: `
            0 8px 24px rgba(0,0,0,0.18),
            0 0 34px ${userAccent}${glowVisual.shadow}
          `,
        }}
      >
        <div
          style={{
            position:
              "absolute",
            right: 0,
            top: "13px",
            bottom: "13px",
            width: "2px",
            borderRadius:
              "999px",
            background:
              visual.accent,
            opacity: 0.82,
          }}
        />

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "42px minmax(0,1fr)",
            gap: "11px",
            alignItems:
              "start",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              display:
                "flex",
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
                inset 0 1px 0 rgba(255,255,255,0.045),
                0 0 22px ${visual.glow}
              `,
            }}
          >
            <AppIcon
              name={
                packagingIcon
              }
              size={24}
              strokeWidth={
                1.85
              }
            />
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color:
                  "var(--taste-text-soft)",
                fontSize:
                  "11px",
                lineHeight:
                  1.35,
                fontWeight:
                  650,
              }}
            >
              Uživatel:{" "}
              <Link
                href={`/profiles/${tasting.user_id}`}
                style={{
                  color:
                    userAccent,
                  fontWeight:
                    800,
                  textDecoration:
                    "none",
                }}
              >
                {displayName}
              </Link>{" "}
              ochutnal:
            </div>

            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                alignItems:
                  "baseline",
                gap: "5px",
                marginTop:
                  "4px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "16px",
                lineHeight:
                  1.25,
                fontWeight:
                  800,
                letterSpacing:
                  "-0.02em",
              }}
            >
              {tasting.beers?.id ? (
                <Link
                  href={`/beers/${tasting.beers.id}`}
                  className="taste-entity-link"
                  style={{
                    color:
                      "inherit",
                  }}
                >
                  {beerName}
                </Link>
              ) : (
                <span>
                  {beerName}
                </span>
              )}

              {breweryName &&
                breweryId && (
                <>
                  <span
                    style={{
                      color:
                        "var(--taste-text-muted)",
                      fontWeight:
                        500,
                    }}
                  >
                    ,
                  </span>
                  <Link
                    href={`/breweries/${breweryId}`}
                    className="taste-entity-link"
                    style={{
                      color:
                        "inherit",
                    }}
                  >
                    {breweryName}
                  </Link>
                </>
              )}

              {collaborators.map(
                (
                  collaborator
                ) => (
                  <span
                    key={
                      collaborator.id
                    }
                    style={{
                      color:
                        "var(--taste-text-muted)",
                      fontSize:
                        "11px",
                      fontWeight:
                        650,
                    }}
                  >
                    +{" "}
                    <Link
                      href={`/breweries/${collaborator.id}`}
                      className="taste-entity-link"
                      style={{
                        color:
                          "inherit",
                      }}
                    >
                      {
                        collaborator.name
                      }
                    </Link>
                  </span>
                )
              )}

              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontWeight:
                    500,
                }}
              >
                ,
              </span>

              <span
                style={{
                  color:
                    "var(--taste-text-soft)",
                  fontSize:
                    "12px",
                  fontWeight:
                    650,
                  whiteSpace:
                    "nowrap",
                }}
              >
                {formatTastingDate(
                  tasting.tasted_on
                )}
              </span>
            </div>

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
                    "7px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "10px",
                  lineHeight:
                    1.4,
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
                              visual.accent,
                            opacity:
                              0.55,
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

            {(tasting.place ||
              tasting.notes) && (
              <div
                style={{
                  marginTop:
                    "7px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "9px",
                  lineHeight:
                    1.4,
                }}
              >
                {tasting.place && (
                  <span>
                    📍{" "}
                    {
                      tasting.place
                    }
                  </span>
                )}

                {tasting.place &&
                  tasting.notes && (
                    <span>
                      {" · "}
                    </span>
                  )}

                {tasting.notes && (
                  <span>
                    {
                      tasting.notes
                    }
                  </span>
                )}
              </div>
            )}

            {isOwn && (
              <div
                style={{
                  marginTop:
                    "8px",
                }}
              >
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
                    countries
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
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

const SYSTEM_EVENT_VISUALS = {
  beer_created: {
    icon: "beer",
    eyebrow: "Systém · nové pivo",
    action: "přidal nové pivo do sortimentu",
  },
  beer_version_created: {
    icon: "beer",
    eyebrow: "Systém · nová verze",
    action: "vytvořil novou aktuální verzi piva",
  },
  brand_created: {
    icon: "label",
    eyebrow: "Systém · nová značka",
    action: "zapsal novou značku",
  },
  brewery_created: {
    icon: "brewery",
    eyebrow: "Systém · nový pivovar",
    action: "zapsal nový pivovar",
  },
  hop_created: {
    icon: "hop",
    eyebrow: "Systém · nový chmel",
    action: "zapsal nový chmel",
  },
} as const;

const SYSTEM_COPPER =
  "#b87333";

function CatalogTimelineCard({ row, profile }: { row: CatalogEventRow; profile: ProfileRow | null }) {
  const visual = SYSTEM_EVENT_VISUALS[row.event_type];
  const systemAccent = SYSTEM_COPPER;
  const userAccent = getTimelineUserAccent(row.actor_user_id);
  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? "?";

  const entity =
    row.event_type === "brand_created" && row.brands ? (
      <Link href={`/brands/${row.brands.id}`} className="taste-entity-link">
        {row.brands.name}
      </Link>
    ) : row.event_type === "brewery_created" && row.breweries ? (
      <Link href={`/breweries/${row.breweries.id}`} className="taste-entity-link">
        {row.breweries.name}
      </Link>
    ) : row.event_type === "hop_created" && row.hops ? (
      <span>{row.hops.name}</span>
    ) : row.beers ? (
      <Link href={`/beers/${row.beers.id}`} className="taste-entity-link">
        {row.beers.name}
      </Link>
    ) : (
      <span>Nový katalogový záznam</span>
    );

  return (
    <div style={{ position: "relative", paddingLeft: "20px" }}>
      <div
        style={{
          position: "absolute",
          left: "5px",
          top: "-10px",
          bottom: "-10px",
          width: "3px",
          borderRadius: "999px",
          background: `linear-gradient(180deg, ${systemAccent}54, ${systemAccent}B8, ${systemAccent}54)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "0px",
          top: "23px",
          width: "11px",
          height: "11px",
          borderRadius: "3px",
          border: `1px solid ${systemAccent}`,
          background: `${systemAccent}66`,
          boxShadow: "none",
          zIndex: 2,
        }}
      />

      <article
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "12px 13px",
          border: `1px solid ${systemAccent}78`,
          borderRadius: "13px",
          background: `
            linear-gradient(
              118deg,
              rgba(184,115,51,0.34) 0%,
              rgba(231,166,47,0.13) 19%,
              rgba(87,49,22,0.42) 43%,
              rgba(45,28,16,0.98) 67%,
              rgba(35,22,12,0.99) 100%
            )
          `,
          boxShadow:
            "inset 0 1px 0 rgba(255,214,159,0.10), 0 6px 16px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "13px",
            bottom: "13px",
            width: "4px",
            borderRadius: "0 999px 999px 0",
            background: systemAccent,
            opacity: 0.96,
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:gap-4">
          <div className="order-2 min-w-0 sm:order-1">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "38px minmax(0,1fr)",
                gap: "10px",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${systemAccent}78`,
                  borderRadius: "11px",
                  background: `${systemAccent}38`,
                  color: systemAccent,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,222,176,0.10)",
                }}
              >
                <AppIcon name={visual.icon} size={21} strokeWidth={1.8} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  className="taste-label"
                  style={{
                    marginBottom: "3px",
                    color: systemAccent,
                    opacity: 0.9,
                  }}
                >
                  {visual.eyebrow}
                </div>

                <h3
                  style={{
                    margin: 0,
                    color: "var(--taste-text)",
                    fontSize: "15px",
                    lineHeight: 1.2,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {entity}
                </h3>

                <div
                  style={{
                    marginTop: "5px",
                    color: "var(--taste-text-soft)",
                    fontSize: "10px",
                    lineHeight: 1.45,
                  }}
                >
                  {visual.action}
                  {row.event_type.startsWith("beer_") && row.beers?.brands && (
                    <span> · značka {row.beers.brands.name}</span>
                  )}
                  {row.event_type !== "brewery_created" && row.breweries && (
                    <span>
                      {" · "}
                      <Link href={`/breweries/${row.breweries.id}`} className="taste-entity-link">
                        {row.breweries.name}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="order-1 sm:order-2"
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "7px 8px",
              border: `1px solid ${userAccent}30`,
              borderRadius: "10px",
              background: `${userAccent}09`,
              alignSelf: "start",
            }}
          >
            <Link
              href={`/profiles/${row.actor_user_id}`}
              aria-label={profile?.display_name ?? "Profil uživatele"}
              style={{
                width: "32px",
                height: "32px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: "9px",
                border: `1px solid ${userAccent}55`,
                backgroundColor: `${userAccent}12`,
                backgroundImage: profile?.avatar_url ? `url("${profile.avatar_url}")` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: userAccent,
                textDecoration: "none",
                fontSize: "10px",
                fontWeight: 850,
              }}
            >
              {!profile?.avatar_url && initial}
            </Link>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Link
                href={`/profiles/${row.actor_user_id}`}
                style={{
                  display: "block",
                  overflow: "hidden",
                  color: userAccent,
                  fontSize: "10px",
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textDecoration: "none",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.display_name ?? "Neznámý uživatel"}
              </Link>
              <div
                style={{
                  marginTop: "3px",
                  color: "var(--taste-text-muted)",
                  fontSize: "9px",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                }}
              >
                {new Intl.DateTimeFormat("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(row.created_at))}
              </div>
            </div>
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
  const userAccent =
    getTimelineUserAccent(
      row.user_id
    );

  const achievementAccent =
    "#f5c16d";

  const displayName =
    profile
      ?.display_name ??
    "Neznámý uživatel";

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: "20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "5px",
          top: "-10px",
          bottom: "-10px",
          width: "2px",
          borderRadius: "999px",
          background:
            "linear-gradient(180deg, rgba(245,193,109,0.18), rgba(245,193,109,0.78), rgba(245,193,109,0.18))",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "0px",
          top: "23px",
          width: "11px",
          height: "11px",
          border:
            `1px solid ${achievementAccent}`,
          borderRadius:
            "2px",
          background:
            "rgba(245,193,109,0.42)",
          transform:
            "rotate(45deg)",
          boxShadow:
            "none",
          zIndex: 2,
        }}
      />

      <article
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "12px 13px",
          border:
            "1px solid rgba(245,193,109,0.52)",
          borderRadius: "13px",
          background: `
            linear-gradient(
              112deg,
              rgba(245,193,109,0.24) 0%,
              rgba(207,143,41,0.12) 18%,
              rgba(83,48,20,0.46) 42%,
              rgba(45,28,16,0.98) 68%,
              rgba(35,22,12,0.99) 100%
            )
          `,
          boxShadow:
            "inset 0 1px 0 rgba(255,234,190,0.12), 0 6px 16px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "11px",
            bottom: "11px",
            width: "3px",
            borderRadius:
              "0 999px 999px 0",
            background:
              achievementAccent,
            opacity: 0.9,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "42px minmax(0,1fr)",
            gap: "11px",
            alignItems:
              "center",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              flexShrink: 0,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              border:
                "1px solid rgba(245,193,109,0.58)",
              borderRadius:
                "50%",
              background: `
                linear-gradient(
                  145deg,
                  rgba(245,193,109,0.30),
                  rgba(113,64,20,0.42)
                )
              `,
              color:
                achievementAccent,
              fontSize: "21px",
              boxShadow:
                "inset 0 1px 0 rgba(255,239,204,0.16)",
            }}
          >
            {achievement.icon}
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                color:
                  "var(--taste-text)",
                fontSize:
                  "15px",
                lineHeight:
                  1.25,
                fontWeight:
                  800,
                letterSpacing:
                  "-0.02em",
              }}
            >
              Uživatel{" "}
              <Link
                href={`/profiles/${row.user_id}`}
                style={{
                  color:
                    userAccent,
                  textDecoration:
                    "none",
                }}
              >
                {displayName}
              </Link>{" "}
              získal nový odznak!
            </h3>

            <div
              style={{
                marginTop:
                  "5px",
                color:
                  achievementAccent,
                fontSize:
                  "11px",
                lineHeight:
                  1.4,
                fontWeight:
                  750,
              }}
            >
              {achievement.name}
              <span
                style={{
                  margin:
                    "0 5px",
                  color:
                    "var(--taste-text-muted)",
                  fontWeight:
                    500,
                }}
              >
                ·
              </span>
              <span
                style={{
                  color:
                    "var(--taste-text-soft)",
                  fontWeight:
                    600,
                }}
              >
                {formatAchievementDate(
                  row.unlocked_at
                )}
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
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
