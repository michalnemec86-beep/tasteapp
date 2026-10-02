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
  loaded.require = name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts', mocks) : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const navigation = load('lib/entity-navigation.ts');
const { getCatalogueMatch } = load('lib/catalogue-scope.ts');
const hop = id => ({ hops: { id } });

test('names have one destination across personal and global views, including escaped country names', () => {
  assert.equal(navigation.getRankingEntityHref('Pivovary', { id: 42, name: 'Pivovar' }), '/breweries/42');
  assert.equal(navigation.getRankingEntityHref('Pivní styly', { id: 7, name: 'IPA' }), '/beers?style=7');
  assert.equal(navigation.getRankingEntityHref('Chmely', { id: 8, name: 'Citra' }), '/beers?hop=8');
  assert.equal(navigation.countryHref('Bosna a Hercegovina'), '/stats/country/Bosna%20a%20Hercegovina');
  assert.equal(navigation.beerHref(10, 42), '/breweries/42?beer=10&portfolio=all#beer-10');
  assert.equal(navigation.brandHref(20, 42), '/breweries/42?brand=20&portfolio=all#brand-20');
});

test('historical filters find old recipes but combined filters never mix different versions', () => {
  const beer = { id: 1, beer_styles: { id: 1 }, beer_hops: [hop(1)], beer_versions: [
    { is_current: true, beer_styles: { id: 2 }, beer_version_hops: [hop(2)] },
    { is_current: false, beer_styles: { id: 3 }, beer_version_hops: [hop(3)] },
    { is_current: false, beer_styles: { id: 4 }, beer_version_hops: [hop(4)] },
  ] };
  assert.deepEqual(getCatalogueMatch(beer, { styleId: 3, hopId: 3 }), { matches: true, historicalOnly: true });
  assert.deepEqual(getCatalogueMatch(beer, { styleId: 3, hopId: 4 }), { matches: false, historicalOnly: false });
  assert.deepEqual(getCatalogueMatch(beer, { styleId: 2, hopId: 2 }), { matches: true, historicalOnly: false });
  assert.equal(getCatalogueMatch(beer, { beerId: 99 }).matches, false);
  assert.equal(getCatalogueMatch(beer, {}).matches, true);
});

test('versionless beers and array relations remain searchable; unknown hops are not invented', () => {
  const beer = { id: 1, beer_styles: [{ id: 1 }], beer_hops: [hop(7)] };
  assert.equal(getCatalogueMatch(beer, { styleId: 1, hopId: 7 }).matches, true);
  assert.equal(getCatalogueMatch({ ...beer, beer_hops: [] }, { hopId: 7 }).matches, false);
});

test('old beer URLs authenticate and redirect to the brewery; invalid and missing beers are 404', async () => {
  let authenticated = true;
  let result = { data: { id: 10, brewery_id: 42 }, error: null };
  let queries = 0;
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => result };
  const route = load('app/beers/[id]/page.tsx', {
    'next/navigation': { redirect: url => { throw new Error('redirect:' + url); }, notFound: () => { throw new Error('404'); } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'me' } : null } }) }, from: () => { queries++; return query; } }) },
  }).default;
  await assert.rejects(route({ params: Promise.resolve({ id: '10' }) }), /redirect:\/breweries\/42\?beer=10&portfolio=all#beer-10/);
  authenticated = false; queries = 0;
  await assert.rejects(route({ params: Promise.resolve({ id: '10' }) }), /redirect:\/auth\/login/);
  assert.equal(queries, 0);
  await assert.rejects(route({ params: Promise.resolve({ id: 'invalid' }) }), /404/);
  authenticated = true; result = { data: null, error: null };
  await assert.rejects(route({ params: Promise.resolve({ id: '999' }) }), /404/);
});

test('brand resolver preserves ambiguous producers and prefers the only open brewery', async () => {
  const db = {
    brands: { id: 20, name: 'Značka' },
    brewery_brands: [
      { brewery_id: 42, breweries: { id: 42, name: 'Současný', closed_year: null } },
      { brewery_id: 43, breweries: { id: 43, name: 'Historický', closed_year: 2000 } },
    ],
    beers: [],
  };
  const route = load('app/brands/[id]/page.tsx', {
    'next/link': 'a',
    'next/navigation': { redirect: url => { throw new Error('redirect:' + url); }, notFound: () => { throw new Error('404'); } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) }, from: table => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      maybeSingle: async () => ({ data: db[table], error: null }),
      range: async () => ({ data: db[table], error: null }),
    }) }) },
  }).default;
  await assert.rejects(route({ params: Promise.resolve({ id: '20' }) }), /redirect:\/breweries\/42\?brand=20/);
  db.brewery_brands[1].breweries.closed_year = null;
  const element = await route({ params: Promise.resolve({ id: '20' }) });
  const links = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.props?.href) links.push(node.props.href);
    visit(node.props?.children);
  }
  visit(element);
  assert.ok(links.includes('/breweries/42?brand=20&portfolio=all#brand-20'));
  assert.ok(links.includes('/breweries/43?brand=20&portfolio=all#brand-20'));
  db.brewery_brands = [];
  const empty = await route({ params: Promise.resolve({ id: '20' }) });
  assert.ok(empty);
});
