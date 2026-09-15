const fs = require('fs');
const path = require('path');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function replaceOne(file, from, to) {
  const input = read(file);
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected 1 match, got ${count}`);
  write(file, input.replace(from, to));
}

// Beer detail: non-alcoholic badge + style detail links.
replaceOne('app/beers/[id]/page.tsx',
`      id, name, plato, abv, ibu,\n`,
`      id, name, plato, abv, ibu, is_non_alcoholic,\n`);
replaceOne('app/beers/[id]/page.tsx',
`    ibu: number | null;\n    brands: Relation<{ id: number; name: string }>;\n`,
`    ibu: number | null;\n    is_non_alcoholic: boolean;\n    brands: Relation<{ id: number; name: string }>;\n`);
replaceOne('app/beers/[id]/page.tsx',
`          {style && <Link className="taste-entity-link" href={\`/stats?style=\${style.id}\`}>Styl: <strong>{style.name}</strong></Link>}\n`,
`          {style && <Link className="taste-entity-link" href={\`/styles/\${style.id}\`}>Styl: <strong>{style.name}</strong></Link>}\n          {beer.is_non_alcoholic && <span style={{ padding: "3px 8px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "10px", fontWeight: 800 }}>NEALKO</span>}\n`);
replaceOne('app/beers/[id]/page.tsx',
`                  {version.beer_styles ? <> · <Link className="taste-entity-link" href={\`/stats?style=\${version.beer_styles.id}\`}>{version.beer_styles.name}</Link></> : null}\n`,
`                  {version.beer_styles ? <> · <Link className="taste-entity-link" href={\`/styles/\${version.beer_styles.id}\`}>{version.beer_styles.name}</Link></> : null}\n`);

// Brewery detail: pass/display non-alcoholic property for catalog edit.
replaceOne('app/breweries/[id]/page.tsx',
`        ibu,\n        beer_styles (\n`,
`        ibu,\n        is_non_alcoholic,\n        beer_styles (\n`);
replaceOne('app/breweries/[id]/page.tsx',
`                          ibu:\n                            beer.ibu,\n                          styleName:\n`,
`                          ibu:\n                            beer.ibu,\n                          isNonAlcoholic:\n                            beer.is_non_alcoholic,\n                          styleName:\n`);
replaceOne('app/breweries/[id]/page.tsx',
`                        {beer.beer_styles?.name && (\n`,
`                        {beer.is_non_alcoholic && (\n                          <span style={{ padding: "2px 6px", borderRadius: "999px", background: "rgba(156,173,71,0.12)", color: "#9cad47", fontSize: "9px", fontWeight: 800 }}>NEALKO</span>\n                        )}\n\n                        {beer.beer_styles?.name && (\n`);

// Catalog edit modal: editable non-alcoholic flag.
replaceOne('app/breweries/CatalogBeerEditModalClient.tsx',
`  ibu: number | null;\n  styleName: string;\n`,
`  ibu: number | null;\n  isNonAlcoholic: boolean;\n  styleName: string;\n`);
replaceOne('app/breweries/CatalogBeerEditModalClient.tsx',
`  const [\n    selectedHops,\n`,
`  const [isNonAlcoholic, setIsNonAlcoholic] = useState(beer.isNonAlcoholic);\n\n  const [\n    selectedHops,\n`);
replaceOne('app/breweries/CatalogBeerEditModalClient.tsx',
`    setSelectedHops(\n      beer.hopNames\n    );\n`,
`    setIsNonAlcoholic(beer.isNonAlcoholic);\n\n    setSelectedHops(\n      beer.hopNames\n    );\n`);
replaceOne('app/breweries/CatalogBeerEditModalClient.tsx',
`                <div\n                  style={\n                    fieldStyle\n                  }\n                >\n                  <label\n                    style={\n                      labelStyle\n                    }\n                  >\n                    Chmely\n                  </label>\n`,
`                <label style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>\n                  <input name="isNonAlcoholic" type="checkbox" checked={isNonAlcoholic} onChange={(event) => setIsNonAlcoholic(event.target.checked)} />\n                  <span><strong style={{ color: "var(--taste-text)" }}>Nealkoholické pivo</strong><br /><span style={{ color: "var(--taste-text-muted)", fontSize: "10px" }}>Příznak lze změnit i zpětně v katalogu.</span></span>\n                </label>\n\n                <div\n                  style={\n                    fieldStyle\n                  }\n                >\n                  <label\n                    style={\n                      labelStyle\n                    }\n                  >\n                    Chmely\n                  </label>\n`);

// Catalog update action: persist non-alcoholic flag and preserve it on rollback.
replaceOne('app/breweries/actions.ts',
`  const hopNames =\n    readCatalogBeerHopNames(\n      formData\n    );\n\n  if (!name) {\n`,
`  const hopNames =\n    readCatalogBeerHopNames(\n      formData\n    );\n\n  const isNonAlcoholic = formData.get("isNonAlcoholic") === "on";\n\n  if (!name) {\n`);
replaceOne('app/breweries/actions.ts',
`      abv,\n      ibu\n    \`)\n`,
`      abv,\n      ibu,\n      is_non_alcoholic\n    \`)\n`);
replaceOne('app/breweries/actions.ts',
`      abv,\n      ibu,\n    })\n`,
`      abv,\n      ibu,\n      is_non_alcoholic: isNonAlcoholic,\n    })\n`);
replaceOne('app/breweries/actions.ts',
`        ibu:\n          existingBeer.ibu,\n      })\n`,
`        ibu:\n          existingBeer.ibu,\n        is_non_alcoholic:\n          existingBeer.is_non_alcoholic,\n      })\n`);

console.log('Post-tech fixes applied.');
