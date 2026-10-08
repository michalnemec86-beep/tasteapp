import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const create = source("app/tastings/new/TastingForm.tsx");
const edit = source("app/EditTastingModalClient.tsx");
const actions = source("app/tastings/actions.ts");
const picker = source("components/tastings/PlacePicker.tsx");
const migration = source("supabase/migrations/20261008071548_places_catalog_and_optional_tasting_links.sql");
const catalog = source("app/places/page.tsx");
const nav = source("app/AppNav.tsx");

test("new and edit tasting reuse same optional location input and compact sections", () => {
  assert.match(create, /<PlacePicker \/>/);
  assert.match(edit, /<PlacePicker initialPlace=\{tasting\.place\}/);
  assert.match(create, /className="taste-form-optional"/);
  assert.match(edit, /className="taste-form-optional"/);
  assert.match(create, /className="taste-form-strength"/);
  assert.match(edit, /gridTemplateColumns:\s*"repeat\(3, minmax\(0, 1fr\)\)"/);
});

test("catalog metadata remains mounted when visually collapsed", () => {
  assert.match(create, /<details key=\{existingBeerId \? "catalog" : "new-beer"\}/);
  assert.match(create, /<input[^>]*type="hidden" name="existingBeerId"/);
  assert.match(edit, /<details className="taste-form-catalog"/);
});

test("place remains optional, home never creates a public catalog record", () => {
  assert.match(picker, /"home", title: "🏠 Doma"/);
  assert.match(picker, /"pub", title: "🍺 Hospoda"/);
  assert.match(picker, /"festival", title: "🎪 Festival"/);
  assert.match(actions, /if \(values\.placeCategory === "home"\)/);
  assert.match(actions, /place_id: null, place_category: "home"/);
});

test("save preserves legacy place snapshots and edit only changes touched fields", () => {
  assert.match(migration, /ADD COLUMN place_id bigint REFERENCES public\.places/);
  assert.match(migration, /Legacy place text snapshot; never overwrite old rows/);
  assert.match(actions, /const tastingPlace = await resolveTastingPlace/);
  assert.match(actions, /\.\.\.tastingPlace,/);
  assert.match(actions, /values\.placeChanged \? await resolveTastingPlace/);
  assert.match(actions, /\.\.\.placeUpdate,/);
  assert.match(edit, /defaultValue=\{tasting\.notes \?\? ""\}/);
});

test("places visible in navigation and public listing avoids exposing legacy names", () => {
  assert.match(nav, /NavLink href="\/places"/);
  assert.match(nav, /MobileNavLink href="\/places"/);
  assert.match(catalog, /\{admin && <section/);
  assert.match(catalog, /counts\.set\(tasting\.place_id/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
});
