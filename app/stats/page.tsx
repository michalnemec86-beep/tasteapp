import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  buildTasteStats,
  type RankingItem,
} from "@/lib/stats";
import { isPackaging } from "@/lib/packaging";

import StatsFilterBarClient from "./StatsFilterBarClient";
import BeerWorldMap from "./BeerWorldMap";
import RankingCardClient from "./RankingCardClient";
import PackagingSummaryCard from "./PackagingSummaryCard";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";

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
  | "hops";

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

  const sortMode: SortMode = isSortMode(requestedSort)
    ? requestedSort
    : "count-desc";

  const [profilesResult, tastingsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .order("display_name"),
      supabase
        .from("tastings")
        .select(`
          id,
          user_id,
          tasted_at,
          tasted_on,
          packaging,
          quantity,
          beer_versions (
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
        .order("tasted_on", {
          ascending: false,
        })
        .order("tasted_at", {
          ascending: false,
        }),
    ]);

  const {
    data: profiles,
    error: profilesError,
  } = profilesResult;
  const {
    data: tastings,
    error: tastingsError,
  } = tastingsResult;

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (tastingsError) {
    throw new Error(tastingsError.message);
  }

  const allProfiles = profiles ?? [];

  const allTastings = (tastings ?? []).map(
    (tasting) => {
      const beer = singleRelation(tasting.beers);
      const beerVersion =
        singleRelation(tasting.beer_versions);

      return {
        ...tasting,
        beer_versions: beerVersion
          ? {
              ...beerVersion,
              breweries: singleRelation(
                beerVersion.breweries
              ),
              beer_styles: singleRelation(
                beerVersion.beer_styles
              ),
              beer_version_hops:
                (beerVersion.beer_version_hops ?? []).map(
                  (versionHop) => ({
                    ...versionHop,
                    hops: singleRelation(
                      versionHop.hops
                    ),
                  })
                ),
            }
          : null,
        beers: beer
          ? {
              ...beer,
              brands: singleRelation(
                beer.brands
              ),
              breweries: singleRelation(
                beer.breweries
              ),
              beer_styles: singleRelation(
                beer.beer_styles
              ),
              beer_hops: (beer.beer_hops ?? []).map(
                (beerHop) => ({
                  ...beerHop,
                  hops: singleRelation(
                    beerHop.hops
                  ),
                })
              ),
            }
          : null,
      };
    }
  );

  const selectedProfile = requestedUser
    ? allProfiles.find(
        (profile) => profile.id === requestedUser
      ) ?? null
    : null;

  const selectedUserId = selectedProfile?.id;

  const selectedFocus =
    selectedProfile && isStatsFocus(requestedFocus)
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

  const periodTastings = allTastings.filter(
    (tasting) => {
      if (!selectedYear) {
        return true;
      }

      if (getYear(tasting.tasted_on) !== selectedYear) {
        return false;
      }

      if (!selectedMonth) {
        return true;
      }

      return getMonth(tasting.tasted_on) === selectedMonth;
    }
  );

  const userTastings = selectedUserId
    ? periodTastings.filter(
        (tasting) =>
          tasting.user_id === selectedUserId
      )
    : periodTastings;

  const packagingTastings = selectedPackaging
    ? userTastings.filter(
        (tasting) =>
          tasting.packaging === selectedPackaging
      )
    : userTastings;

  const requestedBeerId = parsePositiveInteger(requestedBeer);
  const requestedBrandId = parsePositiveInteger(requestedBrand);
  const requestedBreweryId = parsePositiveInteger(requestedBrewery);
  const requestedStyleId = parsePositiveInteger(requestedStyle);
  const requestedHopId = parsePositiveInteger(requestedHop);
  const normalizedRequestedCountry = requestedCountry
    ? normalizeCountry(requestedCountry)
    : undefined;

  // PREIMPORT_FOLLOWUP_APPLIED
  const filteredTastings = packagingTastings.filter((tasting) => {
    if (requestedBeerId && tasting.beers?.id !== requestedBeerId) {
      return false;
    }

    if (requestedBrandId && tasting.beers?.brands?.id !== requestedBrandId) {
      return false;
    }

    const brewery = tasting.beer_versions?.breweries ?? tasting.beers?.breweries;
    if (requestedBreweryId && brewery?.id !== requestedBreweryId) {
      return false;
    }

    const style = tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles;
    if (requestedStyleId && style?.id !== requestedStyleId) {
      return false;
    }

    if (normalizedRequestedCountry && normalizeCountry(brewery?.country ?? "") !== normalizedRequestedCountry) {
      return false;
    }

    if (requestedHopId) {
      const hopRows =
        tasting.beer_versions?.beer_version_hops ??
        tasting.beers?.beer_hops ??
        [];

      if (!hopRows.some((row) => row.hops?.id === requestedHopId)) {
        return false;
      }
    }

    return true;
  });

  const rawStats = buildTasteStats(filteredTastings);
  const personalStats = buildTasteStats(allTastings, user.id);

  const stats = {
    beers: sortRanking(rawStats.beers, sortMode),
    brands: sortRanking(rawStats.brands, sortMode),
    breweries: sortRanking(
      rawStats.breweries,
      sortMode
    ),
    styles: sortRanking(rawStats.styles, sortMode),
    countries: sortRanking(
      rawStats.countries,
      sortMode
    ),
    hops: sortRanking(rawStats.hops, sortMode),
    packaging: sortRanking(
      rawStats.packaging,
      sortMode
    ),
  };

  const totalTastings = filteredTastings.reduce(
    (sum, tasting) =>
      sum + (tasting.quantity ?? 1),
    0
  );

  const totalBeers = new Set(
    filteredTastings
      .map((tasting) => tasting.beers?.id)
      .filter((id) => id != null)
  ).size;

  const totalBrands = new Set(
    filteredTastings
      .map((tasting) => tasting.beers?.brands?.id)
      .filter((id) => id != null)
  ).size;

  const totalBreweries = new Set(
    filteredTastings
      .map((tasting) =>
        tasting.beer_versions?.breweries?.id ??
        tasting.beers?.breweries?.id
      )
      .filter((id) => id != null)
  ).size;

  const totalStyles = new Set(
    filteredTastings
      .map((tasting) =>
        (
          tasting.beer_versions
            ?.beer_styles ??
          tasting.beers
            ?.beer_styles
        )?.id
      )
      .filter((id) => id != null)
  ).size;

  const totalCountries = new Set(
    filteredTastings
      .map((tasting) =>
        (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)
          ?.country
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      )
      .filter(Boolean)
  ).size;

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
          icon: <AppIcon name="label" size={18} />,
          accent: "#e88835",
        },
        brands: {
          title: "Značky",
          subtitle: "Produktové značky v ochutnávkách",
          label: "Značek",
          value: totalBrands,
          icon: <AppIcon name="label" size={18} />,
          accent: "#d98a43",
        },
        breweries: {
          title: "Pivovary",
          subtitle: "Pivovary v ochutnávkách",
          label: "Pivovarů",
          value: totalBreweries,
          icon: <AppIcon name="brewery" size={18} />,
          accent: "#d65b42",
        },
        styles: {
          title: "Pivní styly",
          subtitle: "Styly v ochutnávkách",
          label: "Stylů",
          value: totalStyles,
          icon: <AppIcon name="hop" size={18} />,
          accent: "#9cad47",
        },
        countries: {
          title: "Státy",
          subtitle: "Země původu pivovarů v ochutnávkách",
          label: "Států",
          value: totalCountries,
          icon: <AppIcon name="globe" size={18} />,
          accent: "#b77a36",
        },
        hops: {
          title: "Chmely",
          subtitle: "Chmely použitých piv",
          label: "Chmelů",
          value: stats.hops.length,
          icon: <AppIcon name="hop" size={18} />,
          accent: "#879a43",
        },
      }[selectedFocus]
    : null;

  return (
    <main
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow={focusedView ? "Osobní statistiky" : "Pivní data"}
        imageUrl="/images/heroes/stats.jpg"
        visualVariant="stats"
        title={
          focusedView && selectedProfile
            ? `${focusedView.title} · ${selectedProfile.display_name}`
            : "Statistiky"
        }
        subtitle={
          focusedView && selectedProfile
            ? `Pouze ${focusedView.title.toLowerCase()} z ochutnávek uživatele ${selectedProfile.display_name}.`
            : "Podívej se na svůj pivní svět v číslech. Piva, značky, pivovary, styly, země, chmely i způsob podání na jednom místě."
        }
        action={
          focusedView && selectedProfile ? (
            <Link
              href={`/profiles/${selectedProfile.id}`}
              className="taste-button-secondary taste-focused-stats-profile-link"
              style={{ fontSize: "12px", fontWeight: 650 }}
            >
              ← Profil
            </Link>
          ) : (
            <Link
              href="/breweries"
              className="taste-button-secondary"
              style={{ fontSize: "12px", fontWeight: 650 }}
            >
              ← Pivovary
            </Link>
          )
        }
        stats={
          focusedView
            ? [
                {
                  icon: focusedView.icon,
                  accent: focusedView.accent,
                  value: focusedView.value,
                  label: focusedView.label,
                },
              ]
            : [
                {
                  icon: <AppIcon name="beer" size={18} />,
                  accent: "#f2b63f",
                  value: totalTastings,
                  label: "Vypitých piv",
                },
                {
                  icon: <AppIcon name="label" size={18} />,
                  accent: "#e88835",
                  value: totalBeers,
                  label: "Různých piv",
                },
                {
                  icon: <AppIcon name="label" size={18} />,
                  accent: "#d98a43",
                  value: totalBrands,
                  label: "Značek",
                },
                {
                  icon: <AppIcon name="brewery" size={18} />,
                  accent: "#d65b42",
                  value: totalBreweries,
                  label: "Pivovarů",
                },
                {
                  icon: "◐",
                  accent: "#9cad47",
                  value: totalStyles,
                  label: "Stylů",
                },
                {
                  icon: <AppIcon name="globe" size={18} />,
                  accent: "#b77a36",
                  value: totalCountries,
                  label: "Států",
                },
              ]
        }
      />

      {!selectedFocus && (
        <StatsFilterBarClient
          profiles={allProfiles}
          selectedUserId={selectedUserId}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedPackaging={selectedPackaging}
          sortMode={sortMode}
          firstYear={FIRST_YEAR}
        />
      )}

      {filteredTastings.length === 0 && (
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

      {!selectedFocus && (
        <PackagingSummaryCard items={stats.packaging} />
      )}

      <section>
        <div style={{ marginBottom: "15px" }}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(330px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {(!selectedFocus || selectedFocus === "beers") && (
            <RankingCardClient
              anchorId="piva"
              title="Piva"
              tone="gold"
              subtitle="Konkrétní ochutnaná piva"
              icon={<AppIcon name="label" size={20} />}
              items={stats.beers}
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.beers.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "brands") && (
            <RankingCardClient
              anchorId="znacky"
              title="Značky"
              tone="honey"
              subtitle="Produktové značky napříč pivovary a historií"
              icon={<AppIcon name="label" size={20} />}
              items={stats.brands}
              itemHrefPrefix="/brands"
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.brands.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "breweries") && (
            <RankingCardClient
              anchorId="pivovary"
              title="Pivovary"
              tone="honey"
              subtitle="Podle počtu vypitých piv"
              icon={<AppIcon name="brewery" size={20} />}
              items={stats.breweries}
              itemHrefPrefix="/breweries"
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.breweries.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "styles") && (
            <RankingCardClient
              anchorId="styly"
              title="Pivní styly"
              tone="amber"
              subtitle="Nejčastěji zastoupené styly"
              icon={<AppIcon name="hop" size={20} />}
              items={stats.styles}
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.styles.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "countries") && (
            <RankingCardClient
              anchorId="staty"
              title="Státy"
              tone="copper"
              subtitle="Země původu pivovarů"
              icon={<AppIcon name="globe" size={20} />}
              items={stats.countries}
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.countries.map((item) => item.id)}
            />
          )}

          {(!selectedFocus || selectedFocus === "hops") && (
            <RankingCardClient
              anchorId="chmely"
              title="Chmely"
              tone="malt"
              subtitle="Chmely použitých piv"
              icon={<AppIcon name="hop" size={20} />}
              items={stats.hops}
              disableItemLinks={Boolean(selectedFocus)}
              personalItemIds={personalStats.hops.map((item) => item.id)}
            />
          )}
        </div>
      </section>

      {filteredTastings.length > 0 &&
        (!selectedFocus || selectedFocus === "countries") && (
          <div style={{ marginBottom: "30px" }}>
            <BeerWorldMap items={rawStats.countries} />
          </div>
        )}
    </main>
  );
}

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getStringParam(
  value: string | string[] | undefined
) {
  return typeof value === "string"
    ? value
    : undefined;
}

function parsePositiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeCountry(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getYear(
  dateString: string | null | undefined
) {
  if (!dateString) {
    return null;
  }

  const year = Number(dateString.slice(0, 4));

  return Number.isInteger(year) ? year : null;
}

function getMonth(
  dateString: string | null | undefined
) {
  if (!dateString) {
    return null;
  }

  const month = Number(dateString.slice(5, 7));

  return Number.isInteger(month) ? month : null;
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
    value === "hops"
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
