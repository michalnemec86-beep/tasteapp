import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../lib/entity-navigation.ts', import.meta.url));
const source = new Module(filename);
source._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const nav = source.exports;

test('entity names open profiles or beer lists even from a personal ranking', () => {
  const examples = [
    ['Pivovary', { id: 8, name: 'Pivovar' }, '/breweries/8'],
    ['Státy', { id: 1, name: 'Česko' }, '/stats/country/%C4%8Cesko'],
    ['Pivní styly', { id: 3, name: 'IPA' }, '/beers?style=3'],
    ['Chmely', { id: 4, name: 'Citra' }, '/beers?hop=4'],
    ['Piva', { id: 5, name: 'Ležák' }, '/beers/5'],
    ['Značky', { id: 6, name: 'Značka' }, '/brands/6'],
  ];
  for (const [title, item, expected] of examples) assert.equal(nav.getRankingEntityHref(title, item), expected);
});

test('period producer links open the selected beer even outside the current portfolio', () => {
  assert.equal(nav.beerHref(31, 7), '/breweries/7?beer=31&portfolio=all#beer-31');
  assert.equal(nav.brandHref(22, 7), '/breweries/7?brand=22&portfolio=all#brand-22');
  assert.equal(nav.beerHref(31), '/beers/31');
});

test('brand resolution prioritizes current producers, keeps ambiguity and permits empty portfolios', () => {
  assert.deepEqual(nav.resolveBrandBreweryIds([8, 8], [2]), [8]);
  assert.deepEqual(nav.resolveBrandBreweryIds([8, 4, 8], [2]), [4, 8]);
  assert.deepEqual(nav.resolveBrandBreweryIds([], [2, 2]), [2]);
  assert.deepEqual(nav.resolveBrandBreweryIds([], []), []);
});

function loadRoute(relative, mocks) {
  const path = fileURLToPath(new URL(relative, import.meta.url));
  const module = new Module(path);
  module.require = name => {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  };
  module._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, path);
  return module.exports.default;
}
const redirect = target => { throw new Error(`redirect:${target}`); };
const notFound = () => { throw new Error('not-found'); };

test('legacy beer URLs prefer the current version producer and reject invalid or inaccessible beers', async () => {
  let lookupCount = 0;
  let user = { id: 'user' };
  let beer = { id: 31, brewery_id: 2, beer_versions: [{ brewery_id: 7, is_current: true }] };
  const db = { auth: { getUser: async () => ({ data: { user } }) }, from: () => {
    lookupCount++;
    return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: beer, error: null }) };
  }};
  const page = loadRoute('../app/beers/[id]/page.tsx', {
    'next/navigation': { redirect, notFound }, '@/lib/entity-navigation': nav,
    '@/lib/supabase/server': { createClient: async () => db },
  });
  const open = id => page({ params: Promise.resolve({ id }) });
  await assert.rejects(open('31'), /redirect:\/breweries\/7\?beer=31&portfolio=all#beer-31/);
  await assert.rejects(open('invalid'), /not-found/);
  assert.equal(lookupCount, 1);
  user = null;
  await assert.rejects(open('31'), /redirect:\/auth\/login/);
  assert.equal(lookupCount, 1);
  user = { id: 'user' }; beer = null;
  await assert.rejects(open('31'), /not-found/);
});
