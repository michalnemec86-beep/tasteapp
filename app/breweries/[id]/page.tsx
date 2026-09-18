import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import BreweryEditModalClient from "../BreweryEditModalClient";
import BreweryNameHistoryItemClient from "../BreweryNameHistoryItemClient";
import CatalogBeerCreateModalClient from "../CatalogBeerCreateModalClient";
import CatalogBeerEditModalClient from "../CatalogBeerEditModalClient";
import {
  addBreweryNameHistory,
  deleteBreweryNameHistory,
  updateBrewery,
  updateBreweryNameHistory,
} from "../actions";
import {
  createCatalogBeer,
  deleteCatalogBeer,
  updateCatalogBeer,
} from "../catalog-actions";

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeValue(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

function versionSignature(version: {
  styleName?: string | null;
  plato?: number | string | null;
  abv?: number | string | null;
  ibu?: number | string | null;
  hopNames?: string[];
}) {
  return JSON.stringify({
    style: version.styleName?.trim().toLocaleLowerCase("cs") ?? null,
    plato: normalizeValue(version.plato),
    abv: normalizeValue(version.abv),
    ibu: normalizeValue(version.ibu),
    hops: [...(version.hopNames ?? [])].map((item) => item.toLocaleLowerCase("cs")).sort(),
  });
}

function relationLabel(type: string, direction: "from" | "to") {
  if (type === "continues_as") return direction === "from" ? "Pokračuje jako" : "Navazuje na";
  if (type === "branches_into") return direction === "from" ? "Vznikl z něj" : "Vznikl z";
  if (type === "merges_into") return direction === "from" ? "Sloučil se do" : "Navazuje sloučením na";
  return "Historická vazba";
}

type Props = { params: Promise<{ id: string }> };

export default async function BreweryDetailPage({ params }: Props) {
  const { id } = await params;
  const breweryId = Number(id);
  if (!Number.isInteger(breweryId) || breweryId < 1) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [
    breweryResult,
    countriesResult,
    stylesResult,
    hopsResult,
    outgoingResult,
    incomingResult,
    asCollaboratorResult,
    asPrimaryResult,
  ] = await Promise.all([
    supabase
      .from("breweries")
      .select(`
        id, name, city, country, address, website, is_nomadic,
        founded_year, closed_year, latitude, longitude,
        beers (
          id, name, brand_id, plato, abv, ibu, is_non_alcoholic,
          beer_styles ( name ),
          beer_hops ( hops ( name ) ),
          beer_versions (
            id, version_year, is_current, plato, abv, ibu,
            beer_styles ( name ),
            beer_version_hops ( hops ( name ) )
          ),
          tastings ( id, quantity )
        ),
        brewery_name_history ( id, previous_name, from_year, changed_year )
      `)
      .eq("id", breweryId)
      .single(),
    supabase.from("countries").select("id, name").order("name"),
    supabase.from("beer_styles").select("id, name, aliases").order("name"),
    supabase.from("hops").select("id, name, aliases").order("name"),
    supabase.from("brewery_relations").select("id, from_brewery_id, to_brewery_id, relation_type, relation_year, note").eq("from_brewery_id", breweryId),
    supabase.from("brewery_relations").select("id, from_brewery_id, to_brewery_id, relation_type, relation_year, note").eq("to_brewery_id", breweryId),
    supabase
      .from("beer_version_collaborators")
      .select(`
        display_order,
        beer_versions (
          id, version_year, is_current,
          beers ( id, name ),
          breweries ( id, name )
        )
      `)
      .eq("brewery_id", breweryId),
    supabase
      .from("beer_version_collaborators")
      .select(`
        display_order,
        breweries ( id, name ),
        beer_versions!inner (
          id, version_year, is_current, brewery_id,
          beers ( id, name )
        )
      `)
      .eq("beer_versions.brewery_id", breweryId),
  ]);

  if (breweryResult.error || !breweryResult.data) notFound();
  for (const result of [countriesResult, stylesResult, hopsResult, outgoingResult, incomingResult, asCollaboratorResult, asPrimaryResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const brewery = breweryResult.data;
  const countries = countriesResult.data ?? [];
  const styles = stylesResult.data ?? [];
  const hops = hopsResult.data ?? [];

  const history = [...(brewery.brewery_name_history ?? [])].sort(
    (a, b) => (a.from_year ?? a.changed_year ?? Number.MAX_SAFE_INTEGER) - (b.from_year ?? b.changed_year ?? Number.MAX_SAFE_INTEGER)
  );
  const historyFromYear = history.reduce<number | null>((earliest, item) => {
    if (item.from_year == null) return earliest;
    return earliest == null || item.from_year < earliest ? item.from_year : earliest;
  }, null);

  const breweryBeers = (brewery.beers ?? [])
    .map((beer: any) => {
      const style = one(beer.beer_styles);
      const hopNames = (beer.beer_hops ?? [])
        .map((item: any) => one(item.hops)?.name)
        .filter(Boolean) as string[];

      const seen = new Set([
        versionSignature({ styleName: style?.name, plato: beer.plato, abv: beer.abv, ibu: beer.ibu, hopNames }),
      ]);

      const versionHistory = (beer.beer_versions ?? [])
        .filter((version: any) => !version.is_current)
        .map((version: any) => {
          const versionStyle = one(version.beer_styles);
          const versionHopNames = (version.beer_version_hops ?? [])
            .map((item: any) => one(item.hops)?.name)
            .filter(Boolean) as string[];
          return { ...version, styleName: versionStyle?.name ?? null, hopNames: versionHopNames };
        })
        .sort((a: any, b: any) => (b.version_year ?? 0) - (a.version_year ?? 0))
        .filter((version: any) => {
          const signature = versionSignature({ styleName: version.styleName, plato: version.plato, abv: version.abv, ibu: version.ibu, hopNames: version.hopNames });
          if (seen.has(signature)) return false;
          seen.add(signature);
          return true;
        });

      return { ...beer, styleName: style?.name ?? "", hopNames, versionHistory };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "cs", { sensitivity: "base" }));

  const consumedBeerCount = breweryBeers.reduce(
    (total: number, beer: any) =>
      total +
      (beer.tastings ?? []).reduce(
        (beerTotal: number, tasting: any) =>
          beerTotal + (tasting.quantity ?? 1),
        0
      ),
    0
  );

  const brandCount = new Set(
    breweryBeers
      .map((beer: any) => beer.brand_id)
      .filter((brandId: unknown): brandId is number =>
        typeof brandId === "number"
      )
  ).size;

  const relatedIds = Array.from(new Set([
    ...(outgoingResult.data ?? []).map((item) => item.to_brewery_id),
    ...(incomingResult.data ?? []).map((item) => item.from_brewery_id),
  ]));

  let relatedBreweries: Array<{ id: number; name: string }> = [];
  if (relatedIds.length > 0) {
    const relatedResult = await supabase.from("breweries").select("id, name").in("id", relatedIds);
    if (relatedResult.error) throw new Error(relatedResult.error.message);
    relatedBreweries = relatedResult.data ?? [];
  }
  const relatedMap = new Map(relatedBreweries.map((item) => [item.id, item]));
  const relationItems = [
    ...(outgoingResult.data ?? []).map((item) => ({ ...item, direction: "from" as const, relatedId: item.to_brewery_id })),
    ...(incomingResult.data ?? []).map((item) => ({ ...item, direction: "to" as const, relatedId: item.from_brewery_id })),
  ]
    .flatMap((item) => {
      const related = relatedMap.get(item.relatedId);
      return related ? [{ ...item, related }] : [];
    })
    .sort((a, b) => (a.relation_year ?? 0) - (b.relation_year ?? 0));

  const collaborations = [
    ...(asCollaboratorResult.data ?? []).flatMap((row: any) => {
      const version = one(row.beer_versions);
      const beer = version ? one((version as any).beers) : null;
      const primary = version ? one((version as any).breweries) : null;
      if (!version || !beer || !primary) return [];
      return [{ key: `collab-${(version as any).id}-${breweryId}`, versionYear: (version as any).version_year, beer, primary, collaborator: { id: brewery.id, name: brewery.name } }];
    }),
    ...(asPrimaryResult.data ?? []).flatMap((row: any) => {
      const version = one(row.beer_versions);
      const beer = version ? one((version as any).beers) : null;
      const collaborator = one(row.breweries);
      if (!version || !beer || !collaborator) return [];
      return [{ key: `primary-${(version as any).id}-${(collaborator as any).id}`, versionYear: (version as any).version_year, beer, primary: { id: brewery.id, name: brewery.name }, collaborator }];
    }),
  ].sort((a: any, b: any) => a.beer.name.localeCompare(b.beer.name, "cs", { sensitivity: "base" }));

  return (
    <main style={{ maxWidth: "1250px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <PageHero
        eyebrow="Detail pivovaru"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={brewery.name}
        subtitle={[brewery.city, brewery.country].filter(Boolean).join(" · ")}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Link href="/breweries" className="taste-button-secondary" style={{ fontSize: "12px", fontWeight: 650 }}>← Katalog pivovarů</Link>
            <BreweryEditModalClient
              brewery={{
                id: brewery.id,
                name: brewery.name,
                city: brewery.city,
                country: brewery.country,
                address: brewery.address,
                website: brewery.website,
                isNomadic: brewery.is_nomadic,
                foundedYear: brewery.founded_year,
                closedYear: brewery.closed_year,
                latitude: brewery.latitude,
                longitude: brewery.longitude,
              }}
              countries={countries}
              updateBreweryAction={updateBrewery}
              variant="primary"
            />
          </div>
        }
        stats={[
          { icon: "🍺", value: consumedBeerCount, label: "Vypitých piv" },
          { icon: "◆", value: brandCount, label: "Značek" },
        ]}
      />

      <section className="taste-card" style={{ padding: "22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "18px" }}>
          <DetailItem label="Město" value={brewery.city} />
          <DetailItem
            label="Stát"
            value={brewery.country ? (
              <Link
                href={`/breweries?focus=1&country=${encodeURIComponent(brewery.country)}`}
                className="taste-entity-link"
              >
                {brewery.country}
              </Link>
            ) : null}
          />
          <DetailItem label={brewery.is_nomadic ? "Typ pivovaru" : "Adresa"} value={brewery.is_nomadic ? "Letající pivovar" : brewery.address} />
          <DetailItem label="Web" value={brewery.website} />
          <DetailItem
            label="Rok založení"
            value={brewery.founded_year != null
              ? historyFromYear != null && historyFromYear < brewery.founded_year
                ? `${brewery.founded_year} (historie od ${historyFromYear})`
                : brewery.founded_year
              : historyFromYear != null ? `Historie od ${historyFromYear}` : null}
          />
          <DetailItem label="Ukončení provozu" value={brewery.closed_year} />
        </div>

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
            <div className="taste-label">Zaznamenaná piva</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <CatalogBeerCreateModalClient
                breweryName={brewery.name}
                styles={styles}
                hops={hops}
                createBeerAction={createCatalogBeer.bind(null, brewery.id)}
              />
              <div style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>{breweryBeers.length} {breweryBeers.length === 1 ? "pivo" : "piv"}</div>
            </div>
          </div>

          {breweryBeers.length > 0 ? (
            <div style={{ display: "grid" }}>
              {breweryBeers.map((beer: any, index: number) => (
                <div
                  key={beer.id}
                  style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: "14px", padding: "10px 0", borderBottom: index < breweryBeers.length - 1 ? "1px solid rgba(255,255,255,.055)" : "none" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/beers/${beer.id}`} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>
                      {beer.name}
                    </Link>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                      {beer.is_non_alcoholic && <Badge>NEALKO</Badge>}
                      {beer.styleName && <span style={{ color: "var(--taste-text-soft)", fontSize: "10px", fontWeight: 650 }}>{beer.styleName}</span>}
                      {beer.plato != null && <Badge>{beer.plato} °P</Badge>}
                      {beer.abv != null && <Badge>{beer.abv} %</Badge>}
                      {beer.ibu != null && <Badge>IBU {beer.ibu}</Badge>}
                    </div>
                    {beer.versionHistory.length > 0 && (
                      <div style={{ display: "grid", gap: "3px", marginTop: "7px" }}>
                        {beer.versionHistory.map((version: any) => {
                          const meta = [
                            version.styleName,
                            version.plato != null ? `${version.plato}°` : null,
                            version.abv != null ? `${version.abv} %` : null,
                            version.ibu != null ? `IBU ${version.ibu}` : null,
                            version.hopNames.length > 0 ? `Chmel: ${version.hopNames.join(", ")}` : null,
                          ].filter(Boolean);
                          return (
                            <div key={version.id} style={{ display: "flex", flexWrap: "wrap", gap: "4px", color: "var(--taste-text-muted)", fontSize: "9px", opacity: .72 }}>
                              <span style={{ minWidth: "34px", color: "var(--taste-text-soft)", fontWeight: 750 }}>{version.version_year ?? "dříve"}</span>
                              {meta.length > 0 && <span>{meta.join(" · ")}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CatalogBeerEditModalClient
                      breweryName={brewery.name}
                      beer={{
                        id: beer.id,
                        name: beer.name,
                        plato: beer.plato,
                        abv: beer.abv,
                        ibu: beer.ibu,
                        isNonAlcoholic: beer.is_non_alcoholic,
                        styleName: beer.styleName,
                        hopNames: beer.hopNames,
                        tastingCount: beer.tastings?.length ?? 0,
                      }}
                      styles={styles}
                      hops={hops}
                      updateBeerAction={updateCatalogBeer.bind(null, brewery.id, beer.id)}
                      deleteBeerAction={deleteCatalogBeer.bind(null, brewery.id, beer.id)}
                    />
                    <div style={{ color: "var(--taste-amber-bright)", fontSize: "11px", fontWeight: 750, whiteSpace: "nowrap" }}>
                      {(beer.tastings ?? []).reduce((sum: number, tasting: any) => sum + (tasting.quantity ?? 1), 0)}×
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--taste-text-muted)", fontSize: "12px" }}>Zatím není zaznamenané žádné pivo.</div>
          )}
        </div>

        {collaborations.length > 0 && (
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label" style={{ marginBottom: "10px" }}>Kolaborace</div>
            <div style={{ display: "grid", gap: "8px" }}>
              {collaborations.map((item: any) => (
                <div key={item.key} style={{ padding: "10px 12px", border: "1px solid var(--taste-border)", borderRadius: "10px", background: "rgba(255,255,255,.018)", fontSize: "11px" }}>
                  <Link href={`/breweries/${item.primary.id}`} className="taste-entity-link" style={{ fontWeight: 750 }}>{item.primary.name}</Link>
                  <span style={{ color: "var(--taste-text-muted)" }}> + </span>
                  <Link href={`/breweries/${item.collaborator.id}`} className="taste-entity-link">{item.collaborator.name}</Link>
                  <span style={{ color: "var(--taste-text-muted)" }}> · </span>
                  <Link href={`/beers/${item.beer.id}`} className="taste-entity-link">{item.beer.name}</Link>
                  {item.versionYear != null && <span style={{ marginLeft: "5px", color: "var(--taste-text-muted)", fontSize: "9px" }}>({item.versionYear})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {relationItems.length > 0 && (
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label" style={{ marginBottom: "10px" }}>Historické vazby</div>
            <div style={{ display: "grid", gap: "10px" }}>
              {relationItems.map((item) => (
                <div key={`${item.direction}-${item.id}`} style={{ padding: "11px 12px", border: "1px solid var(--taste-border)", borderRadius: "10px", background: "rgba(255,255,255,.018)", fontSize: "12px" }}>
                  <span style={{ color: "var(--taste-text-muted)" }}>{relationLabel(item.relation_type, item.direction)}: </span>
                  <Link href={`/breweries/${item.related.id}`} className="taste-entity-link" style={{ fontWeight: 700 }}>{item.related.name}</Link>
                  {item.relation_year != null && <span style={{ marginLeft: "5px", color: "var(--taste-text-muted)", fontSize: "10px" }}>({item.relation_year})</span>}
                  {item.note && <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px" }}>{item.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
          <div className="taste-label" style={{ marginBottom: "8px" }}>Historie názvů</div>

          {history.length > 0 ? (
            <div style={{ display: "grid", gap: "5px", marginBottom: "16px" }}>
              {history.map((item) => (
                <BreweryNameHistoryItemClient
                  key={item.id}
                  previousName={item.previous_name}
                  fromYear={item.from_year}
                  changedYear={item.changed_year}
                  updateAction={updateBreweryNameHistory.bind(null, brewery.id, item.id)}
                  deleteAction={deleteBreweryNameHistory.bind(null, brewery.id, item.id)}
                />
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr)", gap: "10px", color: "var(--taste-text)", fontSize: "13px", fontWeight: 700 }}>
                <span style={{ color: "var(--taste-amber-bright)" }}>{brewery.founded_year ?? history[history.length - 1]?.changed_year ?? "?"}–</span>
                <span>{brewery.name}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "16px", color: "var(--taste-text-muted)", fontSize: "12px" }}>Zatím není evidována žádná změna názvu.</div>
          )}

          <form action={addBreweryNameHistory.bind(null, brewery.id)} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end" }}>
            <SmallField label="Historický název" flex="1 1 240px"><input name="previousName" required style={smallInputStyle} /></SmallField>
            <SmallField label="Od roku" flex="0 1 125px"><input name="fromYear" type="number" min="1000" max="2100" style={smallInputStyle} /></SmallField>
            <SmallField label="Do roku" flex="0 1 145px"><input name="changedYear" type="number" min="1000" max="2100" style={smallInputStyle} /></SmallField>
            <button type="submit" className="taste-button-secondary" style={{ height: "38px", fontSize: "11px", whiteSpace: "nowrap" }}>+ Přidat historický název</button>
          </form>

          <form action={updateBrewery.bind(null, brewery.id)} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(231,166,47,.14)" }}>
            <input type="hidden" name="city" value={brewery.city ?? ""} />
            <input type="hidden" name="country" value={brewery.country ?? ""} />
            <input type="hidden" name="address" value={brewery.address ?? ""} />
            <input type="hidden" name="website" value={brewery.website ?? ""} />
            <input type="hidden" name="foundedYear" value={brewery.founded_year ?? ""} />
            <input type="hidden" name="closedYear" value={brewery.closed_year ?? ""} />
            <input type="hidden" name="latitude" value={brewery.latitude ?? ""} />
            <input type="hidden" name="longitude" value={brewery.longitude ?? ""} />
            {brewery.is_nomadic && <input type="hidden" name="isNomadic" value="on" />}
            <SmallField label="Současný název" flex="1 1 240px"><input value={brewery.name} readOnly style={{ ...smallInputStyle, color: "var(--taste-text-muted)", background: "rgba(255,255,255,.018)" }} /></SmallField>
            <SmallField label="Nový název" flex="1 1 240px"><input name="name" required defaultValue={brewery.name} style={smallInputStyle} /></SmallField>
            <button type="submit" className="taste-button-secondary" style={{ height: "38px", fontSize: "11px", whiteSpace: "nowrap" }}>Změnit název</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="taste-label" style={{ marginBottom: "5px" }}>{label}</div>
      <div style={{ color: value != null && value !== "" ? "var(--taste-text)" : "var(--taste-text-muted)", fontSize: "14px" }}>{value ?? "—"}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: "2px 6px", borderRadius: "999px", border: "1px solid var(--taste-border)", color: "var(--taste-text-muted)", fontSize: "9px", fontWeight: 700 }}>{children}</span>;
}

function SmallField({ label, flex, children }: { label: string; flex: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "5px", flex }}>
      <span style={{ color: "var(--taste-text-muted)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>{label}</span>
      {children}
    </label>
  );
}

const smallInputStyle = {
  width: "100%",
  height: "38px",
  boxSizing: "border-box" as const,
  padding: "0 11px",
  border: "1px solid var(--taste-border)",
  borderRadius: "9px",
  background: "var(--taste-surface)",
  color: "var(--taste-text)",
  fontSize: "12px",
  outline: "none",
};
