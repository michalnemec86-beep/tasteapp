import { redirect } from "next/navigation";

import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import "./beers-concept.css";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { getBeerReferenceStatus } from "@/lib/referenceStatus";
import { isAdminView } from "@/lib/adminView";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";

import BeerCatalogClient, { type BeerCatalogItem } from "./BeerCatalogClient";

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BeerCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const rows = await fetchAllRows((from, to) => supabase
      .from("beers")
      .select(`
        id, name, plato, abv, ibu, is_non_alcoholic, is_catalog, portfolio_status,
        brands ( id, name ),
        breweries ( id, name, country, closed_year ),
        beer_styles ( id, name ),
        beer_hops ( hops ( id, name ) ),
        beer_versions (
          id, is_current, plato, abv, ibu,
          breweries!beer_versions_brewery_id_fkey ( id, name, country ),
          beer_styles ( id, name ),
          beer_version_hops ( hops ( id, name ) )
        ),
        tastings ( id, user_id, quantity )
      `)
      .order("name", { ascending: true })
      .order("id")
      .range(from, to), 1000);

  const beers: BeerCatalogItem[] = rows.map((raw) => {
    const beer = raw as {
      id: number;
      name: string;
      plato: number | null;
      abv: number | null;
      ibu: number | null;
      is_non_alcoholic: boolean | null;
      is_catalog: boolean | null;
      portfolio_status: string | null;
      brands: Relation<{ id: number; name: string }>;
      breweries: Relation<{ id: number; name: string; country: string | null; closed_year: number | null }>;
      beer_styles: Relation<{ id: number; name: string }>;
      beer_hops: Array<{ hops: Relation<{ id: number; name: string }> }> | null;
      beer_versions: Array<{
        id: number;
        is_current: boolean;
        plato: number | null;
        abv: number | null;
        ibu: number | null;
        breweries: Relation<{ id: number; name: string; country: string | null; closed_year: number | null }>;
        beer_styles: Relation<{ id: number; name: string }>;
        beer_version_hops: Array<{ hops: Relation<{ id: number; name: string }> }> | null;
      }> | null;
      tastings: Array<{ id: number; user_id: string; quantity: number | null }> | null;
    };

    const current = beer.beer_versions?.find((version) => version.is_current) ?? null;
    const brewery = one(current?.breweries) ?? one(beer.breweries);
    const identityBrewery = one(beer.breweries);
    const style = one(current?.beer_styles) ?? one(beer.beer_styles);
    const hopRows = current ? current.beer_version_hops ?? [] : beer.beer_hops ?? [];
    const hops = hopRows
      .map((row) => one(row.hops))
      .filter((hop): hop is { id: number; name: string } => Boolean(hop));
    const tastings = beer.tastings ?? [];

    const brand = one(beer.brands);
    const referenceStatus = getBeerReferenceStatus({
      name: beer.name,
      brandId: brand?.id ?? null,
      breweryId: brewery?.id ?? null,
      styleId: style?.id ?? null,
      plato: current?.plato ?? beer.plato,
      abv: current?.abv ?? beer.abv,
    });

    return {
      id: beer.id,
      name: beer.name,
      brand,
      brewery,
      style,
      plato: current?.plato ?? beer.plato,
      abv: current?.abv ?? beer.abv,
      ibu: current?.ibu ?? beer.ibu,
      isNonAlcoholic: Boolean(beer.is_non_alcoholic),
      canTaste: Boolean(brand && identityBrewery) &&
        isBeerAvailableForTasting(beer.portfolio_status, identityBrewery?.closed_year),
      hops,
      totalQuantity: tastings.reduce((sum, tasting) => sum + (tasting.quantity ?? 1), 0),
      myQuantity: tastings
        .filter((tasting) => tasting.user_id === user.id)
        .reduce((sum, tasting) => sum + (tasting.quantity ?? 1), 0),
      referenceReady: referenceStatus.ready,
      referenceMissing: referenceStatus.missing,
    };
  }).sort((a, b) => Number(b.referenceReady) - Number(a.referenceReady) || a.name.localeCompare(b.name, "cs", { sensitivity: "base" }));

  const tastedCount = beers.filter((beer) => beer.totalQuantity > 0).length;
  const myCount = beers.filter((beer) => beer.myQuantity > 0).length;

  return (
    <main className="taste-beer-menu-concept" style={{ maxWidth: "1500px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Katalog piv"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title="Pivní lístek"
        subtitle="Všechna piva evidovaná v aplikaci na jednom místě."
        statsScrollable
        stats={[
          { icon: <HomeStatIcon kind="mug" />, value: beers.length, label: "Všech piv", accent: "#f2b63f" },
          { icon: <HomeStatIcon kind="barrel" />, value: tastedCount, label: "Ochutnaných", accent: "#e88835" },
          { icon: <HomeStatIcon kind="hop" />, value: myCount, label: "Moje piva", accent: "#9cad47" },
        ]}
      />

      <BeerCatalogClient
        beers={beers}
        adminView={await isAdminView(user.id)}
      />
    </main>
  );
}
