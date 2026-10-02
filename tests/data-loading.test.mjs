import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../lib/fetch-all-rows.ts', import.meta.url));
const sourceModule = new Module(filename);
sourceModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { fetchAllRows } = sourceModule.exports;

test('large catalogs retain every row in order while pages resolve out of order', async () => {
  const data = Array.from({ length: 2737 }, (_, id) => ({ id }));
  const ranges = [];
  let inFlight = 0;
  let peak = 0;
  const result = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    peak = Math.max(peak, ++inFlight);
    await new Promise(resolve => setTimeout(resolve, from === 0 ? 12 : 1));
    inFlight--;
    return { data: data.slice(from, to + 1), error: null };
  }, 1000);
  assert.deepEqual(result, data);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.equal(peak, 3);
});

test('the complete brand list includes entries past the API default cap', async () => {
  const brands = Array.from({ length: 1139 }, (_, id) => ({ name: `Značka ${id}` }));
  const result = await fetchAllRows(async (from, to) => ({ data: brands.slice(from, to + 1), error: null }));
  assert.equal(result.length, 1139);
  assert.deepEqual(result.at(-1), brands.at(-1));
});

test('empty data, exact page multiples, and bounded timelines terminate without truncation', async () => {
  for (const size of [0, 500, 1500, 3000]) {
    const data = Array.from({ length: size }, (_, id) => id);
    assert.deepEqual(await fetchAllRows(async (from, to) => ({ data: data.slice(from, to + 1), error: null })), data);
  }
  const ranges = [];
  const result = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: Array.from({ length: to - from + 1 }, (_, index) => from + index), error: null };
  }, 500, 1200);
  assert.equal(result.length, 1200);
  assert.deepEqual(ranges, [[0,499],[500,999],[1000,1199]]);
});

test('a failed page rejects the whole read instead of showing misleading partial statistics', async () => {
  await assert.rejects(fetchAllRows(async from => from === 500
    ? { data: null, error: { message: 'Database unavailable' } }
    : { data: [], error: null }), /Database unavailable/);
});
