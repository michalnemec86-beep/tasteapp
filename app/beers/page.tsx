import { redirect } from "next/navigation";

import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";
import { createClient } from "@/lib/supabase/server";
import { getBeerReferenceStatus } from "@/lib/referenceStatus";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";

import BeerCatalogClient, { type BeerCatalogItem } from "./BeerCatalogClient";
import { confirmCatalogBeer } from "./actions";

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

  const rows: Array<Record<string, unknown>> = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("beers")
      .select(`
        id, name, plato, abv, ibu, is_non_alcoholic, is_catalog,
        brands ( id, name ),
        breweries ( id, name, country ),
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
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []) as unknown as Array<Record<string, unknown>>;
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  const beers: BeerCatalogItem[] = rows.map((raw) => {
    const beer = raw as {
      id: number;
      name: string;
      plato: number | null;
      abv: number | null;
      ibu: number | null;
      is_non_alcoholic: boolean | null;
      is_catalog: boolean | null;
      brands: Relation<{ id: number; name: string }>;
      breweries: Relation<{ id: number; name: string; country: string | null }>;
      beer_styles: Relation<{ id: number; name: string }>;
      beer_hops: Array<{ hops: Relation<{ id: number; name: string }> }> | null;
      beer_versions: Array<{
        id: number;
        is_current: boolean;
        plato: number | null;
        abv: number | null;
        ibu: number | null;
        breweries: Relation<{ id: number; name: string; country: string | null }>;
        beer_styles: Relation<{ id: number; name: string }>;
        beer_version_hops: Array<{ hops: Relation<{ id: number; name: string }> }> | null;
      }> | null;
      tastings: Array<{ id: number; user_id: string; quantity: number | null }> | null;
    };

    const current = beer.beer_versions?.find((version) => version.is_current) ?? null;
    const brewery = one(current?.breweries) ?? one(beer.breweries);
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
      isCatalog: beer.is_catalog,
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
      isCatalog: Boolean(beer.is_catalog),
      hops,
      totalQuantity: tastings.reduce((sum, tasting) => sum + (tasting.quantity ?? 1), 0),
      myQuantity: tastings
        .filter((tasting) => tasting.user_id === user.id)
        .reduce((sum, tasting) => sum + (tasting.quantity ?? 1), 0),
      referenceReady: referenceStatus.ready,
      referenceMissing: referenceStatus.missing,
    };
  }).sort((a, b) => Number(b.isCatalog) - Number(a.isCatalog) || a.name.localeCompare(b.name, "cs", { sensitivity: "base" }));

  const tastedCount = beers.filter((beer) => beer.totalQuantity > 0).length;
  const myCount = beers.filter((beer) => beer.myQuantity > 0).length;

  return (
    <main style={{ maxWidth: "1500px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Katalog piv"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title="Pivní lístek"
        subtitle="Všechna piva evidovaná v aplikaci na jednom místě."
        stats={[
          { icon: <AppIcon name="label" size={18} />, value: beers.length, label: "Všech piv", accent: "#f2b63f" },
          { icon: <AppIcon name="beer" size={18} />, value: tastedCount, label: "Ochutnaných", accent: "#e88835" },
          { icon: <AppIcon name="beer" size={18} />, value: myCount, label: "Moje piva", accent: "#9cad47" },
        ]}
      />

      <BeerCatalogClient
        beers={beers}
        isCatalogAdmin={isCatalogAdminUser(user.id)}
        adminView={await isAdminView(user.id)}
        confirmAction={confirmCatalogBeer}
      />
    </main>
  );
}
