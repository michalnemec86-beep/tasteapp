import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
function load(relative) {
  const filename = path.resolve(root, relative);
  const sourceModule = new Module(filename);
  const require = Module.createRequire(filename);
  sourceModule.require = name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name);
  sourceModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return sourceModule.exports;
}
const { buildProfileStats } = load('lib/profileStats.ts');
const { buildTasteStats } = load('lib/stats.ts');
const { isBeerAvailableForTasting } = load('lib/beerPortfolio.ts');
const hop = id => ({ hops: { id, name: `Chmel ${id}` } });
const tasting = overrides => ({ user_id: 'me', quantity: 2, tasted_on: '2026-09-30',
  tasted_at: '2026-09-30T12:00:00Z', packaging: 'draft', plato: 12, abv: 5, ibu: 30,
  beers: { id: 1, name: 'Pivo', is_non_alcoholic: false, brands: { id: 10, name: 'Značka' },
    breweries: { id: 100, name: 'Identita', country: 'Česko' },
    beer_styles: { id: 1, name: 'Ležák' }, beer_hops: [hop(1)] },
  ...overrides });

test('quantities are summed while beers and brands remain unique across repeat tastings', () => {
  const rows = [tasting(), tasting({ quantity: 3 }), tasting({ user_id: 'other', quantity: 1 })];
  const profile = buildProfileStats(rows.slice(0, 2));
  assert.equal(profile.totalQuantity, 5);
  assert.equal(profile.uniqueBeers, 1);
  assert.equal(profile.uniqueBrands, 1);
  assert.equal(profile.uniqueBreweries, 1);
  assert.equal(profile.plato.count, 5);
  assert.equal(buildTasteStats(rows).beers[0].count, 6);
  assert.equal(buildTasteStats(rows, 'me').beers[0].count, 5);
});

test('historical tasting versions determine brewery, country, style and hops without changing brand identity', () => {
  const version = { breweries: { id: 200, name: 'Původní výrobce', country: 'Belgie' },
    beer_styles: { id: 2, name: 'Ale' }, beer_version_hops: [hop(2), hop(3)] };
  const rows = [tasting({ beer_versions: version })];
  const ranks = buildTasteStats(rows);
  assert.deepEqual(ranks.breweries.map(item => [item.id, item.count]), [[200, 2]]);
  assert.deepEqual(ranks.countries.map(item => [item.name, item.count]), [['Belgie', 2]]);
  assert.deepEqual(ranks.styles.map(item => item.id), [2]);
  assert.deepEqual(ranks.hops.map(item => item.id).sort(), [2, 3]);
  assert.deepEqual(ranks.brands.map(item => item.id), [10]);
  const profile = buildProfileStats(rows);
  assert.equal(profile.uniqueHops, 2);
  assert.equal(profile.uniqueCountries, 1);
  assert.equal(profile.uniqueBreweries, 1);
});

test('numeric statistics are weighted by quantity, exclude unknown numbers and handle nonalcoholic beer', () => {
  const rows = [tasting({ quantity: 1, abv: 4 }), tasting({ quantity: 3, abv: 8 }),
    tasting({ quantity: 10, abv: null, plato: null, ibu: null }),
    tasting({ quantity: 2, abv: 0, beers: { ...tasting().beers, is_non_alcoholic: true } })];
  const profile = buildProfileStats(rows);
  assert.equal(profile.abv.average, 7);
  assert.equal(profile.abv.count, 4);
  assert.equal(profile.abv.min, 4);
  assert.equal(profile.abv.max, 8);
  assert.equal(profile.strongestBeer.value, 8);
  assert.equal(profile.totalQuantity, 16);
  assert.equal(profile.monthlyActivity.at(-1).count, 16);
});

test('historical/discontinued beers and closed breweries cannot be selected for a new tasting', () => {
  for (const status of ['active', 'seasonal', 'limited']) assert.equal(isBeerAvailableForTasting(status, null), true);
  for (const status of ['historical', 'discontinued']) assert.equal(isBeerAvailableForTasting(status, null), false);
  assert.equal(isBeerAvailableForTasting('active', 2026), false);
});
