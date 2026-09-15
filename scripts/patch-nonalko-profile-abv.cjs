const fs = require('fs');

function replaceOne(path, from, to) {
  const input = fs.readFileSync(path, 'utf8');
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected 1 match, got ${count}`);
  fs.writeFileSync(path, input.replace(from, to));
}

replaceOne(
  'app/profiles/[id]/page.tsx',
  `        beers (\n          id,\n          name,\n          brands (`,
  `        beers (\n          id,\n          name,\n          is_non_alcoholic,\n          brands (`
);

replaceOne(
  'app/profiles/page.tsx',
  `  beers: Relation<{\n    id: number;\n    name: string;\n    brands: Relation<BrandRef>;`,
  `  beers: Relation<{\n    id: number;\n    name: string;\n    is_non_alcoholic: boolean;\n    brands: Relation<BrandRef>;`
);

replaceOne(
  'app/profiles/page.tsx',
  `  beers: {\n    id: number;\n    name: string;\n    brands: BrandRef | null;`,
  `  beers: {\n    id: number;\n    name: string;\n    is_non_alcoholic: boolean;\n    brands: BrandRef | null;`
);

replaceOne(
  'app/profiles/page.tsx',
  `          id: beer.id,\n          name: beer.name,\n          brands: singleRelation(beer.brands),`,
  `          id: beer.id,\n          name: beer.name,\n          is_non_alcoholic: beer.is_non_alcoholic,\n          brands: singleRelation(beer.brands),`
);

replaceOne(
  'app/profiles/page.tsx',
  `          beers (\n            id,\n            name,\n            brands (`,
  `          beers (\n            id,\n            name,\n            is_non_alcoholic,\n            brands (`
);

replaceOne(
  'lib/profileStats.ts',
  `  beers: {\n    id: number;\n    name: string;\n    brands?: ProfileBrand | null;`,
  `  beers: {\n    id: number;\n    name: string;\n    is_non_alcoholic: boolean;\n    brands?: ProfileBrand | null;`
);

replaceOne(
  'lib/profileStats.ts',
  `  for (const tasting of tastings) {\n    const value = tasting[field];\n\n    if (value == null || !Number.isFinite(value)) {`,
  `  for (const tasting of tastings) {\n    if (field === "abv" && tasting.beers?.is_non_alcoholic) {\n      continue;\n    }\n\n    const value = tasting[field];\n\n    if (value == null || !Number.isFinite(value)) {`
);

replaceOne(
  'lib/profileStats.ts',
  `  for (const tasting of tastings) {\n    const value = tasting[field];\n    const beer = tasting.beers;\n\n    if (value == null || !Number.isFinite(value) || !beer) {`,
  `  for (const tasting of tastings) {\n    const beer = tasting.beers;\n\n    if (field === "abv" && beer?.is_non_alcoholic) {\n      continue;\n    }\n\n    const value = tasting[field];\n\n    if (value == null || !Number.isFinite(value) || !beer) {`
);

console.log('Non-alcoholic profile ABV patch applied.');
