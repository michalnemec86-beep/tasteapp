import { beerHref, brandHref, styleHref, countryHref } from "@/lib/entity-navigation";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";

import {
  getPackagingMeta,
} from "@/lib/packaging";

import {
  type ProfileStats,
  type ProfileActivityPoint,
  type ProfileNumericSummary,
  type ProfileBeerRecord,
} from "@/lib/profileStats";
import {
  parseStatsDashboardPayload,
} from "@/lib/stats-dashboard";
import type {
  BreweryMapItem,
} from "@/app/breweries/BreweryCzechMap";

import {
  buildAchievementProgressFromMetrics,
  type AchievementMetric,
  type AchievementMetricSnapshot,
  type AchievementProgress,
  type AchievementSeries,
} from "@/lib/achievements";

import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import "./profile-concept.css";
import RatingStars from "@/components/ui/RatingStars";
import { isRating } from "@/lib/ratings";
import EditTastingModalClient from "@/app/EditTastingModalClient";
import TastingModal from "@/app/TastingModal";
import BreweryCreateModalClient from "@/app/breweries/BreweryCreateModalClient";
import { createBrewery } from "@/app/breweries/actions";
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
import ProfileTastingPager from "./ProfileTastingPager";
import ProfileBreweriesView, {
  type ProfileBreweryItem,
} from "./ProfileBreweriesView";
import ProfileLoopCarousel from "./ProfileLoopCarousel";
import ProfileMapsClient from "./ProfileMapsClient";

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
    all?: string | string[];
    page?: string | string[];
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

type ProfileStatsOverviewRpc = {
  firstTasting: string | null;
  lastTasting: string | null;
  monthlyActivity: ProfileActivityPoint[];
  yearlyActivity: ProfileActivityPoint[];
  mostActiveMonth: ProfileActivityPoint | null;
  mostActiveYear: ProfileActivityPoint | null;
  averagePerMonth: number;
  plato: ProfileNumericSummary;
  abv: ProfileNumericSummary;
  ibu: ProfileNumericSummary;
  strongestBeer: ProfileBeerRecord | null;
  bitterestBeer: ProfileBeerRecord | null;
  highestPlatoBeer: ProfileBeerRecord | null;
  czechBreweries: BreweryMapItem[];
};

function parseProfileStatsOverview(
  value: unknown
): ProfileStatsOverviewRpc {
  const source =
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

  function numericSummary(
    item: unknown
  ): ProfileNumericSummary {
    const row =
      item &&
      typeof item === "object" &&
      !Array.isArray(item)
        ? item as Record<string, unknown>
        : {};

    const finiteOrNull = (
      candidate: unknown
    ) => {
      if (
        candidate == null ||
        candidate === ""
      ) {
        return null;
      }

      const parsed =
        Number(candidate);

      return Number.isFinite(parsed)
        ? parsed
        : null;
    };

    return {
      average:
        finiteOrNull(row.average),
      min:
        finiteOrNull(row.min),
      max:
        finiteOrNull(row.max),
      count:
        Math.max(
          0,
          Number(row.count) || 0
        ),
    };
  }

  function activityPoint(
    item: unknown
  ): ProfileActivityPoint | null {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return null;
    }

    const row =
      item as Record<string, unknown>;
    const key =
      typeof row.key === "string"
        ? row.key
        : "";
    const count =
      Number(row.count);

    if (
      !key ||
      !Number.isFinite(count)
    ) {
      return null;
    }

    return {
      key,
      count,
    };
  }

  function activityPoints(
    item: unknown
  ) {
    return Array.isArray(item)
      ? item
          .map(activityPoint)
          .filter(
            (
              point
            ): point is ProfileActivityPoint =>
              point != null
          )
      : [];
  }

  function beerRecord(
    item: unknown
  ): ProfileBeerRecord | null {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return null;
    }

    const row =
      item as Record<string, unknown>;
    const beerId =
      Number(row.beerId);
    const beerName =
      typeof row.beerName === "string"
        ? row.beerName
        : "";
    const recordValue =
      Number(row.value);

    if (
      !Number.isInteger(beerId) ||
      beerId < 1 ||
      !beerName ||
      !Number.isFinite(recordValue)
    ) {
      return null;
    }

    return {
      beerId,
      beerName,
      value:
        recordValue,
    };
  }

  const czechBreweries =
    Array.isArray(
      source.czechBreweries
    )
      ? source.czechBreweries.flatMap(
          (item) => {
            if (
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
            ) {
              return [];
            }

            const row =
              item as Record<string, unknown>;
            const id =
              Number(row.id);
            const name =
              typeof row.name === "string"
                ? row.name
                : "";
            const latitude =
              Number(row.latitude);
            const longitude =
              Number(row.longitude);

            if (
              !Number.isInteger(id) ||
              id < 1 ||
              !name ||
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return [];
            }

            return [{
              id,
              name,
              city:
                typeof row.city === "string"
                  ? row.city
                  : null,
              latitude,
              longitude,
              closedYear:
                row.closedYear == null
                  ? null
                  : Number(row.closedYear),
              isPersonal: true,
            }];
          }
        )
      : [];

  return {
    firstTasting:
      typeof source.firstTasting === "string"
        ? source.firstTasting
        : null,
    lastTasting:
      typeof source.lastTasting === "string"
        ? source.lastTasting
        : null,
    monthlyActivity:
      activityPoints(
        source.monthlyActivity
      ),
    yearlyActivity:
      activityPoints(
        source.yearlyActivity
      ),
    mostActiveMonth:
      activityPoint(
        source.mostActiveMonth
      ),
    mostActiveYear:
      activityPoint(
        source.mostActiveYear
      ),
    averagePerMonth:
      Number.isFinite(
        Number(
          source.averagePerMonth
        )
      )
        ? Number(
            source.averagePerMonth
          )
        : 0,
    plato:
      numericSummary(
        source.plato
      ),
    abv:
      numericSummary(
        source.abv
      ),
    ibu:
      numericSummary(
        source.ibu
      ),
    strongestBeer:
      beerRecord(
        source.strongestBeer
      ),
    bitterestBeer:
      beerRecord(
        source.bitterestBeer
      ),
    highestPlatoBeer:
      beerRecord(
        source.highestPlatoBeer
      ),
    czechBreweries,
  };
}

type ProfileHistoryPageRpc = {
  ids: number[];
  allTotal: number;
  filteredTotal: number;
  pageCount: number;
  currentPage: number;
  countries: string[];
  letters: string[];
};

function parseProfileHistoryPage(
  value: unknown
): ProfileHistoryPageRpc {
  const source =
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

  const strings = (
    item: unknown
  ) =>
    Array.isArray(item)
      ? item.filter(
          (
            value
          ): value is string =>
            typeof value === "string"
        )
      : [];

  const ids =
    Array.isArray(source.ids)
      ? source.ids
          .map(Number)
          .filter(
            (value) =>
              Number.isInteger(value) &&
              value > 0
          )
      : [];

  return {
    ids,
    allTotal:
      Math.max(
        0,
        Number(
          source.allTotal
        ) || 0
      ),
    filteredTotal:
      Math.max(
        0,
        Number(
          source.filteredTotal
        ) || 0
      ),
    pageCount:
      Math.max(
        1,
        Number(
          source.pageCount
        ) || 1
      ),
    currentPage:
      Math.max(
        1,
        Number(
          source.currentPage
        ) || 1
      ),
    countries:
      strings(
        source.countries
      ),
    letters:
      strings(
        source.letters
      ),
  };
}

function parseProfileBreweryItems(
  value: unknown
): ProfileBreweryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return [];
      }

      const row =
        item as Record<string, unknown>;
      const id =
        Number(row.id);
      const name =
        typeof row.name === "string"
          ? row.name
          : "";
      const count =
        Number(
          row.tasting_count
        );

      if (
        !Number.isInteger(id) ||
        id < 1 ||
        !name ||
        !Number.isFinite(count)
      ) {
        return [];
      }

      const logoUrl =
        typeof row.logo_url === "string" &&
        row.logo_url.trim()
          ? row.logo_url
          : undefined;

      return [{
        id,
        name,
        count,
        country:
          typeof row.country === "string"
            ? row.country
            : null,
        ...(logoUrl
          ? {
              logoUrl,
            }
          : {}),
      }];
    }
  );
}

function parseAchievementMetrics(
  value: unknown
): AchievementMetricSnapshot {
  const first =
    Array.isArray(value)
      ? value[0]
      : null;
  const row =
    first &&
    typeof first === "object" &&
    !Array.isArray(first)
      ? first as Record<string, unknown>
      : {};

  const number = (
    key: string
  ) =>
    Math.max(
      0,
      Number(
        row[key]
      ) || 0
    );

  return {
    tastings:
      number(
        "current_tastings"
      ),
    beers:
      number(
        "current_beers"
      ),
    breweries:
      number(
        "current_breweries"
      ),
    styles:
      number(
        "current_styles"
      ),
    countries:
      number(
        "current_countries"
      ),
    hops:
      number(
        "current_hops"
      ),
  };
}

function emptyProfileStats(): ProfileStats {
  const emptyNumeric:
    ProfileNumericSummary = {
    average: null,
    min: null,
    max: null,
    count: 0,
  };

  return {
    totalQuantity: 0,
    uniqueBeers: 0,
    uniqueBrands: 0,
    uniqueBreweries: 0,
    uniqueStyles: 0,
    uniqueCountries: 0,
    uniqueHops: 0,
    firstTasting: null,
    lastTasting: null,
    monthlyActivity: [],
    yearlyActivity: [],
    mostActiveMonth: null,
    mostActiveYear: null,
    averagePerMonth: 0,
    plato: {
      ...emptyNumeric,
    },
    abv: {
      ...emptyNumeric,
    },
    ibu: {
      ...emptyNumeric,
    },
    strongestBeer: null,
    bitterestBeer: null,
    highestPlatoBeer: null,
  };
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
  const showAllTastings =
    resolvedSearchParams.all === "1";
  const requestedHistoryPage =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const historyPage =
    Number.isInteger(requestedHistoryPage) &&
    requestedHistoryPage > 0
      ? requestedHistoryPage
      : 1;
  const historyPageSize = 30;

  const supabase =
    await createClient();

  const user = await getCurrentUser();

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

  const needsAggregateStats =
    view === "stats" ||
    view === "beers" ||
    view === "medals";

  const needsOverview =
    view === "stats" ||
    view === "beers";

  const needsCountries =
    isMe &&
    view === "breweries";

  const countriesPromise =
    needsCountries
      ? supabase
          .from("countries")
          .select(
            "id, name"
          )
          .order("name")
      : Promise.resolve({
          data: [],
          error: null,
        });

  const statsDashboardPromise =
    needsAggregateStats
      ? supabase.rpc(
          "get_stats_dashboard",
          {
            p_current_user: user.id,
            p_selected_user: profile.id,
            p_year: null,
            p_month: null,
            p_packaging: null,
            p_beer_id: null,
            p_brand_id: null,
            p_brewery_id: null,
            p_style_id: null,
            p_country: null,
            p_hop_id: null,
          }
        )
      : Promise.resolve({
          data: null,
          error: null,
        });

  const profileOverviewPromise =
    needsOverview
      ? supabase.rpc(
          "get_profile_stats_overview",
          {
            target_user_id:
              profile.id,
          }
        )
      : Promise.resolve({
          data: null,
          error: null,
        });

  const historyPagePromise =
    view === "beers"
      ? supabase.rpc(
          "get_profile_tasting_history_page",
          {
            target_user_id:
              profile.id,
            p_sort:
              tastingSort,
            p_country:
              selectedCountry ||
              null,
            p_query:
              tastingQuery ||
              null,
            p_letter:
              selectedLetter ||
              null,
            p_page:
              historyPage,
            p_page_size:
              historyPageSize,
          }
        )
      : Promise.resolve({
          data: null,
          error: null,
        });

  const breweryListPromise =
    view === "breweries"
      ? supabase.rpc(
          "get_profile_brewery_list",
          {
            target_user_id:
              profile.id,
          }
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const achievementMetricsPromise =
    view === "medals"
      ? supabase.rpc(
          "get_achievement_metrics",
          {
            target_user_id:
              profile.id,
          }
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const [
    countriesResult,
    statsDashboardResult,
    profileOverviewResult,
    historyPageResult,
    breweryListResult,
    achievementMetricsResult,
  ] =
    await Promise.all([
      countriesPromise,
      statsDashboardPromise,
      profileOverviewPromise,
      historyPagePromise,
      breweryListPromise,
      achievementMetricsPromise,
    ]);

  const {
    data: countries,
    error: countriesError,
  } = countriesResult;

  if (countriesError) {
    throw new Error(
      countriesError.message
    );
  }

  if (
    needsAggregateStats &&
    statsDashboardResult.error
  ) {
    throw new Error(
      statsDashboardResult.error.message
    );
  }

  if (
    needsOverview &&
    profileOverviewResult.error
  ) {
    throw new Error(
      profileOverviewResult.error.message
    );
  }

  if (
    view === "beers" &&
    historyPageResult.error
  ) {
    throw new Error(
      historyPageResult.error.message
    );
  }

  if (
    view === "breweries" &&
    breweryListResult.error
  ) {
    throw new Error(
      breweryListResult.error.message
    );
  }

  if (
    view === "medals" &&
    achievementMetricsResult.error
  ) {
    throw new Error(
      achievementMetricsResult.error.message
    );
  }

  const statsDashboard =
    needsAggregateStats
      ? parseStatsDashboardPayload(
          statsDashboardResult.data
        )
      : null;

  const statsOverview =
    needsOverview
      ? parseProfileStatsOverview(
          profileOverviewResult.data
        )
      : null;

  const historyPageData =
    view === "beers"
      ? parseProfileHistoryPage(
          historyPageResult.data
        )
      : {
          ids: [],
          allTotal: 0,
          filteredTotal: 0,
          pageCount: 1,
          currentPage: 1,
          countries: [],
          letters: [],
        } satisfies ProfileHistoryPageRpc;

  const profileBreweryItems =
    view === "breweries"
      ? parseProfileBreweryItems(
          breweryListResult.data
        )
      : [];

  const achievementMetrics =
    view === "medals"
      ? parseAchievementMetrics(
          achievementMetricsResult.data
        )
      : {
          tastings: 0,
          beers: 0,
          breweries: 0,
          styles: 0,
          countries: 0,
          hops: 0,
        } satisfies AchievementMetricSnapshot;

  const tastingCountries =
    historyPageData.countries;

  const tastingLetters =
    historyPageData.letters;

  const hasTastingSelection =
    view === "beers";

  const historyTotalCount =
    historyPageData.filteredTotal;

  const historyPageCount =
    historyPageData.pageCount;

  const currentHistoryPage =
    historyPageData.currentPage;

  const visibleTastings =
    await (async () => {
      if (
        view !== "beers" ||
        historyPageData.ids.length === 0
      ) {
        return [];
      }

      const pageIds =
        historyPageData.ids;

      const {
        data: pageRows,
        error: pageError,
      } =
        await supabase
          .from("tastings")
          .select(`
            id,
            user_id,
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
              brewery_id,
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
              brewery_id,
              name,
              is_non_alcoholic,
              portfolio_status,
              brands (
                id,
                name
              ),
              breweries (
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
          .in(
            "id",
            pageIds
          );

      if (pageError) {
        throw new Error(
          pageError.message
        );
      }

      const normalizedPageRows =
        (
          pageRows ??
          []
        ).map(
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
                        (
                          beerVersion.beer_version_collaborators ??
                          []
                        ).map(
                          (item) => ({
                            ...item,
                            breweries:
                              singleRelation(
                                item.breweries
                              ),
                          })
                        ),
                    }
                  : null,
              beers:
                beer
                  ? {
                      ...beer,
                      brands:
                        singleRelation(
                          beer.brands
                        ),
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

      const pageOrder =
        new Map(
          pageIds.map(
            (
              tastingId,
              index
            ) => [
              tastingId,
              index,
            ]
          )
        );

      normalizedPageRows.sort(
        (a, b) =>
          (
            pageOrder.get(a.id) ??
            0
          ) -
          (
            pageOrder.get(b.id) ??
            0
          )
      );

      return normalizedPageRows;
    })();

  // ==================================================
  // STATISTIKY
  // ==================================================

  const tasteStats =
    statsDashboard?.primary.stats ??
    {
      beers: [],
      brands: [],
      breweries: [],
      styles: [],
      countries: [],
      hops: [],
      packaging: [],
    };

  const profileStats: ProfileStats =
    statsDashboard
      ? {
          ...emptyProfileStats(),
          totalQuantity:
            statsDashboard.primary.units,
          uniqueBeers:
            tasteStats.beers.length,
          uniqueBrands:
            tasteStats.brands.length,
          uniqueBreweries:
            tasteStats.breweries.length,
          uniqueStyles:
            tasteStats.styles.length,
          uniqueCountries:
            tasteStats.countries.length,
          uniqueHops:
            tasteStats.hops.length,
          firstTasting:
            statsOverview?.firstTasting ??
            null,
          lastTasting:
            statsOverview?.lastTasting ??
            null,
          monthlyActivity:
            statsOverview?.monthlyActivity ??
            [],
          yearlyActivity:
            statsOverview?.yearlyActivity ??
            [],
          mostActiveMonth:
            statsOverview?.mostActiveMonth ??
            null,
          mostActiveYear:
            statsOverview?.mostActiveYear ??
            null,
          averagePerMonth:
            statsOverview?.averagePerMonth ??
            0,
          plato:
            statsOverview?.plato ??
            emptyProfileStats().plato,
          abv:
            statsOverview?.abv ??
            emptyProfileStats().abv,
          ibu:
            statsOverview?.ibu ??
            emptyProfileStats().ibu,
          strongestBeer:
            statsOverview?.strongestBeer ??
            null,
          bitterestBeer:
            statsOverview?.bitterestBeer ??
            null,
          highestPlatoBeer:
            statsOverview?.highestPlatoBeer ??
            null,
        }
      : emptyProfileStats();

  const profileCzechMapItems =
    statsOverview?.czechBreweries ??
    [];

  const quickProfileItems = [
    {
      label: "Top styl",
      href: tasteStats.styles[0]
        ? styleHref(tasteStats.styles[0].id)
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
        ? brandHref(tasteStats.brands[0].id)
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
        ? `/breweries/${tasteStats.breweries[0].id}`
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
        ? countryHref(tasteStats.countries[0].name)
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

  const achievements =
    view === "medals"
      ? buildAchievementProgressFromMetrics(
          achievementMetrics
        )
      : [];

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
    view === "medals"
      ? await supabase
          .from("user_achievements")
          .select("achievement_key")
          .eq(
            "user_id",
            id
          )
      : {
          data: [],
          error: null,
        };

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
      className={`taste-profile-concept${view === "medals" ? " taste-profile-medals-concept" : ""}`}
      style={{
        maxWidth:
          "1500px",

        margin:
          "0 auto",

        padding:
          "12px 24px 72px",
      }}
    >
      {/* ==================================================
          PROFILOVÉ HERO
      ================================================== */}

      <PageHero
        eyebrow={
          isMe
            ? "Můj pivní deník"
            : "Pivní profil"
        }
        visualVariant="profile"
        imageUrl={view === "medals" ? "/images/heroes/achievements-pub-table.webp" : "/images/heroes/profile.jpg"}
        visualText={
          profile.display_name
            .charAt(0)
            .toUpperCase()
        }
        title={
          view === "breweries"
            ? (isMe ? "Moje pivovary" : "Pivovary")
            : view === "beers"
              ? (isMe ? "Co jsem vypil" : "Co vypil")
              : (
                <>
                  {profile.display_name}
                </>
              )
        }
        subtitle={
          view === "breweries" || view === "beers"
            ? ""
            : isMe
              ? "Tvoje pivní cesta v Pivníku. Ochutnávky, objevené pivovary, nové styly a odznaky na jednom místě."
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
        statsScrollable
        statsLoop
        statsAction={
          isMe ? (
            view === "breweries" ? (
              <BreweryCreateModalClient
                countries={countries ?? []}
                createBreweryAction={createBrewery}
              />
            ) : view === "beers" ? (
              undefined
            ) : (
              <TastingModal />
            )
          ) : undefined
        }
        stats={view === "breweries" ? [] : [
          {
            icon: <HomeStatIcon kind="barrel" />,
            accent: "#f3b43f",
            value: profileStats.totalQuantity,
            label: "Vypitých piv",
            href: `/stats?user=${profile.id}&locked=1&focus=beers&metric=quantity`,
          },
          {
            icon: <HomeStatIcon kind="mug" />,
            accent: "#d98945",
            value: profileStats.uniqueBeers,
            label: "Různých piv",
            href: `/stats?user=${profile.id}&locked=1&focus=beers`,
          },
          {
            icon: <HomeStatIcon kind="crest" />,
            accent: "#d98945",
            value: profileStats.uniqueBrands,
            label: "Značek",
            href: `/stats?user=${profile.id}&locked=1&focus=brands`,
          },
          {
            icon: <HomeStatIcon kind="brewery" />,
            accent: "#d5a13c",
            value: profileStats.uniqueBreweries,
            label: "Pivovarů",
            href: `/stats?user=${profile.id}&locked=1&focus=breweries`,
          },
          {
            icon: <HomeStatIcon kind="hop" />,
            accent: "#8ea348",
            value: profileStats.uniqueStyles,
            label: "Pivních stylů",
            href: `/stats?user=${profile.id}&locked=1&focus=styles`,
          },
          {
            icon: <HomeStatIcon kind="globe" />,
            accent: "#d37f43",
            value: profileStats.uniqueCountries,
            label: "Států",
            href: `/stats?user=${profile.id}&locked=1&focus=countries`,
          },
          {
            icon: <HomeStatIcon kind="hop" />,
            accent: "#879a43",
            value: profileStats.uniqueHops,
            label: "Chmelů",
            href: `/stats?user=${profile.id}&locked=1&focus=hops`,
          },
        ]}
      />
      <nav
        className="taste-profile-tabs"
        aria-label="Části pivního deníku"
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        {[
          { key: "stats", label: "Moje statistiky", href: isMe ? "/" : `/profiles/${profile.id}` },
          { key: "beers", label: "Co jsem vypil", href: isMe ? "/?view=beers" : `/profiles/${profile.id}?view=beers` },
          { key: "breweries", label: "Moje pivovary", href: isMe ? "/?view=breweries" : `/profiles/${profile.id}?view=breweries` },
          { key: "medals", label: "Hospodské ocenění", href: isMe ? "/?view=medals" : `/profiles/${profile.id}?view=medals` },
        ].map((item) => {
          const active = view === item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`taste-button-secondary taste-profile-tab taste-profile-tab-${item.key}`}
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
          className="taste-profile-quick-grid"
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
                className="taste-profile-quick-card"
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

      <ProfileBeerDnaCard
        styles={tasteStats.styles}
        profileId={profile.id}
      />

      <section className="taste-profile-major-stats" style={{ marginBottom: "38px" }}>
        <ProfileLoopCarousel className="taste-profile-major-carousel">
          <div className="taste-profile-major-slide">
            <ProfileBreweriesCard
              currentUserId={user.id}
              items={tasteStats.breweries}
              profileId={profile.id}
            />
          </div>

          <div className="taste-profile-major-slide">
            <ProfileBrandsCard
              items={tasteStats.brands}
              profileId={profile.id}
            />
          </div>
        </ProfileLoopCarousel>
      </section>

      <ProfileActivityCard
        monthlyActivity={profileStats.monthlyActivity}
        mostActiveMonth={profileStats.mostActiveMonth}
        mostActiveYear={profileStats.mostActiveYear}
        averagePerMonth={profileStats.averagePerMonth}
      />

      <ProfileTechnicalCard
        plato={profileStats.plato}
        abv={profileStats.abv}
        ibu={profileStats.ibu}
      />

      <ProfileRecordsCard
        strongestBeer={profileStats.strongestBeer}
        bitterestBeer={profileStats.bitterestBeer}
        highestPlatoBeer={profileStats.highestPlatoBeer}
        mostActiveMonth={profileStats.mostActiveMonth}
        mostActiveYear={profileStats.mostActiveYear}
        firstTasting={profileStats.firstTasting}
      />

      <ProfileWorldCard
        items={tasteStats.countries}
      />

      <ProfileMapsClient
        worldItems={tasteStats.countries}
        czechItems={profileCzechMapItems}
        profileId={profile.id}
      />

      <ProfileHopsCard
        items={tasteStats.hops}
        profileId={profile.id}
      />

      <ProfilePackagingCard
        items={tasteStats.packaging}
        profileId={profile.id}
      />
      </>}

      {view === "breweries" && (
        <ProfileBreweriesView items={profileBreweryItems} profileId={profile.id} currentUserId={user.id} />
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

      {view === "beers" && <section className="taste-profile-tastings-section">
        <div className="taste-profile-activity-mobile">
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
        </div>
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
              hasTastingSelection
                ? visibleTastings.length
                : historyPageData.allTotal
            }{" "}
            {(hasTastingSelection
              ? visibleTastings.length
              : historyPageData.allTotal) ===
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
          showAll={showAllTastings}
        />

        {!hasTastingSelection ? (
          <div className="taste-card taste-profile-tastings-empty">
            {historyPageData.allTotal > 0
              ? "Vyber filtr nebo tlačítko Vše."
              : "Tento uživatel zatím nemá žádnou ochutnávku."}
          </div>
        ) : visibleTastings.length === 0 ? (
          <div className="taste-card taste-profile-tastings-empty">
            Tomuto výběru neodpovídá žádná ochutnávka.
          </div>
        ) : null}

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
                            <Link prefetch={false} href={beerHref(tasting.beers.id, (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)?.id)} className="taste-entity-link" style={{ color: "inherit" }}>
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
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          gap: "7px",
                        }}
                      >
                        {tasting.beers &&
                          isBeerAvailableForTasting(
                            tasting.beers.portfolio_status,
                            tasting.beers.breweries?.closed_year
                          ) && (
                          <TastingModal
                            initialBeerId={tasting.beers.id}
                            triggerLabel="↻ Zapsat znovu"
                            compactTrigger
                          />
                        )}

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
                  </div>

                  {isRating(tasting.rating) && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Link href={`/ratings?beer=${tasting.beers?.id}`}><RatingStars rating={tasting.rating} compact /></Link></div>}

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

        {hasTastingSelection && (
          <ProfileTastingPager
            currentPage={currentHistoryPage}
            pageCount={historyPageCount}
          />
        )}
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
