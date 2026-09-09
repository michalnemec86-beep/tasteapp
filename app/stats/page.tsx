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
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";

type SortMode =
  | "count-desc"
  | "count-asc"
  | "name-asc"
  | "name-desc";

type StatsPageProps = {
  searchParams: Promise<{
    user?: string | string[];
    sort?: string | string[];
    year?: string | string[];
    month?: string | string[];
    packaging?: string | string[];
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
  const requestedSort = getStringParam(params.sort);
  const requestedYear = getStringParam(params.year);
  const requestedMonth = getStringParam(params.month);
  const requestedPackaging = getStringParam(
    params.packaging
  );

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

      return {
        ...tasting,
        beers: beer
          ? {
              ...beer,
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

  const filteredTastings = selectedPackaging
    ? userTastings.filter(
        (tasting) =>
          tasting.packaging === selectedPackaging
      )
    : userTastings;

  const rawStats = buildTasteStats(filteredTastings);

  const stats = {
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

  const totalBrands = new Set(
    filteredTastings
      .map((tasting) => tasting.beers?.id)
      .filter((id) => id != null)
  ).size;

  const totalBreweries = new Set(
    filteredTastings
      .map(
        (tasting) => tasting.beers?.breweries?.id
      )
      .filter((id) => id != null)
  ).size;

  const totalStyles = new Set(
    filteredTastings
      .map(
        (tasting) => tasting.beers?.beer_styles?.id
      )
      .filter((id) => id != null)
  ).size;

  const totalCountries = new Set(
    filteredTastings
      .map((tasting) =>
        tasting.beers?.breweries?.country
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      )
      .filter(Boolean)
  ).size;

  return (
    <main
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow="Pivní data"
        imageUrl="/images/heroes/stats.jpg"
        visualVariant="stats"
        title="Statistiky"
        subtitle="Podívej se na svůj pivní svět v číslech. Piva, pivovary, styly, země i chmely na jednom místě a s přímými prokliky do katalogu."
        action={
          <Link
            href="/breweries"
            className="taste-button-secondary"
            style={{
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            ← Pivovary
          </Link>
        }
        stats={[
          {
            icon: <AppIcon name="beer" size={18} />,
            accent: "#f2b63f",
            value: totalTastings,
            label: "Vypitých piv",
          },
          {
            icon: <AppIcon name="label" size={18} />,
            accent: "#e88835",
            value: totalBrands,
            label: "Různých piv",
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
        ]}
      />

      <StatsFilterBarClient
        profiles={allProfiles}
        selectedUserId={selectedUserId}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedPackaging={selectedPackaging}
        sortMode={sortMode}
        firstYear={FIRST_YEAR}
      />

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
            Pivní přehled
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
          <RankingCardClient
            title="Piva"
            tone="gold"
            subtitle="Konkrétní ochutnaná piva"
            icon={<AppIcon name="label" size={20} />}
            items={stats.brands}
          />

          <RankingCardClient
            title="Pivovary"
            tone="honey"
            subtitle="Podle počtu vypitých piv"
            icon={<AppIcon name="brewery" size={20} />}
            items={stats.breweries}
            itemHrefPrefix="/breweries"
          />

          <RankingCardClient
            title="Pivní styly"
            tone="amber"
            subtitle="Nejčastěji zastoupené styly"
            icon={<AppIcon name="hop" size={20} />}
            items={stats.styles}
          />

          <RankingCardClient
            title="Státy"
            tone="copper"
            subtitle="Země původu pivovarů"
            icon={<AppIcon name="globe" size={20} />}
            items={stats.countries}
          />

          <RankingCardClient
            title="Chmely"
            tone="malt"
            subtitle="Chmely použitých piv"
            icon={<AppIcon name="hop" size={20} />}
            items={stats.hops}
          />

          <RankingCardClient
            title="Podání / obal"
            tone="bronze"
            subtitle="Podle počtu vypitých piv"
            icon={<AppIcon name="package" size={20} />}
            items={stats.packaging}
            itemHrefPrefix="/stats/packaging"
          />
        </div>
      </section>

      {filteredTastings.length > 0 && (
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
