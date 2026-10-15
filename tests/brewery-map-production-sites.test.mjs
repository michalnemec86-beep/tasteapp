import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/breweries/maps/route.ts", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/breweries/[id]/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/breweries/actions.ts", import.meta.url), "utf8");
const edit = readFileSync(new URL("../app/breweries/BreweryEditModalClient.tsx", import.meta.url), "utf8");
const map = readFileSync(new URL("../app/breweries/BreweryCzechMap.tsx", import.meta.url), "utf8");

test("Czech map uses one existing GPS per brewery, including nomadic breweries", () => {
  const czechBranch = route.split('if (type === "czech") {')[1];
  assert.ok(czechBranch, "Expected Czech map API branch");
  const breweryQuery = czechBranch.split('fetchAllRows(')[0];
  assert.match(breweryQuery, /\.eq\("country", "Česko"\)[\s\S]*?\.not\("latitude", "is", null\)/);
  assert.doesNotMatch(breweryQuery, /\.eq\("is_nomadic", false\)/);
  assert.match(route, /isNomadic: brewery\.is_nomadic/);
  assert.match(map, /evidovaná poloha/);
  assert.doesNotMatch(breweryQuery, /\.update\(|\.delete\(/);
});

test("Brewery detail shows one address and keeps the existing nomadic GPS", () => {
  assert.match(detail, /const hasMapCoordinates\s*=\s*typeof brewery\.latitude/);
  assert.match(detail, /<DetailItem label="Adresa" value=\{brewery\.address\} \/>/);
  assert.match(detail, /isNomadic: brewery\.is_nomadic/);
  assert.doesNotMatch(detail, /!brewery\.is_nomadic &&\s*typeof brewery\.latitude/);
});

test("Nomadic edits do not clear the only stored address or pair of coordinates", () => {
  assert.match(actions, /address: values\.address \|\| null/);
  assert.match(actions, /address: address \|\| null/);
  assert.match(actions, /formData\.has\("address"\)/);
  assert.doesNotMatch(actions, /currentBrewery\.is_nomadic\s*\?\s*null\s*:\s*address/);
  assert.doesNotMatch(actions, /values\.isNomadic \|\| !isAdmin/);
  assert.doesNotMatch(edit, /disabled=\{brewery\.isNomadic\}/);
  assert.match(actions, /Souřadnice musí obsahovat zeměpisnou šířku i délku/);
});
