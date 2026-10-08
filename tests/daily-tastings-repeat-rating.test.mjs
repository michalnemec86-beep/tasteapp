import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const group = read("lib/tasting-timeline-groups.ts");
const activity = read("app/activity/page.tsx");
const form = read("app/tastings/new/TastingForm.tsx");
const api = read("app/api/tasting-last-rating/route.ts");
const ratings = read("lib/ratings.ts");
const actions = read("app/tastings/actions.ts");
const stars = read("components/ui/StarRatingInput.tsx");

test("daily timeline grouping is visual-only and uses user, beer and day", () => {
  assert.match(group, /user_id\}\|beer:\$\{tasting\.beers\.id\}\|day:\$\{tasting\.tasted_on\}/);
  assert.match(group, /totalQuantity \+= tasting\.quantity \?\? 1/);
  assert.match(activity, /groupDailyTastings\(/);
  assert.match(activity, /groupTastings=\{event\.tastings\}/);
});
test("individual tasting edits and ratings remain visible in expandable day card", () => {
  assert.match(activity, /groupTastings\.map\(/);
  assert.match(activity, /EditTastingModalClient/);
  assert.match(activity, /RatingStars rating=\{entry\.rating\}/);
});

test("grouped timeline cards stay compact without verbose copy but retain accessible disclosure", () => {
  assert.doesNotMatch(activity, /v jednom dni · celkem/);
  assert.doesNotMatch(activity, /Zobrazit jednotlivé ochutnávky/);
  assert.doesNotMatch(activity, /× hodnoceno/);
  assert.match(activity, /<summary[\s\S]*?aria-label="Rozbalit detaily ochutnávek"/);
  assert.match(activity, /<ChevronDown size=\{20\} aria-hidden="true" \/>/);
  assert.match(activity, /groupTastings\.map\(\(entry\)/);
  assert.match(activity, /const quantity =\s*totalQuantity/);
});
test("personal last rating is scoped to account and beer", () => {
  assert.match(api, /auth\.getUser\(\)/);
  assert.match(api, /\.eq\("user_id", user\.id\)/);
  assert.match(api, /\.eq\("beer_id", beerId\)/);
  assert.match(api, /"private, no-store"/);
});
test("old stars are read-only, rating again is an explicit action", () => {
  assert.match(form, /Naposledy hodnoceno/);
  assert.match(form, /Hodnotit znovu/);
  assert.match(form, /RatingStars rating=\{personalLastRating\.rating\}/);
  assert.match(form, /rateAgain/);
  assert.match(ratings, /bucket\.sum \+= row\.rating; bucket\.count\+\+/);
});

test("personal repeated scores are averaged without counting quantity", () => {
  const client = read("app/ratings/RatingsClient.tsx");
  const page = read("app/ratings/page.tsx");
  assert.match(client, /myBeerRatings\.reduce\(\(sum, row\) => sum \+ row\.rating, 0\) \/ myBeerRatings\.length/);
  assert.match(client, /row\.userId === currentUserId/);
  assert.match(page, /currentUserId=\{user\.id\}/);
});

test("keeping previous stars is not a new vote, even on explicit repeat rating", () => {
  const create = actions.split("async function saveTastingCore(")[1]
    ?.split("export async function updateTastingInModal(")[0];
  assert.ok(create);
  assert.match(create, /\.eq\("user_id", user\.id\)/);
  assert.match(create, /\.eq\("beer_id", beerId\)/);
  assert.match(create, /if \(previousRatedTasting\?\.rating === newRating\) newRating = null/);
  assert.match(create, /rating: newRating/);
  assert.match(stars, /isRating\(previousRating\) && rating === previousRating/);
  assert.match(stars, /name=\{unchangedPrevious \? undefined : "rating"\}/);
  assert.match(form, /previousRating=\{personalLastRating\?\.rating\}/);
});
