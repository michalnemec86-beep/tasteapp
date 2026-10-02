import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function load(path, stubs = {}) {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const source = new Module(filename);
  source.require = name => stubs[name] ?? Module.createRequire(filename)(name);
  source._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return source.exports;
}
const { getBreweryReferenceStatus, getBeerReferenceStatus, getBeerSuggestionReferenceStatus } =
  load('../lib/referenceStatus.ts');
const completeBeer = { name: 'Ležák', brandId: 1, breweryId: 2, styleId: 3, plato: null, abv: 4.5 };

test('brewery requires only name and country, including Czech and nomadic breweries', () => {
  for (const country of ['Česko', 'Belgie']) {
    assert.equal(getBreweryReferenceStatus({ name: 'Pivovar', country }).ready, true);
  }
  assert.deepEqual(getBreweryReferenceStatus({ name: '  ', country: null }).missing, ['název', 'stát']);
  assert.equal(getBreweryReferenceStatus({ name: 'Pivovar', country: ' ' }).ready, false);
});

test('a complete beer is verified automatically regardless of historical manual confirmation', () => {
  for (const isCatalog of [true, false, null, undefined]) {
    const status = getBeerReferenceStatus({ ...completeBeer, isCatalog });
    assert.equal(status.ready, true);
    assert.deepEqual(status.missing, []);
  }
  for (const [key, missing] of [['name', 'název'], ['brandId', 'značka'],
    ['breweryId', 'pivovar'], ['styleId', 'pivní styl']]) {
    const status = getBeerReferenceStatus({ ...completeBeer, [key]: null, isCatalog: true });
    assert.equal(status.ready, false);
    assert.deepEqual(status.missing, [missing]);
  }
});

test('either strength value suffices, zero ABV is valid, and absent/nonfinite numbers do not verify', () => {
  for (const strength of [{ abv: 0, plato: null }, { abv: null, plato: 12 },
    { abv: 4.5, plato: 12 }, { abv: 0, plato: NaN }]) {
    assert.equal(getBeerReferenceStatus({ ...completeBeer, ...strength }).ready, true);
  }
  for (const strength of [{ abv: null, plato: null }, { abv: undefined, plato: undefined },
    { abv: NaN, plato: Infinity }]) {
    const status = getBeerReferenceStatus({ ...completeBeer, ...strength });
    assert.equal(status.ready, false);
    assert.deepEqual(status.missing, ['stupňovitost nebo ABV']);
  }
});

test('autocomplete uses automatic completeness and flags incomplete historically confirmed beers', () => {
  const beer = { name: 'Ležák', brands: { id: 1 }, breweries: { id: 2 },
    beer_styles: { id: 3 }, abv: 0, is_catalog: false };
  assert.equal(getBeerSuggestionReferenceStatus(beer).ready, true);
  assert.equal(getBeerSuggestionReferenceStatus({ ...beer, brands: null, is_catalog: true }).ready, false);
});

test('only Michal can see admin warnings; a forged admin cookie gives other users no access', async () => {
  let mode;
  let cookieReads = 0;
  const { CATALOG_ADMIN_USER_ID, isAdminView } = load('../lib/adminView.ts', {
    'next/headers': { cookies: async () => { cookieReads++; return { get: () => ({ value: mode }) }; } },
  });
  for (mode of ['admin', 'normal', undefined]) {
    assert.equal(await isAdminView('another-user'), false);
  }
  assert.equal(cookieReads, 0);
  mode = 'admin';
  assert.equal(await isAdminView(CATALOG_ADMIN_USER_ID), true);
  mode = 'normal';
  assert.equal(await isAdminView(CATALOG_ADMIN_USER_ID), false);
  mode = undefined;
  assert.equal(await isAdminView(CATALOG_ADMIN_USER_ID), true);
});

function breweryActions(userId) {
  const writes = [];
  const existing = { id: 42, name: 'Sdílený pivovar', country: 'Česko',
    city: null, address: null, website: null, is_nomadic: false,
    founded_year: null, closed_year: null, latitude: 49, longitude: 16 };
  const client = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from(table) {
      let operation;
      let values;
      const query = {
        select() { return query; },
        eq() { return query; },
        insert(row) { operation = 'insert'; values = row; return query; },
        update(row) { operation = 'update'; values = row; return query; },
        async maybeSingle() { return { data: existing, error: null }; },
        async single() { writes.push({ table, operation, values }); return { data: { id: 43 }, error: null }; },
        then(resolve, reject) {
          if (operation) writes.push({ table, operation, values });
          const data = table === 'countries' ? [{ name: 'Česko' }]
            : table === 'breweries' ? [existing] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { writes, actions: load('../app/breweries/actions.ts', {
    '@/lib/supabase/server': { createClient: async () => client },
    'next/cache': { revalidatePath() {} },
  }) };
}

test('a regular user can create and edit shared breweries with only name and country', async () => {
  const { actions, writes } = breweryActions('regular-user');
  const form = new FormData();
  form.set('name', 'Nový pivovar');
  form.set('country', 'cesko');
  await actions.createBrewery(form);
  await actions.updateBrewery(42, form);
  assert.equal(writes.length, 2);
  for (const { values } of writes) {
    assert.equal(values.country, 'Česko');
    for (const field of ['city', 'address', 'website']) assert.equal(values[field], null);
  }
  assert.equal(writes[1].values.latitude, 49);
  assert.equal(writes[1].values.longitude, 16);
});

test('brewery actions reject missing country and unauthenticated edits before writing', async () => {
  const { actions, writes } = breweryActions('regular-user');
  const form = new FormData();
  form.set('name', 'Nový pivovar');
  await assert.rejects(actions.createBrewery(form), /Stát pivovaru je povinný/);
  await assert.rejects(actions.updateBrewery(42, form), /Stát pivovaru je povinný/);
  assert.equal(writes.length, 0);
  const signedOut = breweryActions(null);
  form.set('country', 'Česko');
  await assert.rejects(signedOut.actions.createBrewery(form), /není přihlášen/);
  await assert.rejects(signedOut.actions.updateBrewery(42, form), /není přihlášen/);
  assert.equal(signedOut.writes.length, 0);
});
