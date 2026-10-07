import { countryHref, beerHref, brandHref, styleHref, hopHref } from "@/lib/entity-navigation";
import Link from "next/link";
import BreweryFocus from "./BreweryFocus";
import FocusedBeerDetails from "./FocusedBeerDetails";
import { isBeerAvailableForTasting } from "@/lib/beerPortfolio";
import { notFound, redirect } from "next/navigation";
import "./brewery-detail.css";

import { loadBreweryPortfolio, type BreweryBeerIndex } from "@/lib/brewery-portfolio";
import { createClient } from "@/lib/supabase/server";
import { getBreweryReferenceStatus } from "@/lib/referenceStatus";
import {
  beerPortfolioStatusLabel,
} from "@/lib/beerPortfolio";
import PageHero from "@/components/ui/PageHero";
import { BreweryBrowseNavigation } from "@/components/navigation/BreweryBrowse";
import { withBreweryBrowse } from "@/lib/brewery-browse";
import ReferenceWarning from "@/components/ui/ReferenceWarning";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";
import BreweryCzechMapClient from "../BreweryCzechMapClient";
import BreweryEditModalClient from "../BreweryEditModalClient";
import BreweryBrandAddClient from "../BreweryBrandAddClient";
import BreweryBrandItemClient from "../BreweryBrandItemClient";
import BreweryLogoManagerClient from "../BreweryLogoManagerClient";
import BreweryNameHistoryItemClient from "../BreweryNameHistoryItemClient";
import CatalogBeerCreateModalClient from "../CatalogBeerCreateModalClient";
import CatalogBeerEditModalClient from "../CatalogBeerEditModalClient";
import {
  addBreweryBrand,
  deleteBreweryBrand,
  deleteBreweryNameHistory,
  updateBrewery,
  updateBreweryBrand,
  updateBreweryNameHistory,
} from "../actions";
import {
  createCatalogBeer,
  deleteCatalogBeer,
  updateCatalogBeer,
} from "../catalog-actions";
import {
  findBreweryLogoCandidates,
  inspectBreweryLogoUrl,
  removeBreweryLogo,
  saveBreweryLogoCandidate,
  saveBreweryLogoFromUrl,
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

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portfolio?: string | string[]; beer?: string; brand?: string; browse?: string }>;
};

export default async function BreweryDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const breweryId = Number(id);
  if (!Number.isInteger(breweryId) || breweryId < 1) notFound();

  const resolvedSearchParams = await searchParams;
  const focusedBeerId = /^[1-9]\d*$/.test(resolvedSearchParams.beer ?? "") ? Number(resolvedSearchParams.beer) : null;
  const focusedBrandId = /^[1-9]\d*$/.test(resolvedSearchParams.brand ?? "") ? Number(resolvedSearchParams.brand) : null;
  const requestedPortfolio =
    typeof resolvedSearchParams.portfolio === "string"
      ? resolvedSearchParams.portfolio
      : undefined;
  const portfolioFilter =
    focusedBeerId || focusedBrandId ? "all" : requestedPortfolio === "all" || requestedPortfolio === "historical"
      ? requestedPortfolio
      : "current";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const isCatalogAdmin = isCatalogAdminUser(user.id);
  const adminView = await isAdminView(user.id);

  const [
    breweryResult,
    countriesResult,
    stylesResult,
    hopsResult,
    outgoingResult,
    incomingResult,
    asCollaboratorResult,
    asPrimaryResult,
    commissionedResult,
  ] = await Promise.all([
    supabase
      .from("breweries")
      .select(`
        id, name, city, country, address, website, logo_url, is_nomadic,
        founded_year, closed_year, latitude, longitude,
        brewery_brands (
          brands ( id, name )
        ),
        beers ( id, portfolio_status, brands ( id, name ) ),
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
          breweries!beer_versions_brewery_id_fkey ( id, name )
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
    supabase
      .from("beer_versions")
      .select(`
        id, beer_id,
        beers!inner ( id, portfolio_status, brands ( id, name ) )
      `)
      .eq("is_current", true)
      .eq("brewed_for_brewery_id", breweryId),
  ]);

  if (breweryResult.error || !breweryResult.data) notFound();
  for (const result of [countriesResult, stylesResult, hopsResult, outgoingResult, incomingResult, asCollaboratorResult, asPrimaryResult, commissionedResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const brewery = breweryResult.data;
  const countries = countriesResult.data ?? [];
  const styles = stylesResult.data ?? [];
  const hops = hopsResult.data ?? [];

  const normalizedCountry = (brewery.country ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const isCzechBrewery = [
    "cesko",
    "ceska republika",
    "czechia",
    "czech republic",
  ].includes(normalizedCountry);

  const hasMapCoordinates =
    typeof brewery.latitude === "number" &&
    Number.isFinite(brewery.latitude) &&
    typeof brewery.longitude === "number" &&
    Number.isFinite(brewery.longitude);

  const breweryReferenceStatus = getBreweryReferenceStatus({
    name: brewery.name,
    country: brewery.country,
  });

  const history = [...(brewery.brewery_name_history ?? [])].sort(
    (a, b) => (a.from_year ?? a.changed_year ?? Number.MAX_SAFE_INTEGER) - (b.from_year ?? b.changed_year ?? Number.MAX_SAFE_INTEGER)
  );
  const historyFromYear = history.reduce<number | null>((earliest, item) => {
    if (item.from_year == null) return earliest;
    return earliest == null || item.from_year < earliest ? item.from_year : earliest;
  }, null);
  const currentNameFromYear = history.reduce<number | null>((latest, item) => {
    if (item.changed_year == null) return latest;
    return latest == null || item.changed_year > latest ? item.changed_year : latest;
  }, null) ?? brewery.founded_year;

  const commissionedBeers = (commissionedResult.data ?? []).flatMap((version: any) => {
    const beer = one<BreweryBeerIndex>(version.beers);
    return beer ? [{ ...beer, isCommissionedForThisBrewery: true }] : [];
  });
  const directBeerIds = new Set((brewery.beers ?? []).map(beer => beer.id));
  const breweryBeerRows = [
    ...(brewery.beers ?? []),
    ...commissionedBeers.filter(beer => !directBeerIds.has(beer.id)),
  ];
  const portfolio = await loadBreweryPortfolio(supabase, breweryBeerRows, {
    breweryId, closedYear: brewery.closed_year, userId: user.id,
    adminView: isCatalogAdmin && adminView,
    portfolio: portfolioFilter, beerId: focusedBeerId, brandId: focusedBrandId,
  });
  const { visibleBeers: visibleBreweryBeers, contextualIds, consumedBeerCount } = portfolio;
  const focusExists = visibleBreweryBeers.some(beer => beer.id === focusedBeerId);
  if (focusedBeerId && !focusExists) notFound();

  const linkedBrands: Array<{ id: number; name: string }> = [...new Map([
    ...(brewery.brewery_brands ?? []).map((row: any) => one(row.brands)),
    ...portfolio.brands, ...portfolio.contextBrands,
  ].filter(Boolean).map((brand: any) => [brand.id, brand] as const)).values()];
  const brandCount = linkedBrands.length;

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
    <main className="taste-brewery-detail-concept" style={{ maxWidth: "1250px", margin: "0 auto", padding: "34px 24px 80px" }}>
      <BreweryFocus target={focusExists ? `beer-${focusedBeerId}` : focusedBrandId ? `brand-${focusedBrandId}` : null} />
      <PageHero
        eyebrow="Detail pivovaru"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        breweryLogoUrl={brewery.logo_url}
        breweryLogoAlt={`Logo ${brewery.name}`}
        title={brewery.name}
        subtitle={[brewery.city, brewery.country].filter(Boolean).join(" · ")}
        action={
          <div className="taste-brewery-hero-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {adminView && !breweryReferenceStatus.ready && <ReferenceWarning missing={breweryReferenceStatus.missing} />}
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
              updateBreweryAction={updateBrewery}
              variant="secondary"
              isAdmin={isCatalogAdmin && adminView}
            />
          </div>
        }
        stats={[
          { icon: "🍺", value: portfolio.totalBeerCount, label: "Piv v katalogu" },
          { icon: "◆", value: brandCount, label: "Značek" },
          { icon: "✓", value: consumedBeerCount, label: "Vypitých piv" },
        ]}
      />

      <BreweryBrowseNavigation breweryId={brewery.id} ownerId={user.id} />

      <section
        className="taste-card taste-brewery-details-card"
        style={{
          padding: "22px",
        }}
      >
        {adminView && (
          <details className="taste-brewery-logo-details">
            <summary>Správa loga pivovaru</summary>
            <BreweryLogoManagerClient
              breweryId={brewery.id}
              breweryName={brewery.name}
              website={brewery.website}
              initialLogoUrl={brewery.logo_url}
              findCandidatesAction={findBreweryLogoCandidates}
              saveCandidateAction={saveBreweryLogoCandidate}
              inspectManualUrlAction={inspectBreweryLogoUrl}
              saveManualUrlAction={saveBreweryLogoFromUrl}
              removeLogoAction={removeBreweryLogo}
            />
          </details>
        )}

        <div className="taste-brewery-contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "18px" }}>
          <DetailItem label="Město" value={brewery.city} />
          <DetailItem
            label="Stát"
            value={brewery.country ? (
              <Link
                href={countryHref(brewery.country)}
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

        {isCzechBrewery && (
          <div
            style={{
              marginTop: "24px",
              paddingTop: "18px",
              borderTop: "1px solid var(--taste-border)",
            }}
          >
            <BreweryCzechMapClient
              variant="single"
              items={
                hasMapCoordinates
                  ? [
                      {
                        id: brewery.id,
                        name: brewery.name,
                        city: brewery.city,
                        latitude: brewery.latitude as number,
                        longitude: brewery.longitude as number,
                        closedYear: brewery.closed_year,
                        isPersonal: false,
                      },
                    ]
                  : []
              }
            />

            {!hasMapCoordinates && (
              <div
                style={{
                  marginTop: "9px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  color: "var(--taste-text-muted)",
                  fontSize: "10px",
                  lineHeight: 1.45,
                }}
              >
                <span>
                  {adminView
                    ? "Pivovar zatím nemá souřadnice. Doplň je přes „Upravit pivovar“ a bod se na mapě zobrazí."
                    : "Poloha tohoto pivovaru zatím není na mapě zakreslená."}
                </span>
              </div>
            )}
          </div>
        )}

        <div id="ochutnana-piva" style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
          <div className="taste-brewery-portfolio-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
            <div className="taste-label taste-brewery-section-title">Ochutnaná piva a sortiment</div>
            <div className="taste-brewery-portfolio-tools" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <nav className="taste-brewery-portfolio-filters" aria-label="Filtr sortimentu" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { key: "current", label: "Současný", href: `/breweries/${brewery.id}` },
                  { key: "all", label: "Vše", href: `/breweries/${brewery.id}?portfolio=all` },
                  { key: "historical", label: "Historický", href: `/breweries/${brewery.id}?portfolio=historical` },
                ].map((item) => (
                  <Link
                    key={item.key}
                    href={withBreweryBrowse(item.href, resolvedSearchParams.browse)}
                    prefetch={false}
                    className="taste-button-secondary"
                    style={{
                      padding: "6px 9px",
                      fontSize: "10px",
                      ...(portfolioFilter === item.key
                        ? {
                            borderColor: "rgba(232,136,53,.62)",
                            background: "rgba(232,136,53,.12)",
                            color: "var(--taste-amber-bright)",
                          }
                        : {}),
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="taste-brewery-portfolio-secondary">
                <CatalogBeerCreateModalClient
                  breweryName={brewery.name}
                  styles={styles}
                  hops={hops}
                  createBeerAction={createCatalogBeer.bind(null, brewery.id)}
                />
                <div className="taste-brewery-portfolio-count" style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>
                  {visibleBreweryBeers.length} {formatBeerCount(visibleBreweryBeers.length)} · {brandCount} {formatBrandCount(brandCount)}
                </div>
              </div>
            </div>
          </div>

          {visibleBreweryBeers.length > 0 ? (
            <div style={{ display: "grid" }}>
              {visibleBreweryBeers.map((beer: any, index: number) => (
                <div
                  className="taste-brewery-beer-row"
                  id={`beer-${beer.id}`}
                  tabIndex={-1}
                  data-focused={beer.id === focusedBeerId || beer.brand?.id === focusedBrandId ? "true" : undefined}
                  key={beer.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: "14px",
                    padding: "10px 10px",
                    borderBottom: index < visibleBreweryBeers.length - 1 ? "1px solid rgba(255,255,255,.055)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    {beer.isHistorical ? (
                      <span className="taste-brewery-beer-name" style={{ color: "var(--taste-text)", fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{beer.name}</span>
                    ) : (
                      <Link prefetch={false} href={withBreweryBrowse(beerHref(beer.id, brewery.id), resolvedSearchParams.browse)} className="taste-entity-link taste-brewery-beer-name" style={{ color: "var(--taste-text)", fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{beer.name}</Link>
                    )}
                    {adminView && !beer.referenceStatus.ready && <span style={{ marginLeft: "7px" }}><ReferenceWarning missing={beer.referenceStatus.missing} /></span>}
                    {beer.brand && (
                      <div className="taste-brewery-beer-brand" style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px" }}>
                        <span style={{ marginRight: "5px" }}>Značka:</span>
                        {beer.isHistorical ? <span style={{ color: "var(--taste-amber-bright)", fontWeight: 700 }}>{beer.brand.name}</span> :
                          <Link prefetch={false} href={withBreweryBrowse(brandHref(beer.brand.id, brewery.id), resolvedSearchParams.browse)} className="taste-entity-link" style={{ color: "var(--taste-amber-bright)", fontWeight: 700 }}>{beer.brand.name}</Link>}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                      {beer.is_non_alcoholic && <Badge>NEALKO</Badge>}
                      {beer.isCommissionedForThisBrewery && (
                        <Badge>VAŘENO PRO</Badge>
                      )}
                      {beer.effectivePortfolioStatus !== "active" && (
                        <Badge>{beerPortfolioStatusLabel(beer.effectivePortfolioStatus).toUpperCase()}</Badge>
                      )}
                      {beer.styleName && (beer.isHistorical ? <span style={{ color: "var(--taste-text-soft)", fontSize: "10px", fontWeight: 650 }}>{beer.styleName}</span> : <Link href={styleHref(beer.styleId)} className="taste-entity-link" style={{ color: "var(--taste-text-soft)", fontSize: "10px", fontWeight: 650 }}>{beer.styleName}</Link>)}
                      {beer.plato != null && <Badge>{beer.plato} °P</Badge>}
                      {beer.abv != null && <Badge>{beer.abv} %</Badge>}
                      {beer.ibu != null && <Badge>IBU {beer.ibu}</Badge>}
                    </div>
                    {!beer.isHistorical && beer.hopNames.length > 0 && (
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
                          {beer.hopNames.map((name: string, index: number) => { const hop = hops.find(hop => hop.name === name); return <span key={name}>{index > 0 && ", "}{hop ? <Link className="taste-entity-link" href={hopHref(hop.id)}>{name}</Link> : name}</span>; })}
                        </span>
                      </div>
                    )}
                    {!beer.isHistorical && beer.versionCount > 1 && (
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

                  <div className="taste-brewery-beer-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {beer.canEdit && (!beer.isHistorical || (isCatalogAdmin && adminView)) && !contextualIds.has(beer.id) && (
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
                          tastingCount: beer.tastingCount,
                          portfolioStatus: beer.portfolioStatus,
                        }}
                        styles={styles}
                        hops={hops}
                        allowBrandAssignment={isCatalogAdmin}
                        updateBeerAction={updateCatalogBeer.bind(null, brewery.id, beer.id)}
                        deleteBeerAction={deleteCatalogBeer.bind(null, brewery.id, beer.id)}
                      />
                    )}
                    <div className="taste-brewery-beer-quantity" style={{ color: "var(--taste-amber-bright)", fontSize: "11px", fontWeight: 750, whiteSpace: "nowrap" }}>
                      {beer.totalQuantity}×
                    </div>
                  </div>
                  {beer.id === focusedBeerId && <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    {beer.brand && isBeerAvailableForTasting(beer.portfolioStatus, brewery.closed_year) && !contextualIds.has(beer.id) &&
                      <Link href={`/tastings/new?beer=${beer.id}`} className="taste-button-secondary" style={{ display: "inline-flex", marginTop: "8px" }}>Zapsat ochutnávku</Link>}
                    <FocusedBeerDetails beerId={beer.id} />
                  </div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--taste-text-muted)", fontSize: "12px" }}>
              {portfolioFilter === "current" && brewery.closed_year != null
                ? "Pivovar je uzavřený. Současný sortiment už nemá; přepněte na Vše nebo Historický."
                : portfolioFilter === "historical"
                  ? "U tohoto pivovaru zatím není označené žádné historické pivo."
                  : portfolioFilter === "current"
                    ? "U tohoto pivovaru zatím není evidovaný současný sortiment."
                    : "Zatím není zaznamenané žádné pivo."}
            </div>
          )}
        </div>

          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label taste-brewery-section-title" style={{ marginBottom: "9px" }}>Značky pivovaru</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "10px" }}>
              {linkedBrands.sort((a, b) => a.name.localeCompare(b.name, "cs")).map((brand) => (
                <div
                  id={`brand-${brand.id}`}
                  key={brand.id}
                >
                  <BreweryBrandItemClient
                    name={brand.name}
                    href={withBreweryBrowse(brandHref(brand.id, brewery.id), resolvedSearchParams.browse)}
                    focused={brand.id === focusedBrandId}
                    adminView={adminView}
                    updateAction={updateBreweryBrand.bind(null, brewery.id, brand.id)}
                    deleteAction={deleteBreweryBrand.bind(null, brewery.id, brand.id)}
                  />
                </div>
              ))}
            </div>
            <BreweryBrandAddClient action={addBreweryBrand.bind(null, brewery.id)} />
          </div>

        {collaborations.length > 0 && (
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label taste-brewery-section-title" style={{ marginBottom: "10px" }}>Kolaborace</div>
            <div style={{ display: "grid", gap: "8px" }}>
              {collaborations.map((item: any) => (
                <div key={item.key} style={{ padding: "10px 12px", border: "1px solid var(--taste-border)", borderRadius: "10px", background: "rgba(255,255,255,.018)", fontSize: "11px" }}>
                  <Link href={`/breweries/${item.primary.id}`} className="taste-entity-link" style={{ fontWeight: 750 }}>{item.primary.name}</Link>
                  <span style={{ color: "var(--taste-text-muted)" }}> + </span>
                  <Link href={`/breweries/${item.collaborator.id}`} className="taste-entity-link">{item.collaborator.name}</Link>
                  <span style={{ color: "var(--taste-text-muted)" }}> · </span>
                  <Link prefetch={false} href={`/beers/${item.beer.id}`} className="taste-entity-link">{item.beer.name}</Link>
                  {item.versionYear != null && <span style={{ marginLeft: "5px", color: "var(--taste-text-muted)", fontSize: "9px" }}>({item.versionYear})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {relationItems.length > 0 && (
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--taste-border)" }}>
            <div className="taste-label taste-brewery-section-title" style={{ marginBottom: "10px" }}>Historické vazby</div>
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
          <div className="taste-label taste-brewery-section-title" style={{ marginBottom: "8px" }}>Historie názvů</div>

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
                <span style={{ color: "var(--taste-amber-bright)" }}>{currentNameFromYear ?? "?"}–</span>
                <span>{brewery.name}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "16px", color: "var(--taste-text-muted)", fontSize: "12px" }}>Zatím není evidována žádná změna názvu.</div>
          )}

          <div
            style={{
              marginTop: "12px",
              color: "var(--taste-text-muted)",
              fontSize: "10px",
              lineHeight: 1.45,
            }}
          >
            Nový název i další historické názvy se zapisují přes tlačítko „Upravit pivovar“.
          </div>
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
    <div className="taste-brewery-contact-item">
      <div className="taste-label" style={{ marginBottom: "5px" }}>{label}</div>
      <div className="taste-brewery-contact-value" style={{ color: value != null && value !== "" ? "var(--taste-text)" : "var(--taste-text-muted)", fontSize: "14px" }}>{value ?? "—"}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="taste-brewery-beer-badge" style={{ padding: "2px 6px", borderRadius: "999px", border: "1px solid var(--taste-border)", color: "var(--taste-text-muted)", fontSize: "9px", fontWeight: 700 }}>{children}</span>;
}
