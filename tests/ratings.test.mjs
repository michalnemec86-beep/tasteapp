import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../lib/ratings.ts', import.meta.url));
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const source = new Module(filename);
source._compile(compiled, filename);
const { parseRating, rankRatings, filterRatings } = source.exports;
const row = (id, rating, overrides = {}) => ({ id, beerId: 1, beerName: 'Ležák', country: 'Česko',
  style: 'Ležák', packaging: 'draft', rating, ...overrides });

test('unrated tastings are distinct from zero and invalid scores are rejected', () => {
  for (const value of [null, '', ' ']) assert.equal(parseRating(value), null);
  for (let rating = 1; rating <= 5; rating++) assert.equal(parseRating(String(rating)), rating);
  for (const value of ['0', '6', '-1', '2.5', 'NaN', 'Infinity', new File(['4'], 'rating')]) {
    assert.throws(() => parseRating(value));
  }
});

test('averages count each rated tasting once and exclude unrated or invalid scores', () => {
  const ranks = rankRatings([row(1, 1, { quantity: 1000 }), row(2, 5, { quantity: 1 }),
    row(3, null), row(4, 0), row(5, 6)], 'beer');
  assert.equal(ranks.length, 1);
  assert.equal(ranks[0].average, 3);
  assert.equal(ranks[0].count, 2);
  assert.deepEqual(rankRatings([row(1, null)], 'beer'), []);
});

test('best and worst reverse score order; ties prefer more votes with stable Czech names', () => {
  const rows = [row(1, 5), row(2, 5, { beerId: 2, beerName: 'IPA' }), row(3, 5, { beerId: 2, beerName: 'IPA' }),
    row(4, 1, { beerId: 3, beerName: 'Stout' })];
  assert.deepEqual(rankRatings(rows, 'beer').map(rank => rank.id), ['2', '1', '3']);
  assert.deepEqual(rankRatings(rows, 'beer', true).map(rank => rank.id), ['3', '2', '1']);
});

test('country, style, serving and beer filters intersect and category means use the selected tastings', () => {
  const rows = [row(1, 5), row(2, 1, { country: 'Belgie' }), row(3, 2, { style: 'IPA' }),
    row(4, 3, { packaging: 'can' }), row(5, 4, { beerId: 2 })];
  const filtered = filterRatings(rows, { country: 'Česko', style: 'Ležák', packaging: 'draft', beer: '1' });
  assert.deepEqual(filtered.map(tasting => tasting.id), [1]);
  assert.equal(rankRatings(filtered, 'country')[0].average, 5);
  assert.equal(rankRatings(rows, 'country', true)[0].id, 'Belgie');
  assert.deepEqual(filterRatings(rows, { country: 'Německo', style: '', packaging: '', beer: '' }), []);
});
