import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const group = read("lib/tasting-timeline-groups.ts");
const activity = read("app/activity/page.tsx");
const form = read("app/tastings/new/TastingForm.tsx");
const api = read("app/api/tasting-last-rating/route.ts");
const ratings = read("lib/ratings.ts");

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
