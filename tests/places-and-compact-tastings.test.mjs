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
  assert.match(create, /className="taste-form-rating-section"/);
  assert.match(edit, /className="taste-form-rating-section"/);
  assert.match(create, /className="taste-form-place-section"/);
  assert.match(edit, /className="taste-form-place-section"/);
  assert.match(create, /className="taste-form-strength"/);
  assert.match(edit, /gridTemplateColumns:\s*"repeat\(3, minmax\(0, 1fr\)\)"/);
});

test("catalog metadata remains mounted when visually collapsed", () => {
  assert.match(create, /<details ref=\{beerInformationRef\} key=\{existingBeerId \? "catalog" : "new-beer"\}/);
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
  assert.doesNotMatch(edit, /name="notes"/);
  assert.doesNotMatch(create, /name="notes"/);
  assert.match(actions, /formData\.has\("notes"\)/);
});

test("places visible in navigation and public listing avoids exposing legacy names", () => {
  assert.match(nav, /NavLink href="\/places"/);
  assert.match(nav, /MobileNavLink href="\/places"/);
  assert.match(catalog, /\{admin && <section/);
  assert.match(catalog, /counts\.set\(tasting\.place_id/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
});

test("beer info starts collapsed in both modals and has the same short label", () => {
  assert.match(create, /<summary>Informace o ochutnaném pivu<\/summary>/);
  assert.match(edit, /<summary>Informace o ochutnaném pivu<\/summary>/);
  assert.doesNotMatch(create, /open=\{!existingBeerId\}/);
  assert.match(create, /ref=\{beerInformationRef\}/);
  assert.match(create, /beerInformationRef\.current\?\.setAttribute\("open", ""\)/);
  assert.doesNotMatch(create, /required=\{!existingBeerId && !activeBrewery\}/);
});

test("rating is a standalone section and location chips are not mixed into rating UI", () => {
  for (const markup of [create, edit]) {
    const ratingStart = markup.indexOf('className="taste-form-rating-section"');
    const placeStart = markup.indexOf('className="taste-form-place-section"');
    assert.ok(ratingStart >= 0 && placeStart > ratingStart);
    const ratingHtml = markup.slice(ratingStart, placeStart);
    assert.match(ratingHtml, /StarRatingInput/);
    assert.doesNotMatch(ratingHtml, /PlacePicker/);
    assert.match(markup.slice(placeStart), /<PlacePicker/);
    assert.doesNotMatch(markup, /name="notes"/);
  }
});

test("date and count have separate constrained grid cells", () => {
  const css = source("app/tasting-form-compact.css");
  for (const markup of [create, edit]) {
    assert.match(markup, /className="taste-form-required-date"/);
    assert.match(markup, /className="taste-form-required-count"/);
    assert.match(markup, /className="taste-form-required-grid"/);
  }
  assert.match(css, /\.taste-form-required-date input\[type="date"\]/);
  assert.match(css, /max-width: 100% !important/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(76px, 90px\)/);
});

test("place text field appears only for pub and festival and home uses a hidden value", () => {
  assert.match(picker, /category === "home" \? \(/);
  assert.match(picker, /<input type="hidden" name="place" value="Doma" \/>/);
  assert.match(picker, /category === "pub" \|\| category === "festival"/);
  assert.doesNotMatch(picker, /category === "pub" \|\| category === "festival" \|\| name\.trim\(\)/);
  assert.match(picker, /if \(next === category\) return/);
  assert.match(picker, /setName\(next === "home" \|\| category !== null \? "" : name\)/);
});
