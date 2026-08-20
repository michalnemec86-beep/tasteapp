import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  buildTasteStats,
  type RankingItem,
} from "@/lib/stats";

import YearSelect from "./YearSelect";
import BeerWorldMap from "./BeerWorldMap";
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
  }>;
};

const FIRST_YEAR = 2005;

const MONTHS = [
  { number: 1, name: "Leden" },
  { number: 2, name: "Únor" },
  { number: 3, name: "Březen" },
  { number: 4, name: "Duben" },
  { number: 5, name: "Květen" },
  { number: 6, name: "Červen" },
  { number: 7, name: "Červenec" },
  { number: 8, name: "Srpen" },
  { number: 9, name: "Září" },
  { number: 10, name: "Říjen" },
  { number: 11, name: "Listopad" },
  { number: 12, name: "Prosinec" },
];

export default async function StatsPage({
  searchParams,
}: StatsPageProps) {
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

  const params =
    await searchParams;

  const requestedUser =
    getStringParam(
      params.user
    );

  const requestedSort =
    getStringParam(
      params.sort
    );

  const requestedYear =
    getStringParam(
      params.year
    );

  const requestedMonth =
    getStringParam(
      params.month
    );

  const sortMode: SortMode =
    isSortMode(
      requestedSort
    )
      ? requestedSort
      : "count-desc";

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

  const [
    profilesResult,
    tastingsResult,
  ] =
    await Promise.all([
      profilesPromise,
      tastingsPromise,
    ]);

  const {
    data: profiles,
    error:
      profilesError,
  } = profilesResult;

  const {
    data: tastings,
    error:
      tastingsError,
  } = tastingsResult;

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

  const allProfiles =
    profiles ?? [];

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

  // ==================================================
  // UŽIVATEL
  // ==================================================

  const selectedProfile =
    requestedUser
      ? allProfiles.find(
          (profile) =>
            profile.id ===
            requestedUser
        ) ?? null
      : null;

  const selectedUserId =
    selectedProfile?.id;

  // ==================================================
  // ROK
  // ==================================================

  const currentYear =
    new Date().getFullYear();

  const requestedYearNumber =
    requestedYear
      ? Number(
          requestedYear
        )
      : undefined;

  const selectedYear =
    requestedYearNumber &&
    Number.isInteger(
      requestedYearNumber
    ) &&
    requestedYearNumber >=
      FIRST_YEAR &&
    requestedYearNumber <=
      currentYear
      ? requestedYearNumber
      : undefined;

  // ==================================================
  // MĚSÍC
  // ==================================================

  const requestedMonthNumber =
    requestedMonth
      ? Number(
          requestedMonth
        )
      : undefined;

  const selectedMonth =
    selectedYear &&
    requestedMonthNumber &&
    Number.isInteger(
      requestedMonthNumber
    ) &&
    requestedMonthNumber >= 1 &&
    requestedMonthNumber <= 12
      ? requestedMonthNumber
      : undefined;

  // ==================================================
  // FILTR PODLE OBDOBÍ
  // ==================================================

  const periodTastings =
    allTastings.filter(
      (tasting) => {
        if (!selectedYear) {
          return true;
        }

        const tastingYear =
          getYear(
            tasting.tasted_on
          );

        if (
          tastingYear !==
          selectedYear
        ) {
          return false;
        }

        if (!selectedMonth) {
          return true;
        }

        return (
          getMonth(
            tasting.tasted_on
          ) === selectedMonth
        );
      }
    );

  // ==================================================
  // FILTR PODLE UŽIVATELE
  // ==================================================

  const filteredTastings =
    selectedUserId
      ? periodTastings.filter(
          (tasting) =>
            tasting.user_id ===
            selectedUserId
        )
      : periodTastings;

  // ==================================================
  // STATISTIKY
  // ==================================================

  const rawStats =
    buildTasteStats(
      filteredTastings
    );

  const stats = {
    brands:
      sortRanking(
        rawStats.brands,
        sortMode
      ),

    breweries:
      sortRanking(
        rawStats.breweries,
        sortMode
      ),

    styles:
      sortRanking(
        rawStats.styles,
        sortMode
      ),

    countries:
      sortRanking(
        rawStats.countries,
        sortMode
      ),

    hops:
      sortRanking(
        rawStats.hops,
        sortMode
      ),

    packaging:
      sortRanking(
        rawStats.packaging,
        sortMode
      ),
  };

  // ==================================================
  // SOUHRN
  // ==================================================

  const totalTastings =
    filteredTastings.reduce(
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
      filteredTastings
        .map(
          (tasting) =>
            tasting.beers?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const totalBreweries =
    new Set(
      filteredTastings
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
      filteredTastings
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
      filteredTastings
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

  const selectedUserTitle =
    selectedProfile
      ? selectedProfile.display_name
      : "Všichni uživatelé";

  const periodTitle =
    getPeriodLabel(
      selectedYear,
      selectedMonth
    );

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <main
      style={{
        maxWidth:
          "1400px",

        margin:
          "0 auto",

        padding:
          "34px 24px 80px",
      }}
    >
      {/* ==================================================
          HERO
      ================================================== */}

      <PageHero
        eyebrow="Pivní data"
        imageUrl="/images/heroes/stats.jpg"
        visualVariant="stats"
        title={
          <>
            Statistiky
          </>
        }
        subtitle="Podívej se na svůj pivní svět v číslech. Piva, pivovary, styly, země i chmely na jednom místě."
        action={
          <Link
            href="/"
            className="taste-button-secondary"
            style={{
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            ← Timeline
          </Link>
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
            value: totalTastings,
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
            value: totalBrands,
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
            value: totalBreweries,
            label: "Pivovarů",
          },
          {
            icon: "◐",
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
            accent: "#d37f43",
            value: totalCountries,
            label: "Států",
          },
        ]}
      />

      {/* ==================================================
          FILTRY
      ================================================== */}

      <section
        style={{
          padding:
            "20px",

          marginBottom:
            "18px",

          border:
            "1px solid var(--taste-border)",

          borderRadius:
            "var(--taste-radius-lg)",

          background:
            "var(--taste-surface)",

          boxShadow:
            "var(--taste-shadow-soft)",
        }}
      >
        {/* UŽIVATEL */}

        <FilterGroup
          title="Uživatel"
        >
          <FilterButton
            href={buildStatsHref({
              sort:
                sortMode,

              year:
                selectedYear,

              month:
                selectedMonth,
            })}
            active={
              !selectedProfile
            }
          >
            Celkem
          </FilterButton>

          {allProfiles.map(
            (profile) => (
              <FilterButton
                key={
                  profile.id
                }
                href={buildStatsHref({
                  userId:
                    profile.id,

                  sort:
                    sortMode,

                  year:
                    selectedYear,

                  month:
                    selectedMonth,
                })}
                active={
                  selectedProfile?.id ===
                  profile.id
                }
              >
                {
                  profile.display_name
                }
              </FilterButton>
            )
          )}
        </FilterGroup>

        {/* ROK */}

        <div
          style={{
            marginTop:
              "18px",

            paddingTop:
              "18px",

            borderTop:
              "1px solid rgba(231,166,47,0.08)",
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom:
                "9px",
            }}
          >
            Období
          </div>

          <YearSelect
            selectedYear={
              selectedYear
            }
            firstYear={
              FIRST_YEAR
            }
          />
        </div>

        {/* MĚSÍC */}

        {selectedYear && (
          <div
            style={{
              marginTop:
                "18px",

              paddingTop:
                "18px",

              borderTop:
                "1px solid rgba(231,166,47,0.08)",
            }}
          >
            <FilterGroup
              title="Měsíc"
            >
              <FilterButton
                href={buildStatsHref({
                  userId:
                    selectedUserId,

                  sort:
                    sortMode,

                  year:
                    selectedYear,
                })}
                active={
                  !selectedMonth
                }
              >
                Celý rok
              </FilterButton>

              {MONTHS.map(
                (month) => (
                  <FilterButton
                    key={
                      month.number
                    }
                    href={buildStatsHref({
                      userId:
                        selectedUserId,

                      sort:
                        sortMode,

                      year:
                        selectedYear,

                      month:
                        month.number,
                    })}
                    active={
                      selectedMonth ===
                      month.number
                    }
                  >
                    {
                      month.name
                    }
                  </FilterButton>
                )
              )}
            </FilterGroup>
          </div>
        )}

        {/* ŘAZENÍ */}

        <div
          style={{
            marginTop:
              "18px",

            paddingTop:
              "18px",

            borderTop:
              "1px solid rgba(231,166,47,0.08)",
          }}
        >
          <FilterGroup
            title="Řazení žebříčků"
          >
            <FilterButton
              href={buildStatsHref({
                userId:
                  selectedUserId,

                sort:
                  "count-desc",

                year:
                  selectedYear,

                month:
                  selectedMonth,
              })}
              active={
                sortMode ===
                "count-desc"
              }
            >
              ↓ Nejvíce
            </FilterButton>

            <FilterButton
              href={buildStatsHref({
                userId:
                  selectedUserId,

                sort:
                  "count-asc",

                year:
                  selectedYear,

                month:
                  selectedMonth,
              })}
              active={
                sortMode ===
                "count-asc"
              }
            >
              ↑ Nejméně
            </FilterButton>

            <FilterButton
              href={buildStatsHref({
                userId:
                  selectedUserId,

                sort:
                  "name-asc",

                year:
                  selectedYear,

                month:
                  selectedMonth,
              })}
              active={
                sortMode ===
                "name-asc"
              }
            >
              A–Z
            </FilterButton>

            <FilterButton
              href={buildStatsHref({
                userId:
                  selectedUserId,

                sort:
                  "name-desc",

                year:
                  selectedYear,

                month:
                  selectedMonth,
              })}
              active={
                sortMode ===
                "name-desc"
              }
            >
              Z–A
            </FilterButton>
          </FilterGroup>
        </div>
      </section>

      {/* ==================================================
          AKTUÁLNÍ POHLED
      ================================================== */}

      <section
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "20px",

          flexWrap:
            "wrap",

          padding:
            "15px 18px",

          marginBottom:
            "25px",

          border:
            "1px solid rgba(231,166,47,0.15)",

          borderRadius:
            "var(--taste-radius-md)",

          background:
            "rgba(231,166,47,0.025)",
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
            Aktuální pohled
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "baseline",

              flexWrap:
                "wrap",

              gap:
                "6px 10px",
            }}
          >
            <strong
              style={{
                color:
                  "var(--taste-text)",

                fontSize:
                  "19px",
              }}
            >
              {
                selectedUserTitle
              }
            </strong>

            <span
              style={{
                color:
                  "var(--taste-text-muted)",
              }}
            >
              ·
            </span>

            <span
              style={{
                color:
                  "var(--taste-text-soft)",

                fontSize:
                  "14px",

                fontWeight:
                  600,
              }}
            >
              {
                periodTitle
              }
            </span>
          </div>
        </div>

        <div
          style={{
            color:
              "var(--taste-text-muted)",

            fontSize:
              "10px",
        }}
        >
          {
            getSortLabel(
              sortMode
            )
          }
        </div>
      </section>

      {/* ==================================================
          MAPA
      ================================================== */}

      {filteredTastings.length >
        0 && (
        <div
          style={{
            marginBottom:
              "30px",
          }}
        >
          <BeerWorldMap
            items={
              rawStats.countries
            }
          />
        </div>
      )}

      {/* ==================================================
          PRÁZDNÝ VÝBĚR
      ================================================== */}

      {filteredTastings.length ===
        0 && (
        <div
          className="taste-card"
          style={{
            padding:
              "32px",

            marginBottom:
              "26px",

            textAlign:
              "center",

            color:
              "var(--taste-text-muted)",

            fontSize:
              "13px",
          }}
        >
          Pro tento výběr
          zatím nejsou žádné
          ochutnávky.
        </div>
      )}

      {/* ==================================================
          ŽEBŘÍČKY
      ================================================== */}

      <section>
        <div
          style={{
            marginBottom:
              "15px",
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom:
                "5px",
            }}
          >
            Žebříčky
          </div>

          <h2
            style={{
              margin:
                0,

              fontSize:
                "24px",

              lineHeight:
                1.1,

              fontWeight:
                750,

              letterSpacing:
                "-0.025em",
            }}
          >
            Pivní přehled
          </h2>
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(330px, 1fr))",

            gap:
              "16px",

            alignItems:
              "start",
          }}
        >
          <FullRankingCard
            title="Piva"
            subtitle="Konkrétní ochutnaná piva"
            icon={
              <AppIcon
                name="label"
                size={20}
              />
            }
            items={
              stats.brands
            }
          />

          <FullRankingCard
            title="Pivovary"
            subtitle="Podle počtu vypitých piv"
            icon={
              <AppIcon
                name="brewery"
                size={20}
              />
            }
            items={
              stats.breweries
            }
          />

          <FullRankingCard
            title="Pivní styly"
            subtitle="Nejčastěji zastoupené styly"
            icon={
              <AppIcon
                name="hop"
                size={20}
              />
            }
            items={
              stats.styles
            }
          />

          <FullRankingCard
            title="Státy"
            subtitle="Země původu pivovarů"
            icon={
              <AppIcon
                name="globe"
                size={20}
              />
            }
            items={
              stats.countries
            }
          />

          <FullRankingCard
            title="Chmely"
            subtitle="Chmely použitých piv"
            icon={
              <AppIcon
                name="hop"
                size={20}
              />
            }
            items={
              stats.hops
            }
          />

          <FullRankingCard
            title="Podání / obal"
            subtitle="Podle počtu vypitých piv"
            icon={
              <AppIcon
                name="package"
                size={20}
              />
            }
            items={
              stats.packaging
            }
          />
        </div>
      </section>
    </main>
  );
}

// ==================================================
// PARAMETRY
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

function getStringParam(
  value:
    | string
    | string[]
    | undefined
) {
  return typeof value ===
    "string"
    ? value
    : undefined;
}

function getYear(
  dateString:
    | string
    | null
    | undefined
) {
  if (!dateString) {
    return null;
  }

  const year =
    Number(
      dateString.slice(
        0,
        4
      )
    );

  return Number.isInteger(
    year
  )
    ? year
    : null;
}

function getMonth(
  dateString:
    | string
    | null
    | undefined
) {
  if (!dateString) {
    return null;
  }

  const month =
    Number(
      dateString.slice(
        5,
        7
      )
    );

  if (
    !Number.isInteger(
      month
    ) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return month;
}

function getPeriodLabel(
  year?: number,
  month?: number
) {
  if (!year) {
    return "Celé období";
  }

  if (!month) {
    return String(year);
  }

  const monthData =
    MONTHS.find(
      (item) =>
        item.number ===
        month
    );

  return `${
    monthData?.name ??
    month
  } ${year}`;
}

function isSortMode(
  value:
    | string
    | undefined
): value is SortMode {
  return (
    value ===
      "count-desc" ||
    value ===
      "count-asc" ||
    value ===
      "name-asc" ||
    value ===
      "name-desc"
  );
}

function sortRanking(
  items: RankingItem[],
  sortMode: SortMode
) {
  const sorted =
    [...items];

  if (
    sortMode ===
    "count-desc"
  ) {
    return sorted.sort(
      (a, b) => {
        if (
          b.count !==
          a.count
        ) {
          return (
            b.count -
            a.count
          );
        }

        return a.name.localeCompare(
          b.name,
          "cs"
        );
      }
    );
  }

  if (
    sortMode ===
    "count-asc"
  ) {
    return sorted.sort(
      (a, b) => {
        if (
          a.count !==
          b.count
        ) {
          return (
            a.count -
            b.count
          );
        }

        return a.name.localeCompare(
          b.name,
          "cs"
        );
      }
    );
  }

  if (
    sortMode ===
    "name-desc"
  ) {
    return sorted.sort(
      (a, b) =>
        b.name.localeCompare(
          a.name,
          "cs"
        )
    );
  }

  return sorted.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        "cs"
      )
  );
}

function getSortLabel(
  sortMode: SortMode
) {
  if (
    sortMode ===
    "count-asc"
  ) {
    return "Řazeno od nejméně vypitých";
  }

  if (
    sortMode ===
    "name-asc"
  ) {
    return "Řazeno abecedně A–Z";
  }

  if (
    sortMode ===
    "name-desc"
  ) {
    return "Řazeno abecedně Z–A";
  }

  return "Řazeno od nejvíce vypitých";
}

function buildStatsHref({
  userId,
  sort,
  year,
  month,
}: {
  userId?: string;
  sort: SortMode;
  year?: number;
  month?: number;
}) {
  const params =
    new URLSearchParams();

  if (userId) {
    params.set(
      "user",
      userId
    );
  }

  if (
    sort !==
    "count-desc"
  ) {
    params.set(
      "sort",
      sort
    );
  }

  if (year) {
    params.set(
      "year",
      String(year)
    );
  }

  if (
    year &&
    month
  ) {
    params.set(
      "month",
      String(month)
    );
  }

  const query =
    params.toString();

  return query
    ? `/stats?${query}`
    : "/stats";
}

// ==================================================
// FILTRY
// ==================================================

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <div
        className="taste-label"
        style={{
          marginBottom:
            "9px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          gap:
            "7px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        minHeight:
          "33px",

        padding:
          "7px 11px",

        borderRadius:
          "999px",

        border:
          active
            ? "1px solid rgba(231,166,47,0.45)"
            : "1px solid var(--taste-border)",

        background:
          active
            ? "rgba(231,166,47,0.10)"
            : "rgba(255,255,255,0.015)",

        color:
          active
            ? "var(--taste-amber-bright)"
            : "var(--taste-text-soft)",

        textDecoration:
          "none",

        fontSize:
          "11px",

        fontWeight:
          active
            ? 700
            : 550,
      }}
    >
      {children}
    </Link>
  );
}

// ==================================================
// SOUHRNNÁ KARTA
// ==================================================

function SummaryCard({
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
          "16px 18px",

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
// ŽEBŘÍČEK
// ==================================================

function FullRankingCard({
  title,
  subtitle,
  icon,
  items,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: RankingItem[];
}) {
  const maximum =
    items.length > 0
      ? Math.max(
          ...items.map(
            (item) =>
              item.count
          )
        )
      : 1;

  return (
    <section
      style={{
        position:
          "relative",

        overflow:
          "hidden",

        padding:
          "20px",

        border:
          "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-lg)",

        background: `
          radial-gradient(
            circle at 100% 0%,
            rgba(231,166,47,0.055),
            transparent 13rem
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
            "center",

          gap:
            "10px",

          marginBottom:
            "3px",
        }}
      >
        <div
          style={{
            width:
              "34px",

            height:
              "34px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            flexShrink:
              0,

            border:
              "1px solid rgba(231,166,47,0.18)",

            borderRadius:
              "10px",

            background:
              "rgba(231,166,47,0.055)",

            color:
              "var(--taste-amber-bright)",

            fontSize:
              "15px",
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin:
              0,

            color:
              "var(--taste-text)",

            fontSize:
              "17px",

            fontWeight:
              750,

            letterSpacing:
              "-0.015em",
          }}
        >
          {title}
        </h3>
      </div>

      <div
        style={{
          marginLeft:
            "44px",

          marginBottom:
            "18px",

          color:
            "var(--taste-text-muted)",

          fontSize:
            "10px",
        }}
      >
        {subtitle}
      </div>

      {items.length ===
        0 && (
        <div
          style={{
            padding:
              "18px 0",

            color:
              "var(--taste-text-muted)",

            fontSize:
              "12px",
          }}
        >
          Zatím nejsou
          žádná data.
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
        {items.map(
          (
            item,
            index
          ) => {
            const percentage =
              maximum > 0
                ? Math.max(
                    5,
                    (
                      item.count /
                      maximum
                    ) * 100
                  )
                : 0;

            return (
              <div
                key={
                  item.id
                }
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "25px minmax(0,1fr) auto",

                    alignItems:
                      "center",

                    gap:
                      "8px",

                    marginBottom:
                      "6px",
                  }}
                >
                  <div
                    style={{
                      color:
                        index === 0
                          ? "var(--taste-amber)"
                          : "var(--taste-text-muted)",

                      fontSize:
                        "10px",

                      fontWeight:
                        700,
                    }}
                  >
                    {
                      index + 1
                    }.
                  </div>

                  <div
                    title={
                      item.name
                    }
                    style={{
                      minWidth:
                        0,

                      overflow:
                        "hidden",

                      textOverflow:
                        "ellipsis",

                      whiteSpace:
                        "nowrap",

                      color:
                        index === 0
                          ? "var(--taste-text)"
                          : "var(--taste-text-soft)",

                      fontSize:
                        "12px",

                      fontWeight:
                        index === 0
                          ? 700
                          : 550,
                    }}
                  >
                    {
                      item.name
                    }
                  </div>

                  <div
                    style={{
                      color:
                        "var(--taste-amber-bright)",

                      fontSize:
                        "11px",

                      fontWeight:
                        750,
                    }}
                  >
                    {
                      item.count
                    }
                    ×
                  </div>
                </div>

                <div
                  style={{
                    marginLeft:
                      "33px",

                    height:
                      "4px",

                    overflow:
                      "hidden",

                    borderRadius:
                      "999px",

                    background:
                      "rgba(255,255,255,0.045)",
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
                        index === 0
                          ? "var(--taste-amber-bright)"
                          : "rgba(231,166,47,0.62)",
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>

      {items.length > 0 && (
        <div
          style={{
            marginTop:
              "18px",

            paddingTop:
              "11px",

            borderTop:
              "1px solid rgba(231,166,47,0.08)",

            color:
              "var(--taste-text-muted)",

            fontSize:
              "9px",
          }}
        >
          Celkem položek:{" "}
          {
            items.length
          }
        </div>
      )}
    </section>
  );
}