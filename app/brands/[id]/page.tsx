import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageHero from "@/components/ui/PageHero";
import PaginationControls from "@/components/ui/PaginationControls";
import { paginateItems, parsePositivePage } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag } from "@/lib/country-flags";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };
type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const pageParams = await searchParams;
  const brandId = Number(id);
  if (!Number.isInteger(brandId) || brandId < 1) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rawBrand, error } = await supabase
    .from("brands")
    .select("id, name, country, website, notes")
    .eq("id", brandId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!rawBrand) notFound();

  const { data: rawBeers, error: beersError } = await supabase
    .from("beers")
    .select(`
      id, name,
      beer_versions (
        id, is_current, version_year,
        breweries ( id, name, country )
      )
    `)
    .eq("brand_id", brandId)
    .order("name");
  if (beersError) throw new Error(beersError.message);

  const beers = (rawBeers ?? []) as unknown as Array<{
    id: number;
    name: string;
    beer_versions: Array<{
      id: number;
      is_current: boolean;
      version_year: number | null;
      breweries: Relation<{ id: number; name: string; country: string | null }>;
    }> | null;
  }>;

  const pagination = paginateItems(beers, parsePositivePage(pageParams.page));
  const beerIds = beers.map((beer) => beer.id);
  let totalQuantity = 0;
  let totalTastingCount = 0;

  if (beerIds.length > 0) {
    const { data: tastings, error: tastingsError } = await supabase
      .from("tastings")
      .select("id, quantity")
      .in("beer_id", beerIds);
    if (tastingsError) throw new Error(tastingsError.message);

    totalTastingCount = tastings?.length ?? 0;
    totalQuantity = (tastings ?? []).reduce((sum, row) => sum + (row.quantity ?? 1), 0);
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Značka"
        imageUrl="/images/heroes/breweries.jpg"
        title={rawBrand.name}
        subtitle="Produktová značka je v Pivníku oddělená od výrobního pivovaru. Díky tomu zůstává statisticky souvislá i při historické změně výrobce."
        action={<Link href="/stats" className="taste-button-secondary">← Co a jak pijeme</Link>}
        stats={[
          { icon: "◆", accent: "#d98945", value: beers.length, label: "Piv" },
          { icon: "●", accent: "#e88835", value: totalTastingCount, label: "Ochutnávek" },
          { icon: "◉", accent: "#f2b63f", value: totalQuantity, label: "Vypitých" },
          {
            icon: "◎",
            accent: "#9cad47",
            value: rawBrand.country ? (
              <Link
                href={`/breweries?focus=1&country=${encodeURIComponent(rawBrand.country)}`}
                className="taste-entity-link"
              >
                {getCountryFlag(rawBrand.country)} {rawBrand.country}
              </Link>
            ) : "—",
            label: "Původ značky",
          },
        ]}
      />

      <section style={{ marginBottom: "30px" }}>
        <div className="taste-label" style={{ marginBottom: "6px" }}>Portfolio</div>
        <h2 style={{ margin: "0 0 14px", fontSize: "24px" }}>Piva značky</h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {beers.length === 0 ? (
            <div className="taste-card" style={{ padding: "24px", color: "var(--taste-text-muted)" }}>Zatím bez piv.</div>
          ) : pagination.pageItems.map((beer) => {
            const versions = beer.beer_versions ?? [];
            const current = versions.find((version) => version.is_current) ?? null;
            const brewery = one(current?.breweries);

            return (
              <article key={beer.id} className="taste-card taste-glow-honey" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                  <Link href={`/beers/${beer.id}`} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "16px", fontWeight: 800 }}>
                    {beer.name}
                  </Link>
                  {brewery ? (
                    <Link href={`/breweries/${brewery.id}`} className="taste-entity-link" style={{ color: "var(--taste-text-muted)", fontSize: "11px" }}>
                      {brewery.name}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--taste-text-muted)", fontSize: "11px" }}>Pivovar neurčen</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <PaginationControls currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      </section>

      {(rawBrand.notes || rawBrand.website) && (
        <section className="taste-card" style={{ padding: "18px" }}>
          <div className="taste-label">O značce</div>
          {rawBrand.notes && <p style={{ color: "var(--taste-text-soft)", fontSize: "12px", lineHeight: 1.6 }}>{rawBrand.notes}</p>}
          {rawBrand.website && <a className="taste-entity-link" href={rawBrand.website} target="_blank" rel="noreferrer">Oficiální web ↗</a>}
        </section>
      )}
    </main>
  );
}
