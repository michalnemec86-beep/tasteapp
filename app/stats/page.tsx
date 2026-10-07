import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { RankingItem } from "@/lib/stats";
import { parseStatsDashboardPayload } from "@/lib/stats-dashboard";
import { isPackaging } from "@/lib/packaging";

import StatsFilterBarClient from "./StatsFilterBarClient";
import StatsWorldMapPanelClient from "./StatsWorldMapPanelClient";
import RankingCardClient from "./RankingCardClient";
import PackagingSummaryCard from "./PackagingSummaryCard";
import HorizontalRankingScroller from "./HorizontalRankingScroller";
import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import "./stats-concept.css";
import ContextStatValue from "@/components/stats/ContextStatValue";

type SortMode =
  | "count-desc"
  | "count-asc"
  | "name-asc"
  | "name-desc";

type StatsFocus =
  | "beers"
  | "brands"
  | "breweries"
  | "styles"
  | "countries"
  | "hops"
  | "packaging";

type StatsPageProps = {
  searchParams: Promise<{
    user?: string | string[];
    focus?: string | string[];
    metric?: string | string[];
    sort?: string | string[];
    year?: string | string[];
    month?: string | string[];
    packaging?: string | string[];
    beer?: string | string[];
    brand?: string | string[];
    brewery?: string | string[];
    style?: string | string[];
    country?: string | string[];
    hop?: string | string[];
    letter?: string | string[];
    locked?: string | string[];
    q?: string | string[];
  }>;
};

const FIRST_YEAR = 2005;

export default async function StatsPage({
  searchParams,
}: StatsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;

  const requestedUser = getStringParam(params.user);
  const requestedFocus = getStringParam(params.focus);
  const requestedMetric = getStringParam(params.metric);
  const requestedSort = getStringParam(params.sort);
  const requestedYear = getStringParam(params.year);
  const requestedMonth = getStringParam(params.month);
  const requestedPackaging = getStringParam(
    params.packaging
  );
  const requestedBeer = getStringParam(params.beer);
  const requestedBrand = getStringParam(params.brand);
  const requestedBrewery = getStringParam(params.brewery);
  const requestedStyle = getStringParam(params.style);
  const requestedCountry = getStringParam(params.country);
  const requestedHop = getStringParam(params.hop);
  const requestedLocked = getStringParam(params.locked);
  const requestedSearch =
    getStringParam(params.q)?.trim() ?? "";
  const selectedLetter = getStringParam(params.letter)
    ?.toLocaleUpperCase("cs") ?? "";

  const sortMode: SortMode = isSortMode(requestedSort)
    ? requestedSort
    : "count-desc";

  const selectedFocus = isStatsFocus(requestedFocus)
    ? requestedFocus
    : undefined;

  const currentYear = new Date().getFullYear();
  const requestedYearNumber = requestedYear
    ? Number(requestedYear)
    : undefined;

  const selectedYear =
    requestedYearNumber &&
    Number.isInteger(requestedYearNumber) &&
    requestedYearNumber >= FIRST_YEAR &&
    requestedYearNumber <= currentYear
      ? requestedYearNumber
      : undefined;

  const requestedMonthNumber = requestedMonth
    ? Number(requestedMonth)
    : undefined;

  const selectedMonth =
    selectedYear &&
    requestedMonthNumber &&
    Number.isInteger(requestedMonthNumber) &&
    requestedMonthNumber >= 1 &&
    requestedMonthNumber <= 12
      ? requestedMonthNumber
      : undefined;

  const selectedPackaging =
    requestedPackaging &&
    isPackaging(requestedPackaging)
      ? requestedPackaging
      : undefined;

  const requestedBeerId = parsePositiveInteger(requestedBeer);
  const requestedBrandId = parsePositiveInteger(requestedBrand);
  const requestedBreweryId = parsePositiveInteger(requestedBrewery);
  const requestedStyleId = parsePositiveInteger(requestedStyle);
  const requestedHopId = parsePositiveInteger(requestedHop);
  const candidateSelectedUserId =
    parseUuid(requestedUser);

  const statsRpcParams = {
    p_current_user: user.id,
    p_selected_user:
      candidateSelectedUserId ?? null,
    p_year: selectedYear ?? null,
    p_month: selectedMonth ?? null,
    p_packaging:
      selectedPackaging ?? null,
    p_beer_id: requestedBeerId ?? null,
    p_brand_id: requestedBrandId ?? null,
    p_brewery_id:
      requestedBreweryId ?? null,
    p_style_id: requestedStyleId ?? null,
    p_country:
      requestedCountry?.trim() || null,
    p_hop_id: requestedHopId ?? null,
  };

  let [profilesResult, statsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .order("display_name"),
      supabase.rpc(
        "get_stats_dashboard",
        statsRpcParams
      ),
    ]);

  const {
    data: profiles,
    error: profilesError,
  } = profilesResult;

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (statsResult.error) {
    throw new Error(
      statsResult.error.message
    );
  }

  const allProfiles = profiles ?? [];

  const selectedProfile = requestedUser
    ? allProfiles.find(
        (profile) =>
          profile.id === requestedUser
      ) ?? null
    : null;

  const selectedUserId =
    selectedProfile?.id;

  // A stale or hand-written user query keeps the previous behavior:
  // unknown profiles fall back to the shared statistics.
  if (
    candidateSelectedUserId &&
    !selectedProfile
  ) {
    statsResult = await supabase.rpc(
      "get_stats_dashboard",
      {
        ...statsRpcParams,
        p_selected_user: null,
      }
    );

    if (statsResult.error) {
      throw new Error(
        statsResult.error.message
      );
    }
  }

  const dashboard =
    parseStatsDashboardPayload(
      statsResult.data
    );

  const rawStats =
    dashboard.primary.stats;
  const comparisonStats =
    dashboard.comparison.stats;
  const personalStats =
    dashboard.personal.stats;

  const isLockedContext =
    requestedLocked === "1" &&
    Boolean(selectedProfile);
  const comparisonLabel =
    selectedUserId
      ? "celkem"
      : "moje";

  const contextFilters = [
    requestedBeerId
      ? {
          param: "beer",
          label: "Pivo",
          value:
            dashboard.labels.beer ??
            `#${requestedBeerId}`,
        }
      : null,
    requestedBrandId
      ? {
          param: "brand",
          label: "Značka",
          value:
            dashboard.labels.brand ??
            `#${requestedBrandId}`,
        }
      : null,
    requestedBreweryId
      ? {
          param: "brewery",
          label: "Pivovar",
          value:
            dashboard.labels.brewery ??
            `#${requestedBreweryId}`,
        }
      : null,
    requestedStyleId
      ? {
          param: "style",
          label: "Styl",
          value:
            dashboard.labels.style ??
            `#${requestedStyleId}`,
        }
      : null,
    requestedCountry
      ? {
          param: "country",
          label: "Země",
          value:
            dashboard.labels.country ??
            requestedCountry,
        }
      : null,
    requestedHopId
      ? {
          param: "hop",
          label: "Chmel",
          value:
            dashboard.labels.hop ??
            `#${requestedHopId}`,
        }
      : null,
  ].filter(
    (
      filter
    ): filter is {
      param: string;
      label: string;
      value: string;
    } =>
      Boolean(filter)
  );

  const normalizedSearch =
    normalizeSearchValue(
      requestedSearch
    );

  const filterBySearch = (
    items: RankingItem[]
  ) =>
    normalizedSearch
      ? items.filter(
          (item) =>
            normalizeSearchValue(
              item.name
            ).includes(
              normalizedSearch
            )
        )
      : items;

  const alphabetItems = [
    ...filterBySearch(rawStats.beers),
    ...filterBySearch(rawStats.brands),
    ...filterBySearch(rawStats.breweries),
    ...filterBySearch(rawStats.styles),
    ...filterBySearch(rawStats.countries),
    ...filterBySearch(rawStats.hops),
    ...(selectedFocus === "packaging" ? filterBySearch(rawStats.packaging) : []),
  ];

  const availableLetters = Array.from(
    new Set(
      alphabetItems.map(
        (item) =>
          rankingInitial(
            item.name
          )
      )
    )
  ).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "cs");
  });

  const filterRankingItems = (
    items: RankingItem[]
  ) => {
    const searched =
      filterBySearch(items);

    return selectedLetter
      ? searched.filter(
          (item) =>
            rankingInitial(
              item.name
            ) ===
            selectedLetter
        )
      : searched;
  };

  const stats = {
    beers: sortRanking(
      filterRankingItems(
        rawStats.beers
      ),
      sortMode
    ),
    brands: sortRanking(
      filterRankingItems(
        rawStats.brands
      ),
      sortMode
    ),
    breweries: sortRanking(
      filterRankingItems(
        rawStats.breweries
      ),
      sortMode
    ),
    styles: sortRanking(
      filterRankingItems(
        rawStats.styles
      ),
      sortMode
    ),
    countries: sortRanking(
      filterRankingItems(
        rawStats.countries
      ),
      sortMode
    ),
    hops: sortRanking(
      filterRankingItems(
        rawStats.hops
      ),
      sortMode
    ),
    packaging: sortRanking(
      selectedFocus === "packaging" ? filterRankingItems(rawStats.packaging) : rawStats.packaging,
      sortMode
    ),
  };

  const totalTastings =
    dashboard.primary.units;
  const totalBeers =
    rawStats.beers.length;
  const totalBrands =
    rawStats.brands.length;
  const totalBreweries =
    rawStats.breweries.length;
  const totalStyles =
    rawStats.styles.length;
  const totalCountries =
    rawStats.countries.length;

  const comparisonTotalTastings =
    dashboard.comparison.units;
  const comparisonTotalBeers =
    comparisonStats.beers.length;
  const comparisonTotalBrands =
    comparisonStats.brands.length;
  const comparisonTotalBreweries =
    comparisonStats.breweries.length;
  const comparisonTotalStyles =
    comparisonStats.styles.length;
  const comparisonTotalCountries =
    comparisonStats.countries.length;

  const focusedView = selectedFocus
    ? {
        beers: {
          title: "Piva",
          subtitle: "Konkrétní ochutnaná piva",
          label:
            requestedMetric === "quantity"
              ? "Vypitých piv"
              : "Různých piv",
          value:
            requestedMetric === "quantity"
              ? totalTastings
              : totalBeers,
          comparisonValue:
            requestedMetric === "quantity"
              ? comparisonTotalTastings
              : comparisonTotalBeers,
          icon: <HomeStatIcon kind="mug" />,
          accent: "#e88835",
        },
        brands: {
          title: "Značky",
          subtitle: "Produktové značky v ochutnávkách",
          label: "Značek",
          value: totalBrands,
          comparisonValue: comparisonTotalBrands,
          icon: <HomeStatIcon kind="crest" />,
          accent: "#d98a43",
        },
        breweries: {
          title: "Pivovary",
          subtitle: "Pivovary v ochutnávkách",
          label: "Pivovarů",
          value: totalBreweries,
          comparisonValue: comparisonTotalBreweries,
          icon: <HomeStatIcon kind="brewery" />,
          accent: "#d65b42",
        },
        styles: {
          title: "Pivní styly",
          subtitle: "Styly v ochutnávkách",
          label: "Stylů",
          value: totalStyles,
          comparisonValue: comparisonTotalStyles,
          icon: <HomeStatIcon kind="hop" />,
          accent: "#9cad47",
        },
        countries: {
          title: "Státy",
          subtitle: "Země původu pivovarů v ochutnávkách",
          label: "Států",
          value: totalCountries,
          comparisonValue: comparisonTotalCountries,
          icon: <HomeStatIcon kind="globe" />,
          accent: "#b77a36",
        },
        packaging: {
          title: "Způsob podání",
          subtitle: "Podání a obaly ochutnaných piv",
          label: "Vypitých piv",
          value: totalTastings,
          comparisonValue: comparisonTotalTastings,
          icon: <HomeStatIcon kind="mug" />,
          accent: "#e88835",
        },
        hops: {
          title: "Chmely",
          subtitle: "Chmely použitých piv",
          label: "Chmelů",
          value: stats.hops.length,
          comparisonValue: comparisonStats.hops.length,
          icon: <HomeStatIcon kind="hop" />,
          accent: "#879a43",
        },
      }[selectedFocus]
    : null;

  return (
    <main
      className="taste-stats-concept"
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow={selectedProfile ? "Osobní statistiky" : "Pivní data"}
        imageUrl="/images/heroes/stats.jpg"
        visualVariant="stats"
        title={
          focusedView && selectedProfile
            ? `${focusedView.title} · ${selectedProfile.display_name}`
            : selectedProfile
              ? `Statistiky · ${selectedProfile.display_name}`
              : focusedView
                ? focusedView.title
                : "Co a jak pijeme"
        }
        subtitle={
          focusedView && selectedProfile
            ? `Pouze ${focusedView.title.toLowerCase()} z ochutnávek uživatele ${selectedProfile.display_name}.`
            : selectedProfile
              ? `Statistiky jsou omezené na uživatele ${selectedProfile.display_name}; srovnání v závorkách ukazuje celková data hospody.`
              : focusedView
                ? `${focusedView.subtitle}. V závorkách je stejný výběr z tvé evidence.`
                : "Společné statistiky všech lidí v hospodě; v závorkách je stejný výběr z tvé evidence."
        }
        action={!selectedProfile ? (
          <div className="taste-stats-hero-links">
            <Link
              href="/stats?focus=hops"
              className="taste-button-secondary taste-stats-hero-link-hops"
              aria-current={selectedFocus === "hops" ? "page" : undefined}
            >
              Chmely
            </Link>
            <Link
              href="/stats?focus=styles"
              className="taste-button-secondary taste-stats-hero-link-styles"
              aria-current={selectedFocus === "styles" ? "page" : undefined}
            >
              Pivní styly
            </Link>
          </div>
        ) : undefined}
        statsScrollable={!focusedView}
        stats={
          focusedView
            ? [
                {
                  icon: focusedView.icon,
                  accent: focusedView.accent,
                  value: (
                    <ContextStatValue
                      primary={focusedView.value}
                      secondary={focusedView.comparisonValue}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: focusedView.label,
                },
              ]
            : [
                {
                  icon: <HomeStatIcon kind="barrel" />,
                  accent: "#f2b63f",
                  value: (
                    <ContextStatValue
                      primary={totalTastings}
                      secondary={comparisonTotalTastings}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Vypitých piv",
                },
                {
                  icon: <HomeStatIcon kind="mug" />,
                  accent: "#e88835",
                  value: (
                    <ContextStatValue
                      primary={totalBeers}
                      secondary={comparisonTotalBeers}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Různých piv",
                },
                {
                  icon: <HomeStatIcon kind="crest" />,
                  accent: "#d98a43",
                  value: (
                    <ContextStatValue
                      primary={totalBrands}
                      secondary={comparisonTotalBrands}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Značek",
                },
                {
                  icon: <HomeStatIcon kind="brewery" />,
                  accent: "#d65b42",
                  value: (
                    <ContextStatValue
                      primary={totalBreweries}
                      secondary={comparisonTotalBreweries}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Pivovarů",
                },
                {
                  icon: <HomeStatIcon kind="hop" />,
                  accent: "#9cad47",
                  value: (
                    <ContextStatValue
                      primary={totalStyles}
                      secondary={comparisonTotalStyles}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Stylů",
                },
                {
                  icon: <HomeStatIcon kind="globe" />,
                  accent: "#b77a36",
                  value: (
                    <ContextStatValue
                      primary={totalCountries}
                      secondary={comparisonTotalCountries}
                      secondaryLabel={comparisonLabel}
                    />
                  ),
                  label: "Států",
                },
              ]
        }
      />

      <StatsFilterBarClient
        profiles={allProfiles}
        selectedUserId={selectedUserId}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedPackaging={selectedPackaging}
        sortMode={sortMode}
        selectedLetter={selectedLetter}
        searchQuery={requestedSearch}
        letters={availableLetters}
        firstYear={FIRST_YEAR}
        contextFilters={contextFilters}
        hideProfileSelector={isLockedContext}
      />

      {totalTastings === 0 && (
        <div
          className="taste-card"
          style={{
            padding: "32px",
            marginBottom: "26px",
            textAlign: "center",
            color: "var(--taste-text-muted)",
            fontSize: "13px",
          }}
        >
          Pro tento výběr zatím nejsou žádné ochutnávky.
        </div>
      )}

      <section className="taste-stats-rankings">
        <div className="taste-stats-section-heading" style={{ marginBottom: "15px" }}>
          <div
            className="taste-label"
            style={{ marginBottom: "5px" }}
          >
            Žebříčky
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: 1.1,
              fontWeight: 750,
              letterSpacing: "-0.025em",
            }}
          >
            {focusedView ? focusedView.title : "Pivní přehled"}
          </h2>
        </div>

        <HorizontalRankingScroller
          enabled={!selectedFocus}
        >
          {(!selectedFocus || selectedFocus === "beers") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="piva"
              title="Piva"
              tone="gold"
              subtitle="Konkrétní ochutnaná piva"
              icon={<HomeStatIcon kind="mug" />}
              items={stats.beers}
              comparisonItems={comparisonStats.beers}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.beers.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "brands") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="znacky"
              title="Značky"
              tone="honey"
              subtitle="Produktové značky napříč pivovary a historií"
              icon={<HomeStatIcon kind="crest" />}
              items={stats.brands}
              comparisonItems={comparisonStats.brands}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              itemHrefPrefix="/brands"
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.brands.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "breweries") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="pivovary"
              title="Pivovary"
              tone="honey"
              subtitle="Podle počtu vypitých piv"
              icon={<HomeStatIcon kind="brewery" />}
              items={stats.breweries}
              comparisonItems={comparisonStats.breweries}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              itemHrefPrefix="/breweries"
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.breweries.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "styles") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="styly"
              title="Pivní styly"
              tone="amber"
              subtitle="Nejčastěji zastoupené styly"
              icon={<HomeStatIcon kind="hop" />}
              items={stats.styles}
              comparisonItems={comparisonStats.styles}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.styles.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "countries") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="staty"
              title="Státy"
              tone="copper"
              subtitle="Země původu pivovarů"
              icon={<HomeStatIcon kind="globe" />}
              items={stats.countries}
              comparisonItems={comparisonStats.countries}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.countries.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "hops") && (
            <RankingCardClient
              currentUserId={user.id}
              expanded={Boolean(selectedFocus)}
              anchorId="chmely"
              title="Chmely"
              tone="malt"
              subtitle="Chmely použitých piv"
              icon={<HomeStatIcon kind="hop" />}
              items={stats.hops}
              comparisonItems={comparisonStats.hops}
              comparisonLabel={comparisonLabel}
              lockedContext={isLockedContext}
              disableItemLinks={Boolean(selectedFocus) && Boolean(selectedProfile) && !isLockedContext}
              personalItemIds={personalStats.hops.map((item) => item.id)}
            />
          )}

          {!selectedFocus && totalTastings > 0 && (
            <StatsWorldMapPanelClient
              items={rawStats.countries}
              statsContextUserId={selectedUserId}
              lockStatsContext={isLockedContext}
              comparisonCount={comparisonStats.countries.length}
              comparisonLabel={comparisonLabel}
            />
          )}
          {selectedFocus === "packaging" && (
            <RankingCardClient
              currentUserId={user.id}
              expanded
              anchorId="podani"
              title="Způsob podání"
              subtitle="Podání a obaly ochutnaných piv"
              tone="amber"
              icon={<HomeStatIcon kind="mug" />}
              items={stats.packaging}
              comparisonItems={comparisonStats.packaging}
              comparisonLabel={comparisonLabel}
              personalItemIds={personalStats.packaging.map(item => item.id)}
            />
          )}
        </HorizontalRankingScroller>
      </section>

      {!selectedFocus && (
        <PackagingSummaryCard
          items={stats.packaging}
          comparisonItems={comparisonStats.packaging}
          comparisonLabel={comparisonLabel}
          contextParams={{
            user: selectedUserId,
            locked: isLockedContext ? "1" : undefined,
            year: selectedYear ? String(selectedYear) : undefined,
            month: selectedMonth ? String(selectedMonth) : undefined,
            sort: sortMode !== "count-desc" ? sortMode : undefined,
            letter: selectedLetter || undefined,
            beer: requestedBeerId ? String(requestedBeerId) : undefined,
            brand: requestedBrandId ? String(requestedBrandId) : undefined,
            brewery: requestedBreweryId ? String(requestedBreweryId) : undefined,
            style: requestedStyleId ? String(requestedStyleId) : undefined,
            country: requestedCountry,
            hop: requestedHopId ? String(requestedHopId) : undefined,
            q: requestedSearch || undefined,
          }}
        />
      )}

      {totalTastings > 0 &&
        selectedFocus === "countries" && (
          <div style={{ marginBottom: "30px" }}>
            <StatsWorldMapPanelClient
              items={rawStats.countries}
              statsContextUserId={selectedUserId}
              lockStatsContext={isLockedContext}
              comparisonCount={comparisonStats.countries.length}
              comparisonLabel={comparisonLabel}
            />
          </div>
        )}
    </main>
  );
}


function getStringParam(
  value: string | string[] | undefined
) {
  return typeof value === "string"
    ? value
    : undefined;
}

function parseUuid(
  value: string | undefined
) {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    return undefined;
  }

  return value;
}

function parsePositiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeSearchValue(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs")
    .trim();
}

function isStatsFocus(
  value: string | undefined
): value is StatsFocus {
  return (
    value === "beers" ||
    value === "brands" ||
    value === "breweries" ||
    value === "styles" ||
    value === "countries" ||
    value === "hops" ||
    value === "packaging"
  );
}

function isSortMode(
  value: string | undefined
): value is SortMode {
  return (
    value === "count-desc" ||
    value === "count-asc" ||
    value === "name-asc" ||
    value === "name-desc"
  );
}

function sortRanking(
  items: RankingItem[],
  mode: SortMode
) {
  return [...items].sort((a, b) => {
    switch (mode) {
      case "count-asc":
        return a.count !== b.count
          ? a.count - b.count
          : a.name.localeCompare(b.name, "cs");

      case "name-asc":
        return a.name.localeCompare(b.name, "cs");

      case "name-desc":
        return b.name.localeCompare(a.name, "cs");

      case "count-desc":
      default:
        return b.count !== a.count
          ? b.count - a.count
          : a.name.localeCompare(b.name, "cs");
    }
  });
}

function rankingInitial(name: string) {
  const first = name.trim().charAt(0).toLocaleUpperCase("cs");
  const normalized = first.normalize("NFD").replace(/\p{M}/gu, "");

  return /^[A-Z]$/.test(normalized) ? normalized : "#";
}
