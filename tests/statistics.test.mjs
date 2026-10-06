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
const { buildProfileStats, getTastingDate } = load('lib/profileStats.ts');
const { filterBeerCatalogItems, getBeerCatalogFacets } = load('lib/beer-catalog-page.ts');
const { buildProfileHistoryOverview } = load('lib/profileHistoryOverview.ts');
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


test('lightweight profile history overview preserves headline counts and historical dimensions', () => {
  const rows = [
    {
      quantity: 2,
      tasted_on: '2026-09-30',
      tasted_at: '2026-09-30T12:00:00Z',
      beer_version_id: 500,
      beers: {
        id: 1,
        brand_id: 10,
        brewery_id: 100,
        style_id: 1,
        breweries: { id: 100, country: 'Česko' },
      },
      beer_versions: {
        id: 500,
        brewery_id: 200,
        style_id: 2,
        breweries: { id: 200, country: 'Belgie' },
      },
    },
    {
      quantity: 3,
      tasted_on: '2026-10-01',
      tasted_at: '2026-10-01T12:00:00Z',
      beer_version_id: null,
      beers: {
        id: 2,
        brand_id: 11,
        brewery_id: 101,
        style_id: 3,
        breweries: { id: 101, country: 'Česko' },
      },
      beer_versions: null,
    },
  ];

  const overview = buildProfileHistoryOverview(rows, 4);

  assert.equal(overview.totalQuantity, 5);
  assert.equal(overview.uniqueBeers, 2);
  assert.equal(overview.uniqueBrands, 2);
  assert.equal(overview.uniqueBreweries, 2);
  assert.equal(overview.uniqueStyles, 2);
  assert.equal(overview.uniqueCountries, 2);
  assert.equal(overview.uniqueHops, 4);
  assert.equal(overview.firstTasting, '2026-09-30');
  assert.equal(overview.lastTasting, '2026-10-01');
  assert.deepEqual(
    overview.monthlyActivity.map(item => [item.key, item.count]),
    [['2026-09', 2], ['2026-10', 3]]
  );
});


test('activity stats preserve visible rankings when hop relations are omitted', () => {
  const rows = [
    {
      user_id: 'one',
      quantity: 2,
      packaging: 'draft',
      beers: {
        id: 1,
        name: 'Pivo A',
        brands: { id: 10, name: 'Značka A' },
        breweries: { id: 100, name: 'Současný pivovar', country: 'Česko', logo_url: null },
        beer_styles: { id: 1, name: 'Ležák' },
      },
      beer_versions: {
        breweries: { id: 200, name: 'Historický výrobce', country: 'Belgie', logo_url: null },
        beer_styles: { id: 2, name: 'Ale' },
      },
    },
    {
      user_id: 'two',
      quantity: 1,
      packaging: 'bottle',
      beers: {
        id: 2,
        name: 'Pivo B',
        brands: { id: 11, name: 'Značka B' },
        breweries: { id: 101, name: 'Pivovar B', country: 'Česko', logo_url: null },
        beer_styles: { id: 1, name: 'Ležák' },
      },
      beer_versions: null,
    },
  ];

  const result = buildTasteStats(rows);

  assert.deepEqual(result.beers.map(item => [item.id, item.count]), [[1, 2], [2, 1]]);
  assert.deepEqual(result.brands.map(item => [item.id, item.count]), [[10, 2], [11, 1]]);
  assert.deepEqual(result.breweries.map(item => [item.id, item.count]), [[200, 2], [101, 1]]);
  assert.deepEqual(result.styles.map(item => [item.id, item.count]), [[2, 2], [1, 1]]);
  assert.deepEqual(result.countries.map(item => [item.name, item.count]), [['Belgie', 2], ['Česko', 1]]);
  assert.equal(result.hops.length, 0);
});


test('beer catalogue server paging preserves filters, personal counts and facets', () => {
  const beers = [
    {
      id: 1,
      name: 'Žatecká 12',
      brand: { id: 10, name: 'Značka A' },
      brewery: { id: 100, name: 'Pivovar A', country: 'Česko' },
      style: { id: 1, name: 'Ležák' },
      plato: 12,
      abv: 5,
      ibu: null,
      isNonAlcoholic: false,
      canTaste: true,
      hops: [{ id: 1, name: 'Žatecký poloraný červeňák' }],
      totalQuantity: 8,
      myQuantity: 3,
      referenceReady: true,
      referenceMissing: [],
    },
    {
      id: 2,
      name: 'Amber Ale',
      brand: { id: 11, name: 'Značka B' },
      brewery: { id: 101, name: 'Brewery B', country: 'Belgie' },
      style: { id: 2, name: 'Ale' },
      plato: 14,
      abv: 6,
      ibu: 30,
      isNonAlcoholic: false,
      canTaste: true,
      hops: [{ id: 2, name: 'Cascade' }],
      totalQuantity: 2,
      myQuantity: 0,
      referenceReady: true,
      referenceMissing: [],
    },
  ];

  assert.deepEqual(
    filterBeerCatalogItems(beers, {
      filter: 'mine',
      sort: 'most',
      search: '',
      country: '',
      letter: '',
    }).map(item => item.id),
    [1]
  );

  assert.deepEqual(
    filterBeerCatalogItems(beers, {
      filter: 'all',
      sort: 'alpha',
      search: 'cascade',
      country: '',
      letter: '',
    }).map(item => item.id),
    [2]
  );

  const facets = getBeerCatalogFacets(beers);
  assert.deepEqual(facets.countries, ['Belgie', 'Česko']);
  assert.deepEqual(facets.letters, ['A', 'Z']);
});

test('historical/discontinued beers and closed breweries cannot be selected for a new tasting', () => {
  for (const status of ['active', 'seasonal', 'limited']) assert.equal(isBeerAvailableForTasting(status, null), true);
  for (const status of ['historical', 'discontinued']) assert.equal(isBeerAvailableForTasting(status, null), false);
  assert.equal(isBeerAvailableForTasting('active', 2026), false);
});


test('diary chronology follows the displayed tasting date, including imported and backdated entries', () => {
  const rows = [
    tasting({ tasted_on: '2019-06-07', tasted_at: '2026-09-23T10:16:11Z' }),
    tasting({ tasted_on: '2025-05-28', tasted_at: '2026-09-23T10:16:11Z' }),
    tasting({ tasted_on: '2026-09-26', tasted_at: '2026-09-26T11:56:20Z' }),
  ];
  const newest = [...rows].sort((a, b) => Date.parse(getTastingDate(b)) - Date.parse(getTastingDate(a)));
  assert.deepEqual(newest.map(row => row.tasted_on), ['2026-09-26', '2025-05-28', '2019-06-07']);
  assert.equal(getTastingDate({ tasted_on: null, tasted_at: '2020-01-02T12:00:00Z' }), '2020-01-02');
  assert.equal(getTastingDate({ tasted_on: null, tasted_at: null }), null);
});
