import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import BreweryEditModalClient from "../BreweryEditModalClient";
import BreweryLogoManagerClient from "../BreweryLogoManagerClient";
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
import {
  findBreweryLogoCandidates,
  removeBreweryLogo,
  saveBreweryLogoCandidate,
} from "../logo-actions";

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
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
  const isCatalogAdmin = user.id === "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

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
        id, name, city, country, address, website, logo_url, is_nomadic,
        founded_year, closed_year, latitude, longitude,
        brewery_brands (
          brands ( id, name )
        ),
        beers (
          id, name, plato, abv, ibu, is_non_alcoholic,
          brands ( id, name ),
          beer_styles ( name ),
          beer_hops ( hops ( name ) ),
          beer_versions (
            id, version_year, is_current, plato, abv, ibu,
            beer_styles ( name ),
            beer_version_hops ( hops ( name ) )
          ),
          tastings ( id, user_id, tasted_on, quantity )
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
      const brand = one(beer.brands);
      const fallbackStyle = one(beer.beer_styles);
      const fallbackHopNames = (beer.beer_hops ?? [])
        .map((item: any) => one(item.hops)?.name)
        .filter(Boolean) as string[];

      const versions = beer.beer_versions ?? [];
      const currentVersion =
        versions.find((version: any) => version.is_current) ?? null;

      const currentStyle = currentVersion
        ? one(currentVersion.beer_styles)
        : null;

      const currentHopNames = currentVersion
        ? (currentVersion.beer_version_hops ?? [])
            .map((item: any) => one(item.hops)?.name)
            .filter(Boolean) as string[]
        : [];

      return {
        ...beer,
        brand,
        plato: currentVersion?.plato ?? beer.plato,
        abv: currentVersion?.abv ?? beer.abv,
        ibu: currentVersion?.ibu ?? beer.ibu,
        styleName: currentStyle?.name ?? fallbackStyle?.name ?? "",
        hopNames:
          currentHopNames.length > 0
            ? currentHopNames
            : fallbackHopNames,
        currentVersionId: currentVersion?.id ?? null,
        versionCount: versions.length,
        canEdit: isCatalogAdmin || (beer.tastings ?? []).some(
          (tasting: any) => tasting.user_id === user.id && tasting.tasted_on >= "2026-09-01"
        ),
      };
    })
    .sort((a: any, b: any) =>
      a.name.localeCompare(b.name, "cs", {
        sensitivity: "base",
      })
    );

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

  const linkedBrands = (brewery.brewery_brands ?? [])
    .map((row: any) => one(row.brands))
    .filter((brand: any): brand is { id: number; name: string } => Boolean(brand));
  const brandCount = new Set([
    ...linkedBrands.map((brand) => brand.id),
    ...breweryBeers
      .map((beer: any) => beer.brand?.id)
      .filter((brandId: unknown): brandId is number => typeof brandId === "number"),
  ]).size;

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
        breweryLogoUrl={brewery.logo_url}
        breweryLogoAlt={`Logo ${brewery.name}`}
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
          { icon: "🍺", value: breweryBeers.length, label: "Piv v katalogu" },
          { icon: "◆", value: brandCount, label: "Značek" },
          { icon: "✓", value: consumedBeerCount, label: "Vypitých piv" },
        ]}
      />

      <section className="taste-card" style={{ padding: "22px" }}>
        {isCatalogAdmin && (
          <div style={{ marginBottom: "20px", paddingBottom: "18px", borderBottom: "1px solid var(--taste-border)" }}>
            <BreweryLogoManagerClient
              breweryId={brewery.id}
              breweryName={brewery.name}
              website={brewery.website}
              initialLogoUrl={brewery.logo_url}
              findCandidatesAction={findBreweryLogoCandidates}
              saveCandidateAction={saveBreweryLogoCandidate}
              removeLogoAction={removeBreweryLogo}
            />
          </div>
        )}

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
              <div style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>
                {breweryBeers.length} {formatBeerCount(breweryBeers.length)} · {brandCount} {formatBrandCount(brandCount)}
              </div>
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
                    <div className="taste-label" style={{ marginBottom: "4px", fontSize: "8px" }}>Pivo</div>
                    <Link href={`/beers/${beer.id}`} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>
                      {beer.name}
                    </Link>
                    {beer.brand && (
                      <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px" }}>
                        <span style={{ marginRight: "5px" }}>Značka:</span>
                        <Link href={`/brands/${beer.brand.id}`} className="taste-entity-link" style={{ color: "var(--taste-amber-bright)", fontWeight: 700 }}>
                          {beer.brand.name}
                        </Link>
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                      {beer.is_non_alcoholic && <Badge>NEALKO</Badge>}
                      {beer.styleName && <span style={{ color: "var(--taste-text-soft)", fontSize: "10px", fontWeight: 650 }}>{beer.styleName}</span>}
                      {beer.plato != null && <Badge>{beer.plato} °P</Badge>}
                      {beer.abv != null && <Badge>{beer.abv} %</Badge>}
                      {beer.ibu != null && <Badge>IBU {beer.ibu}</Badge>}
                    </div>
                    {beer.hopNames.length > 0 && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "var(--taste-text-muted)",
                          fontSize: "10px",
                          lineHeight: 1.35,
                        }}
                      >
                        Chmely:{" "}
                        <span style={{ color: "#9cad47", fontWeight: 700 }}>
                          {beer.hopNames.join(", ")}
                        </span>
                      </div>
                    )}
                    {beer.versionCount > 1 && (
                      <div
                        style={{
                          marginTop: "7px",
                          color: "var(--taste-text-muted)",
                          fontSize: "9px",
                          opacity: 0.72,
                        }}
                      >
                        {formatVersionCount(beer.versionCount)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {beer.canEdit && (
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
                    )}
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

        {linkedBrands.length > 0 && (
          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label" style={{ marginBottom: "9px" }}>Značky pivovaru</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {linkedBrands.sort((a, b) => a.name.localeCompare(b.name, "cs")).map((brand) => (
                <Link key={brand.id} href={`/brands/${brand.id}`} className="taste-button-secondary" style={{ padding: "6px 9px", fontSize: "10px" }}>
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        )}

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

function formatVersionCount(count: number) {
  if (count === 1) return "1 verze";
  if (count >= 2 && count <= 4) return `${count} verze`;
  return `${count} verzí`;
}

function formatBeerCount(count: number) {
  return count === 1 ? "pivo" : count >= 2 && count <= 4 ? "piva" : "piv";
}

function formatBrandCount(count: number) {
  return count === 1 ? "značka" : count >= 2 && count <= 4 ? "značky" : "značek";
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
