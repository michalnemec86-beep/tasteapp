import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildTasteStats } from "@/lib/stats";
import { normalizeCountryName } from "@/lib/country-flags";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import RankingCardClient from "../../RankingCardClient";
import PackagingSummaryCard from "../../PackagingSummaryCard";

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

  const normalizedCountry = normalizeCountryName(countryName);

  const [breweriesResult, tastingsResult] = await Promise.all([
    supabase
      .from("breweries")
      .select(`
        id,
        name,
        country,
        closed_year,
        logo_url,
        beers (
          id,
          brands (
            id,
            name
          )
        )
      `)
      .order("name"),
    supabase
      .from("tastings")
      .select(`
        id,
        user_id,
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
      .order("tasted_on", { ascending: false }),
  ]);

  if (breweriesResult.error) {
    throw new Error(breweriesResult.error.message);
  }

  if (tastingsResult.error) {
    throw new Error(tastingsResult.error.message);
  }

  const countryBreweries = (breweriesResult.data ?? []).filter(
    (brewery) =>
      normalizeCountryName(brewery.country ?? "") === normalizedCountry
  );

  const allTastings = (tastingsResult.data ?? []).map((tasting) => {
    const beer = singleRelation(tasting.beers);
    const beerVersion = singleRelation(tasting.beer_versions);

    return {
      ...tasting,
      beer_versions: beerVersion
        ? {
            ...beerVersion,
            breweries: singleRelation(beerVersion.breweries),
            beer_styles: singleRelation(beerVersion.beer_styles),
            beer_version_hops: (beerVersion.beer_version_hops ?? []).map(
              (versionHop) => ({
                ...versionHop,
                hops: singleRelation(versionHop.hops),
              })
            ),
          }
        : null,
      beers: beer
        ? {
            ...beer,
            brands: singleRelation(beer.brands),
            breweries: singleRelation(beer.breweries),
            beer_styles: singleRelation(beer.beer_styles),
            beer_hops: (beer.beer_hops ?? []).map((beerHop) => ({
              ...beerHop,
              hops: singleRelation(beerHop.hops),
            })),
          }
        : null,
    };
  });

  const countryTastings = allTastings.filter((tasting) => {
    const brewery =
      tasting.beer_versions?.breweries ??
      tasting.beers?.breweries;

    return (
      normalizeCountryName(brewery?.country ?? "") === normalizedCountry
    );
  });

  if (countryBreweries.length === 0 && countryTastings.length === 0) {
    notFound();
  }

  const stats = buildTasteStats(countryTastings);
  const personalStats = buildTasteStats(countryTastings, user.id);

  const tastingUnits = countryTastings.reduce(
    (sum, tasting) => sum + (tasting.quantity ?? 1),
    0
  );

  const tastedBeerIds = new Set(
    countryTastings
      .map((tasting) => tasting.beers?.id)
      .filter((id): id is number => id != null)
  );

  const activeBreweries = countryBreweries.filter(
    (brewery) => brewery.closed_year == null
  ).length;

  const brandIds = new Set<number>();

  for (const brewery of countryBreweries) {
    for (const beer of brewery.beers ?? []) {
      const brand = singleRelation(beer.brands);
      if (brand?.id != null) {
        brandIds.add(brand.id);
      }
    }
  }

  return (
    <main
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
            icon: <AppIcon name="brewery" size={18} />,
            accent: "#f2b63f",
            value: countryBreweries.length,
            label: "Pivovarů",
          },
          {
            icon: "●",
            accent: "#9cad47",
            value: activeBreweries,
            label: "Aktivních",
          },
          {
            icon: <AppIcon name="beer" size={18} />,
            accent: "#e88835",
            value: tastedBeerIds.size,
            label: "Ochutnaných piv",
          },
          {
            icon: "◆",
            accent: "#d65b42",
            value: brandIds.size,
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

      <PackagingSummaryCard items={stats.packaging} />

      <section>
        <div style={{ marginBottom: "15px" }}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <RankingCardClient
            title="Piva"
            tone="gold"
            subtitle="Ochutnaná piva z této země"
            icon={<AppIcon name="beer" size={20} />}
            items={stats.beers}
            personalItemIds={personalStats.beers.map((item) => item.id)}
          />

          <RankingCardClient
            title="Značky"
            tone="honey"
            subtitle="Značky v ochutnávkách"
            icon={<AppIcon name="label" size={20} />}
            items={stats.brands}
            itemHrefPrefix="/brands"
            personalItemIds={personalStats.brands.map((item) => item.id)}
          />

          <RankingCardClient
            title="Pivovary"
            tone="honey"
            subtitle="Ochutnávané pivovary"
            icon={<AppIcon name="brewery" size={20} />}
            items={stats.breweries}
            itemHrefPrefix="/breweries"
            personalItemIds={personalStats.breweries.map((item) => item.id)}
          />

          <RankingCardClient
            title="Pivní styly"
            tone="amber"
            subtitle="Styly zastoupené v této zemi"
            icon={<AppIcon name="hop" size={20} />}
            items={stats.styles}
            personalItemIds={personalStats.styles.map((item) => item.id)}
          />

          <RankingCardClient
            title="Chmely"
            tone="malt"
            subtitle="Dohledané chmely použitých piv"
            icon={<AppIcon name="hop" size={20} />}
            items={stats.hops}
            personalItemIds={personalStats.hops.map((item) => item.id)}
          />
        </div>
      </section>
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
