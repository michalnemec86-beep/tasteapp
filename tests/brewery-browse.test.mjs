import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root = fileURLToPath(new URL('../', import.meta.url));
function load(relative, mocks = {}) {
  const filename = path.resolve(root, relative);
  const loaded = new Module(filename);
  const require = Module.createRequire(filename);
  loaded.require = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return {};
    if (name.startsWith('@/')) {
      const base = name.slice(2);
      const extension = ['.ts', '.tsx', '.js'].find(ext => fs.existsSync(path.join(root, base + ext)));
      return load(base + extension, mocks);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const browse = load('lib/brewery-browse.ts');
const storage = () => {
  const values = new Map();
  return { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const now = 10000000;
const list = { ownerId: 'me', ids: [42, 7, 99], returnHref: '/stats?focus=breweries&year=2026&sort=count-desc', label: 'Pivovary' };

test('snapshot preserves filtered order, crosses catalogue pagination and stops at both ends', () => {
  const store = storage();
  const ids = Array.from({ length: 51 }, (_, i) => 100 - i);
  assert.equal(browse.saveBreweryBrowse(store, 'token', { ...list, ids }, now), true);
  const saved = browse.readBreweryBrowse(store, 'token', 'me', now);
  assert.deepEqual(saved.ids, ids);
  assert.deepEqual(browse.getBreweryNeighbours(saved, 76), { index: 24, total: 51, previous: 77, next: 75 });
  assert.equal(browse.getBreweryNeighbours(saved, 100).previous, null);
  assert.equal(browse.getBreweryNeighbours(saved, 50).next, null);
  assert.equal(browse.getBreweryNeighbours(saved, 999), null);
});

test('expired, foreign-account, malformed, oversized and blocked storage does not expose a sequence', () => {
  const store = storage();
  browse.saveBreweryBrowse(store, 'token', list, now);
  assert.equal(browse.readBreweryBrowse(store, 'token', 'other', now), null);
  assert.equal(browse.readBreweryBrowse(store, 'token', 'me', now + browse.BROWSE_TTL + 1), null);
  assert.equal(browse.readBreweryBrowse(store, 'token', 'me', now - 1), null);
  for (const data of ['{', JSON.stringify({ ...list, ids: [42, 42], createdAt: now }), JSON.stringify({ ...list, ids: ['42'], createdAt: now }), 'x'.repeat(80001)]) {
    store.setItem('pivnik:brewery-browse:token', data);
    assert.equal(browse.readBreweryBrowse(store, 'token', 'me', now), null);
  }
  const blocked = { get length() { throw Error('blocked'); }, getItem() { throw Error('blocked'); } };
  assert.equal(browse.saveBreweryBrowse(blocked, 'token', list, now), false);
  assert.equal(browse.readBreweryBrowse(blocked, 'token', 'me', now), null);
});

test('return links are restricted to local source lists, and storage is bounded and cleaned across accounts', () => {
  assert.equal(browse.isBrowseReturnHref('/stats/country/%C4%8Cesko?year=2026'), true);
  for (const href of ['javascript:alert(1)', '//example.org', '/\\example.org', '/auth/logout', '/beers/42', 'https://example.org/stats']) {
    assert.equal(browse.isBrowseReturnHref(href), false);
    assert.equal(browse.saveBreweryBrowse(storage(), 'token', { ...list, returnHref: href }, now), false);
  }
  const store = storage();
  for (let i = 0; i < 15; i++) browse.saveBreweryBrowse(store, 'token-' + i, list, now + i);
  assert.equal(store.length, 8);
  browse.saveBreweryBrowse(store, 'new-account', { ...list, ownerId: 'other' }, now + 16);
  assert.equal(store.length, 1);
  assert.equal(browse.saveBreweryBrowse(store, 'bad/token', list, now), false);
});

test('return snapshot retains catalogue page and exact filters; portfolio links retain sequence and hash', () => {
  const href = browse.browseReturnHref('/breweries', 'page=2&newSince=2026-10-05&newUntil=2026-10-06', { cSort: 'consumedCount', cDirection: 'desc', cSearch: 'Černý ležák', cUser: 'me' });
  const params = new URL(href, 'https://example.org').searchParams;
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('newUntil'), '2026-10-06');
  assert.equal(params.get('cSearch'), 'Černý ležák');
  const beer = browse.withBreweryBrowse('/breweries/42?beer=10&portfolio=all#beer-10', 'token');
  assert.equal(beer, '/breweries/42?beer=10&portfolio=all&browse=token#beer-10');
  assert.equal(browse.withBreweryBrowse('/breweries/42', ['bad']), '/breweries/42');
});

const FakeLink = ({ children, prefetch, onNavigate, ...props }) => React.createElement('a', props, children);
const mocks = {
  'next/link': { __esModule: true, default: FakeLink },
  'next/navigation': { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push() {} }) },
  '@/components/ui/AutoLogoFrame': { __esModule: true, default: () => null },
  '@/components/home/HomeStatIcon': { __esModule: true, default: () => null },
  '@/components/navigation/BreweryBrowse': {
    BreweryBrowseProvider: ({ children }) => children,
    BreweryBrowseLink: FakeLink,
  },
};
test('activity categories link directly to their complete statistics, including packaging', () => {
  const Card = load('components/stats/StatsRankingCard.tsx', mocks).default;
  const titles = { 'Nejčastější pivovary': 'breweries', 'Nejčastější piva': 'beers', 'Značky': 'brands', 'Pivní styly': 'styles', 'Státy': 'countries' };
  for (const [title, focus] of Object.entries(titles)) {
    const html = renderToStaticMarkup(React.createElement(Card, { title, items: [], subtitle: '', icon: null, accent: '#aaa', currentUserId: 'me' }));
    assert.ok(html.includes('href="/stats?focus=' + focus + '"'), title);
    if (title === 'Pivní styly') assert.ok(html.includes('href="/stats?focus=packaging"'));
    assert.ok(!html.includes('href="/stats"'));
  }
});

test('focused statistics render every item instead of the ten-item preview', () => {
  const Card = load('app/stats/RankingCardClient.tsx', mocks).default;
  const props = { title: 'Pivovary', subtitle: '', icon: null, currentUserId: 'me', items: Array.from({ length: 21 }, (_, i) => ({ id: i + 1, name: 'Pivovar-' + (i + 1), count: 21 - i })) };
  const complete = renderToStaticMarkup(React.createElement(Card, { ...props, expanded: true }));
  const preview = renderToStaticMarkup(React.createElement(Card, props));
  assert.ok(complete.includes('Pivovar-21'));
  assert.ok(!complete.includes('Zobrazit celý žebříček'));
  assert.ok(!preview.includes('Pivovar-21'));
  assert.ok(preview.includes('Zobrazit celý žebříček'));
});

test('navigation controls keep account context, provide a list return and disable the first/last arrow', () => {
  const store = storage();
  browse.saveBreweryBrowse(store, 'token', list);
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: store };
  try {
    const Nav = load('components/navigation/BreweryBrowse.tsx', {
      'next/link': { __esModule: true, default: FakeLink },
      'next/navigation': { useSearchParams: () => new URLSearchParams('browse=token') },
      react: { ...React, useSyncExternalStore: () => true, useMemo: callback => callback() },
    }).BreweryBrowseNavigation;
    const html = renderToStaticMarkup(Nav({ breweryId: 42, ownerId: 'me' }));
    assert.ok(html.includes('href="/breweries/7?browse=token"'));
    assert.ok(html.includes('aria-label="Předchozí pivovar"'));
    assert.ok(html.includes('disabled=""'));
    assert.ok(html.includes('focus=breweries'));
    assert.equal(Nav({ breweryId: 42, ownerId: 'other' }), null);
    const last = renderToStaticMarkup(Nav({ breweryId: 99, ownerId: 'me' }));
    assert.ok(!last.includes('href="/breweries/undefined'));
    assert.ok(last.includes('aria-label="Další pivovar"'));
  } finally { globalThis.window = previousWindow; }
});

test('a brewery link captures its originating filters before navigation; blocked storage keeps the ordinary link', () => {
  const store = storage(), calls = [], context = { ...list, returnHref: '/breweries?page=2&cSort=name&cSearch=IPA' };
  const previousWindow = globalThis.window;
  const Link = load('components/navigation/BreweryBrowse.tsx', {
    'next/link': { __esModule: true, default: FakeLink },
    'next/navigation': { useRouter: () => ({ push: href => calls.push(['push', href]) }) },
    react: { ...React, useContext: () => context },
  }).BreweryBrowseLink;
  try {
    globalThis.window = { sessionStorage: store, location: { pathname: '/breweries', search: '?page=2', hash: '' }, history: { replaceState: (...args) => calls.push(['replace', ...args]) } };
    let prevented = false;
    Link({ href: '/breweries/42' }).props.onNavigate({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(calls[0][0], 'replace');
    assert.equal(calls[0][1], null, 'never copy private Next.js history flags');
    assert.equal(calls[0][3], context.returnHref);
    const token = new URL(calls[1][1], 'https://example.org').searchParams.get('browse');
    assert.deepEqual(browse.readBreweryBrowse(store, token, 'me').ids, list.ids);
    assert.equal(browse.readBreweryBrowse(store, token, 'me').returnHref, context.returnHref);
    calls.length = 0; prevented = false;
    globalThis.window.sessionStorage = { get length() { throw Error('blocked'); } };
    Link({ href: '/breweries/42' }).props.onNavigate({ preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(calls.length, 0);
  } finally { globalThis.window = previousWindow; }
});

test('returning to the catalogue restores its sorted full sequence and visibility synchronously', () => {
  let sequence;
  const Table = load('app/breweries/BreweryTableClient.tsx', {
    ...mocks,
    './BreweryEditModalClient': { __esModule: true, default: () => null },
    '@/components/ui/ReferenceWarning': { __esModule: true, default: () => null },
    'next/navigation': { useSearchParams: () => new URLSearchParams('cSort=consumedCount&cDirection=desc&cAll=1&page=1'), usePathname: () => '/breweries', useRouter: () => ({ replace() {} }) },
    '@/components/navigation/BreweryBrowse': { ...mocks['@/components/navigation/BreweryBrowse'], BreweryBrowseProvider: props => { sequence = props; return props.children; } },
  }).default;
  const row = (id, count) => ({ id, name: 'Pivovar ' + id, city: 'Praha', country: 'Česko', address: null, website: null, logoUrl: null,
    isNomadic: false, latitude: null, longitude: null, beerCount: 0, brandCount: 0, foundedYear: null, historyFromYear: null,
    consumedCount: count, closedYear: null, historyText: '', historySortYear: null, beers: [], userStats: {}, referenceReady: true, referenceMissing: [] });
  const html = renderToStaticMarkup(React.createElement(Table, { rows: [row(42, 2), row(7, 8)], profiles: [], countries: [], currentUserId: 'me', adminView: false, initiallyVisible: false, updateBreweryAction() {} }));
  assert.deepEqual(sequence.ids, [7, 42]);
  assert.ok(html.includes('Pivovar 42'));
  assert.ok(sequence.returnHref.includes('cDirection=desc'));
  assert.equal(sequence.ownerId, 'me');
});
