import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { parseStatsDashboardPayload } from "@/lib/stats-dashboard";
import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import "../../stats-concept.css";
import RankingCardClient from "../../RankingCardClient";
import PackagingSummaryCard from "../../PackagingSummaryCard";
import HorizontalRankingScroller from "../../HorizontalRankingScroller";

type CountryStatsPageProps = {
  params: Promise<{
    country: string;
  }>;
};

export default async function CountryStatsPage({
  params,
}: CountryStatsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const routeParams = await params;
  const countryName = decodeURIComponent(routeParams.country).trim();

  if (!countryName) {
    notFound();
  }

  const [statsResult, catalogResult] =
    await Promise.all([
      supabase.rpc(
        "get_stats_dashboard",
        {
          p_current_user: user.id,
          p_selected_user: null,
          p_year: null,
          p_month: null,
          p_packaging: null,
          p_beer_id: null,
          p_brand_id: null,
          p_brewery_id: null,
          p_style_id: null,
          p_country: countryName,
          p_hop_id: null,
        }
      ),
      supabase.rpc(
        "get_country_catalog_metrics",
        {
          p_country: countryName,
        }
      ),
    ]);

  if (statsResult.error) {
    throw new Error(
      statsResult.error.message
    );
  }

  if (catalogResult.error) {
    throw new Error(
      catalogResult.error.message
    );
  }

  const dashboard =
    parseStatsDashboardPayload(
      statsResult.data
    );
  const catalogMetrics =
    parseCountryCatalogMetrics(
      catalogResult.data
    );

  if (
    catalogMetrics.breweries === 0 &&
    dashboard.primary.units === 0
  ) {
    notFound();
  }

  const stats =
    dashboard.primary.stats;
  const personalStats =
    dashboard.personal.stats;
  const tastingUnits =
    dashboard.primary.units;
  const tastedBeerCount =
    stats.beers.length;
  const activeBreweries =
    catalogMetrics.activeBreweries;
  const brandCount =
    catalogMetrics.brands;
  const breweryCount =
    catalogMetrics.breweries;

  return (
    <main
      className="taste-stats-concept taste-country-concept"
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow="Pivní země"
        imageUrl="/images/heroes/breweries.jpg"
        visualVariant="stats"
        title={`Pivní statistiky · ${countryName}`}
        subtitle={`Souhrnný pohled na pivovary, ochutnaná piva, značky, styly a chmely spojené se zemí ${countryName}.`}
        action={
          <Link
            href="/stats"
            className="taste-button-secondary"
            style={{ fontSize: "12px", fontWeight: 650 }}
          >
            ← Všechny statistiky
          </Link>
        }
        stats={[
          {
            icon: <HomeStatIcon kind="brewery" />,
            accent: "#f2b63f",
            value: breweryCount,
            label: "Pivovarů",
          },
          {
            icon: <HomeStatIcon kind="brewery" />,
            accent: "#9cad47",
            value: activeBreweries,
            label: "Aktivních",
          },
          {
            icon: <HomeStatIcon kind="mug" />,
            accent: "#e88835",
            value: tastedBeerCount,
            label: "Ochutnaných piv",
          },
          {
            icon: <HomeStatIcon kind="crest" />,
            accent: "#d65b42",
            value: brandCount,
            label: "Značek",
          },
        ]}
      />

      <section
        className="taste-card"
        style={{
          marginBottom: "18px",
          padding: "14px 17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="taste-label" style={{ marginBottom: "4px" }}>
            Ochutnávky
          </div>
          <div
            style={{
              color: "var(--taste-text)",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            {tastingUnits}× vypité pivo
          </div>
        </div>

        <Link
          href={`/breweries?focus=1&country=${encodeURIComponent(countryName)}`}
          style={{
            color: "var(--taste-amber-bright)",
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          Zobrazit pivovary země →
        </Link>
      </section>

      <section className="taste-stats-rankings">
        <div className="taste-stats-section-heading" style={{ marginBottom: "15px" }}>
          <div className="taste-label" style={{ marginBottom: "5px" }}>
            Detail země
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
            Pivní statistiky
          </h2>
        </div>

        <HorizontalRankingScroller>
          <RankingCardClient
            currentUserId={user.id}
            title="Piva"
            tone="gold"
            subtitle="Ochutnaná piva z této země"
            icon={<HomeStatIcon kind="mug" />}
            items={stats.beers}
            personalItemIds={personalStats.beers.map((item) => item.id)}
          />

          <RankingCardClient
            currentUserId={user.id}
            title="Značky"
            tone="honey"
            subtitle="Značky v ochutnávkách"
            icon={<HomeStatIcon kind="crest" />}
            items={stats.brands}
            itemHrefPrefix="/brands"
            personalItemIds={personalStats.brands.map((item) => item.id)}
          />

          <RankingCardClient
            currentUserId={user.id}
            title="Pivovary"
            tone="honey"
            subtitle="Ochutnávané pivovary"
            icon={<HomeStatIcon kind="brewery" />}
            items={stats.breweries}
            itemHrefPrefix="/breweries"
            personalItemIds={personalStats.breweries.map((item) => item.id)}
          />

          <RankingCardClient
            currentUserId={user.id}
            title="Pivní styly"
            tone="amber"
            subtitle="Styly zastoupené v této zemi"
            icon={<HomeStatIcon kind="hop" />}
            items={stats.styles}
            personalItemIds={personalStats.styles.map((item) => item.id)}
          />

          <RankingCardClient
            currentUserId={user.id}
            title="Chmely"
            tone="malt"
            subtitle="Dohledané chmely použitých piv"
            icon={<HomeStatIcon kind="hop" />}
            items={stats.hops}
            personalItemIds={personalStats.hops.map((item) => item.id)}
          />
        </HorizontalRankingScroller>
      </section>

      <PackagingSummaryCard
        items={stats.packaging}
        contextParams={{ country: countryName }}
      />
    </main>
  );
}


function parseCountryCatalogMetrics(
  value: unknown
) {
  const source =
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

  const breweries =
    Number(source.breweries);
  const activeBreweries =
    Number(source.activeBreweries);
  const brands =
    Number(source.brands);

  return {
    breweries:
      Number.isFinite(breweries)
        ? breweries
        : 0,
    activeBreweries:
      Number.isFinite(activeBreweries)
        ? activeBreweries
        : 0,
    brands:
      Number.isFinite(brands)
        ? brands
        : 0,
  };
}
