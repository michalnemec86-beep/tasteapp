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
  loaded.require = name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts', mocks) : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const { NavigationNewsController, getNewsHref, getNewsSection, getNewsRange, isNewsTimestamp, NEWS_REFRESH_MS } = load('lib/navigation-news.ts');
const snapshotAt = '2026-10-02T17:00:00.123456+00:00';
const since = '2026-10-02T16:00:00.234567+00:00';
const snapshot = (overrides = {}) => ({ userId: 'me', snapshotAt, counts: { activity: 8, beers: 5, breweries: 3 }, since: { beers: since, breweries: since }, ...overrides });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('only catalogue list visits clear badges; filtered news URLs preserve database timestamp precision', () => {
  assert.equal(getNewsSection('/breweries'), 'breweries');
  assert.equal(getNewsSection('/beers'), 'beers');
  assert.equal(getNewsSection('/activity'), 'activity');
  for (const route of ['/breweries/42', '/beers/3', '/', '/profiles/me', '/ratings']) assert.equal(getNewsSection(route), null);
  const url = new URL(getNewsHref('beers', snapshot()), 'https://example.org');
  assert.equal(url.searchParams.get('newSince'), since);
  assert.equal(url.searchParams.get('newUntil'), snapshotAt);
  assert.equal(getNewsHref('beers', snapshot({ counts: { activity: 0, beers: 0, breweries: 0 } })), '/beers');
  assert.equal(getNewsHref('activity', snapshot()), '/activity');
  assert.deepEqual(getNewsRange(since, snapshotAt), { since, until: snapshotAt });
  assert.equal(getNewsRange(undefined, undefined), null);
  for (const [a, b] of [[since, undefined], [[since], snapshotAt], ['2026-02-30T16:00:00Z', snapshotAt], [snapshotAt, since]]) assert.throws(() => getNewsRange(a, b));
  assert.equal(isNewsTimestamp('not-a-date'), false);
});

test('initial counts and focus refreshes coalesce, cache for a minute and do not acknowledge unseen sections', async () => {
  let now = 1000;
  const request = deferred(), calls = [], changes = [];
  const controller = new NavigationNewsController('me', (section, through) => { calls.push({ section, through }); return request.promise; }, data => changes.push(data), () => now);
  const initial = controller.visit(null);
  await Promise.all([controller.refresh(), controller.visit(null)]);
  assert.equal(calls.length, 1);
  request.resolve(snapshot()); await initial;
  await controller.visit(null); await controller.refresh();
  assert.equal(calls.length, 1);
  now += NEWS_REFRESH_MS;
  await controller.refresh();
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.section === null && call.through === null));
  assert.equal(changes.length, 2);
});

test('a section visit acknowledges only its last loaded snapshot and a second list visit does not repeat the write', async () => {
  const calls = [];
  const controller = new NavigationNewsController('me', async (section, through) => { calls.push({ section, through }); return snapshot(); }, () => {});
  await controller.visit(null);
  await controller.visit('breweries');
  assert.deepEqual(calls[1], { section: 'breweries', through: snapshotAt });
  await controller.visit('breweries');
  assert.equal(calls.length, 2);
  await controller.visit('breweries', true);
  assert.equal(calls.length, 3);
  await controller.visit('beers', false, since);
  assert.deepEqual(calls.at(-1), { section: 'beers', through: since }, 'a rendered filter snapshot wins over a more recent background count');
  const fresh = new NavigationNewsController('me', async (section, through) => { calls.push({ section, through }); return snapshot(); }, () => {});
  await fresh.visit('activity');
  assert.deepEqual(calls.at(-1), { section: 'activity', through: null });
});

test('older responses, switched accounts and unmounted navigation cannot replace current badges', async () => {
  const requests = [], changes = [];
  const controller = new NavigationNewsController('me', () => { const d = deferred(); requests.push(d); return d.promise; }, data => changes.push(data));
  const first = controller.visit(null), next = controller.visit('beers');
  requests[1].resolve(snapshot({ counts: { activity: 8, beers: 0, breweries: 3 } })); await next;
  requests[0].resolve(snapshot()); await first;
  assert.equal(changes.length, 1);
  assert.equal(controller.snapshot.counts.beers, 0);
  const wrong = controller.visit('activity');
  requests[2].resolve(snapshot({ userId: 'other' })); await wrong;
  assert.equal(changes.length, 1);
  const disposed = controller.visit('breweries'); controller.dispose();
  requests[3].resolve(snapshot()); await disposed;
  assert.equal(changes.length, 1);
});

test('failed refreshes retain counts and remain retryable', async () => {
  let fail = false, now = 1000, calls = 0;
  const controller = new NavigationNewsController('me', async () => { calls++; if (fail) throw new Error('Offline'); return snapshot(); }, () => {}, () => now);
  await controller.visit(null); now += NEWS_REFRESH_MS; fail = true;
  const error = console.error; console.error = () => {};
  try { await controller.refresh(); } finally { console.error = error; }
  assert.equal(controller.snapshot.counts.beers, 5);
  fail = false; await controller.refresh();
  assert.equal(calls, 3);
});

test('server action requires authentication and validates acknowledgement input before touching data', async () => {
  let user = { id: 'me' }, calls = [];
  const action = load('app/navigation-news/actions.ts', {
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) },
      rpc: async (name, params) => { calls.push({ name, params }); return { data: { snapshot_at: snapshotAt, activity_count: 8, beer_count: 5, brewery_count: 3, beers_since: since, breweries_since: since }, error: null }; },
    }) },
  }).getNavigationNews;
  assert.equal((await action('beers', snapshotAt)).userId, 'me');
  assert.deepEqual(calls[0], { name: 'navigation_news', params: { p_seen_section: 'beers', p_seen_through: snapshotAt, p_include_achievements: true } });
  await assert.rejects(action('profiles'), /Neplatná sekce/);
  await assert.rejects(action('beers', '2026-02-30T16:00:00Z'), /Neplatný čas/);
  user = null;
  assert.equal(await action(), null);
  assert.equal(calls.length, 1);
});

test('catalogue news uses visible creations by other users within the captured range, deduplicates IDs and fully pages', async () => {
  const { getNewCatalogueIds } = load('lib/catalogue-news.ts');
  const calls = [];
  const data = Array.from({ length: 1103 }, (_, id) => ({ id, beer_id: id < 2 ? 1 : id, brewery_id: id }));
  const supabase = { from: table => { const filters = []; return {
    select() { return this; }, eq(key, value) { filters.push(['eq', key, value]); return this; },
    neq(key, value) { filters.push(['neq', key, value]); return this; },
    gt(key, value) { filters.push(['gt', key, value]); return this; },
    lte(key, value) { filters.push(['lte', key, value]); return this; }, order() { return this; },
    range: async (from, to) => { calls.push({ table, filters, from, to }); return { data: data.slice(from, to + 1), error: null }; },
  }; } };
  assert.equal(await getNewCatalogueIds(supabase, 'beers', 'me', null), null);
  assert.equal(calls.length, 0);
  const result = await getNewCatalogueIds(supabase, 'beers', 'me', { since, until: snapshotAt });
  assert.equal(result.length, 1102);
  assert.deepEqual(calls[0].filters, [['eq', 'event_type', 'beer_created'], ['eq', 'show_in_timeline', true], ['neq', 'actor_user_id', 'me'], ['gt', 'created_at', since], ['lte', 'created_at', snapshotAt]]);
});

test('desktop and expanded mobile navigation show only red numeric badges, a menu dot and no zero badges', () => {
  let news = snapshot(), mobileOpen = false;
  const closed = [];
  const Nav = load('app/AppNav.tsx', {
    react: { ...React, useState: () => [mobileOpen, value => { closed.push(value); mobileOpen = value; }], useEffect: () => {} },
    'next/link': ({ prefetch, ...props }) => React.createElement('a', props),
    'next/navigation': { usePathname: () => '/', useRouter: () => ({}) },
    '@/lib/supabase/client': { createClient: () => ({}) },
    '@/components/brand/PivnikMark': { HopMark: () => null },
    './useNavigationNews': { __esModule: true, default: () => ({ news, reopen: () => {} }) },
  }).default;
  let html = renderToStaticMarkup(React.createElement(Nav, { currentUserId: 'me' }));
  assert.equal((html.match(/taste-nav-news-badge/g) ?? []).length, 3);
  assert.match(html, /taste-nav-news-dot/);
  assert.match(html, /aria-label="5 novinek">5<\/span>/);
  mobileOpen = true;
  html = renderToStaticMarkup(React.createElement(Nav, { currentUserId: 'me' }));
  assert.equal((html.match(/taste-nav-news-badge/g) ?? []).length, 6);
  news = snapshot({ counts: { activity: 0, beers: 0, breweries: 0 } });
  html = renderToStaticMarkup(React.createElement(Nav, { currentUserId: 'me' }));
  assert.doesNotMatch(html, /taste-nav-news-(badge|dot)/);
  news = snapshot({ counts: { activity: 120, beers: 0, breweries: 0 } });
  html = renderToStaticMarkup(React.createElement(Nav, { currentUserId: 'me' }));
  assert.match(html, /aria-label="120 novinek">99\+<\/span>/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Nav, { currentUserId: null })), /taste-nav-news-badge/);
  mobileOpen = true; news = snapshot();
  const collect = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(collect) : [node, ...collect(node.props?.children)];
  const link = collect(Nav({ currentUserId: 'me' })).filter(node => node.props?.href?.startsWith('/beers?') && node.props?.onClick).at(-1);
  link.props.onClick();
  assert.equal(closed.at(-1), false, 'menu closes even when only the list query changes');
});

test('news catalogue batches avoid oversized URLs and remain complete across concurrent deletions', async () => {
  const { fetchCatalogueRows } = load('lib/catalogue-news.ts');
  const ids = Array.from({ length: 1103 }, (_, id) => id + 1), calls = [];
  const fetch = async (from, to, selected) => {
    calls.push({ from, to, selected });
    return { data: selected.filter(id => id !== 1).map(id => ({ id })), error: null };
  };
  assert.deepEqual(await fetchCatalogueRows(fetch, []), []);
  assert.equal(calls.length, 0);
  const rows = await fetchCatalogueRows(fetch, ids);
  assert.equal(rows.length, 1102);
  assert.ok(rows.some(row => row.id === 1103));
  assert.ok(calls.every(c => c.selected.length <= 200 && c.from === 0));
  await assert.rejects(fetchCatalogueRows(async (from, to, selected) => ({ data: [], error: selected.includes(1000) ? { message: 'Unavailable' } : null }), ids), /Unavailable/);
});

test('background news endpoint is private, authenticated and never acknowledges a queried section', async () => {
  let result = snapshot(), fail = false;
  const calls = [];
  const { GET } = load('app/api/navigation-news/route.ts', {
    '@/app/navigation-news/actions': { getNavigationNews: async (...args) => { calls.push(args); if(fail)throw new Error('private database details');return result; } },
  });
  const response = await GET(new Request('https://example.org/api/navigation-news?section=breweries'));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),snapshot());
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(calls,[[]],'query parameters cannot mark an unread section as seen');
  result=null;
  const unauthorized=await GET();
  assert.equal(unauthorized.status,401);
  assert.equal(unauthorized.headers.get('cache-control'),'private, no-store');
  fail=true;
  const failure=await GET();
  assert.equal(failure.status,503);
  assert.doesNotMatch(await failure.text(),/private database/);
});

test('background reads bypass the action queue while visits keep the existing timestamp acknowledgement', async () => {
  const previous=globalThis.fetch, read=deferred(), requests=[], actions=[];
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return read.promise;};
  try {
    const client=load('app/navigation-news/client.ts', { './actions':{getNavigationNews:async(...args)=>{actions.push(args);return snapshot();}} }).getNavigationNews;
    const pending=client();
    await client('breweries',snapshotAt);
    assert.deepEqual(actions,[['breweries',snapshotAt]]);
    assert.equal(requests[0].url,'/api/navigation-news');
    assert.equal(requests[0].options.cache,'no-store');
    read.resolve(Response.json(snapshot()));
    assert.deepEqual(await pending,snapshot());
    globalThis.fetch=async()=>new Response(null,{status:401});
    assert.equal(await client(),null);
  } finally {globalThis.fetch=previous;}
});
