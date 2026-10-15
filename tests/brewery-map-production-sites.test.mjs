import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/breweries/maps/route.ts", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/breweries/[id]/page.tsx", import.meta.url), "utf8");

test("Czech production map excludes flying brewery records without deleting their stored coordinates", () => {
  const czechBranch = route.split('if (type === "czech") {')[1];
  assert.ok(czechBranch, "Expected Czech map API branch");
  const breweryQuery = czechBranch.split('fetchAllRows(')[0];
  assert.match(breweryQuery, /\.eq\("country", "Česko"\)[\s\S]*?\.eq\("is_nomadic", false\)[\s\S]*?\.not\("latitude", "is", null\)/);
  assert.doesNotMatch(breweryQuery, /\.update\(|\.delete\(/);
});

test("Individual flying-brewery profile never marks contact GPS as a production site", () => {
  assert.match(detail, /const hasMapCoordinates\s*=\s*!brewery\.is_nomadic\s*&&/);
  assert.match(detail, /Letající pivovar nemá jedno vlastní výrobní místo/);
  assert.match(detail, /hasMapCoordinates\s*\?\s*\[/);
});
