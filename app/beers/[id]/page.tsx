import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageHero from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BeerDetailPage({ params }: Props) {
  const { id } = await params;
  const beerId = Number(id);
  if (!Number.isInteger(beerId) || beerId < 1) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rawBeer, error } = await supabase
    .from("beers")
    .select(`
      id, name, plato, abv, ibu, is_non_alcoholic,
      brands ( id, name ),
      breweries ( id, name, country ),
      beer_styles ( id, name ),
      beer_versions (
        id, version_year, valid_from, valid_to, plato, abv, ibu, is_current,
        breweries ( id, name, country ),
        beer_styles ( id, name ),
        beer_version_collaborators (
          display_order,
          breweries ( id, name, country )
        )
      )
    `)
    .eq("id", beerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!rawBeer) notFound();

  const beer = rawBeer as unknown as {
    id: number;
    name: string;
    plato: number | null;
    abv: number | null;
    ibu: number | null;
    is_non_alcoholic: boolean;
    brands: Relation<{ id: number; name: string }>;
    breweries: Relation<{ id: number; name: string; country: string | null }>;
    beer_styles: Relation<{ id: number; name: string }>;
    beer_versions: Array<{
      id: number;
      version_year: number | null;
      valid_from: string | null;
      valid_to: string | null;
      plato: number | null;
      abv: number | null;
      ibu: number | null;
      is_current: boolean;
      breweries: Relation<{ id: number; name: string; country: string | null }>;
      beer_styles: Relation<{ id: number; name: string }>;
      beer_version_collaborators: Array<{
        display_order: number;
        breweries: Relation<{ id: number; name: string; country: string | null }>;
      }> | null;
    }> | null;
  };

  const brand = one(beer.brands);
  const versions = (beer.beer_versions ?? []).map((version) => ({
    ...version,
    breweries: one(version.breweries),
    beer_styles: one(version.beer_styles),
    beer_version_collaborators: (version.beer_version_collaborators ?? [])
      .map((item) => ({ ...item, breweries: one(item.breweries) }))
      .sort((a, b) => a.display_order - b.display_order),
  }));
  const current = versions.find((version) => version.is_current) ?? null;
  const brewery = current?.breweries ?? one(beer.breweries);
  const style = current?.beer_styles ?? one(beer.beer_styles);

  const { data: tastingRows, error: tastingError } = await supabase
    .from("tastings")
    .select("quantity")
    .eq("beer_id", beerId);
  if (tastingError) throw new Error(tastingError.message);
  const quantity = (tastingRows ?? []).reduce((sum, row) => sum + (row.quantity ?? 1), 0);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Pivo"
        imageUrl="/images/heroes/catalog.jpg"
        title={beer.name}
        subtitle="Kanonický detail piva. Značka zůstává identitou produktu, zatímco výrobní pivovar se může mezi historickými verzemi měnit."
        action={<Link href="/stats" className="taste-button-secondary">← Statistiky</Link>}
        stats={[
          { icon: "◆", accent: "#d98945", value: brand?.name ?? "—", label: "Značka" },
          { icon: "●", accent: "#e88835", value: brewery?.name ?? "—", label: "Aktuální pivovar" },
          { icon: "◐", accent: "#9cad47", value: style?.name ?? "—", label: "Styl" },
          { icon: "◉", accent: "#f2b63f", value: quantity, label: "Vypitých" },
        ]}
      />

      <section className="taste-card taste-glow-honey" style={{ padding: "20px", marginBottom: "18px" }}>
        <div className="taste-label">Zařazení</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", marginTop: "12px", fontSize: "13px" }}>
          {brand && <Link className="taste-entity-link" href={`/brands/${brand.id}`}>Značka: <strong>{brand.name}</strong></Link>}
          {brewery && <Link className="taste-entity-link" href={`/breweries/${brewery.id}`}>Pivovar: <strong>{brewery.name}</strong></Link>}
          {style && <Link className="taste-entity-link" href={`/styles/${style.id}`}>Styl: <strong>{style.name}</strong></Link>}
          {beer.is_non_alcoholic && <span style={{ padding: "3px 8px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "10px", fontWeight: 800 }}>NEALKO</span>}
        </div>
      </section>

      <section>
        <div className="taste-label" style={{ marginBottom: "6px" }}>Historie produktu</div>
        <h2 style={{ margin: "0 0 14px", fontSize: "24px" }}>Verze piva</h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {versions.length === 0 ? (
            <div className="taste-card" style={{ padding: "24px", color: "var(--taste-text-muted)" }}>Zatím bez verzí.</div>
          ) : versions
            .sort((a, b) => Number(b.is_current) - Number(a.is_current) || (b.version_year ?? 9999) - (a.version_year ?? 9999))
            .map((version) => (
              <article key={version.id} className={version.is_current ? "taste-card taste-glow-gold" : "taste-card"} style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <strong>{version.is_current ? "Aktuální verze" : version.version_year ? `Verze ${version.version_year}` : "Historická verze"}</strong>
                  <span style={{ color: "var(--taste-text-muted)", fontSize: "11px" }}>
                    {[version.plato != null ? `${version.plato} °P` : null, version.abv != null ? `${version.abv} %` : null, version.ibu != null ? `IBU ${version.ibu}` : null].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div style={{ marginTop: "7px", color: "var(--taste-text-soft)", fontSize: "12px" }}>
                  {version.breweries ? <Link className="taste-entity-link" href={`/breweries/${version.breweries.id}`}>{version.breweries.name}</Link> : "Pivovar neurčen"}
                  {version.beer_version_collaborators
                    .filter((item) => item.breweries)
                    .map((item) => (
                      <span key={item.breweries!.id} style={{ marginLeft: "5px", fontSize: "10px" }}>
                        + <Link className="taste-entity-link" href={`/breweries/${item.breweries!.id}`}>{item.breweries!.name}</Link>
                      </span>
                    ))}
                  {version.beer_styles ? <> · <Link className="taste-entity-link" href={`/styles/${version.beer_styles.id}`}>{version.beer_styles.name}</Link></> : null}
                </div>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
