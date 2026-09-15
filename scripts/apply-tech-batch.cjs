const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.mkdirSync(require('path').dirname(path), { recursive: true }); fs.writeFileSync(path, text); }
function replaceOne(path, from, to) {
  const input = read(path);
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected 1 match, got ${count}`);
  write(path, input.replace(from, to));
}
function replaceAllChecked(path, from, to, min = 1) {
  const input = read(path);
  const count = input.split(from).length - 1;
  if (count < min) throw new Error(`${path}: expected at least ${min} matches, got ${count}`);
  write(path, input.split(from).join(to));
}

// Shared pagination
write('lib/pagination.ts', [
  'export const DEFAULT_PAGE_SIZE = 25;',
  '',
  'export function parsePositivePage(value: string | string[] | undefined) {',
  '  const raw = typeof value === "string" ? value : undefined;',
  '  const parsed = Number(raw ?? "1");',
  '  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;',
  '}',
  '',
  'export function paginateItems<T>(items: T[], requestedPage: number, pageSize = DEFAULT_PAGE_SIZE) {',
  '  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));',
  '  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);',
  '  const startIndex = (currentPage - 1) * pageSize;',
  '  return {',
  '    currentPage,',
  '    totalPages,',
  '    pageItems: items.slice(startIndex, startIndex + pageSize),',
  '    pageStart: items.length === 0 ? 0 : startIndex + 1,',
  '    pageEnd: Math.min(startIndex + pageSize, items.length),',
  '  };',
  '}',
  ''
].join('\n'));

write('components/ui/PaginationControls.tsx', [
  '"use client";',
  '',
  'import { usePathname, useRouter, useSearchParams } from "next/navigation";',
  '',
  'function pageList(currentPage: number, totalPages: number): Array<number | null> {',
  '  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);',
  '  if (currentPage <= 4) return [1, 2, 3, 4, 5, null, totalPages];',
  '  if (currentPage >= totalPages - 3) return [1, null, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];',
  '  return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];',
  '}',
  '',
  'export default function PaginationControls({ currentPage, totalPages, queryParam = "page" }: { currentPage: number; totalPages: number; queryParam?: string }) {',
  '  const router = useRouter();',
  '  const pathname = usePathname();',
  '  const searchParams = useSearchParams();',
  '  if (totalPages <= 1) return null;',
  '  function goToPage(page: number) {',
  '    const params = new URLSearchParams(searchParams.toString());',
  '    if (page <= 1) params.delete(queryParam); else params.set(queryParam, String(page));',
  '    const query = params.toString();',
  '    router.replace(query ? pathname + "?" + query : pathname, { scroll: false });',
  '  }',
  '  return (',
  '    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "14px" }}>',
  '      <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className="taste-button-secondary" style={{ height: "34px", padding: "0 11px", fontSize: "10px", opacity: currentPage <= 1 ? 0.45 : 1 }}>← Předchozí</button>',
  '      {pageList(currentPage, totalPages).map((page, index) => page == null ? (',
  '        <span key={"ellipsis-" + index} style={{ padding: "0 3px", color: "var(--taste-text-muted)", fontSize: "11px" }}>…</span>',
  '      ) : (',
  '        <button key={page} type="button" onClick={() => goToPage(page)} aria-current={page === currentPage ? "page" : undefined} style={{ width: "34px", height: "34px", border: page === currentPage ? "1px solid var(--taste-amber-bright)" : "1px solid var(--taste-border)", borderRadius: "9px", background: page === currentPage ? "rgba(231,166,47,0.12)" : "var(--taste-surface)", color: page === currentPage ? "var(--taste-amber-bright)" : "var(--taste-text-soft)", fontSize: "11px", fontWeight: page === currentPage ? 750 : 600, cursor: "pointer" }}>{page}</button>',
  '      ))}',
  '      <button type="button" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} className="taste-button-secondary" style={{ height: "34px", padding: "0 11px", fontSize: "10px", opacity: currentPage >= totalPages ? 0.45 : 1 }}>Další →</button>',
  '    </div>',
  '  );',
  '}',
  ''
].join('\n'));

// Nomadic brewery persistence
replaceOne('app/breweries/actions.ts',
`  const website = String(\n    formData.get("website") || ""\n  ).trim();\n`,
`  const website = String(\n    formData.get("website") || ""\n  ).trim();\n\n  const isNomadic = formData.get("isNomadic") === "on";\n`);
replaceOne('app/breweries/actions.ts',
`    website,\n    foundedYear,\n`,
`    website,\n    isNomadic,\n    foundedYear,\n`);
replaceAllChecked('app/breweries/actions.ts',
`      address:\n        values.address || null,\n      website:\n        values.website || null,\n`,
`      address:\n        values.isNomadic ? null : values.address || null,\n      website:\n        values.website || null,\n      is_nomadic: values.isNomadic,\n`, 2);
replaceAllChecked('app/breweries/actions.ts',
`      latitude:\n        values.latitude,\n      longitude:\n        values.longitude,\n`,
`      latitude:\n        values.isNomadic ? null : values.latitude,\n      longitude:\n        values.isNomadic ? null : values.longitude,\n`, 2);

replaceOne('app/breweries/BreweryCreateModalClient.tsx',
`                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n`,
`                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n\n                  <label style={{ display: "flex", alignItems: "center", gap: "9px", minHeight: "42px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                    <input name="isNomadic" type="checkbox" />\n                    <span><strong style={{ color: "var(--taste-text)" }}>Letající pivovar</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Nemá vlastní výrobní adresu, ale je samostatnou pivovarskou identitou pro statistiky.</span></span>\n                  </label>\n`);

replaceOne('app/breweries/BreweryEditModalClient.tsx',
`  website: string | null;\n  foundedYear: number | null;\n`,
`  website: string | null;\n  isNomadic: boolean;\n  foundedYear: number | null;\n`);
replaceOne('app/breweries/BreweryEditModalClient.tsx',
`                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      defaultValue={brewery.address ?? ""}\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n`,
`                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      defaultValue={brewery.address ?? ""}\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n\n                  <label style={{ display: "flex", alignItems: "center", gap: "9px", minHeight: "42px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                    <input name="isNomadic" type="checkbox" defaultChecked={brewery.isNomadic} />\n                    <span><strong style={{ color: "var(--taste-text)" }}>Letající pivovar</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Bez vlastní výrobní adresy; zůstává plnohodnotným pivovarem ve statistikách.</span></span>\n                  </label>\n`);

replaceOne('app/breweries/page.tsx',
`        website,\n        address,\n        founded_year,\n`,
`        website,\n        address,\n        is_nomadic,\n        founded_year,\n`);
replaceOne('app/breweries/page.tsx',
`        address: brewery.address,\n        website: brewery.website,\n        latitude: brewery.latitude,\n`,
`        address: brewery.address,\n        website: brewery.website,\n        isNomadic: brewery.is_nomadic,\n        latitude: brewery.latitude,\n`);
replaceOne('app/breweries/BreweryTableClient.tsx',
`  website: string | null;\n  latitude: number | null;\n`,
`  website: string | null;\n  isNomadic: boolean;\n  latitude: number | null;\n`);
replaceOne('app/breweries/BreweryTableClient.tsx',
`                            website: brewery.website,\n                            foundedYear: brewery.foundedYear,\n`,
`                            website: brewery.website,\n                            isNomadic: brewery.isNomadic,\n                            foundedYear: brewery.foundedYear,\n`);

replaceOne('app/breweries/[id]/page.tsx',
`      address,\n      website,\n      founded_year,\n`,
`      address,\n      website,\n      is_nomadic,\n      founded_year,\n`);
replaceOne('app/breweries/[id]/page.tsx',
`                website: brewery.website,\n                foundedYear: brewery.founded_year,\n`,
`                website: brewery.website,\n                isNomadic: brewery.is_nomadic,\n                foundedYear: brewery.founded_year,\n`);
replaceOne('app/breweries/[id]/page.tsx',
`          <DetailItem\n            label="Adresa"\n            value={brewery.address}\n          />\n`,
`          <DetailItem\n            label={brewery.is_nomadic ? "Typ pivovaru" : "Adresa"}\n            value={brewery.is_nomadic ? "Letající pivovar" : brewery.address}\n          />\n`);

// Brand detail pagination
replaceOne('app/brands/[id]/page.tsx',
`import PageHero from "@/components/ui/PageHero";\n`,
`import PageHero from "@/components/ui/PageHero";\nimport PaginationControls from "@/components/ui/PaginationControls";\nimport { paginateItems, parsePositivePage } from "@/lib/pagination";\n`);
replaceOne('app/brands/[id]/page.tsx',
`type Props = { params: Promise<{ id: string }> };\n`,
`type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };\n`);
replaceOne('app/brands/[id]/page.tsx',
`export default async function BrandDetailPage({ params }: Props) {\n  const { id } = await params;\n`,
`export default async function BrandDetailPage({ params, searchParams }: Props) {\n  const { id } = await params;\n  const pageParams = await searchParams;\n`);
replaceOne('app/brands/[id]/page.tsx',
`  const beerIds = beers.map((beer) => beer.id);\n`,
`  const pagination = paginateItems(beers, parsePositivePage(pageParams.page));\n  const beerIds = beers.map((beer) => beer.id);\n`);
replaceOne('app/brands/[id]/page.tsx',
`          ) : beers.map((beer) => {\n`,
`          ) : pagination.pageItems.map((beer) => {\n`);
replaceOne('app/brands/[id]/page.tsx',
`        </div>\n      </section>\n\n      {(rawBrand.notes || rawBrand.website) && (\n`,
`        </div>\n        <PaginationControls currentPage={pagination.currentPage} totalPages={pagination.totalPages} />\n      </section>\n\n      {(rawBrand.notes || rawBrand.website) && (\n`);

// Homepage style links
replaceOne('app/page.tsx',
`            items={\n              globalStats.styles\n            }\n          />\n`,
`            items={\n              globalStats.styles\n            }\n            getItemHref={(item) => \`/styles/\${item.id}\`}\n          />\n`);

// Non-alcoholic in homepage catalog types/query
replaceOne('app/page.tsx',
`  ibu: number | null;\n\n  brands:\n`,
`  ibu: number | null;\n  is_non_alcoholic: boolean;\n\n  brands:\n`);
replaceOne('app/page.tsx',
`        ibu,\n        breweries (\n`,
`        ibu,\n        is_non_alcoholic,\n        breweries (\n`);

replaceOne('app/TastingModal.tsx',
`  ibu: number | null;\n  breweries: {\n`,
`  ibu: number | null;\n  is_non_alcoholic: boolean;\n  breweries: {\n`);
replaceOne('app/TastingModalClient.tsx',
`  ibu: number | null;\n\n  breweries: {\n`,
`  ibu: number | null;\n  is_non_alcoholic: boolean;\n\n  breweries: {\n`);
replaceOne('app/tastings/new/TastingForm.tsx',
`  ibu: number | null;\n\n  breweries: {\n`,
`  ibu: number | null;\n  is_non_alcoholic: boolean;\n\n  breweries: {\n`);
replaceOne('app/tastings/new/TastingForm.tsx',
`  const [\n    ibu,\n    setIbu,\n  ] = useState("");\n`,
`  const [\n    ibu,\n    setIbu,\n  ] = useState("");\n\n  const [isNonAlcoholic, setIsNonAlcoholic] = useState(false);\n`);
replaceOne('app/tastings/new/TastingForm.tsx',
`    setIbu(\n      beer.ibu !== null\n        ? String(beer.ibu)\n        : ""\n    );\n\n    setBeerOpen(false);\n`,
`    setIbu(\n      beer.ibu !== null\n        ? String(beer.ibu)\n        : ""\n    );\n\n    setIsNonAlcoholic(beer.is_non_alcoholic);\n    setBeerOpen(false);\n`);
replaceOne('app/tastings/new/TastingForm.tsx',
`      setIbu("");\n      setSelectedHops([]);\n`,
`      setIbu("");\n      setIsNonAlcoholic(false);\n      setSelectedHops([]);\n`);
replaceOne('app/tastings/new/TastingForm.tsx',
`      {/* ==================================================\n          CHMELY\n      ================================================== */}\n`,
`      <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: "9px", cursor: existingBeerId ? "default" : "pointer" }}>\n        <input name="isNonAlcoholic" type="checkbox" checked={isNonAlcoholic} disabled={Boolean(existingBeerId)} onChange={(event) => setIsNonAlcoholic(event.target.checked)} />\n        <span><strong>Nealkoholické pivo</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "11px" }}>Pivo zůstává běžnou součástí všech statistik.</span></span>\n      </label>\n\n      {/* ==================================================\n          CHMELY\n      ================================================== */}\n`);

replaceOne('app/tastings/actions.ts',
`  ibuValue: string;\n\n  tastedOn: string;\n`,
`  ibuValue: string;\n  isNonAlcoholic: boolean;\n\n  tastedOn: string;\n`);
replaceOne('app/tastings/actions.ts',
`  const tastedOn =\n`,
`  const isNonAlcoholic = formData.get("isNonAlcoholic") === "on";\n\n  const tastedOn =\n`);
replaceOne('app/tastings/actions.ts',
`    platoValue,\n    abvValue,\n    ibuValue,\n\n    tastedOn,\n`,
`    platoValue,\n    abvValue,\n    ibuValue,\n    isNonAlcoholic,\n\n    tastedOn,\n`);
replaceOne('app/tastings/actions.ts',
`      ibu: values.ibuValue\n        ? Number(values.ibuValue)\n        : null,\n    })\n`,
`      ibu: values.ibuValue\n        ? Number(values.ibuValue)\n        : null,\n      is_non_alcoholic: values.isNonAlcoholic,\n    })\n`);

// Catalog beer creation supports non-alcoholic flag
replaceOne('app/breweries/actions.ts',
`  const hopNames =\n    readCatalogBeerHopNames(\n      formData\n    );\n`,
`  const hopNames =\n    readCatalogBeerHopNames(\n      formData\n    );\n\n  const isNonAlcoholic = formData.get("isNonAlcoholic") === "on";\n`);
replaceOne('app/breweries/actions.ts',
`      ibu,\n    })\n    .select("id")\n`,
`      ibu,\n      is_non_alcoholic: isNonAlcoholic,\n    })\n    .select("id")\n`);

replaceOne('app/breweries/CatalogBeerCreateModalClient.tsx',
`  const [\n    ibu,\n    setIbu,\n  ] = useState("");\n`,
`  const [\n    ibu,\n    setIbu,\n  ] = useState("");\n\n  const [isNonAlcoholic, setIsNonAlcoholic] = useState(false);\n`);
replaceOne('app/breweries/CatalogBeerCreateModalClient.tsx',
`    setIbu("");\n    setSelectedHops(\n`,
`    setIbu("");\n    setIsNonAlcoholic(false);\n    setSelectedHops(\n`);
replaceOne('app/breweries/CatalogBeerCreateModalClient.tsx',
`                {error && (\n`,
`                <label style={{ display: "flex", alignItems: "center", gap: "9px", marginTop: "14px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                  <input name="isNonAlcoholic" type="checkbox" checked={isNonAlcoholic} onChange={(event) => setIsNonAlcoholic(event.target.checked)} />\n                  <span><strong style={{ color: "var(--taste-text)" }}>Nealkoholické pivo</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Bude evidováno a započítáváno stejně jako ostatní piva.</span></span>\n                </label>\n\n                {error && (\n`);

// Canonical protocol rules
replaceOne('docs/beer-data-protocol.md',
`A brewery is the real producing brewery/site for a given beer version and period.\n`,
`A brewery is the canonical brewery identity for a given beer version and period. It may have its own production site or be a verified nomadic/flying brewery.\n\nNomadic breweries are first-class brewery identities. They use \`breweries.is_nomadic = true\`, participate normally in brewery statistics and display \`Letající pivovar\` instead of a production address. A contract host brewery may be retained as research context, but must not create a second brewery-statistics count for the same tasting.\n`);
replaceOne('docs/beer-data-protocol.md',
`### Tasting\n`,
`### Non-alcoholic beer\n\nNon-alcoholic beer is a normal BeerApp beer record with \`beers.is_non_alcoholic = true\`. It participates in beer, brand, brewery, style, country and tasting statistics exactly once like any other beer. It must not be excluded from imports solely because it is non-alcoholic.\n\n### Tasting\n`);
replaceOne('docs/beer-data-protocol.md',
`2. Resolve, in order: **producing brewery for the tasting period -> brand -> beer -> beer version**.\n`,
`2. Resolve, in order: **canonical brewery identity for the tasting period (including a verified nomadic brewery when applicable) -> brand -> beer -> beer version**.\n`);

// Style detail page
write('app/styles/[id]/page.tsx', [
  'import Link from "next/link";',
  'import { notFound, redirect } from "next/navigation";',
  'import PageHero from "@/components/ui/PageHero";',
  'import PaginationControls from "@/components/ui/PaginationControls";',
  'import { paginateItems, parsePositivePage } from "@/lib/pagination";',
  'import { createClient } from "@/lib/supabase/server";',
  '',
  'type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };',
  'type Relation<T> = T | T[] | null;',
  'function one<T>(value: Relation<T> | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }',
  '',
  'export default async function StyleDetailPage({ params, searchParams }: Props) {',
  '  const { id } = await params;',
  '  const styleId = Number(id);',
  '  if (!Number.isInteger(styleId) || styleId < 1) notFound();',
  '  const pageParams = await searchParams;',
  '  const supabase = await createClient();',
  '  const { data: { user } } = await supabase.auth.getUser();',
  '  if (!user) redirect("/auth/login");',
  '',
  '  const { data: style, error: styleError } = await supabase.from("beer_styles").select("id, name, aliases").eq("id", styleId).maybeSingle();',
  '  if (styleError) throw new Error(styleError.message);',
  '  if (!style) notFound();',
  '',
  '  const { data: versions, error: versionsError } = await supabase.from("beer_versions").select("id, beer_id").eq("style_id", styleId);',
  '  if (versionsError) throw new Error(versionsError.message);',
  '  const versionIds = (versions ?? []).map((item) => item.id);',
  '  const versionBeerIds = (versions ?? []).map((item) => item.beer_id);',
  '  const { data: currentBeers, error: currentBeersError } = await supabase.from("beers").select("id").eq("style_id", styleId);',
  '  if (currentBeersError) throw new Error(currentBeersError.message);',
  '  const beerIds = Array.from(new Set([...(currentBeers ?? []).map((item) => item.id), ...versionBeerIds]));',
  '',
  '  let beers: Array<{ id: number; name: string; is_non_alcoholic: boolean; brands: Relation<{ id: number; name: string }>; breweries: Relation<{ id: number; name: string }> }> = [];',
  '  if (beerIds.length > 0) {',
  '    const { data, error } = await supabase.from("beers").select("id, name, is_non_alcoholic, brands ( id, name ), breweries ( id, name )").in("id", beerIds).order("name");',
  '    if (error) throw new Error(error.message);',
  '    beers = (data ?? []) as unknown as typeof beers;',
  '  }',
  '',
  '  let totalQuantity = 0;',
  '  if (versionIds.length > 0) {',
  '    const { data: tastingRows, error: tastingError } = await supabase.from("tastings").select("quantity").in("beer_version_id", versionIds);',
  '    if (tastingError) throw new Error(tastingError.message);',
  '    totalQuantity = (tastingRows ?? []).reduce((sum, row) => sum + (row.quantity ?? 1), 0);',
  '  }',
  '',
  '  const pagination = paginateItems(beers, parsePositivePage(pageParams.page));',
  '  return (',
  '    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "34px 24px 80px" }}>',
  '      <PageHero eyebrow="Pivní styl" imageUrl="/images/heroes/catalog.jpg" visualVariant="catalog" title={style.name} subtitle={style.aliases?.length ? "Také: " + style.aliases.join(", ") : "Piva evidovaná v tomto stylu."} action={<Link href="/stats" className="taste-button-secondary">← Statistiky</Link>} stats={[{ icon: "◆", accent: "#9cad47", value: beers.length, label: "Piv" }, { icon: "◉", accent: "#f2b63f", value: totalQuantity, label: "Vypitých" }]} />',
  '      <section style={{ marginTop: "24px" }}>',
  '        <div className="taste-label" style={{ marginBottom: "6px" }}>Evidence stylu</div>',
  '        <h2 style={{ margin: "0 0 14px", fontSize: "24px" }}>Piva stylu {style.name}</h2>',
  '        <div style={{ display: "grid", gap: "10px" }}>',
  '          {pagination.pageItems.length === 0 ? <div className="taste-card" style={{ padding: "24px", color: "var(--taste-text-muted)" }}>Zatím bez piv.</div> : pagination.pageItems.map((beer) => {',
  '            const brand = one(beer.brands);',
  '            const brewery = one(beer.breweries);',
  '            return <article key={beer.id} className="taste-card taste-glow-hop" style={{ padding: "16px" }}>',
  '              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>',
  '                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>',
  '                  <Link href={"/beers/" + beer.id} className="taste-entity-link" style={{ color: "var(--taste-text)", fontSize: "16px", fontWeight: 800 }}>{beer.name}</Link>',
  '                  {beer.is_non_alcoholic && <span style={{ padding: "3px 7px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "9px", fontWeight: 800 }}>NEALKO</span>}',
  '                </div>',
  '                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px" }}>',
  '                  {brand && <Link href={"/brands/" + brand.id} className="taste-entity-link" style={{ color: "var(--taste-text-muted)" }}>{brand.name}</Link>}',
  '                  {brewery && <Link href={"/breweries/" + brewery.id} className="taste-entity-link" style={{ color: "var(--taste-text-muted)" }}>{brewery.name}</Link>}',
  '                </div>',
  '              </div>',
  '            </article>;',
  '          })}',
  '        </div>',
  '        <PaginationControls currentPage={pagination.currentPage} totalPages={pagination.totalPages} />',
  '      </section>',
  '    </main>',
  '  );',
  '}',
  ''
].join('\n'));

console.log('Tech batch patch applied.');
