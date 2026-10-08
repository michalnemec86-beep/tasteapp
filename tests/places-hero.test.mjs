import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const places = source("app/places/page.tsx");
const asset = new URL("../public/images/heroes/places.webp", import.meta.url);

test("places share the same PageHero design as other catalogue and stats pages", () => {
  assert.match(places, /import PageHero from "@\/components\/ui\/PageHero";/);
  assert.match(places, /<PageHero[\s\S]*?title="Místa"[\s\S]*?imageUrl="\/images\/heroes\/places\.webp"/);
  assert.match(places, /visualVariant="catalog"/);
  assert.doesNotMatch(places, /<h1[^>]*>Místa<\/h1>/);
});

test("approved modern/Irish pub image is included and optimized for web", () => {
  const bytes = readFileSync(asset);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(statSync(asset).size > 50_000, "keep a photographic, not placeholder, asset");
  assert.ok(statSync(asset).size < 250_000, "avoid large PNG loading costs");
});

test("adding the hero does not remove places, tasting counts or admin editing", () => {
  assert.match(places, /counts\.set\(tasting\.place_id/);
  assert.match(places, /<h2[^>]*>Společný katalog/);
  assert.match(places, /<form action=\{createPlace\}/);
  assert.match(places, /<form action=\{updatePlace\}/);
  assert.match(places, /\{admin && <section/);
});
