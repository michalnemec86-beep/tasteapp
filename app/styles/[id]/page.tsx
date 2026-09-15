import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import PaginationControls from "@/components/ui/PaginationControls";
import { paginateItems, parsePositivePage } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };
type Relation<T> = T | T[] | null;
function one<T>(value: Relation<T> | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

export default async function StyleDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const styleId = Number(id);
  if (!Number.isInteger(styleId) || styleId < 1) notFound();
  const pageParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: style, error: styleError } = await supabase.from("beer_styles").select("id, name, aliases").eq("id", styleId).maybeSingle();
  if (styleError) throw new Error(styleError.message);
  if (!style) notFound();

  const { data: versions, error: versionsError } = await supabase.from("beer_versions").select("id, beer_id").eq("style_id", styleId);
  if (versionsError) throw new Error(versionsError.message);
  const versionIds = (versions ?? []).map((item) => item.id);
  const versionBeerIds = (versions ?? []).map((item) => item.beer_id);
  const { data: currentBeers, error: currentBeersError } = await supabase.from("beers").select("id").eq("style_id", styleId);
  if (currentBeersError) throw new Error(currentBeersError.message);
  const beerIds = Array.from(new Set([...(currentBeers ?? []).map((item) => item.id), ...versionBeerIds]));

  let beers: Array<{ id: number; name: string; is_non_alcoholic: boolean; brands: Relation<{ id: number; name: string }>; breweries: Relation<{ id: number; name: string }> }> = [];
  if (beerIds.length > 0) {
    const { data, error } = await supabase.from("beers").select("id, name, is_non_alcoholic, brands ( id, name ), breweries ( id, name )").in("id", beerIds).order("name");
    if (error) throw new Error(error.message);
    beers = (data ?? []) as unknown as typeof beers;
  }

  let totalQuantity = 0;
  if (versionIds.length > 0) {
    const { data: tastingRows, error: tastingError } = await supabase.from("tastings").select("quantity").in("beer_version_id", versionIds);
    if (tastingError) throw new Error(tastingError.message);
    totalQuantity = (tastingRows ?? []).reduce((sum, row) => sum + (row.quantity ?? 1), 0);
  }

  const pagination = paginateItems(beers, parsePositivePage(pageParams.page));
  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero eyebrow="Pivní styl" imageUrl="/images/heroes/catalog.jpg" visualVariant="catalog" title={style.name} subtitle={style.aliases?.length ? "Také: " + style.aliases.join(", ") : "Piva evidovaná v tomto stylu."} action={<Link href="/stats" className="taste-button-secondary">← Statistiky</Link>} stats={[{ icon: "◆", accent: "#9cad47", value: beers.length, label: "Piv" }, { icon: "◉", accent: "#f2b63f", value: totalQuantity, label: "Vypitých" }]} />
      <section style={{ marginTop: "24px" }}>
        <div className="taste-label" style={{ marginBottom: "6px" }}>Evidence stylu</div>
        <h2 style={{ margin: "0 0 14px", fontSize: "24px" }}>Piva stylu {style.name}</h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {pagination.pageItems.length === 0 ? <div className="taste-card" style={{ padding: "24px", color: "var(--taste-text-muted)" }}>Zatím bez piv.</div> : pagination.pageItems.map((beer) => {
            const brand = one(beer.brands);
            const brewery = one(beer.breweries);
            return <article key={beer.id} className="taste-card taste-glow-hop" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <Link href={"/beers/" + beer.id} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "16px", fontWeight: 800 }}>{beer.name}</Link>
                  {beer.is_non_alcoholic && <span style={{ padding: "3px 7px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "9px", fontWeight: 800 }}>NEALKO</span>}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px" }}>
                  {brand && <Link href={"/brands/" + brand.id} className="taste-entity-link" style={{ color: "var(--taste-text-muted)" }}>{brand.name}</Link>}
                  {brewery && <Link href={"/breweries/" + brewery.id} className="taste-entity-link" style={{ color: "var(--taste-text-muted)" }}>{brewery.name}</Link>}
                </div>
              </div>
            </article>;
          })}
        </div>
        <PaginationControls currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      </section>
    </main>
  );
}
