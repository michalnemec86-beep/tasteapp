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
    throw new Error(`${path}: expected 1 exact match, found ${count}`);
  }
  write(path, input.replace(from, to));
}

function replaceRegex(path, regex, to, expected = 1) {
  const input = read(path);
  const matches = [...input.matchAll(regex)];
  if (matches.length !== expected) {
    throw new Error(`${path}: expected ${expected} regex matches, found ${matches.length}: ${regex}`);
  }
  write(path, input.replace(regex, to));
}

function replaceLast(path, from, to) {
  const input = read(path);
  const index = input.lastIndexOf(from);
  if (index < 0) {
    throw new Error(`${path}: last-match text not found`);
  }
  write(path, input.slice(0, index) + to + input.slice(index + from.length));
}

// 1) Remove standalone beer catalog from navigation. Detail routes remain available.
replaceOne(
  "app/AppNav.tsx",
  `          <NavLink href="/beers" active={isActive("/beers")}>
            Katalog piv
          </NavLink>
`,
  ""
);

// 2) Users page: remove hero KPI strip.
replaceRegex(
  "app/profiles/page.tsx",
  /\nimport AppIcon from "@\/components\/ui\/AppIcon";\n/,
  "\n"
);
replaceRegex(
  "app/profiles/page.tsx",
  /\n  const activeProfiles =[\s\S]*?\n  const totalQuantity =[\s\S]*?\n  return \(/,
  "\n  return ("
);
replaceRegex(
  "app/profiles/page.tsx",
  /\n        stats=\{\[[\s\S]*?\n        \]\}\n/,
  "\n"
);

// 4) Existing tasting edit modal: remove place field only.
replaceOne(
  "app/EditTastingModalClient.tsx",
  `              {/* MÍSTO */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Místo
                </label>

                <input
                  name="place"
                  defaultValue={
                    tasting.place ?? ""
                  }
                  style={inputStyle}
                />
              </div>

`,
  ""
);
// Preserve existing place when editing, because the field is intentionally absent.
replaceLast(
  "app/tastings/actions.ts",
  `        place:
          values.place ||
          null,
`,
  ""
);
// Removed standalone catalogue no longer needs explicit revalidation.
replaceOne(
  "app/tastings/actions.ts",
  `  revalidatePath("/beers");\n`,
  ""
);

// 7) Route loading cursor.
replaceOne(
  "app/loading.tsx",
  `    <main
      aria-busy="true"`,
  `    <main
      className="taste-route-loading"
      aria-busy="true"`
);
replaceOne(
  "app/layout.tsx",
  `import "./homepage-timeline-theme.css";\n`,
  `import "./homepage-timeline-theme.css";\nimport "./preimport-ui-tweaks.css";\n`
);

// 8) Medals: central feature switch prevents writes and hides profile journeys.
replaceOne(
  "lib/achievement-sync.ts",
  `import {\n  createClient,\n} from "@/lib/supabase/server";\n`,
  `import {\n  createClient,\n} from "@/lib/supabase/server";\nimport { FEATURES } from "@/lib/features";\n`
);
replaceOne(
  "lib/achievement-sync.ts",
  `export async function syncUserAchievements(\n  userId: string\n) {\n`,
  `export async function syncUserAchievements(\n  userId: string\n) {\n  if (!FEATURES.achievements) {\n    return [];\n  }\n\n`
);
replaceOne(
  "app/profiles/[id]/ProfileAchievementJourneys.tsx",
  `import type {\n  AchievementMedal,`,
  `import { FEATURES } from "@/lib/features";\n\nimport type {\n  AchievementMedal,`
);
replaceRegex(
  "app/profiles/[id]/ProfileAchievementJourneys.tsx",
  /(export default function ProfileAchievementJourneys\([\s\S]*?\) \{\n)/,
  `$1  if (!FEATURES.achievements) {\n    return null;\n  }\n\n`
);

// 3/5/6/10) Main statistics: brands become real brands, canonical brewery comes from version.
replaceOne(
  "app/stats/page.tsx",
  `          beer_versions (\n            beer_styles (`,
  `          beer_versions (\n            breweries (\n              id,\n              name,\n              country\n            ),\n            beer_styles (`
);
replaceOne(
  "app/stats/page.tsx",
  `          beers (\n            id,\n            name,\n            breweries (`,
  `          beers (\n            id,\n            name,\n            brands (\n              id,\n              name\n            ),\n            breweries (`
);
replaceOne(
  "app/stats/page.tsx",
  `              ...beerVersion,\n              beer_styles: singleRelation(`,
  `              ...beerVersion,\n              breweries: singleRelation(\n                beerVersion.breweries\n              ),\n              beer_styles: singleRelation(`
);
replaceOne(
  "app/stats/page.tsx",
  `              ...beer,\n              breweries: singleRelation(`,
  `              ...beer,\n              brands: singleRelation(\n                beer.brands\n              ),\n              breweries: singleRelation(`
);
replaceOne(
  "app/stats/page.tsx",
  `  const stats = {\n    brands: sortRanking(rawStats.brands, sortMode),`,
  `  const stats = {\n    beers: sortRanking(rawStats.beers, sortMode),\n    brands: sortRanking(rawStats.brands, sortMode),`
);
replaceRegex(
  "app/stats/page.tsx",
  /  const totalBrands = new Set\([\s\S]*?\n  const totalBreweries = new Set\([\s\S]*?\n  \)\.size;\n/,
  `  const totalBeers = new Set(\n    filteredTastings\n      .map((tasting) => tasting.beers?.id)\n      .filter((id) => id != null)\n  ).size;\n\n  const totalBrands = new Set(\n    filteredTastings\n      .map((tasting) => tasting.beers?.brands?.id)\n      .filter((id) => id != null)\n  ).size;\n\n  const totalBreweries = new Set(\n    filteredTastings\n      .map((tasting) =>\n        tasting.beer_versions?.breweries?.id ??\n        tasting.beers?.breweries?.id\n      )\n      .filter((id) => id != null)\n  ).size;\n`
);
replaceRegex(
  "app/stats/page.tsx",
  /  const totalCountries = new Set\([\s\S]*?\n  \)\.size;\n/,
  `  const totalCountries = new Set(\n    filteredTastings\n      .map((tasting) =>\n        (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)\n          ?.country\n          ?.normalize("NFD")\n          .replace(/[\\u0300-\\u036f]/g, "")\n          .toLowerCase()\n          .trim()\n      )\n      .filter(Boolean)\n  ).size;\n`
);
replaceOne(
  "app/stats/page.tsx",
  `        subtitle="Podívej se na svůj pivní svět v číslech. Piva, pivovary, styly, země i chmely na jednom místě a s přímými prokliky do katalogu."`,
  `        subtitle="Podívej se na svůj pivní svět v číslech. Piva, značky, pivovary, styly, země i chmely na jednom místě a s přímými prokliky na související data."`
);
replaceOne(
  "app/stats/page.tsx",
  `            value: totalBrands,\n            label: "Různých piv",`,
  `            value: totalBeers,\n            label: "Různých piv",`
);
replaceOne(
  "app/stats/page.tsx",
  `          {\n            icon: <AppIcon name="brewery" size={18} />,\n            accent: "#d65b42",`,
  `          {\n            icon: <AppIcon name="label" size={18} />,\n            accent: "#d98a43",\n            value: totalBrands,\n            label: "Značek",\n          },\n          {\n            icon: <AppIcon name="brewery" size={18} />,\n            accent: "#d65b42",`
);
replaceOne(
  "app/stats/page.tsx",
  `            items={stats.brands}\n          />\n\n          <RankingCardClient\n            title="Pivovary"`,
  `            items={stats.beers}\n          />\n\n          <RankingCardClient\n            title="Značky"\n            tone="honey"\n            subtitle="Produktové značky napříč pivovary a historií"\n            icon={<AppIcon name="label" size={20} />}\n            items={stats.brands}\n            itemHrefPrefix="/brands"\n          />\n\n          <RankingCardClient\n            title="Pivovary"`
);

// Ranking destinations no longer rely on the removed /beers listing filters.
replaceRegex(
  "app/stats/RankingCardClient.tsx",
  /  switch \(title\) \{[\s\S]*?\n  \}\n\}/,
  `  switch (title) {\n    case "Piva":\n      return \`/beers/\${item.id}\`;\n    case "Značky":\n      return \`/brands/\${item.id}\`;\n    case "Pivní styly":\n      return \`/stats?style=\${encodeURIComponent(String(item.id))}\`;\n    case "Státy":\n      return \`/stats?country=\${encodeURIComponent(item.name)}\`;\n    case "Chmely":\n      return \`/stats?hop=\${encodeURIComponent(String(item.id))}\`;\n    default:\n      return null;\n  }\n}`
);
replaceOne(
  "app/stats/RankingCardClient.tsx",
  `                    textDecoration: "none",\n                    borderBottom: \`1px solid \${tone.softBorder}\`,`,
  `                    textDecoration: "none",`
);
replaceOne(
  "app/stats/RankingCardClient.tsx",
  `                  {item.name}\n                </Link>`,
  `                  {item.flag ? <span style={{ marginRight: "7px" }}>{item.flag}</span> : null}\n                  {item.name}\n                </Link>`
);
replaceOne(
  "app/stats/RankingCardClient.tsx",
  `                <div title={item.name} style={nameStyle}>\n                  {item.name}\n                </div>`,
  `                <div title={item.name} style={nameStyle}>\n                  {item.flag ? <span style={{ marginRight: "7px" }}>{item.flag}</span> : null}\n                  {item.name}\n                </div>`
);

// Homepage ranking links: no underline and optional flags.
replaceOne(
  "components/stats/StatsRankingCard.tsx",
  `                          textDecoration: "none",\n                          borderBottom:\n                            "1px solid rgba(231,166,47,0.28)",`,
  `                          textDecoration: "none",`
);
replaceOne(
  "components/stats/StatsRankingCard.tsx",
  `                        {item.name}\n                      </Link>`,
  `                        {item.flag ? <span style={{ marginRight: "6px" }}>{item.flag}</span> : null}\n                        {item.name}\n                      </Link>`
);
replaceOne(
  "components/stats/StatsRankingCard.tsx",
  `                      item.name\n                    )}`,
  `                      <>\n                        {item.flag ? <span style={{ marginRight: "6px" }}>{item.flag}</span> : null}\n                        {item.name}\n                      </>\n                    )}`
);

// Homepage data model + real brands.
replaceOne(
  "app/page.tsx",
  `  breweries:\n    | BreweryRow\n    | null;\n\n  beer_styles:`,
  `  brands:\n    | { id: number; name: string }\n    | null;\n\n  breweries:\n    | BreweryRow\n    | null;\n\n  beer_styles:`
);
replaceOne(
  "app/page.tsx",
  `        version_year: number | null;\n        beer_styles: BeerStyleRow | null;`,
  `        version_year: number | null;\n        breweries: BreweryRow | null;\n        beer_styles: BeerStyleRow | null;`
);
replaceOne(
  "app/page.tsx",
  `        beer_versions (\n          id,\n          version_year,\n          beer_styles (`,
  `        beer_versions (\n          id,\n          version_year,\n          breweries (\n            id,\n            name,\n            country\n          ),\n          beer_styles (`
);
replaceOne(
  "app/page.tsx",
  `          id,\n          name,\n          beer_versions (`,
  `          id,\n          name,\n          brands (\n            id,\n            name\n          ),\n          beer_versions (`
);
replaceRegex(
  "app/page.tsx",
  /  const totalBrands =[\s\S]*?\n  const totalBreweries =[\s\S]*?\n    \)\.size;\n/,
  `  const totalBeers = new Set(\n    allTastings.map((tasting) => tasting.beers?.id).filter((id) => id != null)\n  ).size;\n\n  const totalBrands = new Set(\n    allTastings.map((tasting) => tasting.beers?.brands?.id).filter((id) => id != null)\n  ).size;\n\n  const totalBreweries = new Set(\n    allTastings\n      .map((tasting) => tasting.beer_versions?.breweries?.id ?? tasting.beers?.breweries?.id)\n      .filter((id) => id != null)\n  ).size;\n`
);
replaceRegex(
  "app/page.tsx",
  /  const totalStyles =[\s\S]*?\n    \)\.size;\n\n  const totalCountries = new Set\([\s\S]*?\n    \)\.size;/,
  `  const totalStyles = new Set(\n    allTastings\n      .map((tasting) => (tasting.beer_versions?.beer_styles ?? tasting.beers?.beer_styles)?.id)\n      .filter((id) => id != null)\n  ).size;\n\n  const totalCountries = new Set(\n    allTastings\n      .map((tasting) => (tasting.beer_versions?.breweries ?? tasting.beers?.breweries)?.country\n        ?.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim())\n      .filter(Boolean)\n  ).size;`
);
replaceOne(
  "app/page.tsx",
  `          {\n            icon: (\n              <AppIcon\n                name="brewery"`,
  `          {\n            icon: (\n              <AppIcon\n                name="label"\n                size={18}\n              />\n            ),\n            accent: "#d98a43",\n            value: totalBeers,\n            label: "Různých piv",\n          },\n          {\n            icon: (\n              <AppIcon\n                name="label"\n                size={18}\n              />\n            ),\n            accent: "#c46f38",\n            value: totalBrands,\n            label: "Značek",\n          },\n          {\n            icon: (\n              <AppIcon\n                name="brewery"`
);
replaceOne(
  "app/page.tsx",
  `          <StatsRankingCard\n            title="Nejčastější piva"\n            subtitle="Konkrétní značky"`,
  `          <StatsRankingCard\n            title="Nejčastější piva"\n            subtitle="Konkrétní piva"`
);
replaceOne(
  "app/page.tsx",
  `            items={\n              globalStats.brands\n            }\n          />`,
  `            items={\n              globalStats.beers\n            }\n            getItemHref={(item) => \`/beers/\${item.id}\`}\n          />\n\n          <StatsRankingCard\n            title="Značky"\n            subtitle="Nejčastější produktové značky"\n            icon={<AppIcon name="label" size={20} />}\n            accent="#d98a43"\n            items={globalStats.brands}\n            getItemHref={(item) => \`/brands/\${item.id}\`}\n          />`
);
replaceOne(
  "app/page.tsx",
  `            items={\n              globalStats.countries\n            }\n          />`,
  `            items={\n              globalStats.countries\n            }\n            getItemHref={(item) => \`/stats?country=\${encodeURIComponent(item.name)}\`}\n          />`
);
replaceOne(
  "app/page.tsx",
  `  const breweryName =\n    tasting.beers\n      ?.breweries\n      ?.name ??\n    null;\n\n  const breweryId =\n    tasting.beers\n      ?.breweries\n      ?.id ??\n    null;`,
  `  const tastingBrewery = tasting.beer_versions?.breweries ?? tasting.beers?.breweries ?? null;\n\n  const breweryName = tastingBrewery?.name ?? null;\n  const breweryId = tastingBrewery?.id ?? null;`
);
replaceOne(
  "app/page.tsx",
  `    tasting.beers\n      ?.breweries\n      ?.country ??\n      null,`,
  `    tastingBrewery?.country ?? null,`
);
replaceOne(
  "app/page.tsx",
  `                            textDecoration:\n                              "none",\n                            borderBottom:\n                              \`1px solid \${visual.border}\`,`,
  `                            textDecoration:\n                              "none",`
);
replaceOne(
  "app/page.tsx",
  `                        {" – "}\n                        {beerName}`,
  `                        {" – "}\n                        {tasting.beers?.id ? (\n                          <Link href={\`/beers/\${tasting.beers.id}\`} className="taste-entity-link" style={{ color: "inherit" }}>\n                            {beerName}\n                          </Link>\n                        ) : beerName}`
);

// Personal profile: brand relation + version brewery + brand cards/stat.
replaceOne(
  "app/profiles/[id]/page.tsx",
  `import ProfileBreweriesCard from "./ProfileBreweriesCard";`,
  `import ProfileBreweriesCard from "./ProfileBreweriesCard";\nimport ProfileBrandsCard from "./ProfileBrandsCard";`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `          version_year,\n          beer_styles (`,
  `          version_year,\n          breweries (\n            id,\n            name,\n            country\n          ),\n          beer_styles (`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `          id,\n          name,\n          breweries (`,
  `          id,\n          name,\n          brands (\n            id,\n            name\n          ),\n          breweries (`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                  ...beerVersion,\n                  beer_styles:`,
  `                  ...beerVersion,\n                  breweries:\n                    singleRelation(\n                      beerVersion.breweries\n                    ),\n                  beer_styles:`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                ...beer,\n\n                breweries:`,
  `                ...beer,\n\n                brands:\n                  singleRelation(\n                    beer.brands\n                  ),\n\n                breweries:`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `    {\n      label: "Top pivovar",`,
  `    {\n      label: "Top značka",\n      value:\n        tasteStats.brands[0]\n          ?.name ?? "—",\n      detail:\n        tasteStats.brands[0]\n          ? \`\${tasteStats.brands[0].count}× v ochutnávkách\`\n          : "Zatím bez dat",\n      accent: "#d98a43",\n      border: "rgba(217,138,67,0.38)",\n      glow: "rgba(217,138,67,0.16)",\n      wash: "rgba(217,138,67,0.075)",\n    },\n    {\n      label: "Top pivovar",`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `          {\n            icon: (\n              <AppIcon\n                name="brewery"`,
  `          {\n            icon: (\n              <AppIcon\n                name="label"\n                size={18}\n              />\n            ),\n            accent: "#d98945",\n            value: profileStats.uniqueBrands,\n            label: "Značek",\n          },\n          {\n            icon: (\n              <AppIcon\n                name="brewery"`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `      <ProfileBreweriesCard\n        items={\n          tasteStats.breweries\n        }\n      />`,
  `      <ProfileBrandsCard\n        items={tasteStats.brands}\n      />\n\n      <ProfileBreweriesCard\n        items={\n          tasteStats.breweries\n        }\n      />`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                        <div\n                          style={{\n                            color:\n                              "var(--taste-text)",`,
  `                        <div\n                          style={{\n                            color:\n                              "var(--taste-text)",`
); // anchor sanity check only
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                          {tasting\n                            .beers\n                            ?.name ??\n                            "Neznámé pivo"}`,
  `                          {tasting.beers?.id ? (\n                            <Link href={\`/beers/\${tasting.beers.id}\`} className="taste-entity-link" style={{ color: "inherit" }}>\n                              {tasting.beers.name}\n                            </Link>\n                          ) : "Neznámé pivo"}`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                        {tasting.beers?.breweries ? (\n                          <Link\n                            href={\`/breweries/\${tasting.beers.breweries.id}\`}\n                            style={{\n                              color: "inherit",\n                              textDecoration:\n                                "none",\n                              borderBottom:\n                                "1px solid rgba(231,166,47,0.28)",\n                            }}\n                          >\n                            {tasting.beers.breweries.name}\n                          </Link>\n                        ) : (\n                          "Neznámý pivovar"\n                        )}`, 
  `                        {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries) ? (\n                          <Link\n                            href={\`/breweries/\${(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.id}\`}\n                            className="taste-entity-link"\n                            style={{ color: "inherit" }}\n                          >\n                            {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.name}\n                          </Link>\n                        ) : (\n                          "Neznámý pivovar"\n                        )}`
);
replaceOne(
  "app/profiles/[id]/page.tsx",
  `                        {tasting\n                          .beers\n                          ?.breweries\n                          ?.country\n                          ? \` · \${tasting.beers.breweries.country}\`\n                          : ""}`,
  `                        {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)?.country\n                          ? \` · \${(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.country}\`\n                          : ""}`
);

// Country profile list: flag + logical link.
replaceOne(
  "app/profiles/[id]/ProfileWorldCard.tsx",
  `import BeerWorldMap from "@/app/stats/BeerWorldMap";`,
  `import Link from "next/link";\nimport BeerWorldMap from "@/app/stats/BeerWorldMap";`
);
replaceOne(
  "app/profiles/[id]/ProfileWorldCard.tsx",
  `                        <div\n                          style={{\n                            overflow:\n                              "hidden",`,
  `                        <Link\n                          href={\`/stats?country=\${encodeURIComponent(item.name)}\`}\n                          className="taste-entity-link"\n                          style={{\n                            overflow:\n                              "hidden",`
);
replaceOne(
  "app/profiles/[id]/ProfileWorldCard.tsx",
  `                        >\n                          {\n                            item.name\n                          }\n                        </div>`,
  `                        >\n                          {item.flag ? <span style={{ marginRight: "7px" }}>{item.flag}</span> : null}\n                          {item.name}\n                        </Link>`
);

console.log("Pre-import UI cleanup patch applied.");
