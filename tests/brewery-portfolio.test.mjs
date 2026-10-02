import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
function load(relative, mocks = {}) {
  const filename = path.resolve(root, relative);
  const loaded = new Module(filename);
  const require = Module.createRequire(filename);
  loaded.require = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return {};
    if (name.startsWith('@/components/') || name.endsWith('Client') || name === './BreweryFocus' || name === './FocusedBeerDetails') return { __esModule: true, default: name };
    if (name.startsWith('../') && name.endsWith('actions')) return new Proxy({}, { get: () => () => {} });
    return name.startsWith('@/') ? load(name.slice(2) + '.ts', mocks) : require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const { loadBreweryPortfolio, selectPortfolioIds } = load('lib/brewery-portfolio.ts');
const options = { breweryId: 42, closedYear: null, userId: 'me', adminView: false, portfolio: 'current', beerId: null, brandId: null };
const brand = { id: 7, name: 'Značka' };
const beer = (id, status = 'active') => ({ id, name: `Pivo ${id}`, brewery_id: 42, brand_id: 7, brands: brand,
  portfolio_status: status, plato: 10, abv: 4, ibu: null, beer_styles: { id: 1, name: 'Ležák' }, beer_hops: [],
  beer_versions: [{ id: id * 10, is_current: false, brewery_id: 42, plato: 9 }, { id: id * 10 + 1, is_current: true, brewery_id: 42, plato: 12 }],
});
const fixtures = () => ({ beers: [beer(1), beer(2, 'historical'), beer(3, 'discontinued'), beer(4, 'seasonal'), beer(5, null)],
  tastings: [
    { id: 1, beer_id: 1, quantity: 3, user_id: 'me', tasted_on: '2026-09-02' },
    { id: 2, beer_id: 1, quantity: null, user_id: 'other', tasted_on: '2026-09-02' },
    { id: 3, beer_id: 2, quantity: 4, user_id: 'me', tasted_on: '2026-09-02' },
    { id: 4, beer_id: 3, quantity: 2, user_id: 'me', tasted_on: '2026-08-31' },
  ] });
function client(db, fail = () => false) {
  const calls = [];
  const supabase = { calls, from(table) {
    const call = { table, filters: [], from: 0, to: Infinity };
    const q = {
      select(select) { call.select = select; return this; },
      in(field, values) { call.filters.push(['in', field, values]); return this; },
      eq(field, value) { call.filters.push(['eq', field, value]); return this; },
      gte(field, value) { call.filters.push(['gte', field, value]); return this; },
      order() { return this; },
      range(from, to) { call.from = from; call.to = to; return this; },
      single() { call.single = true; return this; },
      then(resolve, reject) {
        calls.push(call);
        if (fail(call)) return Promise.resolve({ data: null, error: { message: 'Read failed' } }).then(resolve, reject);
        let rows = (db[table] ?? []).filter(row => call.filters.every(([op, field, value]) => field.includes('.') ||
          (op === 'in' ? value.includes(row[field]) : op === 'gte' ? row[field] >= value : row[field] === value)));
        rows = rows.slice(call.from, call.to + 1).map(row => {
          if (table !== 'beers') return row;
          return { ...row, version_count: [{ count: row.beer_versions.length }], beer_versions: call.filters.some(([, f]) => f === 'beer_versions.is_current')
            ? row.beer_versions.filter(v => v.is_current) : row.beer_versions };
        });
        return Promise.resolve({ data: call.single ? rows[0] : rows, error: null }).then(resolve, reject);
      },
    };
    return q;
  } };
  return supabase;
}
const idsForDetails = calls => calls.filter(c => c.table === 'beers' && c.select.includes('version_count:')).flatMap(c => c.filters.find(([, f]) => f === 'id')[2]);

test('default brewery reads only current recipes, but quantities and identities still include history', async () => {
  const db = fixtures(), supabase = client(db);
  const result = await loadBreweryPortfolio(supabase, db.beers, options);
  assert.deepEqual(idsForDetails(supabase.calls), [1, 4, 5]);
  assert.equal(supabase.calls.length, 3, 'small portfolios need one totals, one detail, one editability read');
  assert.equal(result.totalBeerCount, 5);
  assert.equal(result.consumedBeerCount, 10);
  const first = result.visibleBeers[0];
  assert.equal(first.tastingCount, 2);
  assert.equal(first.totalQuantity, 4);
  assert.equal(first.plato, 12);
  assert.equal(first.versionCount, 2);
  assert.equal(first.beer_versions.length, 1);
  assert.equal(first.canEdit, true);
  assert.equal(result.visibleBeers[1].canEdit, false);
});

test('history is read on explicit selection; closed breweries have no current rows', async () => {
  const db = fixtures(), historyClient = client(db);
  const result = await loadBreweryPortfolio(historyClient, db.beers, { ...options, portfolio: 'historical' });
  assert.deepEqual(idsForDetails(historyClient.calls), [2, 3]);
  assert.ok(result.visibleBeers.every(row => row.isHistorical && !row.canEdit));
  assert.equal(historyClient.calls.length, 2, 'passive rows do not query editing eligibility');
  assert.deepEqual(selectPortfolioIds(db.beers, { ...options, closedYear: 2000 }), []);
  const closed = await loadBreweryPortfolio(client(db), db.beers, { ...options, closedYear: 2000, portfolio: 'all', adminView: true });
  assert.equal(closed.visibleBeers.length, 5);
  assert.ok(closed.visibleBeers.every(row => row.isHistorical && row.canEdit));
});

test('diary deep links read only the requested historical beer; contextual quantities do not inflate brewery totals', async () => {
  const db = fixtures(), supabase = client(db);
  await loadBreweryPortfolio(supabase, db.beers, { ...options, portfolio: 'all', beerId: 2 });
  assert.deepEqual(idsForDetails(supabase.calls), [2]);
  const moved = { ...beer(99), brewery_id: 43 };
  moved.beer_versions[1].brewery_id = 43;
  db.beers.push(moved);
  db.tastings.push({ id: 5, beer_id: 99, quantity: 7, user_id: 'me', tasted_on: '2026-09-03' });
  const context = await loadBreweryPortfolio(client(db), db.beers.filter(b => b.id !== 99), { ...options, beerId: 99 });
  assert.equal(context.visibleBeers[0].totalQuantity, 7);
  assert.equal(context.visibleBeers[0].canEdit, false);
  assert.ok(context.contextualIds.has(99));
  assert.equal(context.totalBeerCount, 5);
  assert.equal(context.consumedBeerCount, 10);
  moved.beer_versions.forEach(v => { v.brewery_id = 43; });
  const unrelated = await loadBreweryPortfolio(client(db), db.beers.filter(b => b.id !== 99), { ...options, beerId: 99 });
  assert.equal(unrelated.visibleBeers.length, 0);
});

test('brand context excludes unrelated producers and deduplicates commissioned beers', async () => {
  const db = fixtures();
  db.beers[1].brand_id = 8; db.beers[1].brands = [{ id: 8, name: 'Druhá' }];
  db.beers.push({ ...beer(99), brewery_id: 43, beer_versions: [{ is_current: true, brewery_id: 43 }] });
  const index = db.beers.slice(0, 5);
  const result = await loadBreweryPortfolio(client(db), [...index, { ...index[0], isCommissionedForThisBrewery: true }], { ...options, brandId: 7 });
  assert.deepEqual(result.visibleBeers.map(row => row.id), [1, 3, 4, 5]);
  assert.equal(result.totalBeerCount, 5);
  assert.equal(result.visibleBeers[0].isCommissionedForThisBrewery, true);
  assert.equal(result.consumedBeerCount, 10);
});

test('large tasting totals are fully paged, and a failed later page rejects partial statistics', async () => {
  const db = { beers: [beer(1)], tastings: Array.from({ length: 1701 }, (_, id) => ({ id, beer_id: 1, quantity: 2 })) };
  const result = await loadBreweryPortfolio(client(db), db.beers, { ...options, adminView: true });
  assert.equal(result.consumedBeerCount, 3402);
  assert.equal(result.visibleBeers[0].tastingCount, 1701);
  await assert.rejects(loadBreweryPortfolio(client(db, c => c.table === 'tastings' && c.from === 1000), db.beers, options), /Read failed/);
});

test('bounded beer detail reads still include every selected identity across multiple pages', async () => {
  const db = { beers: Array.from({ length: 1103 }, (_, id) => beer(id + 1)), tastings: [] };
  const supabase = client(db);
  const result = await loadBreweryPortfolio(supabase, db.beers, { ...options, adminView: true });
  assert.equal(result.visibleBeers.length, 1103);
  assert.equal(new Set(result.visibleBeers.map(b => b.id)).size, 1103);
  assert.deepEqual(supabase.calls.filter(c => c.table === 'beers').map(c => [c.from, c.to]), [[0, 499], [500, 999], [1000, 1102]]);
});

test('brewery renders historical rows without navigation, keeps admin repairs and explicit diary details', async () => {
  const db = fixtures();
  db.breweries = [{ id: 42, name: 'Pivovar', country: 'Česko', closed_year: null, beers: db.beers, brewery_brands: [], brewery_name_history: [] }];
  let admin = false;
  const route = load('app/breweries/[id]/page.tsx', {
    'next/link': 'a',
    'next/navigation': { redirect: url => { throw new Error('redirect:' + url); }, notFound: () => { throw new Error('404'); } },
    '@/lib/supabase/server': { createClient: async () => ({ ...client(db), auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) } }) },
    '@/lib/adminView': { isCatalogAdminUser: () => admin, isAdminView: async () => admin },
  }).default;
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const render = query => route({ params: Promise.resolve({ id: '42' }), searchParams: Promise.resolve(query) });
  const tree = await render({ portfolio: 'all' });
  const nodes = flatten(tree);
  const historic = nodes.find(n => n.props?.id === 'beer-2');
  assert.equal(flatten(historic).filter(n => n.type === 'a').length, 0);
  assert.ok(flatten(nodes.find(n => n.props?.id === 'beer-1')).some(n => n.type === 'a' && n.props.prefetch === false));
  assert.ok(nodes.filter(n => n.props?.href?.startsWith('/breweries/42?portfolio=')).every(n => n.props.prefetch === false));
  admin = true;
  const adminHistoric = flatten(await render({ portfolio: 'historical' })).find(n => n.props?.id === 'beer-2');
  assert.ok(flatten(adminHistoric).some(n => n.type === '../CatalogBeerEditModalClient'));
  const focused = flatten(await render({ beer: '2', portfolio: 'all' }));
  assert.ok(focused.some(n => n.type === './FocusedBeerDetails' && n.props.beerId === 2));
  await assert.rejects(render({ beer: '999' }), /404/);
});
