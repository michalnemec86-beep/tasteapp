import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { getBrandHref } from "@/lib/entity-navigation";

/** Resolve a brand to its brewery. Multiple real producers require an explicit choice. */
export default async function BrandRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brandId = Number(id);
  if (!Number.isSafeInteger(brandId) || brandId < 1) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [brandResult, links, beers] = await Promise.all([
    supabase.from("brands").select("id, name").eq("id", brandId).maybeSingle(),
    fetchAllRows((from, to) => supabase.from("brewery_brands").select("brewery_id, breweries(id, name, closed_year)").eq("brand_id", brandId).order("brewery_id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("beers").select("id, portfolio_status, breweries(id, name, closed_year)").eq("brand_id", brandId).order("id").range(from, to)),
  ]);
  if (brandResult.error) throw new Error(brandResult.error.message);
  if (!brandResult.data) notFound();
  const single = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value;
  const linked = links.flatMap(row => { const brewery = single(row.breweries); return brewery ? [brewery] : []; });
  const producers = beers.flatMap(row => { const brewery = single(row.breweries); return brewery ? [brewery] : []; });
  const candidates = [...new Map([...linked, ...producers].map(brewery => [brewery.id, brewery])).values()];
  const active = candidates.filter(brewery => brewery.closed_year == null);
  const choices = active.length ? active : candidates;
  if (choices.length === 1) redirect(getBrandHref(brandId, choices[0].id));

  return <main style={{ maxWidth: "900px", margin: "0 auto", padding: "34px 24px 80px" }}>
    <h1>Pivovary značky {brandResult.data.name}</h1>
    <p>{choices.length ? "Značka je evidovaná u více pivovarů. Vyber pivovar." : "Značka zatím nemá přiřazený pivovar."}</p>
    <div style={{ display: "grid", gap: "12px" }}>{choices.sort((a,b) => a.name.localeCompare(b.name,"cs")).map(brewery =>
      <Link key={brewery.id} href={getBrandHref(brandId, brewery.id)} className="taste-card taste-entity-link" style={{ padding: "18px" }}>{brewery.name}</Link>
    )}</div>
    <Link href="/beers" className="taste-button-secondary" style={{ display: "inline-flex", marginTop: "20px" }}>Pivní lístek</Link>
  </main>;
}
