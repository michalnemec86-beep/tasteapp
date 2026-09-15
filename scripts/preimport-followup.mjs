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
    throw new Error(`${path}: expected one match, found ${count}`);
  }
  write(path, input.replace(from, to));
}

// Idempotency marker: follow-up is intentionally a one-shot repository migration.
const statsPath = "app/stats/page.tsx";
if (read(statsPath).includes("PREIMPORT_FOLLOWUP_APPLIED")) {
  console.log("Pre-import follow-up already applied.");
  process.exit(0);
}

// Statistics drill-down parameters: every entity link now changes the actual dataset.
replaceOne(
  statsPath,
  `    packaging?: string | string[];\n`,
  `    packaging?: string | string[];\n    beer?: string | string[];\n    brand?: string | string[];\n    brewery?: string | string[];\n    style?: string | string[];\n    country?: string | string[];\n    hop?: string | string[];\n`
);

replaceOne(
  statsPath,
  `  const requestedPackaging = getStringParam(\n    params.packaging\n  );\n`,
  `  const requestedPackaging = getStringParam(\n    params.packaging\n  );\n  const requestedBeer = getStringParam(params.beer);\n  const requestedBrand = getStringParam(params.brand);\n  const requestedBrewery = getStringParam(params.brewery);\n  const requestedStyle = getStringParam(params.style);\n  const requestedCountry = getStringParam(params.country);\n  const requestedHop = getStringParam(params.hop);\n`
);

replaceOne(
  statsPath,
  `  const filteredTastings = selectedPackaging\n    ? userTastings.filter(\n        (tasting) =>\n          tasting.packaging === selectedPackaging\n      )\n    : userTastings;\n\n  const rawStats = buildTasteStats(filteredTastings);\n`,
  `  const packagingTastings = selectedPackaging\n    ? userTastings.filter(\n        (tasting) =>\n          tasting.packaging === selectedPackaging\n      )\n    : userTastings;\n\n  const requestedBeerId = parsePositiveInteger(requestedBeer);\n  const requestedBrandId = parsePositiveInteger(requestedBrand);\n  const requestedBreweryId = parsePositiveInteger(requestedBrewery);\n  const requestedStyleId = parsePositiveInteger(requestedStyle);\n  const requestedHopId = parsePositiveInteger(requestedHop);\n  const normalizedRequestedCountry = requestedCountry\n    ? normalizeCountry(requestedCountry)\n    : undefined;\n\n  // PREIMPORT_FOLLOWUP_APPLIED\n  const filteredTastings = packagingTastings.filter((tasting) => {\n    if (requestedBeerId && tasting.beers?.id !== requestedBeerId) {\n      return false;\n    }\n\n    if (requestedBrandId && tasting.beers?.brands?.id !== requestedBrandId) {\n      return false;\n    }\n\n    const brewery = tasting.beer_versions?.breweries ?? tasting.beers?.breweries;\n    if (requestedBreweryId && brewery?.id !== requestedBreweryId) {\n      return false;\n    }\n\n    const style = tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles;\n    if (requestedStyleId && style?.id !== requestedStyleId) {\n      return false;\n    }\n\n    if (normalizedRequestedCountry && normalizeCountry(brewery?.country ?? "") !== normalizedRequestedCountry) {\n      return false;\n    }\n\n    if (requestedHopId) {\n      const hopRows = tasting.beer_versions?.beer_version_hops ?? tasting.beers?.beer_hops ?? [];\n      if (!hopRows.some((row) => row.hops?.id === requestedHopId)) {\n        return false;\n      }\n    }\n\n    return true;\n  });\n\n  const rawStats = buildTasteStats(filteredTastings);\n`
);

replaceOne(
  statsPath,
  `function getYear(\n`,
  `function parsePositiveInteger(value: string | undefined) {\n  if (!value) {\n    return undefined;\n  }\n\n  const parsed = Number(value);\n  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;\n}\n\nfunction normalizeCountry(value: string) {\n  return value\n    .normalize("NFD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .toLowerCase()\n    .trim();\n}\n\nfunction getYear(\n`
);

// Users overview: feed buildProfileStats the exact same canonical version-first model.
const profilesPath = "app/profiles/page.tsx";
const profilesInput = read(profilesPath);
const formatDateIndex = profilesInput.indexOf("function formatDate(");
if (formatDateIndex < 0) {
  throw new Error("profiles page: formatDate boundary not found");
}

const profilesPrefix = `import Link from "next/link";\nimport { redirect } from "next/navigation";\n\nimport {\n  createClient,\n} from "@/lib/supabase/server";\n\nimport {\n  buildProfileStats,\n} from "@/lib/profileStats";\n\nimport PageHero from "@/components/ui/PageHero";\n\ntype ProfileRow = {\n  id: string;\n  display_name: string;\n  real_name: string | null;\n  avatar_url: string | null;\n};\n\ntype Relation<T> = T | T[] | null;\n\ntype BreweryRef = {\n  id: number;\n  country: string | null;\n};\n\ntype StyleRef = { id: number };\ntype BrandRef = { id: number };\ntype HopRow = { hops: Relation<{ id: number }> };\n\ntype RawTastingRow = {\n  user_id: string;\n  quantity: number | null;\n  tasted_on: string | null;\n  tasted_at: string | null;\n  plato: number | null;\n  abv: number | null;\n  ibu: number | null;\n  beer_versions: Relation<{\n    breweries: Relation<BreweryRef>;\n    beer_styles: Relation<StyleRef>;\n    beer_version_hops: HopRow[] | null;\n  }>;\n  beers: Relation<{\n    id: number;\n    name: string;\n    brands: Relation<BrandRef>;\n    breweries: Relation<BreweryRef>;\n    beer_styles: Relation<StyleRef>;\n    beer_hops: HopRow[] | null;\n  }>;\n};\n\ntype NormalizedHopRow = { hops: { id: number } | null };\n\ntype NormalizedTasting = {\n  quantity: number | null;\n  tasted_on: string | null;\n  tasted_at: string | null;\n  plato: number | null;\n  abv: number | null;\n  ibu: number | null;\n  beer_versions: {\n    breweries: BreweryRef | null;\n    beer_styles: StyleRef | null;\n    beer_version_hops: NormalizedHopRow[] | null;\n  } | null;\n  beers: {\n    id: number;\n    name: string;\n    brands: BrandRef | null;\n    breweries: BreweryRef | null;\n    beer_styles: StyleRef | null;\n    beer_hops: NormalizedHopRow[] | null;\n  } | null;\n};\n\nfunction singleRelation<T>(value: Relation<T>): T | null {\n  if (Array.isArray(value)) {\n    return value[0] ?? null;\n  }\n  return value ?? null;\n}\n\nfunction normalizeHopRows(rows: HopRow[] | null): NormalizedHopRow[] {\n  return (rows ?? []).map((row) => ({\n    hops: singleRelation(row.hops),\n  }));\n}\n\nfunction normalizeTasting(tasting: RawTastingRow): NormalizedTasting {\n  const beer = singleRelation(tasting.beers);\n  const version = singleRelation(tasting.beer_versions);\n\n  return {\n    quantity: tasting.quantity,\n    tasted_on: tasting.tasted_on,\n    tasted_at: tasting.tasted_at,\n    plato: tasting.plato,\n    abv: tasting.abv,\n    ibu: tasting.ibu,\n    beer_versions: version\n      ? {\n          breweries: singleRelation(version.breweries),\n          beer_styles: singleRelation(version.beer_styles),\n          beer_version_hops: normalizeHopRows(version.beer_version_hops),\n        }\n      : null,\n    beers: beer\n      ? {\n          id: beer.id,\n          name: beer.name,\n          brands: singleRelation(beer.brands),\n          breweries: singleRelation(beer.breweries),\n          beer_styles: singleRelation(beer.beer_styles),\n          beer_hops: normalizeHopRows(beer.beer_hops),\n        }\n      : null,\n  };\n}\n\n`;

let profilesOutput = profilesPrefix + profilesInput.slice(formatDateIndex);

const oldSelect = `          ibu,\n          beers (\n            id,\n            name,\n            breweries (\n              id,\n              country\n            ),\n            beer_styles (\n              id\n            ),\n            beer_hops (\n              hops (\n                id\n              )\n            )\n          )\n`;
const newSelect = `          ibu,\n          beer_versions (\n            breweries (\n              id,\n              country\n            ),\n            beer_styles (\n              id\n            ),\n            beer_version_hops (\n              hops (\n                id\n              )\n            )\n          ),\n          beers (\n            id,\n            name,\n            brands (\n              id\n            ),\n            breweries (\n              id,\n              country\n            ),\n            beer_styles (\n              id\n            ),\n            beer_hops (\n              hops (\n                id\n              )\n            )\n          )\n`;
if (!profilesOutput.includes(oldSelect)) {
  throw new Error("profiles page: tasting select target not found");
}
profilesOutput = profilesOutput.replace(oldSelect, newSelect);
write(profilesPath, profilesOutput);

console.log("Pre-import follow-up applied.");
