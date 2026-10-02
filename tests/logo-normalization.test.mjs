import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';

function load(path, stubs = {}) {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const source = new Module(filename);
  source.require = name => stubs[name] ?? Module.createRequire(filename)(name);
  source._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return source.exports;
}
const layout = load('../lib/logo-layout.ts');
const { normalizeLogo } = load('../lib/normalize-logo.ts', { './logo-layout': layout });
const origin = 'https://test.supabase.co';

test('image endpoint permits only public brewery logos on the configured Storage origin', () => {
  assert.equal(layout.isStoredBreweryLogo(`${origin}/storage/v1/object/public/brewery-logos/42/logo?v=123`, origin), true);
  for (const url of ['http://localhost/logo', 'https://other.supabase.co/storage/v1/object/public/brewery-logos/42/logo',
    `${origin}/storage/v1/object/public/avatars/42/logo`, `${origin}/storage/v1/object/public/brewery-logos/42/logo?redirect=x`,
    `${origin}/storage/v1/object/public/brewery-logos/42/logo?v=bad`, `${origin}/storage/v1/object/public/brewery-logos/42/logo/extra`,
    'data:image/png;base64,xx', 'https://u:p@test.supabase.co/storage/v1/object/public/brewery-logos/42/logo']) {
    assert.equal(layout.isStoredBreweryLogo(url, origin), false, url);
  }
});

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
async function raster(bytes) {
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

test('opaque beige and white margins are removed and their exact edge colour extends through the frame', async () => {
  for (const color of ['#d6bd91', '#ffffff']) {
    const input = svg(400, 400, `<rect width="400" height="400" fill="${color}"/><rect x="150" y="180" width="100" height="40" fill="#bf2020"/>`);
    const raw = await raster(input);
    const bounds = layout.getLogoLayout(raw.data, raw.info.width, raw.info.height);
    assert.equal(bounds.width, 104);
    assert.equal(bounds.height, 44);
    const output = await raster(await normalizeLogo(input));
    assert.equal(output.info.width, 384);
    assert.equal(output.info.height, 384);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(output.data[c] - raw.data[c]) < 5);
    // Artwork was enlarged substantially, but remains a wide wordmark.
    const next = layout.getLogoLayout(output.data, 384, 384);
    assert.ok(next.width > 250);
    assert.ok(next.width / next.height > 2);
  }
});

test('transparent round and very wide artwork keep their proportions and stay clear of a circular frame', async () => {
  for (const input of [svg(400, 400, '<circle cx="200" cy="200" r="45" fill="#ffffff"/>'),
    svg(800, 120, '<rect x="200" y="50" width="400" height="20" fill="#ffffff"/>')]) {
    const result = await raster(await normalizeLogo(input));
    const [r, g, b] = result.data;
    assert.ok(Math.abs(r - 23) < 5 && Math.abs(g - 19) < 5 && Math.abs(b - 15) < 5);
    let minX = 384, maxX = 0, minY = 384, maxY = 0;
    for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) {
      const i = (y * 384 + x) * 4;
      if (result.data[i] < 150) continue;
      assert.ok(Math.hypot(x - 191.5, y - 191.5) < 166, 'artwork should not be clipped by the circle');
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    assert.ok(maxX - minX > 250, 'blank margins should not shrink the logo');
    if (input.includes(Buffer.from('width="800"'))) assert.ok((maxX - minX) / (maxY - minY) > 15);
    else assert.ok(Math.abs((maxX - minX) - (maxY - minY)) < 3);
  }
});

test('mixed-colour edges are retained conservatively; blank and corrupt inputs are handled safely', async () => {
  const raw = await raster(svg(100, 100, '<rect width="100" height="100" fill="red"/><rect width="50" height="100" fill="blue"/>'));
  const bounds = layout.getLogoLayout(raw.data, raw.info.width, raw.info.height);
  assert.equal(bounds.width, 100);
  assert.equal(bounds.height, 100);
  assert.ok((await normalizeLogo(svg(10, 10, ''))).length > 0);
  await assert.rejects(normalizeLogo(Buffer.from('not an image')));
});

test('black transparent ink stays readable on a light backing', async () => {
  const output = await raster(await normalizeLogo(svg(100, 100,
    '<rect x="40" y="40" width="20" height="20" fill="black"/>')));
  assert.ok(output.data[0] > 225 && output.data[1] > 225);
  const center = (192 * 384 + 192) * 4;
  assert.ok(output.data[center] < 10);
});

test('route rejects other sources, shares concurrent work and returns a cacheable WebP with a safe error fallback', async () => {
  const { GET } = load('../app/api/brewery-logo.webp/route.ts', {
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/logo-layout': layout,
    '@/lib/normalize-logo': { normalizeLogo },
  });
  const oldFetch = global.fetch;
  const oldOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = origin;
  let calls = 0;
  const request = src => new Request(`https://app.test/api/brewery-logo.webp?src=${encodeURIComponent(src)}`);
  const valid = `${origin}/storage/v1/object/public/brewery-logos/42/logo?v=123`;
  try {
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(url, valid);
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      return new Response(svg(100, 100, '<circle cx="50" cy="50" r="20" fill="white"/>'));
    };
    assert.equal((await GET(request('http://localhost/private'))).status, 400);
    assert.equal(calls, 0);
    const responses = await Promise.all([GET(request(valid)), GET(request(valid))]);
    assert.equal(calls, 1);
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Content-Type'), 'image/webp');
      assert.ok(response.headers.get('Cache-Control').includes('public'));
      assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 384);
    }
    for (const headers of [{ 'Content-Length': '2000001' }, {}]) {
      global.fetch = async () => new Response(new Uint8Array(2_000_001), { headers });
      const response = await GET(request(valid));
      assert.equal(response.status, 502);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  } finally {
    global.fetch = oldFetch;
    if (oldOrigin === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldOrigin;
  }
});
