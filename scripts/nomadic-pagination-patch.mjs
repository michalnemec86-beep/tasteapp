import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value);
}

function replaceOne(path, from, to) {
  const input = read(path);
  const count = input.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected 1 match, found ${count}`);
  }
  write(path, input.replace(from, to));
}

function replaceRegex(path, regex, to, expected = 1) {
  const input = read(path);
  const matcher = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  const matches = [...input.matchAll(matcher)];
  if (matches.length !== expected) {
    throw new Error(`${path}: expected ${expected} matches for ${regex}, found ${matches.length}`);
  }
  write(path, input.replace(regex, to));
}

// Shared pagination helpers/components.
fs.mkdirSync("lib", { recursive: true });
fs.mkdirSync("components/ui", { recursive: true });
write("lib/pagination.ts", `export const DEFAULT_PAGE_SIZE = 25;\n\nexport function parsePositivePage(value: string | string[] | undefined) {\n  const raw = typeof value === \"string\" ? value : undefined;\n  const parsed = Number(raw ?? \"1\");\n  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;\n}\n\nexport function paginateItems<T>(items: T[], requestedPage: number, pageSize = DEFAULT_PAGE_SIZE) {\n  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));\n  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);\n  const startIndex = (currentPage - 1) * pageSize;\n  const pageItems = items.slice(startIndex, startIndex + pageSize);\n\n  return {\n    currentPage,\n    totalPages,\n    pageItems,\n    pageStart: items.length === 0 ? 0 : startIndex + 1,\n    pageEnd: Math.min(startIndex + pageSize, items.length),\n  };\n}\n`);

write("components/ui/PaginationControls.tsx", `\"use client\";\n\nimport { usePathname, useRouter, useSearchParams } from \"next/navigation\";\n\nfunction pageList(currentPage: number, totalPages: number): Array<number | null> {\n  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);\n  if (currentPage <= 4) return [1, 2, 3, 4, 5, null, totalPages];\n  if (currentPage >= totalPages - 3) return [1, null, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];\n  return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];\n}\n\ntype Props = {\n  currentPage: number;\n  totalPages: number;\n  queryParam?: string;\n};\n\nexport default function PaginationControls({ currentPage, totalPages, queryParam = \"page\" }: Props) {\n  const router = useRouter();\n  const pathname = usePathname();\n  const searchParams = useSearchParams();\n\n  if (totalPages <= 1) return null;\n\n  function goToPage(page: number) {\n    const params = new URLSearchParams(searchParams.toString());\n    if (page <= 1) params.delete(queryParam);\n    else params.set(queryParam, String(page));\n    const query = params.toString();\n    router.replace(query ? \`${pathname}?\${query}\` : pathname, { scroll: false });\n  }\n\n  return (\n    <div style={{ display: \"flex\", justifyContent: \"center\", alignItems: \"center\", flexWrap: \"wrap\", gap: \"6px\", marginTop: \"14px\" }}>\n      <button type=\"button\" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className=\"taste-button-secondary\" style={{ height: \"34px\", padding: \"0 11px\", fontSize: \"10px\", opacity: currentPage <= 1 ? 0.45 : 1 }}>\n        ← Předchozí\n      </button>\n\n      {pageList(currentPage, totalPages).map((page, index) =>\n        page == null ? (\n          <span key={\`ellipsis-\${index}\`} style={{ padding: \"0 3px\", color: \"var(--taste-text-muted)\", fontSize: \"11px\" }}>…</span>\n        ) : (\n          <button key={page} type=\"button\" onClick={() => goToPage(page)} aria-current={page === currentPage ? \"page\" : undefined} style={{ width: \"34px\", height: \"34px\", border: page === currentPage ? \"1px solid var(--taste-amber-bright)\" : \"1px solid var(--taste-border)\", borderRadius: \"9px\", background: page === currentPage ? \"rgba(231,166,47,0.12)\" : \"var(--taste-surface)\", color: page === currentPage ? \"var(--taste-amber-bright)\" : \"var(--taste-text-soft)\", fontSize: \"11px\", fontWeight: page === currentPage ? 750 : 600, cursor: \"pointer\" }}>\n            {page}\n          </button>\n        )\n      )}\n\n      <button type=\"button\" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} className=\"taste-button-secondary\" style={{ height: \"34px\", padding: \"0 11px\", fontSize: \"10px\", opacity: currentPage >= totalPages ? 0.45 : 1 }}>\n        Další →\n      </button>\n    </div>\n  );\n}\n`);

// Brewery actions: persist nomadic flag, and clear address/coordinates for nomadic breweries.
replaceOne(
  "app/breweries/actions.ts",
  `  const website = String(\n    formData.get("website") || ""\n  ).trim();\n`,
  `  const website = String(\n    formData.get("website") || ""\n  ).trim();\n\n  const isNomadic = formData.get("isNomadic") === "on";\n`
);
replaceOne(
  "app/breweries/actions.ts",
  `    website,\n    foundedYear,\n`,
  `    website,\n    isNomadic,\n    foundedYear,\n`
);
replaceOne(
  "app/breweries/actions.ts",
  `      address:\n        values.address || null,\n      website:\n        values.website || null,\n`,
  `      address:\n        values.isNomadic ? null : values.address || null,\n      website:\n        values.website || null,\n      is_nomadic: values.isNomadic,\n`
);
replaceOne(
  "app/breweries/actions.ts",
  `      latitude:\n        values.latitude,\n      longitude:\n        values.longitude,\n`,
  `      latitude:\n        values.isNomadic ? null : values.latitude,\n      longitude:\n        values.isNomadic ? null : values.longitude,\n`
);
replaceOne(
  "app/breweries/actions.ts",
  `      address:\n        values.address || null,\n      website:\n        values.website || null,\n`,
  `      address:\n        values.isNomadic ? null : values.address || null,\n      website:\n        values.website || null,\n      is_nomadic: values.isNomadic,\n`
);
replaceOne(
  "app/breweries/actions.ts",
  `      latitude:\n        values.latitude,\n      longitude:\n        values.longitude,\n`,
  `      latitude:\n        values.isNomadic ? null : values.latitude,\n      longitude:\n        values.isNomadic ? null : values.longitude,\n`
);

// Create modal: checkbox + quick import support.
replaceOne(
  "app/breweries/BreweryCreateModalClient.tsx",
  `      const values = {\n        name: readText("name"),\n`,
  `      const rawNomadic = data.isNomadic;\n      const isNomadic = rawNomadic === true || rawNomadic === "true";\n\n      const values = {\n        name: readText("name"),\n`
);
replaceOne(
  "app/breweries/BreweryCreateModalClient.tsx",
  `        longitude:\n          readNumber("longitude"),\n      };\n`,
  `        longitude:\n          readNumber("longitude"),\n        isNomadic,\n      };\n`
);
replaceOne(
  "app/breweries/BreweryCreateModalClient.tsx",
  `        if (\n          field instanceof HTMLInputElement ||\n          field instanceof HTMLSelectElement\n        ) {\n          field.value = value;\n`,
  `        if (field instanceof HTMLInputElement && field.type === "checkbox") {\n          field.checked = Boolean(value);\n          field.dispatchEvent(new Event("change", { bubbles: true }));\n        } else if (\n          field instanceof HTMLInputElement ||\n          field instanceof HTMLSelectElement\n        ) {\n          field.value = String(value);\n`
);
replaceOne(
  "app/breweries/BreweryCreateModalClient.tsx",
  `                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n`,
  `                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n\n                  <label style={{ display: "flex", alignItems: "center", gap: "9px", minHeight: "42px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                    <input name="isNomadic" type="checkbox" />\n                    <span><strong style={{ color: "var(--taste-text)" }}>Letající pivovar</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Nemá vlastní výrobní adresu, ale je samostatnou pivovarskou identitou pro statistiky.</span></span>\n                  </label>\n`
);

// Edit modal: data field + checkbox.
replaceOne(
  "app/breweries/BreweryEditModalClient.tsx",
  `  address: string | null;\n  website: string | null;\n`,
  `  address: string | null;\n  website: string | null;\n  isNomadic: boolean;\n`
);
replaceOne(
  "app/breweries/BreweryEditModalClient.tsx",
  `                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      defaultValue={brewery.address ?? ""}\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n`,
  `                  <Field label="Adresa">\n                    <input\n                      name="address"\n                      defaultValue={brewery.address ?? ""}\n                      style={\n                        inputStyle\n                      }\n                    />\n                  </Field>\n\n                  <label style={{ display: "flex", alignItems: "center", gap: "9px", minHeight: "42px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                    <input name="isNomadic" type="checkbox" defaultChecked={brewery.isNomadic} />\n                    <span><strong style={{ color: "var(--taste-text)" }}>Letající pivovar</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Bez vlastní výrobní adresy; zůstává plnohodnotným pivovarem ve statistikách.</span></span>\n                  </label>\n`
);

// Brewery catalog query/row shape + edit data.
replaceOne(
  "app/breweries/page.tsx",
  `        website,\n        address,\n        founded_year,\n`,
  `        website,\n        address,\n        is_nomadic,\n        founded_year,\n`
);
replaceOne(
  "app/breweries/page.tsx",
  `        address: brewery.address,\n        website: brewery.website,\n`,
  `        address: brewery.address,\n        website: brewery.website,\n        isNomadic: brewery.is_nomadic,\n`
);
replaceOne(
  "app/breweries/BreweryTableClient.tsx",
  `  website: string | null;\n  latitude: number | null;\n`,
  `  website: string | null;\n  isNomadic: boolean;\n  latitude: number | null;\n`
);
replaceOne(
  "app/breweries/BreweryTableClient.tsx",
  `                            website: brewery.website,\n                            foundedYear: brewery.foundedYear,\n`,
  `                            website: brewery.website,\n                            isNomadic: brewery.isNomadic,\n                            foundedYear: brewery.foundedYear,\n`
);

// Reuse shared pagination in the brewery table.
replaceOne(
  "app/breweries/BreweryTableClient.tsx",
  `import BreweryEditModalClient from "./BreweryEditModalClient";\n`,
  `import BreweryEditModalClient from "./BreweryEditModalClient";\nimport PaginationControls from "@/components/ui/PaginationControls";\nimport { DEFAULT_PAGE_SIZE } from "@/lib/pagination";\n`
);
replaceRegex(
  "app/breweries/BreweryTableClient.tsx",
  /\nconst PAGE_SIZE = 25;\n\nfunction getPaginationPages\([\s\S]*?\n}\n\n/,
  `\nconst PAGE_SIZE = DEFAULT_PAGE_SIZE;\n\n`
);
replaceRegex(
  "app/breweries/BreweryTableClient.tsx",
  /\n  const paginationPages =\n    getPaginationPages\([\s\S]*?\n    \);\n/,
  "\n"
);
replaceRegex(
  "app/breweries/BreweryTableClient.tsx",
  /\n      \{filteredAndSortedRows.length > 0 &&\n        totalPages > 1 && \([\s\S]*?\n        \)\}\n\n      \{beerListBrewery && \(/,
  `\n      <PaginationControls currentPage={currentPage} totalPages={totalPages} />\n\n      {beerListBrewery && (`
);

// Brewery detail: nomadic metadata and paginated beer list.
replaceOne(
  "app/breweries/[id]/page.tsx",
  `import PageHero from "@/components/ui/PageHero";\n`,
  `import PageHero from "@/components/ui/PageHero";\nimport PaginationControls from "@/components/ui/PaginationControls";\nimport { paginateItems, parsePositivePage } from "@/lib/pagination";\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `type BreweryDetailPageProps = {\n  params: Promise<{\n    id: string;\n  }>;\n};\n`,
  `type BreweryDetailPageProps = {\n  params: Promise<{ id: string }>;\n  searchParams: Promise<{ beerPage?: string | string[] }>;\n};\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `export default async function BreweryDetailPage({\n  params,\n}: BreweryDetailPageProps) {\n  const { id } = await params;\n`,
  `export default async function BreweryDetailPage({\n  params,\n  searchParams,\n}: BreweryDetailPageProps) {\n  const { id } = await params;\n  const pageParams = await searchParams;\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `      address,\n      website,\n      founded_year,\n`,
  `      address,\n      website,\n      is_nomadic,\n      founded_year,\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `                website: brewery.website,\n                foundedYear: brewery.founded_year,\n`,
  `                website: brewery.website,\n                isNomadic: brewery.is_nomadic,\n                foundedYear: brewery.founded_year,\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `          <DetailItem\n            label="Adresa"\n            value={brewery.address}\n          />\n`,
  `          <DetailItem\n            label={brewery.is_nomadic ? "Typ pivovaru" : "Adresa"}\n            value={brewery.is_nomadic ? "Letající pivovar" : brewery.address}\n          />\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `  const history = [\n`,
  `  const beerPagination = paginateItems(\n    breweryBeers,\n    parsePositivePage(pageParams.beerPage)\n  );\n\n  const history = [\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `          {breweryBeers.length > 0 ? (\n`,
  `          {breweryBeers.length > 0 ? (\n`
);
replaceOne(
  "app/breweries/[id]/page.tsx",
  `              {breweryBeers.map((beer) => (\n`,
  `              {beerPagination.pageItems.map((beer) => (\n`
);
replaceRegex(
  "app/breweries/[id]/page.tsx",
  /(          \{breweryBeers.length > 0 \? \([\s\S]*?          \) : \([\s\S]*?          \)\}\n)(\n        <\/div>)/,
  `$1\n          <PaginationControls currentPage={beerPagination.currentPage} totalPages={beerPagination.totalPages} queryParam="beerPage" />\n$2`
);

// Brand detail pagination.
replaceOne(
  "app/brands/[id]/page.tsx",
  `import PageHero from "@/components/ui/PageHero";\n`,
  `import PageHero from "@/components/ui/PageHero";\nimport PaginationControls from "@/components/ui/PaginationControls";\nimport { paginateItems, parsePositivePage } from "@/lib/pagination";\n`
);
replaceOne(
  "app/brands/[id]/page.tsx",
  `type Props = { params: Promise<{ id: string }> };\n`,
  `type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ beerPage?: string | string[] }> };\n`
);
replaceOne(
  "app/brands/[id]/page.tsx",
  `export default async function BrandDetailPage({ params }: Props) {\n  const { id } = await params;\n`,
  `export default async function BrandDetailPage({ params, searchParams }: Props) {\n  const { id } = await params;\n  const pageParams = await searchParams;\n`
);
replaceOne(
  "app/brands/[id]/page.tsx",
  `  const beerIds = beers.map((beer) => beer.id);\n`,
  `  const beerPagination = paginateItems(beers, parsePositivePage(pageParams.beerPage));\n  const beerIds = beers.map((beer) => beer.id);\n`
);
replaceOne(
  "app/brands/[id]/page.tsx",
  `          ) : beers.map((beer) => {\n`,
  `          ) : beerPagination.pageItems.map((beer) => {\n`
);
replaceOne(
  "app/brands/[id]/page.tsx",
  `        </div>\n      </section>\n`,
  `        </div>\n        <PaginationControls currentPage={beerPagination.currentPage} totalPages={beerPagination.totalPages} queryParam="beerPage" />\n      </section>\n`
);

// Canonical protocol update.
replaceOne(
  "docs/beer-data-protocol.md",
  `A brewery is the real producing brewery/site for a given beer version and period.\n`,
  `A brewery is the canonical brewing identity for a given beer version and period. It can be either a brewery with its own production site or a verified nomadic/flying brewery that commissions production elsewhere.\n\nNomadic breweries are stored in the same \`breweries\` table with \`is_nomadic = true\`. They are valid first-class brewery identities for statistics. Their profile displays \"Letající pivovar\" instead of a production address. The host/contract production site may be retained as research context when known, but it must not create a second brewery-statistics count for the same tasting.\n`
);
replaceOne(
  "docs/beer-data-protocol.md",
  `2. Resolve, in order: **producing brewery for the tasting period -> brand -> beer -> beer version**.\n`,
  `2. Resolve, in order: **canonical brewery identity for the tasting period (including a verified nomadic brewery when applicable) -> brand -> beer -> beer version**.\n`
);

console.log("Nomadic brewery and shared pagination patch applied.");
