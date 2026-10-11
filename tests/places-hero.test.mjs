import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const places = source("app/places/page.tsx");
const asset = new URL("../public/images/heroes/places.webp", import.meta.url);

test("places photo is the full-page background, not a boxed hero", () => {
  const css = source("app/places/places-concept.css");
  assert.match(places, /import "\.\/places-concept\.css";/);
  assert.match(places, /<main className="taste-places-concept">/);
  assert.match(places, /<header className="taste-places-intro">/);
  assert.match(places, /<h1>Místa<\/h1>/);
  assert.doesNotMatch(places, /<PageHero|import PageHero/);
  assert.match(css, /\.taste-app-shell:has\(\.taste-places-concept\)::before/);
  assert.match(css, /url\("\/images\/heroes\/places\.webp"\)/);
  assert.match(css, /linear-gradient\(180deg,[^;]*#100d0a 83%\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("approved modern/Irish pub image is included and optimized for web", () => {
  const bytes = readFileSync(asset);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(statSync(asset).size > 50_000, "keep a photographic, not placeholder, asset");
  assert.ok(statSync(asset).size < 250_000, "avoid large PNG loading costs");
});

test("restyling the page keeps the places catalogue and admin operations", () => {
  assert.match(places, /counts\.set\(tasting\.place_id/);
  assert.match(places, /<h2[^>]*>Společný katalog/);
  assert.match(places, /<form action=\{createPlace\}/);
  assert.match(places, /<form action=\{updatePlace\}/);
  assert.match(places, /\{admin && <section/);
});

test("historical places stay admin-only and start inside a collapsed native disclosure", () => {
  const historical = places.split('{admin && <section className="taste-places-history-section">')[1];
  assert.ok(historical, "historical places are restricted to administrators");
  assert.match(historical, /<details className="taste-places-history taste-places-card">/);
  assert.match(historical, /<summary>Historická místa bez ověřené vazby \(\{oldPlaces\.length\}\)<\/summary>/);
  assert.doesNotMatch(historical, /<details[^>]*\bopen\b/);
  assert.match(historical, /oldPlaces\.map\(place =>/);
  assert.match(historical, /\{place\.count\}/);
  assert.match(source("app/places/places-concept.css"), /\.taste-places-history \.taste-places-table \{ min-width: 0; \}/);
});
