import { beerHref, styleHref, hopHref, countryHref } from "@/lib/entity-navigation";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

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

import TastingModal from "../TastingModal";
import RatingStars from "@/components/ui/RatingStars";
import { isRating } from "@/lib/ratings";
import { groupDailyTastings } from "@/lib/tasting-timeline-groups";
import EditTastingModalClient from "../EditTastingModalClient";

import ActivityRecencyCard from "@/components/activity/ActivityRecencyCard";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import AchievementNotificationRefresh from "@/app/AchievementNotificationRefresh";
import MobileHomeStatsCarousel from "@/components/home/MobileHomeStatsCarousel";
import ResponsiveTimelinePager from "@/components/home/ResponsiveTimelinePager";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { parsePositivePage } from "@/lib/pagination";
import {
  ACTIVITY_START_DATE,
  ACTIVITY_VIEW_CONFIG,
  NEWS_ACTIVITY_VIEWS,
  RECENT_ACTIVITY_VIEWS,
  activityOverviewHref,
  getActivityViewItems,
  parseActivityRecencyDashboard,
} from "@/lib/activity-recency";

import {
  updateTastingInModal,
  deleteTastingInModal,
} from "../tastings/actions";

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
  closed_year?: number | null;
  aliases?: string[];
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
  rating: number | null;
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
    | "hop_created"
    | "style_created";
  created_at: string;
  beers: { id: number; name: string; brands: { id: number; name: string } | null } | null;
  breweries: { id: number; name: string } | null;
  brands: { id: number; name: string } | null;
  hops: { id: number; name: string } | null;
  beer_styles: { id: number; name: string } | null;
};

type TimelineEvent =
  | {
      type: "tasting";
      sortAt: number;
      tasting: TastingRow;
      tastings: TastingRow[];
      totalQuantity: number;
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


// HOMEPAGE
// ==================================================

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ timelinePage?: string | string[] }>;
}) {
  const timelinePage = Math.min(
    parsePositivePage((await searchParams).timelinePage),
    5
  );
  const timelinePageSize = 15;
  const timelineFetchLimit = 5 * timelinePageSize + 1;
  const timelineCutoffDate =
    ACTIVITY_START_DATE;
  const timelineCutoffIso =
    `${ACTIVITY_START_DATE}T00:00:00.000Z`;
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
        rating,
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
          breweries!beer_versions_brewery_id_fkey (
            id,
            name,
            country,
            logo_url,
            closed_year
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
      .gte("tasted_on", timelineCutoffDate)
      .range(from, to), 500, timelineFetchLimit);

  const activityDashboardPromise =
    supabase.rpc(
      "get_activity_recency_dashboard",
      {
        p_start_date:
          ACTIVITY_START_DATE,
      }
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
      .gte("unlocked_at", timelineCutoffIso)
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
      hops ( id, name ),
      beer_styles ( id, name )
    `)
    .eq("show_in_timeline", true)
    .gte("created_at", timelineCutoffIso)
    .neq("event_type", "beer_confirmed")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to), 500, timelineFetchLimit);

  const [
    profilesResult,
    tastingsResult,
    activityDashboardResult,
    achievementsResult,
    catalogEventsResult,
  ] =
    await Promise.all([
      profilesPromise,
      tastingsPromise,
      activityDashboardPromise,
      achievementsPromise,
      catalogEventsPromise,
    ]);

  const {
    data: profiles,
    error: profilesError,
  } =
    profilesResult;

  const tastings = tastingsResult;
  const achievements = achievementsResult;
  const catalogEvents = catalogEventsResult;

  const allProfiles =
    (profiles ??
      []) as ProfileRow[];

  const timelineTastings = (tastings ?? []) as unknown as TastingRow[];

  if (activityDashboardResult.error) {
    throw new Error(
      activityDashboardResult.error.message
    );
  }

  const activityDashboard =
    parseActivityRecencyDashboard(
      activityDashboardResult.data
    );

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
    beer_styles: { id: number; name: string } | Array<{ id: number; name: string }> | null;
  }>;
  const allCatalogEvents = rawCatalogEvents.map((event) => {
    const beer = singleRelation(event.beers);
    return {
      ...event,
      beers: beer ? { ...beer, brands: singleRelation(beer.brands) } : null,
      breweries: singleRelation(event.breweries),
      brands: singleRelation(event.brands),
      hops: singleRelation(event.hops),
      beer_styles: singleRelation(event.beer_styles),
    };
  }) as CatalogEventRow[];

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
  // ČASOVÉ PŘEHLEDY OD 1. 9. 2026
  // ==================================================

  const activityCounts =
    activityDashboard.counts;

  // ==================================================
  // TIMELINE
  // ==================================================

  const timeline:
    TimelineEvent[] = [
    ...groupDailyTastings(timelineTastings, getTastingTimelineTime)
      .map((group) => ({
        type: "tasting" as const,
        sortAt: group.sortAt,
        tasting: group.tasting,
        tastings: group.tastings,
        totalQuantity: group.totalQuantity,
      })),

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
  const hasOlderTimeline = timelinePage < 5 && timeline.length > timelinePage * timelinePageSize;

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
      className="taste-home-concept"
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
      <AchievementNotificationRefresh signature={newlyUnlockedAchievements.map((item) => item.id).join(",")} />

      <PageHero
        mobileCompact
        eyebrow="Hospoda"
        imageUrl="/images/heroes/home.jpg"
        imagePosition="68% 30%"
        title="Aktivita v hospodě"
        subtitle="Zapiš další ochutnávku a sleduj, co se právě děje v naší společné hospodě."
        statsLabel="Aktivita od 1. 9. 2026"
        stats={[
          {
            icon: (
              <HomeStatIcon kind="barrel" />
            ),
            accent: "#f2b63f",
            value: activityCounts.units,
            label: "Vypitých piv",
            href: "/activity#timeline",
          },
          {
            icon: (
              <HomeStatIcon kind="mug" />
            ),
            accent: "#d98a43",
            value: activityCounts.beers,
            label: "Různých piv",
            href: activityOverviewHref("recent-beers"),
          },
          {
            icon: (
              <HomeStatIcon kind="crest" />
            ),
            accent: "#c46f38",
            value: activityCounts.brands,
            label: "Značek",
            href: activityOverviewHref("recent-brands"),
          },
          {
            icon: (
              <HomeStatIcon kind="brewery" />
            ),
            accent: "#e88835",
            value: activityCounts.breweries,
            label: "Pivovarů",
            href: activityOverviewHref("recent-breweries"),
          },
          {
            icon: (
              <HomeStatIcon kind="hop" />
            ),
            accent: "#9cad47",
            value: activityCounts.styles,
            label: "Stylů",
            href: activityOverviewHref("recent-styles"),
          },
          {
            icon: (
              <HomeStatIcon kind="globe" />
            ),
            accent: "#d65b42",
            value: activityCounts.countries,
            label: "Států",
            href: activityOverviewHref("recent-countries"),
          },
        ]}
      />

      {/* ==================================================
          DASHBOARD
      ================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

        {/* LEVÁ STRANA */}

        <aside className="taste-home-desktop-stats-column order-2 grid self-start content-start gap-4 md:grid-cols-2 xl:order-1 xl:col-span-3 xl:grid-cols-1">
          {([
            "recent-breweries",
            "recent-styles",
            "recent-packaging",
          ] as const).map((view) => {
            const config =
              ACTIVITY_VIEW_CONFIG[view];

            return (
              <ActivityRecencyCard
                key={view}
                view={view}
                title={config.title}
                subtitle={config.subtitle}
                icon={
                  <AppIcon
                    name={config.icon}
                    size={20}
                  />
                }
                accent={config.accent}
                items={getActivityViewItems(
                  activityDashboard,
                  view
                )}
              />
            );
          })}
        </aside>

        {/* ==================================================
            TIMELINE
        ================================================== */}

        <section id="timeline" className="order-1 xl:order-2 xl:col-span-6">

          <div className="taste-timeline-actions">
            <TastingModal />
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

          <ResponsiveTimelinePager
            basePath="/activity"
            serverPage={timelinePage}
            hasOlderServerPage={hasOlderTimeline}
            totalEntries={Math.min(
              timeline.length,
              5 * timelinePageSize
            )}
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
                    groupTastings={event.tastings}
                    totalQuantity={event.totalQuantity}
                    profile={
                      profile
                    }
                    isOwn={
                      isOwn
                    }

                  />
                );
              }
            )}
          </ResponsiveTimelinePager>
        </section>

        <div className="taste-home-mobile-stats-wrap order-2">
          <div
            className="taste-label"
            style={{
              margin:
                "0 36px 8px",
            }}
          >
            Poslední dění
          </div>

          <MobileHomeStatsCarousel>
            {RECENT_ACTIVITY_VIEWS.map((view) => {
              const config =
                ACTIVITY_VIEW_CONFIG[view];

              return (
                <ActivityRecencyCard
                  key={view}
                  view={view}
                  title={config.title}
                  subtitle={config.subtitle}
                  icon={
                    <AppIcon
                      name={config.icon}
                      size={20}
                    />
                  }
                  accent={config.accent}
                  items={getActivityViewItems(
                    activityDashboard,
                    view
                  )}
                />
              );
            })}
          </MobileHomeStatsCarousel>
        </div>

        {/* PRAVÁ STRANA */}

        <aside className="taste-home-desktop-stats-column order-3 grid self-start content-start gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          {([
            "recent-beers",
            "recent-countries",
            "recent-brands",
            "recent-hops",
          ] as const).map((view) => {
            const config =
              ACTIVITY_VIEW_CONFIG[view];

            return (
              <ActivityRecencyCard
                key={view}
                view={view}
                title={config.title}
                subtitle={config.subtitle}
                icon={
                  <AppIcon
                    name={config.icon}
                    size={20}
                  />
                }
                accent={config.accent}
                items={getActivityViewItems(
                  activityDashboard,
                  view
                )}
              />
            );
          })}
        </aside>
      </div>

      <section
        className="taste-activity-news-section"
        style={{
          marginTop:
            "22px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "flex-end",
            justifyContent:
              "space-between",
            gap:
              "12px",
            marginBottom:
              "10px",
          }}
        >
          <div>
            <div
              className="taste-label"
              style={{
                marginBottom:
                  "4px",
              }}
            >
              Od 1. 9. 2026
            </div>

            <h2
              style={{
                margin: 0,
                fontSize:
                  "20px",
                letterSpacing:
                  "-0.02em",
              }}
            >
              Novinky
            </h2>
          </div>

          <div
            style={{
              color:
                "var(--taste-text-muted)",
              fontSize:
                "9px",
              textAlign:
                "right",
            }}
          >
            nové v katalogu
            a nové země
          </div>
        </div>

        <div className="taste-home-mobile-stats-wrap">
          <MobileHomeStatsCarousel>
            {NEWS_ACTIVITY_VIEWS.map((view) => {
              const config =
                ACTIVITY_VIEW_CONFIG[view];

              return (
                <ActivityRecencyCard
                  key={view}
                  view={view}
                  title={config.title}
                  subtitle={config.subtitle}
                  icon={
                    <AppIcon
                      name={config.icon}
                      size={20}
                    />
                  }
                  accent={config.accent}
                  items={getActivityViewItems(
                    activityDashboard,
                    view
                  )}
                  variant="news"
                />
              );
            })}
          </MobileHomeStatsCarousel>
        </div>

        <div className="taste-activity-desktop-news-grid">
          {NEWS_ACTIVITY_VIEWS.map((view) => {
            const config =
              ACTIVITY_VIEW_CONFIG[view];

            return (
              <ActivityRecencyCard
                key={view}
                view={view}
                title={config.title}
                subtitle={config.subtitle}
                icon={
                  <AppIcon
                    name={config.icon}
                    size={20}
                  />
                }
                accent={config.accent}
                items={getActivityViewItems(
                  activityDashboard,
                  view
                )}
                variant="news"
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}

// ==================================================
// KARTA OCHUTNÁVKY V TIMELINE
// ==================================================

function TastingTimelineCard({
  tasting,
  groupTastings,
  totalQuantity,
  profile,
  isOwn,
}: {
  tasting: TastingRow;
  groupTastings: TastingRow[];
  totalQuantity: number;
  profile: ProfileRow | null;
  isOwn: boolean;
}) {
  const isGrouped = groupTastings.length > 1;
  const groupPackaging = groupTastings.every(item => item.packaging === tasting.packaging)
    ? tasting.packaging : null;
  const packagingKind =
    groupPackaging === "bottle" ? "bottle" :
    groupPackaging === "can" ? "can" :
    groupPackaging === "pet" ? "pet" :
    groupPackaging === "draft" ? "mug" : "package";

  const packagingLabel = isGrouped && groupPackaging === null
    ? "Různé způsoby podání"
    : getPackagingMeta(groupPackaging)?.label ?? "Neurčený způsob podání";
  const ratedGroupTastings = groupTastings.filter(item => isRating(item.rating));
  const multipleBreweries = new Set(groupTastings.map(item =>
    item.beer_versions?.breweries?.id ?? item.beers?.breweries?.id ?? null
  )).size > 1;

  const brewery =
    tasting.beer_versions?.breweries ??
    tasting.beers?.breweries;

  const collaborators = [
    ...(
      tasting.beer_versions
        ?.beer_version_collaborators ??
      []
    ),
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

  const details = [
    tasting.beer_versions
      ?.beer_styles?.name ??
      tasting.beers
        ?.beer_styles?.name,
    tasting.plato != null
      ? String(
          tasting.plato
        ).replace(
          ".",
          ","
        ) + "°"
      : null,
    tasting.abv != null
      ? String(
          tasting.abv
        ).replace(
          ".",
          ","
        ) + " %"
      : null,
    brewery?.country ??
      null,
  ].filter(
    (
      value
    ): value is string =>
      Boolean(value)
  );

  const quantity = totalQuantity;

  const nickname =
    profile?.display_name ??
    "Neznámý uživatel";

  const realName =
    profile?.real_name?.trim();

  return (
    <div className="taste-timeline-entry">
      <article className="taste-timeline-card">
        <header className="taste-timeline-card-header">
          <span
            className="taste-timeline-packaging taste-timeline-packaging-illustrated"
            title={
              packagingLabel
            }
            aria-label={
              packagingLabel
            }
          >
            <HomeStatIcon
              kind={
                packagingKind
              }
            />
          </span>

          <div className="taste-timeline-person-line">
            <Link
              href={
                "/profiles/" +
                tasting.user_id
              }
              className="taste-timeline-nickname-plain"
            >
              {nickname}
            </Link>

            {realName &&
              realName !==
                nickname && (
                <span className="taste-timeline-realname">
                  {realName}
                </span>
              )}
          </div>

          <time
            className="taste-timeline-date"
            dateTime={
              tasting.tasted_on
            }
          >
            {formatTastingDate(
              tasting.tasted_on
            )}
          </time>
        </header>

        <div className="taste-timeline-card-body">
          <div className="taste-timeline-main-line">
            <h3 className="taste-timeline-beer-name taste-timeline-main-title">
              {tasting.beers?.id ? (
                <Link prefetch={false}
                  href={
                    beerHref(tasting.beers.id, brewery?.id)
                  }
                  className="taste-timeline-main-link"
                >
                  {
                    tasting.beers
                      .name
                  }
                </Link>
              ) : (
                "Neznámé pivo"
              )}

              {brewery && !multipleBreweries && (
                <>
                  <span className="taste-timeline-main-separator">
                    {" "}–{" "}
                  </span>
                  <Link
                    href={
                      "/breweries/" +
                      brewery.id
                    }
                    className="taste-timeline-main-link"
                  >
                    {
                      brewery.name
                    }
                  </Link>
                </>
              )}

              {multipleBreweries && <span className="taste-timeline-main-separator"> · různí výrobci</span>}

              {!isGrouped && collaborators.map(
                (item) => (
                  <span
                    key={
                      item.id
                    }
                  >
                    {" + "}
                    <Link
                      href={
                        "/breweries/" +
                        item.id
                      }
                      className="taste-timeline-main-link"
                    >
                      {item.name}
                    </Link>
                  </span>
                )
              )}
            </h3>

            {quantity >
              1 && (
              <span className="taste-timeline-quantity">
                {quantity}×
              </span>
            )}
          </div>

          {details.length >
            0 && (
            <div className="taste-timeline-details taste-timeline-details-compact">
              {details.map(
                (
                  detail,
                  index
                ) => (
                  <span
                    key={
                      index
                    }
                  >
                    {index === 0 && (tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles)?.id
                      ? <Link href={styleHref((tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles)!.id)} className="taste-entity-link">{detail}</Link>
                      : brewery?.country === detail
                        ? <Link href={countryHref(detail)} className="taste-entity-link">{detail}</Link>
                        : detail}
                  </span>
                )
              )}
            </div>
          )}

          {!isGrouped && (tasting.place ||
            tasting.notes) && (
            <div className="taste-timeline-note">
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
                    {" "}·{" "}
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

          {isGrouped && (
            <div className="taste-timeline-note">
              <div style={{ marginBottom: 8 }}>
                {groupTastings.length} {groupTastings.length >= 2 && groupTastings.length <= 4 ? "ochutnávky" : "ochutnávek"} v jednom dni · celkem {totalQuantity} {totalQuantity === 1 ? "pivo" : totalQuantity <= 4 ? "piva" : "piv"}.
                {ratedGroupTastings.length > 0 && (
                  <span> · {ratedGroupTastings.length} hodnocení</span>
                )}
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  Zobrazit jednotlivé ochutnávky
                </summary>
                <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
                  {groupTastings.map((entry) => (
                    <li key={entry.id} style={{ padding: "10px 0", borderTop: "1px solid var(--taste-border)" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span>{getPackagingMeta(entry.packaging)?.label ?? "Neurčené podání"} · {entry.quantity ?? 1}×</span>
                        {isRating(entry.rating)
                          ? <RatingStars rating={entry.rating}/>
                          : <span style={{ color: "var(--taste-text-muted)" }}>Bez hodnocení</span>}
                      </div>
                      {multipleBreweries && (
                        <div>{entry.beer_versions?.breweries?.name ?? entry.beers?.breweries?.name}</div>
                      )}
                      {(entry.place || entry.notes) && (
                        <div style={{ marginTop: 4 }}>
                          {entry.place && <span>📍 {entry.place}</span>}
                          {entry.place && entry.notes && " · "}
                          {entry.notes}
                        </div>
                      )}
                      {isOwn && (
                        <div style={{ marginTop: 6 }}>
                          <EditTastingModalClient
                            tasting={entry}
                            updateTastingAction={updateTastingInModal}
                            deleteTastingAction={deleteTastingInModal}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          <div className="taste-timeline-footer">
          {isOwn && !isGrouped && (
            <div className="taste-timeline-edit">
              <EditTastingModalClient
                tasting={
                  tasting
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
            {!isGrouped && isRating(tasting.rating) && <Link className="taste-timeline-rating" href={`/ratings?beer=${tasting.beers?.id}`}><RatingStars rating={tasting.rating} compact /></Link>}
            {isGrouped && ratedGroupTastings.length > 0 && (
              <Link className="taste-timeline-rating" href={`/ratings?beer=${tasting.beers?.id}`}>
                {ratedGroupTastings.length}× hodnoceno
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

const SYSTEM_EVENT_VISUALS = {
  beer_created: {
    icon: "mug",
    eyebrow: "Systém · nové pivo",
    action: "přidal nové pivo do sortimentu",
  },
  beer_version_created: {
    icon: "mug",
    eyebrow: "Systém · nová verze",
    action: "vytvořil novou aktuální verzi piva",
  },
  brand_created: {
    icon: "crest",
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
  style_created: {
    icon: "mug",
    eyebrow: "Systém · nový pivní styl",
    action: "zapsal nový pivní styl",
  },
} as const;

function CatalogTimelineIcon({
  kind,
}: {
  kind: (typeof SYSTEM_EVENT_VISUALS)[CatalogEventRow["event_type"]]["icon"];
}) {
  return (
    <span
      className="taste-timeline-packaging taste-timeline-packaging-illustrated taste-timeline-catalog-icon"
      aria-hidden="true"
    >
      <HomeStatIcon kind={kind} />
      <span className="taste-timeline-new-badge">NEW</span>
    </span>
  );
}

function CatalogTimelineCard({
  row,
  profile,
}: {
  row: CatalogEventRow;
  profile: ProfileRow | null;
}) {
  const nickname =
    profile?.display_name ??
    "Neznámý uživatel";

  if (
    row.event_type ===
      "brewery_created" &&
    row.breweries
  ) {
    return (
      <div className="taste-timeline-entry taste-timeline-system">
        <article className="taste-timeline-card taste-timeline-system-single-card">
          <div className="taste-timeline-system-one-line">
            <CatalogTimelineIcon kind="brewery" />

            <div className="taste-timeline-system-one-line-copy">
              Uživatel{" "}
              <Link
                href={
                  "/profiles/" +
                  row.actor_user_id
                }
                className="taste-timeline-nickname-plain"
              >
                {nickname}
              </Link>{" "}
              vytvořil nový pivovar{" "}
              <Link
                href={
                  "/breweries/" +
                  row.breweries.id
                }
                className="taste-timeline-main-link"
              >
                {
                  row.breweries
                    .name
                }
              </Link>
            </div>

            <time
              className="taste-timeline-date"
              dateTime={
                row.created_at
              }
            >
              {new Intl.DateTimeFormat(
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
                new Date(
                  row.created_at
                )
              )}
            </time>
          </div>
        </article>
      </div>
    );
  }

  const visual =
    SYSTEM_EVENT_VISUALS[
      row.event_type
    ];

  const entity =
    row.event_type ===
      "brand_created" &&
    row.brands ? (
      <Link prefetch={false}
        href={
          "/brands/" +
          row.brands.id
        }
        className="taste-entity-link"
      >
        {row.brands.name}
      </Link>
    ) : row.event_type ===
        "hop_created" &&
      row.hops ? (
      <Link href={hopHref(row.hops.id)} className="taste-entity-link">{row.hops.name}</Link>
    ) : row.event_type ===
        "style_created" &&
      row.beer_styles ? (
      <Link href={styleHref(row.beer_styles.id)} className="taste-entity-link">{row.beer_styles.name}</Link>
    ) : row.beers ? (
      <Link prefetch={false}
        href={
          "/beers/" +
          row.beers.id
        }
        className="taste-entity-link"
      >
        {row.beers.name}
      </Link>
    ) : (
      "Nový katalogový záznam"
    );

  return (
    <div className="taste-timeline-entry taste-timeline-system">
      <article className="taste-timeline-card">
        <header className="taste-timeline-card-header">
          <CatalogTimelineIcon kind={visual.icon} />

          <div className="taste-timeline-person-line">
            <Link
              href={
                "/profiles/" +
                row.actor_user_id
              }
              className="taste-timeline-nickname-plain"
            >
              {nickname}
            </Link>
            <span className="taste-timeline-realname">
              {
                visual.eyebrow
              }
            </span>
          </div>

          <time
            className="taste-timeline-date"
            dateTime={
              row.created_at
            }
          >
            {new Intl.DateTimeFormat(
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
              new Date(
                row.created_at
              )
            )}
          </time>
        </header>

        <div className="taste-timeline-card-body">
          <h3 className="taste-timeline-beer-name">
            {entity}
          </h3>

          <div className="taste-timeline-system-description">
            {nickname}{" "}
            {visual.action}

            {row.event_type.startsWith(
              "beer_"
            ) &&
              row.beers
                ?.brands && (
                <span>
                  {" "}· značka{" "}
                  {
                    row.beers
                      .brands.name
                  }
                </span>
              )}

            {row.breweries && (
              <span>
                {" "}·{" "}
                <Link
                  href={
                    "/breweries/" +
                    row.breweries
                      .id
                  }
                  className="taste-entity-link"
                >
                  {
                    row.breweries
                      .name
                  }
                </Link>
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function AchievementTimelineCard({
  row,
  profile,
  achievement,
}: {
  row: AchievementRow;
  profile: ProfileRow | null;
  achievement: AchievementDefinition;
}) {
  const nickname =
    profile?.display_name ??
    "Neznámý uživatel";

  const realName =
    profile?.real_name?.trim();

  return (
    <div className="taste-timeline-entry taste-timeline-system taste-timeline-achievement">
      <article className="taste-timeline-card">
        <header className="taste-timeline-card-header">
          <span
            className="taste-timeline-packaging taste-timeline-packaging-illustrated"
            aria-hidden="true"
          >
            <HomeStatIcon
              kind="medal"
            />
          </span>

          <div className="taste-timeline-person-line">
            <Link
              href={
                "/profiles/" +
                row.user_id
              }
              className="taste-timeline-nickname-plain"
            >
              {nickname}
            </Link>

            {realName &&
              realName !==
                nickname && (
                <span className="taste-timeline-realname">
                  {realName}
                </span>
              )}
          </div>

          <time
            className="taste-timeline-date"
            dateTime={
              row.unlocked_at
            }
          >
            {formatAchievementDate(
              row.unlocked_at
            )}
          </time>
        </header>

        <div className="taste-timeline-card-body">
          <div className="taste-timeline-system-kicker">
            Nové ocenění
          </div>

          <h3 className="taste-timeline-beer-name taste-timeline-main-title">
            {achievement.name}
          </h3>

          <div className="taste-timeline-achievement-definition">
            {
              achievement.description
            }
          </div>

          {achievement.series &&
            achievement.target >
              1 && (
              <div className="taste-timeline-achievement-progress">
                <div className="taste-timeline-achievement-progress-label">
                  <span>
                    Splněná meta
                  </span>
                  <strong>
                    {
                      achievement.target
                    }{" "}
                    /{" "}
                    {
                      achievement.target
                    }
                  </strong>
                </div>

                <div
                  className="taste-timeline-achievement-progress-track"
                  role="progressbar"
                  aria-label={
                    "Splněná meta: " +
                    achievement.description
                      .replace(
                        /^Dosáhni\s+/,
                        ""
                      )
                      .replace(
                        /\.$/,
                        ""
                      )
                  }
                  aria-valuemin={
                    0
                  }
                  aria-valuemax={
                    achievement.target
                  }
                  aria-valuenow={
                    achievement.target
                  }
                >
                  <span />
                </div>
              </div>
            )}
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
