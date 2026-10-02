import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

export default async function BeerCatalogPage({ searchParams }: { searchParams: Promise<{ style?: string; hop?: string; q?: string; beer?: string }> }) {
  const selection = await searchParams;
  const beerId = selection.beer ? Number(selection.beer) : null;
  const styleId = selection.style ? Number(selection.style) : null;
  const hopId = selection.hop ? Number(selection.hop) : null;
  if ([styleId, hopId, beerId].some(id => id !== null && (!Number.isSafeInteger(id) || id < 1))) notFound();
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

  let beers: BeerCatalogItem[] = rows.map((raw) => {
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
      styleIds: [...new Set([one(beer.beer_styles)?.id, ...(beer.beer_versions ?? []).map(version => one(version.beer_styles)?.id)].filter((id): id is number => Boolean(id)))],
      hopIds: [...new Set([...(beer.beer_hops ?? []), ...(beer.beer_versions ?? []).flatMap(version => version.beer_version_hops ?? [])].map(row => one(row.hops)?.id).filter((id): id is number => Boolean(id)))],
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

  let selectionName = "";
  if (styleId || hopId) {
    const { data: entity, error } = await supabase.from(styleId ? "beer_styles" : "hops")
      .select("id, name").eq("id", styleId ?? hopId!).maybeSingle();
    if (error) throw new Error(error.message);
    if (!entity) notFound();
    selectionName = entity.name;
    beers = beers.filter(beer => (!styleId || beer.styleIds.includes(styleId)) && (!hopId || beer.hopIds.includes(hopId)));
  }
  if (beerId) beers = beers.filter(beer => beer.id === beerId);
  const breweryCount = new Set(beers.map(beer => beer.brewery?.id).filter(Boolean)).size;
  const countryCount = new Set(beers.map(beer => beer.brewery?.country).filter(Boolean)).size;
  const tastedCount = beers.filter((beer) => beer.totalQuantity > 0).length;
  const myCount = beers.filter((beer) => beer.myQuantity > 0).length;

  return (
    <main className="taste-beer-menu-concept" style={{ maxWidth: "1500px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Katalog piv"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={selectionName ? `${styleId ? "Pivní styl" : "Chmel"}: ${selectionName}` : "Pivní lístek"}
        subtitle={selectionName ? "Evidovaná piva včetně historických verzí." : "Všechna piva evidovaná v aplikaci na jednom místě."}
        action={selectionName ? <Link href="/beers" className="taste-button-secondary">Všechna piva</Link> : undefined}
        statsScrollable
        stats={[
          { icon: <HomeStatIcon kind="mug" />, value: beers.length, label: "Všech piv", accent: "#f2b63f" },
          { icon: <HomeStatIcon kind="barrel" />, value: selectionName ? breweryCount : tastedCount, label: selectionName ? "Pivovarů" : "Ochutnaných", accent: "#e88835" },
          { icon: <HomeStatIcon kind="hop" />, value: selectionName ? countryCount : myCount, label: selectionName ? "Států" : "Moje piva", accent: "#9cad47" },
        ]}
      />

      <BeerCatalogClient
        key={`${styleId ?? ""}-${hopId ?? ""}-${beerId ?? ""}`}
        initialShowAll={Boolean(selectionName || selection.q || beerId)}
        initialSearch={selection.q ?? ""}
        selectedStyleId={styleId}
        selectedHopId={hopId}
        beers={beers}
        adminView={await isAdminView(user.id)}
      />
    </main>
  );
}
